import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../../lib/capinfra/auth';
import { db } from '../../../../../../server/db';
import { capWebhookEvents } from '../../../../../../shared/capInfraSchema';
import {
  assertDistinctActors,
  recordDualActorAction,
} from '../../../../../../lib/capinfra/adminActions';
import { ValidationError, NotFoundError } from '../../../../../../lib/capinfra/errors';

const ZBody = z.object({
  toStatus: z.enum(['RECEIVED', 'PROCESSED', 'QUARANTINED', 'REJECTED']),
  secondaryActor: z.string().min(1).max(80),
  reasonCode: z.string().min(1).max(100),
  reasonText: z.string().max(200).optional(),
});

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      const id = req.query.id;
      if (typeof id !== 'string' || !id) throw new ValidationError('id is required');
      const body = ZBody.parse(req.body);
      const primaryActor = getActor(req);
      // Per clarification #5: distinct actors enforced.
      assertDistinctActors(primaryActor, body.secondaryActor);

      const updated = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(capWebhookEvents)
          .where(eq(capWebhookEvents.id, id))
          .limit(1);
        if (!existing) throw new NotFoundError(`webhook event ${id} not found`);
        // Per clarification #1: do NOT overwrite prior processing
        // metadata — only update status + reclassification fields.
        await tx
          .update(capWebhookEvents)
          .set({
            status: body.toStatus,
            reclassifiedBy: primaryActor,
            reclassifiedAt: new Date(),
            reclassificationReason: body.reasonText ?? body.reasonCode,
          })
          .where(eq(capWebhookEvents.id, id));
        await recordDualActorAction(
          {
            actionType: 'webhook.event.reclassify',
            subjectType: 'cap_webhook_event',
            subjectId: id,
            primaryActor,
            secondaryActor: body.secondaryActor,
            reasonCode: body.reasonCode,
            payload: {
              fromStatus: existing.status,
              toStatus: body.toStatus,
              reasonText: body.reasonText ?? null,
            },
          },
          tx,
        );
        const [after] = await tx
          .select()
          .from(capWebhookEvents)
          .where(eq(capWebhookEvents.id, id));
        return after;
      });
      res.status(200).json({ event: updated });
    },
  },
]);
