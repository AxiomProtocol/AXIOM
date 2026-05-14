/**
 * Axiom Protocol — USDC-POLYGON Asset Registration Script (Phase 5).
 *
 * Registers the native USDC asset on Polygon PoS into the capinfra asset registry
 * (cap_assets table) so Polygon settlement instructions can reference it.
 *
 * This script is IDEMPOTENT — running it multiple times is safe.
 * If the asset already exists (by symbol), it reports the existing record
 * and exits 0 without modifying it.
 *
 * Pre-conditions before running:
 *   1. Accepted-risk record signed (see AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md)
 *   2. CHAIN_POLYGON_ENABLED environment variable set to confirm intent
 *   3. DATABASE_URL pointing to the target environment database
 *   4. Reviewed by Technical Lead that this is the correct Polygon USDC address
 *
 * Asset registered:
 *   Symbol:           USDC-POLYGON
 *   Display name:     USD Coin (Polygon PoS — Native)
 *   Asset type:       STABLE_ASSET
 *   Custody model:    ON_CHAIN_NATIVE
 *   Settlement type:  POLYGON
 *   Chain:            polygon-pos (chainId 137)
 *   Contract:         0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359 (native Circle USDC)
 *   Decimals:         6
 *   Exposure class:   RESTRICTED (requires KYC claim for trading)
 *   Collateral class: RED (not admissible as collateral — Phase 5 scope is payments only)
 *
 * Usage:
 *   npx tsx scripts/seed-polygon-usdc-asset.ts
 *
 * ⚠ This script writes to the database. Confirm you are targeting the correct
 *   environment via DATABASE_URL before running.
 */

import 'dotenv/config';

const POLYGON_USDC_CONTRACT = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const ASSET_SYMBOL          = 'USDC-POLYGON';

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  AXIOM PROTOCOL — USDC-POLYGON ASSET REGISTRATION (Phase 5)');
  console.log(`  Run at: ${new Date().toISOString()}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  // ── Pre-flight ──────────────────────────────────────────────────────
  if (!process.env.DATABASE_URL) {
    console.error('  ERROR: DATABASE_URL is not set — cannot write to database');
    process.exit(1);
  }

  if (process.env.CHAIN_POLYGON_ENABLED !== 'true') {
    console.error(
      '  ERROR: CHAIN_POLYGON_ENABLED must be "true" to register a Polygon asset.\n' +
      '  Set CHAIN_POLYGON_ENABLED=true in the target environment and rerun.\n' +
      '  This gate ensures the operator explicitly acknowledges Polygon is being activated.',
    );
    process.exit(1);
  }

  // ── Import DB ───────────────────────────────────────────────────────
  let db:         typeof import('../server/db').db;
  let generateId: typeof import('../lib/capinfra/ids').generateId;
  let sql:        typeof import('drizzle-orm').sql;
  try {
    db         = (await import('../server/db')).db;
    generateId = (await import('../lib/capinfra/ids')).generateId;
    sql        = (await import('drizzle-orm')).sql;
  } catch (err) {
    console.error('  ERROR: Failed to import DB modules:', (err as Error).message);
    process.exit(1);
  }

  // ── Check for existing asset ────────────────────────────────────────
  const existing = await db.execute(sql`
    SELECT id, symbol, settlement_type, chain, chain_id, contract_address, status
    FROM cap_assets
    WHERE symbol = ${ASSET_SYMBOL}
    LIMIT 1
  `);

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as Record<string, unknown>;
    console.log('  Asset already registered (idempotent — no changes made):\n');
    console.log(`  id:               ${row.id}`);
    console.log(`  symbol:           ${row.symbol}`);
    console.log(`  settlement_type:  ${row.settlement_type}`);
    console.log(`  chain:            ${row.chain}`);
    console.log(`  chain_id:         ${row.chain_id}`);
    console.log(`  contract_address: ${row.contract_address}`);
    console.log(`  status:           ${row.status}`);
    console.log('\n  No action taken.\n');
    process.exit(0);
  }

  // ── Insert asset ────────────────────────────────────────────────────
  const id = generateId('ast');
  console.log(`  Registering USDC-POLYGON asset (id=${id})...`);
  console.log(`  Contract: ${POLYGON_USDC_CONTRACT}`);
  console.log(`  Chain:    polygon-pos (chainId 137)`);

  await db.execute(sql`
    INSERT INTO cap_assets (
      id, symbol, display_name, asset_type, asset_subtype, custody_model,
      redemption_type, settlement_type, chain, chain_id, contract_address,
      decimals, issuer, exposure_class, collateral_class,
      collateral_classification_rationale, status,
      metadata_json, created_at, updated_at
    ) VALUES (
      ${id},
      ${ASSET_SYMBOL},
      'USD Coin (Polygon PoS — Native)',
      'STABLE_ASSET',
      'NONE',
      'ON_CHAIN_NATIVE',
      'NONE',
      'POLYGON',
      'polygon-pos',
      137,
      ${POLYGON_USDC_CONTRACT},
      6,
      'Circle Internet Financial',
      'RESTRICTED',
      'RED',
      'Phase 5: Polygon USDC is a payments rail asset. Collateral admission is out of scope for Phase 5 — requires separate architecture review and accepted-risk record.',
      'ACTIVE',
      ${{ source: 'seed-polygon-usdc-asset.ts', phase: 5, seededAt: new Date().toISOString() }}::jsonb,
      now(),
      now()
    )
  `);

  console.log('\n  ┌────────────────────────────────────────────────────────┐');
  console.log('  │  USDC-POLYGON asset registered successfully             │');
  console.log(`  │  id: ${id.padEnd(38)}│`);
  console.log('  │                                                        │');
  console.log('  │  Next steps:                                           │');
  console.log('  │  1. Set POLYGON_ADAPTER_MODE=LIVE in target env        │');
  console.log('  │  2. Add USDC-POLYGON to POLYGON_ADAPTER_LIVE_ALLOWLIST │');
  console.log('  │  3. Run vault-sprint-polygon-amoy.ts on Amoy           │');
  console.log('  │  4. Activate reconciliation cron                       │');
  console.log('  └────────────────────────────────────────────────────────┘\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
