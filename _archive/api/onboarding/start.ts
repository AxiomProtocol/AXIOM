import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { v4 as uuidv4 } from 'uuid';

const pendingSessions = new Map<string, { email: string; referralCode?: string; startedAt: string }>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, referralCode } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email required' });
    }

    const sessionId = uuidv4();
    const normalizedEmail = email.toLowerCase();

    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (result.rows.length > 0) {
      pendingSessions.set(sessionId, {
        email: normalizedEmail,
        referralCode: referralCode || undefined,
        startedAt: new Date().toISOString(),
      });
      
      return res.json({
        success: true,
        sessionId,
        isExisting: true,
        userId: result.rows[0].id,
        message: 'Welcome back! Connect your wallet to continue.',
      });
    }

    pendingSessions.set(sessionId, {
      email: normalizedEmail,
      referralCode: referralCode || undefined,
      startedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      sessionId,
      isExisting: false,
      message: 'Account started! Connect your wallet to continue.',
    });
  } catch (error) {
    console.error('Onboarding start error:', error);
    return res.status(500).json({ success: false, error: 'Failed to start onboarding' });
  }
}

export { pendingSessions };
