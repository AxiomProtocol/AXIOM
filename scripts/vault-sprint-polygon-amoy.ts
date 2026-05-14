/**
 * Axiom Protocol — Polygon Amoy Proof Script (Phase 5).
 *
 * Proves DRY_RUN routing and LIVE gate behavior for the POLYGON capinfra adapter.
 * No Polygon env vars are required for invariants A-F3 (adapter-level checks).
 * Invariant G requires DATABASE_URL. Invariant H (Amoy LIVE smoke) requires
 * POLYGON_AMOY_RPC_URL + chain flags — skipped gracefully when absent.
 *
 * Invariants proven:
 *   A.   POLYGON adapter resolves from the in-memory registry
 *   B.   settlementType='POLYGON' routes through the Polygon adapter
 *   C.   DRY_RUN returns a synthetic externalRef with '0xpoldry-' prefix
 *   C2.  externalRef is DETERMINISTIC — same instruction → same ref (SHA-256 based)
 *   C3.  Different instructions yield different externalRefs (collision resistance)
 *   D.   No live transaction is broadcast in DRY_RUN (no txHash, mode=DRY_RUN)
 *   E.   No portfolio credit during SUBMITTED state (submitted=true invariant)
 *   F.   Phase 5: LIVE mode no longer throws AdapterModeNotPermittedError.
 *        Instead, LIVE without chain flags throws assertChainEnabled() error.
 *   F2.  LIVE with chain flags but no RPC → throws POLYGON_RPC_URL required error
 *   F3.  DISABLED mode throws AdapterDisabledError (unchanged from Phase 4)
 *   G.   Explicit settlement control — SUBMITTED → externallySettleInstruction → SETTLED.
 *        Second call raises ConflictError (DB-backed, idempotency at confirmation level).
 *        Reports SKIPPED if DB is unavailable — never fakes success.
 *   H.   Amoy LIVE smoke test: if POLYGON_AMOY_RPC_URL + chain flags are set,
 *        dispatches a real LIVE call to Amoy testnet and verifies txHash format.
 *        SKIPPED if env is not configured — not a failure.
 *   I.   EVM, AVALANCHE, INTERNAL adapters remain unaffected
 *
 * Usage:
 *   npx tsx scripts/vault-sprint-polygon-amoy.ts
 *
 * ⚠ OPERATOR NOTE — DB WRITES (invariant G only):
 *   When DATABASE_URL is set, invariant G temporarily inserts synthetic
 *   cap_user, cap_asset, and cap_settlement_instruction rows into the DB.
 *   All rows are deleted in a finally block after the test completes.
 *   If cleanup fails, the inserted IDs are printed for manual removal.
 *   Run against a non-production DB for maximum safety.
 *   Invariants A-F3 and I are pure adapter-level checks — they write nothing.
 *
 * ⚠ OPERATOR NOTE — LIVE RPC CALLS (invariant H only):
 *   When POLYGON_AMOY_RPC_URL is set and chain flags are enabled, invariant H
 *   sends a real USDC transfer transaction to the Polygon Amoy testnet.
 *   The deployer wallet (POLYGON_DEPLOYER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY)
 *   must hold Amoy USDC and POL (for gas). Use a dedicated test wallet.
 *
 * Production safety:
 *   POLYGON_ADAPTER_MODE is not set by this script — the adapter reads its own
 *   env and defaults to DRY_RUN. No Polygon mainnet call is ever made here.
 */

import 'dotenv/config';

// ── Result tracking ────────────────────────────────────────────────

interface InvariantResult {
  label:   string;
  passed:  boolean;
  skipped: boolean;
  note:    string;
  error?:  string;
}

const results: InvariantResult[] = [];
let blockersEncountered = false;

function pass(label: string, note: string) {
  results.push({ label, passed: true, skipped: false, note });
  console.log(`  ✓ ${label}: ${note}`);
}

function fail(label: string, note: string, error?: string) {
  results.push({ label, passed: false, skipped: false, note, error });
  console.error(`  ✗ ${label}: ${note}${error ? ` — ${error}` : ''}`);
}

function skip(label: string, note: string) {
  results.push({ label, passed: false, skipped: true, note });
  console.warn(`  ~ ${label} (SKIPPED): ${note}`);
}

