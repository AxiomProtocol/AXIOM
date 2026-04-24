/**
 * POST /api/capinfra/settlement/instructions/[id]/authorize
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../../lib/capinfra/auth';
import { authorizeInstruction } from '../../../../../../lib/capinfra/settlement';

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.TREASURY_OPERATOR,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const id = String(req.query.id ?? '');
      const correlationId =
        typeof req.body?.correlationId === 'string' ? req.body.correlationId : undefined;
      const updated = await authorizeInstruction(id, getActor(req), correlationId);
      res.status(200).json({ instruction: updated });
    },
  },
]);
