import type { NextApiRequest, NextApiResponse } from 'next';
import { getLatestPortfolioState, upsertPortfolioState } from '../../../../server/services/mirdtExecution/engine';

const VALID_POLICY_MODES = ['BOOTSTRAP', 'NORMAL', 'CAUTION', 'RESTRICTED', 'EMERGENCY'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const state = await getLatestPortfolioState();
      return res.status(200).json(state);
    } catch (err: any) {
      console.error('[execution/portfolio] GET Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        portfolioCapitalUsd,
        riskFractionBps,
        maxConcurrentTrades,
        maxPerAssetExposureBps,
        drawdownBrakeBps,
        systemVolatilityTier,
        policyMode,
        globalSizeMultiplier,
      } = req.body;

      const errors: string[] = [];

      if (portfolioCapitalUsd == null || portfolioCapitalUsd <= 0) {
        errors.push('portfolioCapitalUsd must be > 0');
      }
      if (riskFractionBps == null || riskFractionBps < 25 || riskFractionBps > 100) {
        errors.push('riskFractionBps must be between 25 and 100');
      }
      if (maxConcurrentTrades == null || maxConcurrentTrades < 1 || maxConcurrentTrades > 20) {
        errors.push('maxConcurrentTrades must be between 1 and 20');
      }
      if (drawdownBrakeBps == null || drawdownBrakeBps < 100 || drawdownBrakeBps > 2000) {
        errors.push('drawdownBrakeBps must be between 100 and 2000');
      }
      if (globalSizeMultiplier == null || globalSizeMultiplier < 0.1 || globalSizeMultiplier > 5.0) {
        errors.push('globalSizeMultiplier must be between 0.1 and 5.0');
      }
      if (!policyMode || !VALID_POLICY_MODES.includes(policyMode)) {
        errors.push(`policyMode must be one of: ${VALID_POLICY_MODES.join(', ')}`);
      }

      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const id = await upsertPortfolioState({
        portfolioCapitalUsd,
        riskFractionBps,
        maxConcurrentTrades,
        maxPerAssetExposureBps: maxPerAssetExposureBps ?? 2000,
        drawdownBrakeBps,
        systemVolatilityTier: systemVolatilityTier ?? 'NORMAL',
        policyMode,
        globalSizeMultiplier,
      });

      const saved = await getLatestPortfolioState();
      return res.status(200).json({ success: true, id, state: saved });
    } catch (err: any) {
      console.error('[execution/portfolio] POST Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
