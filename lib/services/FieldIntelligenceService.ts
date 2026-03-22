/**
 * FieldIntelligenceService
 * Business logic for consuming field inspection data and generating signals for downstream layers
 * Layer 5 → Layer 1 (Predictive Deal Intelligence) integration
 */

import { db } from "@/server/db";
import { eq, and } from "drizzle-orm";
import {
  fieldInspectionSummaries,
  fieldInspectionSessions,
  fieldUnitWalkRows,
  fieldUnitWalkDeficiencies,
} from "@/shared/fieldIntelligenceSchema";

export interface FieldSignals {
  // Sampling confidence (0-1)
  samplingConfidence: number;
  
  // Unit condition distribution
  unitConditionDistribution: {
    percentageGood: number;
    percentageNeedingLight: number;
    percentageNeedingMedium: number;
    percentageNeedingFull: number;
    percentageUnknown: number;
  };
  
  // System-level risk assessment
  systemRiskScores: Record<string, number>; // 0-100, higher = more risk
  
  // Deficiency summary
  deficiencySummary: {
    total: number;
    critical: number;
    majorPercentage: number;
  };
  
  // Estimated rehabilitation costs
  estimatedRehabCosts: {
    totalPerProperty: number;
    perUnit: number;
    byCategory: {
      light: number;
      medium: number;
      full: number;
    };
  };
  
  // Rehab package classification
  likelyRehabPackage:
    | "major_renovation"
    | "substantial_rehab"
    | "moderate_renovation"
    | "light_rehab"
    | "cosmetic_updates"
    | "hold_as_is";
  
  // Confidence in estimates
  estimateConfidence: "low" | "medium" | "high";
}

export interface PropertyFieldIntelligence extends FieldSignals {
  sessionId: string;
  propertyId: string;
  dealId: string;
  unitsInspected: number;
  totalUnits: number;
  computedAt: Date;
}

/**
 * Get field intelligence signals for a deal/property
 * Returns aggregated signals for use in Layer 1 (Predictive Deal Intelligence)
 */
export async function getFieldSignalsForDeal(
  dealId: string,
  propertyId: string
): Promise<PropertyFieldIntelligence | null> {
  try {
    // Get the most recent completed inspection summary for this property
    const summary = await db
      .select({
        summary: fieldInspectionSummaries,
        session: fieldInspectionSessions,
      })
      .from(fieldInspectionSummaries)
      .innerJoin(
        fieldInspectionSessions,
        eq(fieldInspectionSessions.id, fieldInspectionSummaries.sessionId)
      )
      .where(
        and(
          eq(fieldInspectionSessions.dealId, dealId),
          eq(fieldInspectionSessions.propertyId, propertyId)
        )
      )
      .orderBy((t) => t.summary.computedAt)
      .limit(1);

    if (!summary.length) {
      return null;
    }

    const summaryData = summary[0].summary;
    const sessionData = summary[0].session;

    // Calculate system risk scores based on deficiency patterns
    const systemRiskScores = calculateSystemRiskScores(
      summaryData.deficienciesBySystem as any
    );

    // Determine estimate confidence based on sampling
    const samplingPercent = summaryData.samplingPercentage || 0;
    let estimateConfidence: "low" | "medium" | "high" = "low";
    if (samplingPercent >= 80) {
      estimateConfidence = "high";
    } else if (samplingPercent >= 50) {
      estimateConfidence = "medium";
    }

    return {
      sessionId: sessionData.id,
      propertyId,
      dealId,
      samplingConfidence: (samplingPercent / 100) || 0,
      unitConditionDistribution: {
        percentageGood:
          ((summaryData.unitsInGoodCondition || 0) /
            summaryData.unitsInspected) *
          100,
        percentageNeedingLight:
          ((summaryData.unitsNeedingLightRehab || 0) /
            summaryData.unitsInspected) *
          100,
        percentageNeedingMedium:
          ((summaryData.unitsNeedingMediumRehab || 0) /
            summaryData.unitsInspected) *
          100,
        percentageNeedingFull:
          ((summaryData.unitsNeedingFullRehab || 0) /
            summaryData.unitsInspected) *
          100,
        percentageUnknown:
          ((summaryData.unitsNotInspected || 0) / summaryData.unitsInspected) *
          100,
      },
      systemRiskScores,
      deficiencySummary: {
        total: summaryData.totalDeficiencies || 0,
        critical: summaryData.criticalDeficiencies || 0,
        majorPercentage:
          summaryData.totalDeficiencies > 0
            ? ((summaryData.criticalDeficiencies || 0) /
                summaryData.totalDeficiencies) *
              100
            : 0,
      },
      estimatedRehabCosts: {
        totalPerProperty: summaryData.estimatedTotalRehabCost || 0,
        perUnit: summaryData.estimatedAvgCostPerUnit || 0,
        byCategory: {
          light:
            ((summaryData.rehabPackageBreakdown as any)
              ?.estimated_cost_light || 0),
          medium:
            ((summaryData.rehabPackageBreakdown as any)
              ?.estimated_cost_medium || 0),
          full:
            ((summaryData.rehabPackageBreakdown as any)
              ?.estimated_cost_full || 0),
        },
      },
      likelyRehabPackage:
        (summaryData.likelyRehabPackage as any) || "hold_as_is",
      estimateConfidence,
      unitsInspected: summaryData.unitsInspected,
      totalUnits: summaryData.totalUnitsInProperty,
      computedAt: summaryData.computedAt || new Date(),
    };
  } catch (error) {
    console.error("[FieldIntelligenceService] Error getting field signals:", error);
    return null;
  }
}

