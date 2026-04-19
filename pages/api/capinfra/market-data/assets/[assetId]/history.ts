/**
 * GET /api/capinfra/market-data/assets/:assetId/history — price history.
 *
 * Open read per spec §940-946. Returns up to `limit` (default 50, max
 * 500) recent snapshots ordered by observedAt desc.
 */

import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../../lib/capinfra/auth';
import { listPriceHistory } from '../../../../../../lib/capinfra/marketData';
import { ZMarketHistoryQuery } from '../../../../../../lib/capinfra/types';
import { ValidationError } from '../../../../../../lib/capinfra/errors';

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
      const q = ZMarketHistoryQuery.parse(req.query);
      const items = await listPriceHistory(assetId, q.priceType, q.limit ?? 50);
      res.status(200).json({ items });
    },
  },
]);
