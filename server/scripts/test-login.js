const http = require('http');

const data = JSON.stringify({ username: 'admin', password: process.env.TEST_ADMIN_PASSWORD || 'admin@123' });
const port = process.env.SERVER_PORT || 3001;

const options = {
  hostname: 'localhost',
  port,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('BODY', body);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('REQUEST ERROR', e);
  process.exit(1);
});

req.write(data);
req.end();
