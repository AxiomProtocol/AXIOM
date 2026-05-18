/**
 * lib/treasury/vault/harvestRunner.ts
 *
 * Core harvest execution logic — shared between the manual operator endpoint
 * (POST /api/treasury/vault/harvest) and the scheduled cron endpoint
 * (GET /api/cron/harvest-vault).
 *
 * Reads unrealized yield on-chain, enforces the minimum threshold
 * (env HARVEST_MIN_USDC, default $1.00), executes vault.harvest(), and
 * records the realized amount in treasury_vault_events.
 *
 * Callers are responsible for recording to harvest_cron_runs if applicable.
 */

import { ethers } from 'ethers';
import { db } from '../../../server/db';
import { treasuryVaultEvents } from '../../../shared/treasuryVaultSchema';

const VAULT_ADDRESS = process.env.AXIOM_TREASURY_VAULT_ADDRESS   ?? '';
const AAVE_STRATEGY = process.env.AXIOM_AAVE_V3_STRATEGY_ADDRESS ?? '';
const RPC           = process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc';
const USDC          = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

/** Minimum unrealized yield (USD) before a harvest transaction is submitted. */
export function getMinHarvestThreshold(): number {
  const raw = process.env.HARVEST_MIN_USDC;
  if (raw) {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 1.0;
}

const VAULT_ABI = [
  'function harvest(address strategy, address assetAddr) external',
  'event StrategyHarvested(address indexed strategy, address indexed asset, uint256 yieldAmount)',
];

const STRATEGY_ABI = [
  'function currentValue() view returns (uint256)',
  'function principal()    view returns (uint256)',
];

export interface HarvestResult {
  status: 'success' | 'skipped' | 'error';
  /** Realized yield on success; estimated yield on skipped; 0 on error. */
  yieldUsdc: number;
  txHash: string | null;
  /** Human-readable skip reason (only set when status === 'skipped'). */
  skipReason?: string;
  /** Error message (only set when status === 'error'). */
  errorMessage?: string;
  /** Which auth path triggered this run — recorded in the audit log. */
  source: 'operator' | 'cron';
}

export async function runHarvest(source: 'operator' | 'cron'): Promise<HarvestResult> {
  if (!VAULT_ADDRESS) {
    return { status: 'error', yieldUsdc: 0, txHash: null, source, errorMessage: 'AXIOM_TREASURY_VAULT_ADDRESS not configured' };
  }
  if (!AAVE_STRATEGY) {
    return { status: 'error', yieldUsdc: 0, txHash: null, source, errorMessage: 'AXIOM_AAVE_V3_STRATEGY_ADDRESS not configured' };
  }

  const signerKey = process.env.SENTINEL_EXECUTOR_PRIVATE_KEY
                 || process.env.DEPLOYER_PRIVATE_KEY
                 || process.env.DEPLOYER_PK;
  if (!signerKey) {
    return {
      status: 'error', yieldUsdc: 0, txHash: null, source,
      errorMessage: 'No signing key configured. Set SENTINEL_EXECUTOR_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY). The address must hold STRATEGY_ADMIN role.',
    };
  }

  const minThreshold = getMinHarvestThreshold();

  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const signer   = new ethers.Wallet(signerKey, provider);

    const strategy = new ethers.Contract(AAVE_STRATEGY, STRATEGY_ABI, provider);
    const [currentValueRaw, principalRaw] = await Promise.all([
      strategy.currentValue() as Promise<bigint>,
      strategy.principal()    as Promise<bigint>,
    ]);
    const estimatedYieldRaw  = currentValueRaw > principalRaw ? currentValueRaw - principalRaw : 0n;
    const estimatedYieldUsdc = Number(estimatedYieldRaw) / 1e6;

    if (estimatedYieldUsdc < minThreshold) {
      return {
        status: 'skipped',
        yieldUsdc: estimatedYieldUsdc,
        txHash: null,
        source,
        skipReason: `Unrealized yield $${estimatedYieldUsdc.toFixed(6)} is below the $${minThreshold.toFixed(2)} minimum threshold`,
      };
    }

    const vault   = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
    const tx      = await vault.harvest(AAVE_STRATEGY, USDC);
    const receipt = await tx.wait();

    if (receipt?.status !== 1) {
      return {
        status: 'error', yieldUsdc: 0, txHash: receipt?.hash ?? null, source,
        errorMessage: 'Harvest transaction reverted on-chain',
      };
    }

    // Parse realized yield from StrategyHarvested event.
    const iface = new ethers.Interface(VAULT_ABI);
    let realizedYieldUsdc = estimatedYieldUsdc;
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

    // Record realized yield in the shared audit event log.
    await db.insert(treasuryVaultEvents).values({
      eventType:   'harvest',
      strategy:    AAVE_STRATEGY,
      amountUsd:   realizedYieldUsdc.toFixed(6),
      txHash:      receipt.hash,
      logIndex:    -1,
      blockNumber: receipt.blockNumber,
    }).onConflictDoNothing();

    console.log(`[harvestRunner] ${source} — ${realizedYieldUsdc.toFixed(6)} USDC harvested — ${receipt.hash}`);

    return { status: 'success', yieldUsdc: realizedYieldUsdc, txHash: receipt.hash, source };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[harvestRunner] error:', msg);
    return { status: 'error', yieldUsdc: 0, txHash: null, source, errorMessage: msg };
  }
}
