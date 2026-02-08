import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Investor id is required' });
  }

  try {
    if (req.method === 'GET') {
      const data = await pilotService.getInvestorById(id);
      if (!data) {
        return res.status(404).json({ success: false, error: 'Investor not found' });
      }
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'PUT') {
      const data = await pilotService.updateInvestor(id, req.body);
      if (!data) {
        return res.status(404).json({ success: false, error: 'Investor not found' });
      }
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'DELETE') {
      const data = await pilotService.deleteInvestor(id);
      if (!data) {
        return res.status(404).json({ success: false, error: 'Investor not found' });
      }
      return res.status(200).json({ success: true, data: { deleted: true, id } });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot investor error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
