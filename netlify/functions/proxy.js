const https = require('https');

exports.handler = async function(event) {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyH402lSya9tqecFV6uKPMRVqVj5TEQ2GUQyu__cRJ8b2xgREEgE5f981ZFRGCrm-VW/exec';

  try {
    const body = JSON.parse(event.body || '{}');
    const params = new URLSearchParams({ payload: JSON.stringify(body) }).toString();
    const url = SCRIPT_URL + '?' + params;

    const data = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          if (res.statusCode === 302 || res.statusCode === 301) {
            const location = res.headers.location;
            https.get(location, (res2) => {
              let raw2 = '';
              res2.on('data', c => raw2 += c);
              res2.on('end', () => resolve(raw2));
            }).on('error', reject);
          } else {
            resolve(raw);
          }
        });
      }).on('error', reject);
    });

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
