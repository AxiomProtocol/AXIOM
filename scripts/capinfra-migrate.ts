/**
 * Capinfra schema migration runner — CI edition.
 *
 * Drops the specific cap_* tables/enums defined in capInfraSchema.ts then
 * re-applies every SQL file in ./drizzle-capinfra/ from scratch.  This
 * guarantees the schema in the test database exactly matches capInfraSchema.ts
 * regardless of any partial state left by a prior CI run.
 *
 * IMPORTANT: only the tables/types listed in CAP_INFRA_TABLES / CAP_INFRA_ENUMS
 * are dropped.  Other cap_* tables defined in shared/schema.ts (e.g.
 * cap_accounts, cap_ledger_entries) are left untouched.
 *
 * Idempotent: running it twice produces the same clean schema.
 *
 * Usage:  npx tsx scripts/capinfra-migrate.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const CAP_INFRA_TABLES = [
  'cap_adapters',
  'cap_admin_actions',
  'cap_asset_markets',
  'cap_assets',
  'cap_audit_events',
  'cap_bridge_allowlist_proposal_comments',
  'cap_bridge_allowlist_proposals',
  'cap_card_deposits',
  'cap_card_deposit_webhook_events',
  'cap_claims',
  'cap_counterparties',
  'cap_documents',
  'cap_identity_profiles',
  'cap_loss_coverage_claim_events',
  'cap_loss_coverage_claims',
  'cap_notifications',
  'cap_plaid_accounts',
  'cap_plaid_items',
  'cap_policy_decisions',
  'cap_positions',
  'cap_price_snapshots',
  'cap_reconciliation_drift',
  'cap_reconciliation_runs',
  'cap_reserve_config',
  'cap_reserve_holdings',
  'cap_reserve_holdings_snapshot_lines',
  'cap_reserve_holdings_snapshots',
  'cap_reserve_snapshots',
  'cap_risk_decisions',
  'cap_risk_policies',
  'cap_settlement_instructions',
  'cap_users',
  'cap_wallets',
  'cap_webhook_events',
];

const CAP_INFRA_ENUMS = [
  'cap_action_type',
  'cap_asset_subtype',
  'cap_asset_type',
  'cap_claim_status',
  'cap_claim_type',
  'cap_collateral_class',
  'cap_custody_model',
  'cap_entity_type',
  'cap_exposure_class',
  'cap_price_type',
  'cap_record_status',
  'cap_redemption_type',
  'cap_route_type',
  'cap_settlement_status',
  'cap_settlement_type',
  'cap_severity_level',
];

async function dropCapInfraSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    for (const tbl of CAP_INFRA_TABLES) {
      await client.query(`DROP TABLE IF EXISTS "${tbl}" CASCADE`);
    }
    console.log(`[capinfra-migrate] dropped ${CAP_INFRA_TABLES.length} capinfra tables.`);

    for (const typ of CAP_INFRA_ENUMS) {
      await client.query(`DROP TYPE IF EXISTS "${typ}" CASCADE`);
    }
    console.log(`[capinfra-migrate] dropped ${CAP_INFRA_ENUMS.length} capinfra enum types.`);
  } finally {
    client.release();
  }
}

async function main() {
  const url =
    process.env.NODE_ENV === 'test'
      ? process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
      : process.env.DATABASE_URL;

  if (!url) {
    console.error('[capinfra-migrate] DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });

  console.log('[capinfra-migrate] dropping existing capinfra schema…');
  await dropCapInfraSchema(pool);

  const dir = path.join(process.cwd(), 'drizzle-capinfra');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    const statements = sql
      .split('-->statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`[capinfra-migrate] applying ${file} (${statements.length} statements)…`);

    for (const stmt of statements) {
      const client = await pool.connect();
      try {
        await client.query(stmt);
      } catch (err: any) {
        client.release();
        await pool.end();
        console.error(
          `[capinfra-migrate] FAILED:\n  ${stmt.slice(0, 200)}\n  Error (${err.code}): ${err.message}`,
        );
        process.exit(1);
      }
      client.release();
    }

    console.log(`[capinfra-migrate] ${file} done.`);
  }

  await pool.end();
  console.log('[capinfra-migrate] All capinfra migrations applied.');
}

main().catch((err) => {
  console.error('[capinfra-migrate] fatal:', err);
  process.exit(1);
});
