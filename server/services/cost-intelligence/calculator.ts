import type { CostItem, ScopeItem, EstimateLineItem, CostUnit } from '../../../lib/cost-intelligence/types';

const LABOR_SPLIT: Record<string, number> = {
  kitchen: 0.40,
  bathroom: 0.42,
  flooring: 0.35,
  appliances: 0.15,
  hvac: 0.55,
  windows: 0.38,
  paint: 0.65,
  plumbing: 0.60,
  electrical: 0.62,
  doors: 0.35,
  exterior: 0.50,
  roof: 0.48,
  foundation: 0.55,
  garage: 0.40,
  landscaping: 0.60,
  common_area: 0.42,
  laundry_room: 0.38,
  site_parking: 0.45,
  other: 0.45,
};

export interface CalculatorInput {
  scopeItem: ScopeItem;
  costItem: CostItem;
  totalUnits: number;
  avgUnitSqft: number;
  regionalFactor: number;
  laborAdjPct: number;
  materialAdjPct: number;
}

export interface CalculatorOutput {
  lineItem: EstimateLineItem;
  effectiveQuantity: number;
}

export function calculateLineItem(input: CalculatorInput): CalculatorOutput {
  const { scopeItem, costItem, totalUnits, avgUnitSqft, regionalFactor, laborAdjPct, materialAdjPct } = input;

  const laborSplit = LABOR_SPLIT[costItem.systemKey] ?? 0.45;
  const materialSplit = 1 - laborSplit;

  const effectiveQty = resolveEffectiveQuantity(scopeItem, costItem.costUnit, totalUnits, avgUnitSqft);

  const baseMidPerUnit = costItem.costMid;
  const baseLowPerUnit = costItem.costLow;
  const baseHighPerUnit = costItem.costHigh;

  const unitMaterialCost = baseMidPerUnit * materialSplit * (1 + materialAdjPct);
  const unitLaborCost = baseMidPerUnit * laborSplit * (1 + laborAdjPct);
  const unitEquipmentCost = 0;
  const unitTotalCost = unitMaterialCost + unitLaborCost;

  const subtotalMaterial = unitMaterialCost * effectiveQty;
  const subtotalLabor = unitLaborCost * effectiveQty;
  const subtotalEquipment = 0;
  const subtotalPreAdj = subtotalMaterial + subtotalLabor;

  const subtotalRegional = subtotalPreAdj * regionalFactor;
  const wasteTotal = subtotalRegional * (scopeItem.wasteFactor ?? 0.05);
  const lineTotal = subtotalRegional + wasteTotal;

  const costLow = baseLowPerUnit * effectiveQty * regionalFactor;
  const costHigh = baseHighPerUnit * effectiveQty * regionalFactor;

  const lineItem: EstimateLineItem = {
    estimateId: scopeItem.estimateId,
    scopeItemId: scopeItem.id,
    trade: costItem.systemLabel,
    description: buildDescription(scopeItem, costItem),
    quantity: effectiveQty,
    unit: costItem.costUnit,
    unitMaterialCost: round2(unitMaterialCost),
    unitLaborCost: round2(unitLaborCost),
    unitEquipmentCost: 0,
    unitTotalCost: round2(unitTotalCost),
    subtotalMaterial: round2(subtotalMaterial),
    subtotalLabor: round2(subtotalLabor),
    subtotalEquipment: 0,
    subtotalPreAdj: round2(subtotalPreAdj),
    regionalFactorApplied: regionalFactor,
    laborAdjApplied: laborAdjPct,
    materialAdjApplied: materialAdjPct,
    wasteTotal: round2(wasteTotal),
    lineTotal: round2(lineTotal),
    costLow: round2(costLow),
    costHigh: round2(costHigh),
    confidence: costItem.confidence ?? 0.80,
    provider: costItem.source,
    benchmarkId: costItem.id,
    assumptionsJson: {
      laborSplit,
      materialSplit,
      wasteFactor: scopeItem.wasteFactor,
      effectiveQuantity: effectiveQty,
      quantityBasis: costItem.costUnit,
      totalUnits,
      avgUnitSqft,
    },
    isContingency: false,
    isSoftCost: false,
  };

  return { lineItem, effectiveQuantity: effectiveQty };
}

