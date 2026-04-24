import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

const BADGE_DEFINITIONS = [
  { id: 'committed', name: 'Committed', requiredYears: 1, minAmount: 100, rarity: 'Common' },
  { id: 'dedicated', name: 'Dedicated', requiredYears: 2, minAmount: 100, rarity: 'Rare' },
  { id: 'believer', name: 'True Believer', requiredYears: 3, minAmount: 100, rarity: 'Epic' },
  { id: 'diamond_hands', name: 'Diamond Hands', requiredYears: 4, minAmount: 100, rarity: 'Legendary' },
  { id: 'whale_lock', name: 'Whale Locker', requiredYears: 4, minAmount: 10000, rarity: 'Legendary' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { wallet } = req.query;
      
      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet required' });
      }

      const result = await pool.query(
        `SELECT id, badge_type, badge_name, lock_duration_years, lock_amount, unlocked_at, display_on_profile
         FROM lock_challenge_badges WHERE wallet_address = $1`,
        [wallet.toLowerCase()]
      );

      return res.status(200).json({
        success: true,
        badges: result.rows.map((b: any) => ({
          id: b.id,
          badgeType: b.badge_type,
          badgeName: b.badge_name,
          lockDurationYears: b.lock_duration_years,
          lockAmount: parseFloat(b.lock_amount) || 0,
          unlockedAt: b.unlocked_at?.toISOString(),
          displayOnProfile: b.display_on_profile
        })),
        earnedBadgeIds: result.rows.map((b: any) => b.badge_type)
      });
    } catch (error) {
      console.error('Get badges error:', error);
      return res.status(200).json({ success: true, badges: [], earnedBadgeIds: [] });
    }
  }

  if (req.method === 'POST') {
    try {
      const { wallet, lockYears, lockAmount } = req.body;
      
      if (!wallet || !lockYears || !lockAmount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const walletLower = wallet.toLowerCase();
      const existingResult = await pool.query(
        `SELECT badge_type FROM lock_challenge_badges WHERE wallet_address = $1`,
        [walletLower]
      );

      const existingIds = new Set(existingResult.rows.map((b: any) => b.badge_type));
      
      const eligibleBadges = BADGE_DEFINITIONS.filter(badge => 
        lockYears >= badge.requiredYears && 
        lockAmount >= badge.minAmount && 
        !existingIds.has(badge.id)
      );

      const newBadges: string[] = [];
      for (const badge of eligibleBadges) {
        await pool.query(
          `INSERT INTO lock_challenge_badges (wallet_address, badge_type, badge_name, lock_duration_years, lock_amount, display_on_profile, metadata)
           VALUES ($1, $2, $3, $4, $5, true, $6)`,
          [walletLower, badge.id, badge.name, lockYears, lockAmount.toString(), JSON.stringify({ rarity: badge.rarity })]
        );
        newBadges.push(badge.id);
      }

      return res.status(200).json({
        success: true,
        newBadges,
        message: newBadges.length > 0 ? `Unlocked ${newBadges.length} new badge(s)!` : 'No new badges unlocked'
      });
    } catch (error) {
      console.error('Claim badges error:', error);
      return res.status(500).json({ success: false, error: 'Failed to claim badges' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
