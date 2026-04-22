/**
 * POST /api/capinfra/settlement/instructions — create instruction (idempotent).
 * GET  /api/capinfra/settlement/instructions  — list (admin).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../lib/capinfra/auth';
import { ZSettlementCreate, ZSettlementListQuery } from '../../../../../lib/capinfra/types';
import {
  createInstruction,
  listInstructions,
} from '../../../../../lib/capinfra/settlement';

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.TREASURY_OPERATOR,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const input = ZSettlementCreate.parse(req.body);
      const actor = getActor(req);
      const created = await createInstruction(input, actor);
      res.status(201).json({ instruction: created });
    },
  },
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.SUPPORT_READ_ONLY,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const q = ZSettlementListQuery.parse(req.query);
      const items = await listInstructions(q);
      res.status(200).json({ items });
    },
  },
]);
