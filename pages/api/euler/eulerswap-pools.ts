import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * WITHDRAWN 2026-05-13
 * EulerSwap AXUSD/USDC and AXM/AXUSD pools — all liquidity withdrawn, balances confirmed zero.
 * Pool addresses retained for audit reference:
 *   AXUSD/USDC: 0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8
 *   AXM/AXUSD:  0x981763699D269E129a08E216b1AeC7caa376A8a8
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    deprecated: true,
    message: 'Euler integration withdrawn 2026-05-13. See /api/liquidity for current venues.',
    pools: [
      { id: 'axusd_usdc', address: '0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8', withdrawnAt: '2026-05-13' },
      { id: 'axusd_axm',  address: '0x981763699D269E129a08E216b1AeC7caa376A8a8', withdrawnAt: '2026-05-13' },
    ],
    status: 410,
  });
}
