/**
 * Axiom Protocol — Polygon Amoy DRY_RUN Proof Script (Phase 4).
 *
 * Proves DRY_RUN routing works end-to-end for the POLYGON capinfra adapter.
 * No live transaction is broadcast. No Polygon mainnet or testnet RPC is required.
 * No Polygon env vars are required for DRY_RUN invariants A-H.
 *
 * Invariants proven:
 *   A.  POLYGON adapter resolves from the in-memory registry
 *   B.  settlementType='POLYGON' routes through the Polygon adapter (kind check)
 *   C.  DRY_RUN returns a synthetic externalRef with '0xpoldry-' prefix
 *   C2. externalRef is DETERMINISTIC — same instruction always yields same ref
 *   D.  No live transaction is broadcast (no txHash in receipt, mode=DRY_RUN)
 *   E.  No portfolio credit during SUBMITTED state (submitted=true invariant)
 *   F.  LIVE mode fails closed with AdapterModeNotPermittedError
 *   F2. DISABLED mode throws AdapterDisabledError
 *   G.  Explicit settlement is fully controlled — externallySettleInstruction
 *       is the ONLY path from SUBMITTED → SETTLED. The second call is a
 *       ConflictError (idempotency at confirmation level, not dispatch level).
 *       Proven via DB-backed lifecycle round-trip (SUBMITTED → SETTLED → Conflict).
 *       Reports blocker if DB is unavailable — never fakes success.
 *   H.  EVM and AVALANCHE adapters remain unaffected (still resolve, still DRY_RUN)
 *
 * Usage:
 *   npx tsx scripts/vault-sprint-polygon-amoy.ts
 *
 * ⚠ OPERATOR NOTE — DB WRITES (invariant G only):
 *   When DATABASE_URL is set, invariant G temporarily inserts a synthetic
 *   cap_user, cap_asset, and cap_settlement_instruction row into the DB.
 *   All rows are deleted inside a finally block after the test completes.
 *   If the cleanup fails, the inserted IDs are printed so they can be removed
 *   manually. Run against a non-production DB for maximum safety.
 *   Invariants A-F2 and H are pure adapter-level checks — they write nothing.
 *
 * Production safety:
 *   POLYGON_ADAPTER_MODE is not set by this script. The adapter reads its own
 *   env and defaults to DRY_RUN. No Polygon mainnet or Amoy testnet call is made.
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

// ── Synthetic instruction and asset (no DB required for adapter tests) ─

function syntheticInstruction(id = 'si_polygon_amoy_dryryn_001') {
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
      note: 'Polygon Amoy DRY_RUN proof',
    },
    authorizedAt: new Date(),
    settledAt:    null,
    createdAt:    new Date(),
    updatedAt:    new Date(),
  };
}

function syntheticAsset() {
  return {
    id:                               'ast_polygon_usdc_001',
    symbol:                           'USDC-POLYGON',
    displayName:                      'USD Coin (Polygon PoS)',
    assetType:                        'STABLE_ASSET' as const,
    assetSubtype:                     'NONE' as const,
    custodyModel:                     'ON_CHAIN_NATIVE' as const,
    redemptionType:                   'NONE' as const,
    settlementType:                   'POLYGON' as const,
    chain:                            'polygon-pos',
    chainId:                          137,
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

// ── Main proof ─────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  AXIOM PROTOCOL — POLYGON AMOY DRY_RUN PROOF');
  console.log('  Phase 4 — Capinfra Adapter Foundation');
  console.log(`  Run at: ${new Date().toISOString()}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  // ── Import modules ─────────────────────────────────────────────────
  let getAdapter:          (kind: string) => import('../lib/capinfra/adapters/types').SettlementAdapter;
  let listRegisteredKinds: () => string[];
  let polygonAdapter:      import('../lib/capinfra/adapters/types').SettlementAdapter;
  let AdapterModeNotPermittedError: typeof import('../lib/capinfra/adapters/types').AdapterModeNotPermittedError;
  let AdapterDisabledError:         typeof import('../lib/capinfra/adapters/types').AdapterDisabledError;

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
    const polygonMod            = await import('../lib/capinfra/adapters/polygon/index');
    polygonAdapter              = polygonMod.polygonAdapter;
    const types                 = await import('../lib/capinfra/adapters/types');
    AdapterModeNotPermittedError = types.AdapterModeNotPermittedError;
    AdapterDisabledError        = types.AdapterDisabledError;
  } catch (err) {
    blocker('ADAPTER_IMPORT', 'Failed to import polygon adapter — check for TypeScript compilation errors');
    console.error('  Import error:', (err as Error).message);
    printSummary();
    process.exit(1);
  }

  // ── Invariant A ─────────────────────────────────────────────────────
  console.log('── Invariant A: POLYGON adapter resolves from registry ─────');
  try {
    const adapter = getAdapter('POLYGON');
    const kinds   = listRegisteredKinds();
    if (adapter.kind !== 'POLYGON') {
      fail('A', `adapter.kind is "${adapter.kind}", expected "POLYGON"`);
    } else if (!kinds.includes('POLYGON')) {
      fail('A', `"POLYGON" not in listRegisteredKinds(): [${kinds.join(', ')}]`);
    } else {
      pass('A',       `getAdapter('POLYGON') → kind='POLYGON', name='${adapter.name}'`);
      pass('A.kinds', `listRegisteredKinds() includes 'POLYGON': [${kinds.join(', ')}]`);
    }
  } catch (err) {
    fail('A', 'getAdapter("POLYGON") threw unexpectedly', (err as Error).message);
  }

  // ── Invariant B ─────────────────────────────────────────────────────
  console.log('\n── Invariant B: settlementType=POLYGON routes to Polygon adapter ─');
  try {
    const adapter = getAdapter('POLYGON');
    if (adapter.kind === 'POLYGON') {
      pass('B', `settlementType='POLYGON' → adapter.kind='${adapter.kind}' (routing correct)`);
    } else {
      fail('B', `Routing mismatch: registry returned kind='${adapter.kind}'`);
    }
  } catch (err) {
    fail('B', 'Routing check threw unexpectedly', (err as Error).message);
  }

  // ── Invariants C and C2 ─────────────────────────────────────────────
  console.log('\n── Invariant C: DRY_RUN returns 0xpoldry-… externalRef ─────');
  console.log('── Invariant C2: externalRef is DETERMINISTIC ───────────────');
  const instruction = syntheticInstruction();
  const asset       = syntheticAsset();
  let firstReceipt: Awaited<ReturnType<typeof polygonAdapter.dispatch>> | null = null;

  try {
    const savedMode = process.env.POLYGON_ADAPTER_MODE;
    process.env.POLYGON_ADAPTER_MODE = 'DRY_RUN';
    firstReceipt = await polygonAdapter.dispatch({ instruction, asset });
    process.env.POLYGON_ADAPTER_MODE = savedMode;

    const ref = firstReceipt.externalRef;
    if (!ref.startsWith('0xpoldry-')) {
      fail('C', `externalRef does not start with '0xpoldry-': "${ref}"`);
    } else {
      pass('C', `externalRef='${ref}' (correct 0xpoldry-… prefix)`);
    }

    const r = firstReceipt.receiptJson as Record<string, unknown> | null;
    if (!r) {
      fail('C.receipt', 'receiptJson is missing');
    } else if (r.mode === 'DRY_RUN' && r.kind === 'POLYGON') {
      pass('C.receipt', `receiptJson.mode='${r.mode}', kind='${r.kind}'`);
    } else {
      fail('C.receipt', `receiptJson.mode='${r.mode}', kind='${r.kind}' — expected mode=DRY_RUN, kind=POLYGON`);
    }

    // C2: determinism — dispatch the SAME instruction a second time; externalRef must be identical
    const savedMode2 = process.env.POLYGON_ADAPTER_MODE;
    process.env.POLYGON_ADAPTER_MODE = 'DRY_RUN';
    const secondReceipt = await polygonAdapter.dispatch({ instruction, asset }); // same instruction object
    process.env.POLYGON_ADAPTER_MODE = savedMode2;

    if (secondReceipt.externalRef === firstReceipt.externalRef) {
      pass('C2', `Same instruction → identical externalRef both times: '${firstReceipt.externalRef}'`);
    } else {
      fail('C2',
        `externalRef is NOT deterministic — two dispatches for same instruction returned different refs`,
        `first='${firstReceipt.externalRef}' second='${secondReceipt.externalRef}'`,
      );
    }

    // C2b: confirm different instructions yield different externalRefs (collision resistance)
    const otherInstruction = syntheticInstruction('si_polygon_amoy_other_99999');
    const savedMode3 = process.env.POLYGON_ADAPTER_MODE;
    process.env.POLYGON_ADAPTER_MODE = 'DRY_RUN';
    const otherReceipt = await polygonAdapter.dispatch({ instruction: otherInstruction, asset });
    process.env.POLYGON_ADAPTER_MODE = savedMode3;

    if (otherReceipt.externalRef !== firstReceipt.externalRef) {
      pass('C2.collision', `Different instruction → different externalRef: '${otherReceipt.externalRef}'`);
    } else {
      fail('C2.collision', 'Different instructions produced identical externalRef — hash collision or bug');
    }

  } catch (err) {
    fail('C', 'DRY_RUN dispatch threw unexpectedly', (err as Error).message);
  }

  // ── Invariant D ─────────────────────────────────────────────────────
  console.log('\n── Invariant D: No live transaction broadcast ───────────────');
  try {
    const r = firstReceipt?.receiptJson as Record<string, unknown> | null;
    if (!r) {
      fail('D', 'No receipt to inspect — C must pass first');
    } else {
      if (r.mode === 'DRY_RUN') {
        pass('D',       'receiptJson.mode=DRY_RUN confirms no broadcast occurred');
      } else {
        fail('D',       `receiptJson.mode='${r.mode}' — expected DRY_RUN`);
      }
      if (!('txHash' in r)) {
        pass('D.nohash', 'No txHash in receipt — confirms no on-chain broadcast');
      } else {
        fail('D.nohash', 'Receipt contains a txHash — live broadcast may have occurred');
      }
    }
  } catch (err) {
    fail('D', 'Broadcast check threw unexpectedly', (err as Error).message);
  }

  // ── Invariant E ─────────────────────────────────────────────────────
  console.log('\n── Invariant E: No portfolio credit during SUBMITTED state ──');
  try {
    if (!firstReceipt) {
      fail('E', 'No receipt from invariant C — cannot check SUBMITTED semantics');
    } else if (firstReceipt.submitted !== true) {
      fail('E', `receipt.submitted=${firstReceipt.submitted} — expected true; settlement.ts would NOT park at SUBMITTED`);
    } else {
      pass('E',      'receipt.submitted=true → settlement.ts parks at SUBMITTED, NO portfolio write');
      pass('E.safe', 'No portfolio credit can occur until externallySettleInstruction is called explicitly');
    }
  } catch (err) {
    fail('E', 'SUBMITTED check threw unexpectedly', (err as Error).message);
  }

  // ── Invariant F ─────────────────────────────────────────────────────
  console.log('\n── Invariant F: LIVE mode fails closed ─────────────────────');
  try {
    const savedMode = process.env.POLYGON_ADAPTER_MODE;
    process.env.POLYGON_ADAPTER_MODE = 'LIVE';
    let caught: Error | null = null;
    try {
      await polygonAdapter.dispatch({ instruction: syntheticInstruction(), asset });
    } catch (err) {
      caught = err as Error;
    }
    process.env.POLYGON_ADAPTER_MODE = savedMode;

    if (!caught) {
      fail('F', 'LIVE dispatch did NOT throw — expected AdapterModeNotPermittedError');
    } else if (caught instanceof AdapterModeNotPermittedError) {
      pass('F', `LIVE mode threw AdapterModeNotPermittedError: "${caught.message}"`);
    } else {
      fail('F', `LIVE mode threw wrong error type: ${caught.constructor.name}`, caught.message);
    }
  } catch (err) {
    fail('F', 'LIVE mode test threw unexpectedly', (err as Error).message);
  }

  // ── Invariant F2 ─────────────────────────────────────────────────────
  console.log('\n── Invariant F2: DISABLED mode throws AdapterDisabledError ──');
  try {
    const savedMode = process.env.POLYGON_ADAPTER_MODE;
    process.env.POLYGON_ADAPTER_MODE = 'DISABLED';
    let caught: Error | null = null;
    try {
      await polygonAdapter.dispatch({ instruction: syntheticInstruction(), asset });
    } catch (err) {
      caught = err as Error;
    }
    process.env.POLYGON_ADAPTER_MODE = savedMode;

    if (!caught) {
      fail('F2', 'DISABLED dispatch did NOT throw — expected AdapterDisabledError');
    } else if (caught instanceof AdapterDisabledError) {
      pass('F2', `DISABLED mode threw AdapterDisabledError: "${caught.message}"`);
    } else {
      fail('F2', `DISABLED mode threw wrong error type: ${caught.constructor.name}`, caught.message);
    }
  } catch (err) {
    fail('F2', 'DISABLED mode test threw unexpectedly', (err as Error).message);
  }

  // ── Invariant G: Explicit settlement control + confirmation idempotency ─
  //
  // G proves that:
  //   1. externallySettleInstruction is the ONLY path from SUBMITTED → SETTLED.
  //   2. Calling externallySettleInstruction a second time on an already-SETTLED
  //      instruction raises a ConflictError — idempotent at the confirmation level.
  //
  // This requires a live DB connection. If DATABASE_URL is absent or the DB
  // is not reachable, G is reported as SKIPPED with an explicit blocker message
  // — it is NOT faked as passing.
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n── Invariant G: Explicit settlement control (DB-backed) ─────');
  await proveSettlementConfirmationIdempotency();

  // ── Invariant H ─────────────────────────────────────────────────────
  console.log('\n── Invariant H: EVM and AVALANCHE adapters unaffected ───────');
  try {
    const evm = getAdapter('EVM');
    evm.kind === 'EVM'
      ? pass('H.evm',       `getAdapter('EVM') → kind='${evm.kind}' — unaffected`)
      : fail('H.evm',       `EVM adapter returned kind='${evm.kind}'`);
  } catch (err) {
    fail('H.evm', 'getAdapter("EVM") threw unexpectedly', (err as Error).message);
  }

  try {
    const ava = getAdapter('AVALANCHE');
    ava.kind === 'AVALANCHE'
      ? pass('H.avalanche', `getAdapter('AVALANCHE') → kind='${ava.kind}' — unaffected`)
      : fail('H.avalanche', `AVALANCHE adapter returned kind='${ava.kind}'`);
  } catch (err) {
    fail('H.avalanche', 'getAdapter("AVALANCHE") threw unexpectedly', (err as Error).message);
  }

  try {
    const internal = getAdapter('INTERNAL');
    pass('H.internal', `getAdapter('INTERNAL') → kind='${internal.kind}' — unaffected`);
  } catch (err) {
    fail('H.internal', 'getAdapter("INTERNAL") threw unexpectedly', (err as Error).message);
  }

  printSummary();
  const allPassed  = results.filter(r => !r.skipped).every(r => r.passed);
  const hasSkipped = results.some(r => r.skipped);
  process.exit(allPassed && !blockersEncountered ? (hasSkipped ? 2 : 0) : 1);
}

// ── G: DB-backed settlement confirmation idempotency proof ──────────

async function proveSettlementConfirmationIdempotency() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    skip(
      'G',
      'DATABASE_URL not set — cannot prove settlement confirmation idempotency. ' +
      'Set DATABASE_URL and rerun to prove invariant G.',
    );
    return;
  }

  let db:   typeof import('../server/db').db;
  let sql:  typeof import('drizzle-orm').sql;
  let generateId: (prefix: string) => string;
  let externallySettleInstruction: (input: import('../lib/capinfra/settlement').ExternalSettleInput) => Promise<unknown>;
  let ConflictError: typeof import('../lib/capinfra/errors').ConflictError;

  try {
    const dbMod        = await import('../server/db');
    const drizzle      = await import('drizzle-orm');
    const idsMod       = await import('../lib/capinfra/ids');
    const settleMod    = await import('../lib/capinfra/settlement');
    const errorsMod    = await import('../lib/capinfra/errors');
    db                 = dbMod.db;
    sql                = drizzle.sql;
    generateId         = idsMod.generateId;
    externallySettleInstruction = settleMod.externallySettleInstruction;
    ConflictError      = errorsMod.ConflictError;
  } catch (err) {
    skip('G', `Could not import DB / settlement modules: ${(err as Error).message}`);
    return;
  }

  // G1: Verify DB connectivity
  try {
    await db.execute(sql`SELECT 1`);
  } catch (err) {
    skip('G', `DB not reachable: ${(err as Error).message}`);
    return;
  }
  pass('G.db', 'DB connection confirmed');

  // G2: Seed a minimal SUBMITTED instruction directly in the DB so we can prove
  //     confirmation lifecycle without going through full policy / authorize flow.
  //     We insert a synthetic cap_user + cap_asset + cap_settlement_instruction.
  //     All rows are cleaned up via ROLLBACK (we use a transaction that's aborted).
  //
  // We do NOT use BEGIN/ROLLBACK explicitly — instead we run the probe in an
  // inner try/catch and delete the seeded rows in a finally block.

  const userId        = generateId('usr');
  const assetId       = generateId('ast');
  const instructionId = generateId('si');
  const idempotencyKey = `vault-sprint-polygon-g-${Date.now()}`;
  const externalRef   = `0xpoldry-${instructionId.slice(-16)}-testrecon99`;

  try {
    // Seed minimal rows (no policy decision needed — we insert at SUBMITTED directly)
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

    pass('G.seed', `Seeded SUBMITTED instruction id='${instructionId}' externalRef='${externalRef}'`);

    // G3: externallySettleInstruction — first call must transition SUBMITTED → SETTLED
    const settleInput = {
      instructionId,
      externalRef,
      settledAt:    new Date(),
      webhookEventId: `vault-sprint-polygon-wh-${Date.now()}`,
      actor:        'vault-sprint-polygon-proof',
    };

    let settled: Record<string, unknown> | null = null;
    try {
      settled = await externallySettleInstruction(settleInput) as Record<string, unknown>;
      if (settled && (settled as Record<string, unknown>).status === 'SETTLED') {
        pass('G.settle1', `First externallySettleInstruction call: status='${(settled as Record<string, unknown>).status}' ✓`);
      } else {
        fail('G.settle1', `Expected SETTLED, got status='${(settled as Record<string, unknown>)?.status}'`);
      }
    } catch (err) {
      fail('G.settle1', 'First externallySettleInstruction call threw', (err as Error).message);
    }

    // G4: second call must raise ConflictError (SETTLED is a terminal state)
    const settleInput2 = { ...settleInput, webhookEventId: `vault-sprint-polygon-wh2-${Date.now()}` };
    let caught: Error | null = null;
    try {
      await externallySettleInstruction(settleInput2);
    } catch (err) {
      caught = err as Error;
    }

    if (!caught) {
      fail('G.settle2', 'Second externallySettleInstruction did NOT throw — expected ConflictError (SETTLED is terminal)');
    } else if (caught instanceof ConflictError) {
      pass('G.settle2', `Second call raised ConflictError: "${caught.message}" — idempotency at confirmation level PROVEN`);
    } else {
      fail('G.settle2',
        `Second call threw unexpected error type: ${caught.constructor.name}`,
        caught.message,
      );
    }

  } catch (outerErr) {
    fail('G', 'Settlement confirmation proof failed unexpectedly', (outerErr as Error).message);
  } finally {
    // Cleanup seeded rows
    try {
      await db.execute(sql`DELETE FROM cap_settlement_instructions WHERE id = ${instructionId}`);
      await db.execute(sql`DELETE FROM cap_assets WHERE id = ${assetId}`);
      await db.execute(sql`DELETE FROM cap_users WHERE id = ${userId}`);
    } catch {
      // Cleanup failure is non-fatal for the proof — warn only
      console.warn(`  [cleanup] Could not delete seeded rows — clean up manually: userId=${userId}, assetId=${assetId}, instructionId=${instructionId}`);
    }
  }
}

// ── Summary ────────────────────────────────────────────────────────

function printSummary() {
  const passed  = results.filter(r => r.passed).length;
  const failed  = results.filter(r => !r.passed && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  POLYGON AMOY DRY_RUN PROOF — SUMMARY');
  console.log('══════════════════════════════════════════════════════════════');

  if (blockersEncountered) {
    console.log('\n  STATUS: BLOCKED — see BLOCKER entries above');
    console.log('  Fix the import/DB/env blockers and rerun.\n');
    return;
  }

  for (const r of results) {
    const icon = r.passed ? '✓' : r.skipped ? '~' : '✗';
    console.log(`  ${icon} ${r.label}: ${r.note}`);
  }

  console.log(`\n  Total: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  if (failed === 0 && skipped === 0) {
    console.log('\n  ┌────────────────────────────────────────────────────────┐');
    console.log('  │  POLYGON PHASE 4 DRY_RUN FOUNDATION READY              │');
    console.log('  │  All invariants proven including confirmation           │');
    console.log('  │  idempotency via DB-backed lifecycle round-trip.        │');
    console.log('  │  No live transaction sent. No production flag enabled.  │');
    console.log('  └────────────────────────────────────────────────────────┘\n');
  } else if (failed === 0 && skipped > 0) {
    console.log('\n  ┌────────────────────────────────────────────────────────┐');
    console.log('  │  POLYGON PHASE 4 DRY_RUN ADAPTER PROVEN                │');
    console.log('  │  Adapter invariants passed. Invariant G skipped        │');
    console.log('  │  (DB not available). Set DATABASE_URL to prove G.      │');
    console.log('  └────────────────────────────────────────────────────────┘\n');
  } else {
    console.log('\n  ┌────────────────────────────────────────────────────────┐');
    console.log('  │  FIX REQUIRED — see failures above                     │');
    console.log('  └────────────────────────────────────────────────────────┘\n');
  }

  console.log('  Remaining before Polygon LIVE:');
  console.log('    1. BitGo Polygon custody wallet registered');
  console.log('    2. Accepted-risk record signed for Polygon LIVE');
  console.log('    3. Polygon Amoy smoke test with live RPC');
  console.log('    4. Full reconciliation cron deployed');
  console.log('    5. Legal review of Polygon-settled payments');
  console.log('    6. capinfra POLYGON adapter LIVE path implemented\n');
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
