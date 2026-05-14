/**
 * Axiom Protocol — Polygon BitGo Custody Wallet Registration Script (Phase 5).
 *
 * Registers the Axiom Polygon treasury wallet in the custodyWalletRegistry
 * so that: (1) the reconciliation script can identify the correct wallet,
 * (2) syncCustodyWallets() links BitGo API data to the Polygon chain entry,
 * and (3) operators have an auditable record of when the wallet was registered.
 *
 * This script is IDEMPOTENT — safe to run multiple times.
 * If a Polygon wallet is already registered (by walletAddress), it updates
 * the status field if provided and exits 0.
 *
 * ⚠ OPERATOR REQUIREMENTS before running:
 *   1. BitGo Polygon wallet must be provisioned via BitGo CaaS dashboard
 *   2. The wallet address (POLYGON_TREASURY_WALLET) must be confirmed on-chain
 *   3. AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md must be signed by all 3 signatories
 *   4. Set CHAIN_POLYGON_ENABLED=true to confirm explicit intent
 *
 * Env vars:
 *   DATABASE_URL              — PostgreSQL connection string (required)
 *   POLYGON_TREASURY_WALLET   — 0x… treasury/custody wallet address (required)
 *   BITGO_POLYGON_WALLET_ID   — BitGo wallet ID for this wallet (optional, for metadata)
 *   CHAIN_POLYGON_ENABLED     — Must be "true" to proceed
 *   POLYGON_WALLET_LABEL      — Human-readable label (default: "Axiom Polygon Treasury")
 *
 * Usage:
 *   npx tsx scripts/seed-polygon-custody-wallet.ts
 *
 * ⚠ This script writes to the database. Confirm DATABASE_URL targets the correct
 *   environment before running.
 */

import 'dotenv/config';

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  AXIOM PROTOCOL — POLYGON CUSTODY WALLET REGISTRATION (Phase 5)');
  console.log(`  Run at: ${new Date().toISOString()}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  // ── Pre-flight ──────────────────────────────────────────────────────
  if (!process.env.DATABASE_URL) {
    console.error('  ERROR: DATABASE_URL is not set — cannot write to database');
    process.exit(1);
  }

  if (process.env.CHAIN_POLYGON_ENABLED !== 'true') {
    console.error(
      '  ERROR: CHAIN_POLYGON_ENABLED must be "true" to register a Polygon custody wallet.\n' +
      '  This gate ensures the operator explicitly acknowledges Polygon is being activated.',
    );
    process.exit(1);
  }

  const walletAddress = process.env.POLYGON_TREASURY_WALLET?.trim() ?? null;
  if (!walletAddress) {
    console.error(
      '  ERROR: POLYGON_TREASURY_WALLET is not set.\n' +
      '  Provision a BitGo Polygon wallet and set POLYGON_TREASURY_WALLET=0x…',
    );
    process.exit(1);
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    console.error(
      `  ERROR: POLYGON_TREASURY_WALLET="${walletAddress}" is not a valid 0x… Ethereum address.`,
    );
    process.exit(1);
  }

  const bitgoWalletId = process.env.BITGO_POLYGON_WALLET_ID?.trim() ?? null;
  const walletLabel   = process.env.POLYGON_WALLET_LABEL?.trim() ?? 'Axiom Polygon Treasury';

  // ── Import DB ───────────────────────────────────────────────────────
  let db:  typeof import('../server/db').db;
  let sql: typeof import('drizzle-orm').sql;
  try {
    db  = (await import('../server/db')).db;
    sql = (await import('drizzle-orm')).sql;
  } catch (err) {
    console.error('  ERROR: Failed to import DB modules:', (err as Error).message);
    process.exit(1);
  }

  // ── Check for existing wallet ────────────────────────────────────────
  const existing = await db.execute(sql`
    SELECT id, wallet_address, chain, status, wallet_name, created_at
    FROM custody_wallet_registry
    WHERE wallet_address = ${walletAddress}
      AND chain = 'polygon'
    LIMIT 1
  `);

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as Record<string, unknown>;
    console.log('  Polygon custody wallet already registered (idempotent — no changes made):\n');
    console.log(`  id:             ${row.id}`);
    console.log(`  wallet_name:    ${row.wallet_name}`);
    console.log(`  wallet_address: ${row.wallet_address}`);
    console.log(`  chain:          ${row.chain}`);
    console.log(`  status:         ${row.status}`);
    console.log(`  created_at:     ${row.created_at}`);
    console.log('\n  No action taken.\n');
    process.exit(0);
  }

  // ── Insert custody wallet registry entry ────────────────────────────
  console.log(`  Registering Polygon custody wallet:\n`);
  console.log(`  walletAddress: ${walletAddress}`);
  console.log(`  walletLabel:   ${walletLabel}`);
  console.log(`  chain:         polygon`);
  console.log(`  bitgoWalletId: ${bitgoWalletId ?? '(not provided)'}\n`);

  await db.execute(sql`
    INSERT INTO custody_wallet_registry (
      provider, wallet_name, wallet_address, chain, asset_scope, purpose,
      legal_entity_name, status, metadata, created_at, updated_at
    ) VALUES (
      'bitgo',
      ${walletLabel},
      ${walletAddress},
      'polygon',
      'polygon:usdc',
      'custody',
      'Axiom Protocol',
      'configured',
      ${JSON.stringify({
        phase:          5,
        chain:          'polygon-pos',
        chainId:        137,
        settlementType: 'POLYGON',
        assetSymbol:    'USDC-POLYGON',
        contract:       '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        bitgoWalletId:  bitgoWalletId,
        registeredAt:   new Date().toISOString(),
        note:           'Registered via seed-polygon-custody-wallet.ts — Phase 5 activation',
        activationGate: 'AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md must be signed before status → live',
      })}::jsonb,
      now(),
      now()
    )
  `);

  console.log('  ┌────────────────────────────────────────────────────────┐');
  console.log('  │  Polygon custody wallet registered successfully         │');
  console.log(`  │  Address: ${walletAddress.slice(0, 30)}…  │`);
  console.log('  │  Status: configured (not yet live)                     │');
  console.log('  │                                                        │');
  console.log('  │  Next steps to activate:                               │');
  console.log('  │  1. Set BITGO_POLYGON_WALLET_ID in env and re-run      │');
  console.log('  │  2. Sign AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md         │');
  console.log('  │  3. Update status → live once wallet is funded         │');
  console.log('  │  4. Set POLYGON_TREASURY_WALLET in reconcile script    │');
  console.log('  └────────────────────────────────────────────────────────┘\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
