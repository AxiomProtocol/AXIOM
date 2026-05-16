import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * WITHDRAWN 2026-05-13
 * Euler Earn AXUSD Vault (earnAXUSD) — all positions withdrawn, balance confirmed zero.
 * Address retained for audit reference: 0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B
 * This endpoint now returns HTTP 410 Gone permanently.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: 'WITHDRAWN',
    message: 'Euler Earn AXUSD Vault (earnAXUSD) withdrawn 2026-05-13. All balances are zero.',
    vaultAddress: '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B',
    withdrawnAt: '2026-05-13',
    status: 410,
  });
}
