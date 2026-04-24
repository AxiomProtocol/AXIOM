/**
 * Task #248 — Auto-resolve or surface stuck pending property-report payments.
 *
 * The on-chain payment flow (task #230) creates a `pending` `property_reports`
 * row when a buyer requests an on-chain payment intent, then promotes it to
 * `paid` only after the buyer POSTs a verified tx hash to
 * `/api/property/confirm-payment`. If the buyer abandons that final POST
 * (closes the wallet, switches devices, never returns) the row sits as
 * `pending` forever and no report is generated — even if the AXUSD transfer
 * already landed on-chain.
 *
 * This resolver:
 *   1. Lists pending property_reports older than `minPendingAgeMinutes`
 *      that have a recorded `buyerWallet`.
 *   2. For each, scans AXUSD Transfer logs from `buyerWallet` →
 *      `PROPERTY_REPORT_PAYMENT_RECEIVER` since the row was created.
 *   3. If a matching transfer is found, replays `verifyOnchainPayment`
 *      against the candidate tx hash, updates the row to `paid`, and
 *      kicks off `generateReport` (same write path as confirm-payment.ts).
 *   4. Pending rows older than `maxPendingAgeHours` with no matching
 *      transfer are marked `expired` so the operator console stops
 *      surfacing them.
 *
 * The resolver is deliberately read-mostly: it never moves a row out of
 * `pending` unless an on-chain transfer (or the expiry window) justifies it,
 * and it never re-pays a row that has already advanced past `pending`.
 */

import { ethers } from 'ethers';
import { and, eq, isNotNull, lt, sql } from 'drizzle-orm';
import { db } from '../../server/db';
import { propertyReports } from '../../shared/propertySchema';
import {
  PROPERTY_PAYMENT_CHAIN_ID,
  PROPERTY_PAYMENT_RECIPIENT,
  PROPERTY_PAYMENT_TOKEN,
  verifyOnchainPayment,
} from './onchainPayment';
import { generateReport, TIER_CONFIG } from '../../server/services/property/pipeline';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

/** Arbitrum One produces ~4 blocks per second (0.25 s block time). */
const ARBITRUM_BLOCKS_PER_SECOND = 4;

/** Hard cap on per-call getLogs window — most providers reject larger ranges. */
const DEFAULT_MAX_LOGS_BLOCK_RANGE = 10_000;

/** Max blocks we will look back regardless of the row's createdAt. */
const DEFAULT_MAX_LOOKBACK_BLOCKS = 1_500_000; // ~4 days on Arbitrum One

/**
 * Default windows. The defaults are conservative — operators can tune via
 * `STUCK_PAYMENT_*` env vars or the resolver options.
 */
const DEFAULT_MIN_PENDING_AGE_MINUTES = 15;
const DEFAULT_MAX_PENDING_AGE_HOURS = 72;
const DEFAULT_LIMIT = 25;

// ─── Provider injection (overridable for tests) ───────────────────────────────

export interface MinimalProvider {
  getBlockNumber(): Promise<number>;
  getLogs(filter: ethers.Filter): Promise<ethers.Log[]>;
}

let providerOverride: MinimalProvider | null = null;

/** Test seam — overrides the JsonRpcProvider used for log scans. */
export function __setStuckPaymentProvider(p: MinimalProvider | null): void {
  providerOverride = p;
}

