import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
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

    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      pendingSessions.set(sessionId, {
        email: email.toLowerCase(),
        referralCode: referralCode || undefined,
        startedAt: new Date().toISOString(),
      });
      
      return res.json({
        success: true,
        sessionId,
        isExisting: true,
        userId: existingUser[0].id,
        message: 'Welcome back! Connect your wallet to continue.',
      });
    }

    pendingSessions.set(sessionId, {
      email: email.toLowerCase(),
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
