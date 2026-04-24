import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../lib/capinfra/auth';
import { ZAssetCreate, ZAssetListQuery } from '../../../../lib/capinfra/types';
import { createAsset, listAssets } from '../../../../lib/capinfra/assetRegistry';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    requireAuth: false,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const q = ZAssetListQuery.parse(req.query);
      const items = await listAssets(q);
      res.status(200).json({ items });
    },
  },
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.SUPER_ADMIN,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const input = ZAssetCreate.parse(req.body);
      const actor = getActor(req);
      const correlationId = (req.headers['x-correlation-id'] as string) || undefined;
      const created = await createAsset(input, actor, correlationId);
      res.status(201).json({ success: true, assetId: created.id, asset: created });
    },
  },
]);
