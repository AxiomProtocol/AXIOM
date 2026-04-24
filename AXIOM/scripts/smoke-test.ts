#!/usr/bin/env npx tsx

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const ADMIN_WALLET = '0xa6ed10e752d5facd989ee9ced113b3a064b47493';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✓ ${name}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error, duration: Date.now() - start });
    console.log(`✗ ${name}: ${error}`);
  }
}

async function fetchJson(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  return { status: res.status, data: await res.json() };
}

async function runTests() {
  console.log('\n=== AXIOM Protocol Smoke Test ===\n');
  console.log(`Target: ${BASE_URL}\n`);

  console.log('--- Observer Endpoints ---\n');

  await test('GET /api/observer/node-economy returns 200', async () => {
    const { status } = await fetchJson('/api/observer/node-economy');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  });

  await test('GET /api/observer/capital-bridge returns 200', async () => {
    const { status, data } = await fetchJson('/api/observer/capital-bridge');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.success) throw new Error('Response not successful');
  });

  await test('GET /api/observer/notes returns 200', async () => {
    const { status, data } = await fetchJson('/api/observer/notes');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.success) throw new Error('Response not successful');
  });

  await test('Capital Bridge includes notePortal metrics', async () => {
    const { data } = await fetchJson('/api/observer/capital-bridge');
    if (!data.notePortal) throw new Error('Missing notePortal in response');
  });

  await test('Capital Bridge includes readinessGate metrics', async () => {
    const { data } = await fetchJson('/api/observer/capital-bridge');
    if (!data.readinessGate) throw new Error('Missing readinessGate in response');
  });

  console.log('\n--- Operator Endpoints ---\n');

  await test('GET /api/operator/readiness returns 200', async () => {
    const { status } = await fetchJson('/api/operator/readiness');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  });

  await test('GET /api/operator/credits requires auth (non-200)', async () => {
    const { status } = await fetchJson('/api/operator/credits');
    if (status === 200) throw new Error('Should require authentication');
  });

  console.log('\n--- Admin Endpoints (Auth Required) ---\n');

  await test('GET /api/admin/notes returns 401 without auth', async () => {
    const { status } = await fetchJson('/api/admin/notes');
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  await test('GET /api/admin/notes returns 200 with admin wallet', async () => {
    const { status } = await fetchJson('/api/admin/notes', {
      headers: { 'x-admin-wallet': ADMIN_WALLET }
    });
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  });

  await test('GET /api/admin/credits requires auth (non-200)', async () => {
    const { status } = await fetchJson('/api/admin/credits');
    if (status === 200) throw new Error('Should require authentication');
  });

  await test('GET /api/admin/credits returns 200 with admin wallet', async () => {
    const { status } = await fetchJson('/api/admin/credits', {
      headers: { 'x-admin-wallet': ADMIN_WALLET }
    });
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  });

  await test('GET /api/admin/operators accessible', async () => {
    const { status } = await fetchJson('/api/admin/operators');
    if (status !== 200 && status !== 401 && status !== 403) throw new Error(`Unexpected status ${status}`);
  });

  await test('GET /api/admin/operators returns 200 with admin wallet', async () => {
    const { status } = await fetchJson('/api/admin/operators', {
      headers: { 'x-admin-wallet': ADMIN_WALLET }
    });
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  });

  console.log('\n--- Deal Intelligence: Property Enrichment Endpoints ---\n');

  await test('GET /api/real-estate/properties/search returns 200', async () => {
    const { status, data } = await fetchJson('/api/real-estate/properties/search');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!Array.isArray(data.data?.properties)) throw new Error('Missing properties array in response');
    if (!data.data?.pagination) throw new Error('Missing pagination in response');
  });

  await test('POST /api/real-estate/resolve rejects missing address with 400', async () => {
    const { status, data } = await fetchJson('/api/real-estate/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    if (!data.error?.code) throw new Error('Response missing structured error code');
  });

  await test('POST /api/real-estate/properties/enrich rejects missing propertyId with 400', async () => {
    const { status, data } = await fetchJson('/api/real-estate/properties/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    if (!data.error?.code) throw new Error('Response missing structured error code');
  });

  await test('POST /api/real-estate/properties/enrich returns structured error for unknown property', async () => {
    const { status, data } = await fetchJson('/api/real-estate/properties/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: '00000000-0000-0000-0000-000000000000' }),
    });
    // 503 = RentCast API key not configured; 404 = property not found in DB
    if (status !== 404 && status !== 503) throw new Error(`Expected 404 or 503, got ${status}`);
    if (!data.error?.code) throw new Error('Response missing structured error code');
  });

  await test('GET /api/real-estate/properties/:id returns 404 for unknown ID', async () => {
    const { status, data } = await fetchJson('/api/real-estate/properties/00000000-0000-0000-0000-000000000000');
    if (status !== 404) throw new Error(`Expected 404, got ${status}`);
    if (data.error?.code !== 'NOT_FOUND') throw new Error(`Expected NOT_FOUND error code, got ${data.error?.code}`);
  });

  console.log('\n--- Data Integrity Checks ---\n');

  await test('Node Economy returns valid node classes', async () => {
    const { data } = await fetchJson('/api/observer/node-economy');
    if (!data.nodes || !data.nodes.byClass) throw new Error('Missing node class data');
    const classes = Object.keys(data.nodes.byClass);
    if (classes.length !== 4) throw new Error(`Expected 4 node classes, got ${classes.length}`);
  });

  await test('Node Economy returns rewards data', async () => {
    const { data } = await fetchJson('/api/observer/node-economy');
    if (!data.rewards) throw new Error('Missing rewards data');
    if (data.rewards.currentEpoch === undefined) throw new Error('Missing currentEpoch');
  });

  await test('Note Portal returns status breakdown', async () => {
    const { data } = await fetchJson('/api/observer/notes');
    if (!data.notePortal?.summary?.byStatus) throw new Error('Missing status breakdown');
  });

  await test('Readiness Gate returns config thresholds', async () => {
    const { data } = await fetchJson('/api/operator/readiness');
    if (!data.config) throw new Error('Missing config');
    if (data.config.minimumUptimeBps === undefined) throw new Error('Missing minimumUptimeBps');
  });

  console.log('\n=== Summary ===\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total: ${total} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${totalTime}ms\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('All smoke tests passed!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
