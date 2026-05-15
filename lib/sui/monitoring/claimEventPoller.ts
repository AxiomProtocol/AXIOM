import 'server-only';
import { getSuiClient, SUI_CONSTANTS } from '../client';

// =============================================================================
// Claim Event Poller — Phase 9 Monitoring
//
// Polls Sui RPC for ClaimCampaign events emitted by the production package.
// Detects: successful claims, proof anomalies, volume spikes.
// =============================================================================

export interface ClaimEvent {
  txDigest: string;
  eventSeq: string;
  campaignId: string;
  claimer: string;
  amount: string;
  timestampMs: string;
}

export interface ClaimPollResult {
  events: ClaimEvent[];
  nextCursor: { txDigest: string; eventSeq: string } | null;
  hasMore: boolean;
  polledAt: string;
  error?: string;
}

export interface ClaimAnomalyAlert {
  type: 'volume_spike' | 'rapid_drain' | 'repeated_failure';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  detail: string;
  detectedAt: string;
}

const CLAIM_EVENT_TYPE = (packageId: string) =>
  `${packageId}::claim_campaign::Claimed`;

/**
 * Poll recent Claimed events from the Sui RPC.
 * Returns the last `limit` events ordered newest-first.
 */
export async function pollClaimEvents(options: {
  packageId: string;
  limit?: number;
  cursor?: { txDigest: string; eventSeq: string } | null;
}): Promise<ClaimPollResult> {
  const { packageId, limit = 50, cursor = null } = options;
  const client = getSuiClient();
  const polledAt = new Date().toISOString();

  try {
    const result = await client.queryEvents({
      query: { MoveEventType: CLAIM_EVENT_TYPE(packageId) },
      limit,
      cursor,
      descending_order: true,
    });

    const events: ClaimEvent[] = result.data.map((e) => {
      const parsed = (e.parsedJson ?? {}) as Record<string, unknown>;
      return {
        txDigest: e.id.txDigest,
        eventSeq: e.id.eventSeq,
        campaignId: String(parsed.campaign_id ?? ''),
        claimer: String(parsed.claimer ?? ''),
        amount: String(parsed.amount ?? '0'),
        timestampMs: e.timestampMs ?? '0',
      };
    });

    return {
      events,
      nextCursor: result.nextCursor ?? null,
      hasMore: result.hasNextPage,
      polledAt,
    };
  } catch (err) {
    return {
      events: [],
      nextCursor: null,
      hasMore: false,
      polledAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Detect anomalies in a claim event window.
 * Checks volume spikes and rapid pool drain.
 */
export function detectClaimAnomalies(
  events: ClaimEvent[],
  windowSecs = 300,
): ClaimAnomalyAlert[] {
  const alerts: ClaimAnomalyAlert[] = [];
  const now = Date.now();
  const windowMs = windowSecs * 1000;

  const recent = events.filter(
    (e) => now - Number(e.timestampMs) < windowMs,
  );

  // Volume spike: more than 100 claims in the window
  if (recent.length > 100) {
    alerts.push({
      type: 'volume_spike',
      severity: 'MEDIUM',
      detail: `${recent.length} claims in ${windowSecs}s window (threshold: 100)`,
      detectedAt: new Date().toISOString(),
    });
  }

  // Rapid drain: total amount claimed > 10% of MAX_SUPPLY in window
  const totalClaimed = recent.reduce((acc, e) => acc + Number(e.amount), 0);
  const tenPctMaxSupply = Number(SUI_CONSTANTS.MAX_SUPPLY) * 0.1;
  if (totalClaimed > tenPctMaxSupply) {
    alerts.push({
      type: 'rapid_drain',
      severity: 'HIGH',
      detail: `${totalClaimed} base units claimed in ${windowSecs}s (>10% of MAX_SUPPLY)`,
      detectedAt: new Date().toISOString(),
    });
  }

  return alerts;
}
