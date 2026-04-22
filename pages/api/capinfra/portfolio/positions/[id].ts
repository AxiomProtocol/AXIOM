/**
 * GET /api/capinfra/portfolio/positions/[id]
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../lib/capinfra/auth';
import { NotFoundError } from '../../../../../lib/capinfra/errors';
import { getPosition } from '../../../../../lib/capinfra/portfolio';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.SUPPORT_READ_ONLY,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const id = String(req.query.id ?? '');
      const pos = await getPosition(id);
      if (!pos) throw new NotFoundError(`position ${id} not found`);
      res.status(200).json({ position: pos });
    },
  },
]);
