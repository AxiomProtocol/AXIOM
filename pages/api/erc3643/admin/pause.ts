/**
 * POST /api/erc3643/admin/pause
 * Pause or unpause all pausable AXUSD and protocol contracts.
 *
 * Required role: EMERGENCY_ROLE
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY)
 *
 * The caller identity is derived server-side from DEPLOYER_PRIVATE_KEY.
 * DB-backed role check enforces EMERGENCY_ROLE from admin_roles table.
 * All pause/unpause actions are logged to admin_action_log.
 *
 * Body: { pause: boolean, contractTarget?: string, reason?: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { AdminRoleService } from '../../../../lib/services/AdminRoleService';
import { validateAdminKey } from '../../../../src/config/adminRoles';
import { db } from '../../../../server/db';
import { adminActionLog } from '../../../../shared/erc3643Schema';

const PAUSE_ABI = [
  'function pause() external',
  'function unpause() external',
  'function paused() view returns (bool)',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!validateAdminKey(req as unknown as { headers: Record<string, string | string[] | undefined> })) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin key' });
  }

  const { pause, contractTarget, reason } = req.body ?? {};

  if (typeof pause !== 'boolean') {
    return res.status(400).json({ error: 'pause must be boolean' });
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) return res.status(500).json({ error: 'DEPLOYER_PRIVATE_KEY not configured' });

  const callerAddress = new ethers.Wallet(pk).address;

  const hasRole = await AdminRoleService.hasRoleDb(callerAddress, 'EMERGENCY_ROLE');
  if (!hasRole) {
    await db.insert(adminActionLog).values({
      actionType: pause ? 'pause' : 'unpause',
      callerAddress: callerAddress.toLowerCase(),
      role: 'EMERGENCY_ROLE',
      status: 'failed',
      errorMessage: 'Caller does not hold EMERGENCY_ROLE',
      metadata: JSON.stringify({ reason }),
    });
    return res.status(403).json({
      error: 'Forbidden — caller does not hold EMERGENCY_ROLE in the admin_roles registry',
      callerAddress,
      role: 'EMERGENCY_ROLE',
      note: 'Emergency pause requires Governance Safe (3-of-5). This deployer EOA does not currently hold EMERGENCY_ROLE.',
    });
  }

  const rpcUrl = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(pk, provider);

  const { ERC3643_CONTRACTS } = await import('../../../../shared/contracts-3643');
  const targets = contractTarget
    ? [contractTarget]
    : [ERC3643_CONTRACTS.AXUSD_TOKEN];

  const results: { contract: string; txHash?: string; error?: string }[] = [];

  for (const target of targets) {
    try {
      const contract = new ethers.Contract(target, PAUSE_ABI, signer);
      const tx = pause ? await contract.pause() : await contract.unpause();
      await tx.wait();

      await db.insert(adminActionLog).values({
        actionType: pause ? 'pause' : 'unpause',
        callerAddress: callerAddress.toLowerCase(),
        targetAddress: target.toLowerCase(),
        txHash: tx.hash,
        role: 'EMERGENCY_ROLE',
        status: 'success',
        metadata: JSON.stringify({ reason }),
      });

      results.push({ contract: target, txHash: tx.hash });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await db.insert(adminActionLog).values({
        actionType: pause ? 'pause' : 'unpause',
        callerAddress: callerAddress.toLowerCase(),
        targetAddress: target.toLowerCase(),
        role: 'EMERGENCY_ROLE',
        status: 'failed',
        errorMessage: errMsg,
        metadata: JSON.stringify({ reason }),
      });
      results.push({ contract: target, error: errMsg });
    }
  }

  return res.status(200).json({ success: true, pause, results });
}
