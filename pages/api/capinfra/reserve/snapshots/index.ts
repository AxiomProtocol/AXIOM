import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../lib/capinfra/auth';
import { createSnapshot } from '../../../../../lib/capinfra/reserve/snapshot';
import { db } from '../../../../../server/db';
import { capReserveHoldingsSnapshots } from '../../../../../shared/capInfraSchema';
import { desc } from 'drizzle-orm';

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      const actor = getActor(req);
      const result = await createSnapshot(actor);
      res.status(201).json(result);
    },
  },
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    handler: async (_req, res) => {
      const items = await db
        .select()
        .from(capReserveHoldingsSnapshots)
        .orderBy(desc(capReserveHoldingsSnapshots.asOf), desc(capReserveHoldingsSnapshots.id))
        .limit(50);
      res.status(200).json({ items });
    },
  },
]);
