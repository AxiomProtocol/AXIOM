/**
 * POST /api/erc3643/admin/platform
 * Whitelist a platform contract address in the ERC-3643 LendingPlatformModule.
 *
 * Required role: COMPLIANCE_ROLE
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

  const { contractAddress, platformName, callerAddress } = req.body ?? {};

  if (!contractAddress || typeof contractAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    return res.status(400).json({ error: 'Valid contract address required' });
  }
  if (!platformName || typeof platformName !== 'string') {
    return res.status(400).json({ error: 'Platform name required' });
  }

  if (callerAddress) {
    if (!hasRole(callerAddress, 'COMPLIANCE_ROLE')) {
      return res.status(403).json({
        error: 'Forbidden — caller does not hold COMPLIANCE_ROLE',
        callerAddress,
        role: 'COMPLIANCE_ROLE',
        allowedHolders: ['DEPLOYER_EOA (0x8d7892CF...)'],
      });
    }
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
