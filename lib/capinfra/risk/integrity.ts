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

    return { previousClass, alreadyRed: false, rationale };
  });

  return {
    assetId,
    previousClass: result.previousClass,
    newClass: 'RED',
    rationale: result.rationale,
    alreadyRed: result.alreadyRed,
  };
}
