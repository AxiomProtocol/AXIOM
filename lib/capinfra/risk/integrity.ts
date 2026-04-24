/**
 * Capital Infrastructure — Collateral Integrity module.
 *
 * Implements the integrity-failure path of the Collateral Risk Policy
 * (documents/policies/collateral-risk-policy.md §6). When any internal
 * monitor observes an integrity event for an asset, this module:
 *
 *   1. Forces the asset's `collateral_class` to RED.
 *   2. Persists the rationale on the asset row.
 *   3. Emits a `collateral.integrity_failed` audit event with the
 *      structured `kind` discriminator so downstream readers can join
 *      to the originating monitor.
 *
 * Re-admission to GREEN/YELLOW is NOT performed here — it must go
 * through the audited policy publication flow so every re-listing is
 * reviewed on the same surface as a brand-new admission (Collateral
 * Risk Policy §7).
 *
 * The policy evaluator sees the new RED class on its next call (the
 * asset row is read fresh per evaluation) and any subsequent BORROW
 * denies with `COLLATERAL_CLASS_RED`. The reason code on the integrity
 * event itself is `COLLATERAL_INTEGRITY_FAILED`, used by callers that
 * want the more specific "this was a runtime trip, not a static class".
 */

import { db } from '../../../server/db';
import { capAssets, capRiskDecisions } from '../../../shared/capInfraSchema';
import { eq } from 'drizzle-orm';
import { emitAuditEventStrict } from '../audit';
import { NotFoundError } from '../errors';
import { generateId } from '../ids';
import { emitNotification } from '../notifications';
import {
  pageOnCallForIntegrityFailure,
  type IntegrityPagerResult,
} from '../notifications/integrityPager';
import { POLICY_VERSION } from '../policy';

export type IntegrityFailureKind =
  | 'oracle_stale'
  | 'reserve_attestation_failed'
  | 'redemption_failed'
  | 'issuer_event'
  | 'bridge_event';

export interface RecordIntegrityFailureInput {
  assetId: string;
  kind: IntegrityFailureKind;
  detail: string;
  actor: string;
  correlationId?: string;
}

export interface RecordIntegrityFailureResult {
  assetId: string;
  previousClass: 'GREEN' | 'YELLOW' | 'RED';
  newClass: 'RED';
  rationale: string;
  alreadyRed: boolean;
}

const KIND_PREFIX: Record<IntegrityFailureKind, string> = {
  oracle_stale: 'Oracle staleness exceeded budget',
  reserve_attestation_failed: 'Reserve attestation failed',
  redemption_failed: 'Redemption failure observed against live market price',
  issuer_event: 'Issuer freeze / pause event observed',
  bridge_event: 'Bridge incident observed',
};

/**
 * In-process dedup window for operator notifications. A high-frequency
 * monitor (e.g. an oracle that ticks every few seconds against a stale
 * upstream) can call `recordIntegrityFailure` repeatedly between the
 * moment the asset flips RED and the moment an operator restores it.
 * The audit-event side is already edge-triggered (skipped when the
 * asset is already RED), but a re-trip after manual restoration could
 * still produce back-to-back rows. Dedup keys are `${assetId}:${kind}`
 * so distinct failure modes on the same asset still notify once each.
 *
 * The window intentionally lives in-process (not in the DB): correctness
 * does not depend on it — duplicates would be at worst noisy, never
 * incorrect — and a process restart MUST re-emit so a freshly-promoted
 * leader doesn't silently swallow the next failure.
 */
const NOTIFY_DEDUP_WINDOW_MS = 5 * 60 * 1000;
const recentNotifications = new Map<string, number>();

function dedupKey(assetId: string, kind: IntegrityFailureKind): string {
  return `${assetId}:${kind}`;
}

function isWithinDedupWindow(assetId: string, kind: IntegrityFailureKind): boolean {
  const last = recentNotifications.get(dedupKey(assetId, kind));
  return last !== undefined && Date.now() - last < NOTIFY_DEDUP_WINDOW_MS;
}

function markNotified(assetId: string, kind: IntegrityFailureKind): void {
  const now = Date.now();
  recentNotifications.set(dedupKey(assetId, kind), now);
  // Opportunistic GC so the map can't grow unboundedly across long-lived
  // processes that touch many distinct (asset, kind) pairs.
  if (recentNotifications.size > 1000) {
    for (const [k, ts] of recentNotifications) {
      if (now - ts >= NOTIFY_DEDUP_WINDOW_MS) recentNotifications.delete(k);
    }
  }
}

/** Test-only: clear the dedup window. Not exported from the public surface. */
export function __resetIntegrityNotificationDedupForTests(): void {
  recentNotifications.clear();
}

