/**
 * Capital Infrastructure — Market Data service.
 *
 * Append-only price snapshot store. The latest price for an
 * (asset, priceType) tuple is the row with the greatest observedAt;
 * staleness is computed at read time so historical replay matches
 * production behaviour.
 *
 * Oracle profile (per-asset) lives on `cap_assets.metadataJson.oracleProfile`
 * for Phase 1 — a dedicated `cap_oracle_profiles` table is Phase 2.
 * Shape:
 *   {
 *     primarySource: string,        // e.g. "coinbase"
 *     secondarySource: string,      // e.g. "alphavantage"
 *     staleSec: number,             // staleness budget for SPOT/NAV (sec)
 *     divergenceBps: number,        // max abs divergence vs latest opposing
 *                                   //   source snapshot, in basis points
 *   }
 *
 * Ingestion contract (§642-684 of the spec):
 *   - Compute confidence (0.00–1.00) from staleness and divergence.
 *   - If divergence exceeds threshold against the latest opposing-source
 *     snapshot, REJECT the snapshot and emit `price.snapshot_rejected`.
 *   - Otherwise PERSIST and emit `price.snapshot_ingested`.
 */

import { db } from '../../server/db';
import {
  capPriceSnapshots,
  type CapPriceSnapshot,
  type NewCapPriceSnapshot,
  type CapAsset,
} from '../../shared/capInfraSchema';
import { and, desc, eq, ne } from 'drizzle-orm';
import { generateId } from './ids';
import { NotFoundError, ValidationError } from './errors';
import { emitAuditEventStrict, emitAuditEvent } from './audit';
import { getAssetById } from './assetRegistry';

export interface IngestPriceInput {
  assetId: string;
  priceType: 'SPOT' | 'NAV' | 'INDICATIVE' | 'MARK_TO_MODEL' | 'MID' | 'BID' | 'ASK';
  source: string;
  quoteCurrency?: string;
  price: string;
  observedAt: Date;
  payloadJson?: Record<string, unknown>;
}

const DEFAULT_STALENESS_BUDGET_SEC = 900;
const DEFAULT_DIVERGENCE_BPS = 200; // 2.00%
const MAX_CONFIDENCE = 1.0;

interface OracleProfile {
  primarySource: string;
  secondarySource: string;
  staleSec: number;
  divergenceBps: number;
}

function readOracleProfile(asset: CapAsset): OracleProfile {
  const md = (asset.metadataJson ?? null) as Record<string, unknown> | null;
  const raw = md && typeof md === 'object' ? (md.oracleProfile as Record<string, unknown> | undefined) : undefined;
  return {
    primarySource: typeof raw?.primarySource === 'string' ? raw.primarySource : 'manual',
    secondarySource: typeof raw?.secondarySource === 'string' ? raw.secondarySource : 'manual',
    staleSec: typeof raw?.staleSec === 'number' ? raw.staleSec : DEFAULT_STALENESS_BUDGET_SEC,
    divergenceBps:
      typeof raw?.divergenceBps === 'number' ? raw.divergenceBps : DEFAULT_DIVERGENCE_BPS,
  };
}

function divergenceBps(a: number, b: number): number {
  if (a <= 0 || b <= 0) return Number.POSITIVE_INFINITY;
  const mid = (a + b) / 2;
  return Math.abs(a - b) / mid * 10_000;
}

function confidenceFrom(ageSec: number, profile: OracleProfile, divBps: number | null): string {
  // Base score: 1.0 at age 0, linearly decaying to 0 at the staleness
  // budget. Divergence further penalizes confidence linearly up to the
  // configured threshold.
  const ageScore = Math.max(0, 1 - ageSec / Math.max(1, profile.staleSec));
  const divScore =
    divBps === null ? 1 : Math.max(0, 1 - divBps / Math.max(1, profile.divergenceBps));
  const score = Math.min(MAX_CONFIDENCE, ageScore * divScore);
  return score.toFixed(2);
}

export interface IngestResult {
  status: 'ACCEPTED' | 'REJECTED';
  snapshot?: CapPriceSnapshot;
  reason?: string;
  divergenceBps?: number;
  confidence?: string;
}

