const http = require('http');

const PORT = 3031;

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    console.log(`[500] ${new Date().toISOString()} — returning 500 to trigger retry`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Simulated server error' }));
  });
});

server.listen(PORT, () => {
  console.log(`500-mock server listening on http://localhost:${PORT}/webhook`);
});
