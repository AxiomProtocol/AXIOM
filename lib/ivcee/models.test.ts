import { describe, it, expect } from 'vitest';
import {
  sigmoid,
  clamp,
  normalize,
  computeProbabilityModel,
  computeStressTests,
  computeRefinanceRisk,
  computeDownsideMetrics,
  computeCapitalEfficiency,
  computeAll,
  type IVCEEInput,
} from './models';

const SAMPLE_INPUT: IVCEEInput = {
  dealId: 'test-deal-001',
  scenarioId: 'test-scenario-001',
  purchasePrice: 200000,
  arvEstimate: 280000,
  rehabBudget: 40000,
  downPaymentPct: 0.20,
  interestRate: 0.075,
  loanTermYears: 30,
  monthlyRent: 1800,
  vacancyPct: 0.08,
  propertyMgmtPct: 0.10,
  annualInsurance: 1800,
  annualTaxes: 3600,
  annualCapex: 2000,
  annualMaintenance: 2000,
  noi: 10485,
  capRate: 0.0524,
  cashOnCash: -0.0328,
  dscr: 0.78,
  monthlyCashFlow: -244.99,
  annualCashFlow: -2939.88,
  rehabRoi: 0.15,
  rentToValue: 0.009,
  grm: 9.26,
  confidenceScore: 0.7,
};

