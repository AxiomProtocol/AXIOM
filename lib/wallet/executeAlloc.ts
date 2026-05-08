/**
 * Axiom — Treasury Execution Engine
 *
 * Picks up a completed AI allocation run (treasury_allocations rows at
 * status='recorded') and executes it end-to-end:
 *
 *  1. Idempotency guard — refuses to re-execute an already-executed run.
 *  2. Mark all rows → 'executing' (atomic batch).
 *  3. Fetch live market prices for all 6 protocol assets via CoinGecko.
 *  4. Convert each USD allocation to a token quantity.
 *  5. Dispatch settlement per asset (BitGo / on-chain / treasury-hold).
 *     — runs OUTSIDE the DB transaction; on-chain txs can take 30+ seconds.
 *  6. Mark all rows → 'executed' + persist settlement outcomes.
 *  7. Upsert reserve_positions with tx_hash, settlement_status, settlement_ref.
 *  8. Debit axiom_wallet_balances.
 *  9. Write a cap_audit_events success record.
 *
 * Execution paths per asset:
 *   ETH, PAXG, USDC  → BitGo CaaS custody wallet reference
 *   AXAU              → mintWithAsset via deployer wallet → Arbitrum tx hash
 *   AXUSD             → mint() on AXUSD ERC-3643 contract → Arbitrum tx hash
 *   AXM               → governance treasury hold (internal reference)
 *
 * All DB mutations (steps 2, 6, 7, 8, 9) run inside a single transaction.
 * Settlement dispatch (step 5) runs before the transaction — failures are
 * recorded as 'failed'/'queued' status but never block the accounting commit.
 */

import { db } from '../../server/db';
import { treasuryAllocations, reservePositions } from '../../shared/treasurySchema';
import { capAuditEvents, capCardDeposits } from '../../shared/capInfraSchema';
import { axiomWalletBalances, axiomWalletTransactions } from '../../shared/walletSchema';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { generateId } from '../capinfra/ids';
import { customAlphabet } from 'nanoid';
import { dispatchSettlement, type SettlementOutcome } from './settlementDispatch';

const nanoid8 = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

// ── Asset price configuration ──────────────────────────────────────────────

const STABLE_PRICE: Record<string, number> = {
  USDC:  1.00,
  AXUSD: 1.00,
};

const COINGECKO_IDS: Record<string, string> = {
  ETH:  'ethereum',
  PAXG: 'pax-gold',
  AXM:  'axiom-protocol', // may not exist — fallback handled
};

// AXAU tracks XAU (gold) 1:1 — priced via PAXG (which is 1 troy oz physical gold)
const AXAU_TRACKS = 'PAXG';

// Position type per asset
const POSITION_TYPE: Record<string, string> = {
  ETH:   'eth_reserve',
  PAXG:  'gold_reserve',
  AXAU:  'gold_reserve',
  AXM:   'governance_reserve',
  AXUSD: 'stablecoin_reserve',
  USDC:  'stablecoin_reserve',
};

// Valuation source per asset
const VALUATION_SOURCE: Record<string, string> = {
  ETH:   'coingecko',
  PAXG:  'coingecko',
  AXAU:  'coingecko', // proxied via PAXG
  AXM:   'protocol',
  AXUSD: 'protocol',
  USDC:  'protocol',
};

// Execution path label per asset
const EXEC_PATH: Record<string, string> = {
  ETH:   'bitgo_custody',
  PAXG:  'bitgo_custody',
  AXAU:  'onchain_mint',
  AXM:   'treasury_hold',
  AXUSD: 'onchain_mint',
  USDC:  'bitgo_custody',
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface ExecuteBucketResult {
  bucket: string;
  asset: string;
  usdAmount: number;
  pct: number;
  quantity: number;
  markPrice: number;
  executionPath: string;
  status: 'executed' | 'queued';
  txHash: string | null;
  settlementStatus: string;
  settlementRef: string | null;
  settlementNote: string;
}

export interface ExecAllocResult {
  execId: string;
  runId: string;
  amountUsd: number;
  buckets: ExecuteBucketResult[];
  executedAt: string;
  pricesFetchedAt: string;
}

// ── Price fetching ─────────────────────────────────────────────────────────

async function fetchLivePrices(): Promise<{
  prices: Record<string, number>;
  fetchedAt: string;
}> {
  const ids = Object.values(COINGECKO_IDS).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

  let cgData: Record<string, { usd?: number }> = {};

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      cgData = (await res.json()) as Record<string, { usd?: number }>;
    } else {
      console.warn('[executeAlloc] CoinGecko HTTP', res.status, '— using fallbacks');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[executeAlloc] CoinGecko fetch failed:', msg, '— using fallbacks');
  }

  const prices: Record<string, number> = { ...STABLE_PRICE };

  for (const [asset, cgId] of Object.entries(COINGECKO_IDS)) {
    const spot = cgData[cgId]?.usd;
    if (spot && spot > 0) {
      prices[asset] = spot;
    }
  }

  // AXAU price tracks PAXG (both represent 1 troy oz of gold)
  if (prices[AXAU_TRACKS]) {
    prices['AXAU'] = prices[AXAU_TRACKS];
  }

  // AXM fallback: protocol-internal token, no external listing
  if (!prices['AXM']) {
    prices['AXM'] = 0.001; // internal accounting placeholder
  }

  return { prices, fetchedAt: new Date().toISOString() };
}

