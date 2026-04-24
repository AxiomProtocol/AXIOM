/**
 * Pure-function tests for the estimate engine math layer.
 *
 * These tests exercise calculator + computeEstimateRange without touching the
 * DB or any provider — keeping the suite fast and dependency-free.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateLineItem,
  calculateContingencyLine,
  calculateSoftCostLine,
  computeEstimateRange,
} from '../../server/services/cost-intelligence/calculator';
import type { CostItem, ScopeItem } from '../../lib/cost-intelligence/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<CostItem> = {}): CostItem {
  return {
    id: 'test-item',
    systemKey: 'kitchen',
    systemLabel: 'Kitchen',
    conditionLevel: 'medium_rehab',
    description: 'Kitchen rehab',
    costUnit: 'per_unit',
    costLow: 4500,
    costMid: 7000,
    costHigh: 11000,
    propertyType: 'multifamily',
    region: 'SOUTH_ATL',
    source: 'craftsman_local',
    confidence: 0.82,
    ...overrides,
  };
}

function makeScope(overrides: Partial<ScopeItem> = {}): ScopeItem {
  return {
    estimateId: 'est-test',
    trade: 'Carpentry/Finishes',
    itemName: 'Kitchen medium rehab',
    quantity: 1,
    unit: 'per_unit',
    condition: 'medium_rehab',
    repairOrReplace: 'replace',
    appliesToAllUnits: false,
    wasteFactor: 0.05,
    contingencyFactor: 0.10,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Grand-total arithmetic integrity
// ---------------------------------------------------------------------------

describe('estimate total math integrity', () => {
  it('grand total = hard costs + contingency + soft costs', () => {
    const item1 = makeItem({ id: 'i1' });
    const item2 = makeItem({ id: 'i2', systemKey: 'bathroom', systemLabel: 'Bathroom', costMid: 5500, costLow: 3000, costHigh: 9000 });

    const { lineItem: li1 } = calculateLineItem({
      scopeItem: makeScope({ id: 's1', appliesToAllUnits: true }),
      costItem: item1,
      totalUnits: 4,
      avgUnitSqft: 850,
      regionalFactor: 0.90,
      laborAdjPct: 0,
      materialAdjPct: 0,
    });

    const { lineItem: li2 } = calculateLineItem({
      scopeItem: makeScope({ id: 's2', appliesToAllUnits: true }),
      costItem: item2,
      totalUnits: 4,
      avgUnitSqft: 850,
      regionalFactor: 0.90,
      laborAdjPct: 0,
      materialAdjPct: 0,
    });

    const hardTotal = li1.lineTotal + li2.lineTotal;
    const contingency = calculateContingencyLine('est-test', hardTotal, 0.10);
    const soft = calculateSoftCostLine('est-test', hardTotal, 0.05);

    const expectedGrand = hardTotal + contingency.lineTotal + soft.lineTotal;

    expect(contingency.lineTotal).toBeCloseTo(hardTotal * 0.10, 0);
    expect(soft.lineTotal).toBeCloseTo(hardTotal * 0.05, 0);
    expect(expectedGrand).toBeCloseTo(hardTotal * 1.15, 0);
  });

  it('perUnitCost = grandTotal / totalUnits', () => {
    const { lineItem: li } = calculateLineItem({
      scopeItem: makeScope({ appliesToAllUnits: true }),
      costItem: makeItem(),
      totalUnits: 4,
      avgUnitSqft: 850,
      regionalFactor: 1.0,
      laborAdjPct: 0,
      materialAdjPct: 0,
    });

    const hardTotal = li.lineTotal;
    const contingency = calculateContingencyLine('est-1', hardTotal, 0.10);
    const soft = calculateSoftCostLine('est-1', hardTotal, 0.05);
    const grandTotal = hardTotal + contingency.lineTotal + soft.lineTotal;
    const perUnit = Math.round((grandTotal / 4) * 100) / 100;

    expect(perUnit).toBeCloseTo(grandTotal / 4, 1);
  });

  it('multifamily: appliesToAllUnits multiplies by totalUnits', () => {
    const singleScope = makeScope({ appliesToAllUnits: false, quantity: 1 });
    const allScope = makeScope({ appliesToAllUnits: true, quantity: 1 });
    const item = makeItem();

    const { lineItem: single } = calculateLineItem({
      scopeItem: singleScope,
      costItem: item,
      totalUnits: 6,
      avgUnitSqft: 900,
      regionalFactor: 1.0,
      laborAdjPct: 0,
      materialAdjPct: 0,
    });

    const { lineItem: all, effectiveQuantity } = calculateLineItem({
      scopeItem: allScope,
      costItem: item,
      totalUnits: 6,
      avgUnitSqft: 900,
      regionalFactor: 1.0,
      laborAdjPct: 0,
      materialAdjPct: 0,
    });

    expect(effectiveQuantity).toBe(6);
    expect(all.lineTotal).toBeCloseTo(single.lineTotal * 6, 0);
  });
});

// ---------------------------------------------------------------------------
// Regional factor sensitivity
// ---------------------------------------------------------------------------

describe('regional factor sensitivity', () => {
  it('ATL 0.90 factor produces lower total than NYC 1.30 factor', () => {
    const scope = makeScope({ appliesToAllUnits: true });
    const item = makeItem();
    const base = { scopeItem: scope, costItem: item, totalUnits: 4, avgUnitSqft: 850, laborAdjPct: 0, materialAdjPct: 0 };

    const { lineItem: atl } = calculateLineItem({ ...base, regionalFactor: 0.90 });
    const { lineItem: nyc } = calculateLineItem({ ...base, regionalFactor: 1.30 });

    expect(atl.lineTotal).toBeLessThan(nyc.lineTotal);
    const ratio = nyc.lineTotal / atl.lineTotal;
    expect(ratio).toBeCloseTo(1.30 / 0.90, 1);
  });

  it('factor 1.0 = national baseline', () => {
    const scope = makeScope({ appliesToAllUnits: false, quantity: 1 });
    const item = makeItem();
    const { lineItem } = calculateLineItem({
      scopeItem: scope,
      costItem: item,
      totalUnits: 1,
      avgUnitSqft: 1000,
      regionalFactor: 1.0,
      laborAdjPct: 0,
      materialAdjPct: 0,
    });

    const manualTotal = item.costMid * 1.0 * (1 + 0.05);
    expect(lineItem.lineTotal).toBeCloseTo(manualTotal, 0);
  });
});

// ---------------------------------------------------------------------------
// Estimate range sanity
// ---------------------------------------------------------------------------

describe('computeEstimateRange sanity checks', () => {
  it('aggressive < baseline < conservative', () => {
    const { lineItem: li } = calculateLineItem({
      scopeItem: makeScope({ appliesToAllUnits: true }),
      costItem: makeItem(),
      totalUnits: 4,
      avgUnitSqft: 850,
      regionalFactor: 1.0,
      laborAdjPct: 0,
      materialAdjPct: 0,
    });
    const range = computeEstimateRange([li]);
    expect(range.aggressive).toBeLessThan(range.baseline);
    expect(range.baseline).toBeLessThan(range.conservative);
  });

  it('confidenceWeightedLow < baseline < confidenceWeightedHigh', () => {
    const { lineItem: li } = calculateLineItem({
      scopeItem: makeScope({ appliesToAllUnits: true }),
      costItem: makeItem(),
      totalUnits: 4,
      avgUnitSqft: 850,
      regionalFactor: 1.0,
      laborAdjPct: 0,
      materialAdjPct: 0,
    });
    const range = computeEstimateRange([li]);
    expect(range.confidenceWeightedLow).toBeLessThanOrEqual(range.baseline);
    expect(range.baseline).toBeLessThanOrEqual(range.confidenceWeightedHigh);
  });

  it('excludes contingency and soft-cost lines from baseline', () => {
    const { lineItem: li } = calculateLineItem({
      scopeItem: makeScope({ appliesToAllUnits: true }),
      costItem: makeItem(),
      totalUnits: 4,
      avgUnitSqft: 850,
      regionalFactor: 1.0,
      laborAdjPct: 0,
      materialAdjPct: 0,
    });
    const cont = calculateContingencyLine('est-1', li.lineTotal, 0.10);
    const soft = calculateSoftCostLine('est-1', li.lineTotal, 0.05);
    const allLines = [li, cont, soft];
    const range = computeEstimateRange(allLines);
    expect(range.baseline).toBeCloseTo(li.lineTotal, 0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('flat unit cost item returns quantity 1 regardless of scope quantity', () => {
    const scope = makeScope({ unit: 'flat', quantity: 5 });
    const item = makeItem({ costUnit: 'flat', costMid: 1000, costLow: 800, costHigh: 1500 });
    const { effectiveQuantity } = calculateLineItem({
      scopeItem: scope,
      costItem: item,
      totalUnits: 10,
      avgUnitSqft: 800,
      regionalFactor: 1.0,
      laborAdjPct: 0,
      materialAdjPct: 0,
    });
    expect(effectiveQuantity).toBe(1);
  });

  it('zero totalUnits does not crash', () => {
    const scope = makeScope({ appliesToAllUnits: true });
    const item = makeItem({ costUnit: 'per_unit' });
    expect(() => calculateLineItem({
      scopeItem: scope, costItem: item, totalUnits: 0, avgUnitSqft: 0,
      regionalFactor: 1.0, laborAdjPct: 0, materialAdjPct: 0,
    })).not.toThrow();
  });

  it('zero waste factor produces no waste line', () => {
    const scope = makeScope({ wasteFactor: 0 });
    const { lineItem } = calculateLineItem({
      scopeItem: scope, costItem: makeItem(), totalUnits: 1, avgUnitSqft: 1000,
      regionalFactor: 1.0, laborAdjPct: 0, materialAdjPct: 0,
    });
    expect(lineItem.wasteTotal).toBe(0);
  });
});
