/**
 * POST /api/capinfra/portfolio/snapshots — create deterministic snapshot.
 * GET  /api/capinfra/portfolio/snapshots — list recent snapshots.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../lib/capinfra/auth';
import { ZSnapshotCreate } from '../../../../../lib/capinfra/types';
import {
  createSnapshot,
  listSnapshots,
} from '../../../../../lib/capinfra/portfolio';

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.TREASURY_OPERATOR,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const input = ZSnapshotCreate.parse(req.body ?? {});
      const result = await createSnapshot({
        asOf: input.asOf ? new Date(input.asOf) : undefined,
        notes: input.notes,
        actor: getActor(req),
      });
      res.status(201).json(result);
    },
  },
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.SUPPORT_READ_ONLY,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const items = await listSnapshots(limit);
      res.status(200).json({ items });
    },
  },
]);
