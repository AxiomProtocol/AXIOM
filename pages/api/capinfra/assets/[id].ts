/**
 * GET/PATCH /api/capinfra/assets/:id — asset detail and update.
 *
 * GET is open (read-only registry surface). PATCH requires super-admin.
 * Per spec §940-946 there is no DELETE; deactivation is performed by
 * PATCH-ing `status` to ARCHIVED so audit history is preserved.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../lib/capinfra/auth';
import { ZAssetUpdate } from '../../../../lib/capinfra/types';
import { getAssetById, updateAsset } from '../../../../lib/capinfra/assetRegistry';
import { NotFoundError, ValidationError } from '../../../../lib/capinfra/errors';

function getId(req: NextApiRequest): string {
  const id = req.query.id;
  if (typeof id !== 'string' || id.length === 0) throw new ValidationError('asset id required');
  return id;
}

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    requireAuth: false,
    handler: async (req, res) => {
      const id = getId(req);
      const asset = await getAssetById(id);
      if (!asset) throw new NotFoundError(`asset ${id} not found`);
      res.status(200).json({ asset });
    },
  },
  {
    method: 'PATCH',
    requiredRole: CAP_INFRA_ROLES.SUPER_ADMIN,
    handler: async (req, res) => {
      const id = getId(req);
      const input = ZAssetUpdate.parse(req.body);
      const actor = getActor(req);
      const correlationId = (req.headers['x-correlation-id'] as string) || undefined;
      const updated = await updateAsset(id, input, actor, correlationId);
      res.status(200).json({ success: true, asset: updated });
    },
  },
]);
