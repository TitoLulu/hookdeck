const http = require('http');

const PORT = 3030;
const seen = new Set(); // idempotency store (in-memory, resets on restart)

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const idempotencyKey = req.headers['x-idempotency-key'];
    const eventType = req.headers['x-event-type'] || 'unknown';

    if (idempotencyKey && seen.has(idempotencyKey)) {
      console.log(`[DUPLICATE] ${eventType} key=${idempotencyKey} — skipped`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true, duplicate: true }));
      return;
    }

    if (idempotencyKey) seen.add(idempotencyKey);

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    console.log(`[OK] ${eventType} id=${parsed.id || '?'} key=${idempotencyKey || 'none'}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: true, event: eventType, id: parsed.id }));
  });
});

server.listen(PORT, () => {
  console.log(`Webhook handler listening on http://localhost:${PORT}/webhook`);
});
