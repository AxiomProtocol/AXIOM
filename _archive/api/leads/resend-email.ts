import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { sendWorkbookWelcomeEmail } from '../../../lib/email/resend';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Find the lead
    const result = await pool.query(
      'SELECT email, first_name FROM workbook_leads WHERE email = $1 LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = result.rows[0];

    // Send welcome email
    await sendWorkbookWelcomeEmail(lead.email, lead.first_name || 'Friend');

    // Update last_email_sent_at
    await pool.query(
      'UPDATE workbook_leads SET last_email_sent_at = NOW() WHERE email = $1',
      [lead.email]
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully' 
    });

  } catch (error: any) {
    console.error('Resend email error:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error?.message
    });
  }
}
