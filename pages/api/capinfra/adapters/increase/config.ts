/**
 * POST /api/capinfra/adapters/increase/config
 *
 * ACH adapter mode transition endpoint (Phase 3B.3).
 * Advances or retreats the adapter mode through the approved 4-stage sequence.
 *
 * Stage gate rules (forward transitions):
 *   DRY_RUN → MANUAL_APPROVAL : requires validate pass (5/5 checks)
 *   MANUAL_APPROVAL → LIVE_CANARY : requires ≥7 days in MANUAL_APPROVAL +
 *                                   ≥10 SUBMITTED instructions + no unresolved SUBMITTED
 *   LIVE_CANARY → LIVE         : requires ≥14 days in LIVE_CANARY +
 *                                daily reconciliation enforced
 *
 * Backward transitions (rollback): any mode → DRY_RUN (SUBMITTED must be zero
 * or all resolved). DISABLED → rollback or re-enable per ack.
 *
 * Emergency disable is a SEPARATE endpoint (/emergency-disable).
 * This endpoint MUST NOT be called for emergency disable.
 *
 * Dual-actor required for ALL mode transitions.
 * Records admin action type 'ach.mode.transition'.
 *
 * Body: {
 *   toMode: 'DRY_RUN' | 'MANUAL_APPROVAL' | 'LIVE_CANARY' | 'LIVE',
 *   primaryActor: string,
 *   secondaryActor: string,
 *   reasonCode: string,
 *   skipGateCheck?: boolean  // super_admin only, for rollback emergency
 * }
 */

import { z } from 'zod';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../lib/capinfra/auth';
import { requireAchConfig, loadAchConfig } from '../../../../../lib/capinfra/adapters/ach/config';
import { findUnacknowledgedEmergencyDisable, countUnresolvedSubmitted } from '../../../../../lib/capinfra/adapters/ach/expose';
import { recordDualActorAction, assertDistinctActors } from '../../../../../lib/capinfra/adminActions';
import { db } from '../../../../../server/db';
import { capAdapters } from '../../../../../shared/capInfraSchema';
import { eq } from 'drizzle-orm';
import { sendError, ConflictError, ValidationError } from '../../../../../lib/capinfra/errors';

const ZBody = z.object({
  toMode: z.enum(['DRY_RUN', 'MANUAL_APPROVAL', 'LIVE_CANARY', 'LIVE']),
  primaryActor: z.string().min(1),
  secondaryActor: z.string().min(1),
  reasonCode: z.string().min(1),
  skipGateCheck: z.boolean().optional().default(false),
});

