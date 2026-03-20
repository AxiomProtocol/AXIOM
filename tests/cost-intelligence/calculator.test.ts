import { describe, it, expect } from 'vitest';
import {
  calculateLineItem,
  calculateContingencyLine,
  calculateSoftCostLine,
  computeEstimateRange,
  type CalculatorInput,
} from '../../server/services/cost-intelligence/calculator';
import type { CostItem, ScopeItem } from '../../lib/cost-intelligence/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_KITCHEN_ITEM: CostItem = {
  id: 'bench-kitchen-1',
  systemKey: 'kitchen',
  systemLabel: 'Kitchen',
  conditionLevel: 'medium_rehab',
  description: 'Kitchen medium rehab',
  costUnit: 'per_unit',
  costLow: 4500,
  costMid: 7000,
  costHigh: 11000,
  propertyType: 'multifamily',
  region: 'NATIONAL',
  source: 'craftsman_local',
  confidence: 0.82,
};

const MOCK_FLOORING_ITEM: CostItem = {
  id: 'bench-flooring-1',
  systemKey: 'flooring',
  systemLabel: 'Flooring',
  conditionLevel: 'medium_rehab',
  description: 'Flooring replace',
  costUnit: 'per_sqft',
  costLow: 4,
  costMid: 6,
  costHigh: 9,
  propertyType: 'multifamily',
  region: 'NATIONAL',
  source: 'craftsman_local',
  confidence: 0.82,
};

const MOCK_SCOPE: ScopeItem = {
  id: 'scope-1',
  estimateId: 'est-abc123',
  trade: 'Carpentry/Finishes',
  itemName: 'Kitchen medium rehab',
  quantity: 1,
  unit: 'per_unit',
  condition: 'medium_rehab',
  repairOrReplace: 'replace',
  appliesToAllUnits: true,
  wasteFactor: 0.05,
  contingencyFactor: 0.10,
};

const BASE_INPUT: CalculatorInput = {
  scopeItem: MOCK_SCOPE,
  costItem: MOCK_KITCHEN_ITEM,
  totalUnits: 4,
  avgUnitSqft: 850,
  regionalFactor: 0.90,
  laborAdjPct: 0,
  materialAdjPct: 0,
};

// ---------------------------------------------------------------------------
// calculateLineItem
// ---------------------------------------------------------------------------