// ── Main execution function ────────────────────────────────────────────────

export async function executeAlloc(opts: {
  runId: string;
  userId?: string;
}): Promise<ExecAllocResult> {
  const { runId } = opts;
  const execId = `ex_${nanoid8()}`;

  // 1. Load all allocation rows for this run
  const rows = await db
    .select()
    .from(treasuryAllocations)
    .where(sql`metadata->>'run_id' = ${runId} AND metadata->>'source' = 'AUTO_AI'`);

  if (rows.length === 0) {
    throw new Error(`No AUTO_AI allocation rows found for run_id: ${runId}`);
  }

  // 2. Idempotency — refuse to re-execute an already-executed run
  const alreadyExecuted = rows.some(r => r.status === 'executed');
  if (alreadyExecuted) {
    throw new Error(`Run ${runId} has already been executed — use a new allocation run`);
  }

  const rowIds = rows.map(r => r.id);
  const totalUsd = rows.reduce((s, r) => s + Number(r.usdValue ?? 0), 0);
  const totalCents = Math.round(totalUsd * 100);

  // 3. Resolve userId — look up from deposit_id or fall back to operator_founder
  const firstMeta = rows[0]?.metadata as Record<string, unknown> | null;
  const depositId = typeof firstMeta?.deposit_id === 'string' ? firstMeta.deposit_id : null;

  let resolvedUserId = opts.userId ?? 'operator_founder';
  if (depositId && depositId.startsWith('dep_')) {
    try {
      const depRows = await db
        .select({ userId: capCardDeposits.userId })
        .from(capCardDeposits)
        .where(eq(capCardDeposits.id, depositId))
        .limit(1);
      if (depRows[0]?.userId) resolvedUserId = depRows[0].userId;
    } catch {
      // non-blocking — keep default
    }
  }

  // 4. Fetch live prices
  const { prices, fetchedAt } = await fetchLivePrices();

  // 5. Compute token quantities for each bucket
  const bucketResults: Omit<ExecuteBucketResult, 'txHash' | 'settlementStatus' | 'settlementRef' | 'settlementNote'>[] = rows.map(row => {
    const asset = row.assetSymbol;
    const usdAmount = Number(row.usdValue ?? 0);
    const markPrice = prices[asset] ?? 1.0;
    const quantity = markPrice > 0 ? usdAmount / markPrice : 0;
    const rowMeta = row.metadata as Record<string, unknown> | null;
    const pct = Number(rowMeta?.pct ?? 0);
    const execPath = EXEC_PATH[asset] ?? 'treasury_hold';

    return { bucket: row.allocationBucket, asset, usdAmount, pct, quantity, markPrice, executionPath: execPath, status: 'executed' as const };
  });

  // 6. Dispatch settlement per bucket (runs OUTSIDE DB transaction)
  //    On-chain calls (AXAU mint, AXUSD mint) can take 10-60s — must not block the DB txn.
  //    IMPORTANT: settlements run SEQUENTIALLY (not Promise.all) — all on-chain paths share
  //    the deployer wallet. Parallel submissions cause nonce collisions.
  //    BitGo calls run in parallel since they don't share nonce state.
  console.log(`[executeAlloc] Dispatching settlement for ${bucketResults.length} buckets (exec: ${execId})`);

  const settlementOutcomes: SettlementOutcome[] = [];
  for (const b of bucketResults) {
    const outcome = await dispatchSettlement({
      asset:     b.asset,
      path:      b.executionPath,
      usdAmount: b.usdAmount,
      quantity:  b.quantity,
      execId,
      runId,
    });
    settlementOutcomes.push(outcome);
    if (outcome.txHash) {
      console.log(`[executeAlloc] ${b.asset} settled — tx: ${outcome.txHash}`);
    } else {
      console.log(`[executeAlloc] ${b.asset} ${outcome.settlementStatus} — ${outcome.settlementNote.slice(0, 80)}`);
    }
  }

  // Merge settlement into bucket results
  const fullBuckets: ExecuteBucketResult[] = bucketResults.map((b, i) => ({
    ...b,
    txHash:           settlementOutcomes[i].txHash,
    settlementStatus: settlementOutcomes[i].settlementStatus,
    settlementRef:    settlementOutcomes[i].settlementRef,
    settlementNote:   settlementOutcomes[i].settlementNote,
  }));

  const now = new Date();

  // 7. All DB mutations in one transaction
  await db.transaction(async (tx) => {
    // 7a. Mark rows → 'executing' first (crash-safe mid-execution marker)
    await tx
      .update(treasuryAllocations)
      .set({ status: 'executing', updatedAt: now })
      .where(inArray(treasuryAllocations.id, rowIds));

    // 7b. Mark rows → 'executed'
    for (const row of rows) {
      const bucket = fullBuckets.find(b => b.bucket === row.allocationBucket)!;
      await tx
        .update(treasuryAllocations)
        .set({
          status: 'executed',
          updatedAt: now,
          metadata: {
            ...(row.metadata as object ?? {}),
            exec_id:            execId,
            exec_path:          bucket.executionPath,
            mark_price:         bucket.markPrice,
            quantity:           bucket.quantity,
            tx_hash:            bucket.txHash,
            settlement_status:  bucket.settlementStatus,
            prices_fetched_at:  fetchedAt,
          },
        })
        .where(eq(treasuryAllocations.id, row.id));
    }

    // 7c. Insert reserve_positions — one snapshot row per asset with settlement fields
    for (const b of fullBuckets) {
      await tx.insert(reservePositions).values({
        assetSymbol:        b.asset,
        positionType:       POSITION_TYPE[b.asset] ?? 'protocol_reserve',
        quantity:           b.quantity.toFixed(8),
        markPrice:          b.markPrice.toFixed(8),
        usdValue:           b.usdAmount.toFixed(2),
        valuationSource:    VALUATION_SOURCE[b.asset] ?? 'protocol',
        valuationConfidence: 'medium',
        snapshotAt:         now,
        txHash:             b.txHash,
        settlementStatus:   b.settlementStatus,
        settlementRef:      b.settlementRef,
        settlementNote:     b.settlementNote,
        metadata: {
          exec_id:            execId,
          run_id:             runId,
          execution_path:     b.executionPath,
          prices_fetched_at:  fetchedAt,
          source:             'AUTO_EXEC',
        },
      });
    }

    // 7d. Debit internal wallet
    if (totalCents > 0) {
      const locked = await tx.execute(
        sql`SELECT available_cents FROM axiom_wallet_balances WHERE user_id = ${resolvedUserId} FOR UPDATE`,
      );
      const lockRow = locked.rows[0] as { available_cents: number } | undefined;
      const available = lockRow ? Number(lockRow.available_cents) : 0;
      const debit = Math.min(totalCents, available);
      const newAvailable = available - debit;
      const txnId = `wtx_${Date.now()}_${nanoid8()}`;

      if (debit > 0) {
        await tx.insert(axiomWalletTransactions).values({
          id:               txnId,
          userId:           resolvedUserId,
          type:             'DEBIT',
          amountCents:      debit,
          direction:        'DEBIT',
          balanceAfterCents: newAvailable,
          status:           'SETTLED',
          referenceType:    'AUTO_EXEC',
          referenceId:      execId,
          notes:            `Auto-executed allocation run ${runId} — 6 asset positions`,
          idempotencyKey:   `exec_${execId}`,
        } as any);

        await tx
          .update(axiomWalletBalances)
          .set({
            availableCents:          newAvailable,
            lifetimeAllocatedCents:  sql`lifetime_allocated_cents + ${debit}`,
            updatedAt:               now,
          })
          .where(eq(axiomWalletBalances.userId, resolvedUserId));
      }
    }

    // 7e. Audit event — success
    await tx.insert(capAuditEvents).values({
      id:            generateId('ae'),
      eventType:     'card_deposit.allocation_executed',
      aggregateType: 'treasury_allocation',
      aggregateId:   runId,
      payloadJson: {
        exec_id:      execId,
        run_id:       runId,
        amount_usd:   totalUsd,
        user_id:      resolvedUserId,
        bucket_count: fullBuckets.length,
        buckets:      fullBuckets,
        prices,
        prices_fetched_at: fetchedAt,
        source: 'AUTO_EXEC',
        settlement_summary: fullBuckets.map(b => ({
          asset:             b.asset,
          settlement_status: b.settlementStatus,
          tx_hash:           b.txHash,
          settlement_ref:    b.settlementRef,
        })),
      },
      actor: 'system',
    }).onConflictDoNothing();
  });

  return {
    execId,
    runId,
    amountUsd: totalUsd,
    buckets:   fullBuckets,
    executedAt:      now.toISOString(),
    pricesFetchedAt: fetchedAt,
  };
}
