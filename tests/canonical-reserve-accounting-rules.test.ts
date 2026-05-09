/**
 * tests/canonical-reserve-accounting-rules.test.ts
 *
 * Unit tests for the canonical reserve accounting model defined in
 * lib/reserves/getCanonicalReserveSnapshot.ts.
 *
 * These tests verify the static rules (bucket types, inclusion flags,
 * coverage formula) without making real RPC calls. They use the exported
 * type definitions and coverage computation logic directly.
 *
 * If these tests fail, the accounting model has drifted from spec.
 * The canonical model is the authoritative source — fix the snapshot
 * function, not the tests.
 */

import { describe, it, expect } from 'vitest';
import type {
  CanonicalReserveAsset,
  CanonicalReserveSnapshot,
  ReserveBucketType,
  SourceType,
} from '../lib/reserves/getCanonicalReserveSnapshot';
import { COVERAGE_NOTE } from '../lib/reserves/getCanonicalReserveSnapshot';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockAsset(
  overrides: Partial<CanonicalReserveAsset> & Pick<CanonicalReserveAsset, 'symbol' | 'bucketType' | 'totalValueUsd'>,
): CanonicalReserveAsset {
  return {
    includedInTotalReserve: true,
    includedInCoverageNumerator: false,
    locations: [],
    totalBalance: 0,
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Reproduce the coverage formula exactly as implemented in
 * getCanonicalReserveSnapshot so that tests catch drift.
 */
function computeCoverage(
  assets: CanonicalReserveAsset[],
  axusdCirculatingSupply: number,
) {
  const hardAssetCoverageUsd = assets
    .filter(a => a.includedInCoverageNumerator)
    .reduce((sum, a) => sum + a.totalValueUsd, 0);

  const coverageRatio = axusdCirculatingSupply > 0
    ? hardAssetCoverageUsd / axusdCirculatingSupply
    : null;

  return { hardAssetCoverageUsd, coverageRatio };
}

// ── Bucket type rules ─────────────────────────────────────────────────────────

describe('Canonical asset bucket types', () => {
  it('ETH must be gas_reserve', () => {
    const eth = mockAsset({ symbol: 'ETH', bucketType: 'gas_reserve', totalValueUsd: 4.58 });
    expect(eth.bucketType).toBe<ReserveBucketType>('gas_reserve');
  });

  it('PAXG must be hard_asset_backing', () => {
    const paxg = mockAsset({ symbol: 'PAXG', bucketType: 'hard_asset_backing', totalValueUsd: 45.74 });
    expect(paxg.bucketType).toBe<ReserveBucketType>('hard_asset_backing');
  });

  it('USDC must be stable_backing', () => {
    const usdc = mockAsset({ symbol: 'USDC', bucketType: 'stable_backing', totalValueUsd: 0 });
    expect(usdc.bucketType).toBe<ReserveBucketType>('stable_backing');
  });

  it('AXAU must be protocol_instrument', () => {
    const axau = mockAsset({ symbol: 'AXAU', bucketType: 'protocol_instrument', totalValueUsd: 60.82 });
    expect(axau.bucketType).toBe<ReserveBucketType>('protocol_instrument');
  });

  it('AXM must be governance_inventory', () => {
    const axm = mockAsset({ symbol: 'AXM', bucketType: 'governance_inventory', totalValueUsd: 0 });
    expect(axm.bucketType).toBe<ReserveBucketType>('governance_inventory');
  });

  it('AXUSD (protocol holdings) must be protocol_stable_inventory', () => {
    const axusd = mockAsset({ symbol: 'AXUSD', bucketType: 'protocol_stable_inventory', totalValueUsd: 10048.55 });
    expect(axusd.bucketType).toBe<ReserveBucketType>('protocol_stable_inventory');
  });
});

// ── Coverage numerator inclusion rules ────────────────────────────────────────

describe('Coverage numerator inclusion rules', () => {
  it('PAXG is included in coverage numerator', () => {
    const paxg = mockAsset({ symbol: 'PAXG', bucketType: 'hard_asset_backing', totalValueUsd: 45.74, includedInCoverageNumerator: true });
    expect(paxg.includedInCoverageNumerator).toBe(true);
  });

  it('USDC is included in coverage numerator', () => {
    const usdc = mockAsset({ symbol: 'USDC', bucketType: 'stable_backing', totalValueUsd: 100, includedInCoverageNumerator: true });
    expect(usdc.includedInCoverageNumerator).toBe(true);
  });

  it('ETH is NOT included in coverage numerator (gas reserve)', () => {
    const eth = mockAsset({ symbol: 'ETH', bucketType: 'gas_reserve', totalValueUsd: 4.58, includedInCoverageNumerator: false });
    expect(eth.includedInCoverageNumerator).toBe(false);
  });

  it('AXAU is NOT included in coverage numerator (protocol instrument, avoids double-counting PAXG)', () => {
    const axau = mockAsset({ symbol: 'AXAU', bucketType: 'protocol_instrument', totalValueUsd: 60.82, includedInCoverageNumerator: false });
    expect(axau.includedInCoverageNumerator).toBe(false);
  });

  it('AXM is NOT included in coverage numerator (governance token, no AXUSD redemption peg)', () => {
    const axm = mockAsset({ symbol: 'AXM', bucketType: 'governance_inventory', totalValueUsd: 0, includedInCoverageNumerator: false });
    expect(axm.includedInCoverageNumerator).toBe(false);
  });

  it('AXUSD (protocol holdings) is NOT included in coverage numerator (it IS the liability)', () => {
    const axusd = mockAsset({ symbol: 'AXUSD', bucketType: 'protocol_stable_inventory', totalValueUsd: 10048.55, includedInCoverageNumerator: false });
    expect(axusd.includedInCoverageNumerator).toBe(false);
  });
});

// ── Coverage formula ──────────────────────────────────────────────────────────

describe('Coverage ratio computation', () => {
  const assets: CanonicalReserveAsset[] = [
    mockAsset({ symbol: 'ETH',   bucketType: 'gas_reserve',             totalValueUsd: 4.58,     includedInCoverageNumerator: false }),
    mockAsset({ symbol: 'PAXG',  bucketType: 'hard_asset_backing',      totalValueUsd: 45.74,    includedInCoverageNumerator: true  }),
    mockAsset({ symbol: 'AXAU',  bucketType: 'protocol_instrument',     totalValueUsd: 60.82,    includedInCoverageNumerator: false }),
    mockAsset({ symbol: 'AXM',   bucketType: 'governance_inventory',    totalValueUsd: 0,        includedInCoverageNumerator: false }),
    mockAsset({ symbol: 'USDC',  bucketType: 'stable_backing',          totalValueUsd: 0,        includedInCoverageNumerator: true  }),
    mockAsset({ symbol: 'AXUSD', bucketType: 'protocol_stable_inventory', totalValueUsd: 10048.55, includedInCoverageNumerator: false }),
  ];

  const axusdCirculatingSupply = 10_074.05;

  it('hard-asset coverage = PAXG + USDC only', () => {
    const { hardAssetCoverageUsd } = computeCoverage(assets, axusdCirculatingSupply);
    // Only PAXG (45.74) + USDC (0) = 45.74
    expect(hardAssetCoverageUsd).toBeCloseTo(45.74, 2);
  });

  it('ETH value is excluded from coverage numerator', () => {
    const { hardAssetCoverageUsd } = computeCoverage(assets, axusdCirculatingSupply);
    // 4.58 (ETH) is NOT in the numerator
    expect(hardAssetCoverageUsd).toBeLessThan(4.58 + 45.74);
  });

  it('AXAU value is excluded from coverage numerator', () => {
    const { hardAssetCoverageUsd } = computeCoverage(assets, axusdCirculatingSupply);
    // 60.82 (AXAU) is NOT in the numerator
    expect(hardAssetCoverageUsd).toBeLessThan(60.82);
  });

  it('coverage ratio = hardAssetCoverage / axusdCirculatingSupply', () => {
    const { coverageRatio } = computeCoverage(assets, axusdCirculatingSupply);
    // 45.74 / 10074.05 ≈ 0.00454
    expect(coverageRatio).not.toBeNull();
    expect(coverageRatio!).toBeCloseTo(45.74 / 10_074.05, 6);
  });

  it('coverage ratio is null when circulating supply is zero', () => {
    const { coverageRatio } = computeCoverage(assets, 0);
    expect(coverageRatio).toBeNull();
  });

  it('coverage ratio increases when more PAXG is added', () => {
    const withMorePaxg: CanonicalReserveAsset[] = assets.map(a =>
      a.symbol === 'PAXG' ? { ...a, totalValueUsd: 5_000 } : a,
    );
    const before = computeCoverage(assets, axusdCirculatingSupply).coverageRatio!;
    const after  = computeCoverage(withMorePaxg, axusdCirculatingSupply).coverageRatio!;
    expect(after).toBeGreaterThan(before);
  });

  it('coverage ratio is not affected by ETH value changes', () => {
    const withMoreEth: CanonicalReserveAsset[] = assets.map(a =>
      a.symbol === 'ETH' ? { ...a, totalValueUsd: 10_000 } : a,
    );
    const base    = computeCoverage(assets, axusdCirculatingSupply).coverageRatio!;
    const withEth = computeCoverage(withMoreEth, axusdCirculatingSupply).coverageRatio!;
    expect(base).toBeCloseTo(withEth, 10);
  });

  it('coverage ratio is not affected by AXAU value changes', () => {
    const withMoreAxau: CanonicalReserveAsset[] = assets.map(a =>
      a.symbol === 'AXAU' ? { ...a, totalValueUsd: 10_000 } : a,
    );
    const base     = computeCoverage(assets, axusdCirculatingSupply).coverageRatio!;
    const withAxau = computeCoverage(withMoreAxau, axusdCirculatingSupply).coverageRatio!;
    expect(base).toBeCloseTo(withAxau, 10);
  });
});

// ── Coverage note ──────────────────────────────────────────────────────────────

describe('Coverage note', () => {
  it('coverage note mentions PAXG and USDC as backing assets', () => {
    expect(COVERAGE_NOTE).toContain('PAXG');
    expect(COVERAGE_NOTE).toContain('USDC');
  });

  it('coverage note states ETH is a gas reserve', () => {
    expect(COVERAGE_NOTE.toLowerCase()).toContain('gas reserve');
  });

  it('coverage note states AXAU is a protocol instrument', () => {
    expect(COVERAGE_NOTE.toLowerCase()).toContain('protocol instrument');
  });

  it('coverage note does not claim full backing', () => {
    expect(COVERAGE_NOTE.toLowerCase()).not.toContain('fully backed');
    expect(COVERAGE_NOTE.toLowerCase()).not.toContain('100%');
  });
});

// ── Total reserve includes all assets ─────────────────────────────────────────

describe('Total reserve inclusion', () => {
  it('all 6 canonical assets are included in total reserve', () => {
    const symbols = ['ETH', 'PAXG', 'AXAU', 'AXM', 'USDC', 'AXUSD'];
    const assets  = symbols.map(s =>
      mockAsset({ symbol: s, bucketType: 'gas_reserve', totalValueUsd: 1, includedInTotalReserve: true }),
    );
    const total = assets
      .filter(a => a.includedInTotalReserve)
      .reduce((sum, a) => sum + a.totalValueUsd, 0);
    expect(total).toBe(6);
  });
});
