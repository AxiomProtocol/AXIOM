import type { DecisionTrace, GradeComponents, ExecutionGrade } from './types';
import { computeGradeComponents, mapGrade } from './math';
import { computeSizing } from './sizing';
import { classifyEntryTrigger, isEntryAllowed } from './triggers';
import { computeEligibility } from './eligibility';
import { computeDecisionChecksum } from './audit';

export interface ReplayResult {
  originalChecksum: string;
  replayChecksum: string;
  match: boolean;
  trace: DecisionTrace;
  replayedGrade: ExecutionGrade;
  replayedGradeComponents: GradeComponents;
  discrepancies: string[];
}

export function replayDecision(trace: DecisionTrace, originalChecksum: string): ReplayResult {
  const discrepancies: string[] = [];

  const invalidationDistance = Math.abs(trace.currentPrice - trace.invalidationPrice);
  const rewardDistance = trace.direction === 'LONG'
    ? (trace.expectedP50 || trace.currentPrice * 1.02) - trace.currentPrice
    : trace.currentPrice - (trace.expectedP50 || trace.currentPrice * 0.98);
  const asymmetryRatio = invalidationDistance > 0 ? Math.abs(rewardDistance) / invalidationDistance : 0;

  const replayedGradeComponents = computeGradeComponents(
    trace.signalZ,
    asymmetryRatio,
    trace.regimeTier,
    trace.liquidityTier
  );
  const replayedGrade = mapGrade(replayedGradeComponents.total, trace.signalZ);

  if (replayedGrade !== trace.grade) {
    discrepancies.push(`grade: original=${trace.grade}, replayed=${replayedGrade}`);
  }

  if (Math.abs(replayedGradeComponents.total - trace.gradeComponents.total) > 0.001) {
    discrepancies.push(`gradeTotal: original=${trace.gradeComponents.total.toFixed(4)}, replayed=${replayedGradeComponents.total.toFixed(4)}`);
  }

  const atr = trace.volatilityEstimate * trace.currentPrice;

  const replayedSizing = computeSizing({
    currentPrice: trace.currentPrice,
    invalidationPrice: trace.invalidationPrice,
    atr,
    confidenceScore: trace.confidenceScore,
    portfolio: {
      portfolioCapitalUsd: 0,
      riskFractionBps: trace.riskFractionBps,
      maxConcurrentTrades: 5,
      maxPerAssetExposureBps: 2000,
      drawdownBrakeBps: 500,
      systemVolatilityTier: 'NORMAL',
      policyMode: trace.policyMode,
      globalSizeMultiplier: trace.globalSizeMultiplier,
    },
    direction: trace.direction,
    regimeTier: trace.regimeTier,
    liquidityTier: trace.liquidityTier,
    expectedP50: trace.expectedP50,
    expectedP95: trace.expectedP95,
  });

  if (Math.abs(replayedSizing.positionSizeQty - trace.positionSizeQty) > 0.0001) {
    discrepancies.push(`positionSizeQty: original=${trace.positionSizeQty}, replayed=${replayedSizing.positionSizeQty}`);
  }

  if (Math.abs(replayedSizing.stopPrice - trace.stopPrice) > 0.01) {
    discrepancies.push(`stopPrice: original=${trace.stopPrice}, replayed=${replayedSizing.stopPrice}`);
  }

  const replayChecksum = computeDecisionChecksum({
    setupId: trace.setupId,
    snapshotId: null,
    currentPrice: trace.currentPrice,
    signalZ: trace.signalZ,
    volatilityEstimate: trace.volatilityEstimate,
    liquidityTier: trace.liquidityTier,
    regimeTier: trace.regimeTier,
    grade: replayedGrade,
    riskFractionBps: trace.riskFractionBps,
    positionSizeQty: trace.positionSizeQty,
    stopPrice: trace.stopPrice,
    takeProfitP50: trace.takeProfitP50,
    takeProfitP95: trace.takeProfitP95,
    policyMode: trace.policyMode,
    direction: trace.direction,
  });

  return {
    originalChecksum,
    replayChecksum,
    match: replayChecksum === originalChecksum && discrepancies.length === 0,
    trace,
    replayedGrade,
    replayedGradeComponents,
    discrepancies,
  };
}