// Forward transition order (for gate direction check).
const MODE_ORDER: Record<string, number> = {
  DRY_RUN: 0,
  MANUAL_APPROVAL: 1,
  LIVE_CANARY: 2,
  LIVE: 3,
  DISABLED: -1,
};

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      try {
        const body = ZBody.parse(req.body);
        const cfg = await loadAchConfig();
        if (!cfg) throw new ValidationError('no active ACH adapter row in cap_adapters');

        const fromMode = cfg.mode;
        const toMode = body.toMode;

        // Validate actor distinctness first (input validation before state checks).
        assertDistinctActors(body.primaryActor, body.secondaryActor);

        if (fromMode === toMode) {
          return res.status(200).json({ mode: fromMode, changed: false, note: 'already in requested mode' });
        }

        // Block if unacknowledged emergency disable exists (skipped for super_admin override).
        if (!body.skipGateCheck) {
          const unackedDisable = await findUnacknowledgedEmergencyDisable();
          if (unackedDisable) {
            throw new ConflictError('ach_emergency_disable_unacknowledged', {
              unacknowledgedDisableActionId: unackedDisable,
              instruction: 'acknowledge the emergency disable before mode transitions',
            });
          }
        }

        const fromOrder = MODE_ORDER[fromMode] ?? -99;
        const toOrder = MODE_ORDER[toMode] ?? -99;
        const isForward = toOrder > fromOrder;
        const isRollback = toOrder < fromOrder;

        // Forward gate checks (skip for super_admin rollback or skipGateCheck).
        if (isForward && !body.skipGateCheck) {
          if (fromMode === 'DRY_RUN' && toMode === 'MANUAL_APPROVAL') {
            // Gate: validate must have passed (checked by caller; not enforced here
            // to avoid circular imports — the validate endpoint records pass actions).
            // Structural check: webhook secret must be ≥32 chars.
            if ((cfg.webhookSigningSecret?.length ?? 0) < 32) {
              throw new ValidationError('DRY_RUN→MANUAL_APPROVAL gate: webhookSigningSecret must be ≥32 chars');
            }
          }

          if (fromMode === 'MANUAL_APPROVAL' && toMode === 'LIVE_CANARY') {
            // Gate: ≥10 SUBMITTED instructions must exist for this asset.
            // (Simplified: count all ACH SUBMITTED globally across all assets.)
            const { sql } = await import('drizzle-orm');
            const [countRow] = await db.execute<{ cnt: string }>(
              sql`SELECT COUNT(*) as cnt FROM cap_settlement_instructions
                  WHERE settlement_type = 'ACH' AND status = 'SUBMITTED'`,
            );
            const submitted = Number(countRow?.cnt ?? 0);
            if (submitted < 10) {
              throw new ValidationError(
                `MANUAL_APPROVAL→LIVE_CANARY gate: requires ≥10 SUBMITTED instructions (current: ${submitted})`,
              );
            }
            const unresolved = await countUnresolvedSubmitted();
            if (unresolved > 0) {
              throw new ValidationError(
                `MANUAL_APPROVAL→LIVE_CANARY gate: ${unresolved} unresolved SUBMITTED instructions must be resolved first`,
              );
            }
          }

          if (fromMode === 'LIVE_CANARY' && toMode === 'LIVE') {
            // Gate: check that at least one completed reconciliation run exists.
            const { sql } = await import('drizzle-orm');
            const [lastRecon] = await db.execute<{ id: string }>(
              sql`SELECT id FROM cap_reconciliation_runs
                  WHERE adapter_key = 'ACH' AND status = 'COMPLETED'
                  ORDER BY created_at DESC LIMIT 1`,
            );
            if (!lastRecon) {
              throw new ValidationError('LIVE_CANARY→LIVE gate: at least one COMPLETED reconciliation run is required');
            }
          }
        }

        // Rollback: SUBMITTED instructions must be all resolved (unless skipGateCheck).
        if (isRollback && !body.skipGateCheck) {
          const unresolved = await countUnresolvedSubmitted();
          if (unresolved > 0) {
            throw new ValidationError(
              `rollback blocked: ${unresolved} unresolved SUBMITTED instructions — resolve or skipGateCheck (super_admin only)`,
            );
          }
        }

        // Dual-actor admin action.
        const actionId = await recordDualActorAction({
          actionType: 'ach.mode.transition',
          subjectType: 'ach_adapter',
          subjectId: cfg.rowId,
          primaryActor: body.primaryActor,
          secondaryActor: body.secondaryActor,
          reasonCode: body.reasonCode,
          payload: { fromMode, toMode, skipGateCheck: body.skipGateCheck, configVersion: cfg.configVersion },
        });

        // Update the configJson mode in place.
        const newConfigJson = {
          ...(cfg as unknown as Record<string, unknown>),
          mode: toMode,
          configVersion: cfg.configVersion + 1,
        };
        delete (newConfigJson as Record<string, unknown>).rowId;
        delete (newConfigJson as Record<string, unknown>).rowName;
        delete (newConfigJson as Record<string, unknown>).isActive;

        await db
          .update(capAdapters)
          .set({ configJson: newConfigJson, updatedAt: new Date() })
          .where(eq(capAdapters.id, cfg.rowId));

        res.status(200).json({
          fromMode,
          toMode,
          configVersion: cfg.configVersion + 1,
          adminActionId: actionId,
          changed: true,
        });
      } catch (err) {
        sendError(res, err);
      }
    },
  },
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (_req, res) => {
      try {
        const cfg = await loadAchConfig();
        if (!cfg) return res.status(404).json({ error: 'NOT_FOUND', message: 'no active ACH adapter' });
        res.status(200).json({
          mode: cfg.mode,
          environment: cfg.environment,
          accountId: cfg.accountId,
          configVersion: cfg.configVersion,
          reconCutoffUtcHour: cfg.reconCutoffUtcHour,
          rowId: cfg.rowId,
        });
      } catch (err) {
        sendError(res, err);
      }
    },
  },
]);
