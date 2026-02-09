const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '5000', 10);

let appReady = false;
let handle = null;

console.log(`[Server] Starting Next.js in ${dev ? 'development' : 'production'} mode...`);

const server = createServer(async (req, res) => {
  if (req.url === '/api/health' || req.url === '/_health' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', ready: appReady, timestamp: Date.now() }));
    return;
  }

  if (!appReady) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'starting', message: 'Application is warming up' }));
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
  console.log(`[Server] HTTP server listening on http://${hostname}:${port}`);
  console.log(`[Server] Health check responding immediately at /api/health`);

  const app = next({ dev, hostname, port });
  handle = app.getRequestHandler();

  app.prepare().then(() => {
    appReady = true;
    console.log(`[Server] Next.js ready — all routes active`);
  }).catch((err) => {
    console.error('[Server] Failed to prepare Next.js:', err);
    process.exit(1);
  });
});

server.once('error', (err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
