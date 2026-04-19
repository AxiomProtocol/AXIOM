/**
 * GET  /api/capinfra/adapters    — list catalog rows.
 * POST /api/capinfra/adapters    — register a new catalog row (admin).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../lib/capinfra/auth';
import {
  createAdapter,
  listAdapters,
  listRegisteredKinds,
} from '../../../../lib/capinfra/adapters/registry';
import { ZAdapterCreate } from '../../../../lib/capinfra/types';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.SUPPORT_READ_ONLY,
    handler: async (_req: NextApiRequest, res: NextApiResponse) => {
      const items = await listAdapters();
      res.status(200).json({ items, registeredKinds: listRegisteredKinds() });
    },
  },
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.SUPER_ADMIN,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const input = ZAdapterCreate.parse(req.body);
      const created = await createAdapter(input, getActor(req));
      res.status(201).json({ adapter: created });
    },
  },
]);
