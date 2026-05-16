import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * WITHDRAWN 2026-05-13
 * Euler V4 AXUSD Vault (eAXUSD-4) — legacy deprecated vault, fully decommissioned.
 * Address retained for audit reference: 0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    deprecated: true,
    message: 'Euler integration withdrawn 2026-05-13. See /api/liquidity for current venues.',
    vaultAddress: '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059',
    withdrawnAt: '2026-05-13',
    status: 410,
  });
}
