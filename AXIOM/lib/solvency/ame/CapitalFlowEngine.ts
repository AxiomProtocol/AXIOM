import type { PolicyMode, WaterfallAllocation, WaterfallBucket, YieldPermission } from './types';
import { YIELD_CONFIG } from './config';

const WATERFALL_BOOTSTRAP: WaterfallAllocation[] = [
  { bucket: 'LOSS_BUFFER', pct: 0.40 },
  { bucket: 'RESERVES', pct: 0.30 },
  { bucket: 'STABILIZATION', pct: 0.20 },
  { bucket: 'GROWTH', pct: 0.10 },
];

const WATERFALL_NORMAL: WaterfallAllocation[] = [
  { bucket: 'LOSS_BUFFER', pct: 0.20 },
  { bucket: 'RESERVES', pct: 0.20 },
  { bucket: 'STABILIZATION', pct: 0.15 },
  { bucket: 'YIELD', pct: 0.25 },
  { bucket: 'GROWTH', pct: 0.20 },
];

const WATERFALL_CAUTION: WaterfallAllocation[] = [
  { bucket: 'LOSS_BUFFER', pct: 0.25 },
  { bucket: 'RESERVES', pct: 0.25 },
  { bucket: 'STABILIZATION', pct: 0.20 },
  { bucket: 'YIELD', pct: 0.20 },
  { bucket: 'GROWTH', pct: 0.10 },
];

const WATERFALL_DEFENSIVE: WaterfallAllocation[] = [
  { bucket: 'LOSS_BUFFER', pct: 0.35 },
  { bucket: 'RESERVES', pct: 0.35 },
  { bucket: 'STABILIZATION', pct: 0.30 },
];

const WATERFALL_RESTRICTED: WaterfallAllocation[] = [
  { bucket: 'LOSS_BUFFER', pct: 0.40 },
  { bucket: 'RESERVES', pct: 0.30 },
  { bucket: 'STABILIZATION', pct: 0.30 },
];

const WATERFALL_EMERGENCY: WaterfallAllocation[] = [
  { bucket: 'STABILIZATION', pct: 1.00 },
];

const WATERFALL_MAP: Record<PolicyMode, WaterfallAllocation[]> = {
  BOOTSTRAP: WATERFALL_BOOTSTRAP,
  NORMAL: WATERFALL_NORMAL,
  CAUTION: WATERFALL_CAUTION,
  DEFENSIVE: WATERFALL_DEFENSIVE,
  RESTRICTED: WATERFALL_RESTRICTED,
  EMERGENCY: WATERFALL_EMERGENCY,
};

export function getWaterfall(mode: PolicyMode): WaterfallAllocation[] {
  return WATERFALL_MAP[mode];
}

export function routeInflow(
  inflowUsd: number,
  mode: PolicyMode
): Record<WaterfallBucket, number> {
  const result: Record<WaterfallBucket, number> = {
    LOSS_BUFFER: 0,
    RESERVES: 0,
    STABILIZATION: 0,
    YIELD: 0,
    GROWTH: 0,
  };

  const waterfall = getWaterfall(mode);
  for (const alloc of waterfall) {
    result[alloc.bucket] = Math.round(inflowUsd * alloc.pct * 100) / 100;
  }

  return result;
}

export function computeYieldPermission(
  stabilityScore: number,
  mode: PolicyMode
): YieldPermission {
  if (mode === 'EMERGENCY') {
    return {
      yieldAllowed: false,
      stabilityModifierFactor: 0,
      maxYieldPct: 0,
      reason: 'Yield suspended: EMERGENCY policy mode active. All inflows directed to stabilization.',
    };
  }

  if (mode === 'RESTRICTED') {
    return {
      yieldAllowed: false,
      stabilityModifierFactor: 0,
      maxYieldPct: 0,
      reason: 'Yield suspended: RESTRICTED policy mode active. Capital preservation priority.',
    };
  }

  const smf = Math.pow(stabilityScore / 100, YIELD_CONFIG.smfExponent);
  const roundedSmf = Math.round(smf * 10000) / 10000;

  if (mode === 'DEFENSIVE') {
    const maxPct = YIELD_CONFIG.maxYieldPctDefensive * roundedSmf;
    return {
      yieldAllowed: maxPct > 0.01,
      stabilityModifierFactor: roundedSmf,
      maxYieldPct: Math.round(maxPct * 10000) / 10000,
      reason: `Yield limited by stability modifier: SMF=${roundedSmf.toFixed(4)}, max yield=${(maxPct * 100).toFixed(2)}%.`,
    };
  }

  return {
    yieldAllowed: true,
    stabilityModifierFactor: roundedSmf,
    maxYieldPct: Math.round(YIELD_CONFIG.maxYieldPctNormal * roundedSmf * 10000) / 10000,
    reason: `Yield permitted at stability-adjusted rate: SMF=${roundedSmf.toFixed(4)}.`,
  };
}
