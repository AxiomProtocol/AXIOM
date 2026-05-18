/**
 * POST /api/treasury/vault/harvest
 *
 * Sweeps accrued Aave v3 yield (aToken balance - principal) back into the
 * AxiomTreasuryVault by calling vault.harvest(aaveStrategy, USDC).
 *
 * Authorization — two paths:
 *   1. Operator session cookie (cap_operator_key) — for manual dashboard use.
 *   2. X-Harvest-Cron-Secret header matching HARVEST_CRON_SECRET env var —
 *      for external schedulers / Replit cron jobs calling this endpoint
 *      automatically on a cadence (e.g. every 24 h).
 *      Set HARVEST_CRON_SECRET to a long random secret and configure your
 *      cron to send:  -H "X-Harvest-Cron-Secret: <secret>"
 *
 * Guard rails:
 *   - Reads unrealized yield on-chain BEFORE submitting any transaction.
 *   - Enforces a $1.00 minimum yield threshold — returns a skip response
 *     (HTTP 200, skipped=true) for dust amounts.
 *   - On-chain role required: STRATEGY_ADMIN on AxiomTreasuryVault.
 *     Signing key: SENTINEL_EXECUTOR_PRIVATE_KEY (preferred) or
 *     DEPLOYER_PRIVATE_KEY as fallback.
 *   - Realized yield amount is parsed from the StrategyHarvested event
 *     emitted in the receipt — not the pre-tx estimate — ensuring the
 *     audit log reflects the exact on-chain amount.
 *
 * Success response:
 *   { success: true, txHash, yieldUsdc, source: 'operator' | 'cron' }
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
  'event StrategyHarvested(address indexed strategy, address indexed asset, uint256 yieldAmount)',
];

const STRATEGY_ABI = [
  'function currentValue() view returns (uint256)',
  'function principal()    view returns (uint256)',
];

/**
 * Returns 'operator' if the operator session cookie is valid,
 * 'cron' if the X-Harvest-Cron-Secret header matches HARVEST_CRON_SECRET,
 * or null if neither passes.
 */
function authenticateRequest(req: NextApiRequest): 'operator' | 'cron' | null {
  const cookie = readOperatorCookie(req);
  if (isValidOperatorKey(cookie)) return 'operator';

  const cronSecret = process.env.HARVEST_CRON_SECRET;
  if (cronSecret && cronSecret.length >= 16) {
    const provided = req.headers['x-harvest-cron-secret'];
    if (typeof provided === 'string' && provided === cronSecret) return 'cron';
  }

  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authSource = authenticateRequest(req);
  if (!authSource) {
    return res.status(401).json({
      error: 'Unauthorized — provide a valid operator session cookie or X-Harvest-Cron-Secret header',
    });
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
    const estimatedYieldRaw  = currentValueRaw > principalRaw ? currentValueRaw - principalRaw : 0n;
    const estimatedYieldUsdc = Number(estimatedYieldRaw) / 1e6;

    if (estimatedYieldUsdc < MIN_HARVEST_USDC) {
      return res.status(200).json({
        success:  false,
        skipped:  true,
        reason:   `Unrealized yield $${estimatedYieldUsdc.toFixed(6)} is below the $${MIN_HARVEST_USDC.toFixed(2)} minimum harvest threshold`,
        yieldUsdc: estimatedYieldUsdc,
        source:   authSource,
      });
    }

    // Execute: vault.harvest(aaveStrategy, USDC)
    // Calls StrategyManager.harvest(strategy) → AaveV3Strategy.harvest()
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

    // Parse realized yield from the StrategyHarvested event in the receipt.
    // This gives the exact on-chain amount rather than the pre-tx read estimate,
    // which can diverge slightly due to aToken indexing between the read and the tx.
    const iface = new ethers.Interface(VAULT_ABI);
    let realizedYieldUsdc = estimatedYieldUsdc; // safe fallback if parsing fails
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === 'StrategyHarvested') {
          realizedYieldUsdc = Number(parsed.args[2] as bigint) / 1e6;
          break;
        }
      } catch {
        // Not a StrategyHarvested log — continue
      }
    }

    // Record harvest in audit log with the realized (exact) amount.
    // logIndex -1 is the sentinel value for operator/cron-initiated inserts so
    // the (txHash, logIndex) unique constraint never collides with the event
    // poller's real log-index row for the same transaction.
    await db.insert(treasuryVaultEvents).values({
      eventType:   'harvest',
      strategy:    AAVE_STRATEGY,
      amountUsd:   realizedYieldUsdc.toFixed(6),
      txHash:      receipt.hash,
      logIndex:    -1,
      blockNumber: receipt.blockNumber,
    }).onConflictDoNothing();

    console.log(`[harvest] ${authSource} — ${realizedYieldUsdc.toFixed(6)} USDC harvested — ${receipt.hash}`);

    return res.status(200).json({
      success:   true,
      txHash:    receipt.hash,
      yieldUsdc: realizedYieldUsdc,
      source:    authSource,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/treasury/vault/harvest]', msg);
    return res.status(500).json({ success: false, error: 'Harvest failed', detail: msg });
  }
}
