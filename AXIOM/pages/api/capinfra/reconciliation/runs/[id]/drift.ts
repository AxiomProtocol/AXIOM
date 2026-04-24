/**
 * Capital Infrastructure — Get drift rows for a reconciliation run (3B.1b).
 */

import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../../lib/capinfra/auth';
import { db } from '../../../../../../server/db';
import { capReconciliationDrift } from '../../../../../../shared/capInfraSchema';
import { eq, asc } from 'drizzle-orm';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      const runId = req.query.id as string;
      const rows = await db
        .select()
        .from(capReconciliationDrift)
        .where(eq(capReconciliationDrift.runId, runId))
        .orderBy(asc(capReconciliationDrift.createdAt));
      res.status(200).json({ runId, drift: rows, total: rows.length });
    },
  },
]);
