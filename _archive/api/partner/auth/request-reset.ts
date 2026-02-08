import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { sql } from 'drizzle-orm';
import { generatePasswordToken, sendPasswordResetEmail } from '../../../../server/services/partner-email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await db.execute(sql`
      SELECT id FROM partner_auth WHERE email = ${normalizedEmail}
    `);

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, message: 'If an account exists, a reset email has been sent' });
    }

    const resetToken = generatePasswordToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.execute(sql`
      UPDATE partner_auth 
      SET password_reset_token = ${resetToken}, 
          password_reset_expires = ${tokenExpires.toISOString()}::timestamp,
          updated_at = NOW()
      WHERE email = ${normalizedEmail}
    `);

    const dealResult = await db.execute(sql`
      SELECT name FROM partner_deal_submissions 
      WHERE LOWER(email) = ${normalizedEmail} 
      ORDER BY created_at DESC LIMIT 1
    `);

    const name = (dealResult.rows[0] as Record<string, string> | undefined)?.name || 'Partner';

    try {
      await sendPasswordResetEmail(normalizedEmail, name, resetToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }

    return res.status(200).json({ success: true, message: 'If an account exists, a reset email has been sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ error: 'Failed to process reset request' });
  }
}