export async function recordIntegrityFailure(
  input: RecordIntegrityFailureInput,
): Promise<RecordIntegrityFailureResult> {
  const { assetId, kind, detail, actor, correlationId } = input;

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(capAssets)
      .where(eq(capAssets.id, assetId))
      .limit(1);
    if (!existing) throw new NotFoundError(`asset ${assetId} not found`);

    const previousClass = existing.collateralClass as 'GREEN' | 'YELLOW' | 'RED';
    const ts = new Date().toISOString();
    const rationale = `[${ts}] ${KIND_PREFIX[kind]}: ${detail}`.slice(0, 2000);

    // Edge-triggered: only write when this is a real state change. If
    // the asset is already RED, the system is in the desired state — we
    // skip the update, the risk-decision insert, and the audit emit so
    // a high-frequency caller (e.g. every stale price read) cannot spam
    // the audit log or the cap_risk_decisions surface. The function
    // still returns a clean result with `alreadyRed: true` so callers
    // can branch on it if they want to.
    if (previousClass === 'RED') {
      return { previousClass, alreadyRed: true, rationale };
    }

    await tx
      .update(capAssets)
      .set({
        collateralClass: 'RED',
        collateralClassificationRationale: rationale,
        updatedAt: new Date(),
      })
      .where(eq(capAssets.id, assetId));

    // Persist a HIGH-severity risk decision so this integrity event shows
    // up on the risk-decisions surface alongside policy denials. Reason
    // code is the canonical COLLATERAL_INTEGRITY_FAILED (also a member
    // of MUTABLE_STATE_DENY_REASONS in the policy evaluator).
    const decisionId = generateId('rd');
    await tx.insert(capRiskDecisions).values({
      id: decisionId,
      userId: null,
      assetId,
      instructionId: null,
      decision: 'DOWNGRADE_TO_RED',
      severity: 'HIGH',
      reasonCode: 'COLLATERAL_INTEGRITY_FAILED',
      policyVersion: POLICY_VERSION,
      payloadJson: {
        kind,
        detail,
        previousClass,
        newClass: 'RED',
        actor,
        rationale,
      },
    });

    await emitAuditEventStrict(
      {
        eventType: 'collateral.integrity_failed',
        aggregateType: 'asset',
        aggregateId: assetId,
        assetId,
        actor,
        correlationId,
        payloadJson: {
          kind,
          detail,
          previousClass,
          newClass: 'RED',
          reasonCode: 'COLLATERAL_INTEGRITY_FAILED',
          alreadyRed: false,
        },
      },
      tx,
    );

    return {
      previousClass,
      alreadyRed: false,
      rationale,
      symbol: existing.symbol,
      assetType: existing.assetType,
    };
  });

  // Best-effort operator notification, fired only on real edge-triggered
  // transitions and deduplicated per (asset, kind) within a short window
  // so a high-frequency stale-feed cannot spam the operator channel.
  // Mirrors the pattern used by ACH emergency-disable notifications:
  // channel='operator', high severity, body carries the structured
  // rationale so operators can react without opening the audit log.
  if (!result.alreadyRed && !isWithinDedupWindow(assetId, kind)) {
    // Page on-call FIRST so the paging result can be persisted alongside
    // the operator-channel notification row. The in-app/operator-console
    // row only wakes someone if they happen to be logged in;
    // `pageOnCallForIntegrityFailure` fans the same event out to email
    // (Resend) and Discord webhook so a real responder is paged on every
    // auto-freeze. The dispatcher is best-effort by contract — it never
    // throws, returning per-channel errors in its result — but we still
    // wrap it in try/catch as belt-and-braces so a defect in the pager
    // itself can never bubble back to the asset downgrade path. Any
    // unexpected throw is captured as a synthetic `pager:` error so the
    // operator console still surfaces "we did NOT actually wake on-call".
    let pagerResult: IntegrityPagerResult;
    try {
      pagerResult = await pageOnCallForIntegrityFailure({
        assetId,
        symbol: result.symbol ?? null,
        assetType: result.assetType ?? null,
        kind,
        detail,
        rationale: result.rationale,
        previousClass: result.previousClass,
        actor,
        correlationId: correlationId ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        '[capinfra.risk.integrity] pager dispatch threw unexpectedly',
        err,
      );
      pagerResult = {
        channelsPaged: [],
        errors: [`pager: ${msg}`],
        skipped: false,
      };
    }

    const notificationId = await emitNotification({
      userId: null,
      channel: 'operator',
      topic: 'collateral.integrity_failed',
      severity: 'HIGH',
      subject: `[op] Asset auto-frozen to RED: ${result.symbol ?? assetId} (${kind})`,
      bodyJson: {
        assetId,
        symbol: result.symbol ?? null,
        assetType: result.assetType ?? null,
        kind,
        detail,
        previousClass: result.previousClass,
        newClass: 'RED',
        rationale: result.rationale,
        actor,
        reasonCode: 'COLLATERAL_INTEGRITY_FAILED',
        // Paper trail of the on-call dispatch: which channels actually
        // woke a human, which 429'd, and whether nothing was configured
        // at all. Read by `lib/capinfra/risk/integrityAlerts.ts`'s
        // `shapeIntegrityAlert` and rendered as the per-row "paged:
        // email ✓, discord ✗ (429)" indicator on the operator panel.
        paged: {
          channels: pagerResult.channelsPaged,
          errors: pagerResult.errors,
          skipped: pagerResult.skipped,
        },
      },
      correlationId: correlationId ?? null,
    });
    // Only suppress future notifications within the dedup window if the
    // row was actually persisted. `emitNotification` is best-effort and
    // returns null on failure; in that case we deliberately leave the
    // dedup map untouched so the next integrity event re-tries the
    // notification instead of silently swallowing it for 5 minutes.
    if (notificationId !== null) {
      markNotified(assetId, kind);
    }
  }

  return {
    assetId,
    previousClass: result.previousClass,
    newClass: 'RED',
    rationale: result.rationale,
    alreadyRed: result.alreadyRed,
  };
}
