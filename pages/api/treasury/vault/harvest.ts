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
 *      automatically on a cadence (e.g. every 6 h).
 *      Set HARVEST_CRON_SECRET to a long random secret and configure your
 *      cron to send:  -H "X-Harvest-Cron-Secret: <secret>"
 *
 * Guard rails (from harvestRunner):
 *   - Reads unrealized yield on-chain BEFORE submitting any transaction.
 *   - Enforces minimum threshold via env HARVEST_MIN_USDC (default $1.00).
 *   - On-chain role required: STRATEGY_ADMIN on AxiomTreasuryVault.
 *     Signing key: SENTINEL_EXECUTOR_PRIVATE_KEY (preferred) or
 *     DEPLOYER_PRIVATE_KEY as fallback.
 *   - Realized yield amount is parsed from the StrategyHarvested event
 *     emitted in the receipt — not the pre-tx estimate.
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
import { readOperatorCookie, isValidOperatorKey } from '../../../../lib/capinfra/operatorAuth';
import { runHarvest } from '../../../../lib/treasury/vault/harvestRunner';

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

  const result = await runHarvest(authSource);

  if (result.status === 'skipped') {
    return res.status(200).json({
      success:   false,
      skipped:   true,
      reason:    result.skipReason,
      yieldUsdc: result.yieldUsdc,
      source:    result.source,
    });
  }

  if (result.status === 'error') {
    const isConfig = result.errorMessage?.includes('not configured') || result.errorMessage?.includes('No signing key');
    return res.status(isConfig ? 503 : 500).json({
      success: false,
      error:   'Harvest failed',
      detail:  result.errorMessage,
    });
  }

  return res.status(200).json({
    success:   true,
    txHash:    result.txHash,
    yieldUsdc: result.yieldUsdc,
    source:    result.source,
  });
}
