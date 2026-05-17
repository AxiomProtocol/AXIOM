/**
 * lib/sentinel/strategies/treasuryRebalance.ts
 *
 * Sentinel strategy that evaluates whether the treasury vault should
 * rebalance capital between the Aave v3 and Camelot strategies based
 * on current APY data.
 *
 * Decision logic
 * ──────────────
 *   1. Fetch current Aave v3 USDC supply APY from the live on-chain data provider.
 *   2. Estimate Camelot AXUSD/USDC LP APY from the Camelot pool data.
 *   3. If the spread between them exceeds REBALANCE_THRESHOLD_BPS (50 bps = 0.5%),
 *      authorise a rebalance toward the higher-yielding strategy.
 *   4. If either data source is unavailable, deny to prevent blind rebalances.
 *   5. If the vault is in circuit-breaker state, deny unconditionally.
 */

import { isActionAllowed } from '../circuitBreaker';
import { getAaveArbitrumMarket } from '../../defi/aave/arbitrumService';
import { listLiquidityPools } from '../../liquidity/registry';

export interface TreasuryRebalanceRequest {
  fromStrategy: 'aave_v3' | 'camelot';
  toStrategy: 'aave_v3' | 'camelot';
  amountUsdc: number;
  currentAaveApy?: number;
  currentCamelotApy?: number;
}

export interface TreasuryRebalanceResult {
  authorized: boolean;
  decision: 'APPROVED' | 'DENIED';
  reasonCode: string;
  plainLanguage: string;
  recommendedStrategy: 'aave_v3' | 'camelot' | null;
  aaveApyPct: number | null;
  camelotApyPct: number | null;
  spreadBps: number | null;
  timestamp: string;
}

const REBALANCE_THRESHOLD_BPS = 50;   // 0.50 % spread required to warrant rebalance
const MAX_SINGLE_REBALANCE_USDC = 500_000;

export async function evaluateTreasuryRebalance(
  req: TreasuryRebalanceRequest
): Promise<TreasuryRebalanceResult> {
  const timestamp = new Date().toISOString();

  const circuitCheck = isActionAllowed('TreasuryVaultRebalance' as any);
  if (!circuitCheck.allowed) {
    return {
      authorized: false,
      decision: 'DENIED',
      reasonCode: 'CIRCUIT_BREAKER_ACTIVE',
      plainLanguage: `Treasury rebalance blocked by Sentinel circuit breaker: ${circuitCheck.reason}`,
      recommendedStrategy: null,
      aaveApyPct: null,
      camelotApyPct: null,
      spreadBps: null,
      timestamp,
    };
  }

  if (req.amountUsdc > MAX_SINGLE_REBALANCE_USDC) {
    return {
      authorized: false,
      decision: 'DENIED',
      reasonCode: 'EXCEEDS_SINGLE_REBALANCE_LIMIT',
      plainLanguage: `Requested rebalance of $${req.amountUsdc.toLocaleString()} exceeds single-transaction limit of $${MAX_SINGLE_REBALANCE_USDC.toLocaleString()}.`,
      recommendedStrategy: null,
      aaveApyPct: null,
      camelotApyPct: null,
      spreadBps: null,
      timestamp,
    };
  }

  let aaveApyPct: number | null = req.currentAaveApy ?? null;
  let camelotApyPct: number | null = req.currentCamelotApy ?? null;

  if (aaveApyPct === null) {
    try {
      const market = await getAaveArbitrumMarket();
      const usdcEntry = market?.markets.find((m) => m.symbol === 'USDC');
      aaveApyPct = usdcEntry?.supplyApyPct ?? null;
    } catch {
      aaveApyPct = null;
    }
  }

  if (camelotApyPct === null) {
    try {
      const pools = listLiquidityPools();
      const camelotPool = pools.find((p) => p.venue === 'camelot');
      camelotApyPct = (camelotPool as any)?.apyPct ?? null;
    } catch {
      camelotApyPct = null;
    }
  }

  if (aaveApyPct === null || camelotApyPct === null) {
    return {
      authorized: false,
      decision: 'DENIED',
      reasonCode: 'APY_DATA_UNAVAILABLE',
      plainLanguage: 'Cannot evaluate rebalance: live APY data is unavailable for one or more strategies. Rebalance blocked until data restores.',
      recommendedStrategy: null,
      aaveApyPct,
      camelotApyPct,
      spreadBps: null,
      timestamp,
    };
  }

  const spreadBps = Math.round(Math.abs(aaveApyPct - camelotApyPct) * 100);
  const better: 'aave_v3' | 'camelot' = aaveApyPct >= camelotApyPct ? 'aave_v3' : 'camelot';
  const worse: 'aave_v3' | 'camelot'  = better === 'aave_v3' ? 'camelot' : 'aave_v3';

  if (spreadBps < REBALANCE_THRESHOLD_BPS) {
    return {
      authorized: false,
      decision: 'DENIED',
      reasonCode: 'SPREAD_BELOW_THRESHOLD',
      plainLanguage: `APY spread of ${spreadBps} bps is below the ${REBALANCE_THRESHOLD_BPS} bps threshold. No rebalance warranted. Aave: ${aaveApyPct.toFixed(2)}% | Camelot: ${camelotApyPct.toFixed(2)}%.`,
      recommendedStrategy: null,
      aaveApyPct,
      camelotApyPct,
      spreadBps,
      timestamp,
    };
  }

  if (req.toStrategy !== better) {
    return {
      authorized: false,
      decision: 'DENIED',
      reasonCode: 'WRONG_REBALANCE_DIRECTION',
      plainLanguage: `Requested rebalance moves capital to ${req.toStrategy} but current data favours ${better} (spread: ${spreadBps} bps). Rebalance direction reversed — resubmit to ${better}.`,
      recommendedStrategy: better,
      aaveApyPct,
      camelotApyPct,
      spreadBps,
      timestamp,
    };
  }

  return {
    authorized: true,
    decision: 'APPROVED',
    reasonCode: 'REBALANCE_WARRANTED',
    plainLanguage: `Rebalance from ${worse} → ${better} approved. APY spread: ${spreadBps} bps (Aave: ${aaveApyPct.toFixed(2)}% | Camelot: ${camelotApyPct.toFixed(2)}%). Amount: $${req.amountUsdc.toLocaleString()}.`,
    recommendedStrategy: better,
    aaveApyPct,
    camelotApyPct,
    spreadBps,
    timestamp,
  };
}
