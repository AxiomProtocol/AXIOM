const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const PORT = parseInt(process.env.PORT, 10) || 5000;
const NEXT_PORT = 3001;
const HOSTNAME = '0.0.0.0';

let nextReady = false;

const HEALTH_OK = Buffer.from('ok');
const HEALTH_ROUTES = new Set(['/', '/api/health', '/api/healthz', '/healthz']);

const server = http.createServer((req, res) => {
  if (!nextReady && HEALTH_ROUTES.has(req.url.split('?')[0])) {
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
    });
    res.end(HEALTH_OK);
    return;
  }

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: NEXT_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );

  proxyReq.on('error', () => {
    const cleanPath = req.url.split('?')[0];
    if (HEALTH_ROUTES.has(cleanPath)) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(HEALTH_OK);
    } else {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Service starting');
    }
  });

  proxyReq.setTimeout(10000, () => {
    proxyReq.destroy();
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, HOSTNAME, () => {
  console.log(`[Boot] Health responder listening on ${HOSTNAME}:${PORT}`);
});

const standaloneServer = path.join(__dirname, '.next', 'standalone', 'server.js');
console.log(`[Boot] Starting Next.js on 127.0.0.1:${NEXT_PORT}`);

const child = spawn(process.execPath, [standaloneServer], {
  env: {
    ...process.env,
    HOSTNAME: '127.0.0.1',
    PORT: String(NEXT_PORT),
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
});

child.on('error', (err) => {
  console.error('[Boot] Failed to start Next.js:', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  console.error(`[Boot] Next.js exited with code ${code}`);
  process.exit(code || 1);
});

function checkNextReady() {
  const probe = http.get(`http://127.0.0.1:${NEXT_PORT}/api/health`, (res) => {
    if (res.statusCode === 200) {
      nextReady = true;
      console.log(`[Boot] Next.js ready — proxying all requests to port ${NEXT_PORT}`);
    } else {
      setTimeout(checkNextReady, 200);
    }
    res.resume();
  });
  probe.on('error', () => {
    setTimeout(checkNextReady, 200);
  });
  probe.setTimeout(2000, () => {
    probe.destroy();
    setTimeout(checkNextReady, 200);
  });
}

setTimeout(checkNextReady, 500);

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
  server.close();
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
  server.close();
});
