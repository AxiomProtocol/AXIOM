/**
 * MIRDT - Public Setups Endpoint
 *
 * Provides a paginated list of market setups for the UI.
 * This is a read-only endpoint.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { MarketSetup } from '../../../lib/mirdt';

// This would be a real database in production.
const MOCK_DB: { setups: MarketSetup[] } = {
  setups: [
    // This would be populated by the generate-setups job.
    // For demonstration, I'll add one sample.
    {
      id: 'BTC-USD-20260206-TF01',
      asset: 'BTC-USD',
      assetClass: 'CRYPTO',
      generatedAt: new Date().toISOString(),
      horizonDays: 3,
      entryZone: { lowerBound: 39600, upperBound: 40400 },
      invalidationLevel: 38808,
      probabilisticOutcomes: { p5: 39188, p50: 42420, p95: 45248 },
      confidenceScore: 0.68,
      rationaleTrace: [
        'AUDIT: Signal initiated by daily trend-following model.',
        'FACTOR: 20-day moving average crossover detected.',
        'RISK_NOTE: Setup invalidates if price breaks below key structural level.',
      ],
    }
  ]
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // In a real app, you would implement pagination via query parameters.
  res.status(200).json({ setups: MOCK_DB.setups });
}