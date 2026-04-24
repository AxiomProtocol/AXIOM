/**
 * POST /api/erc3643/admin/platform
 * Whitelist a platform contract address in the ERC-3643 LendingPlatformModule.
 *
 * Required role: COMPLIANCE_ROLE
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY)
 *
 * The caller identity is derived server-side from DEPLOYER_PRIVATE_KEY,
 * not from the request body, to prevent spoofing. DB-backed role check
 * verifies the deployer address holds COMPLIANCE_ROLE in admin_roles table.
 *
 * Body: { contractAddress: string, platformName: string }
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

  const { contractAddress, platformName } = req.body ?? {};

  if (!contractAddress || typeof contractAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    return res.status(400).json({ error: 'Valid contract address required' });
  }
  if (!platformName || typeof platformName !== 'string') {
    return res.status(400).json({ error: 'Platform name required' });
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) return res.status(500).json({ error: 'DEPLOYER_PRIVATE_KEY not configured' });

  const callerAddress = new ethers.Wallet(pk).address;

  const hasRole = await AdminRoleService.hasRoleDb(callerAddress, 'COMPLIANCE_ROLE');
  if (!hasRole) {
    return res.status(403).json({
      error: 'Forbidden — deployer does not hold COMPLIANCE_ROLE in the admin_roles registry',
      callerAddress,
      role: 'COMPLIANCE_ROLE',
    });
  }

  try {
    const result = await ERC3643Service.whitelistPlatform(contractAddress, platformName);
    return res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[platform] Error:', e);
    return res.status(500).json({ error: e?.message ?? String(err) });
  }
}
