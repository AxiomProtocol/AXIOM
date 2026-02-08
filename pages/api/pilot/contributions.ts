import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { investorId, spvId } = req.query;
      const data = await pilotService.listContributions({
        investorId: investorId as string | undefined,
        spvId: spvId as string | undefined,
      });
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { investorId, spvId, amount, capitalCallId, paymentMethod, referenceNumber, notes } = req.body;
      if (!investorId || !amount) {
        return res.status(400).json({ success: false, error: 'investorId and amount are required' });
      }
      const data = await pilotService.createContribution({
        investorId,
        spvId,
        amount,
        capitalCallId,
        paymentMethod,
        referenceNumber,
        notes,
      });
      return res.status(201).json({ success: true, data });
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Contribution id is required' });
      }
      const data = await pilotService.confirmContribution(id);
      if (!data) {
        return res.status(404).json({ success: false, error: 'Contribution not found' });
      }
      return res.status(200).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot contributions error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
