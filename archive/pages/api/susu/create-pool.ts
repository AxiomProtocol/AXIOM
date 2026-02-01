import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      token,
      memberCount,
      contributionAmount,
      cycleDuration,
      startTime,
      randomizedOrder,
      openJoin,
      protocolFeeBps
    } = req.body;

    if (!token || !memberCount || !contributionAmount || !cycleDuration) {
      return res.status(400).json({ 
        error: 'Missing required fields: token, memberCount, contributionAmount, cycleDuration' 
      });
    }

    if (memberCount < 2 || memberCount > 50) {
      return res.status(400).json({ error: 'Member count must be between 2 and 50' });
    }

    const txData = {
      token,
      memberCount: parseInt(memberCount),
      contributionAmount: contributionAmount.toString(),
      cycleDuration: parseInt(cycleDuration),
      startTime: startTime ? parseInt(startTime) : Math.floor(Date.now() / 1000) + 86400,
      randomizedOrder: randomizedOrder || false,
      openJoin: openJoin !== false,
      protocolFeeBps: protocolFeeBps || 100
    };

    res.status(200).json({
      success: true,
      message: 'Pool creation data prepared. Sign the transaction in your wallet.',
      txData,
      contractAddress: '0x6C69D730327930B49A7997B7b5fb0865F30c95A5',
      functionName: 'createPool',
      abi: [
        "function createPool(address token, uint256 memberCount, uint256 contributionAmount, uint256 cycleDuration, uint256 startTime, bool randomizedOrder, bool openJoin, uint16 protocolFeeBps) external returns (uint256)"
      ]
    });
  } catch (error: any) {
    console.error('Error preparing pool creation:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to prepare pool creation'
    });
  }
}
