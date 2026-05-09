/**
 * Capital Infrastructure — Portfolio service.
 *
 * Owns reads and snapshot generation against `cap_positions` (the
 * canonical Phase 1 user-asset position table) and `cap_ledger_entries`
 * (the double-entry ledger). The single mutation entry point is
 * `applySettlement`, which is invoked ONLY by `lib/capinfra/settlement.ts`
 * inside the same transaction that flips an instruction to SETTLED.
 *
 * Snapshot ordering is canonical and deterministic per §0.1 (tightened
 * Phase 2 contract clarification #4):
 *   ORDER BY user_id, asset_id, wallet_id NULLS FIRST, id
 * `id` is immutable and acts as the line-index tiebreaker. The
 * mutable `asOf` column is intentionally NOT in the sort key — it
 * changes on every position upsert and would let an unrelated write
 * shift line order between back-to-back snapshots. The canonical
 * projection then carries an explicit `lineIndex` so the sha256
 * input is provably stable regardless of JSON key ordering.
 *
 * NOTE: All reads/writes against `cap_accounts`, `cap_ledger_entries`,
 * `cap_snapshots`, and `cap_snapshot_lines` go through raw `sql` rather
 * than the Drizzle table refs in `shared/schema.ts`. This avoids a
 * Next.js webpack bundling defect where importing those tables from the
 * very large `shared/schema.ts` barrel resolved them as `undefined`
 * inside the API-route bundle. The Phase 1 `cap_positions` table lives
 * in `shared/capInfraSchema.ts` and bundles cleanly, so it continues
 * to use the typed Drizzle helpers.
 */

import { createHash, randomUUID } from 'node:crypto';
import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import { db } from '../../server/db';
import {
  capPositions,
  capSettlementInstructions,
  type CapPosition,
  type CapAsset,
  type CapSettlementInstruction,
} from '../../shared/capInfraSchema';
import { generateId } from './ids';
import { emitAuditEventStrict } from './audit';
import { NotFoundError } from './errors';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | Tx;

// Account name conventions seeded by `scripts/capinfra-seed.ts`.
const ACCT_TREASURY_ASSETS = 'cap_internal_assets';
const ACCT_USER_LIABILITIES = 'cap_internal_liabilities';

interface BootstrapAccounts {
  treasuryAssetId: string;
  userLiabilityId: string;
}

let cachedAccounts: BootstrapAccounts | null = null;

async function loadAccounts(tx: Tx): Promise<BootstrapAccounts> {
  if (cachedAccounts) return cachedAccounts;
  const result = await tx.execute(
    sql`select id, name from cap_accounts where name in (${ACCT_TREASURY_ASSETS}, ${ACCT_USER_LIABILITIES})`,
  );
  const rows = (result as unknown as { rows?: Array<{ id: string; name: string }> }).rows ?? [];
  const treasury = rows.find((r) => r.name === ACCT_TREASURY_ASSETS);
  const userLiab = rows.find((r) => r.name === ACCT_USER_LIABILITIES);
  if (!treasury || !userLiab) {
    throw new NotFoundError(
      `internal accounts missing — run scripts/capinfra-seed.ts (need: ${ACCT_TREASURY_ASSETS}, ${ACCT_USER_LIABILITIES})`,
    );
  }
  cachedAccounts = { treasuryAssetId: treasury.id, userLiabilityId: userLiab.id };
  return cachedAccounts;
}

/**
 * Compute the signed quantity delta a settlement applies to the user's
 * position. MINT/BUY/TRANSFER-in increase quantity; REDEEM/SELL/
 * TRANSFER-out decrease. CUSTODY_MOVE / STAKE / UNSTAKE leave
 * quantity flat (custody movement only).
 */
function quantityDelta(actionType: CapSettlementInstruction['actionType'], amount: string): string {
  switch (actionType) {
    case 'MINT':
    case 'BUY':
    case 'TRANSFER':
      return amount;
    case 'REDEEM':
    case 'SELL':
      return `-${amount}`;
    case 'STAKE':
    case 'UNSTAKE':
    case 'CUSTODY_MOVE':
    default:
      return '0';
  }
}

/**
 * Apply a settled instruction to portfolio state. MUST be called inside
 * the same transaction that transitions the instruction to SETTLED.
 *
 * Side effects (in this order):
 *   1. Upsert the user-asset position quantity.
 *   2. Write a balanced double-entry ledger pair (debit treasury asset,
 *      credit user liability — or the inverse for outflows).
 *   3. Emit `portfolio.position.updated` and `ledger.entry.recorded`
 *      strict audit events on the same transaction.
 */
