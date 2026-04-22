import type {
  Direction,
  LiquidityTier,
  RegimeTier,
  EligibilityStatus,
  ExecutionGrade,
  PolicyMode,
  SetupInput,
} from './types';
import { SIGNAL_REJECT_Z } from './constants';

export function inferDirection(
  entryZoneLow: number,
  entryZoneHigh: number,
  invalidationPrice: number,
  signalZ: number
): Direction {
  if (invalidationPrice < entryZoneLow) return 'LONG';
  if (invalidationPrice > entryZoneHigh) return 'SHORT';
  return signalZ >= 0 ? 'LONG' : 'SHORT';
}

export function classifyLiquidityTier(
  liquidityNotes: string | null | undefined,
  volatilityEstimate: number
): LiquidityTier {
  const notes = (liquidityNotes ?? '').toLowerCase();
  if (notes.includes('thin') || notes.includes('illiquid')) {
    return 'FRAGILE';
  }
  if (volatilityEstimate >= 0.06) return 'FRAGILE';
  if (volatilityEstimate < 0.02) return 'HIGH';
  if (volatilityEstimate < 0.04) return 'MODERATE';
  if (volatilityEstimate < 0.06) return 'LOW';
  return 'FRAGILE';
}

export function classifyRegimeTier(
  volatilityEstimate: number,
  _signalZ: number
): RegimeTier {
  if (volatilityEstimate > 0.06) return 'EXTREME';
  if (volatilityEstimate > 0.03) return 'EXPANDING';
  if (volatilityEstimate > 0.01) return 'NORMAL';
  return 'LOW';
}

export function computeEligibility(
  setup: SetupInput,
  grade: ExecutionGrade,
  policyMode: PolicyMode,
  regimeTier: RegimeTier,
  liquidityTier: LiquidityTier
): { status: EligibilityStatus; reasonCodes: string[] } {
  const reasonCodes: string[] = [];
  let rejected = false;
  let wait = false;

  if (grade === 'REJECT') {
    reasonCodes.push('GRADE_REJECT');
    rejected = true;
  }

  if (policyMode === 'EMERGENCY') {
    reasonCodes.push('POLICY_EMERGENCY');
    rejected = true;
  }

  if (Math.abs(setup.signalZ) < SIGNAL_REJECT_Z) {
    reasonCodes.push('SIGNAL_TOO_WEAK');
    rejected = true;
  }

  if (liquidityTier === 'FRAGILE') {
    reasonCodes.push('LIQUIDITY_FRAGILE');
    rejected = true;
  }

  if (rejected) {
    return { status: 'REJECTED', reasonCodes };
  }

  if (grade === 'C') {
    reasonCodes.push('GRADE_C_WAIT');
    wait = true;
  }

  if (policyMode === 'RESTRICTED') {
    reasonCodes.push('POLICY_RESTRICTED');
    wait = true;
  }

  if (policyMode === 'CAUTION') {
    reasonCodes.push('POLICY_CAUTION');
    wait = true;
  }

  if (wait) {
    return { status: 'WAIT', reasonCodes };
  }

  return { status: 'ELIGIBLE', reasonCodes };
}
