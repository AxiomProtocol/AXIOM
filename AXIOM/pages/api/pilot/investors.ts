import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const data = await pilotService.getAllInvestors();
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { name, email, phone, commitmentAmount, status, accreditationVerified, kycCompleted, notes, metadata } = req.body;
      if (!name || !email || !commitmentAmount) {
        return res.status(400).json({ success: false, error: 'name, email, and commitmentAmount are required' });
      }
      const data = await pilotService.createInvestor({
        name,
        email,
        phone,
        commitmentAmount,
        status,
        accreditationVerified,
        kycCompleted,
        notes,
        metadata,
      });
      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot investors error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
