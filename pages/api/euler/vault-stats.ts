import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * WITHDRAWN 2026-05-13
 * Euler V4 AXUSD Vault (eAXUSD-4) — legacy deprecated vault, now also withdrawn.
 * Address retained for audit reference: 0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059
 * This endpoint now returns HTTP 410 Gone permanently.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: 'WITHDRAWN',
    message: 'Euler AXUSD Vault (eAXUSD-4, legacy) withdrawn 2026-05-13. All balances are zero.',
    vaultAddress: '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059',
    withdrawnAt: '2026-05-13',
    status: 410,
  });
}