export async function ingestPrice(
  input: IngestPriceInput,
  actor: string,
  correlationId?: string,
): Promise<IngestResult> {
  const asset = await getAssetById(input.assetId);
  if (!asset) throw new NotFoundError(`asset ${input.assetId} not found`);

  const profile = readOracleProfile(asset);

  // Divergence check: compare against the most recent snapshot from a
  // different source for the same (asset, priceType, quoteCurrency).
  const quoteCurrency = input.quoteCurrency ?? 'USD';
  const [opposing] = await db
    .select()
    .from(capPriceSnapshots)
    .where(
      and(
        eq(capPriceSnapshots.assetId, input.assetId),
        eq(capPriceSnapshots.priceType, input.priceType),
        eq(capPriceSnapshots.quoteCurrency, quoteCurrency),
        ne(capPriceSnapshots.source, input.source),
      ),
    )
    .orderBy(desc(capPriceSnapshots.observedAt))
    .limit(1);

  let divBps: number | null = null;
  if (opposing) {
    const a = Number(input.price);
    const b = Number(opposing.price);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new ValidationError('non-numeric price encountered during divergence check');
    }
    divBps = divergenceBps(a, b);
    if (divBps > profile.divergenceBps) {
      // Reject — emit best-effort audit (no row to anchor against).
      await emitAuditEvent({
        eventType: 'price.snapshot_rejected',
        aggregateType: 'asset',
        aggregateId: input.assetId,
        assetId: input.assetId,
        actor,
        correlationId,
        payloadJson: {
          reason: 'divergence_exceeded',
          divergenceBps: Math.round(divBps),
          thresholdBps: profile.divergenceBps,
          submittedSource: input.source,
          opposingSource: opposing.source,
          submittedPrice: input.price,
          opposingPrice: opposing.price,
          priceType: input.priceType,
        },
      });
      return {
        status: 'REJECTED',
        reason: 'divergence_exceeded',
        divergenceBps: Math.round(divBps),
      };
    }
  }

  const ageSec = Math.max(0, Math.floor((Date.now() - input.observedAt.getTime()) / 1000));
  const confidence = confidenceFrom(ageSec, profile, divBps);

  const id = generateId('ps');
  const row: NewCapPriceSnapshot = {
    id,
    assetId: input.assetId,
    priceType: input.priceType,
    source: input.source,
    quoteCurrency,
    price: input.price,
    confidence,
    staleSec: profile.staleSec,
    observedAt: input.observedAt,
    payloadJson: (input.payloadJson ?? null) as Record<string, unknown> | null,
  };
  const persisted = await db.transaction(async (tx) => {
    const [created] = await tx.insert(capPriceSnapshots).values(row).returning();
    await emitAuditEventStrict(
      {
        eventType: 'price.snapshot_ingested',
        aggregateType: 'asset',
        aggregateId: input.assetId,
        assetId: input.assetId,
        actor,
        correlationId,
        payloadJson: {
          priceSnapshotId: id,
          priceType: input.priceType,
          source: input.source,
          price: input.price,
          confidence,
          divergenceBps: divBps === null ? null : Math.round(divBps),
          observedAt: input.observedAt.toISOString(),
        },
      },
      tx,
    );
    return created;
  });
  return {
    status: 'ACCEPTED',
    snapshot: persisted,
    confidence,
    divergenceBps: divBps === null ? undefined : Math.round(divBps),
  };
}

export interface LatestPriceResult {
  assetId: string;
  priceType: string;
  price: string;
  source: string;
  quoteCurrency: string;
  confidence: string | null;
  observedAt: Date;
  ingestedAt: Date;
  ageSec: number;
  isStale: boolean;
  staleSec: number | null;
}

export async function getLatestPrice(
  assetId: string,
  priceType?: 'SPOT' | 'NAV' | 'INDICATIVE' | 'MARK_TO_MODEL' | 'MID' | 'BID' | 'ASK',
): Promise<LatestPriceResult | null> {
  const conditions = [eq(capPriceSnapshots.assetId, assetId)];
  if (priceType) conditions.push(eq(capPriceSnapshots.priceType, priceType));
  const [row] = await db
    .select()
    .from(capPriceSnapshots)
    .where(and(...conditions))
    .orderBy(desc(capPriceSnapshots.observedAt))
    .limit(1);
  if (!row) return null;
  const ageSec = Math.max(0, Math.floor((Date.now() - row.observedAt.getTime()) / 1000));
  const budget = row.staleSec ?? DEFAULT_STALENESS_BUDGET_SEC;
  return {
    assetId: row.assetId,
    priceType: row.priceType,
    price: row.price,
    source: row.source,
    quoteCurrency: row.quoteCurrency,
    confidence: row.confidence,
    observedAt: row.observedAt,
    ingestedAt: row.ingestedAt,
    ageSec,
    isStale: ageSec > budget,
    staleSec: row.staleSec,
  };
}

export async function listPriceHistory(
  assetId: string,
  priceType?: 'SPOT' | 'NAV' | 'INDICATIVE' | 'MARK_TO_MODEL' | 'MID' | 'BID' | 'ASK',
  limit = 50,
): Promise<CapPriceSnapshot[]> {
  const conditions = [eq(capPriceSnapshots.assetId, assetId)];
  if (priceType) conditions.push(eq(capPriceSnapshots.priceType, priceType));
  return db
    .select()
    .from(capPriceSnapshots)
    .where(and(...conditions))
    .orderBy(desc(capPriceSnapshots.observedAt))
    .limit(Math.min(Math.max(limit, 1), 500));
}
