import type { NextApiRequest, NextApiResponse } from 'next';
import { getLatestDecision } from '../../../../server/services/mirdtExecution/engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { setupId } = req.query;
  if (!setupId || typeof setupId !== 'string') {
    return res.status(400).json({ error: 'setupId required' });
  }

  try {
    const decision = await getLatestDecision(setupId);
    if (!decision) return res.status(404).json({ error: 'No decision found' });
    return res.status(200).json(decision);
  } catch (err: any) {
    console.error('[execution/latest] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
