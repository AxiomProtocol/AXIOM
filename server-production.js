const { createServer } = require('http');
const { spawn } = require('child_process');
const path = require('path');

const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '5000', 10);
const internalPort = port + 1;

let appReady = false;

const HEALTH_PATHS = new Set(['/api/health', '/api/healthz', '/healthz', '/_health', '/health']);

console.log(`[Production] Starting with health check on port ${port}...`);

const proxy = createServer((req, res) => {
  const url = (req.url || '').split('?')[0];

  if (HEALTH_PATHS.has(url)) {
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end('ok');
    return;
  }

  if (!appReady) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>Starting up...</h1><meta http-equiv="refresh" content="3"></body></html>');
    return;
  }

  const options = {
    hostname: '127.0.0.1',
    port: internalPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = require('http').request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[Production] Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad gateway');
  });

  req.pipe(proxyReq, { end: true });
});

proxy.listen(port, hostname, () => {
  console.log(`[Production] Health check live on http://${hostname}:${port}/api/health`);

  const standaloneServer = path.join(__dirname, '.next', 'standalone', 'server.js');
  const child = spawn('node', [standaloneServer], {
    env: {
      ...process.env,
      PORT: String(internalPort),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (data) => {
    const msg = data.toString();
    process.stdout.write(`[Next.js] ${msg}`);
    if (msg.includes('Ready') || msg.includes('started') || msg.includes('Listening')) {
      appReady = true;
      console.log(`[Production] Next.js ready on internal port ${internalPort}`);
    }
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(`[Next.js] ${data.toString()}`);
  });

  child.on('exit', (code) => {
    console.error(`[Production] Next.js process exited with code ${code}`);
    process.exit(code || 1);
  });

  setTimeout(() => {
    if (!appReady) {
      appReady = true;
      console.log(`[Production] Marking ready after timeout`);
    }
  }, 15000);
});

proxy.once('error', (err) => {
  console.error('[Production] Failed to bind port:', err);
  process.exit(1);
});
