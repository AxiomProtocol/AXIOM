/**
 * POST /api/capinfra/adapters/increase/emergency-disable/acknowledge
 *
 * Dual-actor acknowledgment of an emergency disable action (Phase 3B.3).
 * Must be called by a DISTINCT second actor within 4 hours of the disable.
 *
 * Effect: records an ach.emergency_disable.acknowledged dual-actor admin action,
 * which clears the forward-gate freeze in policy.ts. The adapter remains
 * DISABLED until a separate mode transition restores it.
 *
 * Body: {
 *   originalDisableActionId: string,  // aa_* id of the emergency disable
 *   primaryActor: string,             // the operator acknowledging (distinct from disable actor)
 *   secondaryActor: string,           // the original disable actor OR a third operator
 *   reasonCode: string,
 *   correlationId?: string
 * }
 */

import { z } from 'zod';
import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../../lib/capinfra/auth';
import { capAdminActions } from '../../../../../../shared/capInfraSchema';
import { db } from '../../../../../../server/db';
import { and, eq } from 'drizzle-orm';
import { recordDualActorAction } from '../../../../../../lib/capinfra/adminActions';
import { sendError, ValidationError, NotFoundError, ConflictError } from '../../../../../../lib/capinfra/errors';

const ZBody = z.object({
  originalDisableActionId: z.string().min(1),
  primaryActor: z.string().min(1),
  secondaryActor: z.string().min(1),
  reasonCode: z.string().min(1),
  correlationId: z.string().optional(),
});

const ACK_WINDOW_HOURS = 4;

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      try {
        const body = ZBody.parse(req.body);

        // Fetch the original disable action.
        const [disableAction] = await db
          .select()
          .from(capAdminActions)
          .where(
            and(
              eq(capAdminActions.id, body.originalDisableActionId),
              eq(capAdminActions.actionType, 'ach.emergency_disable'),
            ),
          )
          .limit(1);

        if (!disableAction) {
          throw new NotFoundError(
            `emergency disable action ${body.originalDisableActionId} not found`,
          );
        }

        // Verify within 4-hour acknowledgment window.
        const ageMs = Date.now() - disableAction.createdAt.getTime();
        const ageHours = ageMs / (60 * 60 * 1000);
        if (ageHours > ACK_WINDOW_HOURS) {
          throw new ValidationError(
            `acknowledgment window expired: ${ageHours.toFixed(1)}h > ${ACK_WINDOW_HOURS}h allowed. Raise an incident.`,
          );
        }

        // Check not already acknowledged.
        const [existing] = await db
          .select()
          .from(capAdminActions)
          .where(
            and(
              eq(capAdminActions.actionType, 'ach.emergency_disable.acknowledged'),
            ),
          )
          .limit(1);

        // More precise: check if any ack references this disable action.
        const allAcks = await db
          .select()
          .from(capAdminActions)
          .where(eq(capAdminActions.actionType, 'ach.emergency_disable.acknowledged'));
        const alreadyAcked = allAcks.some(
          (a) => (a.payloadJson as Record<string, unknown>)?.originalDisableActionId === body.originalDisableActionId,
        );
        if (alreadyAcked) {
          throw new ConflictError('emergency_disable_already_acknowledged', {
            originalDisableActionId: body.originalDisableActionId,
          });
        }

        const actionId = await recordDualActorAction({
          actionType: 'ach.emergency_disable.acknowledged',
          subjectType: 'ach_admin_action',
          subjectId: body.originalDisableActionId,
          primaryActor: body.primaryActor,
          secondaryActor: body.secondaryActor,
          reasonCode: body.reasonCode,
          payload: {
            originalDisableActionId: body.originalDisableActionId,
            ageHours: ageHours.toFixed(2),
            note: 'Forward-gate freeze cleared. Adapter remains DISABLED until mode transition restores it.',
          },
          correlationId: body.correlationId ?? null,
        });

        res.status(200).json({
          acknowledged: true,
          adminActionId: actionId,
          originalDisableActionId: body.originalDisableActionId,
          note: 'Forward-gate freeze cleared. Use POST /api/capinfra/adapters/increase/config to restore the adapter mode.',
        });
      } catch (err) {
        sendError(res, err);
      }
    },
  },
]);
