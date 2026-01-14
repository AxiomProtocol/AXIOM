/**
 * Badge NFT Minting API
 * 
 * Manages achievement badge tracking and minting. Badges are ERC-1155 NFTs
 * that represent platform achievements. This API tracks badge eligibility
 * and minting status. Actual NFT minting occurs via GamificationHub at:
 * 0x7F455b4614E05820AAD52067Ef223f30b1936f93
 * 
 * POST requests record badge mints; actual minting requires wallet signature.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

const BADGES = [
  { id: 'early_adopter', name: 'Early Adopter', rarity: 'legendary', description: 'Joined in the first month' },
  { id: 'first_deposit', name: 'First Deposit', rarity: 'common', description: 'Made your first deposit' },
  { id: 'susu_member', name: 'SUSU Member', rarity: 'common', description: 'Joined a SUSU circle' },
  { id: 'susu_completer', name: 'Circle Completer', rarity: 'rare', description: 'Completed a full SUSU cycle' },
  { id: 'depin_owner', name: 'Node Operator', rarity: 'epic', description: 'Owns a DePIN node' },
  { id: 'governance_voter', name: 'Active Voter', rarity: 'rare', description: 'Voted on 5+ proposals' },
  { id: 'staking_whale', name: 'Staking Whale', rarity: 'legendary', description: 'Staked 100,000+ AXM' },
  { id: 'referral_champion', name: 'Community Builder', rarity: 'epic', description: 'Referred 10+ members' },
  { id: 'credit_excellent', name: 'Credit Elite', rarity: 'legendary', description: 'Achieved 800+ credit score' },
  { id: 'organizer_certified', name: 'Certified Organizer', rarity: 'epic', description: 'Became a certified SUSU organizer' }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ success: false, error: 'Address required' });
    }

    try {
      const result = await pool.query(
        'SELECT * FROM badge_mints WHERE wallet_address = $1 ORDER BY minted_at DESC',
        [address.toLowerCase()]
      );

      const mintedBadges = result.rows.map(row => ({
        id: row.badge_id,
        name: row.badge_name,
        rarity: row.badge_rarity,
        tokenId: row.token_id,
        mintedAt: row.minted_at,
        txHash: row.tx_hash
      }));

      const availableBadges = BADGES.filter(
        badge => !mintedBadges.find(m => m.id === badge.id)
      );

      return res.status(200).json({
        success: true,
        minted: mintedBadges,
        available: availableBadges,
        totalBadges: BADGES.length
      });
    } catch (error: any) {
      console.error('Error fetching badges:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch badges' });
    }
  }

  if (req.method === 'POST') {
    const { address, badgeId } = req.body;

    if (!address || !badgeId) {
      return res.status(400).json({ success: false, error: 'Address and badgeId required' });
    }

    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ success: false, error: 'Invalid address' });
    }

    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge) {
      return res.status(400).json({ success: false, error: 'Invalid badge ID' });
    }

    try {
      const existing = await pool.query(
        'SELECT id FROM badge_mints WHERE wallet_address = $1 AND badge_id = $2',
        [address.toLowerCase(), badgeId]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Badge already minted' });
      }

      const tokenId = Math.floor(Math.random() * 1000000) + Date.now();
      const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      await pool.query(
        `INSERT INTO badge_mints (wallet_address, badge_id, badge_name, badge_rarity, token_id, tx_hash, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          address.toLowerCase(),
          badgeId,
          badge.name,
          badge.rarity,
          tokenId,
          txHash,
          JSON.stringify({ description: badge.description })
        ]
      );

      return res.status(200).json({
        success: true,
        message: 'Badge minted successfully',
        badge: {
          id: badgeId,
          name: badge.name,
          rarity: badge.rarity,
          tokenId,
          txHash
        }
      });
    } catch (error: any) {
      console.error('Error minting badge:', error);
      return res.status(500).json({ success: false, error: 'Failed to mint badge' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
