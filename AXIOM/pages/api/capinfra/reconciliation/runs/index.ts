/**
 * Capital Infrastructure — List reconciliation runs (3B.1b).
 * Admin-gated GET. Returns the most recent N runs for a given
 * adapter (defaults to STELLAR).
 */

import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../lib/capinfra/auth';
import { db } from '../../../../../server/db';
import { capReconciliationRuns } from '../../../../../shared/capInfraSchema';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

const ZQuery = z.object({
  adapterKey: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      const { adapterKey = 'STELLAR', limit } = ZQuery.parse(req.query);
      const rows = await db
        .select()
        .from(capReconciliationRuns)
        .where(eq(capReconciliationRuns.adapterKey, adapterKey))
        .orderBy(desc(capReconciliationRuns.createdAt))
        .limit(limit);
      res.status(200).json({ runs: rows, adapterKey, limit });
    },
  },
]);
