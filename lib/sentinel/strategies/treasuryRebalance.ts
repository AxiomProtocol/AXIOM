/**
 * lib/sentinel/strategies/treasuryRebalance.ts
 *
 * Sentinel strategy that evaluates whether the treasury vault should
 * rebalance capital between the Aave v3 and Camelot strategies.
 *
 * APY data sources (in priority order):
 *   1. Caller-supplied `currentAaveApy` / `currentCamelotApy` in request body.
 *   2. Live Aave v3 USDC supply APY from getAaveArbitrumMarket().
 *   3. Camelot: env var AXIOM_CAMELOT_APY_PCT (configured estimate).
 *
 * Decision logic:
 *   • Circuit breaker check first — deny if Sentinel is in halt state.
 *   • Amount limit: max $500k per rebalance.
 *   • APY spread of ≥ 50 bps required to authorise a rebalance.
 *   • Direction must target the higher-yielding strategy.
 *   • If any APY data is unavailable, deny with APY_DATA_UNAVAILABLE.
 */

import { isActionAllowed } from '../circuitBreaker';
import { getAaveArbitrumMarket } from '../../defi/aave/arbitrumService';
import { listLiquidityPools } from '../../liquidity/registry';
import type { LiquidityPoolDefinition } from '../../liquidity/types';

export interface TreasuryRebalanceRequest {
  fromStrategy:       'aave_v3' | 'camelot';
  toStrategy:         'aave_v3' | 'camelot';
  amountUsdc:         number;
  currentAaveApy?:    number;
  currentCamelotApy?: number;
}

export interface TreasuryRebalanceResult {
  authorized:          boolean;
  decision:            'APPROVED' | 'DENIED';
  reasonCode:          string;
  plainLanguage:       string;
  recommendedStrategy: 'aave_v3' | 'camelot' | null;
  aaveApyPct:          number | null;
  camelotApyPct:       number | null;
  spreadBps:           number | null;
  timestamp:           string;
}

const REBALANCE_THRESHOLD_BPS   = 50;      // 0.50 % spread required
const MAX_SINGLE_REBALANCE_USDC = 500_000;

/** Parse AXIOM_CAMELOT_APY_PCT env var as a fallback estimate. */
function getCamelotApyFallback(): number | null {
  const raw = process.env.AXIOM_CAMELOT_APY_PCT;
  if (!raw) return null;
  const v = parseFloat(raw);
  return Number.isFinite(v) ? v : null;
}

