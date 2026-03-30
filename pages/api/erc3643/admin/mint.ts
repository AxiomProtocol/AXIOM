/**
 * POST /api/erc3643/admin/mint
 * Mint AXUSD tokens to a recipient address.
 *
 * Required role: MINTER_ROLE
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY)
 *
 * For amounts < 10,000 AXUSD: executes directly via deployer EOA.
 * For amounts >= 10,000 AXUSD: returns a pending_safe response — the
 * transaction must be proposed and approved via app.safe.global by
 * MINTER_ROLE holders (3-of-5 Governance Safe).
 *
 * Body: { toAddress: string, amountAxusd: string, callerAddress?: string, reason?: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';
import { validateAdminKey, hasRole } from '../../../../src/config/adminRoles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!validateAdminKey(req as unknown as { headers: Record<string, string | string[] | undefined> })) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin key' });
  }

  const { toAddress, amountAxusd, callerAddress, reason } = req.body ?? {};

  if (!toAddress || typeof toAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
    return res.status(400).json({ error: 'Valid toAddress required' });
  }
  if (!amountAxusd || isNaN(parseFloat(amountAxusd)) || parseFloat(amountAxusd) <= 0) {
    return res.status(400).json({ error: 'amountAxusd must be a positive number string' });
  }

  if (callerAddress) {
    if (!hasRole(callerAddress, 'MINTER_ROLE')) {
      return res.status(403).json({
        error: 'Forbidden — caller does not hold MINTER_ROLE',
        callerAddress,
        role: 'MINTER_ROLE',
        allowedHolders: ['DEPLOYER_EOA (0x8d7892CF...)', 'GOVERNANCE_SAFE (0x2Bb2c2A7...)'],
      });
    }
  }

  try {
    const result = await ERC3643Service.mintAXUSD({
      toAddress,
      amountAxusd,
      callerAddress: callerAddress ?? 'api',
      reason,
    });

    const statusCode = result.status === 'pending_safe' ? 202 : 200;
    return res.status(statusCode).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[mint] Error:', e);
    return res.status(500).json({ error: e?.message ?? String(err) });
  }
}