export function calculateContingencyLine(
  estimateId: string,
  hardTotal: number,
  contingencyPct: number,
): EstimateLineItem {
  const total = round2(hardTotal * contingencyPct);
  return {
    estimateId,
    trade: 'Contingency',
    description: `Contingency Reserve (${Math.round(contingencyPct * 100)}%)`,
    quantity: 1,
    unit: 'flat',
    unitMaterialCost: 0,
    unitLaborCost: 0,
    unitEquipmentCost: 0,
    unitTotalCost: total,
    subtotalMaterial: 0,
    subtotalLabor: 0,
    subtotalEquipment: 0,
    subtotalPreAdj: total,
    regionalFactorApplied: 1,
    laborAdjApplied: 0,
    materialAdjApplied: 0,
    wasteTotal: 0,
    lineTotal: total,
    costLow: round2(hardTotal * contingencyPct * 0.7),
    costHigh: round2(hardTotal * contingencyPct * 1.3),
    confidence: 0.95,
    provider: 'axiom_internal',
    isContingency: true,
    isSoftCost: false,
    assumptionsJson: { pct: contingencyPct, base: hardTotal },
  };
}

export function calculateSoftCostLine(
  estimateId: string,
  hardTotal: number,
  softCostPct: number,
): EstimateLineItem {
  const total = round2(hardTotal * softCostPct);
  return {
    estimateId,
    trade: 'Soft Costs',
    description: `Soft Costs — permits, inspections, financing (${Math.round(softCostPct * 100)}%)`,
    quantity: 1,
    unit: 'flat',
    unitMaterialCost: 0,
    unitLaborCost: 0,
    unitEquipmentCost: 0,
    unitTotalCost: total,
    subtotalMaterial: 0,
    subtotalLabor: 0,
    subtotalEquipment: 0,
    subtotalPreAdj: total,
    regionalFactorApplied: 1,
    laborAdjApplied: 0,
    materialAdjApplied: 0,
    wasteTotal: 0,
    lineTotal: total,
    costLow: round2(total * 0.8),
    costHigh: round2(total * 1.2),
    confidence: 0.90,
    provider: 'axiom_internal',
    isContingency: false,
    isSoftCost: true,
    assumptionsJson: { pct: softCostPct, base: hardTotal },
  };
}

export function computeEstimateRange(lineItems: EstimateLineItem[]) {
  const hardItems = lineItems.filter((l) => !l.isContingency && !l.isSoftCost);
  const hardTotal = hardItems.reduce((s, l) => s + l.lineTotal, 0);
  const costLow = hardItems.reduce((s, l) => s + l.costLow, 0);
  const costHigh = hardItems.reduce((s, l) => s + l.costHigh, 0);
  const avgConf = hardItems.length
    ? hardItems.reduce((s, l) => s + l.confidence, 0) / hardItems.length
    : 0.8;

  return {
    baseline: round2(hardTotal),
    conservative: round2(hardTotal * 1.15),
    aggressive: round2(hardTotal * 0.9),
    confidenceWeightedLow: round2(costLow),
    confidenceWeightedHigh: round2(costHigh),
    avgConfidence: round2(avgConf),
  };
}

function resolveEffectiveQuantity(
  scopeItem: ScopeItem,
  costUnit: CostUnit,
  totalUnits: number,
  avgUnitSqft: number,
): number {
  const qty = scopeItem.quantity;

  if (costUnit === 'flat') return 1;

  if (scopeItem.unit === costUnit) {
    if (costUnit === 'per_unit' && scopeItem.appliesToAllUnits) return totalUnits;
    return qty;
  }

  if (costUnit === 'per_unit') {
    if (scopeItem.appliesToAllUnits) return totalUnits;
    if (scopeItem.unit === 'each') return qty;
    return qty;
  }

  if (costUnit === 'per_sqft') {
    if (scopeItem.unit === 'each' || scopeItem.unit === 'per_unit') {
      return avgUnitSqft * (scopeItem.appliesToAllUnits ? totalUnits : qty);
    }
    if (scopeItem.unit === 'per_sqft') return qty;
  }

  return qty;
}

function buildDescription(scope: ScopeItem, cost: CostItem): string {
  const prefix = scope.repairOrReplace === 'repair' ? 'Repair' : 'Replace';
  const unitNote = scope.appliesToAllUnits ? ' (all units)' : '';
  return `${prefix} ${cost.systemLabel}${unitNote} — ${cost.conditionLevel.replace(/_/g, ' ')}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
