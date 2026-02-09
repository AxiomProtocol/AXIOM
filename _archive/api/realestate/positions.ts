import type { NextApiRequest, NextApiResponse } from 'next';

interface InvestorPosition {
  walletAddress: string;
  sharesBalance: string;
  axusdValue: string;
  pendingYield: string;
  depositTimestamp: number;
  lockExpiry: number | null;
  sharePrice: string;
}

interface PositionResponse {
  success: boolean;
  position?: InvestorPosition;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PositionResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ success: false, error: 'Wallet address required' });
  }

  try {
    const position: InvestorPosition = {
      walletAddress: address,
      sharesBalance: '0',
      axusdValue: '0',
      pendingYield: '0',
      depositTimestamp: 0,
      lockExpiry: null,
      sharePrice: '1.000000'
    };

    return res.status(200).json({ success: true, position });
  } catch (error) {
    console.error('Error fetching investor position:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch position' 
    });
  }
}
