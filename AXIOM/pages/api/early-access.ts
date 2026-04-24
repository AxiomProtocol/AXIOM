import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../lib/db';
import crypto from 'crypto';

function generateReferralCode(): string {
  return 'AXM-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

const MAX_REFERRAL_REWARD = 1000;
const REWARD_PER_REFERRAL = 25;
const BASE_REWARD = 100;
const MAX_SIGNUPS = 5000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { email, referredBy } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const existingCheck = await pool.query(
        'SELECT id, referral_code FROM early_access_signups WHERE email = $1',
        [normalizedEmail]
      );

      if (existingCheck.rows.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'You are already signed up!',
          referralCode: existingCheck.rows[0].referral_code,
          alreadyRegistered: true
        });
      }

      const countResult = await pool.query('SELECT COUNT(*) FROM early_access_signups');
      const currentCount = parseInt(countResult.rows[0].count, 10);
      const isEligibleForBaseReward = currentCount < MAX_SIGNUPS;

      const referralCode = generateReferralCode();
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;

      await pool.query(
        `INSERT INTO early_access_signups 
         (email, referral_code, referred_by, referral_count, referral_reward, base_reward, verified, ip_address, user_agent, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          normalizedEmail,
          referralCode,
          referredBy || null,
          0,
          0,
          isEligibleForBaseReward ? BASE_REWARD : 0,
          false,
          ipAddress,
          userAgent
        ]
      );

      if (referredBy) {
        const referrerResult = await pool.query(
          'SELECT id, referral_count, referral_reward FROM early_access_signups WHERE referral_code = $1',
          [referredBy]
        );

        if (referrerResult.rows.length > 0) {
          const referrer = referrerResult.rows[0];
          const newReferralCount = referrer.referral_count + 1;
          
          if (referrer.referral_reward < MAX_REFERRAL_REWARD) {
            const newReferralReward = Math.min(referrer.referral_reward + REWARD_PER_REFERRAL, MAX_REFERRAL_REWARD);
            await pool.query(
              'UPDATE early_access_signups SET referral_count = $1, referral_reward = $2, updated_at = NOW() WHERE id = $3',
              [newReferralCount, newReferralReward, referrer.id]
            );
          } else {
            await pool.query(
              'UPDATE early_access_signups SET referral_count = $1, updated_at = NOW() WHERE id = $2',
              [newReferralCount, referrer.id]
            );
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: isEligibleForBaseReward 
          ? 'Welcome! You are eligible for 100 AXM at TGE.'
          : 'Welcome! You have joined the Early Access list.',
        referralCode,
        baseReward: isEligibleForBaseReward ? BASE_REWARD : 0,
        referralCount: 0,
        referralReward: 0,
        position: currentCount + 1
      });

    } catch (error) {
      console.error('Early access signup error:', error);
      return res.status(500).json({ error: 'Failed to process signup. Please try again.' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { referralCode } = req.query;

      if (referralCode && typeof referralCode === 'string') {
        const result = await pool.query(
          'SELECT referral_count, referral_reward, base_reward, created_at FROM early_access_signups WHERE referral_code = $1',
          [referralCode]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Referral code not found' });
        }

        const signup = result.rows[0];
        return res.status(200).json({
          referralCount: signup.referral_count,
          referralReward: signup.referral_reward,
          baseReward: signup.base_reward,
          totalReward: signup.base_reward + signup.referral_reward,
          maxReferralReward: MAX_REFERRAL_REWARD,
          joinedAt: signup.created_at
        });
      }

      const countResult = await pool.query('SELECT COUNT(*) FROM early_access_signups');
      const totalSignups = parseInt(countResult.rows[0].count, 10);
      const spotsRemaining = Math.max(0, MAX_SIGNUPS - totalSignups);

      return res.status(200).json({
        totalSignups,
        spotsRemaining,
        maxSignups: MAX_SIGNUPS,
        baseReward: BASE_REWARD,
        referralReward: REWARD_PER_REFERRAL,
        maxReferralReward: MAX_REFERRAL_REWARD
      });

    } catch (error) {
      console.error('Early access fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch data' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
