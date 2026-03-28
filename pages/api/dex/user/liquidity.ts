import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'Missing wallet address' });
  }

  return res.status(200).json({
    positions: [],
    source: 'eulerswap',
    message: `EulerSwap LP positions for ${address} are tracked on-chain via the EVK vault. Connect your wallet to view your share.`,
  });
}
