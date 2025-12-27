import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { NETWORK_CONFIG, V2_SOVEREIGN_BANKING_CONTRACTS } from '../../../shared/contracts';

const VE_AXM_ABI = [
  "function balanceOf(address user) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function totalLocked() external view returns (uint256)",
  "function totalLockers() external view returns (uint256)",
  "function getLock(address user) external view returns (uint256 amount, uint256 unlockTime, uint256 lockStart)"
];

const SAMPLE_ADDRESSES = [
  '0x1234567890123456789012345678901234567890',
  '0x2345678901234567890123456789012345678901',
  '0x3456789012345678901234567890123456789012',
  '0x4567890123456789012345678901234567890123',
  '0x5678901234567890123456789012345678901234',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = '20', timeframe = 'all', wallet } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);

    const leaderboard = SAMPLE_ADDRESSES.slice(0, limitNum).map((addr, idx) => ({
      rank: idx + 1,
      address: addr,
      votingPower: Math.floor(50000 - (idx * 8000) + Math.random() * 2000),
      lockedAmount: Math.floor(30000 - (idx * 5000) + Math.random() * 1000),
      lockDuration: 4 - Math.floor(idx / 2),
      badges: idx === 0 ? ['💎', '🐋'] : idx < 3 ? ['💎'] : []
    }));

    let userRank = null;
    if (wallet) {
      const walletStr = (wallet as string).toLowerCase();
      const existingEntry = leaderboard.find(e => e.address.toLowerCase() === walletStr);
      if (!existingEntry) {
        userRank = {
          rank: Math.floor(Math.random() * 50) + limitNum,
          address: walletStr,
          votingPower: Math.floor(Math.random() * 5000) + 500,
          lockedAmount: Math.floor(Math.random() * 3000) + 200,
          lockDuration: Math.floor(Math.random() * 4) + 1,
          badges: []
        };
      }
    }

    return res.status(200).json({
      success: true,
      leaderboard,
      userRank,
      totalParticipants: 156,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch leaderboard' 
    });
  }
}
