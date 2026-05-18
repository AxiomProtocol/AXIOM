/**
 * POST /api/treasury/vault/harvest
 *
 * Sweeps accrued Aave v3 yield (aToken balance - principal) back into the
 * AxiomTreasuryVault by calling vault.harvest(aaveStrategy, USDC).
 *
 * Guard rails:
 *   - Operator session cookie required (cap_operator_key).
 *   - Checks unrealized yield on-chain BEFORE submitting any transaction.
 *   - Enforces a $1.00 minimum yield threshold — returns a skip response
 *     (HTTP 200, skipped=true) for dust amounts so the caller can distinguish
 *     "not worth it yet" from a real error.
 *   - On-chain role required: STRATEGY_ADMIN on AxiomTreasuryVault.
 *     Signing key: SENTINEL_EXECUTOR_PRIVATE_KEY (preferred) or
 *     DEPLOYER_PRIVATE_KEY as fallback.
 *
 * Success response:
 *   { success: true, txHash, yieldUsdc }
 *
 * Skipped (below threshold):
 *   { success: false, skipped: true, reason, yieldUsdc }
 *
 * Error:
 *   { success: false, error, detail? }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { readOperatorCookie, isValidOperatorKey } from '../../../../lib/capinfra/operatorAuth';
import { db } from '../../../../server/db';
import { treasuryVaultEvents } from '../../../../shared/treasuryVaultSchema';

const VAULT_ADDRESS = process.env.AXIOM_TREASURY_VAULT_ADDRESS   ?? '';
const AAVE_STRATEGY = process.env.AXIOM_AAVE_V3_STRATEGY_ADDRESS ?? '';
const RPC           = process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc';
const USDC          = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const MIN_HARVEST_USDC = 1.0; // minimum $1.00 unrealized yield before harvesting

const VAULT_ABI = [
  'function harvest(address strategy, address assetAddr) external',
];

const STRATEGY_ABI = [
  'function currentValue() view returns (uint256)',
  'function principal()    view returns (uint256)',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const cookie = readOperatorCookie(req);
  if (!isValidOperatorKey(cookie)) {
    return res.status(401).json({ error: 'Unauthorized — valid operator session required' });
  }

  if (!VAULT_ADDRESS) {
    return res.status(503).json({ error: 'AXIOM_TREASURY_VAULT_ADDRESS not configured' });
  }
  if (!AAVE_STRATEGY) {
    return res.status(503).json({ error: 'AXIOM_AAVE_V3_STRATEGY_ADDRESS not configured' });
  }

  const signerKey = process.env.SENTINEL_EXECUTOR_PRIVATE_KEY
                 || process.env.DEPLOYER_PRIVATE_KEY
                 || process.env.DEPLOYER_PK;
  if (!signerKey) {
    return res.status(503).json({
      error: 'No signing key configured. Set SENTINEL_EXECUTOR_PRIVATE_KEY '
           + '(or DEPLOYER_PRIVATE_KEY as fallback). The address must hold '
           + 'STRATEGY_ADMIN role on AxiomTreasuryVault.',
    });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const signer   = new ethers.Wallet(signerKey, provider);

    // Read unrealized yield from the Aave strategy BEFORE sending any tx.
    // currentValue() returns aToken balance (principal + accrued yield).
    // Yield = max(currentValue - principal, 0).
    const strategy = new ethers.Contract(AAVE_STRATEGY, STRATEGY_ABI, provider);
    const [currentValueRaw, principalRaw] = await Promise.all([
      strategy.currentValue() as Promise<bigint>,
      strategy.principal()    as Promise<bigint>,
    ]);
    const yieldRaw  = currentValueRaw > principalRaw ? currentValueRaw - principalRaw : 0n;
    const yieldUsdc = Number(yieldRaw) / 1e6;

    if (yieldUsdc < MIN_HARVEST_USDC) {
      return res.status(200).json({
        success:  false,
        skipped:  true,
        reason:   `Unrealized yield $${yieldUsdc.toFixed(6)} is below the $${MIN_HARVEST_USDC.toFixed(2)} minimum harvest threshold`,
        yieldUsdc,
      });
    }

    // Execute: vault.harvest(aaveStrategy, USDC)
    // This calls StrategyManager.harvest(strategy) → AaveV3Strategy.harvest()
    // which withdraws (currentValue - principal) aUSDC from Aave to the vault.
    const vault   = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
    const tx      = await vault.harvest(AAVE_STRATEGY, USDC);
    const receipt = await tx.wait();

    if (receipt?.status !== 1) {
      return res.status(500).json({
        success: false,
        error:   'Harvest transaction reverted on-chain',
        txHash:  receipt?.hash ?? null,
      });
    }

    // Record harvest in audit log.
    // logIndex -1 is the sentinel value for operator-initiated events so that
    // the (txHash, logIndex) unique constraint never collides with the on-chain
    // event poller's logIndex 0 for the same transaction.
    await db.insert(treasuryVaultEvents).values({
      eventType:   'harvest',
      strategy:    AAVE_STRATEGY,
      amountUsd:   yieldUsdc.toFixed(6),
      txHash:      receipt.hash,
      logIndex:    -1,
      blockNumber: receipt.blockNumber,
    }).onConflictDoNothing();

    return res.status(200).json({
      success:  true,
      txHash:   receipt.hash,
      yieldUsdc,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/treasury/vault/harvest]', msg);
    return res.status(500).json({ success: false, error: 'Harvest failed', detail: msg });
  }
}
