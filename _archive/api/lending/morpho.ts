import type { NextApiRequest, NextApiResponse } from 'next';
import { morphoMarketService } from '@/server/services/lending/MorphoMarketService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, marketId } = req.query;

    switch (action) {
      case 'proposed': {
        const markets = morphoMarketService.getProposedMarkets();
        return res.status(200).json({
          success: true,
          data: markets,
          observationMode: true,
          message: 'Market deployment blocked during observation window'
        });
      }

      case 'market': {
        if (!marketId || typeof marketId !== 'string') {
          return res.status(400).json({ error: 'Market ID required' });
        }
        const market = await morphoMarketService.getMarketInfo(marketId);
        if (!market) {
          return res.status(404).json({ error: 'Market not found' });
        }
        return res.status(200).json({ success: true, data: market });
      }

      case 'guide': {
        const guide = morphoMarketService.getDeploymentGuide();
        return res.status(200).json({ success: true, data: guide });
      }

      case 'status':
      default: {
        const status = morphoMarketService.getIntegrationStatus();
        const proposed = morphoMarketService.getProposedMarkets();
        return res.status(200).json({
          success: true,
          data: {
            integration: status,
            proposedMarkets: proposed.length,
            markets: proposed.map(m => ({
              name: m.name,
              status: m.status,
              lltv: m.lltv,
              estimatedAPY: m.estimatedAPY
            }))
          }
        });
      }
    }
  } catch (error) {
    console.error('Morpho API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
