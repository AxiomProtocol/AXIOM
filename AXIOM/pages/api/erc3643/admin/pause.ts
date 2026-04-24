/**
 * POST /api/erc3643/admin/pause
 * Propose a pause or unpause transaction to the Governance Safe (3-of-5).
 *
 * Required role: EMERGENCY_ROLE (held by GOVERNANCE_SAFE only)
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY)
 *
 * Because EMERGENCY_ROLE is only held by the Governance Safe (0x2Bb2...),
 * this endpoint cannot execute directly as a deployer EOA. Instead, it
 * creates a Safe transaction proposal via @safe-global/api-kit that is
 * immediately visible at app.safe.global for 3-of-5 co-signers to approve.
 *
 * The deployer EOA is the proposer of the Safe transaction — it initiates
 * the proposal but cannot unilaterally execute it.
 *
 * Body: { pause: boolean, contractTarget?: string, reason?: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { validateAdminKey, GOVERNANCE_SAFE } from '../../../../src/config/adminRoles';
import { AdminRoleService } from '../../../../lib/services/AdminRoleService';
import { db } from '../../../../server/db';
import { adminActionLog } from '../../../../shared/erc3643Schema';
import { ERC3643_CONTRACTS } from '../../../../shared/contracts-3643';

const PAUSE_INTERFACE = new ethers.Interface([
  'function pause()',
  'function unpause()',
]);

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

  const proposerAddress = new ethers.Wallet(pk).address;
  const target = contractTarget ?? ERC3643_CONTRACTS.AXUSD_TOKEN;

  const callerHasDirectEmergencyRole = await AdminRoleService.hasRoleDb(proposerAddress, 'EMERGENCY_ROLE');
  if (callerHasDirectEmergencyRole) {
    return res.status(403).json({
      error: 'EMERGENCY_ROLE should be held by the Governance Safe only. EOA caller detected as direct role holder — this is a configuration error.',
      proposerAddress,
    });
  }

  const calldata = pause
    ? PAUSE_INTERFACE.encodeFunctionData('pause')
    : PAUSE_INTERFACE.encodeFunctionData('unpause');

  try {
    const SafeApiKit = (await import('@safe-global/api-kit')).default;
    const ProtocolKit = (await import('@safe-global/protocol-kit')).default;

    const rpcUrl = process.env.ALCHEMY_API_KEY
      ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      : 'https://arb1.arbitrum.io/rpc';

    const apiKit = new SafeApiKit({ chainId: BigInt(42161) });

    const protocolKit = await ProtocolKit.init({
      provider: rpcUrl,
      signer: pk,
      safeAddress: GOVERNANCE_SAFE,
    });

    const safeTransaction = await protocolKit.createTransaction({
      transactions: [{
        to: target,
        value: '0',
        data: calldata,
      }],
    });

    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
    const senderSignature = await protocolKit.signHash(safeTxHash);

    await apiKit.proposeTransaction({
      safeAddress: GOVERNANCE_SAFE,
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress: proposerAddress,
      senderSignature: senderSignature.data,
    });

    await db.insert(adminActionLog).values({
      actionType: pause ? 'pause' : 'unpause',
      callerAddress: proposerAddress.toLowerCase(),
      targetAddress: target.toLowerCase(),
      role: 'EMERGENCY_ROLE',
      status: 'pending_safe',
      metadata: { reason, safeTxHash, safeAddress: GOVERNANCE_SAFE },
    });

    return res.status(200).json({
      success: true,
      status: 'pending_safe',
      message: `Safe proposal submitted for ${pause ? 'pause' : 'unpause'}. Requires 3-of-5 Safe signatures at app.safe.global`,
      safeTxHash,
      safeAddress: GOVERNANCE_SAFE,
      contractTarget: target,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[pause] Safe proposal error:', e);

    await db.insert(adminActionLog).values({
      actionType: pause ? 'pause' : 'unpause',
      callerAddress: proposerAddress.toLowerCase(),
      targetAddress: target.toLowerCase(),
      role: 'EMERGENCY_ROLE',
      status: 'failed',
      errorMessage: e?.message ?? String(err),
      metadata: { reason },
    });

    return res.status(500).json({ error: e?.message ?? 'Safe proposal failed' });
  }
}