export async function applySettlement(
  tx: Tx,
  instruction: CapSettlementInstruction,
  asset: CapAsset,
  actor: string,
): Promise<{ positionId: string; txGroupId: string }> {
  const accounts = await loadAccounts(tx);
  const delta = quantityDelta(instruction.actionType, instruction.amount);
  const txGroupId = randomUUID();

  // 1) Upsert position. Concurrency strategy:
  //   - Take a per-(userId, assetId, walletId) Postgres advisory xact
  //     lock so two concurrent settlements for the same position
  //     serialize at the DB level (not at the Node process level —
  //     the cap_positions partial index does not enforce uniqueness
  //     when wallet_id IS NULL because PG treats NULLs as distinct).
  //   - Apply the quantity delta with SQL arithmetic on the numeric
  //     column so we never round-trip through JS `Number` (which
  //     loses precision past ~15 sig figs and breaks `numeric(30,10)`
  //     monetary semantics).
  const walletKey = 'null'; // walletId is always null on this code path; lock key is stable
  const lockKey = `cap_positions:${instruction.userId}:${instruction.assetId}:${walletKey}`;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);

  const conditions: SQL[] = [
    eq(capPositions.userId, instruction.userId),
    eq(capPositions.assetId, instruction.assetId),
  ];
  const existingRows = await tx
    .select()
    .from(capPositions)
    .where(and(...conditions))
    .limit(1);
  let positionId: string;
  if (existingRows.length === 0) {
    positionId = generateId('hld');
    await tx.insert(capPositions).values({
      id: positionId,
      userId: instruction.userId,
      assetId: instruction.assetId,
      walletId: null,
      quantity: delta,
      status: 'ACTIVE',
      asOf: new Date(),
    });
  } else {
    positionId = existingRows[0].id;
    // Decimal-safe in-DB arithmetic on numeric(30,10).
    await tx.execute(sql`
      update cap_positions
         set quantity = quantity + ${delta}::numeric,
             as_of = now(),
             updated_at = now()
       where id = ${positionId}
    `);
  }

  // 2) Write balanced ledger pair via raw SQL (see file header note).
  const isOutflow = delta.startsWith('-');
  const absAmount = isOutflow ? delta.slice(1) : delta === '0' ? '0' : delta;
  const debitAccountId = isOutflow ? accounts.userLiabilityId : accounts.treasuryAssetId;
  const creditAccountId = isOutflow ? accounts.treasuryAssetId : accounts.userLiabilityId;
  const description = `${instruction.actionType} ${asset.symbol} via instruction ${instruction.id}`;
  const currency = asset.symbol.slice(0, 20);

  await tx.execute(sql`
    insert into cap_ledger_entries
      (tx_group_id, account_id, debit_amount, credit_amount, currency, description, external_id, source_type)
    values
      (${txGroupId}, ${debitAccountId},  ${absAmount}, ${'0'},        ${currency}, ${description}, ${instruction.id}, ${'SETTLEMENT'}),
      (${txGroupId}, ${creditAccountId}, ${'0'},       ${absAmount}, ${currency}, ${description}, ${instruction.id}, ${'SETTLEMENT'})
  `);

  // 3) Strict audit events (same tx).
  await emitAuditEventStrict(
    {
      eventType: 'portfolio.position.updated',
      aggregateType: 'position',
      aggregateId: positionId,
      userId: instruction.userId,
      assetId: instruction.assetId,
      instructionId: instruction.id,
      actor,
      payloadJson: { delta, actionType: instruction.actionType, txGroupId },
    },
    tx,
  );
  await emitAuditEventStrict(
    {
      eventType: 'ledger.entry.recorded',
      aggregateType: 'ledger_tx_group',
      aggregateId: txGroupId,
      userId: instruction.userId,
      assetId: instruction.assetId,
      instructionId: instruction.id,
      actor,
      payloadJson: { entries: 2, amount: absAmount, currency: asset.symbol },
    },
    tx,
  );

  return { positionId, txGroupId };
}

// ─── Reads ─────────────────────────────────────────────────────────

export interface PositionsFilter {
  userId?: string;
  assetId?: string;
  status?: CapPosition['status'];
  limit?: number;
}

export async function listPositions(filter: PositionsFilter) {
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
  const conditions: SQL[] = [];
  if (filter.userId) conditions.push(eq(capPositions.userId, filter.userId));
  if (filter.assetId) conditions.push(eq(capPositions.assetId, filter.assetId));
  if (filter.status) conditions.push(eq(capPositions.status, filter.status));
  const baseQuery = db
    .select()
    .from(capPositions)
    .orderBy(asc(capPositions.userId), asc(capPositions.assetId), asc(capPositions.id))
    .limit(limit);
  const rows = conditions.length > 0 ? await baseQuery.where(and(...conditions)) : await baseQuery;
  return rows;
}

export async function getPosition(id: string): Promise<CapPosition | null> {
  const [row] = await db.select().from(capPositions).where(eq(capPositions.id, id)).limit(1);
  return row ?? null;
}

export interface LedgerFilter {
  txGroupId?: string;
  externalId?: string;
  limit?: number;
}

