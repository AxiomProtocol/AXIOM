import { describe, it, expect } from 'vitest';
import {
  inferSystemKey,
  inferConditionLevel,
  computeMappingConfidence,
} from '../../server/services/cost-intelligence/mapping';
import type { ScopeItem, MappingResult, CostItem } from '../../lib/cost-intelligence/types';

// ---------------------------------------------------------------------------
// inferSystemKey
// ---------------------------------------------------------------------------

describe('inferSystemKey', () => {
  const cases: Array<[string, string, string | null]> = [
    ['Kitchen medium rehab', 'Carpentry/Finishes', 'kitchen'],
    ['bathroom full replace', 'Plumbing', 'bathroom'],
    ['replace LVP flooring', 'Flooring', 'flooring'],
    ['HVAC full system replace', 'Mechanical/HVAC', 'hvac'],
    ['Interior paint', 'Painting', 'paint'],
    ['windows full replace', 'Windows/Doors', 'windows'],
    ['roof replacement shingles', 'Roofing', 'roof'],
    ['electrical rewire panel', 'Electrical', 'electrical'],
    ['water heater replacement', 'Plumbing', 'plumbing'],
    ['parking lot asphalt', 'Site Work', 'site_parking'],
    ['common area lobby refresh', 'Finishes', 'common_area'],
    ['driveway concrete', 'Site Work', 'site_parking'],
    ['Unknown widget xyz', '', null],
  ];

  for (const [itemName, trade, expected] of cases) {
    it(`maps "${itemName}" → ${expected ?? 'null'}`, () => {
      expect(inferSystemKey(itemName, trade)).toBe(expected);
    });
  }

  it('uses the longest synonym match when multiple systems could match', () => {
    const key = inferSystemKey('exterior door replace', 'Windows/Doors');
    expect(['exterior', 'doors']).toContain(key);
  });

  it('is case-insensitive', () => {
    expect(inferSystemKey('KITCHEN CABINET REPLACE', 'Carpentry')).toBe('kitchen');
  });

  it('returns null for empty string', () => {
    expect(inferSystemKey('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// inferConditionLevel
// ---------------------------------------------------------------------------

describe('inferConditionLevel', () => {
  const baseScope = (overrides: Partial<ScopeItem>): ScopeItem => ({
    estimateId: 'est-1',
    trade: 'General',
    itemName: '',
    quantity: 1,
    unit: 'per_unit',
    repairOrReplace: 'replace',
    appliesToAllUnits: true,
    wasteFactor: 0.05,
    contingencyFactor: 0.10,
    ...overrides,
  });

  it('uses explicit condition field when present', () => {
    const scope = baseScope({ condition: 'light_rehab', itemName: 'full gut' });
    expect(inferConditionLevel(scope)).toBe('light_rehab');
  });

  it('infers light_rehab from "cosmetic"', () => {
    expect(inferConditionLevel(baseScope({ itemName: 'cosmetic paint touch-up' }))).toBe('light_rehab');
  });

  it('infers light_rehab from "patch"', () => {
    expect(inferConditionLevel(baseScope({ itemName: 'patch and paint' }))).toBe('light_rehab');
  });

  it('infers full_replace from "gut"', () => {
    expect(inferConditionLevel(baseScope({ itemName: 'gut rehab full' }))).toBe('full_replace');
  });

  it('infers full_replace from "demolish"', () => {
    expect(inferConditionLevel(baseScope({ itemName: 'demolish and rebuild' }))).toBe('full_replace');
  });

  it('infers medium_rehab from "partial"', () => {
    expect(inferConditionLevel(baseScope({ itemName: 'partial update kitchen' }))).toBe('medium_rehab');
  });

  it('defaults to medium_rehab when no cues', () => {
    expect(inferConditionLevel(baseScope({ itemName: 'sprinkler head' }))).toBe('medium_rehab');
  });

  it('uses severity field when no keyword match', () => {
    expect(inferConditionLevel(baseScope({ itemName: 'xyz', severity: 'high' }))).toBe('full_replace');
    expect(inferConditionLevel(baseScope({ itemName: 'xyz', severity: 'low' }))).toBe('light_rehab');
    expect(inferConditionLevel(baseScope({ itemName: 'xyz', severity: 'medium' }))).toBe('medium_rehab');
    expect(inferConditionLevel(baseScope({ itemName: 'xyz', severity: 'critical' }))).toBe('full_replace');
  });
});

// ---------------------------------------------------------------------------
// computeMappingConfidence
// ---------------------------------------------------------------------------

describe('computeMappingConfidence', () => {
  const makeMockItem = (): CostItem => ({
    id: 'x', systemKey: 'kitchen', systemLabel: 'Kitchen',
    conditionLevel: 'medium_rehab', description: 'Kitchen',
    costUnit: 'per_unit', costLow: 4500, costMid: 7000, costHigh: 11000,
    propertyType: 'both', region: 'NATIONAL', source: 'craftsman_local', confidence: 0.82,
  });

  it('returns 0 for empty results', () => {
    expect(computeMappingConfidence([])).toBe(0);
  });

  it('returns < 1 when all items are mapped with perfect confidence', () => {
    const results: MappingResult[] = [
      { scopeItemId: 'a', costItem: makeMockItem(), confidence: 1.0, method: 'auto', matchReason: 'x', alternatives: [] },
      { scopeItemId: 'b', costItem: makeMockItem(), confidence: 1.0, method: 'auto', matchReason: 'x', alternatives: [] },
    ];
    expect(computeMappingConfidence(results)).toBeLessThanOrEqual(1.0);
    expect(computeMappingConfidence(results)).toBeGreaterThan(0.9);
  });

  it('penalizes unmapped items', () => {
    const full: MappingResult[] = [
      { scopeItemId: 'a', costItem: makeMockItem(), confidence: 0.88, method: 'auto', matchReason: 'x', alternatives: [] },
    ];
    const partial: MappingResult[] = [
      { scopeItemId: 'a', costItem: makeMockItem(), confidence: 0.88, method: 'auto', matchReason: 'x', alternatives: [] },
      { scopeItemId: 'b', costItem: null, confidence: 0, method: 'auto', matchReason: 'no match', alternatives: [] },
    ];
    expect(computeMappingConfidence(full)).toBeGreaterThan(computeMappingConfidence(partial));
  });

  it('returns value between 0 and 1', () => {
    const results: MappingResult[] = [
      { scopeItemId: 'a', costItem: makeMockItem(), confidence: 0.65, method: 'auto', matchReason: 'x', alternatives: [] },
      { scopeItemId: 'b', costItem: null, confidence: 0, method: 'auto', matchReason: 'no match', alternatives: [] },
    ];
    const conf = computeMappingConfidence(results);
    expect(conf).toBeGreaterThanOrEqual(0);
    expect(conf).toBeLessThanOrEqual(1);
  });
});
