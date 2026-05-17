/**
 * POST /api/treasury/vault/rebalance
 *
 * Sentinel-gated rebalance trigger. Validates the Sentinel rebalance
 * strategy (APY spread check, circuit breaker, direction check), then
 * calls StrategyManager.rebalance() on-chain with the deployer signer
 * (which holds SENTINEL_EXECUTOR role on StrategyManager).
 *
 * Body:
 *   fromStrategy  — 'aave_v3' | 'camelot'
 *   toStrategy    — 'aave_v3' | 'camelot'
 *   amountUsdc    — number (e.g. 10000 = $10,000)
 *
 * Authorization:
 *   Caller must present the operator session cookie (cap_operator_key)
 *   set during operator login. Uses the same constant-time validation
 *   as the operator console layout.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { evaluateTreasuryRebalance } from '../../../../lib/sentinel/strategies/treasuryRebalance';
import { readOperatorCookie, isValidOperatorKey } from '../../../../lib/capinfra/operatorAuth';
import { db } from '../../../../server/db';
import { treasuryVaultEvents } from '../../../../shared/treasuryVaultSchema';

const STRATEGY_MANAGER_ADDRESS = process.env.AXIOM_STRATEGY_MANAGER_ADDRESS ?? '';
const AAVE_STRATEGY            = process.env.AXIOM_AAVE_V3_STRATEGY_ADDRESS ?? '';
const CAMELOT_STRATEGY         = process.env.AXIOM_CAMELOT_STRATEGY_ADDRESS ?? '';
const RPC                      = process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc';

const SM_ABI = [
  'function rebalance(address fromStrategy, address toStrategy, uint256 amount) external',
];

function strategyAddress(key: 'aave_v3' | 'camelot'): string {
  return key === 'aave_v3' ? AAVE_STRATEGY : CAMELOT_STRATEGY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const cookie = readOperatorCookie(req);
  if (!isValidOperatorKey(cookie)) {
    return res.status(401).json({ error: 'Unauthorized — valid operator session required' });
  }

  const { fromStrategy, toStrategy, amountUsdc } = req.body as {
    fromStrategy?: string;
    toStrategy?:   string;
    amountUsdc?:   number;
  };

  if (!fromStrategy || !toStrategy || !amountUsdc) {
    return res.status(400).json({ error: 'fromStrategy, toStrategy, and amountUsdc are required' });
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

  const sentinelResult = await evaluateTreasuryRebalance({
    fromStrategy: fromStrategy as 'aave_v3' | 'camelot',
    toStrategy:   toStrategy   as 'aave_v3' | 'camelot',
    amountUsdc,
  });

  if (!sentinelResult.authorized) {
    return res.status(403).json({
      success: false,
      sentinelDecision: sentinelResult,
      error: sentinelResult.plainLanguage,
    });
  }

  if (!STRATEGY_MANAGER_ADDRESS) {
    return res.status(200).json({
      success: true,
      sentinelDecision: sentinelResult,
      txHash: null,
      note: 'AXIOM_STRATEGY_MANAGER_ADDRESS not configured — on-chain call skipped',
    });
  }

  try {
    const provider  = new ethers.JsonRpcProvider(RPC);
    const signer    = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
    const sm        = new ethers.Contract(STRATEGY_MANAGER_ADDRESS, SM_ABI, signer);
    const amountWei = BigInt(Math.round(amountUsdc * 1e6));
    const tx = await sm.rebalance(
      strategyAddress(fromStrategy as 'aave_v3' | 'camelot'),
      strategyAddress(toStrategy   as 'aave_v3' | 'camelot'),
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
      sentinelDecision: sentinelResult,
      txHash: receipt.hash,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/treasury/vault/rebalance]', msg);
    return res.status(500).json({ success: false, error: 'On-chain rebalance failed', detail: msg });
  }
}
