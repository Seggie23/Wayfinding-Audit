const https = require('https');

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyH402lSya9tqecFV6uKPMRVqVj5TEQ2GUQyu__cRJ8b2xgREEgE5f981ZFRGCrm-VW/exec';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          httpsGet(res.headers.location).then(resolve).catch(reject);
        } else {
          resolve(raw);
        }
      });
    }).on('error', reject);
  });
}

function httpsPost(url, postData) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          httpsPost(res.headers.location, postData).then(resolve).catch(reject);
        } else {
          resolve(raw);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || '{}');

    let data;
    if (body.action === 'uploadPhoto') {
      // Send large photo data via POST
      const postData = JSON.stringify(body);
      data = await httpsPost(SCRIPT_URL, postData);
    } else {
      // Small payloads via GET
      const params = new URLSearchParams({ payload: JSON.stringify(body) }).toString();
      data = await httpsGet(SCRIPT_URL + '?' + params);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: data
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'error', message: err.message })
    };
  }
};
