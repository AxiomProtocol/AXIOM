import type { NextApiRequest, NextApiResponse } from 'next';
import { getPaperTrades, closePaperTrade, emergencyExitAll, checkPaperTradeInvalidations } from '../../../../server/services/mirdtExecution/engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    try {
      const result = await getPaperTrades(status, page, limit);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[execution/trades] GET Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const adminKey = process.env.ADMIN_SOLVENCY_KEY;
    if (!adminKey) return res.status(503).json({ error: 'Admin key not configured' });

    const provided = req.headers['x-admin-key'] as string;
    if (provided !== adminKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action, tradeId, exitPrice, exitReason } = req.body;

    try {
      if (action === 'close') {
        if (!tradeId || !exitPrice) {
          return res.status(400).json({ error: 'tradeId and exitPrice required' });
        }
        const result = await closePaperTrade(tradeId, parseFloat(exitPrice), exitReason || 'MANUAL');
        return res.status(result.success ? 200 : 400).json(result);
      }

      if (action === 'emergency-exit') {
        const result = await emergencyExitAll();
        return res.status(200).json(result);
      }

      if (action === 'check-invalidations') {
        const result = await checkPaperTradeInvalidations();
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Unknown action' });
    } catch (err: any) {
      console.error('[execution/trades] POST Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
