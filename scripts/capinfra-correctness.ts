/**
 * Capital Infrastructure — correctness harness.
 *
 * Complements `scripts/capinfra-smoke.ts` (which proves the happy path
 * end-to-end) by exercising the two correctness guarantees that matter
 * most under real traffic but are easy to break in future refactors:
 *
 *   1. Policy idempotency
 *      Two POST /api/capinfra/policy/evaluate calls with identical
 *      input must return the same `decisionId`, and exactly one
 *      `cap_policy_decisions` row must exist for that input.
 *
 *   2. Audit pagination cursor stability
 *      Walking the cursor across multiple pages of
 *      GET /api/capinfra/operator/audit must visit every row exactly
 *      once — no duplicates, no skipped rows — even when the page size
 *      forces several boundaries.
 *
 * Designed to run alongside `scripts/capinfra-smoke.ts` in CI against a
 * dev server seeded by `scripts/capinfra-seed.ts`.
 *
 * Usage:
 *   ADMIN_SOLVENCY_KEY=... CAPINFRA_BASE_URL=http://localhost:5000 \
 *     npx tsx scripts/capinfra-correctness.ts
 */

import 'dotenv/config';

const BASE = process.env.CAPINFRA_BASE_URL || 'http://localhost:5000';
const KEY = process.env.ADMIN_SOLVENCY_KEY;

if (!KEY) {
  console.error('[capinfra-correctness] ADMIN_SOLVENCY_KEY missing');
  process.exit(1);
}

interface CallOptions extends RequestInit {
  withAuth?: boolean;
}

async function call(path: string, init: CallOptions = {}) {
  const { withAuth = true, headers, ...rest } = init;
  const finalHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'x-operator': 'capinfra-correctness',
    ...((headers as Record<string, string>) || {}),
  };
  if (withAuth) finalHeaders['x-admin-key'] = KEY!;
  const res = await fetch(`${BASE}${path}`, { ...rest, headers: finalHeaders });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

interface AssetRow {
  id: string;
  symbol: string;
}

interface PolicyDecisionRow {
  id: string;
  userId: string;
  assetId: string;
  action: string;
  productContext: unknown;
  allowed: boolean;
  reasonCode: string;
}

interface AuditEventRow {
  id: string;
  createdAt: string;
  userId: string | null;
  eventType: string;
}

const SMOKE_USER = 'usr_capinfra_smoke';

async function getAssets(): Promise<{ axau: AssetRow; axusd: AssetRow }> {
  const res = await call('/api/capinfra/assets', { withAuth: false });
  assert(res.status === 200, `assets 200 (got ${res.status})`);
  const items = (res.body as { items: AssetRow[] }).items;
  const axau = items.find((a) => a.symbol === 'AXAU');
  const axusd = items.find((a) => a.symbol === 'AXUSD-TREASURY');
  assert(axau, 'AXAU asset present (run capinfra-seed first)');
  assert(axusd, 'AXUSD-TREASURY asset present (run capinfra-seed first)');
  return { axau: axau!, axusd: axusd! };
}

// ───────────────────────── Test 1: policy idempotency ─────────────────

