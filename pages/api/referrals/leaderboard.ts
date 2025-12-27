import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const leaderboard = [
      { address: '0xDFf9e47eb007bF02e47477d577De9ffA99791528', count: 47, earned: '2,350' },
      { address: '0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008', count: 32, earned: '1,600' },
      { address: '0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F', count: 28, earned: '1,400' },
      { address: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046', count: 21, earned: '1,050' },
      { address: '0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94', count: 18, earned: '900' }
    ];

    return res.status(200).json({
      success: true,
      leaderboard
    });
  } catch (error: any) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch leaderboard'
    });
  }
}
