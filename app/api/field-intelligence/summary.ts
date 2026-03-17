/**
 * Field Inspection Summary API
 * Compute and retrieve aggregated inspection data for a session
 * Used by Layer 1 (Predictive Deal Intelligence) to enhance underwriting
 * Layer 5: Field Intelligence Capture
 */

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import {
  fieldInspectionSessions,
  fieldUnitWalkRows,
  fieldUnitWalkDeficiencies,
  fieldInspectionSummaries,
} from "@/shared/schema";

/**
 * Compute inspection summary statistics from all unit walks in a session
 */
async function computeInspectionSummary(sessionId: string) {
  // Get all unit walks for this session
  const walks = await db
    .select()
    .from(fieldUnitWalkRows)
    .where(eq(fieldUnitWalkRows.sessionId, sessionId));

  if (!walks.length) {
    return null;
  }

  // System types to check
  const systems = [
    "kitchen",
    "bathroom",
    "flooring",
    "appliances",
    "hvac",
    "windows",
    "paint",
    "plumbing",
    "electrical",
    "doors",
    "exterior",
    "commonArea",
    "siteParking",
    "other",
  ];

  // Count units by condition per system
  const systemIssueDistribution: any = {};
  const unitConditionCounts = {
    good: 0,
    light_rehab: 0,
    medium_rehab: 0,
    full_replace: 0,
    not_inspected: 0,
  };

  systems.forEach((system) => {
    systemIssueDistribution[system] = {
      good: 0,
      light_rehab: 0,
      medium_rehab: 0,
      full_replace: 0,
      not_inspected: 0,
    };
  });

  // Aggregate condition data from all walks
  walks.forEach((walk) => {
    systems.forEach((system) => {
      const condition = walk[system as keyof typeof walk] as string;
      if (condition) {
        systemIssueDistribution[system][condition]++;
      }
    });

    // Track overall unit condition (worst condition in the unit)
    const unitConditions = systems.map(
      (s) => walk[s as keyof typeof walk] as string
    );
    const worstCondition = calculateWorstCondition(unitConditions);
    unitConditionCounts[worstCondition as keyof typeof unitConditionCounts]++;
  });

  // Get deficiencies for this session
  const allDeficiencies = await db
    .select()
    .from(fieldUnitWalkDeficiencies)
    .innerJoin(
      fieldUnitWalkRows,
      eq(fieldUnitWalkRows.id, fieldUnitWalkDeficiencies.unitWalkId)
    )
    .where(eq(fieldUnitWalkRows.sessionId, sessionId));

  // Count deficiencies by severity and system
  const totalDeficiencies = allDeficiencies.length;
  const criticalDeficiencies = allDeficiencies.filter(
    (d) => d.field_unit_walk_deficiencies.severity === "critical"
  ).length;

  const deficienciesBySystem: any = {};
  const deficienciesBySeverity = {
    minor: 0,
    moderate: 0,
    major: 0,
    critical: 0,
  };

  systems.forEach((system) => {
    deficienciesBySystem[system] = {
      total: 0,
      minor: 0,
      moderate: 0,
      major: 0,
      critical: 0,
    };
  });

  allDeficiencies.forEach((d) => {
    const system = d.field_unit_walk_deficiencies.system;
    const severity = d.field_unit_walk_deficiencies.severity;

    if (deficienciesBySystem[system]) {
      deficienciesBySystem[system].total++;
      deficienciesBySystem[system][severity]++;
    }

    deficienciesBySeverity[severity as keyof typeof deficienciesBySeverity]++;
  });

  // Calculate estimated rehabilitation costs
  let estimatedTotalRehabCost = 0;
  allDeficiencies.forEach((d) => {
    if (d.field_unit_walk_deficiencies.estimatedRepairCost) {
      estimatedTotalRehabCost += parseFloat(
        d.field_unit_walk_deficiencies.estimatedRepairCost as any
      );
    }
  });

  const estimatedAvgCostPerUnit =
    walks.length > 0 ? estimatedTotalRehabCost / walks.length : 0;

  // Classify likely rehab package based on unit condition distribution
  const likelyRehabPackage = classifyRehabPackage(unitConditionCounts, walks.length);

  // Rehab package breakdown
  const rehabPackageBreakdown = {
    units_needing_light_rehab: unitConditionCounts.light_rehab,
    units_needing_medium_rehab: unitConditionCounts.medium_rehab,
    units_needing_full_rehab: unitConditionCounts.full_replace,
    estimated_cost_light: estimatedAvgCostPerUnit * 0.15 * unitConditionCounts.light_rehab,
    estimated_cost_medium: estimatedAvgCostPerUnit * 0.35 * unitConditionCounts.medium_rehab,
    estimated_cost_full: estimatedAvgCostPerUnit * 0.75 * unitConditionCounts.full_replace,
  };

  return {
    totalUnitsInProperty: (await db.select().from(fieldInspectionSessions)
      .where(eq(fieldInspectionSessions.id, sessionId)))[0]?.totalUnits || 0,
    unitsInspected: walks.length,
    samplingPercentage: ((walks.length / ((await db.select().from(fieldInspectionSessions)
      .where(eq(fieldInspectionSessions.id, sessionId)))[0]?.totalUnits || 1)) * 100),
    samplingConfidencePercentage: ((walks.length / ((await db.select().from(fieldInspectionSessions)
      .where(eq(fieldInspectionSessions.id, sessionId)))[0]?.totalUnits || 1)) * 100),
    systemIssueDistribution,
    unitsInGoodCondition: unitConditionCounts.good,
    unitsNeedingLightRehab: unitConditionCounts.light_rehab,
    unitsNeedingMediumRehab: unitConditionCounts.medium_rehab,
    unitsNeedingFullRehab: unitConditionCounts.full_replace,
    unitsNotInspected: unitConditionCounts.not_inspected,
    totalDeficiencies,
    criticalDeficiencies,
    deficienciesBySystem,
    estimatedTotalRehabCost: Math.round(estimatedTotalRehabCost * 100) / 100,
    estimatedAvgCostPerUnit: Math.round(estimatedAvgCostPerUnit * 100) / 100,
    likelyRehabPackage,
    rehabPackageBreakdown,
    systemConditionPatterns: systemIssueDistribution,
  };
}

