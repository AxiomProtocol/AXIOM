import type { Direction, RegimeTier, LiquidityTier, PortfolioState } from './types';
import type { SizingResult } from './types';
import { VOL_MULT, LIQ_MULT } from './constants';
import {
  computeInvalidationDistance,
  computeRiskBudget,
  computeConfidenceMultiplier,
  computePositionSize,
  computeNotional,
  computeStopPrice,
  computeTakeProfits,
} from './math';

export interface SizingParams {
  currentPrice: number;
  invalidationPrice: number;
  atr: number;
  confidenceScore: number;
  portfolio: PortfolioState;
  direction: Direction;
  regimeTier: RegimeTier;
  liquidityTier: LiquidityTier;
  expectedP50: number | null;
  expectedP95: number | null;
}

export function computeSizing(params: SizingParams): SizingResult {
  const {
    currentPrice,
    invalidationPrice,
    atr,
    confidenceScore,
    portfolio,
    direction,
    regimeTier,
    liquidityTier,
    expectedP50,
    expectedP95,
  } = params;

  const riskFractionBps = portfolio.riskFractionBps;
  const riskBudgetUsd = computeRiskBudget(portfolio.portfolioCapitalUsd, riskFractionBps);
  const invalidationDistance = computeInvalidationDistance(currentPrice, invalidationPrice, atr);

  const volMult = VOL_MULT[regimeTier] ?? 1.0;
  const confMult = computeConfidenceMultiplier(confidenceScore);
  const liqMult = LIQ_MULT[liquidityTier] ?? 0;

  const positionSizeQty = computePositionSize(
    riskBudgetUsd,
    invalidationDistance,
    volMult,
    confMult,
    liqMult,
    portfolio.globalSizeMultiplier
  );

  if (positionSizeQty === 0) {
    return {
      riskBudgetUsd: 0,
      invalidationDistance: 0,
      positionSizeQty: 0,
      positionNotionalUsd: 0,
      stopPrice: 0,
      takeProfitP50: 0,
      takeProfitP95: 0,
      riskFractionBps,
    };
  }

  const positionNotionalUsd = computeNotional(positionSizeQty, currentPrice);
  const stopPrice = computeStopPrice(currentPrice, invalidationPrice, invalidationDistance, direction);
  const takeProfits = computeTakeProfits(currentPrice, expectedP50, expectedP95, atr, direction);

  return {
    riskBudgetUsd,
    invalidationDistance,
    positionSizeQty,
    positionNotionalUsd,
    stopPrice,
    takeProfitP50: takeProfits.p50,
    takeProfitP95: takeProfits.p95,
    riskFractionBps,
  };
}
