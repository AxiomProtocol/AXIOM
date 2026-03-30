/**
 * GET /api/governance/roles
 * Returns all active role holders from the admin_roles database table.
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY)
 *
 * POST /api/governance/roles
 * Grant or revoke a role.
 * Body: { action: 'grant'|'revoke', roleName, holderAddress, holderType?, grantedBy?, notes? }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { AdminRoleService } from '../../../lib/services/AdminRoleService';
import { validateAdminKey } from '../../../src/config/adminRoles';
import type { AdminRole } from '../../../src/config/adminRoles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req as unknown as { headers: Record<string, string | string[] | undefined> })) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin key' });
  }

  if (req.method === 'GET') {
    try {
      const roles = await AdminRoleService.getAllRoles();
      return res.status(200).json({
        success: true,
        count: roles.length,
        asOf: new Date().toISOString(),
        roles,
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      return res.status(500).json({ error: e?.message ?? String(err) });
    }
  }

  if (req.method === 'POST') {
    const { action, roleName, holderAddress, holderType, notes } = req.body ?? {};

    if (!action || !roleName || !holderAddress) {
      return res.status(400).json({ error: 'action, roleName, and holderAddress required' });
    }
    if (!['grant', 'revoke'].includes(action)) {
      return res.status(400).json({ error: 'action must be grant or revoke' });
    }

    const pk = process.env.DEPLOYER_PRIVATE_KEY;
    if (!pk) return res.status(500).json({ error: 'DEPLOYER_PRIVATE_KEY not configured' });

    const callerAddress = new ethers.Wallet(pk).address;

    const hasUpgrader = await AdminRoleService.hasRoleDb(callerAddress, 'UPGRADER_ROLE');
    if (!hasUpgrader) {
      return res.status(403).json({
        error: 'Forbidden — role management requires UPGRADER_ROLE',
        callerAddress,
        role: 'UPGRADER_ROLE',
      });
    }

    try {
      if (action === 'grant') {
        const record = await AdminRoleService.grantRole({
          roleName: roleName as AdminRole,
          holderAddress,
          holderType: holderType ?? 'EOA',
          grantedBy: callerAddress,
          notes,
        });
        return res.status(200).json({ success: true, action: 'granted', record });
      } else {
        await AdminRoleService.revokeRole({
          roleName: roleName as AdminRole,
          holderAddress,
          revokedBy: callerAddress,
        });
        return res.status(200).json({ success: true, action: 'revoked' });
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      return res.status(500).json({ error: e?.message ?? String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
