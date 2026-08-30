/**
 * tests/reserve-registry-phase2.test.ts
 *
 * Phase 2 — Reserve and Collateral Registry unit tests.
 *
 * Tests verify:
 *   - PLANNED assets do not count as live reserves
 *   - DISABLED/DEPRECATED assets do not count as live reserves
 *   - OPERATOR_TREASURY assets do not count as AXUSD backing
 *   - Haircuts reduce eligible reserve value correctly
 *   - Reserve sleeves aggregate correctly
 *   - USDC PSM sleeve remains separate from planned T-Bill sleeve
 *   - Invalid haircut values are rejected
 *   - Zero-address assets are rejected
 *   - Unsafe haircut values are rejected
 *   - Max allocation values are bounded (0–10000)
 *   - Registry invariants
 *   - computeEligibleValue() correctness
 *   - validateHaircutPolicy() error cases
 */

import { describe, it, expect } from 'vitest';
import {
  getApprovedReserveAssetRegistry,
  getLiveReserveAssets,
  getPlannedReserveAssets,
  getOperatorTreasuryAssets,
  getDisclosureEligibleAssets,
  getAssetsBySleeve,
  getAssetsByStatus,
  computeEligibleValue,
  validateHaircutPolicy,
} from '../lib/reserves/phase2/approvedReserveAssetRegistry';
import type { HaircutPolicy, ApprovedReserveAsset } from '../lib/reserves/phase2/types';
import { AXUSD_ELIGIBLE_SLEEVES } from '../lib/reserves/phase2/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const VALID_ADDR = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

function mockHaircut(overrides: Partial<HaircutPolicy> = {}): HaircutPolicy {
  return {
    haircutBps:           0,
    maxAllocationBps:     10_000,
    emergencyDisabled:    false,
    staleValuation:       false,
    manualReviewRequired: false,
    haircutRationale:     'Test haircut',
    ...overrides,
  };
}

// ── Registry loading ──────────────────────────────────────────────────────────

describe('Registry loads without errors', () => {
  it('getApprovedReserveAssetRegistry returns a non-empty array', () => {
    const registry = getApprovedReserveAssetRegistry();
    expect(registry).toBeDefined();
    expect(Array.isArray(registry)).toBe(true);
    expect(registry.length).toBeGreaterThan(0);
  });

  it('every asset has a non-empty id, assetSymbol, sleeve, and status', () => {
    const registry = getApprovedReserveAssetRegistry();
    for (const asset of registry) {
      expect(asset.id.length).toBeGreaterThan(0);
      expect(asset.assetSymbol.length).toBeGreaterThan(0);
      expect(asset.sleeve.length).toBeGreaterThan(0);
      expect(asset.status.length).toBeGreaterThan(0);
    }
  });

  it('no asset has both isLive=true and isPlanned=true simultaneously', () => {
    const registry = getApprovedReserveAssetRegistry();
    for (const asset of registry) {
      if (asset.isLive) {
        expect(asset.isPlanned).toBe(false);
      }
    }
  });
});

// ── PLANNED assets must never count as live reserves ─────────────────────────

describe('PLANNED assets are excluded from live reserve accounting', () => {
  it('all PLANNED assets have isLive=false', () => {
    const planned = getPlannedReserveAssets();
    for (const asset of planned) {
      expect(asset.isLive).toBe(false);
    }
  });

  it('all PLANNED assets have eligibleReserveValueUsd === 0', () => {
    const planned = getPlannedReserveAssets();
    for (const asset of planned) {
      expect(asset.eligibleReserveValueUsd).toBe(0);
    }
  });

  it('computeEligibleValue returns 0 for a PLANNED-style asset (isLive=false)', () => {
    const result = computeEligibleValue(VALID_ADDR, 1_000_000, mockHaircut(), false, 'TOKENIZED_TBILL');
    expect(result).toBe(0);
  });

  it('thBILL asset is PLANNED with zero eligible value', () => {
    const tbill = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'thBILL');
    expect(tbill).toBeDefined();
    expect(tbill!.status).toBe('PLANNED');
    expect(tbill!.isLive).toBe(false);
    expect(tbill!.eligibleReserveValueUsd).toBe(0);
  });

  it('BUIDL asset is PLANNED with zero eligible value', () => {
    const buidl = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'BUIDL');
    expect(buidl).toBeDefined();
    expect(buidl!.status).toBe('PLANNED');
    expect(buidl!.eligibleReserveValueUsd).toBe(0);
  });

  it('USDY asset is PLANNED with zero eligible value', () => {
    const usdy = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'USDY');
    expect(usdy).toBeDefined();
    expect(usdy!.status).toBe('PLANNED');
    expect(usdy!.eligibleReserveValueUsd).toBe(0);
  });
});

