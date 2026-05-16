import type { NextApiRequest, NextApiResponse } from 'next';
import { EULER_EARN_VAULT_ADDRESS } from '../../../src/config/activeContracts.generated';

/**
 * WITHDRAWN 2026-05-13
 * Euler Earn AXUSD vault rebalance — permanently decommissioned.
 * Vault withdrawn and confirmed empty. This endpoint returns HTTP 410 Gone.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    deprecated: true,
    message: 'Euler integration withdrawn 2026-05-13. See /api/liquidity for current venues.',
    vaultAddress: EULER_EARN_VAULT_ADDRESS,
    withdrawnAt: '2026-05-13',
    status: 410,
  });
}
