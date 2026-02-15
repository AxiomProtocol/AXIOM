import type { NextApiRequest, NextApiResponse } from 'next';
import { authorizeDecision, openPaperTrade } from '../../../../server/services/mirdtExecution/engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (!adminKey) return res.status(503).json({ error: 'Admin key not configured' });

  const provided = req.headers['x-admin-key'] as string;
  if (provided !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { decisionId, action } = req.body;

  if (!decisionId || typeof decisionId !== 'string') {
    return res.status(400).json({ error: 'decisionId required' });
  }

  try {
    if (action === 'open') {
      const authResult = await authorizeDecision(decisionId);
      if (!authResult.success) {
        return res.status(400).json({ success: false, error: authResult.error });
      }
      const tradeResult = await openPaperTrade(decisionId);
      return res.status(200).json(tradeResult);
    }

    const result = await authorizeDecision(decisionId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    console.error('[execution/authorize] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
