import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { investorId } = req.query;
      if (!investorId) {
        return res.status(400).json({ success: false, error: 'investorId query parameter is required' });
      }
      const data = await pilotService.getNotificationsForInvestor(investorId as string);
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { investorId, notificationType, subject, body, metadata } = req.body;
      if (!notificationType || !subject || !body) {
        return res.status(400).json({ success: false, error: 'notificationType, subject, and body are required' });
      }
      const data = await pilotService.sendNotification({
        investorId,
        notificationType,
        subject,
        body,
        metadata,
      });
      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot notifications error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
