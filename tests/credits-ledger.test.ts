const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const ADMIN_WALLET = process.env.ADMIN_WALLET || '0xa6ed10e752d5facd989ee9ced113b3a064b47493';
const TEST_WALLET = '0x1234567890abcdef1234567890abcdef12345678';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✓ ${testName}`);
    passed++;
  } else {
    console.log(`✗ ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== Credits Ledger API Tests ===\n');
  console.log('Operator Credits Endpoints\n');

  try {
    const res1 = await fetch(`${BASE_URL}/api/operator/credits`);
    assert(res1.status === 400, 'GET /api/operator/credits returns 400 without wallet parameter');
    const data1 = await res1.json();
    assert(data1.error === 'Wallet address required', 'Error message is correct for missing wallet');
  } catch (e) {
    console.log('✗ GET /api/operator/credits - request failed:', e);
    failed++;
  }

  try {
    const res2 = await fetch(`${BASE_URL}/api/operator/credits?wallet=${TEST_WALLET}`);
    assert(res2.status === 404, 'GET /api/operator/credits returns 404 for non-existent operator');
  } catch (e) {
    console.log('✗ GET /api/operator/credits?wallet - request failed:', e);
    failed++;
  }

  try {
    const res3 = await fetch(`${BASE_URL}/api/operator/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '10' }),
    });
    assert(res3.status === 400, 'POST /api/operator/credits returns 400 without wallet');
  } catch (e) {
    console.log('✗ POST /api/operator/credits - request failed:', e);
    failed++;
  }

  console.log('\nAdmin Credits Endpoints\n');

  try {
    const res4 = await fetch(`${BASE_URL}/api/admin/credits`);
    assert(res4.status === 403, 'GET /api/admin/credits returns 403 without admin header');
  } catch (e) {
    console.log('✗ GET /api/admin/credits - request failed:', e);
    failed++;
  }

  try {
    const res5 = await fetch(`${BASE_URL}/api/admin/credits`, {
      headers: { 'x-admin-wallet': ADMIN_WALLET },
    });
    assert(res5.status === 200, 'GET /api/admin/credits returns 200 with admin header');
    const data5 = await res5.json();
    assert(data5.success === true, 'Response has success: true');
    assert(Array.isArray(data5.ledgers), 'Response has ledgers array');
    assert(typeof data5.summary === 'object', 'Response has summary object');
    assert(typeof data5.pagination === 'object', 'Response has pagination object');
  } catch (e) {
    console.log('✗ GET /api/admin/credits with admin - request failed:', e);
    failed++;
  }

  try {
    const res6 = await fetch(`${BASE_URL}/api/admin/credits/accrue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId: 'test', amount: '10' }),
    });
    assert(res6.status === 403, 'POST /api/admin/credits/accrue returns 403 without admin header');
  } catch (e) {
    console.log('✗ POST /api/admin/credits/accrue - request failed:', e);
    failed++;
  }

  try {
    const res7 = await fetch(`${BASE_URL}/api/admin/credits/accrue`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-wallet': ADMIN_WALLET 
      },
      body: JSON.stringify({ amount: '10' }),
    });
    assert(res7.status === 400, 'POST /api/admin/credits/accrue returns 400 without operatorId');
    const data7 = await res7.json();
    assert(data7.error === 'operatorId and amount required', 'Correct error for missing operatorId');
  } catch (e) {
    console.log('✗ POST /api/admin/credits/accrue validation - request failed:', e);
    failed++;
  }

  try {
    const res8 = await fetch(`${BASE_URL}/api/admin/credits/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId: 'test', adjustment: '10', reason: 'test' }),
    });
    assert(res8.status === 403, 'POST /api/admin/credits/adjust returns 403 without admin header');
  } catch (e) {
    console.log('✗ POST /api/admin/credits/adjust - request failed:', e);
    failed++;
  }

  try {
    const res9 = await fetch(`${BASE_URL}/api/admin/credits/adjust`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-wallet': ADMIN_WALLET 
      },
      body: JSON.stringify({ operatorId: 'test', adjustment: '10' }),
    });
    assert(res9.status === 400, 'POST /api/admin/credits/adjust returns 400 without reason');
    const data9 = await res9.json();
    assert(data9.error === 'Reason is required for adjustments', 'Correct error for missing reason');
  } catch (e) {
    console.log('✗ POST /api/admin/credits/adjust validation - request failed:', e);
    failed++;
  }

  try {
    const res10 = await fetch(`${BASE_URL}/api/admin/credits/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId: 'test' }),
    });
    assert(res10.status === 403, 'POST /api/admin/credits/sync returns 403 without admin header');
  } catch (e) {
    console.log('✗ POST /api/admin/credits/sync - request failed:', e);
    failed++;
  }

  try {
    const res11 = await fetch(`${BASE_URL}/api/admin/credits/sync`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-wallet': ADMIN_WALLET 
      },
      body: JSON.stringify({}),
    });
    assert(res11.status === 400, 'POST /api/admin/credits/sync returns 400 without operatorId');
    const data11 = await res11.json();
    assert(data11.error === 'operatorId required, or set syncAll=true', 'Correct error for missing params');
  } catch (e) {
    console.log('✗ POST /api/admin/credits/sync validation - request failed:', e);
    failed++;
  }

  console.log('\nCredits Ledger Schema Validation\n');

  try {
    const res12 = await fetch(`${BASE_URL}/api/admin/credits`, {
      headers: { 'x-admin-wallet': ADMIN_WALLET },
    });
    const data12 = await res12.json();
    assert('totalAvailable' in data12.summary, 'Summary has totalAvailable');
    assert('totalPending' in data12.summary, 'Summary has totalPending');
    assert('totalEarned' in data12.summary, 'Summary has totalEarned');
    assert('totalRedeemed' in data12.summary, 'Summary has totalRedeemed');
    assert('totalSlashed' in data12.summary, 'Summary has totalSlashed');
    assert('operatorCount' in data12.summary, 'Summary has operatorCount');
  } catch (e) {
    console.log('✗ Schema validation - request failed:', e);
    failed++;
  }

  try {
    const res13 = await fetch(`${BASE_URL}/api/admin/credits?limit=10&offset=0`, {
      headers: { 'x-admin-wallet': ADMIN_WALLET },
    });
    const data13 = await res13.json();
    assert(data13.pagination.limit === 10, 'Pagination limit is respected');
    assert(data13.pagination.offset === 0, 'Pagination offset is respected');
    assert('hasMore' in data13.pagination, 'Pagination has hasMore field');
  } catch (e) {
    console.log('✗ Pagination validation - request failed:', e);
    failed++;
  }

  console.log('\n=================================');
  console.log(`Tests completed: ${passed} passed, ${failed} failed`);
  console.log('=================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