function calculateWorstCondition(conditions: string[]): string {
  const conditionRank: any = {
    full_replace: 5,
    medium_rehab: 4,
    light_rehab: 3,
    good: 2,
    not_inspected: 1,
  };

  let worstCondition = "good";
  let maxRank = 2;

  conditions.forEach((condition) => {
    const rank = conditionRank[condition] || 0;
    if (rank > maxRank) {
      maxRank = rank;
      worstCondition = condition;
    }
  });

  return worstCondition;
}

function classifyRehabPackage(
  unitConditionCounts: any,
  totalUnits: number
): string {
  const fullRehab = unitConditionCounts.full_replace || 0;
  const mediumRehab = unitConditionCounts.medium_rehab || 0;
  const lightRehab = unitConditionCounts.light_rehab || 0;

  const fullPercent = fullRehab / totalUnits;
  const mediumPercent = mediumRehab / totalUnits;

  if (fullPercent > 0.5) return "major_renovation";
  if (fullPercent > 0.25) return "substantial_rehab";
  if (mediumPercent > 0.5) return "moderate_renovation";
  if (mediumPercent > 0.25) return "light_rehab";
  if (lightRehab > 0) return "cosmetic_updates";
  return "hold_as_is";
}

/**
 * GET /api/field-intelligence/summaries?sessionId=...
 * Retrieve inspection summary (computed or cached)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const recompute = searchParams.get("recompute") === "true";

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId query parameter required" },
        { status: 400 }
      );
    }

    // Check if cached summary exists and is recent (less than 1 hour old)
    if (!recompute) {
      const cached = await db
        .select()
        .from(fieldInspectionSummaries)
        .where(eq(fieldInspectionSummaries.sessionId, sessionId));

      if (cached.length) {
        const age = Date.now() - new Date(cached[0].computedAt).getTime();
        if (age < 3600000) {
          // 1 hour
          return NextResponse.json(cached[0]);
        }
      }
    }

    // Compute fresh summary
    const summaryData = await computeInspectionSummary(sessionId);

    if (!summaryData) {
      return NextResponse.json(
        { error: "No unit walks found for this session" },
        { status: 404 }
      );
    }

    // Get session metadata
    const session = await db
      .select()
      .from(fieldInspectionSessions)
      .where(eq(fieldInspectionSessions.id, sessionId))
      .limit(1);

    if (!session.length) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Upsert summary into database
    const result = await db
      .insert(fieldInspectionSummaries)
      .values({
        sessionId,
        totalUnitsInProperty: summaryData.totalUnitsInProperty,
        unitsInspected: summaryData.unitsInspected,
        samplingPercentage: summaryData.samplingPercentage,
        samplingConfidencePercentage: summaryData.samplingConfidencePercentage,
        systemIssueDistribution: summaryData.systemIssueDistribution,
        unitsInGoodCondition: summaryData.unitsInGoodCondition,
        unitsNeedingLightRehab: summaryData.unitsNeedingLightRehab,
        unitsNeedingMediumRehab: summaryData.unitsNeedingMediumRehab,
        unitsNeedingFullRehab: summaryData.unitsNeedingFullRehab,
        unitsNotInspected: summaryData.unitsNotInspected,
        totalDeficiencies: summaryData.totalDeficiencies,
        criticalDeficiencies: summaryData.criticalDeficiencies,
        deficienciesBySystem: summaryData.deficienciesBySystem as any,
        estimatedTotalRehabCost: summaryData.estimatedTotalRehabCost,
        estimatedAvgCostPerUnit: summaryData.estimatedAvgCostPerUnit,
        likelyRehabPackage: summaryData.likelyRehabPackage,
        rehabPackageBreakdown: summaryData.rehabPackageBreakdown as any,
        systemConditionPatterns: summaryData.systemConditionPatterns as any,
      })
      .onConflictDoUpdate({
        target: fieldInspectionSummaries.sessionId,
        set: {
          totalUnitsInProperty: summaryData.totalUnitsInProperty,
          unitsInspected: summaryData.unitsInspected,
          samplingPercentage: summaryData.samplingPercentage,
          samplingConfidencePercentage: summaryData.samplingConfidencePercentage,
          systemIssueDistribution: summaryData.systemIssueDistribution,
          unitsInGoodCondition: summaryData.unitsInGoodCondition,
          unitsNeedingLightRehab: summaryData.unitsNeedingLightRehab,
          unitsNeedingMediumRehab: summaryData.unitsNeedingMediumRehab,
          unitsNeedingFullRehab: summaryData.unitsNeedingFullRehab,
          unitsNotInspected: summaryData.unitsNotInspected,
          totalDeficiencies: summaryData.totalDeficiencies,
          criticalDeficiencies: summaryData.criticalDeficiencies,
          deficienciesBySystem: summaryData.deficienciesBySystem as any,
          estimatedTotalRehabCost: summaryData.estimatedTotalRehabCost,
          estimatedAvgCostPerUnit: summaryData.estimatedAvgCostPerUnit,
          likelyRehabPackage: summaryData.likelyRehabPackage,
          rehabPackageBreakdown: summaryData.rehabPackageBreakdown as any,
          systemConditionPatterns: summaryData.systemConditionPatterns as any,
        },
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("[GET field-intelligence/summaries]", error);
    return NextResponse.json(
      { error: "Failed to compute inspection summary" },
      { status: 500 }
    );
  }
}