describe('calculateLineItem', () => {
  it('returns a line item for a per_unit kitchen scope applied to all units', () => {
    const { lineItem, effectiveQuantity } = calculateLineItem(BASE_INPUT);
    expect(effectiveQuantity).toBe(4);
    expect(lineItem.trade).toBe('Kitchen');
    expect(lineItem.quantity).toBe(4);
    expect(lineItem.unit).toBe('per_unit');
    expect(lineItem.isContingency).toBe(false);
    expect(lineItem.isSoftCost).toBe(false);
  });

  it('applies 40% labor split to kitchen system', () => {
    const { lineItem } = calculateLineItem(BASE_INPUT);
    const laborRatio = lineItem.subtotalLabor / lineItem.subtotalPreAdj;
    expect(laborRatio).toBeCloseTo(0.40, 2);
  });

  it('applies regional factor to subtotal', () => {
    const { lineItem } = calculateLineItem(BASE_INPUT);
    const expectedPreAdj = 7000 * 4;
    const expectedPostRegional = expectedPreAdj * 0.90;
    expect(lineItem.subtotalPreAdj).toBeCloseTo(expectedPreAdj, 0);
    expect(lineItem.lineTotal).toBeGreaterThan(expectedPostRegional);
  });

  it('adds waste on top of regional-adjusted subtotal', () => {
    const { lineItem } = calculateLineItem(BASE_INPUT);
    const preAdj = lineItem.subtotalPreAdj;
    const regional = preAdj * 0.90;
    const waste = regional * 0.05;
    expect(lineItem.wasteTotal).toBeCloseTo(waste, 0);
    expect(lineItem.lineTotal).toBeCloseTo(regional + waste, 0);
  });

  it('correctly resolves per_sqft quantity from per_unit scope when appliesToAllUnits', () => {
    const sqftScope: ScopeItem = { ...MOCK_SCOPE, unit: 'per_unit', appliesToAllUnits: true };
    const sqftInput: CalculatorInput = { ...BASE_INPUT, scopeItem: sqftScope, costItem: MOCK_FLOORING_ITEM };
    const { effectiveQuantity } = calculateLineItem(sqftInput);
    expect(effectiveQuantity).toBe(4 * 850);
  });

  it('applies laborAdjPct correctly', () => {
    const adjusted: CalculatorInput = { ...BASE_INPUT, laborAdjPct: 0.10 };
    const { lineItem: base } = calculateLineItem(BASE_INPUT);
    const { lineItem: adj } = calculateLineItem(adjusted);
    expect(adj.subtotalLabor).toBeGreaterThan(base.subtotalLabor);
  });

  it('applies materialAdjPct correctly', () => {
    const adjusted: CalculatorInput = { ...BASE_INPUT, materialAdjPct: 0.15 };
    const { lineItem: base } = calculateLineItem(BASE_INPUT);
    const { lineItem: adj } = calculateLineItem(adjusted);
    expect(adj.subtotalMaterial).toBeGreaterThan(base.subtotalMaterial);
  });

  it('costLow < lineTotal < costHigh', () => {
    const { lineItem } = calculateLineItem(BASE_INPUT);
    expect(lineItem.costLow).toBeLessThan(lineItem.lineTotal);
    expect(lineItem.lineTotal).toBeLessThan(lineItem.costHigh);
  });

  it('stores assumptions_json with expected keys', () => {
    const { lineItem } = calculateLineItem(BASE_INPUT);
    expect(lineItem.assumptionsJson).toMatchObject({
      laborSplit: expect.any(Number),
      materialSplit: expect.any(Number),
      wasteFactor: 0.05,
      effectiveQuantity: 4,
      totalUnits: 4,
    });
  });

  it('returns zero equipment costs', () => {
    const { lineItem } = calculateLineItem(BASE_INPUT);
    expect(lineItem.unitEquipmentCost).toBe(0);
    expect(lineItem.subtotalEquipment).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateContingencyLine
// ---------------------------------------------------------------------------

describe('calculateContingencyLine', () => {
  it('produces correct contingency at 10%', () => {
    const line = calculateContingencyLine('est-1', 50000, 0.10);
    expect(line.lineTotal).toBe(5000);
    expect(line.isContingency).toBe(true);
    expect(line.isSoftCost).toBe(false);
  });

  it('produces zero contingency for zero hard cost', () => {
    const line = calculateContingencyLine('est-1', 0, 0.10);
    expect(line.lineTotal).toBe(0);
  });

  it('costLow < lineTotal < costHigh', () => {
    const line = calculateContingencyLine('est-1', 50000, 0.10);
    expect(line.costLow).toBeLessThan(line.lineTotal);
    expect(line.lineTotal).toBeLessThan(line.costHigh);
  });

  it('uses flat unit with quantity 1', () => {
    const line = calculateContingencyLine('est-1', 50000, 0.10);
    expect(line.unit).toBe('flat');
    expect(line.quantity).toBe(1);
  });

  it('stores pct and base in assumptionsJson', () => {
    const line = calculateContingencyLine('est-1', 50000, 0.10);
    expect(line.assumptionsJson).toEqual({ pct: 0.10, base: 50000 });
  });
});

// ---------------------------------------------------------------------------
// calculateSoftCostLine
// ---------------------------------------------------------------------------

describe('calculateSoftCostLine', () => {
  it('produces correct soft cost at 5%', () => {
    const line = calculateSoftCostLine('est-1', 50000, 0.05);
    expect(line.lineTotal).toBe(2500);
    expect(line.isSoftCost).toBe(true);
    expect(line.isContingency).toBe(false);
  });

  it('description contains pct', () => {
    const line = calculateSoftCostLine('est-1', 50000, 0.05);
    expect(line.description).toContain('5%');
  });
});

// ---------------------------------------------------------------------------
// computeEstimateRange
// ---------------------------------------------------------------------------

describe('computeEstimateRange', () => {
  it('baseline equals sum of hard line totals', () => {
    const { lineItem: l1 } = calculateLineItem(BASE_INPUT);
    const contLine = calculateContingencyLine('est-1', l1.lineTotal, 0.10);
    const allLines = [l1, contLine];
    const range = computeEstimateRange(allLines);
    expect(range.baseline).toBeCloseTo(l1.lineTotal, 0);
  });

  it('conservative is 15% above baseline', () => {
    const { lineItem: l1 } = calculateLineItem(BASE_INPUT);
    const range = computeEstimateRange([l1]);
    expect(range.conservative).toBeCloseTo(range.baseline * 1.15, 0);
  });

  it('aggressive is 10% below baseline', () => {
    const { lineItem: l1 } = calculateLineItem(BASE_INPUT);
    const range = computeEstimateRange([l1]);
    expect(range.aggressive).toBeCloseTo(range.baseline * 0.9, 0);
  });

  it('confidenceWeightedLow is sum of individual costLow values (hard only)', () => {
    const { lineItem: l1 } = calculateLineItem(BASE_INPUT);
    const range = computeEstimateRange([l1]);
    expect(range.confidenceWeightedLow).toBeCloseTo(l1.costLow, 0);
  });

  it('returns zero baseline for empty input', () => {
    const range = computeEstimateRange([]);
    expect(range.baseline).toBe(0);
    expect(range.conservative).toBe(0);
  });
});