// ── DISABLED / DEPRECATED assets are excluded ────────────────────────────────

describe('DISABLED and DEPRECATED assets are excluded from reserve accounting', () => {
  it('computeEligibleValue returns 0 for a DISABLED-style asset (isLive=false)', () => {
    const result = computeEligibleValue(VALID_ADDR, 5_000, mockHaircut(), false, 'USDC_PSM');
    expect(result).toBe(0);
  });

  it('computeEligibleValue returns 0 for emergencyDisabled=true', () => {
    const result = computeEligibleValue(
      VALID_ADDR, 1_000_000, mockHaircut({ emergencyDisabled: true }), true, 'USDC_PSM'
    );
    expect(result).toBe(0);
  });

  it('computeEligibleValue returns 0 for staleValuation=true', () => {
    const result = computeEligibleValue(
      VALID_ADDR, 1_000_000, mockHaircut({ staleValuation: true }), true, 'USDC_PSM'
    );
    expect(result).toBe(0);
  });

  it('computeEligibleValue returns 0 for manualReviewRequired=true', () => {
    const result = computeEligibleValue(
      VALID_ADDR, 1_000_000, mockHaircut({ manualReviewRequired: true }), true, 'USDC_PSM'
    );
    expect(result).toBe(0);
  });
});

// ── OPERATOR_TREASURY assets must not count as AXUSD backing ─────────────────

describe('OPERATOR_TREASURY assets are excluded from AXUSD backing', () => {
  it('all OPERATOR_TREASURY assets have eligibleReserveValueUsd === 0', () => {
    const opAssets = getOperatorTreasuryAssets();
    expect(opAssets.length).toBeGreaterThan(0);
    for (const asset of opAssets) {
      expect(asset.eligibleReserveValueUsd).toBe(0);
    }
  });

  it('computeEligibleValue returns 0 for OPERATOR_TREASURY sleeve regardless of isLive', () => {
    const result = computeEligibleValue(VALID_ADDR, 1_000_000, mockHaircut(), true, 'OPERATOR_TREASURY');
    expect(result).toBe(0);
  });

  it('WETH is in OPERATOR_TREASURY sleeve with INTERNAL_ONLY status', () => {
    const weth = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'WETH');
    expect(weth).toBeDefined();
    expect(weth!.sleeve).toBe('OPERATOR_TREASURY');
    expect(weth!.status).toBe('INTERNAL_ONLY');
    expect(weth!.eligibleReserveValueUsd).toBe(0);
    expect(weth!.haircutPolicy.emergencyDisabled).toBe(true);
  });

  it('AXUSD protocol holdings are in OPERATOR_TREASURY sleeve and permanently excluded', () => {
    const axusd = getApprovedReserveAssetRegistry().find(a => a.id === 'axusd-protocol-holdings-internal');
    expect(axusd).toBeDefined();
    expect(axusd!.sleeve).toBe('OPERATOR_TREASURY');
    expect(axusd!.haircutPolicy.haircutBps).toBe(10_000);
    expect(axusd!.haircutPolicy.emergencyDisabled).toBe(true);
    expect(axusd!.eligibleReserveValueUsd).toBe(0);
  });

  it('OPERATOR_TREASURY sleeve is not in AXUSD_ELIGIBLE_SLEEVES', () => {
    expect(AXUSD_ELIGIBLE_SLEEVES).not.toContain('OPERATOR_TREASURY');
  });
});

// ── Haircut reduces eligible reserve value correctly ─────────────────────────

describe('Haircut model reduces eligible reserve value correctly', () => {
  it('0 bps haircut returns full gross value', () => {
    const result = computeEligibleValue(VALID_ADDR, 100_000, mockHaircut({ haircutBps: 0 }), true, 'USDC_PSM');
    expect(result).toBeCloseTo(100_000, 2);
  });

  it('500 bps haircut returns 95% of gross value', () => {
    const result = computeEligibleValue(VALID_ADDR, 100_000, mockHaircut({ haircutBps: 500 }), true, 'USDC_PSM');
    expect(result).toBeCloseTo(95_000, 2);
  });

  it('250 bps haircut returns 97.5% of gross value', () => {
    const result = computeEligibleValue(VALID_ADDR, 80_000, mockHaircut({ haircutBps: 250 }), true, 'USDC_PSM');
    expect(result).toBeCloseTo(78_000, 2);
  });

  it('10000 bps haircut (100%) returns 0', () => {
    const result = computeEligibleValue(VALID_ADDR, 1_000_000, mockHaircut({ haircutBps: 10_000 }), true, 'USDC_PSM');
    expect(result).toBeCloseTo(0, 2);
  });

  it('haircutBps values exceeding 10000 are clamped to 10000 (yields 0 eligible)', () => {
    const result = computeEligibleValue(VALID_ADDR, 100_000, mockHaircut({ haircutBps: 15_000 }), true, 'USDC_PSM');
    expect(result).toBe(0);
  });

  it('USDC has 0 bps haircut', () => {
    const usdc = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'USDC');
    expect(usdc!.haircutPolicy.haircutBps).toBe(0);
  });

  it('thBILL has a conservative haircut (250 bps)', () => {
    const tbill = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'thBILL');
    expect(tbill!.haircutPolicy.haircutBps).toBe(250);
  });

  it('PAXG sleeve has haircut (500 bps)', () => {
    const paxg = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'PAXG');
    expect(paxg!.haircutPolicy.haircutBps).toBe(500);
  });

  it('WETH has 100% haircut (10000 bps)', () => {
    const weth = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'WETH');
    expect(weth!.haircutPolicy.haircutBps).toBe(10_000);
  });
});

