import type { NextApiRequest, NextApiResponse } from 'next';
import { authorizeDecision, openPaperTrade, closePaperTrade, emergencyExitAll, checkPaperTradeInvalidations } from '../../../../server/services/mirdtExecution/engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (!adminKey) return res.status(503).json({ error: 'Execution system not configured' });

  const { operation, decisionId, tradeId, exitPrice, exitReason } = req.body;

  try {
    switch (operation) {
      case 'authorize-open': {
        if (!decisionId) return res.status(400).json({ error: 'decisionId required' });
        const authResult = await authorizeDecision(decisionId);
        if (!authResult.success) return res.status(400).json(authResult);
        const tradeResult = await openPaperTrade(decisionId);
        return res.status(200).json(tradeResult);
      }

      case 'close-trade': {
        if (!tradeId || exitPrice === undefined) return res.status(400).json({ error: 'tradeId and exitPrice required' });
        const result = await closePaperTrade(tradeId, parseFloat(exitPrice), exitReason || 'MANUAL');
        return res.status(result.success ? 200 : 400).json(result);
      }

      case 'emergency-exit': {
        const result = await emergencyExitAll();
        return res.status(200).json({ success: true, ...result });
      }

      case 'check-trade-invalidations': {
        const result = await checkPaperTradeInvalidations();
        return res.status(200).json({ success: true, ...result });
      }

      default:
        return res.status(400).json({ error: `Unknown operation: ${operation}` });
    }
  } catch (err: any) {
    console.error('[execution/action] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
