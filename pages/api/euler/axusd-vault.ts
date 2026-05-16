import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * WITHDRAWN 2026-05-13
 * Euler EVK Open Market Vault (eAXUSD-6) — all positions withdrawn, balance confirmed zero.
 * Address retained for audit reference: 0xacdA87801f6409bB5157BA78aF1BD9631d6609B2
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    deprecated: true,
    message: 'Euler integration withdrawn 2026-05-13. See /api/liquidity for current venues.',
    vaultAddress: '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2',
    withdrawnAt: '2026-05-13',
    status: 410,
  });
}
