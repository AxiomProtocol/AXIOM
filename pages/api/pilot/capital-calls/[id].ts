import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Capital call id is required' });
  }

  try {
    if (req.method === 'GET') {
      const call = await pilotService.getCapitalCallById(id);
      if (!call) {
        return res.status(404).json({ success: false, error: 'Capital call not found' });
      }
      const funded = await pilotService.getCapitalCallFundedAmounts(id);
      return res.status(200).json({ success: true, data: { ...call, fundedDetails: funded } });
    }

    if (req.method === 'PUT') {
      const { status, fundedAmount } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: 'status is required' });
      }
      const data = await pilotService.updateCapitalCallStatus(id, status, fundedAmount);
      if (!data) {
        return res.status(404).json({ success: false, error: 'Capital call not found' });
      }
      return res.status(200).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot capital call error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
