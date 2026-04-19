/**
 * POST /api/capinfra/market-data/ingest — append a price snapshot.
 *
 * Treasury-operator auth required. Returns:
 *   - 201 { status: 'ACCEPTED', snapshot, confidence, divergenceBps? }
 *   - 422 { status: 'REJECTED', reason, divergenceBps } when oracle
 *     divergence exceeds the asset's configured threshold.
 */

import { createRouter } from '../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../lib/capinfra/auth';
import { ZMarketIngest } from '../../../../lib/capinfra/types';
import { ingestPrice } from '../../../../lib/capinfra/marketData';

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.TREASURY_OPERATOR,
    handler: async (req, res) => {
      const input = ZMarketIngest.parse(req.body);
      const actor = getActor(req);
      const correlationId = (req.headers['x-correlation-id'] as string) || undefined;
      const result = await ingestPrice(
        {
          assetId: input.assetId,
          priceType: input.priceType,
          source: input.source,
          quoteCurrency: input.quoteCurrency,
          price: input.price,
          observedAt: new Date(input.observedAt),
          payloadJson: input.payloadJson,
        },
        actor,
        correlationId,
      );
      if (result.status === 'REJECTED') {
        res.status(422).json(result);
        return;
      }
      res.status(201).json(result);
    },
  },
]);
