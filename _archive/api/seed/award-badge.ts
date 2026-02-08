import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

interface BadgeDefinition {
  type: string;
  name: string;
  minYears: number;
  minAmount: number;
  rarity: string;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { type: 'committed', name: 'Committed', minYears: 1, minAmount: 100, rarity: 'common' },
  { type: 'dedicated', name: 'Dedicated', minYears: 2, minAmount: 500, rarity: 'rare' },
  { type: 'true_believer', name: 'True Believer', minYears: 3, minAmount: 1000, rarity: 'epic' },
  { type: 'diamond_hands', name: 'Diamond Hands', minYears: 4, minAmount: 5000, rarity: 'legendary' },
  { type: 'whale_locker', name: 'Whale Locker', minYears: 2, minAmount: 50000, rarity: 'legendary' },
  { type: 'early_adopter', name: 'Early Adopter', minYears: 1, minAmount: 0, rarity: 'epic' }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, lockYears, lockAmount, txHash } = req.body;

    if (!wallet || !lockYears || lockAmount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const walletLower = wallet.toLowerCase();
    const years = Number(lockYears);
    const amount = Number(lockAmount);
    const awardedBadges: string[] = [];

    for (const badge of BADGE_DEFINITIONS) {
      if (years >= badge.minYears && amount >= badge.minAmount) {
        const existingResult = await pool.query(
          `SELECT id FROM lock_challenge_badges WHERE wallet_address = $1 AND badge_type = $2`,
          [walletLower, badge.type]
        );

        if (existingResult.rows.length === 0) {
          await pool.query(
            `INSERT INTO lock_challenge_badges (wallet_address, badge_type, badge_name, lock_duration_years, lock_amount, display_on_profile, metadata)
             VALUES ($1, $2, $3, $4, $5, true, $6)`,
            [walletLower, badge.type, badge.name, years, amount.toString(), JSON.stringify({ rarity: badge.rarity, txHash, awardedAt: new Date().toISOString() })]
          );
          awardedBadges.push(badge.name);
        }
      }
    }

    return res.status(200).json({
      success: true,
      awardedBadges,
      message: awardedBadges.length > 0 
        ? `Awarded ${awardedBadges.length} badge(s): ${awardedBadges.join(', ')}`
        : 'No new badges earned'
    });
  } catch (error: any) {
    console.error('Badge award error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to award badges' });
  }
}
