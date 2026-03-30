/**
 * POST /api/erc3643/admin/mint
 * Mint AXUSD tokens to a recipient address.
 *
 * Required role: MINTER_ROLE
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY)
 *
 * The caller identity is derived server-side from DEPLOYER_PRIVATE_KEY,
 * not from the request body, to prevent spoofing. DB-backed role check
 * verifies the deployer holds MINTER_ROLE in admin_roles table.
 *
 * For amounts < 10,000 AXUSD: executes directly via deployer EOA.
 * For amounts >= 10,000 AXUSD: creates and proposes a real Safe transaction
 * via @safe-global/protocol-kit + api-kit to the Governance Safe (3-of-5).
 * The proposal is immediately visible at app.safe.global for signing.
 *
 * Body: { toAddress: string, amountAxusd: string, reason?: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';
import { AdminRoleService } from '../../../../lib/services/AdminRoleService';
import { validateAdminKey } from '../../../../src/config/adminRoles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!validateAdminKey(req as unknown as { headers: Record<string, string | string[] | undefined> })) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin key' });
  }

  const { toAddress, amountAxusd, reason } = req.body ?? {};

  if (!toAddress || typeof toAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
    return res.status(400).json({ error: 'Valid toAddress required' });
  }
  if (!amountAxusd || isNaN(parseFloat(amountAxusd)) || parseFloat(amountAxusd) <= 0) {
    return res.status(400).json({ error: 'amountAxusd must be a positive number string' });
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) return res.status(500).json({ error: 'DEPLOYER_PRIVATE_KEY not configured' });

  const callerAddress = new ethers.Wallet(pk).address;

  const hasRole = await AdminRoleService.hasRoleDb(callerAddress, 'MINTER_ROLE');
  if (!hasRole) {
    return res.status(403).json({
      error: 'Forbidden — deployer does not hold MINTER_ROLE in the admin_roles registry',
      callerAddress,
      role: 'MINTER_ROLE',
    });
  }

  try {
    const result = await ERC3643Service.mintAXUSD({
      toAddress,
      amountAxusd,
      callerAddress,
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
