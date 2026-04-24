import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { sendCustomOperatorEmail } from '../../../../lib/email/operatorEmails';
import { isAdminWallet } from '../../../../lib/admin/config';
import { checkRateLimit } from '../../../../lib/admin/rateLimit';
import { logAdminAction } from '../../../../lib/admin/auditLog';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const adminWallet = req.headers['x-admin-wallet'] as string;
  if (!isAdminWallet(adminWallet)) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const rateLimit = checkRateLimit(adminWallet.toLowerCase());
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      message: 'Rate limit exceeded', 
      retryAfter: Math.ceil(rateLimit.resetIn / 1000) 
    });
  }

  const { operatorId, subject, message } = req.body;

  if (!operatorId || !subject || !message) {
    return res.status(400).json({ message: 'operatorId, subject, and message are required' });
  }

  if (subject.length > 200) {
    return res.status(400).json({ message: 'Subject too long (max 200 characters)' });
  }

  if (message.length > 5000) {
    return res.status(400).json({ message: 'Message too long (max 5000 characters)' });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT email, display_name FROM node_operators WHERE operator_id = $1',
        [operatorId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Operator not found' });
      }

      const { email, display_name } = result.rows[0];

      await sendCustomOperatorEmail(email, display_name, subject, message);

      await logAdminAction({
        adminWallet: adminWallet.toLowerCase(),
        action: 'OPERATOR_EMAIL_SENT',
        targetOperatorId: operatorId,
        details: { subject, to: email }
      });

      res.status(200).json({ 
        success: true, 
        message: 'Email sent successfully',
        operatorId,
        to: email
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
}