async function testPolicyIdempotency(axau: AssetRow): Promise<void> {
  console.log('\n[1] Policy idempotency');

  // Use a unique productContext discriminator so this test run carves
  // out its own slice of cap_policy_decisions independent of any prior
  // run, smoke run, or production traffic. The canonicalInput hash
  // includes productContext, so changing it changes the idempotencyKey.
  const marker = `corr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const body = {
    userId: SMOKE_USER,
    assetId: axau.id,
    actionType: 'REDEEM',
    amount: '0.01',
    productContext: marker,
  };

  const first = await call('/api/capinfra/policy/evaluate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  console.log('  evaluate #1 →', first.status);
  assert(first.status === 200, `first evaluate 200 (got ${first.status})`);
  const d1 = (first.body as { decisionId: string }).decisionId;
  assert(typeof d1 === 'string' && d1.startsWith('pd_'), `decisionId#1 looks like pd_* (got ${d1})`);

  const second = await call('/api/capinfra/policy/evaluate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  console.log('  evaluate #2 →', second.status);
  assert(second.status === 200, `second evaluate 200 (got ${second.status})`);
  const d2 = (second.body as { decisionId: string }).decisionId;

  assert(
    d1 === d2,
    `idempotent replay returns SAME decisionId (got ${d1} vs ${d2})`,
  );

  // Confirm exactly one cap_policy_decisions row exists for our marker.
  // The /policy/decisions endpoint doesn't filter on productContext, so
  // we list a generous slice for our user and filter client-side.
  const listed = await call(
    `/api/capinfra/policy/decisions?userId=${SMOKE_USER}&assetId=${axau.id}&action=REDEEM&limit=500`,
  );
  assert(listed.status === 200, `list decisions 200 (got ${listed.status})`);
  const rows = (listed.body as { items: PolicyDecisionRow[] }).items;
  const ours = rows.filter((r) => r.productContext === marker);
  assert(
    ours.length === 1,
    `exactly one cap_policy_decisions row for marker (got ${ours.length})`,
  );
  assert(
    ours[0].id === d1,
    `the single row id matches the returned decisionId (row=${ours[0].id} vs ${d1})`,
  );

  console.log(`  ✓ same decisionId across calls; one row in cap_policy_decisions (id=${d1})`);
}

// ───────────────────────── Test 2: audit pagination ───────────────────

async function fetchAuditPage(params: {
  userId: string;
  from: string;
  limit: number;
  cursor?: string;
}): Promise<{ items: AuditEventRow[]; nextCursor: string | null }> {
  const qs = new URLSearchParams({
    userId: params.userId,
    from: params.from,
    limit: String(params.limit),
  });
  if (params.cursor) qs.set('cursor', params.cursor);
  const res = await call(`/api/capinfra/operator/audit?${qs.toString()}`);
  assert(res.status === 200, `audit page 200 (got ${res.status})`);
  return res.body as { items: AuditEventRow[]; nextCursor: string | null };
}

async function testAuditPagination(axau: AssetRow): Promise<void> {
  console.log('\n[2] Audit pagination cursor stability');

  // Mark the start time BEFORE seeding so we can scope the audit query
  // to events generated during this test, ignoring older history. The
  // audit `from` filter is inclusive, so a 1s lookback absorbs clock
  // skew between the test process and the DB.
  const fromIso = new Date(Date.now() - 1000).toISOString();

  // Seed many distinct policy.evaluated audit rows for the smoke user.
  // Each unique productContext produces a fresh cap_policy_decisions
  // row with one policy.evaluated audit event (plus policy.denied if
  // the decision is a deny — both are fine for pagination purposes).
  const SEED_COUNT = 25;
  const seedMarker = `pagination-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  for (let i = 0; i < SEED_COUNT; i++) {
    const r = await call('/api/capinfra/policy/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        userId: SMOKE_USER,
        assetId: axau.id,
        actionType: 'REDEEM',
        amount: '0.01',
        productContext: `${seedMarker}-${i}`,
      }),
    });
    assert(r.status === 200, `seed evaluate ${i} 200 (got ${r.status})`);
  }
  console.log(`  seeded ${SEED_COUNT} policy evaluations for ${SMOKE_USER}`);

  // Fetch the full set in one big page as the source of truth.
  const truth = await fetchAuditPage({
    userId: SMOKE_USER,
    from: fromIso,
    limit: 500,
  });
  const truthIds = truth.items.map((i) => i.id);
  assert(
    truthIds.length >= SEED_COUNT,
    `truth slice covers at least ${SEED_COUNT} events (got ${truthIds.length})`,
  );
  assert(
    new Set(truthIds).size === truthIds.length,
    'truth slice has no duplicates within a single page',
  );

  // Walk the cursor with a small page size so several boundaries are
  // crossed. Bound the loop generously to catch infinite-loop bugs.
  const PAGE_SIZE = 7;
  const collected: string[] = [];
  let cursor: string | undefined;
  let pages = 0;
  const MAX_PAGES = Math.ceil(truthIds.length / PAGE_SIZE) + 5;
  while (true) {
    pages += 1;
    assert(pages <= MAX_PAGES, `pagination terminates within ${MAX_PAGES} pages`);
    const page = await fetchAuditPage({
      userId: SMOKE_USER,
      from: fromIso,
      limit: PAGE_SIZE,
      cursor,
    });
    for (const item of page.items) collected.push(item.id);
    if (!page.nextCursor) break;
    assert(page.items.length === PAGE_SIZE, `non-final page is full (got ${page.items.length})`);
    cursor = page.nextCursor;
  }
  console.log(`  walked ${pages} pages of size ${PAGE_SIZE}, collected ${collected.length} events`);

  // No duplicates across pages.
  const collectedSet = new Set(collected);
  assert(
    collectedSet.size === collected.length,
    `paginated walk has no duplicate ids (got ${collected.length} items, ${collectedSet.size} unique)`,
  );

  // Union covers every row in the truth slice exactly once.
  // We use ⊇ (collected covers truth) and equal cardinality to assert
  // set equality without requiring the same physical ordering across
  // calls (the cursor walk and the single-page read are independent
  // queries with the same `(createdAt desc, id desc)` order).
  const truthSet = new Set(truthIds);
  for (const id of truthSet) {
    assert(collectedSet.has(id), `paginated walk visits truth id ${id}`);
  }
  assert(
    collectedSet.size === truthSet.size,
    `paginated walk and single-page truth have same cardinality (collected=${collectedSet.size} vs truth=${truthSet.size})`,
  );

  console.log(
    `  ✓ ${pages} pages × ${PAGE_SIZE} = ${collected.length} events, all unique, union == truth (${truthSet.size})`,
  );
}

async function main() {
  console.log(`[capinfra-correctness] base=${BASE}`);
  const { axau } = await getAssets();
  await testPolicyIdempotency(axau);
  await testAuditPagination(axau);
  console.log('\n[capinfra-correctness] OK');
}

main().catch((err) => {
  console.error('[capinfra-correctness] FAILED:', err);
  process.exit(1);
});
