/**
 * POST /api/capinfra/risk/collateral/disable
 *
 * Guardian disable path (Collateral Risk Policy §7). Forces an asset's
 * collateral_class to RED immediately, recording a dual-actor admin
 * action and emitting `collateral.guardian_disabled`. The endpoint is
 * not timelocked. Re-admission is not available through any inverse
 * endpoint — it must go through the audited policy publication flow.
 *
 * Auth: RISK_OPERATOR role. Distinct primary/secondary actors required.
 */

import { z } from 'zod';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../lib/capinfra/auth';
import { db } from '../../../../../server/db';
import { capAssets } from '../../../../../shared/capInfraSchema';
import { eq } from 'drizzle-orm';
import { recordDualActorAction } from '../../../../../lib/capinfra/adminActions';
import { emitAuditEventStrict } from '../../../../../lib/capinfra/audit';
import { NotFoundError, ValidationError } from '../../../../../lib/capinfra/errors';

const ZBody = z.object({
  assetId: z.string().min(1),
  reason: z.string().min(8).max(1000),
  primaryActor: z.string().min(1),
  secondaryActor: z.string().min(1),
  correlationId: z.string().optional(),
});

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      const parsed = ZBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
        return;
      }
      const { assetId, reason, primaryActor, secondaryActor, correlationId } = parsed.data;

      try {
        const result = await db.transaction(async (tx) => {
          const [existing] = await tx
            .select()
            .from(capAssets)
            .where(eq(capAssets.id, assetId))
            .limit(1);
          if (!existing) throw new NotFoundError(`asset ${assetId} not found`);

          const previousClass = existing.collateralClass;
          const ts = new Date().toISOString();
          const rationale =
            `[${ts}] Guardian disable by ${primaryActor} / witnessed by ${secondaryActor}: ${reason}`.slice(
              0,
              2000,
            );

          await tx
            .update(capAssets)
            .set({
              collateralClass: 'RED',
              collateralClassificationRationale: rationale,
              updatedAt: new Date(),
            })
            .where(eq(capAssets.id, assetId));

          // Dual-actor admin action — distinct identities enforced by
          // recordDualActorAction. Records an `admin.collateral.guardian_disable`
          // audit event in addition to the explicit collateral.guardian_disabled
          // event below so both subject-of-action ('asset') and admin-action
          // search surfaces find this row.
          const adminActionId = await recordDualActorAction(
            {
              actionType: 'collateral.guardian_disable',
              subjectType: 'asset',
              subjectId: assetId,
              primaryActor,
              secondaryActor,
              reasonCode: 'COLLATERAL_INTEGRITY_FAILED',
              payload: {
                previousClass,
                newClass: 'RED',
                reason,
              },
              correlationId: correlationId ?? null,
            },
            tx,
          );

          await emitAuditEventStrict(
            {
              eventType: 'collateral.guardian_disabled',
              aggregateType: 'asset',
              aggregateId: assetId,
              assetId,
              actor: primaryActor,
              correlationId,
              payloadJson: {
                adminActionId,
                primaryActor,
                secondaryActor,
                previousClass,
                newClass: 'RED',
                reason,
              },
            },
            tx,
          );

          return { previousClass, adminActionId, rationale };
        });

        res.status(200).json({
          ok: true,
          assetId,
          previousClass: result.previousClass,
          newClass: 'RED',
          adminActionId: result.adminActionId,
          rationale: result.rationale,
        });
      } catch (err) {
        if (err instanceof NotFoundError) {
          res.status(404).json({ error: err.message });
          return;
        }
        if (err instanceof ValidationError) {
          res.status(400).json({ error: err.message });
          return;
        }
        throw err;
      }
    },
  },
]);
