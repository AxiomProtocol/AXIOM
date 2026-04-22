import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { spvId } = req.query;
      const data = await pilotService.listCapitalCalls(spvId as string | undefined);
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { spvId, callNumber, totalAmount, purpose, dueDate, notes } = req.body;
      if (!callNumber || !totalAmount || !purpose || !dueDate) {
        return res.status(400).json({ success: false, error: 'callNumber, totalAmount, purpose, and dueDate are required' });
      }
      const data = await pilotService.createCapitalCall({
        spvId,
        callNumber,
        totalAmount,
        purpose,
        dueDate: new Date(dueDate),
        notes,
      });
      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot capital calls error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
