/**
 * GET /api/capinfra/portfolio/positions — list positions.
 *
 * No write surface: positions mutate only through the settlement
 * lifecycle (`applySettlement` inside the SETTLED transaction).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../lib/capinfra/auth';
import { ZPortfolioPositionsQuery } from '../../../../../lib/capinfra/types';
import { listPositions } from '../../../../../lib/capinfra/portfolio';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.SUPPORT_READ_ONLY,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const q = ZPortfolioPositionsQuery.parse(req.query);
      const items = await listPositions(q);
      res.status(200).json({ items });
    },
  },
]);
