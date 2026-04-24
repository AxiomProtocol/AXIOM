/**
 * GET /api/capinfra/adapters/[id]
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../lib/capinfra/auth';
import { NotFoundError } from '../../../../lib/capinfra/errors';
import { getAdapterRow } from '../../../../lib/capinfra/adapters/registry';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.SUPPORT_READ_ONLY,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const id = String(req.query.id ?? '');
      const row = await getAdapterRow(id);
      if (!row) throw new NotFoundError(`adapter ${id} not found`);
      res.status(200).json({ adapter: row });
    },
  },
]);
