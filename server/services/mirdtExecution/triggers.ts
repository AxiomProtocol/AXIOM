import type {
  EntryTriggerType,
  EligibilityStatus,
  ExecutionGrade,
  PolicyMode,
  RegimeTier,
  LiquidityTier,
} from './types';

export interface EntryTriggerParams {
  currentPrice: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  signalZ: number;
  regimeTier: RegimeTier;
}

export function classifyEntryTrigger(params: EntryTriggerParams): EntryTriggerType {
  const { currentPrice, entryZoneLow, entryZoneHigh, signalZ, regimeTier } = params;

  const absZ = Math.abs(signalZ);

  if (
    entryZoneLow > 0 &&
    Math.abs(currentPrice - entryZoneLow) / entryZoneLow <= 0.005
  ) {
    return 'ZONE_EDGE';
  }

  if (
    entryZoneHigh > 0 &&
    Math.abs(currentPrice - entryZoneHigh) / entryZoneHigh <= 0.005
  ) {
    return 'ZONE_EDGE';
  }

  const outsideZone = currentPrice < entryZoneLow || currentPrice > entryZoneHigh;
  if (outsideZone && absZ > 2.0) {
    return 'BREAKOUT';
  }

  const insideZone = currentPrice >= entryZoneLow && currentPrice <= entryZoneHigh;
  if (insideZone && absZ >= 2.5 && regimeTier === 'EXPANDING') {
    return 'MEAN_DRIFT';
  }

  if (regimeTier === 'EXPANDING') {
    return 'VOL_EXPANSION';
  }

  return 'NONE';
}

export function isEntryAllowed(
  eligibility: EligibilityStatus,
  grade: ExecutionGrade,
  policyMode: PolicyMode,
  regimeTier: RegimeTier,
  liquidityTier: LiquidityTier
): boolean {
  if (eligibility !== 'ELIGIBLE') return false;
  if (!(grade === 'A' || grade === 'B')) return false;
  if (policyMode === 'EMERGENCY') return false;

  if (regimeTier === 'EXTREME') {
    return grade === 'A' && liquidityTier === 'HIGH';
  }

  return true;
}
