import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { users, userOnboarding, referralRewardClaims } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { sessionId, circleId, walletAddress, email, mode, referralCode } = req.body;

    if (!email || !mode) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    let userId: number;

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      
      if (walletAddress && !existingUser[0].walletAddress) {
        await db.update(users)
          .set({ walletAddress })
          .where(eq(users.id, userId));
      }
    } else {
      const userReferralCode = generateReferralCode();
      
      const [newUser] = await db.insert(users).values({
        email: email.toLowerCase(),
        walletAddress: walletAddress || null,
        referralCode: userReferralCode,
        referralCount: 0,
        createdAt: new Date(),
      }).returning();
      
      userId = newUser.id;
    }

    await db.insert(userOnboarding).values({
      userId,
      onboardingData: {
        sessionId,
        completedAt: new Date().toISOString(),
        mode,
        circleId,
        walletAddress,
        referralCode: referralCode || null,
      },
      currentStep: 4,
      selectedPath: mode,
      isCompleted: true,
      completedAt: new Date(),
      createdAt: new Date(),
    });

    if (referralCode) {
      const referrer = await db.select()
        .from(users)
        .where(eq(users.referralCode, referralCode))
        .limit(1);
      
      if (referrer.length > 0 && referrer[0].walletAddress) {
        await db.insert(referralRewardClaims).values({
          referrerAddress: referrer[0].walletAddress,
          referredAddress: walletAddress || email,
          rewardAmount: '5',
          rewardType: 'signup_bonus',
          txHash: null,
          claimedAt: new Date(),
        });

        await db.update(users)
          .set({ referralCount: (referrer[0].referralCount || 0) + 1 })
          .where(eq(users.id, referrer[0].id));
      }
    }

    return res.json({
      success: true,
      message: 'Welcome to Axiom! You are now part of the community.',
      userId,
      circleId,
      mode,
      nextSteps: [
        'Complete your first contribution',
        'Explore the Wealth Dashboard',
        'Invite friends to earn rewards',
      ],
    });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return res.status(500).json({ success: false, error: 'Failed to complete onboarding' });
  }
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'AXM';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