export async function evaluateTreasuryRebalance(
  req: TreasuryRebalanceRequest
): Promise<TreasuryRebalanceResult> {
  const timestamp = new Date().toISOString();

  const circuitCheck = isActionAllowed('TreasuryVaultRebalance');
  if (!circuitCheck.allowed) {
    return {
      authorized:          false,
      decision:            'DENIED',
      reasonCode:          'CIRCUIT_BREAKER_ACTIVE',
      plainLanguage:       `Treasury rebalance blocked by Sentinel circuit breaker: ${circuitCheck.reason}`,
      recommendedStrategy: null,
      aaveApyPct:          null,
      camelotApyPct:       null,
      spreadBps:           null,
      timestamp,
    };
  }

  if (req.amountUsdc > MAX_SINGLE_REBALANCE_USDC) {
    return {
      authorized:          false,
      decision:            'DENIED',
      reasonCode:          'EXCEEDS_SINGLE_REBALANCE_LIMIT',
      plainLanguage:       `Requested rebalance of $${req.amountUsdc.toLocaleString()} exceeds the single-transaction limit of $${MAX_SINGLE_REBALANCE_USDC.toLocaleString()}.`,
      recommendedStrategy: null,
      aaveApyPct:          null,
      camelotApyPct:       null,
      spreadBps:           null,
      timestamp,
    };
  }

  // ── Resolve Aave APY ──────────────────────────────────────────────────────
  let aaveApyPct: number | null = req.currentAaveApy ?? null;
  if (aaveApyPct === null) {
    try {
      const market = await getAaveArbitrumMarket();
      const usdcEntry = market?.markets.find((m) => m.symbol === 'USDC');
      aaveApyPct = usdcEntry?.supplyApyPct ?? null;
    } catch {
      aaveApyPct = null;
    }
  }

  // ── Resolve Camelot APY ───────────────────────────────────────────────────
  // The liquidity pool registry is a static metadata registry with no live APY.
  // Live Camelot APY must be supplied by the caller (currentCamelotApy) or
  // configured via the AXIOM_CAMELOT_APY_PCT environment variable.
  let camelotApyPct: number | null = req.currentCamelotApy ?? null;
  if (camelotApyPct === null) {
    // Check env var fallback
    camelotApyPct = getCamelotApyFallback();
  }
  if (camelotApyPct === null) {
    // Confirm pool is registered (informational) but cannot get APY
    const pools: LiquidityPoolDefinition[] = listLiquidityPools();
    const camelotRegistered = pools.some((p) => p.venue === 'camelot');
    if (!camelotRegistered) {
      return {
        authorized:          false,
        decision:            'DENIED',
        reasonCode:          'CAMELOT_POOL_NOT_REGISTERED',
        plainLanguage:       'Camelot pool is not registered in the liquidity registry. Rebalance to Camelot blocked.',
        recommendedStrategy: null,
        aaveApyPct,
        camelotApyPct:       null,
        spreadBps:           null,
        timestamp,
      };
    }
  }

  if (aaveApyPct === null || camelotApyPct === null) {
    return {
      authorized:          false,
      decision:            'DENIED',
      reasonCode:          'APY_DATA_UNAVAILABLE',
      plainLanguage:       `Live APY data unavailable for ${aaveApyPct === null ? 'Aave' : 'Camelot'}. `
        + 'Provide currentAaveApy / currentCamelotApy in the request, or set AXIOM_CAMELOT_APY_PCT env var.',
      recommendedStrategy: null,
      aaveApyPct,
      camelotApyPct,
      spreadBps:           null,
      timestamp,
    };
  }

  const spreadBps = Math.round(Math.abs(aaveApyPct - camelotApyPct) * 100);
  const better: 'aave_v3' | 'camelot' = aaveApyPct >= camelotApyPct ? 'aave_v3' : 'camelot';
  const worse:  'aave_v3' | 'camelot' = better === 'aave_v3' ? 'camelot' : 'aave_v3';

  if (spreadBps < REBALANCE_THRESHOLD_BPS) {
    return {
      authorized:          false,
      decision:            'DENIED',
      reasonCode:          'SPREAD_BELOW_THRESHOLD',
      plainLanguage:       `APY spread of ${spreadBps} bps is below the ${REBALANCE_THRESHOLD_BPS} bps threshold. No rebalance warranted. Aave: ${aaveApyPct.toFixed(2)}% | Camelot: ${camelotApyPct.toFixed(2)}%.`,
      recommendedStrategy: null,
      aaveApyPct,
      camelotApyPct,
      spreadBps,
      timestamp,
    };
  }

  if (req.toStrategy !== better) {
    return {
      authorized:          false,
      decision:            'DENIED',
      reasonCode:          'WRONG_REBALANCE_DIRECTION',
      plainLanguage:       `Requested rebalance moves capital to ${req.toStrategy} but current data favours ${better} (spread: ${spreadBps} bps). Resubmit targeting ${better}.`,
      recommendedStrategy: better,
      aaveApyPct,
      camelotApyPct,
      spreadBps,
      timestamp,
    };
  }

  return {
    authorized:          true,
    decision:            'APPROVED',
    reasonCode:          'REBALANCE_WARRANTED',
    plainLanguage:       `Rebalance from ${worse} → ${better} approved. APY spread: ${spreadBps} bps (Aave: ${aaveApyPct.toFixed(2)}% | Camelot: ${camelotApyPct.toFixed(2)}%). Amount: $${req.amountUsdc.toLocaleString()}.`,
    recommendedStrategy: better,
    aaveApyPct,
    camelotApyPct,
    spreadBps,
    timestamp,
  };
}
