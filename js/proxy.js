// Railmap proxy server — forwards DB Fahrplan API requests server-side.
// Run alongside Live Server: node proxy.js
// Listens on http://localhost:3000
//
// Set credentials as env vars (recommended):
//   DB_CLIENT_ID=xxx DB_API_KEY=yyy node proxy.js
//
// Or hardcode below for local dev (do NOT commit to git):

const http  = require('http');
const https = require('https');

const PORT         = 3000;
const DB_CLIENT_ID = process.env.DB_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const DB_API_KEY   = process.env.DB_API_KEY   || 'YOUR_API_KEY_HERE';
const DB_HOST      = 'apis.deutschebahn.com';
const DB_BASE_PATH = '/db-api-marketplace/apis/fahrplan/v1';

// Maps local proxy paths → DB API paths + query transformations
function resolveDbPath(url) {
  const path   = url.pathname;
  const params = url.searchParams;

  // GET /locations?input=Berlin&format=json
  // → DB: /location.name?input=Berlin&format=json
  if (path === '/locations') {
    const input = params.get('input') || '';
    return `/location.name?input=${encodeURIComponent(input)}&format=json`;
  }

  // GET /departures?evaId=8011160&date=2024-06-15&format=json
  // → DB: /departureBoard?id=8011160&date=2024-06-15&format=json
  if (path === '/departures') {
    const evaId = params.get('evaId') || '';
    const date  = params.get('date')  || new Date().toISOString().slice(0, 10);
    return `/departureBoard?id=${evaId}&date=${date}&format=json`;
  }

  return null;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
}

function sendJson(res, code, obj) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  const url    = new URL(req.url, `http://localhost:${PORT}`);
  const dbPath = resolveDbPath(url);

  if (!dbPath) return sendJson(res, 404, { error: 'Unknown endpoint' });

  const options = {
    hostname: DB_HOST,
    port:     443,
    path:     DB_BASE_PATH + dbPath,
    method:   'GET',
    headers: {
      'DB-Client-Id': DB_CLIENT_ID,
      'DB-Api-Key':   DB_API_KEY,
      'Accept':       'application/json',
    },
  };

  console.log(`[proxy] → ${options.path}`);

  const proxy = https.request(options, dbRes => {
    let body = '';
    dbRes.on('data', chunk => body += chunk);
    dbRes.on('end', () => {
      cors(res);
      res.writeHead(dbRes.statusCode, { 'Content-Type': 'application/json' });
      res.end(body);
    });
  });

  proxy.on('error', err => {
    console.error('[proxy] DB request error:', err.message);
    sendJson(res, 502, { error: 'DB API unreachable' });
  });

  proxy.end();
});

server.listen(PORT, () => {
  console.log(`\n[proxy] Railmap DB proxy running at http://localhost:${PORT}`);
  console.log(`[proxy] Credentials: ${DB_CLIENT_ID ? DB_CLIENT_ID.slice(0, 6) + '...' : 'NOT SET'}`);
  console.log(`[proxy] Forwarding to: https://${DB_HOST}${DB_BASE_PATH}\n`);

  if (DB_CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
    console.warn('[proxy] WARNING: No credentials set. Set DB_CLIENT_ID and DB_API_KEY env vars.');
  }
});
