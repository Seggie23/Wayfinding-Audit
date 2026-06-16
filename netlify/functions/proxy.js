const https = require('https');

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyH402lSya9tqecFV6uKPMRVqVj5TEQ2GUQyu__cRJ8b2xgREEgE5f981ZFRGCrm-VW/exec';

function followRedirects(url, options, postData, depth) {
  if (depth > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        // For redirects, switch to GET
        const newOptions = { method: 'GET' };
        followRedirects(res.headers.location, newOptions, null, depth + 1).then(resolve).catch(reject);
        return;
      }
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve(raw));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    console.log('Action:', body.action);
    console.log('Body size:', event.body ? event.body.length : 0);

    let data;

    if (body.action === 'uploadPhoto') {
      console.log('Image data length:', body.imageData ? body.imageData.length : 0);
      const postData = event.body; // forward raw body
      const urlObj = new URL(SCRIPT_URL);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      data = await followRedirects(SCRIPT_URL, options, postData, 0);
    } else {
      const params = new URLSearchParams({ payload: JSON.stringify(body) }).toString();
      const urlObj = new URL(SCRIPT_URL + '?' + params);
      const options = { hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search, method: 'GET' };
      data = await followRedirects(SCRIPT_URL + '?' + params, options, null, 0);
    }

    console.log('Response:', data ? data.substring(0, 200) : 'empty');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: data || JSON.stringify({ status: 'error', message: 'Empty response from script' })
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'error', message: err.message })
    };
  }
};
