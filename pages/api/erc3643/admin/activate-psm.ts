/**
 * POST /api/erc3643/admin/activate-psm
 *
 * Grants the AGENT_ROLE on the AXUSD token to the Canonical PSM via grantRole().
 * The AXUSD token uses OpenZeppelin AccessControl (not T-REX addAgent).
 *
 * AGENT_ROLE = keccak256("AGENT_ROLE") = 0xcab5a0bfe0b79d2c4b1c2e02599fa044d115b7511f9659307cb4276950967709
 * The deployer EOA holds DEFAULT_ADMIN_ROLE and can grant any role.
 *
 * Safe to call multiple times — returns 200 with status:'already_active' if PSM already has AGENT_ROLE.
 *
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ACTIVE_AXUSD, CANONICAL_PSM } from '../../../../src/config/activeContracts.generated';
import { validateAdminKey } from '../../../../src/config/adminRoles';
import { db } from '../../../../server/db';
import { adminActionLog } from '../../../../shared/erc3643Schema';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const AGENT_ROLE = '0xcab5a0bfe0b79d2c4b1c2e02599fa044d115b7511f9659307cb4276950967709';

const ACCESS_CONTROL_ABI = [
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function grantRole(bytes32 role, address account)',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!validateAdminKey(req as unknown as { headers: Record<string, string | string[] | undefined> })) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin key' });
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) return res.status(500).json({ error: 'DEPLOYER_PRIVATE_KEY not configured' });

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const wallet = new ethers.Wallet(pk, provider);

    const token = new ethers.Contract(ACTIVE_AXUSD, ACCESS_CONTROL_ABI, wallet);

    const alreadyAgent: boolean = await token.hasRole(AGENT_ROLE, CANONICAL_PSM).catch(() => false);
    if (alreadyAgent) {
      return res.status(200).json({
        success: true,
        data: {
          status: 'already_active',
          psmAddress: CANONICAL_PSM,
          axusdToken: ACTIVE_AXUSD,
          message: 'Canonical PSM already holds AGENT_ROLE on AXUSD. Mint and redeem are live.',
        },
      });
    }

    const tx = await token.grantRole(AGENT_ROLE, CANONICAL_PSM);
    const receipt = await tx.wait();

    await db.insert(adminActionLog).values({
      actionType: 'activatePsm',
      callerAddress: wallet.address,
      targetAddress: CANONICAL_PSM,
      txHash: receipt.hash ?? tx.hash,
      status: 'success',
      metadata: { axusdToken: ACTIVE_AXUSD, psmAddress: CANONICAL_PSM, agentRole: AGENT_ROLE },
    }).catch((logErr: unknown) => {
      console.error('[activate-psm] Log write failed (non-fatal):', logErr);
    });

    return res.status(200).json({
      success: true,
      data: {
        status: 'activated',
        txHash: receipt.hash ?? tx.hash,
        psmAddress: CANONICAL_PSM,
        axusdToken: ACTIVE_AXUSD,
        agentRole: AGENT_ROLE,
        callerAddress: wallet.address,
        message: 'Canonical PSM granted AGENT_ROLE on AXUSD. Mint and redeem are now live.',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[activate-psm] Error:', msg);
    return res.status(500).json({ error: msg });
  }
}
