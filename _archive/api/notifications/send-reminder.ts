import type { NextApiRequest, NextApiResponse } from 'next';
import { sendPaymentReminder, sendMilestoneNotification, sendGraduationNotification } from '../../../lib/server/emailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.body;

  try {
    if (type === 'payment') {
      const { to, memberName, groupName, amount, dueDate, reminderType } = req.body;
      
      if (!to || !memberName || !groupName || !amount || !dueDate || !reminderType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await sendPaymentReminder({
        to,
        memberName,
        groupName,
        amount: parseFloat(amount),
        dueDate,
        reminderType
      });

      return res.status(result.success ? 200 : 500).json(result);
    }

    if (type === 'milestone') {
      const { to, memberName, milestone, details } = req.body;
      
      if (!to || !memberName || !milestone) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await sendMilestoneNotification({
        to,
        memberName,
        milestone,
        details: details || ''
      });

      return res.status(result.success ? 200 : 500).json(result);
    }

    if (type === 'graduation') {
      const { to, memberName, groupName, newStage } = req.body;
      
      if (!to || !memberName || !groupName || !newStage) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await sendGraduationNotification({
        to,
        memberName,
        groupName,
        newStage
      });

      return res.status(result.success ? 200 : 500).json(result);
    }

    return res.status(400).json({ error: 'Invalid notification type' });
  } catch (error: any) {
    console.error('Notification error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to send notification' });
  }
}
