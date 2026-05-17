/**
 * POST /api/treasury/vault/rebalance
 *
 * Step 2 of the two-step Sentinel-gated rebalance flow.
 *
 * Validates the Sentinel authorization token issued by
 * POST /api/sentinel/rebalance-auth, then calls
 * AxiomTreasuryVault.rebalance() on-chain using the deployer signer
 * (which holds SENTINEL_EXECUTOR role on the vault).
 *
 * Body (JSON):
 *   fromStrategy  — 'aave_v3' | 'camelot'
 *   toStrategy    — 'aave_v3' | 'camelot'
 *   amountUsdc    — number
 *   token         — HMAC token from /api/sentinel/rebalance-auth
 *   expiry        — token expiry timestamp (ms)
 *
 * Authorization:
 *   Operator session cookie (cap_operator_key) +
 *   Valid Sentinel HMAC authorization token from /api/sentinel/rebalance-auth.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { readOperatorCookie, isValidOperatorKey } from '../../../../lib/capinfra/operatorAuth';
import { verifyRebalanceToken } from '../../sentinel/rebalance-auth';
import { db } from '../../../../server/db';
import { treasuryVaultEvents } from '../../../../shared/treasuryVaultSchema';

const VAULT_ADDRESS     = process.env.AXIOM_TREASURY_VAULT_ADDRESS    ?? '';
const AAVE_STRATEGY     = process.env.AXIOM_AAVE_V3_STRATEGY_ADDRESS  ?? '';
const CAMELOT_STRATEGY  = process.env.AXIOM_CAMELOT_STRATEGY_ADDRESS  ?? '';
const RPC               = process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc';
const USDC              = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const VAULT_ABI = [
  'function rebalance(address fromStrategy, address toStrategy, address asset, uint256 amount) external',
];

function strategyAddress(key: 'aave_v3' | 'camelot'): string {
  return key === 'aave_v3' ? AAVE_STRATEGY : CAMELOT_STRATEGY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth check 1: operator session cookie ────────────────────────────────
  const cookie = readOperatorCookie(req);
  if (!isValidOperatorKey(cookie)) {
    return res.status(401).json({ error: 'Unauthorized — valid operator session required' });
  }

  const { fromStrategy, toStrategy, amountUsdc, token, expiry } = req.body as {
    fromStrategy?: string;
    toStrategy?:   string;
    amountUsdc?:   number;
    token?:        string;
    expiry?:       number;
  };

  if (!fromStrategy || !toStrategy || !amountUsdc || !token || !expiry) {
    return res.status(400).json({
      error: 'fromStrategy, toStrategy, amountUsdc, token, and expiry are required. '
           + 'Obtain a token first from POST /api/sentinel/rebalance-auth.',
    });
  }
  if (fromStrategy !== 'aave_v3' && fromStrategy !== 'camelot') {
    return res.status(400).json({ error: 'fromStrategy must be aave_v3 or camelot' });
  }
  if (toStrategy !== 'aave_v3' && toStrategy !== 'camelot') {
    return res.status(400).json({ error: 'toStrategy must be aave_v3 or camelot' });
  }
  if (fromStrategy === toStrategy) {
    return res.status(400).json({ error: 'fromStrategy and toStrategy must differ' });
  }

  // ── Auth check 2: Sentinel HMAC authorization token ──────────────────────
  const tokenValid = verifyRebalanceToken(
    fromStrategy, toStrategy, amountUsdc, expiry, token
  );
  if (!tokenValid) {
    return res.status(403).json({
      error: 'Sentinel authorization token is invalid or expired. '
           + 'Request a new token from POST /api/sentinel/rebalance-auth.',
    });
  }

  if (!VAULT_ADDRESS) {
    return res.status(200).json({
      success: true,
      txHash:  null,
      note:    'AXIOM_TREASURY_VAULT_ADDRESS not configured — on-chain call skipped',
    });
  }

  try {
    const provider   = new ethers.JsonRpcProvider(RPC);
    const signer     = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
    const vault      = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
    const amountWei  = BigInt(Math.round(amountUsdc * 1e6));

    const tx = await vault.rebalance(
      strategyAddress(fromStrategy as 'aave_v3' | 'camelot'),
      strategyAddress(toStrategy   as 'aave_v3' | 'camelot'),
      USDC,
      amountWei
    );
    const receipt = await tx.wait();

    await db.insert(treasuryVaultEvents).values({
      eventType:   'rebalance',
      strategy:    `${fromStrategy}→${toStrategy}`,
      amountUsd:   amountUsdc.toFixed(6),
      txHash:      receipt.hash,
      logIndex:    0,
      blockNumber: receipt.blockNumber,
    });

    return res.status(200).json({
      success: true,
      txHash:  receipt.hash,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/treasury/vault/rebalance]', msg);
    return res.status(500).json({ success: false, error: 'On-chain rebalance failed', detail: msg });
  }
}
