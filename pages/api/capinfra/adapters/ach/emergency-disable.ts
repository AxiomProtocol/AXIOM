/**
 * POST /api/capinfra/adapters/ach/emergency-disable
 *
 * Immediately disable the ACH adapter (single-actor, instant effect).
 * Opens a 4-hour dual-actor acknowledgment window.
 *
 * Effect: sets adapter configJson.mode='DISABLED' and records an
 * ach.emergency_disable admin action. The forward-gate freeze in
 * policy.ts immediately blocks all new ACH authorizations.
 *
 * After calling this endpoint, the operator MUST call
 * /emergency-disable/acknowledge with a distinct second actor within 4h
 * to confirm the disable was intentional and restore mode-transition
 * capability (the unacknowledged disable will block all mode transitions).
 *
 * Body: { actor: string, reasonCode: string, correlationId?: string }
 */

import { z } from 'zod';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../lib/capinfra/auth';
import { loadAchConfig } from '../../../../../lib/capinfra/adapters/ach/config';
import { recordSingleActorAction } from '../../../../../lib/capinfra/adminActions';
import { findUnacknowledgedEmergencyDisable } from '../../../../../lib/capinfra/adapters/ach/expose';
import { db } from '../../../../../server/db';
import { capAdapters, capAdminActions } from '../../../../../shared/capInfraSchema';
import { eq } from 'drizzle-orm';
import { sendError, ValidationError } from '../../../../../lib/capinfra/errors';

const ZBody = z.object({
  reasonCode: z.string().min(1),
  correlationId: z.string().optional(),
});

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (_req, res) => {
      try {
        const unackedId = await findUnacknowledgedEmergencyDisable();
        if (!unackedId) {
          return res.status(200).json({ unacknowledgedDisableId: null, hasUnacknowledged: false });
        }
        const [row] = await db
          .select({ id: capAdminActions.id, actor: capAdminActions.primaryActor, createdAt: capAdminActions.createdAt })
          .from(capAdminActions)
          .where(eq(capAdminActions.id, unackedId))
          .limit(1);
        return res.status(200).json({
          unacknowledgedDisableId: unackedId,
          hasUnacknowledged: true,
          actor: row?.actor ?? null,
          createdAt: row?.createdAt ?? null,
          ackDeadline: row ? new Date(row.createdAt.getTime() + 4 * 60 * 60 * 1000).toISOString() : null,
        });
      } catch (err) {
        sendError(res, err);
      }
    },
  },
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      try {
        const body = ZBody.parse(req.body);
        const actor = getActor(req);
        const cfg = await loadAchConfig();
        if (!cfg) throw new ValidationError('no active ACH adapter row in cap_adapters');

        const prevMode = cfg.mode;

        // Update mode to DISABLED immediately.
        const newConfigJson = {
          ...(cfg as unknown as Record<string, unknown>),
          mode: 'DISABLED',
          configVersion: cfg.configVersion + 1,
        };
        delete (newConfigJson as Record<string, unknown>).rowId;
        delete (newConfigJson as Record<string, unknown>).rowName;
        delete (newConfigJson as Record<string, unknown>).isActive;

        await db
          .update(capAdapters)
          .set({ configJson: newConfigJson, updatedAt: new Date() })
          .where(eq(capAdapters.id, cfg.rowId));

        // Record single-actor emergency disable action (append-only).
        const actionId = await recordSingleActorAction({
          actionType: 'ach.emergency_disable',
          subjectType: 'ach_adapter',
          subjectId: cfg.rowId,
          actor,
          reasonCode: body.reasonCode,
          payload: {
            prevMode,
            newMode: 'DISABLED',
            configVersion: cfg.configVersion + 1,
            acknowledgeWithin: '4h',
            note: 'Emergency disable. A distinct second actor must acknowledge within 4h via /emergency-disable/acknowledge.',
          },
          correlationId: body.correlationId ?? null,
        });

        res.status(200).json({
          disabled: true,
          prevMode,
          adminActionId: actionId,
          ackDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          note: 'ACH adapter disabled. Acknowledge via POST /api/capinfra/adapters/ach/emergency-disable/acknowledge with a distinct second actor within 4h.',
        });
      } catch (err) {
        sendError(res, err);
      }
    },
  },
]);
