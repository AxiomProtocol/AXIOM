import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * WITHDRAWN 2026-05-13
 * Euler EVK Open Market Vault (eAXUSD-6) — all positions withdrawn, balance confirmed zero.
 * Address retained for audit reference: 0xacdA87801f6409bB5157BA78aF1BD9631d6609B2
 * This endpoint now returns HTTP 410 Gone permanently.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: 'WITHDRAWN',
    message: 'Euler EVK Open Market Vault (eAXUSD-6) withdrawn 2026-05-13. All balances are zero.',
    vaultAddress: '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2',
    withdrawnAt: '2026-05-13',
    status: 410,
  });
}
