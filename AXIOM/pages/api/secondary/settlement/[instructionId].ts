import type { NextApiRequest, NextApiResponse } from 'next';
import { getSecSession } from '../../../../server/services/secondary/auth';
import { confirmFunding, getSettlementStatus, createSettlementInstruction } from '../../../../server/services/secondary/settlement';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { instructionId } = req.query as { instructionId: string };

  if (req.method === 'GET') {
    const session = await getSecSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });

    try {
      const status = await getSettlementStatus(instructionId);
      if (!status) return res.status(404).json({ success: false, error: 'Settlement instruction not found' });
      return res.status(200).json({ success: true, settlement: status });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    const session = await getSecSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });

    const { action, txHash, amount } = req.body;

    if (action === 'fund') {
      if (!txHash || !amount) return res.status(400).json({ success: false, error: 'txHash and amount required for funding' });
      try {
        await confirmFunding(instructionId, txHash, amount);
        return res.status(200).json({ success: true, message: 'Funding confirmed, delivery in progress' });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