export async function listLedgerEntries(filter: LedgerFilter) {
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
  let condition = sql`true`;
  if (filter.txGroupId) condition = sql`${condition} and tx_group_id = ${filter.txGroupId}`;
  if (filter.externalId) condition = sql`${condition} and external_id = ${filter.externalId}`;
  const result = await db.execute(sql`
    select id, tx_group_id as "txGroupId", account_id as "accountId",
           debit_amount as "debitAmount", credit_amount as "creditAmount",
           currency, description, external_id as "externalId",
           source_type as "sourceType", created_at as "createdAt"
    from cap_ledger_entries
    where ${condition}
    order by created_at desc
    limit ${limit}
  `);
  return (result as { rows?: unknown[] }).rows ?? [];
}

// ─── Snapshots ─────────────────────────────────────────────────────

/**
 * Build a deterministic portfolio snapshot. The §0.1 ordering rule
 * (user_id, asset_id, wallet_id NULLS FIRST, asOf, then position id
 * for tie-breaking) is enforced via raw SQL because Drizzle's
 * `asc(NULLS FIRST)` helper is not portable in this version.
 */
export async function createSnapshot(opts: {
  asOf?: Date;
  notes?: string;
  actor: string;
  correlationId?: string;
}): Promise<{ snapshotId: string; checksum: string; lineCount: number }> {
  const asOf = opts.asOf ?? new Date();
  const positions = await db
    .select()
    .from(capPositions)
    .orderBy(
      sql`${capPositions.userId} asc, ${capPositions.assetId} asc, ${capPositions.walletId} asc nulls first, ${capPositions.id} asc`,
    );

  // Canonical projection — explicit lineIndex makes the order
  // contractually visible in the hashed payload, so any divergence is
  // attributable to a specific row rather than to JSON ordering.
  const canonical = positions.map((p, lineIndex) => ({
    lineIndex,
    userId: p.userId,
    assetId: p.assetId,
    walletId: p.walletId ?? null,
    quantity: p.quantity,
    status: p.status,
  }));
  const checksum = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');

  const result = await db.transaction(async (tx) => {
    const sourcesJson = JSON.stringify(['cap_positions']);
    const warningsJson = JSON.stringify([]);
    const ins = await tx.execute(sql`
      insert into cap_snapshots (as_of, checksum, sources_used, confidence, warnings)
      values (${asOf}, ${checksum}, ${sql.raw(`'${sourcesJson}'::jsonb`)}, ${'HIGH'}, ${sql.raw(`'${warningsJson}'::jsonb`)})
      returning id
    `);
    const snapId = ((ins as unknown as { rows?: Array<{ id: string }> }).rows ?? [])[0]?.id;
    if (!snapId) throw new Error('snapshot insert returned no id');

    if (positions.length > 0) {
      // Insert lines one-by-one inside the tx; positions volume is bounded
      // for this sprint (operator-grade snapshots, not high-frequency).
      for (const p of positions) {
        await tx.execute(sql`
          insert into cap_snapshot_lines
            (snapshot_id, metric_key, metric_value, period, instrument)
          values
            (${snapId}, ${`position:${p.id}`}, ${p.quantity}, ${'current'}, ${p.assetId})
        `);
      }
    }
    await emitAuditEventStrict(
      {
        eventType: 'portfolio.snapshot.created',
        aggregateType: 'snapshot',
        aggregateId: snapId,
        actor: opts.actor,
        correlationId: opts.correlationId ?? null,
        payloadJson: { checksum, lineCount: positions.length, asOf: asOf.toISOString() },
      },
      tx,
    );
    return { snapshotId: snapId, checksum, lineCount: positions.length };
  });

  return result;
}

export async function getSnapshot(id: string) {
  const snapResult = await db.execute(sql`
    select id, as_of as "asOf", checksum, sources_used as "sourcesUsed",
           confidence, warnings, created_at as "createdAt"
    from cap_snapshots where id = ${id} limit 1
  `);
  const snap = ((snapResult as { rows?: unknown[] }).rows ?? [])[0];
  if (!snap) return null;
  const linesResult = await db.execute(sql`
    select id, snapshot_id as "snapshotId", metric_key as "metricKey",
           metric_value as "metricValue", period, instrument
    from cap_snapshot_lines where snapshot_id = ${id}
  `);
  return { snapshot: snap, lines: (linesResult as { rows?: unknown[] }).rows ?? [] };
}

export async function listSnapshots(limit = 50) {
  const safe = Math.min(Math.max(limit, 1), 500);
  const result = await db.execute(sql`
    select id, as_of as "asOf", checksum, sources_used as "sourcesUsed",
           confidence, warnings, created_at as "createdAt"
    from cap_snapshots
    order by as_of desc
    limit ${safe}
  `);
  return (result as { rows?: unknown[] }).rows ?? [];
}

// ─── Settlement → portfolio bridge guard ──────────────────────────

/**
 * Defensive accessor — re-fetches an instruction by id within a
 * transaction. Used by `settlement.ts` to ensure the row read for
 * `applySettlement` is the same row being mutated.
 */
export async function reloadInstruction(
  tx: Tx,
  instructionId: string,
): Promise<CapSettlementInstruction | null> {
  const [row] = await tx
    .select()
    .from(capSettlementInstructions)
    .where(eq(capSettlementInstructions.id, instructionId))
    .limit(1);
  return row ?? null;
}
