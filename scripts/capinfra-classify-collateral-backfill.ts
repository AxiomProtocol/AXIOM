/**
 * Capital Infrastructure — Collateral Risk Policy classification
 * backfill (2026-04-21.1).
 *
 * The Collateral Risk Policy requires every cap_assets row to carry an
 * explicit `collateral_class` (GREEN | YELLOW | RED) AND a
 * `collateral_classification_rationale`. The schema migration sets the
 * column default to RED (fail-closed), but pre-existing rows created
 * before the policy publication may still be missing rationale text or
 * may need an explicit class affirmation.
 *
 * This script is a one-shot, idempotent backfill that:
 *
 *   1. Classifies the canonical seed assets (AXAU, PAXG,
 *      AXUSD-TREASURY) per the policy doctrine, in case an environment
 *      missed the seed update.
 *   2. Marks every other existing asset RED with an explicit
 *      "policy-publication backfill" rationale, preserving the
 *      fail-closed invariant. Risk owners must then re-classify each
 *      asset through the audited publication flow before borrow can
 *      resume.
 *   3. Verifies post-run that no asset is missing classification or
 *      rationale and prints a summary suitable for ops sign-off.
 *
 * Usage:
 *   DATABASE_URL=... tsx scripts/capinfra-classify-collateral-backfill.ts
 *
 * Re-runs are safe: explicit GREEN/YELLOW classifications are NOT
 * overwritten on subsequent runs. Only assets currently missing a
 * rationale are touched. Pass `--dry-run` to print the plan without
 * writing.
 */

import 'dotenv/config';
import { eq, sql, and, isNull } from 'drizzle-orm';
import { db } from '../server/db';
import { capAssets } from '../shared/capInfraSchema';
import { emitAuditEventStrict } from '../lib/capinfra/audit';

interface SeedClassification {
  symbol: string;
  collateralClass: 'GREEN' | 'YELLOW' | 'RED';
  rationale: string;
}

const SEED_CLASSIFICATIONS: SeedClassification[] = [
  {
    symbol: 'AXAU',
    collateralClass: 'GREEN',
    rationale:
      'AXAU is the protocol-issued metal-backed primary; allocated PAXG backing, ERC-3643 controlled transfer surface, and oracle profile within Collateral Risk Policy GREEN budgets.',
  },
  {
    symbol: 'PAXG',
    collateralClass: 'GREEN',
    rationale:
      'PAXG is allocated physical gold from Paxos with deep two-sided liquidity and an institutional issuer-attestation cadence; classified GREEN under Collateral Risk Policy §2.',
  },
  {
    symbol: 'AXUSD-TREASURY',
    collateralClass: 'YELLOW',
    rationale:
      'AXUSD treasury segment is admitted with a mandatory per-asset cap (basePolicyJson.perTransactionMax = 1,000,000). YELLOW until reserve attestation cadence reaches the GREEN policy threshold and an active cap_risk_policies publication scopes the per-asset cap.',
  },
];

const DRY = process.argv.includes('--dry-run');