function getProvider(): MinimalProvider {
  if (providerOverride) return providerOverride;
  const rpc = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(rpc);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResolveOptions {
  minPendingAgeMinutes?: number;
  maxPendingAgeHours?: number;
  /** Max number of pending rows considered per run. */
  limit?: number;
  /** Override the per-call getLogs block range (default 10k). */
  maxLogsBlockRange?: number;
  /** Hard cap on how far back we will scan logs for any single row. */
  maxLookbackBlocks?: number;
}

export interface ResolvedRow {
  reportId: string;
  txHash: string;
  status: 'ready' | 'failed' | 'paid';
}

export interface ResolverError {
  reportId: string;
  reason: string;
}

export interface ResolveSummary {
  scanned: number;
  resolved: ResolvedRow[];
  expired: string[];
  errors: ResolverError[];
  /** Pending rows the resolver looked at but couldn't act on (no matching tx, not yet old enough to expire). */
  unresolvedReportIds: string[];
}

// ─── Configuration helpers ────────────────────────────────────────────────────

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function resolveOptions(opts: ResolveOptions): Required<ResolveOptions> {
  return {
    minPendingAgeMinutes:
      opts.minPendingAgeMinutes ?? envInt('STUCK_PAYMENT_MIN_AGE_MINUTES', DEFAULT_MIN_PENDING_AGE_MINUTES),
    maxPendingAgeHours:
      opts.maxPendingAgeHours ?? envInt('STUCK_PAYMENT_MAX_AGE_HOURS', DEFAULT_MAX_PENDING_AGE_HOURS),
    limit: opts.limit ?? envInt('STUCK_PAYMENT_LIMIT', DEFAULT_LIMIT),
    maxLogsBlockRange:
      opts.maxLogsBlockRange ?? envInt('STUCK_PAYMENT_BLOCK_RANGE', DEFAULT_MAX_LOGS_BLOCK_RANGE),
    maxLookbackBlocks:
      opts.maxLookbackBlocks ?? envInt('STUCK_PAYMENT_MAX_LOOKBACK_BLOCKS', DEFAULT_MAX_LOOKBACK_BLOCKS),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Lists pending property_reports older than `minPendingAgeMinutes` that have
 * a recorded `buyerWallet`. Used both by the resolver and by the operator
 * surfacing endpoint so the two views stay consistent.
 */
export async function listStuckPending(opts: ResolveOptions = {}) {
  const cfg = resolveOptions(opts);
  const cutoff = new Date(Date.now() - cfg.minPendingAgeMinutes * 60_000);

  const rows = await db
    .select({
      id: propertyReports.id,
      tier: propertyReports.tier,
      addressRaw: propertyReports.addressRaw,
      buyerWallet: propertyReports.buyerWallet,
      buyerEmail: propertyReports.buyerEmail,
      createdAt: propertyReports.createdAt,
      amountPaidCents: propertyReports.amountPaidCents,
    })
    .from(propertyReports)
    .where(
      and(
        eq(propertyReports.status, 'pending'),
        isNotNull(propertyReports.buyerWallet),
        lt(propertyReports.createdAt, cutoff),
      ),
    )
    .orderBy(propertyReports.createdAt)
    .limit(cfg.limit);

  return rows;
}

/**
 * Resolve every stuck pending row currently visible to `listStuckPending`.
 *
 * Per row, behaviour is:
 *  - matching on-chain transfer found → mark paid + run generateReport
 *  - no transfer + row older than `maxPendingAgeHours` → mark expired
 *  - no transfer + row still inside the expiry window → leave untouched
 */
export async function resolveStuckPayments(opts: ResolveOptions = {}): Promise<ResolveSummary> {
  const cfg = resolveOptions(opts);
  const summary: ResolveSummary = {
    scanned: 0,
    resolved: [],
    expired: [],
    errors: [],
    unresolvedReportIds: [],
  };

  const candidates = await listStuckPending(cfg);
  summary.scanned = candidates.length;
  if (candidates.length === 0) return summary;

  const provider = getProvider();
  let latestBlock: number;
  try {
    latestBlock = await provider.getBlockNumber();
  } catch (err) {
    summary.errors.push({
      reportId: 'all',
      reason: `Could not fetch latest block: ${err instanceof Error ? err.message : 'unknown'}`,
    });
    return summary;
  }

  const expiryCutoff = new Date(Date.now() - cfg.maxPendingAgeHours * 60 * 60_000);

  for (const row of candidates) {
    if (!row.buyerWallet) {
      summary.unresolvedReportIds.push(row.id);
      continue;
    }

    try {
      const txHash = await findTransferTxHash(
        provider,
        row.buyerWallet,
        row.createdAt,
        latestBlock,
        cfg.maxLogsBlockRange,
        cfg.maxLookbackBlocks,
      );

      if (txHash) {
        const promoted = await promoteToPaid(row.id, row.tier, txHash, row.buyerWallet);
        if (promoted.ok) {
          summary.resolved.push({ reportId: row.id, txHash, status: promoted.status });
        } else {
          summary.errors.push({ reportId: row.id, reason: promoted.reason });
        }
        continue;
      }

      // No matching transfer. Expire if old enough; otherwise leave alone.
      if (row.createdAt < expiryCutoff) {
        await expirePending(row.id);
        summary.expired.push(row.id);
      } else {
        summary.unresolvedReportIds.push(row.id);
      }
    } catch (err) {
      summary.errors.push({
        reportId: row.id,
        reason: err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  return summary;
}

/**
 * Re-confirm a single pending property report by replaying the on-chain
 * verification + report generation for the supplied tx hash. Used by the
 * operator console when an operator pastes a tx hash by hand.
 *
 * Mirrors the write path in `pages/api/property/confirm-payment.ts` so the
 * two surfaces stay in lockstep.
 */
export async function resolveSingleByTxHash(
  reportId: string,
  txHash: string,
): Promise<{ ok: true; status: ResolvedRow['status'] } | { ok: false; reason: string }> {
  const [report] = await db
    .select()
    .from(propertyReports)
    .where(eq(propertyReports.id, reportId))
    .limit(1);

  if (!report) return { ok: false, reason: 'Report not found' };
  if (report.status !== 'pending') {
    return { ok: false, reason: `Report is already ${report.status}, refusing to overwrite.` };
  }
  if (report.tier === 'free') {
    return { ok: false, reason: 'Free reports do not require payment.' };
  }

  return promoteToPaid(report.id, report.tier, txHash, report.buyerWallet);
}

// ─── Internals ────────────────────────────────────────────────────────────────

async function promoteToPaid(
  reportId: string,
  tier: string,
  txHash: string,
  expectedBuyerWallet: string | null | undefined,
): Promise<{ ok: true; status: ResolvedRow['status'] } | { ok: false; reason: string }> {
  const cfg = TIER_CONFIG[tier as 'base' | 'premium'];
  if (!cfg) return { ok: false, reason: `Unknown tier ${tier}` };

  const verification = await verifyOnchainPayment(txHash, cfg.priceCents);
  if (!verification.ok) return { ok: false, reason: verification.reason };

  // Mirror the sender check from /api/property/confirm-payment: if the row
  // was created with a buyer wallet, the on-chain transfer must come from
  // it. Operators using the manual confirm path can't bypass this.
  if (
    expectedBuyerWallet &&
    verification.from &&
    expectedBuyerWallet.toLowerCase() !== verification.from.toLowerCase()
  ) {
    return {
      ok: false,
      reason: `Payment must be sent from the wallet recorded on the report (${expectedBuyerWallet}); transfer was from ${verification.from}.`,
    };
  }

  // Reject if this tx hash has already been claimed by another report.
  const reused = await db
    .select({ id: propertyReports.id })
    .from(propertyReports)
    .where(
      and(
        eq(propertyReports.paymentTxHash, txHash.toLowerCase()),
        sql`${propertyReports.id} != ${reportId}`,
      ),
    )
    .limit(1);
  if (reused.length > 0) {
    return { ok: false, reason: 'Tx hash already used by another report.' };
  }

  await db
    .update(propertyReports)
    .set({
      status: 'paid',
      paymentTxHash: txHash.toLowerCase(),
      paymentChainId: verification.chainId,
      paymentToken: verification.token,
      paymentFromAddress: verification.from.toLowerCase(),
      paymentConfirmedAt: new Date(),
      buyerWallet: verification.from.toLowerCase(),
      updatedAt: new Date(),
    })
    .where(eq(propertyReports.id, reportId));

  try {
    await generateReport(reportId);
    return { ok: true, status: 'ready' };
  } catch (err) {
    // generateReport already wrote status=failed/errorMessage on its own
    // failure paths; we report the soft outcome here so the caller can log it.
    console.error(
      '[stuckPaymentResolver] generateReport failed after auto-confirm',
      reportId,
      err instanceof Error ? err.message : err,
    );
    return { ok: true, status: 'failed' };
  }
}

async function expirePending(reportId: string): Promise<void> {
  await db
    .update(propertyReports)
    .set({
      status: 'expired',
      errorMessage: 'No on-chain payment received within the expiry window.',
      updatedAt: new Date(),
    })
    .where(and(eq(propertyReports.id, reportId), eq(propertyReports.status, 'pending')));
}

/**
 * Walk AXUSD Transfer logs from `buyerWallet` → recipient on Arbitrum One,
 * starting from a block at-or-before `since`, and return the first matching
 * tx hash. Uses chunked getLogs to stay under typical provider limits.
 *
 * Returns `null` if no matching transfer is found in the scan window.
 */
async function findTransferTxHash(
  provider: MinimalProvider,
  buyerWallet: string,
  since: Date,
  latestBlock: number,
  maxLogsBlockRange: number,
  maxLookbackBlocks: number,
): Promise<string | null> {
  const ageSeconds = Math.max(0, Math.floor((Date.now() - since.getTime()) / 1000));
  // Add a 30-minute safety buffer so we don't miss a transfer that landed
  // a few seconds before the row was inserted (RPC clock skew, etc).
  const lookbackBlocks = Math.min(
    maxLookbackBlocks,
    (ageSeconds + 30 * 60) * ARBITRUM_BLOCKS_PER_SECOND,
  );
  const fromBlockFloor = Math.max(0, latestBlock - lookbackBlocks);

  const fromTopic = ethers.zeroPadValue(buyerWallet.toLowerCase(), 32);
  const toTopic = ethers.zeroPadValue(PROPERTY_PAYMENT_RECIPIENT.toLowerCase(), 32);

  // Walk newest → oldest; the first hit we get is the transfer most likely
  // to belong to this buyer.
  let cursor = latestBlock;
  while (cursor >= fromBlockFloor) {
    const fromBlock = Math.max(fromBlockFloor, cursor - maxLogsBlockRange + 1);
    const logs = await provider.getLogs({
      address: PROPERTY_PAYMENT_TOKEN,
      fromBlock,
      toBlock: cursor,
      topics: [TRANSFER_TOPIC, fromTopic, toTopic],
    });
    if (logs.length > 0) {
      // Most recent match wins — newest blocks first, then highest log index.
      const sorted = [...logs].sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) return b.blockNumber - a.blockNumber;
        return (b.index ?? 0) - (a.index ?? 0);
      });
      return sorted[0].transactionHash;
    }
    if (fromBlock === fromBlockFloor) break;
    cursor = fromBlock - 1;
  }
  return null;
}

// Re-export so callers don't need a second import to reach the on-chain side.
export { PROPERTY_PAYMENT_CHAIN_ID, PROPERTY_PAYMENT_RECIPIENT, PROPERTY_PAYMENT_TOKEN };
