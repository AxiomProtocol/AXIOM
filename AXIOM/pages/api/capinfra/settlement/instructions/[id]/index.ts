/**
 * GET /api/capinfra/settlement/instructions/[id]
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../../lib/capinfra/auth';
import { NotFoundError } from '../../../../../../lib/capinfra/errors';
import { getInstruction } from '../../../../../../lib/capinfra/settlement';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.SUPPORT_READ_ONLY,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const id = String(req.query.id ?? '');
      const inst = await getInstruction(id);
      if (!inst) throw new NotFoundError(`instruction ${id} not found`);
      res.status(200).json({ instruction: inst });
    },
  },
]);