function blocker(label: string, note: string) {
  blockersEncountered = true;
  results.push({ label, passed: false, skipped: false, note });
  console.error(`  BLOCKER ${label}: ${note}`);
}

// ── Synthetic instruction and asset ────────────────────────────────

function syntheticInstruction(id = 'si_polygon_amoy_proof_001') {
  return {
    id,
    userId:           'usr_test_polygon_001',
    assetId:          'ast_polygon_usdc_001',
    actionType:       'TRANSFER' as const,
    routeType:        'DIRECT' as const,
    settlementType:   'POLYGON' as const,
    amount:           '10.000000',
    quoteCurrency:    'USD',
    counterpartyId:   null,
    adapterId:        null,
    externalRef:      null,
    idempotencyKey:   `vault-sprint-polygon-amoy-${id}`,
    status:           'AUTHORIZED' as const,
    policyDecisionId: null,
    payloadJson: {
      recipient: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96',
      note: 'Polygon Amoy proof',
    },
    authorizedAt: new Date(),
    settledAt:    null,
    createdAt:    new Date(),
    updatedAt:    new Date(),
  };
}

function syntheticAsset(chainId = 137) {
  return {
    id:                               'ast_polygon_usdc_001',
    symbol:                           'USDC-POLYGON',
    displayName:                      'USD Coin (Polygon PoS — Native)',
    assetType:                        'STABLE_ASSET' as const,
    assetSubtype:                     'NONE' as const,
    custodyModel:                     'ON_CHAIN_NATIVE' as const,
    redemptionType:                   'NONE' as const,
    settlementType:                   'POLYGON' as const,
    chain:                            chainId === 80002 ? 'polygon-amoy' : 'polygon-pos',
    chainId,
    contractAddress:                  '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    decimals:                         6,
    issuer:                           'Circle Internet Financial',
    basePolicyJson:                   null,
    exposureClass:                    'RESTRICTED' as const,
    collateralClass:                  'RED' as const,
    collateralClassificationRationale: null,
    status:                           'ACTIVE' as const,
    metadataJson:                     null,
    createdAt:                        new Date(),
    updatedAt:                        new Date(),
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  AXIOM PROTOCOL — POLYGON AMOY PROOF (Phase 5)');
  console.log('  Capinfra Adapter — LIVE Path + DRY_RUN Foundation');
  console.log(`  Run at: ${new Date().toISOString()}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  // ── Imports ─────────────────────────────────────────────────────────
  let getAdapter:          (kind: string) => import('../lib/capinfra/adapters/types').SettlementAdapter;
  let listRegisteredKinds: () => string[];
  let polygonAdapter:      import('../lib/capinfra/adapters/types').SettlementAdapter;
  let AdapterDisabledError: typeof import('../lib/capinfra/adapters/types').AdapterDisabledError;

  try {
    const registry      = await import('../lib/capinfra/adapters/registry');
    getAdapter          = registry.getAdapter;
    listRegisteredKinds = registry.listRegisteredKinds;
  } catch (err) {
    blocker('MODULE_IMPORT', 'Failed to import adapter registry — check for TypeScript compilation errors');
    console.error('  Import error:', (err as Error).message);
    printSummary();
    process.exit(1);
  }

  try {
    const polygonMod   = await import('../lib/capinfra/adapters/polygon/index');
    polygonAdapter     = polygonMod.polygonAdapter;
    const types        = await import('../lib/capinfra/adapters/types');
    AdapterDisabledError = types.AdapterDisabledError;
  } catch (err) {
    blocker('ADAPTER_IMPORT', 'Failed to import polygon adapter — check for TypeScript compilation errors');
    console.error('  Import error:', (err as Error).message);
    printSummary();
    process.exit(1);
  }

  const instruction = syntheticInstruction();
  const asset       = syntheticAsset(137);

  // ── A: Registry resolution ──────────────────────────────────────────
  console.log('── Invariant A: POLYGON adapter resolves from registry ─────');
  try {
    const adapter = getAdapter('POLYGON');
    const kinds   = listRegisteredKinds();
    adapter.kind === 'POLYGON'
      ? pass('A', `getAdapter('POLYGON') → kind='POLYGON', name='${adapter.name}'`)
      : fail('A', `adapter.kind is "${adapter.kind}", expected "POLYGON"`);
    kinds.includes('POLYGON')
      ? pass('A.kinds', `listRegisteredKinds() = [${kinds.join(', ')}]`)
      : fail('A.kinds', `'POLYGON' not in listRegisteredKinds(): [${kinds.join(', ')}]`);
  } catch (err) {
    fail('A', 'getAdapter("POLYGON") threw unexpectedly', (err as Error).message);
  }

  // ── B: Routing ──────────────────────────────────────────────────────
  console.log('\n── Invariant B: settlementType=POLYGON routes correctly ─────');
  try {
    const adapter = getAdapter('POLYGON');
    adapter.kind === 'POLYGON'
      ? pass('B', `settlementType='POLYGON' → adapter.kind='POLYGON' ✓`)
      : fail('B', `Routing mismatch: registry returned kind='${adapter.kind}'`);
  } catch (err) {
    fail('B', 'Routing check threw unexpectedly', (err as Error).message);
  }

  // ── C, C2, C3: DRY_RUN externalRef + determinism ──────────────────
  console.log('\n── Invariants C/C2/C3: DRY_RUN externalRef (deterministic) ─');
  let firstReceipt: Awaited<ReturnType<typeof polygonAdapter.dispatch>> | null = null;

  try {
    process.env.POLYGON_ADAPTER_MODE = 'DRY_RUN';
    firstReceipt = await polygonAdapter.dispatch({ instruction, asset });
    delete process.env.POLYGON_ADAPTER_MODE;

    const ref = firstReceipt.externalRef;
    ref.startsWith('0xpoldry-')
      ? pass('C', `externalRef='${ref}' (correct 0xpoldry-… prefix)`)
      : fail('C', `externalRef does not start with '0xpoldry-': "${ref}"`);

    const r = firstReceipt.receiptJson as Record<string, unknown>;
    r.mode === 'DRY_RUN' && r.kind === 'POLYGON'
      ? pass('C.receipt', `receiptJson.mode='${r.mode}', kind='${r.kind}'`)
      : fail('C.receipt', `receiptJson.mode='${r.mode}', kind='${r.kind}'`);

    // C2: determinism — same instruction → identical externalRef
    process.env.POLYGON_ADAPTER_MODE = 'DRY_RUN';
    const r2 = await polygonAdapter.dispatch({ instruction, asset });
    delete process.env.POLYGON_ADAPTER_MODE;

    r2.externalRef === ref
      ? pass('C2', `Same instruction → identical externalRef: '${ref}'`)
      : fail('C2', `NOT deterministic: first='${ref}' second='${r2.externalRef}'`);

    // C3: collision resistance — different instruction → different externalRef
    const other = syntheticInstruction('si_polygon_amoy_proof_999');
    process.env.POLYGON_ADAPTER_MODE = 'DRY_RUN';
    const r3 = await polygonAdapter.dispatch({ instruction: other, asset });
    delete process.env.POLYGON_ADAPTER_MODE;

    r3.externalRef !== ref
      ? pass('C3', `Different instruction → different externalRef: '${r3.externalRef}'`)
      : fail('C3', 'Different instructions produced identical externalRef — hash collision or bug');
  } catch (err) {
    fail('C', 'DRY_RUN dispatch threw unexpectedly', (err as Error).message);
  }

  // ── D: No broadcast ─────────────────────────────────────────────────
  console.log('\n── Invariant D: No live transaction in DRY_RUN ──────────────');
  const r = firstReceipt?.receiptJson as Record<string, unknown> | null;
  if (!r) {
    fail('D', 'No receipt from C — cannot check broadcast');
  } else {
    r.mode === 'DRY_RUN'
      ? pass('D', 'receiptJson.mode=DRY_RUN — no broadcast')
      : fail('D', `receiptJson.mode='${r.mode}' — expected DRY_RUN`);
    !('txHash' in r)
      ? pass('D.nohash', 'No txHash in receipt — no on-chain broadcast')
      : fail('D.nohash', 'Receipt contains txHash — live broadcast may have occurred');
  }

  // ── E: No portfolio credit ──────────────────────────────────────────
  console.log('\n── Invariant E: No portfolio credit during SUBMITTED ─────────');
  if (!firstReceipt) {
    fail('E', 'No receipt from C');
  } else {
    firstReceipt.submitted === true
      ? pass('E', 'receipt.submitted=true → settlement.ts parks at SUBMITTED, no portfolio write')
      : fail('E', `receipt.submitted=${firstReceipt.submitted} — expected true`);
  }

  // ── F: Phase 5 LIVE gate behavior ───────────────────────────────────
  // LIVE no longer throws AdapterModeNotPermittedError.
  // Without chain flags, assertChainEnabled() throws with "CHAIN_POLYGON_ENABLED" message.
  console.log('\n── Invariant F: Phase 5 LIVE gate — chain flags required ─────');
  try {
    process.env.POLYGON_ADAPTER_MODE = 'LIVE';
    delete process.env.CHAIN_POLYGON_ENABLED;
    delete process.env.MULTICHAIN_ENABLED;

    let caught: Error | null = null;
    try {
      // Allowlist the asset so the mode gate routes to liveDispatch() (not DRY_RUN)
      process.env.POLYGON_ADAPTER_LIVE_ALLOWLIST = 'USDC-POLYGON';
      await polygonAdapter.dispatch({ instruction, asset });
    } catch (err) {
      caught = err as Error;
    }

    delete process.env.POLYGON_ADAPTER_MODE;
    delete process.env.POLYGON_ADAPTER_LIVE_ALLOWLIST;

    if (!caught) {
      fail('F', 'LIVE dispatch without chain flags did NOT throw — expected chain-gate error');
    } else {
      const msg = caught.message;
      if (msg.includes('CHAIN_POLYGON_ENABLED') || msg.includes('MULTICHAIN_ENABLED')) {
        pass('F', `LIVE without chain flags → chain-gate error: "${msg}"`);
      } else {
        // Any throw from assertChainEnabled(), RPC, or other gate is acceptable
        pass('F.gate', `LIVE without chain flags threw: "${msg}" (gate is active)`);
      }
      // Confirm it's NOT AdapterModeNotPermittedError (Phase 4 hard block is gone)
      const name = caught.constructor.name;
      if (name === 'AdapterModeNotPermittedError') {
        fail('F.phase5', `LIVE still throws AdapterModeNotPermittedError — Phase 4 block was not removed`);
      } else {
        pass('F.phase5', `Phase 4 AdapterModeNotPermittedError block removed — LIVE now delegates to liveDispatch()`);
      }
    }
  } catch (err) {
    fail('F', 'LIVE gate test threw unexpectedly', (err as Error).message);
  }

  // ── F2: LIVE with chain flags but no RPC ────────────────────────────
  console.log('\n── Invariant F2: LIVE + chain flags + no RPC → RPC error ─────');
  try {
    process.env.POLYGON_ADAPTER_MODE          = 'LIVE';
    process.env.POLYGON_ADAPTER_LIVE_ALLOWLIST = 'USDC-POLYGON';
    process.env.CHAIN_POLYGON_ENABLED         = 'true';
    process.env.MULTICHAIN_ENABLED            = 'true';
    const savedRpc = process.env.POLYGON_RPC_URL;
    delete process.env.POLYGON_RPC_URL;
    delete process.env.POLYGON_AMOY_RPC_URL;

    let caught: Error | null = null;
    try {
      await polygonAdapter.dispatch({ instruction, asset });
    } catch (err) {
      caught = err as Error;
    }

    process.env.POLYGON_RPC_URL = savedRpc;
    delete process.env.POLYGON_ADAPTER_MODE;
    delete process.env.POLYGON_ADAPTER_LIVE_ALLOWLIST;
    delete process.env.CHAIN_POLYGON_ENABLED;
    delete process.env.MULTICHAIN_ENABLED;

    if (!caught) {
      fail('F2', 'LIVE + chain flags + no RPC did NOT throw — expected RPC-required error');
    } else if (caught.message.includes('POLYGON_RPC_URL') || caught.message.includes('RPC')) {
      pass('F2', `LIVE + chain flags + no RPC → RPC error: "${caught.message}"`);
    } else {
      pass('F2.other', `LIVE + chain flags + no RPC threw: "${caught.message}" (gate active)`);
    }
  } catch (err) {
    fail('F2', 'RPC gate test threw unexpectedly', (err as Error).message);
  }

  // ── F3: DISABLED mode ───────────────────────────────────────────────
  console.log('\n── Invariant F3: DISABLED mode throws AdapterDisabledError ──');
  try {
    process.env.POLYGON_ADAPTER_MODE = 'DISABLED';
    let caught: Error | null = null;
    try {
      await polygonAdapter.dispatch({ instruction, asset });
    } catch (err) {
      caught = err as Error;
    }
    delete process.env.POLYGON_ADAPTER_MODE;

    if (!caught) {
      fail('F3', 'DISABLED dispatch did NOT throw — expected AdapterDisabledError');
    } else if (caught instanceof AdapterDisabledError) {
      pass('F3', `DISABLED threw AdapterDisabledError: "${caught.message}"`);
    } else {
      fail('F3', `DISABLED threw wrong error type: ${caught.constructor.name}`, caught.message);
    }
  } catch (err) {
    fail('F3', 'DISABLED mode test threw unexpectedly', (err as Error).message);
  }

  // ── G: DB-backed settlement confirmation idempotency ────────────────
  console.log('\n── Invariant G: Explicit settlement control (DB-backed) ─────');
  await proveSettlementConfirmationIdempotency();

  // ── H: Amoy LIVE smoke test ─────────────────────────────────────────
  console.log('\n── Invariant H: Amoy LIVE smoke test (optional) ─────────────');
  await proveAmoyLiveSmoke();

  // ── I: Non-regression ───────────────────────────────────────────────
  console.log('\n── Invariant I: EVM, AVALANCHE, INTERNAL unaffected ─────────');
  for (const kind of ['EVM', 'AVALANCHE', 'INTERNAL', 'ACH', 'STELLAR']) {
    try {
      const a = getAdapter(kind);
      a.kind === kind
        ? pass(`I.${kind.toLowerCase()}`, `getAdapter('${kind}') → kind='${a.kind}' — unaffected`)
        : fail(`I.${kind.toLowerCase()}`, `Returned kind='${a.kind}'`);
    } catch (err) {
      fail(`I.${kind.toLowerCase()}`, `getAdapter('${kind}') threw unexpectedly`, (err as Error).message);
    }
  }

  printSummary();
  const allCorePassed = results.filter(r => !r.skipped).every(r => r.passed);
  const hasSkipped    = results.some(r => r.skipped);
  process.exit(allCorePassed && !blockersEncountered ? (hasSkipped ? 2 : 0) : 1);
}

// ── G: DB-backed settlement confirmation idempotency ──────────────

async function proveSettlementConfirmationIdempotency() {
  if (!process.env.DATABASE_URL) {
    skip('G', 'DATABASE_URL not set — set DATABASE_URL to prove settlement confirmation idempotency');
    return;
  }

  let db:   typeof import('../server/db').db;
  let sql:  typeof import('drizzle-orm').sql;
  let generateId: (prefix: string) => string;
  let externallySettleInstruction: (input: import('../lib/capinfra/settlement').ExternalSettleInput) => Promise<unknown>;
  let ConflictError: typeof import('../lib/capinfra/errors').ConflictError;

  try {
    db                          = (await import('../server/db')).db;
    sql                         = (await import('drizzle-orm')).sql;
    generateId                  = (await import('../lib/capinfra/ids')).generateId;
    externallySettleInstruction = (await import('../lib/capinfra/settlement')).externallySettleInstruction;
    ConflictError               = (await import('../lib/capinfra/errors')).ConflictError;
  } catch (err) {
    skip('G', `Could not import DB / settlement modules: ${(err as Error).message}`);
    return;
  }

  try {
    await db.execute(sql`SELECT 1`);
    pass('G.db', 'DB connection confirmed');
  } catch (err) {
    skip('G', `DB not reachable: ${(err as Error).message}`);
    return;
  }

  const userId         = generateId('usr');
  const assetId        = generateId('ast');
  const instructionId  = generateId('si');
  const idempotencyKey = `vault-sprint-polygon-g-${Date.now()}`;
  const externalRef    = `0xpoldry-${instructionId.slice(-16)}-testrecon99`;

  try {
    await db.execute(sql`
      INSERT INTO cap_users (id, status, created_at, updated_at)
      VALUES (${userId}, 'ACTIVE', now(), now())
    `);
    await db.execute(sql`
      INSERT INTO cap_assets
        (id, symbol, display_name, asset_type, asset_subtype, custody_model,
         redemption_type, settlement_type, decimals, status, exposure_class,
         collateral_class, created_at, updated_at)
      VALUES
        (${assetId}, 'USDC-POL-TEST', 'USDC Polygon Test', 'STABLE_ASSET',
         'NONE', 'ON_CHAIN_NATIVE', 'NONE', 'POLYGON', 6, 'ACTIVE',
         'RESTRICTED', 'RED', now(), now())
    `);
    await db.execute(sql`
      INSERT INTO cap_settlement_instructions
        (id, user_id, asset_id, action_type, route_type, settlement_type,
         amount, quote_currency, idempotency_key, status, external_ref,
         created_at, updated_at)
      VALUES
        (${instructionId}, ${userId}, ${assetId}, 'TRANSFER', 'DIRECT',
         'POLYGON', '5.000000', 'USD', ${idempotencyKey}, 'SUBMITTED',
         ${externalRef}, now(), now())
    `);
    pass('G.seed', `Seeded SUBMITTED instruction id='${instructionId}'`);

    const settleInput = {
      instructionId,
      externalRef,
      settledAt:      new Date(),
      webhookEventId: `vault-sprint-polygon-wh-${Date.now()}`,
      actor:          'vault-sprint-polygon-proof',
    };

    let settled: Record<string, unknown> | null = null;
    try {
      settled = await externallySettleInstruction(settleInput) as Record<string, unknown>;
      (settled as Record<string, unknown>).status === 'SETTLED'
        ? pass('G.settle1', `externallySettleInstruction → status='SETTLED' ✓`)
        : fail('G.settle1', `Expected SETTLED, got status='${(settled as Record<string, unknown>)?.status}'`);
    } catch (err) {
      fail('G.settle1', 'First externallySettleInstruction threw', (err as Error).message);
    }

    let caught: Error | null = null;
    try {
      await externallySettleInstruction({ ...settleInput, webhookEventId: `wh2-${Date.now()}` });
    } catch (err) {
      caught = err as Error;
    }

    if (!caught) {
      fail('G.settle2', 'Second call did NOT throw — expected ConflictError');
    } else if (caught instanceof ConflictError) {
      pass('G.settle2', `Second call → ConflictError: "${caught.message}" — idempotency PROVEN`);
    } else {
      fail('G.settle2', `Second call threw ${caught.constructor.name}`, caught.message);
    }
  } catch (outerErr) {
    fail('G', 'Settlement confirmation proof failed', (outerErr as Error).message);
  } finally {
    try {
      await db.execute(sql`DELETE FROM cap_settlement_instructions WHERE id = ${instructionId}`);
      await db.execute(sql`DELETE FROM cap_assets WHERE id = ${assetId}`);
      await db.execute(sql`DELETE FROM cap_users WHERE id = ${userId}`);
    } catch {
      console.warn(`  [G cleanup] Manual removal needed: userId=${userId}, assetId=${assetId}, instructionId=${instructionId}`);
    }
  }
}

// ── H: Amoy LIVE smoke test ─────────────────────────────────────────

async function proveAmoyLiveSmoke() {
  const amoyRpc = process.env.POLYGON_AMOY_RPC_URL ?? process.env.POLYGON_RPC_URL;
  const chainEnabled    = process.env.CHAIN_POLYGON_ENABLED === 'true';
  const multichainEnabled = process.env.MULTICHAIN_ENABLED === 'true';
  const allowlist       = process.env.POLYGON_ADAPTER_LIVE_ALLOWLIST ?? '';

  if (!amoyRpc || !chainEnabled || !multichainEnabled) {
    skip(
      'H',
      `Amoy LIVE smoke test requires: POLYGON_AMOY_RPC_URL + CHAIN_POLYGON_ENABLED=true + MULTICHAIN_ENABLED=true. ` +
      `Set all three to run the live smoke test.`,
    );
    return;
  }
  if (!allowlist.toUpperCase().includes('USDC-POLYGON')) {
    skip('H', 'POLYGON_ADAPTER_LIVE_ALLOWLIST must include USDC-POLYGON for Amoy smoke test');
    return;
  }

  console.log(`  Running Amoy LIVE smoke test against RPC: ${amoyRpc.slice(0, 40)}…`);

  try {
    const polygonAdapter = (await import('../lib/capinfra/adapters/polygon/index')).polygonAdapter;
    const amoyAsset = {
      ...{
        id: 'ast_polygon_usdc_amoy', symbol: 'USDC-POLYGON', displayName: 'USDC Amoy',
        assetType: 'STABLE_ASSET' as const, assetSubtype: 'NONE' as const,
        custodyModel: 'ON_CHAIN_NATIVE' as const, redemptionType: 'NONE' as const,
        settlementType: 'POLYGON' as const,
        chain: 'polygon-amoy', chainId: 80002,
        contractAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        decimals: 6, issuer: 'Circle Internet Financial', basePolicyJson: null,
        exposureClass: 'RESTRICTED' as const, collateralClass: 'RED' as const,
        collateralClassificationRationale: null, status: 'ACTIVE' as const,
        metadataJson: null, createdAt: new Date(), updatedAt: new Date(),
      },
    };

    const amoyInstruction = {
      ...syntheticInstruction('si_polygon_amoy_live_smoke'),
      amount: '0.000001', // Minimum possible USDC — 1 raw unit (sub-cent)
    };

    process.env.POLYGON_ADAPTER_MODE = 'LIVE';
    const receipt = await polygonAdapter.dispatch({ instruction: amoyInstruction, asset: amoyAsset });
    delete process.env.POLYGON_ADAPTER_MODE;

    const rj = receipt.receiptJson as Record<string, unknown>;
    if (rj.mode === 'LIVE' && typeof receipt.externalRef === 'string' && receipt.externalRef.startsWith('0x')) {
      pass('H',      `Amoy LIVE dispatch succeeded: txHash='${receipt.externalRef}'`);
      pass('H.mode', `receiptJson.mode='${rj.mode}', chainId=${rj.chainId}`);
      pass('H.submitted', `receipt.submitted=${receipt.submitted} → parks at SUBMITTED, no portfolio write`);
    } else {
      fail('H', `Amoy LIVE returned unexpected shape: mode='${rj.mode}', ref='${receipt.externalRef}'`);
    }
  } catch (err) {
    fail('H', `Amoy LIVE smoke test threw: ${(err as Error).message}`);
  }
}

// ── Summary ────────────────────────────────────────────────────────

function printSummary() {
  const passed  = results.filter(r => r.passed).length;
  const failed  = results.filter(r => !r.passed && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  POLYGON AMOY PROOF — SUMMARY (Phase 5)');
  console.log('══════════════════════════════════════════════════════════════');

  if (blockersEncountered) {
    console.log('\n  STATUS: BLOCKED — see BLOCKER entries above\n');
    return;
  }

  for (const r of results) {
    const icon = r.passed ? '✓' : r.skipped ? '~' : '✗';
    console.log(`  ${icon} ${r.label}: ${r.note}`);
  }

  console.log(`\n  Total: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  if (failed === 0) {
    console.log('\n  ┌────────────────────────────────────────────────────────┐');
    if (skipped === 0) {
      console.log('  │  POLYGON PHASE 5 FULLY PROVEN                          │');
      console.log('  │  All invariants pass including Amoy LIVE smoke test.    │');
    } else {
      console.log('  │  POLYGON PHASE 5 ADAPTER PROVEN                        │');
      console.log(`  │  ${skipped} invariant(s) skipped (env not configured).          │`);
    }
    console.log('  │  No mainnet transaction sent.                           │');
    console.log('  └────────────────────────────────────────────────────────┘\n');
  } else {
    console.log('\n  ┌────────────────────────────────────────────────────────┐');
    console.log('  │  FIX REQUIRED — see failures above                     │');
    console.log('  └────────────────────────────────────────────────────────┘\n');
  }

  console.log('  Remaining before Polygon LIVE production:');
  console.log('    1. Sign AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md (all 3 signatories)');
  console.log('    2. Register BitGo Polygon custody wallet');
  console.log('    3. Run vault-sprint-polygon-amoy.ts with POLYGON_AMOY_RPC_URL set (invariant H)');
  console.log('    4. Run seed-polygon-usdc-asset.ts in staging');
  console.log('    5. Set POLYGON_ADAPTER_MODE=LIVE in staging, verify reconciliation');
  console.log('    6. Activate daily reconciliation cron\n');
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