// ── Zero address and null gross value rejection ───────────────────────────────

describe('Invalid asset metadata is rejected', () => {
  it('computeEligibleValue returns 0 for zero address', () => {
    const result = computeEligibleValue(ZERO_ADDR, 100_000, mockHaircut(), true, 'USDC_PSM');
    expect(result).toBe(0);
  });

  it('computeEligibleValue returns 0 for empty address', () => {
    const result = computeEligibleValue('', 100_000, mockHaircut(), true, 'USDC_PSM');
    expect(result).toBe(0);
  });

  it('computeEligibleValue returns 0 for null gross value', () => {
    const result = computeEligibleValue(VALID_ADDR, null, mockHaircut(), true, 'USDC_PSM');
    expect(result).toBe(0);
  });

  it('computeEligibleValue returns 0 for zero gross value', () => {
    const result = computeEligibleValue(VALID_ADDR, 0, mockHaircut(), true, 'USDC_PSM');
    expect(result).toBe(0);
  });

  it('computeEligibleValue returns 0 for negative gross value', () => {
    const result = computeEligibleValue(VALID_ADDR, -1000, mockHaircut(), true, 'USDC_PSM');
    expect(result).toBe(0);
  });
});

// ── validateHaircutPolicy rejects unsafe values ───────────────────────────────

describe('validateHaircutPolicy rejects unsafe values', () => {
  it('throws for haircutBps < 0', () => {
    expect(() =>
      validateHaircutPolicy(mockHaircut({ haircutBps: -1 }), 'TEST')
    ).toThrow();
  });

  it('throws for haircutBps > 10000', () => {
    expect(() =>
      validateHaircutPolicy(mockHaircut({ haircutBps: 10_001 }), 'TEST')
    ).toThrow();
  });

  it('throws for maxAllocationBps < 0', () => {
    expect(() =>
      validateHaircutPolicy(mockHaircut({ maxAllocationBps: -1 }), 'TEST')
    ).toThrow();
  });

  it('throws for maxAllocationBps > 10000', () => {
    expect(() =>
      validateHaircutPolicy(mockHaircut({ maxAllocationBps: 10_001 }), 'TEST')
    ).toThrow();
  });

  it('does not throw for valid haircut (0 bps)', () => {
    expect(() =>
      validateHaircutPolicy(mockHaircut({ haircutBps: 0 }), 'TEST')
    ).not.toThrow();
  });

  it('does not throw for valid haircut (10000 bps)', () => {
    expect(() =>
      validateHaircutPolicy(mockHaircut({ haircutBps: 10_000 }), 'TEST')
    ).not.toThrow();
  });
});

// ── Sleeve aggregation and separation ────────────────────────────────────────

describe('Reserve sleeves aggregate correctly', () => {
  it('USDC_PSM sleeve contains USDC', () => {
    const psmAssets = getAssetsBySleeve('USDC_PSM');
    expect(psmAssets.length).toBeGreaterThan(0);
    expect(psmAssets.some(a => a.assetSymbol === 'USDC')).toBe(true);
  });

  it('TOKENIZED_TBILL sleeve contains thBILL', () => {
    const tbillAssets = getAssetsBySleeve('TOKENIZED_TBILL');
    expect(tbillAssets.length).toBeGreaterThan(0);
    expect(tbillAssets.some(a => a.assetSymbol === 'thBILL')).toBe(true);
  });

  it('USDC_PSM and TOKENIZED_TBILL sleeves are disjoint (no asset in both)', () => {
    const psmIds   = new Set(getAssetsBySleeve('USDC_PSM').map(a => a.id));
    const tbillIds = new Set(getAssetsBySleeve('TOKENIZED_TBILL').map(a => a.id));
    for (const id of tbillIds) {
      expect(psmIds.has(id)).toBe(false);
    }
  });

  it('AXUSD_ELIGIBLE_SLEEVES includes USDC_PSM', () => {
    expect(AXUSD_ELIGIBLE_SLEEVES).toContain('USDC_PSM');
  });

  it('AXUSD_ELIGIBLE_SLEEVES does NOT include TOKENIZED_TBILL', () => {
    expect(AXUSD_ELIGIBLE_SLEEVES).not.toContain('TOKENIZED_TBILL');
  });

  it('AXUSD_ELIGIBLE_SLEEVES does NOT include TOKENIZED_TREASURY_FUND', () => {
    expect(AXUSD_ELIGIBLE_SLEEVES).not.toContain('TOKENIZED_TREASURY_FUND');
  });

  it('AXUSD_ELIGIBLE_SLEEVES does NOT include TOKENIZED_GOLD', () => {
    expect(AXUSD_ELIGIBLE_SLEEVES).not.toContain('TOKENIZED_GOLD');
  });
});

