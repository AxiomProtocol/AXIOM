const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

async function test(name: string, fn: () => Promise<boolean>) {
  try {
    const result = await fn();
    console.log(result ? `✓ ${name}` : `✗ ${name}`);
    return result;
  } catch (e: any) {
    console.log(`✗ ${name}: ${e.message}`);
    return false;
  }
}

async function runTests() {
  console.log('SUSU Regional API Tests\n');
  let passed = 0, failed = 0;

  if (await test('GET /api/susu/hubs returns list', async () => {
    const res = await fetch(`${BASE_URL}/api/susu/hubs`);
    const data = await res.json();
    return res.status === 200 && Array.isArray(data.hubs);
  })) passed++; else failed++;

  if (await test('GET /api/susu/categories returns list', async () => {
    const res = await fetch(`${BASE_URL}/api/susu/categories`);
    const data = await res.json();
    return res.status === 200 && Array.isArray(data.categories);
  })) passed++; else failed++;

  if (await test('GET /api/susu/groups returns list', async () => {
    const res = await fetch(`${BASE_URL}/api/susu/groups`);
    const data = await res.json();
    return res.status === 200 && Array.isArray(data.groups);
  })) passed++; else failed++;

  if (await test('POST join hub rejects invalid wallet', async () => {
    const res = await fetch(`${BASE_URL}/api/susu/hubs/1/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: 'invalid' })
    });
    return res.status === 400;
  })) passed++; else failed++;

  if (await test('POST join group rejects invalid wallet', async () => {
    const res = await fetch(`${BASE_URL}/api/susu/groups/1/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: 'invalid' })
    });
    return res.status === 400;
  })) passed++; else failed++;

  if (await test('POST graduate rejects missing poolId', async () => {
    const res = await fetch(`${BASE_URL}/api/susu/groups/1/graduate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: '0x1234567890123456789012345678901234567890' })
    });
    return res.status === 400;
  })) passed++; else failed++;

  if (await test('GET admin stats requires auth', async () => {
    const res = await fetch(`${BASE_URL}/api/susu/admin/stats`);
    return res.status === 403;
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
}

runTests().catch(console.error);
