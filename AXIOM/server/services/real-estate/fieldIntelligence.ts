export type UnitCondition = 'good' | 'light_rehab' | 'medium_rehab' | 'full_replace' | 'not_inspected';

export interface UnitWalkRowInput {
  unitLabel: string;
  bedroomCount?: number | null;
  bathroomCount?: number | null;
  sqft?: number | null;
  systems: Record<string, UnitCondition>;
  deficiencyFlags?: string[];
  notes?: string | null;
  inspected?: boolean;
}

const WEIGHTS: Record<UnitCondition, number> = {
  good: 0,
  light_rehab: 1,
  medium_rehab: 2,
  full_replace: 3,
  not_inspected: 0,
};

export function computeSamplingConfidence(totalUnits: number, unitsInspected: number): number {
  if (totalUnits <= 0 || unitsInspected <= 0) return 0;
  const sampleRatio = Math.min(1, unitsInspected / totalUnits);
  const confidence = 0.35 + sampleRatio * 0.65;
  return Number(confidence.toFixed(4));
}

export function summarizeUnitWalk(rows: UnitWalkRowInput[], totalUnits: number) {
  const systemStats: Record<string, { good: number; light_rehab: number; medium_rehab: number; full_replace: number; not_inspected: number }> = {};
  const packageMix = { lightTurn: 0, classicValueAdd: 0, heavyReposition: 0 };

  for (const row of rows) {
    let severityScore = 0;
    let counted = 0;

    for (const [systemKey, condition] of Object.entries(row.systems || {})) {
      if (!systemStats[systemKey]) {
        systemStats[systemKey] = { good: 0, light_rehab: 0, medium_rehab: 0, full_replace: 0, not_inspected: 0 };
      }
      systemStats[systemKey][condition] += 1;
      if (condition !== 'not_inspected') {
        severityScore += WEIGHTS[condition];
        counted += 1;
      }
    }

    const avgSeverity = counted > 0 ? severityScore / counted : 0;
    if (avgSeverity <= 0.75) packageMix.lightTurn += 1;
    else if (avgSeverity <= 1.65) packageMix.classicValueAdd += 1;
    else packageMix.heavyReposition += 1;
  }

  const unitsInspected = rows.filter((r) => r.inspected !== false).length;
  const confidence = computeSamplingConfidence(totalUnits, unitsInspected);

  const distributions = Object.entries(systemStats).map(([system, counts]) => {
    const inspected = counts.good + counts.light_rehab + counts.medium_rehab + counts.full_replace;
    return {
      system,
      counts,
      inspected,
      upgradePct: inspected > 0 ? Number((((counts.light_rehab + counts.medium_rehab + counts.full_replace) / inspected) * 100).toFixed(2)) : 0,
      fullReplacePct: inspected > 0 ? Number(((counts.full_replace / inspected) * 100).toFixed(2)) : 0,
    };
  });

  return {
    unitsInspected,
    sampleConfidence: confidence,
    packageMix,
    distributions,
  };
}

export function deriveScopeBudget(summary: ReturnType<typeof summarizeUnitWalk>, defaultRehabBudget: number): {
  recommendedBudget: number;
  rationale: string;
  adjustmentPct: number;
} {
  const heavyWeight = summary.packageMix.heavyReposition;
  const classicWeight = summary.packageMix.classicValueAdd;
  const lightWeight = summary.packageMix.lightTurn;
  const total = Math.max(1, heavyWeight + classicWeight + lightWeight);

  const weightedIntensity = (heavyWeight * 1.3 + classicWeight * 1 + lightWeight * 0.75) / total;
  const confidenceMultiplier = 0.85 + summary.sampleConfidence * 0.3;
  const adjustmentPct = Number((((weightedIntensity * confidenceMultiplier) - 1) * 100).toFixed(2));
  const recommendedBudget = Number((defaultRehabBudget * (1 + adjustmentPct / 100)).toFixed(2));

  return {
    recommendedBudget,
    adjustmentPct,
    rationale: `Unit-walk weighted intensity ${weightedIntensity.toFixed(2)} at ${(summary.sampleConfidence * 100).toFixed(1)}% sampling confidence.`,
  };
}