describe('IVCEE Pure Functions', () => {
  describe('sigmoid', () => {
    it('returns 0.5 for input 0', () => {
      expect(sigmoid(0)).toBe(0.5);
    });

    it('returns value near 1 for large positive input', () => {
      expect(sigmoid(10)).toBeGreaterThan(0.99);
    });

    it('returns value near 0 for large negative input', () => {
      expect(sigmoid(-10)).toBeLessThan(0.01);
    });

    it('is deterministic', () => {
      expect(sigmoid(2.5)).toBe(sigmoid(2.5));
      expect(sigmoid(-1.3)).toBe(sigmoid(-1.3));
    });
  });

  describe('clamp', () => {
    it('clamps values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-1, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('normalize', () => {
    it('normalizes within range', () => {
      expect(normalize(5, 0, 10)).toBe(0.5);
      expect(normalize(0, 0, 10)).toBe(0);
      expect(normalize(10, 0, 10)).toBe(1);
    });

    it('clamps outside range', () => {
      expect(normalize(-5, 0, 10)).toBe(0);
      expect(normalize(15, 0, 10)).toBe(1);
    });

    it('handles equal min/max', () => {
      expect(normalize(5, 5, 5)).toBe(0.5);
    });
  });

  describe('computeProbabilityModel', () => {
    it('returns deterministic output for sample input', () => {
      const r1 = computeProbabilityModel(SAMPLE_INPUT);
      const r2 = computeProbabilityModel(SAMPLE_INPUT);
      expect(r1).toEqual(r2);
    });

    it('returns valid probability range', () => {
      const r = computeProbabilityModel(SAMPLE_INPUT);
      expect(r.viabilityProbability).toBeGreaterThanOrEqual(0);
      expect(r.viabilityProbability).toBeLessThanOrEqual(1);
      expect(r.failureProbability).toBeGreaterThanOrEqual(0);
      expect(r.failureProbability).toBeLessThanOrEqual(1);
    });

    it('probabilities sum to 1', () => {
      const r = computeProbabilityModel(SAMPLE_INPUT);
      expect(r.viabilityProbability + r.failureProbability).toBeCloseTo(1, 4);
    });

    it('identifies dominant risk factor', () => {
      const r = computeProbabilityModel(SAMPLE_INPUT);
      expect(['LOW_DSCR', 'NEGATIVE_CASHFLOW', 'LOW_CAP_RATE', 'LOW_CONFIDENCE']).toContain(r.dominantRiskFactor);
    });

    it('low DSCR produces low viability', () => {
      const r = computeProbabilityModel(SAMPLE_INPUT);
      expect(r.viabilityProbability).toBeLessThan(0.5);
    });

    it('high DSCR produces high viability', () => {
      const strongInput = { ...SAMPLE_INPUT, dscr: 1.8, annualCashFlow: 12000, capRate: 0.08 };
      const r = computeProbabilityModel(strongInput);
      expect(r.viabilityProbability).toBeGreaterThan(0.7);
    });
  });

  describe('computeStressTests', () => {
    it('returns exactly 4 scenarios', () => {
      const results = computeStressTests(SAMPLE_INPUT);
      expect(results).toHaveLength(4);
    });

    it('returns deterministic results', () => {
      const r1 = computeStressTests(SAMPLE_INPUT);
      const r2 = computeStressTests(SAMPLE_INPUT);
      expect(r1).toEqual(r2);
    });

    it('includes all scenario types', () => {
      const results = computeStressTests(SAMPLE_INPUT);
      const types = results.map(r => r.scenarioType);
      expect(types).toContain('RECESSION');
      expect(types).toContain('RATE_SHOCK');
      expect(types).toContain('RENT_DROP');
      expect(types).toContain('VACANCY_SHOCK');
    });

    it('survival status is SURVIVE or FAIL', () => {
      const results = computeStressTests(SAMPLE_INPUT);
      results.forEach(r => {
        expect(['SURVIVE', 'FAIL']).toContain(r.survivalStatus);
      });
    });

    it('DSCR < 1.0 means FAIL', () => {
      const results = computeStressTests(SAMPLE_INPUT);
      results.forEach(r => {
        if (r.dscrStressed < 1.0) {
          expect(r.survivalStatus).toBe('FAIL');
        }
      });
    });
  });

  describe('computeRefinanceRisk', () => {
    it('returns deterministic output', () => {
      const r1 = computeRefinanceRisk(SAMPLE_INPUT);
      const r2 = computeRefinanceRisk(SAMPLE_INPUT);
      expect(r1).toEqual(r2);
    });

    it('equity extracted is non-negative', () => {
      const r = computeRefinanceRisk(SAMPLE_INPUT);
      expect(r.equityExtracted).toBeGreaterThanOrEqual(0);
    });

    it('refinance probability is between 0 and 1', () => {
      const r = computeRefinanceRisk(SAMPLE_INPUT);
      expect(r.refinanceProbability).toBeGreaterThanOrEqual(0);
      expect(r.refinanceProbability).toBeLessThanOrEqual(1);
    });
  });

  describe('computeDownsideMetrics', () => {
    it('returns deterministic output', () => {
      const r1 = computeDownsideMetrics(SAMPLE_INPUT);
      const r2 = computeDownsideMetrics(SAMPLE_INPUT);
      expect(r1).toEqual(r2);
    });

    it('break-even rent is positive', () => {
      const r = computeDownsideMetrics(SAMPLE_INPUT);
      expect(r.breakEvenRent).toBeGreaterThan(0);
    });

    it('max safe LTV is between 0 and 1', () => {
      const r = computeDownsideMetrics(SAMPLE_INPUT);
      expect(r.maxSafeLtv).toBeGreaterThanOrEqual(0);
      expect(r.maxSafeLtv).toBeLessThanOrEqual(1);
    });
  });

  describe('computeCapitalEfficiency', () => {
    it('returns deterministic output', () => {
      const prob = computeProbabilityModel(SAMPLE_INPUT);
      const r1 = computeCapitalEfficiency(SAMPLE_INPUT, prob.viabilityProbability);
      const r2 = computeCapitalEfficiency(SAMPLE_INPUT, prob.viabilityProbability);
      expect(r1).toEqual(r2);
    });

    it('penalties are bounded 0-1', () => {
      const prob = computeProbabilityModel(SAMPLE_INPUT);
      const r = computeCapitalEfficiency(SAMPLE_INPUT, prob.viabilityProbability);
      expect(r.volatilityPenalty).toBeGreaterThanOrEqual(0);
      expect(r.volatilityPenalty).toBeLessThanOrEqual(1);
      expect(r.leveragePenalty).toBeGreaterThanOrEqual(0);
      expect(r.leveragePenalty).toBeLessThanOrEqual(1);
    });
  });

  describe('computeAll', () => {
    it('returns all 6 modules', () => {
      const result = computeAll(SAMPLE_INPUT);
      expect(result.probability).toBeDefined();
      expect(result.sensitivity).toBeDefined();
      expect(result.stressTests).toBeDefined();
      expect(result.refinanceRisk).toBeDefined();
      expect(result.downside).toBeDefined();
      expect(result.capitalEfficiency).toBeDefined();
    });

    it('is fully deterministic', () => {
      const r1 = computeAll(SAMPLE_INPUT);
      const r2 = computeAll(SAMPLE_INPUT);
      expect(r1.probability).toEqual(r2.probability);
      expect(r1.stressTests).toEqual(r2.stressTests);
      expect(r1.refinanceRisk).toEqual(r2.refinanceRisk);
      expect(r1.downside).toEqual(r2.downside);
      expect(r1.capitalEfficiency).toEqual(r2.capitalEfficiency);
      expect(r1.sensitivity.length).toBe(r2.sensitivity.length);
    });

    it('sensitivity matrix has expected row count', () => {
      const result = computeAll(SAMPLE_INPUT);
      expect(result.sensitivity.length).toBe(5 * 5 * 5 - 1);
    });
  });
});
