/**
 * POST /api/capinfra/settlement/instructions/[id]/execute
 *
 * Drives the AUTHORIZED → EXECUTING → SETTLED|FAILED transitions.
 * Adapter dispatch happens outside the DB tx; portfolio + ledger writes
 * commit atomically with the SETTLED transition.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../../lib/capinfra/auth';
import { executeInstruction } from '../../../../../../lib/capinfra/settlement';

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.TREASURY_OPERATOR,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const id = String(req.query.id ?? '');
      const correlationId =
        typeof req.body?.correlationId === 'string' ? req.body.correlationId : undefined;
      const result = await executeInstruction(id, getActor(req), correlationId);
      res.status(200).json({ instruction: result });
    },
  },
]);
