#!/usr/bin/env node
const { spawn } = require('child_process');
const http = require('http');

const PORT = 3999;

const ENDPOINTS = [
  '/api/health',
  '/api/observer/overview',
  '/api/observer/treasury',
  '/api/observer/risk',
  '/api/observer/governance',
  '/api/observer/node-economy',
  '/api/observer/lock-readiness',
  '/api/observer/reports',
  '/api/observer/assets',
  '/api/observer/capital-bridge',
  '/api/observer/diag',
  '/api/observer/export?format=json',
];

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${PORT}${path}`, { timeout: 30000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function waitForPort(port, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      if (Date.now() - start > timeoutMs) return reject(new Error(`Port ${port} did not open within ${timeoutMs}ms`));
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        let body = '';
        res.on('data', (d) => { body += d; });
        res.on('end', () => {
          if (res.statusCode === 200) resolve();
          else setTimeout(check, 1000);
        });
      });
      req.on('error', () => setTimeout(check, 1000));
    }
    check();
  });
}

async function main() {
  console.log(`\n  AXIOM Observer API Verification\n  ${'='.repeat(40)}\n`);
  console.log(`  Starting Next.js on port ${PORT}...\n`);

  const child = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    env: { ...process.env, HOSTNAME: '0.0.0.0', PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: process.cwd(),
  });

  let serverOutput = '';
  child.stdout.on('data', (d) => { serverOutput += d.toString(); });
  child.stderr.on('data', (d) => { serverOutput += d.toString(); });

  try {
    await waitForPort(PORT, 60000);
    console.log(`  Server ready on port ${PORT}\n`);
  } catch (e) {
    console.error(`  FATAL: Server did not start.\n  Output: ${serverOutput}\n`);
    child.kill('SIGTERM');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const endpoint of ENDPOINTS) {
    try {
      const { status, body } = await httpGet(endpoint);
      let isJson = false;
      try {
        JSON.parse(body);
        isJson = true;
      } catch {}

      const ok = status === 200 && isJson;
      if (ok) {
        passed++;
        results.push({ endpoint, status, json: true, result: 'PASS' });
        console.log(`  PASS  ${status}  ${endpoint}`);
      } else {
        failed++;
        const reason = !isJson ? 'NOT_JSON' : `HTTP_${status}`;
        results.push({ endpoint, status, json: isJson, result: 'FAIL', reason });
        console.log(`  FAIL  ${status}  ${endpoint}  (${reason})`);
        if (!isJson && body.length < 500) console.log(`        Body: ${body.substring(0, 200)}`);
      }
    } catch (err) {
      failed++;
      results.push({ endpoint, status: 0, json: false, result: 'FAIL', reason: err.message });
      console.log(`  FAIL  ---  ${endpoint}  (${err.message})`);
    }
  }

  console.log(`\n  ${'='.repeat(40)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed out of ${ENDPOINTS.length} endpoints\n`);

  child.kill('SIGTERM');

  await new Promise((r) => setTimeout(r, 2000));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
