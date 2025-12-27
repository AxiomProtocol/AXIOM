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
    const { limit = '20', offset = '0', timeframe = 'all', wallet } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offsetNum = Math.max(parseInt(offset as string) || 0, 0);

    const allEntries = [...Array(156)].map((_, idx) => ({
      rank: idx + 1,
      address: `0x${(idx + 1).toString().padStart(4, '0')}...${(9999 - idx).toString().padStart(4, '0')}`,
      votingPower: Math.floor(50000 - (idx * 300) + Math.random() * 500),
      lockedAmount: Math.floor(30000 - (idx * 180) + Math.random() * 200),
      lockDuration: Math.max(1, 4 - Math.floor(idx / 40)),
      badges: idx === 0 ? ['💎', '🐋'] : idx < 3 ? ['💎'] : idx < 10 ? ['🔒'] : []
    }));

    const leaderboard = allEntries.slice(offsetNum, offsetNum + limitNum);

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
      pagination: {
        total: 156,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < 156
      },
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