async function main() {
  console.log('[capinfra-backfill] Collateral Risk Policy classification backfill');
  console.log('[capinfra-backfill] mode:', DRY ? 'DRY-RUN' : 'WRITE');

  const all = await db.select().from(capAssets);
  console.log(`[capinfra-backfill] cap_assets total rows: ${all.length}`);

  let seeded = 0;
  let backfilled = 0;
  let skipped = 0;

  // 1. Canonical seed classifications.
  for (const seed of SEED_CLASSIFICATIONS) {
    const [row] = await db
      .select()
      .from(capAssets)
      .where(eq(capAssets.symbol, seed.symbol))
      .limit(1);
    if (!row) {
      console.log(`  - ${seed.symbol}: not present (skipping)`);
      continue;
    }
    const needsRationale =
      !row.collateralClassificationRationale ||
      row.collateralClassificationRationale.trim().length === 0;
    const isFailClosedDefault =
      row.collateralClass === 'RED' && needsRationale;
    if (row.collateralClass === seed.collateralClass && !needsRationale) {
      console.log(`  - ${seed.symbol}: already classified ${seed.collateralClass} with rationale (skip)`);
      skipped++;
      continue;
    }
    if (
      row.collateralClass !== seed.collateralClass &&
      !isFailClosedDefault
    ) {
      // Operator has explicitly classified differently. Do NOT clobber.
      console.log(
        `  - ${seed.symbol}: operator classification ${row.collateralClass} differs from seed ${seed.collateralClass}; preserving (skip)`,
      );
      skipped++;
      continue;
    }
    console.log(
      `  - ${seed.symbol}: setting ${row.collateralClass} → ${seed.collateralClass} with rationale`,
    );
    if (!DRY) {
      await db
        .update(capAssets)
        .set({
          collateralClass: seed.collateralClass,
          collateralClassificationRationale: seed.rationale,
          updatedAt: new Date(),
        })
        .where(eq(capAssets.id, row.id));
      await emitAuditEventStrict({
        eventType: 'collateral.classification_backfilled',
        aggregateType: 'asset',
        aggregateId: row.id,
        assetId: row.id,
        actor: 'system:capinfra-classify-collateral-backfill',
        payloadJson: {
          symbol: seed.symbol,
          previousClass: row.collateralClass,
          newClass: seed.collateralClass,
          rationale: seed.rationale,
          source: 'seed_doctrine',
        },
      });
    }
    seeded++;
  }

  // 2. Backfill any non-seed asset that has no rationale. These remain
  //    RED (the column default) so the fail-closed invariant holds.
  const seedSymbols = new Set(SEED_CLASSIFICATIONS.map((s) => s.symbol));
  for (const row of all) {
    if (seedSymbols.has(row.symbol)) continue;
    const hasRationale =
      row.collateralClassificationRationale &&
      row.collateralClassificationRationale.trim().length > 0;
    if (hasRationale) {
      skipped++;
      continue;
    }
    const ts = new Date().toISOString();
    const rationale = `[${ts}] Policy-publication backfill (Collateral Risk Policy 2026-04-21.1): asset predates the policy and has not received an explicit risk-owner classification. Pinned RED (fail-closed). Re-classification must go through the audited cap_risk_policies publication flow.`;
    console.log(
      `  - ${row.symbol} (${row.id}): pinning RED with backfill rationale (was ${row.collateralClass})`,
    );
    if (!DRY) {
      await db
        .update(capAssets)
        .set({
          collateralClass: 'RED',
          collateralClassificationRationale: rationale,
          updatedAt: new Date(),
        })
        .where(eq(capAssets.id, row.id));
      await emitAuditEventStrict({
        eventType: 'collateral.classification_backfilled',
        aggregateType: 'asset',
        aggregateId: row.id,
        assetId: row.id,
        actor: 'system:capinfra-classify-collateral-backfill',
        payloadJson: {
          symbol: row.symbol,
          previousClass: row.collateralClass,
          newClass: 'RED',
          rationale,
          source: 'fail_closed_backfill',
        },
      });
    }
    backfilled++;
  }

  // 3. Post-run verification.
  const missing = await db
    .select({ id: capAssets.id, symbol: capAssets.symbol, cls: capAssets.collateralClass })
    .from(capAssets)
    .where(
      and(
        // null OR empty rationale → not OK
        sql`(${capAssets.collateralClassificationRationale} IS NULL OR length(trim(${capAssets.collateralClassificationRationale})) = 0)`,
      ),
    );

  console.log('');
  console.log('[capinfra-backfill] Summary:');
  console.log(`  seed classifications applied : ${seeded}`);
  console.log(`  fail-closed backfills        : ${backfilled}`);
  console.log(`  skipped (already classified) : ${skipped}`);
  console.log(`  rows still missing rationale : ${missing.length}`);
  if (missing.length > 0 && !DRY) {
    console.error('[capinfra-backfill] ERROR: assets still missing rationale after backfill:');
    for (const m of missing) console.error(`    - ${m.symbol} (${m.id}) class=${m.cls}`);
    process.exit(2);
  }

  console.log('[capinfra-backfill] OK');
  process.exit(0);
}

main().catch((err) => {
  console.error('[capinfra-backfill] FAILED', err);
  process.exit(1);
});
