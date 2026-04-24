import type { NextApiRequest, NextApiResponse } from 'next';

// Fix 3: Removed stale DexService dependency (referenced undeployed EXCHANGE_HUB_V2 / ORACLE_ADAPTER).
// Limit orders are not yet implemented on EulerSwap. Return a clear, honest response.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Missing wallet address' });
  }

  // Fix 7: Basic address format validation
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid wallet address format' });
  }

  return res.status(200).json({
    orders: [],
    count: 0,
    address,
    available: false,
    note: 'Limit orders are not yet available. EulerSwap pools support spot swaps only. On-chain order indexing is planned for a future release.',
  });
}
