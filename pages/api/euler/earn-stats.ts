import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * WITHDRAWN 2026-05-13
 * Euler Earn AXUSD Vault (earnAXUSD) — all positions withdrawn, balance confirmed zero.
 * Address retained for audit reference: 0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    deprecated: true,
    message: 'Euler integration withdrawn 2026-05-13. See /api/liquidity for current venues.',
    vaultAddress: '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B',
    withdrawnAt: '2026-05-13',
    status: 410,
  });
}
