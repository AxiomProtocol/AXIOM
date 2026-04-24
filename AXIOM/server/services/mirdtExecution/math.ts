import type { ExecutionGrade, GradeComponents, Direction, RegimeTier, LiquidityTier } from './types';
import {
  ATR_MULT_FALLBACK,
  INVALIDATION_MIN_ATR_MULT,
  CONF_MULT,
  SIGNAL_MIN_Z,
} from './constants';

export function computeInvalidationDistance(
  currentPrice: number,
  invalidationPrice: number | null | undefined,
  atr?: number
): number {
  if (invalidationPrice != null && invalidationPrice !== 0) {
    return Math.abs(currentPrice - invalidationPrice);
  }
  return ATR_MULT_FALLBACK * (atr ?? 0);
}

export function isInvalidationTooTight(distance: number, atr: number): boolean {
  return distance < INVALIDATION_MIN_ATR_MULT * atr;
}

export function computeRiskBudget(portfolioCapitalUsd: number, riskFractionBps: number): number {
  return (riskFractionBps / 10000) * portfolioCapitalUsd;
}

export function computeConfidenceMultiplier(confidenceScore: number): number {
  for (const { threshold, mult } of CONF_MULT) {
    if (confidenceScore >= threshold) {
      return mult;
    }
  }
  return 0.5;
}

export function computePositionSize(
  riskBudgetUsd: number,
  invalidationDistance: number,
  volMult: number,
  confMult: number,
  liqMult: number,
  globalSizeMultiplier: number
): number {
  if (liqMult === 0) return 0;
  if (invalidationDistance === 0) return 0;
  return (riskBudgetUsd / invalidationDistance) * volMult * confMult * liqMult * globalSizeMultiplier;
}

export function computeNotional(qty: number, currentPrice: number): number {
  return qty * currentPrice;
}

export function computeStopPrice(
  currentPrice: number,
  invalidationPrice: number | null | undefined,
  invalidationDistance: number,
  direction: Direction
): number {
  if (invalidationPrice != null && invalidationPrice !== 0) {
    return invalidationPrice;
  }
  if (direction === 'LONG') {
    return currentPrice - invalidationDistance;
  }
  return currentPrice + invalidationDistance;
}

export function computeTakeProfits(
  currentPrice: number,
  expectedP50: number | null | undefined,
  expectedP95: number | null | undefined,
  atr: number,
  direction: Direction
): { p50: number; p95: number } {
  if (expectedP50 != null && expectedP50 !== 0 && expectedP95 != null && expectedP95 !== 0) {
    return { p50: expectedP50, p95: expectedP95 };
  }
  if (direction === 'LONG') {
    return {
      p50: currentPrice + atr * 1.5,
      p95: currentPrice + atr * 3.0,
    };
  }
  return {
    p50: currentPrice - atr * 1.5,
    p95: currentPrice - atr * 3.0,
  };
}

export function computeGradeComponents(
  signalZ: number,
  asymmetryRatio: number,
  regimeTier: RegimeTier,
  liquidityTier: LiquidityTier
): GradeComponents {
  const absZ = Math.abs(signalZ);
  const signalScore = Math.min(40, Math.max(0, (absZ / 3.0) * 40));

  const clampedRatio = Math.max(0, asymmetryRatio);
  let asymmetryScore: number;
  if (clampedRatio <= 0.5) {
    asymmetryScore = 0;
  } else if (clampedRatio >= 3.0) {
    asymmetryScore = 25;
  } else {
    asymmetryScore = ((clampedRatio - 0.5) / (3.0 - 0.5)) * 25;
  }

  const regimeScoreMap: Record<string, number> = {
    LOW: 20,
    NORMAL: 15,
    EXPANDING: 8,
    EXTREME: 3,
  };
  const regimeScore = regimeScoreMap[regimeTier] ?? 10;

  const liquidityScoreMap: Record<string, number> = {
    HIGH: 15,
    MODERATE: 10,
    LOW: 5,
    FRAGILE: 0,
  };
  const liquidityScore = liquidityScoreMap[liquidityTier] ?? 0;

  const total = signalScore + asymmetryScore + regimeScore + liquidityScore;

  return {
    signalScore: Math.round(signalScore * 10) / 10,
    asymmetryScore: Math.round(asymmetryScore * 10) / 10,
    regimeScore,
    liquidityScore,
    total: Math.round(total * 10) / 10,
  };
}

export function mapGrade(total: number, signalZ: number): ExecutionGrade {
  if (Math.abs(signalZ) < SIGNAL_MIN_Z) {
    return 'REJECT';
  }
  if (total >= 80) return 'A';
  if (total >= 65) return 'B';
  if (total >= 50) return 'C';
  return 'REJECT';
}
