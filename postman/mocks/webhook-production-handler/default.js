/**
 * Production webhook handler mock — receives events forwarded by Hookdeck.
 * Responds at POST /webhook, logs the event type, and returns 200.
 */
const http = require('http');
const PORT = process.env.PORT || 4500;

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Not found' }));
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    const eventType = req.headers['x-event-type'] || parsed.event || 'unknown';
    console.log(`[PROD] ${eventType} id=${parsed.id || '?'}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: true, event: eventType, id: parsed.id }));
  });
});

server.listen(PORT, () => {
  console.log(`Production handler mock listening on http://localhost:${PORT}/webhook`);
});
