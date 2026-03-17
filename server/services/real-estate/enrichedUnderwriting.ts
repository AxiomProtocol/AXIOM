/**
 * Enhanced Underwriting Integration with Field Intelligence
 * Layer 5 signals enrichment for Layer 1 Predictive Intelligence
 * 
 * This module wraps the standard underwriting engine with field intelligence adjustments
 * to improve accuracy of deal scoring when field inspection data is available.
 */

import type { UnderwritingInput, UnderwritingResult } from './underwriting';
import { computeUnderwriting, RiskFlag } from './underwriting';
import { getFieldSignalsForDeal, suggestScopeAdjustments, generateRiskFlagsFromField, FieldSignals } from '@/lib/services/FieldIntelligenceService';

export interface EnrichedUnderwritingInput extends UnderwritingInput {
  dealId?: string;
  propertyId?: string;
  useFieldIntelligence?: boolean;
}

export interface EnrichedUnderwritingResult extends UnderwritingResult {
  fieldIntelligenceApplied: boolean;
  fieldSignals?: FieldSignals;
  assumptionAdjustments?: {
    originalRehabCost: number;
    adjustedRehabCost: number;
    rationale: string;
  };
}

/**
 * Compute underwriting with optional field intelligence enrichment
 * If field inspection data is available, uses it to refine assumptions
 */
export async function computeEnrichedUnderwriting(
  input: EnrichedUnderwritingInput
): Promise<EnrichedUnderwritingResult> {
  const useField = input.useFieldIntelligence !== false;
  let fieldSignals: FieldSignals | null = null;
  let adjustedInput = { ...input };
  let assumptionAdjustments: any = null;

  // Try to load field intelligence if deal/property IDs provided
  if (useField && input.dealId && input.propertyId) {
    try {
      fieldSignals = await getFieldSignalsForDeal(input.dealId, input.propertyId);

      if (fieldSignals) {
        // Apply field signal adjustments to assumptions
        const originalRehabCost = input.assumptions.rehabCost;
        const scopeAdjustment = suggestScopeAdjustments(
          fieldSignals,
          originalRehabCost
        );

        // Only adjust if confidence is high or very different from estimate
        if (fieldSignals.estimateConfidence === 'high' || 
            Math.abs(scopeAdjustment.suggestedBudget - originalRehabCost) > originalRehabCost * 0.25) {
          adjustedInput.assumptions.rehabCost = scopeAdjustment.suggestedBudget;
          
          assumptionAdjustments = {
            originalRehabCost,
            adjustedRehabCost: scopeAdjustment.suggestedBudget,
            rationale: scopeAdjustment.rationale,
          };
        }
      }
    } catch (error) {
      console.error('[Enriched Underwriting] Error loading field intelligence:', error);
      // Continue with standard underwriting if field data unavailable
    }
  }

  // Compute standard underwriting with (potentially) adjusted assumptions
  const baseResult = computeUnderwriting(adjustedInput);

  // Add field-based risk flags if available
  let enhancedRiskFlags = [...baseResult.riskFlags];
  if (fieldSignals) {
    const fieldRiskFlags = generateRiskFlagsFromField(fieldSignals);
    // Merge field risk flags, avoiding duplicates
    const existingFlagTypes = new Set(baseResult.riskFlags.map((f) => f.flagType));
    const newFieldFlags = fieldRiskFlags.filter(
      (f) => !existingFlagTypes.has(f.flag)
    );
    enhancedRiskFlags = [...enhancedRiskFlags, ...newFieldFlags];
  }

  return {
    ...baseResult,
    riskFlags: enhancedRiskFlags,
    fieldIntelligenceApplied: !!fieldSignals,
    fieldSignals,
    assumptionAdjustments,
  };
}

/**
 * Score a deal incorporating field intelligence
 * Returns a letter grade and score impact analysis
 */
export function scoreDealWithFieldIntelligence(
  result: EnrichedUnderwritingResult
): {
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  score: number;
  fieldImpact: { scoreImpact: number; recommendation: string };
} {
  // Base scoring on financial metrics
  let score = 50; // Start at 50

  // DSCR scoring (up to 25 points)
  if (result.dscr >= 1.5) score += 25;
  else if (result.dscr >= 1.25) score += 20;
  else if (result.dscr >= 1.0) score += 10;
  else if (result.dscr >= 0.8) score += 5;

  // Cash-on-cash scoring (up to 15 points)
  if (result.cashOnCash >= 25) score += 15;
  else if (result.cashOnCash >= 15) score += 12;
  else if (result.cashOnCash >= 8) score += 8;
  else if (result.cashOnCash > 0) score += 4;

  // Cap rate scoring (up to 15 points)
  if (result.capRate >= 8) score += 15;
  else if (result.capRate >= 6) score += 12;
  else if (result.capRate >= 4) score += 8;
  else if (result.capRate > 0) score += 4;

  // ARV spread scoring for flips/BRRRRs (up to 10 points)
  if (result.arvSpread >= 30) score += 10;
  else if (result.arvSpread >= 20) score += 7;
  else if (result.arvSpread >= 10) score += 4;

  // LTV penalty (up to -25 points)
  const ltv = (result.totalProjectCost / result.totalProjectCost) * 100;
  if (ltv > 85) score -= 25;
  else if (ltv > 75) score -= 15;
  else if (ltv > 70) score -= 5;

  // Risk flag penalties
  result.riskFlags.forEach((flag) => {
    if (flag.severity === 'critical') score -= 20;
    else if (flag.severity === 'high') score -= 10;
    else if (flag.severity === 'medium') score -= 3;
  });

  // Field intelligence adjustment
  let fieldImpact = { scoreImpact: 0, recommendation: '' };
  if (result.fieldIntelligenceApplied && result.fieldSignals) {
    const { estimateConfidence, samplingConfidence } = result.fieldSignals;
    
    // Boost for high-confidence field data
    let confidenceBoost = 0;
    if (estimateConfidence === 'high') {
      confidenceBoost = 5;
      fieldImpact.recommendation = 'High confidence field inspection (80%+ sampling). Estimates reliable.';
    } else if (estimateConfidence === 'medium') {
      confidenceBoost = 2;
      fieldImpact.recommendation = 'Medium confidence field inspection (50-80% sampling). Use with caution.';
    } else {
      fieldImpact.recommendation = 'Low sampling confidence. Recommend full property walkthrough.';
    }

    // Penalty for high critical deficiency count
    if (result.fieldSignals.deficiencySummary.critical > 10) {
      confidenceBoost -= 8;
    }

    fieldImpact.scoreImpact = confidenceBoost;
    score += confidenceBoost;
  }

  // Clamp score 0-100
  score = Math.max(0, Math.min(100, score));

  // Convert to letter grade
  let grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  if (score >= 95) grade = 'A+';
  else if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B+';
  else if (score >= 70) grade = 'B';
  else if (score >= 60) grade = 'C+';
  else if (score >= 50) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  return { grade, score, fieldImpact };
}
