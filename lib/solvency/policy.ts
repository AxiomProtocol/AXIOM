import type { PolicyMode } from './types';

export const POLICY_THRESHOLDS = {
  NORMAL: { coverageRatio: 1.5, reserveRatio: 0.10 },
  CAUTION: { coverageRatio: 1.0, reserveRatio: 0.05 },
  RESTRICTED: { coverageRatio: 0.5 },
  EMERGENCY: { coverageRatio: 0 },
} as const;

export function determinePolicyMode(
  coverageRatio: number,
  reserveRatio: number,
  explicitMode?: string
): PolicyMode {
  if (explicitMode === 'BOOTSTRAP') {
    return 'BOOTSTRAP';
  }

  if (
    coverageRatio >= POLICY_THRESHOLDS.NORMAL.coverageRatio &&
    reserveRatio >= POLICY_THRESHOLDS.NORMAL.reserveRatio
  ) {
    return 'NORMAL';
  }

  if (
    coverageRatio >= POLICY_THRESHOLDS.CAUTION.coverageRatio &&
    reserveRatio >= POLICY_THRESHOLDS.CAUTION.reserveRatio
  ) {
    return 'CAUTION';
  }

  if (coverageRatio >= POLICY_THRESHOLDS.RESTRICTED.coverageRatio) {
    return 'RESTRICTED';
  }

  return 'EMERGENCY';
}

export function getPolicyDescription(mode: PolicyMode): string {
  switch (mode) {
    case 'BOOTSTRAP':
      return 'Protocol initialization phase. Metrics are informational only. No stabilization actions are active.';
    case 'NORMAL':
      return 'Reserve and coverage ratios are within target thresholds. Standard operations apply with routine monitoring.';
    case 'CAUTION':
      return 'One or more metrics have crossed advisory thresholds. Enhanced monitoring is active. No restrictions on operations.';
    case 'RESTRICTED':
      return 'Metrics have breached intervention thresholds. Certain operations may be limited. Capital deployment is paused pending review.';
    case 'EMERGENCY':
      return 'Critical threshold breach. All non-essential operations are suspended. Governance intervention is required.';
  }
}

export function getPolicyColor(mode: PolicyMode): string {
  switch (mode) {
    case 'BOOTSTRAP':
      return 'dl-gray';
    case 'NORMAL':
      return 'dl-forest';
    case 'CAUTION':
      return 'dl-gold';
    case 'RESTRICTED':
      return 'dl-error';
    case 'EMERGENCY':
      return 'dl-error';
  }
}
