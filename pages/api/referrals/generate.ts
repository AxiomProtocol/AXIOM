import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }

    const existingUser = await db.select()
      .from(users)
      .where(eq(users.walletAddress, address))
      .limit(1);

    if (existingUser.length > 0 && existingUser[0].referralCode) {
      return res.json({
        success: true,
        referralCode: existingUser[0].referralCode,
        stats: {
          totalReferrals: existingUser[0].referralCount || 0,
          referralCode: existingUser[0].referralCode,
          referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://axiom.money'}/join?ref=${existingUser[0].referralCode}`,
        },
      });
    }

    const referralCode = generateReferralCode();

    if (existingUser.length > 0) {
      await db.update(users)
        .set({ referralCode })
        .where(eq(users.walletAddress, address));
        
      return res.json({
        success: true,
        referralCode,
        stats: {
          totalReferrals: existingUser[0].referralCount || 0,
          referralCode,
          referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://axiom.money'}/join?ref=${referralCode}`,
        },
      });
    }

    return res.json({
      success: true,
      referralCode,
      message: 'Please connect with an email first to save your referral code',
      stats: {
        totalReferrals: 0,
        referralCode,
        referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://axiom.money'}/join?ref=${referralCode}`,
      },
    });
  } catch (error) {
    console.error('Referral generate error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate referral code' });
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