// ── Disclosure eligibility ─────────────────────────────────────────────────────

describe('Disclosure eligibility rules', () => {
  it('USDC is disclosure-eligible', () => {
    const usdc = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'USDC');
    expect(usdc!.isDisclosureEligible).toBe(true);
  });

  it('thBILL is disclosure-eligible (shows as PLANNED on public dashboard)', () => {
    const tbill = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'thBILL');
    expect(tbill!.isDisclosureEligible).toBe(true);
  });

  it('WETH is NOT disclosure-eligible (INTERNAL_ONLY)', () => {
    const weth = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'WETH');
    expect(weth!.isDisclosureEligible).toBe(false);
  });

  it('AXUSD protocol holdings are NOT disclosure-eligible', () => {
    const axusd = getApprovedReserveAssetRegistry().find(a => a.id === 'axusd-protocol-holdings-internal');
    expect(axusd!.isDisclosureEligible).toBe(false);
  });

  it('PAXG tokenized gold sleeve is PUBLIC in Phase 4 admission', () => {
    const paxg = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'PAXG');
    expect(paxg!.disclosureStatus).toBe('PUBLIC');
    expect(paxg!.isDisclosureEligible).toBe(true);
  });
});

// ── Attestation status ────────────────────────────────────────────────────────

describe('Attestation status defaults', () => {
  it('non-PAXG assets in Phase 2 default to attestationStatus NONE', () => {
    const registry = getApprovedReserveAssetRegistry();
    for (const asset of registry) {
      if (asset.assetSymbol === 'PAXG') continue;
      expect(asset.custody.attestationStatus).toBe('NONE');
    }
  });

  it('CanonicalPSM asset has SMART_CONTRACT custody type', () => {
    const usdc = getApprovedReserveAssetRegistry().find(a => a.id === 'usdc-canonical-psm');
    expect(usdc!.custody.custodyType).toBe('SMART_CONTRACT');
  });

  it('PLANNED assets without a known custodian have UNKNOWN custody type', () => {
    const planned = getPlannedReserveAssets();
    // Most planned assets have no custody venue selected yet
    const unknownCustody = planned.filter(a => a.custody.custodyType === 'UNKNOWN');
    expect(unknownCustody.length).toBeGreaterThan(0);
  });

  it('PAXG live asset has institutional custody with CURRENT attestation', () => {
    const paxg = getApprovedReserveAssetRegistry().find(a => a.assetSymbol === 'PAXG');
    expect(paxg).toBeDefined();
    expect(paxg!.status).toBe('LIVE');
    expect(paxg!.isLive).toBe(true);
    expect(paxg!.custody.custodyType).toBe('INSTITUTIONAL_CUSTODIAN');
    expect(paxg!.custody.attestationStatus).toBe('CURRENT');
  });
});

// ── Coverage arithmetic guards ────────────────────────────────────────────────

describe('Coverage arithmetic guards', () => {
  it('sum of eligible values across PLANNED assets is 0', () => {
    const planned = getPlannedReserveAssets();
    const sum = planned.reduce((s, a) => s + a.eligibleReserveValueUsd, 0);
    expect(sum).toBe(0);
  });

  it('sum of eligible values across OPERATOR_TREASURY assets is 0', () => {
    const opAssets = getOperatorTreasuryAssets();
    const sum = opAssets.reduce((s, a) => s + a.eligibleReserveValueUsd, 0);
    expect(sum).toBe(0);
  });

  it('every INTERNAL_ONLY asset has eligibleReserveValueUsd === 0', () => {
    const internal = getAssetsByStatus('INTERNAL_ONLY');
    for (const asset of internal) {
      expect(asset.eligibleReserveValueUsd).toBe(0);
    }
  });

  it('getLiveReserveAssets() returns only LIVE status assets', () => {
    const live = getLiveReserveAssets();
    for (const asset of live) {
      expect(asset.status).toBe('LIVE');
      expect(asset.isLive).toBe(true);
    }
  });
});