/**
 * Risk scoring algorithm for systems
 * Analyzes deficiency patterns to generate 0-100 risk scores for each system
 */
function calculateSystemRiskScores(
  deficienciesBySystem: Record<string, any>
): Record<string, number> {
  const risks: Record<string, number> = {};

  Object.entries(deficienciesBySystem).forEach(([system, deficiencies]) => {
    if (!deficiencies || deficiencies.total === 0) {
      risks[system] = 0;
      return;
    }

    // Score based on severity distribution
    const total = deficiencies.total || 1;
    const criticalPercent = ((deficiencies.critical || 0) / total) * 100;
    const majorPercent = ((deficiencies.major || 0) / total) * 100;
    const moderatePercent = ((deficiencies.moderate || 0) / total) * 100;

    // Scale: critical=100, major=50, moderate=25, minor=10
    const weightedScore =
      (criticalPercent * 100 +
        majorPercent * 50 +
        moderatePercent * 25 +
        ((deficiencies.minor || 0) / total) * 100 * 10) /
      100;

    risks[system] = Math.min(100, Math.ceil(weightedScore));
  });

  return risks;
}

/**
 * Suggest rehab scope adjustments based on field intelligence
 * Returns proposed changes to underwriting assumptions
 */
export function suggestScopeAdjustments(
  fieldSignals: FieldSignals,
  currentRehabBudget: number
): { suggestedBudget: number; confidence: number; rationale: string } {
  const { estimatedRehabCosts, estimateConfidence } = fieldSignals;

  let adjustmentFactor = 1.0;
  let rationale = "";

  // If confidence is high, use estimated costs more aggressively
  if (estimateConfidence === "high") {
    adjustmentFactor = 1.0;
    rationale = "High sampling confidence (80%+) - using field estimates directly";
  } else if (estimateConfidence === "medium") {
    // Conservative adjustment for medium confidence
    adjustmentFactor = 0.85;
    rationale = "Medium sampling confidence (50-80%) - conservative multiplier applied";
  } else {
    // Very conservative for low confidence
    adjustmentFactor = 0.7;
    rationale = "Low sampling confidence (<50%) - using conservative multiplier";
  }

  const suggestedBudget = estimatedRehabCosts.totalPerProperty * adjustmentFactor;
  const variance = Math.abs(suggestedBudget - currentRehabBudget) / currentRehabBudget;

  return {
    suggestedBudget: Math.round(suggestedBudget),
    confidence: estimateConfidence === "high" ? 0.9 : estimateConfidence === "medium" ? 0.7 : 0.4,
    rationale: `${rationale}. Current estimate: $${currentRehabBudget.toLocaleString()}, Field data suggests: $${suggestedBudget.toLocaleString()} (${(variance * 100).toFixed(0)}% variance).`,
  };
}

/**
 * Adjust risk flags based on field intelligence
 * Returns new/modified risk flags based on observed conditions
 */
export function generateRiskFlagsFromField(
  fieldSignals: FieldSignals
): Array<{ flag: string; severity: "low" | "medium" | "high"; description: string }> {
  const flags = [];

  // High deficiency rate = construction risk
  if (fieldSignals.deficiencySummary.critical > 5) {
    flags.push({
      flag: "high_critical_deficiencies",
      severity: "high",
      description: `${fieldSignals.deficiencySummary.critical} critical deficiencies identified during inspection. Construction timeline and budget at risk.`,
    });
  }

  // Low sampling confidence = estimation risk
  if (fieldSignals.samplingConfidence < 0.5) {
    flags.push({
      flag: "low_sampling_confidence",
      severity: "medium",
      description: `Only ${(fieldSignals.samplingConfidence * 100).toFixed(0)}% of units sampled. Estimates may not reflect full property condition.`,
    });
  }

  // System-level risks
  Object.entries(fieldSignals.systemRiskScores).forEach(([system, score]) => {
    if (score > 75) {
      flags.push({
        flag: `system_risk_${system}`,
        severity: "high",
        description: `${system} system shows high deficiency rate (${Math.round(score)}/100). May require specialized contractors or extended timeline.`,
      });
    } else if (score > 50) {
      flags.push({
        flag: `system_concern_${system}`,
        severity: "medium",
        description: `${system} system shows moderate deficiency rate (${Math.round(score)}/100).`,
      });
    }
  });

  // High rehab percentage suggests value-add is heavy
  if (fieldSignals.unitConditionDistribution.percentageNeedingFull > 30) {
    flags.push({
      flag: "heavy_value_add",
      severity: "high",
      description: `${Math.round(fieldSignals.unitConditionDistribution.percentageNeedingFull)}% of units need full renovation. Value-add strategy is capital and time intensive.`,
    });
  }

  return flags;
}

/**
 * Get comparable field intelligence from network
 * (Future: aggregates verified outcomes across similar properties)
 */
export async function getNetworkComparables(
  strategy: string,
  marketArea: string
): Promise<PropertyFieldIntelligence[]> {
  // Placeholder for future network intelligence aggregation
  // Will query verified outcomes across similar properties
  return [];
}
