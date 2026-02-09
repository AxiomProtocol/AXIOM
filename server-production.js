const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');

const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '5000', 10);

let appReady = false;
let nextHandler = null;

console.log(`[Production] Starting server on ${hostname}:${port}...`);

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
    await nextHandler(req, res, parsedUrl);
  } catch (err) {
    console.error('[Production] Error:', req.url, err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal server error');
  }
});

server.listen(port, hostname, () => {
  console.log(`[Production] Health check live at http://${hostname}:${port}/api/health`);

  try {
    process.env.HOSTNAME = hostname;
    process.env.PORT = String(port);

    const NextServer = require('next/dist/server/next-server').default;
    const conf = require('./.next/required-server-files.json');

    const app = new NextServer({
      hostname,
      port,
      dir: __dirname,
      dev: false,
      customServer: true,
      conf: conf.config,
    });

    nextHandler = app.getRequestHandler();
    appReady = true;
    console.log(`[Production] Next.js ready — all routes active`);
  } catch (err) {
    console.error('[Production] Failed to initialize Next.js:', err);
    process.exit(1);
  }
});

server.once('error', (err) => {
  console.error('[Production] Failed to bind port:', err);
  process.exit(1);
});
