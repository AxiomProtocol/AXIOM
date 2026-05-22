import { describe, expect, it } from 'vitest';
import {
  applyAllocationPercentages,
  calcBlendedApy,
  deriveDeployedUsdcFromPositions,
  strategyRawAssetValueToUsd,
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

  it('converts 6-decimal strategy asset balances to USD', () => {
    const value = strategyRawAssetValueToUsd(125_000_000n, 6, 1);
    expect(value).toBe(125);
  });

  it('does not inflate 18-decimal WETH strategy balances as 6-decimal USDC', () => {
    const rawWeth = 100_400_011_745_460_000n; // 0.10040001174546 WETH
    const value = strategyRawAssetValueToUsd(rawWeth, 18, 4_000);

    expect(value).toBeCloseTo(401.60004698184, 10);
    expect(value).toBeLessThan(1_000);
  });

  it('excludes strategy values when no USD price is available', () => {
    const value = strategyRawAssetValueToUsd(100_400_011_745_460_000n, 18, null);
    expect(value).toBe(0);
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
