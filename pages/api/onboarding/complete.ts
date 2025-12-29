import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { sessionId, hubId, groupId, walletAddress, email, mode, referralCode } = req.body;

    if (!email || !mode) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUserResult = await pool.query(
      'SELECT id, wallet_address, referral_code FROM users WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    );

    let userId: number;
    let userReferralCode: string;

    if (existingUserResult.rows.length > 0) {
      userId = existingUserResult.rows[0].id;
      userReferralCode = existingUserResult.rows[0].referral_code;

      if (walletAddress && !existingUserResult.rows[0].wallet_address) {
        await pool.query(
          'UPDATE users SET wallet_address = $1 WHERE id = $2',
          [walletAddress, userId]
        );
      }
    } else {
      userReferralCode = generateReferralCode();

      const insertResult = await pool.query(
        `INSERT INTO users (email, wallet_address, referral_code, referral_count, created_at)
         VALUES ($1, $2, $3, 0, NOW())
         RETURNING id`,
        [normalizedEmail, walletAddress || null, userReferralCode]
      );

      userId = insertResult.rows[0].id;
    }

    await pool.query(
      `INSERT INTO user_onboarding (user_id, onboarding_data, current_step, selected_path, is_completed, completed_at, created_at)
       VALUES ($1, $2, 4, $3, true, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET 
         onboarding_data = $2, current_step = 4, selected_path = $3, is_completed = true, completed_at = NOW()`,
      [
        userId,
        JSON.stringify({
          sessionId,
          completedAt: new Date().toISOString(),
          mode,
          hubId,
          groupId,
          walletAddress,
          referralCode: referralCode || null,
        }),
        mode,
      ]
    );

    if (groupId && groupId !== 'auto-match') {
      await pool.query(
        `INSERT INTO susu_group_members (group_id, wallet_address, role, joined_at)
         VALUES ($1, $2, 'member', NOW())
         ON CONFLICT DO NOTHING`,
        [groupId, walletAddress || normalizedEmail]
      );

      await pool.query(
        'UPDATE susu_purpose_groups SET member_count = member_count + 1 WHERE id = $1',
        [groupId]
      );
    }

    if (referralCode) {
      const referrerResult = await pool.query(
        'SELECT id, wallet_address, referral_count FROM users WHERE referral_code = $1 LIMIT 1',
        [referralCode]
      );

      if (referrerResult.rows.length > 0) {
        const referrer = referrerResult.rows[0];

        await pool.query(
          `INSERT INTO referral_reward_claims (referrer_address, referred_address, reward_amount, reward_type, claimed_at)
           VALUES ($1, $2, '5', 'signup_bonus', NOW())`,
          [referrer.wallet_address || `user:${referrer.id}`, walletAddress || normalizedEmail]
        );

        await pool.query(
          'UPDATE users SET referral_count = $1 WHERE id = $2',
          [(referrer.referral_count || 0) + 1, referrer.id]
        );
      }
    }

    return res.json({
      success: true,
      message: 'Welcome to Axiom! You are now part of the community.',
      userId,
      hubId,
      groupId,
      mode,
      referralCode: userReferralCode,
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
