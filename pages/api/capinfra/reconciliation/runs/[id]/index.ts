/**
 * Capital Infrastructure — Get a single reconciliation run (3B.1b).
 */

import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../../lib/capinfra/auth';
import { db } from '../../../../../../server/db';
import { capReconciliationRuns } from '../../../../../../shared/capInfraSchema';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '../../../../../../lib/capinfra/errors';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      const id = req.query.id as string;
      const [row] = await db
        .select()
        .from(capReconciliationRuns)
        .where(eq(capReconciliationRuns.id, id))
        .limit(1);
      if (!row) throw new NotFoundError(`reconciliation run ${id} not found`);
      res.status(200).json({ run: row });
    },
  },
]);
