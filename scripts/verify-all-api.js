#!/usr/bin/env node
const { spawn } = require('child_process');
const http = require('http');

const PORT = 3999;

const ENDPOINTS = [
  { path: '/api/health', group: 'core' },
  { path: '/api/hello', group: 'core' },

  { path: '/api/observer/overview', group: 'observer' },
  { path: '/api/observer/treasury', group: 'observer' },
  { path: '/api/observer/risk', group: 'observer' },
  { path: '/api/observer/governance', group: 'observer' },
  { path: '/api/observer/node-economy', group: 'observer' },
  { path: '/api/observer/lock-readiness', group: 'observer' },
  { path: '/api/observer/reports', group: 'observer' },
  { path: '/api/observer/assets', group: 'observer' },
  { path: '/api/observer/capital-bridge', group: 'observer' },
  { path: '/api/observer/diag', group: 'observer' },
  { path: '/api/observer/export?format=json', group: 'observer' },

  { path: '/api/sentinel/health', group: 'sentinel' },
  { path: '/api/sentinel/overview', group: 'sentinel' },
  { path: '/api/sentinel/signals', group: 'sentinel' },
  { path: '/api/sentinel/decisions', group: 'sentinel' },
  { path: '/api/sentinel/regimes', group: 'sentinel' },
  { path: '/api/sentinel/audit', group: 'sentinel' },

  { path: '/api/axusd/supply', group: 'axusd' },
  { path: '/api/axusd/peg-status', group: 'axusd' },
  { path: '/api/axusd/pools', group: 'axusd' },
  { path: '/api/axusd/psm', group: 'axusd' },
  { path: '/api/axusd/treasury-health', group: 'axusd' },
  { path: '/api/axusd/liquidity', group: 'axusd' },
  { path: '/api/axusd/lp-analytics', group: 'axusd' },
  { path: '/api/axusd/bridge', group: 'axusd' },
  { path: '/api/axusd/alerts', group: 'axusd' },
  { path: '/api/axusd/history', group: 'axusd' },
  { path: '/api/axusd/incentives', group: 'axusd' },

  { path: '/api/mirdt/setups', group: 'mirdt' },
  { path: '/api/mirdt/paper-trades', group: 'mirdt' },

  { path: '/api/pilot', group: 'pilot' },
  { path: '/api/pilot/spvs', group: 'pilot' },
  { path: '/api/pilot/investors', group: 'pilot' },
  { path: '/api/pilot/distributions', group: 'pilot' },
  { path: '/api/pilot/capital-calls', group: 'pilot' },
  { path: '/api/pilot/reports', group: 'pilot' },
  { path: '/api/pilot/documents', group: 'pilot' },
  { path: '/api/pilot/notifications', group: 'pilot' },
  { path: '/api/pilot/projections', group: 'pilot' },
  { path: '/api/pilot/benchmarks', group: 'pilot' },
  { path: '/api/pilot/audit', group: 'pilot' },
  { path: '/api/pilot/expansion-gate', group: 'pilot' },

  { path: '/api/founder-ops/overview', group: 'founder-ops' },

  { path: '/api/dex/pools', group: 'dex' },
  { path: '/api/dex/stats', group: 'dex' },
  { path: '/api/dex/price', group: 'dex' },

  { path: '/api/euler/vault-stats', group: 'euler' },

  { path: '/api/transparency/treasury', group: 'transparency' },

  { path: '/api/impact/metrics', group: 'impact' },

  { path: '/api/denet/status', group: 'denet' },
  { path: '/api/denet/metrics', group: 'denet' },

  { path: '/api/realestate/fund-stats', group: 'realestate' },
  { path: '/api/realestate/risk-params', group: 'realestate' },

  { path: '/api/roadmap', group: 'misc' },
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

function waitForPort(port, timeoutMs = 90000) {
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
  console.log(`\n  AXIOM Full API Verification`);
  console.log(`  ${ENDPOINTS.length} endpoints across ${[...new Set(ENDPOINTS.map(e => e.group))].length} groups`);
  console.log(`  ${'='.repeat(50)}\n`);
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
    await waitForPort(PORT, 90000);
    console.log(`  Server ready on port ${PORT}\n`);
  } catch (e) {
    console.error(`  FATAL: Server did not start.\n  Output: ${serverOutput.slice(-500)}\n`);
    child.kill('SIGTERM');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;
  let currentGroup = '';
  const failedEndpoints = [];

  for (const { path, group } of ENDPOINTS) {
    if (group !== currentGroup) {
      currentGroup = group;
      console.log(`  --- ${group.toUpperCase()} ---`);
    }

    try {
      const { status, body } = await httpGet(path);
      let isJson = false;
      try { JSON.parse(body); isJson = true; } catch {}

      const ok = (status === 200 || status === 201) && isJson;
      if (ok) {
        passed++;
        console.log(`  PASS  ${status}  ${path}`);
      } else {
        failed++;
        const reason = status === 500 ? 'SERVER_ERROR' : !isJson ? 'NOT_JSON' : `HTTP_${status}`;
        failedEndpoints.push({ path, status, reason, body: body.substring(0, 200) });
        console.log(`  FAIL  ${status}  ${path}  (${reason})`);
      }
    } catch (err) {
      failed++;
      failedEndpoints.push({ path, status: 0, reason: err.message, body: '' });
      console.log(`  FAIL  ---  ${path}  (${err.message})`);
    }
  }

  console.log(`\n  ${'='.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed out of ${ENDPOINTS.length} endpoints`);

  if (failedEndpoints.length > 0) {
    console.log(`\n  Failed endpoints:`);
    for (const f of failedEndpoints) {
      console.log(`    ${f.path} — ${f.reason} (HTTP ${f.status})`);
      if (f.body) console.log(`      ${f.body.substring(0, 150)}`);
    }
  }

  console.log();
  child.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 2000));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
