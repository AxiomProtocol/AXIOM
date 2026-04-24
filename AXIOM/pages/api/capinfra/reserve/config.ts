import { z } from 'zod';
import { createRouter } from '../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../lib/capinfra/auth';
import { db } from '../../../../server/db';
import {
  capReserveConfig,
  type NewCapReserveConfig,
} from '../../../../shared/capInfraSchema';
import { desc, eq, isNull, sql } from 'drizzle-orm';
import { generateId } from '../../../../lib/capinfra/ids';
import { getActiveSolvencyMode } from '../../../../lib/capinfra/reserve/solvencyMode';
import {
  assertDistinctActors,
  recordDualActorAction,
} from '../../../../lib/capinfra/adminActions';
import { ValidationError } from '../../../../lib/capinfra/errors';

const ZPost = z.object({
  mode: z.enum(['OPERATIONAL', 'CONSERVATIVE', 'MANUAL_INTERVENTION']),
  version: z.string().min(1).max(40),
  configJson: z.record(z.unknown()).optional().nullable(),
  secondaryActor: z.string().min(1).max(80),
  reasonCode: z.string().min(1).max(100),
});

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    handler: async (_req, res) => {
      const active = await getActiveSolvencyMode();
      const history = await db
        .select()
        .from(capReserveConfig)
        .orderBy(desc(capReserveConfig.effectiveAt), desc(capReserveConfig.id))
        .limit(50);
      res.status(200).json({ active, history });
    },
  },
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.SUPER_ADMIN,
    handler: async (req, res) => {
      const body = ZPost.parse(req.body);
      const primaryActor = getActor(req);
      // Per clarification #5: distinct actors. Validated up-front so
      // 422 surfaces clearly before we touch the DB.
      assertDistinctActors(primaryActor, body.secondaryActor);

      const result = await db.transaction(async (tx) => {
        const prior = await tx
          .select()
          .from(capReserveConfig)
          .where(isNull(capReserveConfig.supersededAt))
          .limit(50);
        if (prior.length > 0) {
          await tx
            .update(capReserveConfig)
            .set({ supersededAt: new Date() })
            .where(isNull(capReserveConfig.supersededAt));
        }

        const id = generateId('rcfg');
        const row: NewCapReserveConfig = {
          id,
          mode: body.mode,
          version: body.version,
          configJson: (body.configJson ?? null) as Record<string, unknown> | null,
          primaryActor,
          secondaryActor: body.secondaryActor,
          reasonCode: body.reasonCode,
        };
        try {
          await tx.insert(capReserveConfig).values(row);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/cap_reserve_config_version_uq/.test(msg)) {
            throw new ValidationError(`reserve config version "${body.version}" already exists`);
          }
          throw err;
        }
        await recordDualActorAction(
          {
            actionType: 'reserve.config.change',
            subjectType: 'cap_reserve_config',
            subjectId: id,
            primaryActor,
            secondaryActor: body.secondaryActor,
            reasonCode: body.reasonCode,
            payload: { mode: body.mode, version: body.version, supersededCount: prior.length },
          },
          tx,
        );
        const [inserted] = await tx
          .select()
          .from(capReserveConfig)
          .where(eq(capReserveConfig.id, id));
        return inserted;
      });
      res.status(200).json({ config: result });
    },
  },
]);
