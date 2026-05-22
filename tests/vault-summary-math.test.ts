import { describe, expect, it } from 'vitest';
import {
  applyAllocationPercentages,
  calcBlendedApy,
  deriveDeployedUsdcFromPositions,
  type StrategyPosition,
} from '../lib/treasury/vault/vaultService';

function pos(overrides: Partial<StrategyPosition>): StrategyPosition {
  return {
    address: '0x1',
    name: 'strategy',
    currentValueUsdc: 0,
    principalUsdc: 0,
    unrealizedYieldUsdc: 0,
    allocationPct: 0,
    lastRebalancedAt: null,
    apyEstimatePct: null,
    ...overrides,
  };
}

describe('vault summary math helpers', () => {
  it('derives deployed capital from live strategy positions', () => {
    const positions = [
      pos({ currentValueUsdc: 0, principalUsdc: 120 }),
      pos({ currentValueUsdc: 180, principalUsdc: 175 }),
    ];

    const deployed = deriveDeployedUsdcFromPositions(positions, 0);
    expect(deployed).toBe(300);
  });

  it('falls back to on-chain deployed figure when no position capital is present', () => {
    const deployed = deriveDeployedUsdcFromPositions([pos({}), pos({})], 42.5);
    expect(deployed).toBe(42.5);
  });

  it('applies allocation percentages from derived total', () => {
    const allocations = applyAllocationPercentages(
      [
        pos({ currentValueUsdc: 75, principalUsdc: 70 }),
        pos({ currentValueUsdc: 25, principalUsdc: 40 }),
      ],
      115,
    );

    expect(allocations[0].allocationPct).toBe(65.2);
    expect(allocations[1].allocationPct).toBe(34.8);
  });

  it('computes blended APY as capital-weighted average', () => {
    const blended = calcBlendedApy(
      [
        pos({ currentValueUsdc: 200, principalUsdc: 180, apyEstimatePct: 3 }),
        pos({ currentValueUsdc: 100, principalUsdc: 120, apyEstimatePct: 6 }),
        pos({ currentValueUsdc: 50, principalUsdc: 50, apyEstimatePct: null }),
      ],
      370,
    );

    expect(blended).toBeCloseTo((200 * 3 + 120 * 6) / (200 + 120), 6);
  });
});
