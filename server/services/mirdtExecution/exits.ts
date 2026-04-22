import type { Direction, PolicyMode } from './types';

export function checkInvalidation(
  currentPrice: number,
  invalidationPrice: number,
  direction: Direction
): boolean {
  if (direction === 'LONG') {
    return currentPrice <= invalidationPrice;
  }
  if (direction === 'SHORT') {
    return currentPrice >= invalidationPrice;
  }
  return false;
}

export function checkExpiry(expiresAt: Date): boolean {
  return new Date() >= new Date(expiresAt);
}

export function shouldEmergencyExit(policyMode: PolicyMode): boolean {
  return policyMode === 'EMERGENCY';
}
