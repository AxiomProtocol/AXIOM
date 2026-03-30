/**
 * POST /api/erc3643/admin/forced-transfer
 * Execute a forced transfer of AXUSD between addresses (compliance recovery).
 *
 * Required role: EMERGENCY_ROLE
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY)
 *
 * The caller identity is derived server-side from DEPLOYER_PRIVATE_KEY.
 * DB-backed role check enforces EMERGENCY_ROLE from admin_roles table.
 * All forced transfers are logged to admin_action_log.
 *
 * Body: { fromAddress: string, toAddress: string, amountAxusd: string, reason?: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { AdminRoleService } from '../../../../lib/services/AdminRoleService';
import { validateAdminKey } from '../../../../src/config/adminRoles';
import { db } from '../../../../server/db';
import { adminActionLog } from '../../../../shared/erc3643Schema';
import { ERC3643_CONTRACTS, AXUSD_3643_ABI } from '../../../../shared/contracts-3643';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!validateAdminKey(req as unknown as { headers: Record<string, string | string[] | undefined> })) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin key' });
  }

  const { fromAddress, toAddress, amountAxusd, reason } = req.body ?? {};

  if (!fromAddress || !/^0x[a-fA-F0-9]{40}$/.test(fromAddress)) {
    return res.status(400).json({ error: 'Valid fromAddress required' });
  }
  if (!toAddress || !/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
    return res.status(400).json({ error: 'Valid toAddress required' });
  }
  if (!amountAxusd || isNaN(parseFloat(amountAxusd)) || parseFloat(amountAxusd) <= 0) {
    return res.status(400).json({ error: 'amountAxusd must be a positive number' });
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) return res.status(500).json({ error: 'DEPLOYER_PRIVATE_KEY not configured' });

  const callerAddress = new ethers.Wallet(pk).address;

  const hasRole = await AdminRoleService.hasRoleDb(callerAddress, 'EMERGENCY_ROLE');
  if (!hasRole) {
    await db.insert(adminActionLog).values({
      actionType: 'forcedTransfer',
      callerAddress: callerAddress.toLowerCase(),
      targetAddress: fromAddress.toLowerCase(),
      amount: amountAxusd,
      role: 'EMERGENCY_ROLE',
      status: 'failed',
      errorMessage: 'Caller does not hold EMERGENCY_ROLE',
      metadata: JSON.stringify({ reason, toAddress }),
    });
    return res.status(403).json({
      error: 'Forbidden — caller does not hold EMERGENCY_ROLE in the admin_roles registry',
      callerAddress,
      role: 'EMERGENCY_ROLE',
      note: 'Forced transfer requires Governance Safe (3-of-5). EOA does not hold EMERGENCY_ROLE.',
    });
  }

  try {
    const rpcUrl = process.env.ALCHEMY_API_KEY
      ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      : 'https://arb1.arbitrum.io/rpc';

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(pk, provider);

    const token = new ethers.Contract(
      ERC3643_CONTRACTS.AXUSD_TOKEN,
      AXUSD_3643_ABI,
      signer
    );

    const amountWei = ethers.parseUnits(amountAxusd, 18);
    const tx = await token.forcedTransfer(fromAddress, toAddress, amountWei);
    await tx.wait();

    await db.insert(adminActionLog).values({
      actionType: 'forcedTransfer',
      callerAddress: callerAddress.toLowerCase(),
      targetAddress: fromAddress.toLowerCase(),
      amount: amountAxusd,
      txHash: tx.hash,
      role: 'EMERGENCY_ROLE',
      status: 'success',
      metadata: JSON.stringify({ reason, toAddress }),
    });

    return res.status(200).json({
      success: true,
      txHash: tx.hash,
      fromAddress,
      toAddress,
      amountAxusd,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[forced-transfer] Error:', e);

    await db.insert(adminActionLog).values({
      actionType: 'forcedTransfer',
      callerAddress: callerAddress.toLowerCase(),
      targetAddress: fromAddress.toLowerCase(),
      amount: amountAxusd,
      role: 'EMERGENCY_ROLE',
      status: 'failed',
      errorMessage: e?.message ?? String(err),
      metadata: JSON.stringify({ reason, toAddress }),
    });

    return res.status(500).json({ error: e?.message ?? String(err) });
  }
}
