/**
 * POST /api/erc3643/admin/freeze
 * Freeze or unfreeze an investor address in the ERC-3643 AXUSD token.
 *
 * Required role: OPERATOR_ROLE
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY)
 * Optional: callerAddress in body for role validation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';
import { validateAdminKey, hasRole } from '../../../../src/config/adminRoles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!validateAdminKey(req as unknown as { headers: Record<string, string | string[] | undefined> })) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin key' });
  }

  const { wallet, freeze, callerAddress } = req.body ?? {};

  if (!wallet || typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }
  if (typeof freeze !== 'boolean') {
    return res.status(400).json({ error: 'freeze boolean required' });
  }

  if (callerAddress) {
    if (!hasRole(callerAddress, 'OPERATOR_ROLE')) {
      return res.status(403).json({
        error: 'Forbidden — caller does not hold OPERATOR_ROLE',
        callerAddress,
        role: 'OPERATOR_ROLE',
        allowedHolders: ['DEPLOYER_EOA (0x8d7892CF...)'],
      });
    }
  }

  try {
    const result = await ERC3643Service.freezeAddress(wallet, freeze);
    return res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[freeze] Error:', e);
    return res.status(500).json({ error: e?.message ?? String(err) });
  }
}
