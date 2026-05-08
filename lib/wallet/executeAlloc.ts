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
import { eq, sql, and, inArray, desc } from 'drizzle-orm';
import { CORE_CONTRACTS } from '../../shared/contracts';
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
  priceSource: string;
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
  priceSources: Record<string, string>;
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
  const priceSources: Record<string, string> = {
    USDC: 'protocol',
    AXUSD: 'protocol',
  };

  for (const [asset, cgId] of Object.entries(COINGECKO_IDS)) {
    const spot = cgData[cgId]?.usd;
    if (spot && spot > 0) {
      prices[asset] = spot;
      priceSources[asset] = 'coingecko';
    }
  }

  // AXAU price tracks PAXG (both represent 1 troy oz of gold)
  if (prices[AXAU_TRACKS]) {
    prices['AXAU'] = prices[AXAU_TRACKS];
    priceSources['AXAU'] = priceSources[AXAU_TRACKS] ?? 'coingecko';
  }

  // AXM: NOT hardcoded here — cascade resolved in executeAlloc()
  // (CoinGecko above may have already set it if the listing goes live)

  return { prices, priceSources, fetchedAt: new Date().toISOString() };
}

// ── AXM price cascade (CoinGecko → Camelot TWAP → last-known) ──────────────

async function resolveAXMPrice(cgPrice: number | undefined): Promise<{
  price: number;
  source: string;
}> {
  // 1. CoinGecko already resolved it
  if (cgPrice && cgPrice > 0) {
    return { price: cgPrice, source: 'coingecko' };
  }

  // 2. Camelot on-chain spot (AXM/USDC pool via factory discovery)
  try {
    const { camelotPoolService } = await import('../services/CamelotPoolService');
    const camelotPrice = await camelotPoolService.getTokenTWAPVsUsdc(
      CORE_CONTRACTS.AXM_TOKEN,
      18,
    );
    if (camelotPrice !== null && camelotPrice > 0) {
      console.log(`[executeAlloc] AXM price via Camelot 30-min TWAP: $${camelotPrice.toFixed(8)}`);
      return { price: camelotPrice, source: 'camelot_twap' };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[executeAlloc] Camelot AXM price lookup failed:', msg);
  }

  // 3. Last-known mark price from the most recent CONFIRMED reserve_positions row
  try {
    const rows = await db
      .select({ markPrice: reservePositions.markPrice })
      .from(reservePositions)
      .where(
        sql`asset_symbol = 'AXM'
            AND mark_price IS NOT NULL
            AND mark_price::numeric > 0
            AND settlement_status = 'confirmed'`,
      )
      .orderBy(desc(reservePositions.snapshotAt))
      .limit(1);
    const lastKnown = rows[0]?.markPrice !== undefined && rows[0].markPrice !== null
      ? Number(rows[0].markPrice)
      : null;
    if (lastKnown !== null && lastKnown > 0) {
      console.warn(`[executeAlloc] AXM price [warn source=last-known]: $${lastKnown} from reserve_positions`);
      return { price: lastKnown, source: 'last_known' };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[executeAlloc] AXM last-known price lookup failed:', msg);
  }

  // Final fallback: AXM is a pre-listing governance token settled as treasury_hold
  // (no real on-chain transfer). Using a nominal protocol estimate rather than aborting
  // the entire run preserves the USD allocation record; the quantity figure is nominal.
  // Set AXM_PROTOCOL_ESTIMATE_USD in env to override (e.g. once the token lists on DEX).
  const estimateUsd = Math.max(
    0.000001,
    Number(process.env.AXM_PROTOCOL_ESTIMATE_USD ?? '0.001'),
  );
  console.warn(
    `[executeAlloc] AXM price: all market sources exhausted — ` +
    `using protocol estimate $${estimateUsd} (source=protocol_estimate). ` +
    `Set AXM_PROTOCOL_ESTIMATE_USD env var or update mark manually after token lists.`,
  );
  return { price: estimateUsd, source: 'protocol_estimate' };
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

  // 2. Idempotency — refuse to re-execute an already-executing or already-executed run
  const blockedRow = rows.find(r => r.status === 'executed' || r.status === 'executing');
  if (blockedRow) {
    const verb = blockedRow.status === 'executed' ? 'already been executed' : 'currently executing';
    throw new Error(`Run ${runId} has ${verb} — use a new allocation run`);
  }

  const rowIds = rows.map(r => r.id);
  const totalUsd = rows.reduce((s, r) => s + Number(r.usdValue ?? 0), 0);
  const totalCents = Math.round(totalUsd * 100);

  // 3. Pre-claim: atomically mark all rows → 'executing' in their own committed write.
  //    This must be durable BEFORE settlement dispatch starts so that a crash after
  //    an on-chain tx is emitted (but before the final commit) leaves the DB in
  //    'executing' — recoverable by an operator — rather than silently allowing
  //    a second executeAlloc call to re-execute already-settled on-chain funds.
  const preclaimAt = new Date();
  const claimed = await db
    .update(treasuryAllocations)
    .set({ status: 'executing', updatedAt: preclaimAt })
    .where(
      and(
        inArray(treasuryAllocations.id, rowIds),
        inArray(treasuryAllocations.status, ['recorded']),
      ),
    )
    .returning({ id: treasuryAllocations.id });

  if (claimed.length !== rowIds.length) {
    throw new Error(
      `Run ${runId} pre-claim failed — ${claimed.length} of ${rowIds.length} rows were available ` +
      `(a concurrent execution may already be in progress)`,
    );
  }

  // 4a. Resolve userId — look up from deposit_id or fall back to operator_founder
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
  const { prices, priceSources, fetchedAt } = await fetchLivePrices();

  // 4a. Resolve AXM price via cascade (CoinGecko → Camelot → last-known)
  const { price: axmPrice, source: axmSource } = await resolveAXMPrice(prices['AXM']);
  prices['AXM'] = axmPrice;
  priceSources['AXM'] = axmSource;

  // 5. Compute token quantities for each bucket
  const bucketResults: Omit<ExecuteBucketResult, 'txHash' | 'settlementStatus' | 'settlementRef' | 'settlementNote'>[] = rows.map(row => {
    const asset = row.assetSymbol;
    const usdAmount = Number(row.usdValue ?? 0);
    const markPrice = prices[asset] ?? 1.0;
    const quantity = markPrice > 0 ? usdAmount / markPrice : 0;
    const rowMeta = row.metadata as Record<string, unknown> | null;
    const pct = Number(rowMeta?.pct ?? 0);
    const execPath = EXEC_PATH[asset] ?? 'treasury_hold';
    const priceSource = priceSources[asset] ?? VALUATION_SOURCE[asset] ?? 'protocol';

    return { bucket: row.allocationBucket, asset, usdAmount, pct, quantity, markPrice, priceSource, executionPath: execPath, status: 'executed' as const };
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

  // Merge settlement into bucket results; for AXM, append price-source provenance to note
  const fullBuckets: ExecuteBucketResult[] = bucketResults.map((b, i) => {
    const outcome = settlementOutcomes[i];
    let settlementNote = outcome.settlementNote;
    if (b.asset === 'AXM') {
      const sourceLabel =
        b.priceSource === 'coingecko'          ? 'CoinGecko live price'
        : b.priceSource === 'camelot_twap'     ? 'Camelot 30-min TWAP'
        : b.priceSource === 'last_known'        ? 'last confirmed reserve_positions mark'
        : b.priceSource === 'protocol_estimate' ? 'protocol estimate (pre-listing nominal — update mark manually)'
        : b.priceSource;
      settlementNote = settlementNote
        ? `${settlementNote} | AXM mark source: ${sourceLabel}`
        : `AXM mark source: ${sourceLabel}`;
    }
    return {
      ...b,
      txHash:           outcome.txHash,
      settlementStatus: outcome.settlementStatus,
      settlementRef:    outcome.settlementRef,
      settlementNote,
    };
  });

  const now = new Date();

  // 7. Final DB commit — rows are already 'executing' from the pre-claim above.
  //    Settlement outcomes are now recorded durably. Any crash before this point
  //    leaves rows in 'executing' and is recoverable by operator reconciliation.
  await db.transaction(async (tx) => {
    // 7a. Mark rows → 'executed' (pre-claim already committed 'executing')
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
        valuationSource:    b.priceSource,
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
          price_source:       b.priceSource,
          source:             'AUTO_EXEC',
        },
      });
    }

    // 7d. Debit internal wallet
    //     Ensure the row exists first — on first run (e.g. 'operator_founder'
    //     has never topped up) the row won't exist and the SELECT FOR UPDATE
    //     would return nothing, causing the debit to be silently skipped.
    if (totalCents > 0) {
      await tx.execute(
        sql`INSERT INTO axiom_wallet_balances (user_id, available_cents, pending_cents, lifetime_deposited_cents, lifetime_allocated_cents)
            VALUES (${resolvedUserId}, 0, 0, 0, 0)
            ON CONFLICT (user_id) DO NOTHING`,
      );

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
