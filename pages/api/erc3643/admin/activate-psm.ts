/**
 * POST /api/erc3643/admin/activate-psm
 *
 * Registers the Canonical PSM as an agent on the AXUSD T-REX token
 * by calling addAgent(CANONICAL_PSM) using the DEPLOYER_PRIVATE_KEY.
 *
 * This is a one-time activation step required before mint/redeem are live.
 * Safe to call multiple times — returns 200 with status:'already_active' if already registered.
 *
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ACTIVE_AXUSD, CANONICAL_PSM } from '../../../../src/config/activeContracts.generated';
import { AXUSD_3643_ABI } from '../../../../shared/contracts-3643';
import { validateAdminKey } from '../../../../src/config/adminRoles';
import { db } from '../../../../server/db';
import { adminActionLog } from '../../../../shared/erc3643Schema';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const AGENT_ABI = [
  'function isAgent(address _agent) view returns (bool)',
  'function addAgent(address _agent)',
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

    const token = new ethers.Contract(ACTIVE_AXUSD, [...AXUSD_3643_ABI, ...AGENT_ABI], wallet);

    const alreadyAgent: boolean = await token.isAgent(CANONICAL_PSM).catch(() => false);
    if (alreadyAgent) {
      return res.status(200).json({
        success: true,
        data: {
          status: 'already_active',
          psmAddress: CANONICAL_PSM,
          axusdToken: ACTIVE_AXUSD,
          message: 'Canonical PSM is already registered as an AXUSD agent. Mint and redeem are live.',
        },
      });
    }

    const tx = await token.addAgent(CANONICAL_PSM);
    const receipt = await tx.wait();

    await db.insert(adminActionLog).values({
      actionType: 'activatePsm',
      callerAddress: wallet.address,
      targetAddress: CANONICAL_PSM,
      txHash: receipt.hash ?? tx.hash,
      status: 'success',
      metadata: { axusdToken: ACTIVE_AXUSD, psmAddress: CANONICAL_PSM },
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
        callerAddress: wallet.address,
        message: 'Canonical PSM successfully registered as AXUSD agent. Mint and redeem are now live.',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[activate-psm] Error:', msg);
    return res.status(500).json({ error: msg });
  }
}
