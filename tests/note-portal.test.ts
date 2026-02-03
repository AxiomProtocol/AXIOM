const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const ADMIN_WALLET = '0xa6ed10e752d5facd989ee9ced113b3a064b47493';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => {
      results.push({ name, passed: true });
      console.log(`✓ ${name}`);
    })
    .catch((error) => {
      results.push({ name, passed: false, error: error.message });
      console.log(`✗ ${name}: ${error.message}`);
    });
}

function expect(value: any) {
  return {
    toBe(expected: any) {
      if (value !== expected) {
        throw new Error(`Expected ${expected} but got ${value}`);
      }
    },
    toBeTruthy() {
      if (!value) {
        throw new Error(`Expected truthy value but got ${value}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (value < expected) {
        throw new Error(`Expected ${value} to be >= ${expected}`);
      }
    },
    toHaveProperty(prop: string) {
      if (!(prop in value)) {
        throw new Error(`Expected object to have property ${prop}`);
      }
    },
    toBeInstanceOf(expected: any) {
      if (!(value instanceof expected)) {
        throw new Error(`Expected value to be instance of ${expected.name}`);
      }
    },
  };
}

async function runTests() {
  console.log('\n=== Note Portal API Tests ===\n');
  console.log(`API Base: ${API_BASE}\n`);

  console.log('--- Observer Endpoint Tests ---\n');

  await test('GET /api/observer/notes returns 200', async () => {
    const res = await fetch(`${API_BASE}/api/observer/notes`);
    expect(res.status).toBe(200);
  });

  await test('Observer notes has success property', async () => {
    const res = await fetch(`${API_BASE}/api/observer/notes`);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  await test('Observer notes has notePortal object', async () => {
    const res = await fetch(`${API_BASE}/api/observer/notes`);
    const data = await res.json();
    expect(data).toHaveProperty('notePortal');
  });

  await test('Observer notes has summary with byStatus', async () => {
    const res = await fetch(`${API_BASE}/api/observer/notes`);
    const data = await res.json();
    expect(data.notePortal).toHaveProperty('summary');
    expect(data.notePortal.summary).toHaveProperty('byStatus');
  });

  await test('Observer notes has financials data', async () => {
    const res = await fetch(`${API_BASE}/api/observer/notes`);
    const data = await res.json();
    expect(data.notePortal.summary).toHaveProperty('financials');
    expect(data.notePortal.summary.financials).toHaveProperty('totalPrincipal');
  });

  await test('Observer notes has recentNotes array', async () => {
    const res = await fetch(`${API_BASE}/api/observer/notes`);
    const data = await res.json();
    expect(data).toHaveProperty('recentNotes');
    expect(Array.isArray(data.recentNotes)).toBe(true);
  });

  console.log('\n--- Admin Endpoint Tests (Auth Required) ---\n');

  await test('GET /api/admin/notes without auth returns 401', async () => {
    const res = await fetch(`${API_BASE}/api/admin/notes`);
    expect(res.status).toBe(401);
  });

  await test('GET /api/admin/notes with admin wallet returns 200', async () => {
    const res = await fetch(`${API_BASE}/api/admin/notes`, {
      headers: { 'x-admin-wallet': ADMIN_WALLET },
    });
    expect(res.status).toBe(200);
  });

  await test('Admin notes has notes array', async () => {
    const res = await fetch(`${API_BASE}/api/admin/notes`, {
      headers: { 'x-admin-wallet': ADMIN_WALLET },
    });
    const data = await res.json();
    expect(data).toHaveProperty('notes');
    expect(Array.isArray(data.notes)).toBe(true);
  });

  await test('Admin notes has summary object', async () => {
    const res = await fetch(`${API_BASE}/api/admin/notes`, {
      headers: { 'x-admin-wallet': ADMIN_WALLET },
    });
    const data = await res.json();
    expect(data).toHaveProperty('summary');
    expect(data.summary).toHaveProperty('totalNotes');
  });

  await test('Admin notes has pagination object', async () => {
    const res = await fetch(`${API_BASE}/api/admin/notes`, {
      headers: { 'x-admin-wallet': ADMIN_WALLET },
    });
    const data = await res.json();
    expect(data).toHaveProperty('pagination');
    expect(data.pagination).toHaveProperty('limit');
    expect(data.pagination).toHaveProperty('offset');
    expect(data.pagination).toHaveProperty('total');
  });

  await test('POST /api/admin/notes without auth returns 401', async () => {
    const res = await fetch(`${API_BASE}/api/admin/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteNumber: 'TEST-001' }),
    });
    expect(res.status).toBe(401);
  });

  await test('POST /api/admin/notes without required fields returns 400', async () => {
    const res = await fetch(`${API_BASE}/api/admin/notes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-wallet': ADMIN_WALLET,
      },
      body: JSON.stringify({ noteNumber: 'TEST-001' }),
    });
    expect(res.status).toBe(400);
  });

  console.log('\n--- Capital Bridge Integration Tests ---\n');

  await test('GET /api/observer/capital-bridge returns 200', async () => {
    const res = await fetch(`${API_BASE}/api/observer/capital-bridge`);
    expect(res.status).toBe(200);
  });

  await test('Capital Bridge includes notePortal section', async () => {
    const res = await fetch(`${API_BASE}/api/observer/capital-bridge`);
    const data = await res.json();
    expect(data).toHaveProperty('notePortal');
  });

  await test('Capital Bridge notePortal has correct structure', async () => {
    const res = await fetch(`${API_BASE}/api/observer/capital-bridge`);
    const data = await res.json();
    expect(data.notePortal).toHaveProperty('totalNotes');
    expect(data.notePortal).toHaveProperty('activeNotes');
    expect(data.notePortal).toHaveProperty('status');
  });

  console.log('\n--- Database Table Tests ---\n');

  await test('private_credit_notes table returns valid data', async () => {
    const res = await fetch(`${API_BASE}/api/admin/notes`, {
      headers: { 'x-admin-wallet': ADMIN_WALLET },
    });
    const data = await res.json();
    expect(data.summary.totalNotes).toBeGreaterThanOrEqual(0);
  });

  console.log('\n=== Summary ===\n');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
