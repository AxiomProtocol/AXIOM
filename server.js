const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 5000;

console.log(`[Server] Starting Next.js in ${dev ? 'development' : 'production'} mode...`);
console.log(`[Server] Binding to ${hostname}:${port}`);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const server = createServer(async (req, res) => {
  if (req.url === '/api/health' || req.url === '/_health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
    return;
  }

  try {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  } catch (err) {
    console.error('[Server] Error handling request:', req.url, err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
});

server.listen(port, hostname, () => {
  console.log(`[Server] Listening on http://${hostname}:${port}`);
  console.log(`[Server] Health check available at /api/health`);
});

server.once('error', (err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});

app.prepare().then(() => {
  console.log(`[Server] Next.js app ready`);
}).catch((err) => {
  console.error('[Server] Failed to prepare Next.js:', err);
  process.exit(1);
});
