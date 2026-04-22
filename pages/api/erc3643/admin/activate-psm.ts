/**
 * POST /api/erc3643/admin/activate-psm
 *
 * Grants MINTER_ROLE + AGENT_ROLE on the AXUSD token to the Canonical PSM.
 * AXUSD uses OpenZeppelin AccessControl — mint() requires MINTER_ROLE.
 *
 * Roles:
 *   MINTER_ROLE = keccak256("MINTER_ROLE") = 0x9f2df0fe...  ← gates mint() / burn()
 *   AGENT_ROLE  = keccak256("AGENT_ROLE")  = 0xcab5a0bf...  ← agent-level access
 *
 * The deployer EOA holds DEFAULT_ADMIN_ROLE and can grant both roles.
 * Idempotent — returns already_active if both roles are already held.
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

const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'; // keccak256("MINTER_ROLE")
const AGENT_ROLE  = '0xcab5a0bfe0b79d2c4b1c2e02599fa044d115b7511f9659307cb4276950967709'; // keccak256("AGENT_ROLE")

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

    const [hasMinter, hasAgent] = await Promise.all([
      token.hasRole(MINTER_ROLE, CANONICAL_PSM).catch(() => false),
      token.hasRole(AGENT_ROLE, CANONICAL_PSM).catch(() => false),
    ]);

    if (hasMinter && hasAgent) {
      return res.status(200).json({
        success: true,
        data: {
          status: 'already_active',
          psmAddress: CANONICAL_PSM,
          axusdToken: ACTIVE_AXUSD,
          minterRole: hasMinter,
          agentRole: hasAgent,
          message: 'Canonical PSM already holds MINTER_ROLE + AGENT_ROLE on AXUSD. Mint/redeem are live.',
        },
      });
    }

    const txHashes: string[] = [];

    if (!hasMinter) {
      const tx = await token.grantRole(MINTER_ROLE, CANONICAL_PSM);
      const receipt = await tx.wait();
      txHashes.push(receipt.hash ?? tx.hash);
      console.log('[activate-psm] Granted MINTER_ROLE tx:', receipt.hash ?? tx.hash);
    }

    if (!hasAgent) {
      const tx = await token.grantRole(AGENT_ROLE, CANONICAL_PSM);
      const receipt = await tx.wait();
      txHashes.push(receipt.hash ?? tx.hash);
      console.log('[activate-psm] Granted AGENT_ROLE tx:', receipt.hash ?? tx.hash);
    }

    await db.insert(adminActionLog).values({
      actionType: 'activatePsm',
      callerAddress: wallet.address,
      targetAddress: CANONICAL_PSM,
      txHash: txHashes[0] ?? 'multi',
      status: 'success',
      metadata: {
        axusdToken: ACTIVE_AXUSD,
        psmAddress: CANONICAL_PSM,
        minterRole: MINTER_ROLE,
        agentRole: AGENT_ROLE,
        txHashes,
        grantedMinter: !hasMinter,
        grantedAgent: !hasAgent,
      },
    }).catch((logErr: unknown) => {
      console.error('[activate-psm] Log write failed (non-fatal):', logErr);
    });

    return res.status(200).json({
      success: true,
      data: {
        status: 'activated',
        txHashes,
        psmAddress: CANONICAL_PSM,
        axusdToken: ACTIVE_AXUSD,
        minterRoleGranted: !hasMinter,
        agentRoleGranted: !hasAgent,
        callerAddress: wallet.address,
        message: 'Canonical PSM granted MINTER_ROLE + AGENT_ROLE on AXUSD. Mint/redeem are now live.',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[activate-psm] Error:', msg);
    return res.status(500).json({ error: msg });
  }
}
