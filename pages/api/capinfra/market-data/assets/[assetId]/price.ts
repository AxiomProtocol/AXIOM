/**
 * GET /api/capinfra/market-data/assets/:assetId/price — latest price.
 *
 * Open read per spec §940-946. Returns the most recent price snapshot
 * for the asset, optionally filtered by `priceType` query param.
 */

import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../../lib/capinfra/auth';
import { getLatestPrice } from '../../../../../../lib/capinfra/marketData';
import { NotFoundError, ValidationError } from '../../../../../../lib/capinfra/errors';
import { ZPriceType } from '../../../../../../lib/capinfra/types';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    requireAuth: false,
    handler: async (req, res) => {
      const assetId = req.query.assetId;
      if (typeof assetId !== 'string' || assetId.length === 0) {
        throw new ValidationError('assetId required');
      }
      const rawPriceType = req.query.priceType;
      const priceType =
        typeof rawPriceType === 'string' ? ZPriceType.parse(rawPriceType) : undefined;
      const latest = await getLatestPrice(assetId, priceType);
      if (!latest) {
        throw new NotFoundError(`no price snapshots for asset ${assetId}`);
      }
      res.status(200).json({ latest });
    },
  },
]);
