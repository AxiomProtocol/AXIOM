import type { NextApiRequest, NextApiResponse } from 'next';
import { getAXAUSystemState } from '../../../lib/services/AXAUContractService';

/**
 * GET /api/axau/buy-quote?axusdAmount=100
 *
 * Returns how much AXAU a user receives for a given AXUSD spend,
 * based on the current live Mint NAV from the NAVEngine.
 *
 * AXUSD is pegged 1:1 to USD, so 100 AXUSD = $100.
 * AXAU mint NAV is denominated in USD per AXAU.
 * axauOut = axusdAmount / mintNavPerToken
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rawAmount = req.query.axusdAmount;
  if (!rawAmount || typeof rawAmount !== 'string') {
    return res.status(400).json({ error: 'axusdAmount query parameter required' });
  }

  const axusdAmount = parseFloat(rawAmount);
  if (isNaN(axusdAmount) || axusdAmount <= 0) {
    return res.status(400).json({ error: 'axusdAmount must be a positive number' });
  }

  try {
    const state = await getAXAUSystemState();

    const mintNavPerToken = parseFloat(state.mintNavPerToken);
    if (!mintNavPerToken || mintNavPerToken <= 0) {
      return res.status(503).json({ error: 'Mint NAV unavailable — system may be paused' });
    }

    const axauOut = axusdAmount / mintNavPerToken;
    const xauUsdPrice = state.xauUsdPrice.replace(/,/g, '');

    return res.status(200).json({
      axusdAmount,
      axauOut: parseFloat(axauOut.toFixed(6)),
      axauOutFormatted: axauOut.toFixed(6),
      mintNavPerToken: state.mintNavPerToken,
      xauUsdPrice,
      coverageRatioPct: state.coverageRatioPct,
      mintPaused: state.mintPaused,
      isSolvent: state.isSolvent,
      fetchedAt: state.fetchedAt,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
