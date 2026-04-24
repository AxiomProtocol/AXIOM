import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { action, spvId, investorId, startDate, endDate, limit, offset } = req.query;
    const data = await pilotService.listAuditTrail({
      action: action as string | undefined,
      spvId: spvId as string | undefined,
      investorId: investorId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Pilot audit trail error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
