import { pool } from '../../../lib/db';
import { getActiveProvider } from './providers/index';
import { mapScopeItemToBenchmark, computeMappingConfidence } from './mapping';
import {
  calculateLineItem,
  calculateContingencyLine,
  calculateSoftCostLine,
  computeEstimateRange,
} from './calculator';
import type {
  EstimateAssembly,
  ScopeItem,
  EstimateLineItem,
  PropertyType,
  MappingResult,
} from '../../../lib/cost-intelligence/types';

export interface GenerateEstimateInput {
  estimateId: string;
  dealId?: string;
  propertyId?: string;
  propertyType: PropertyType;
  totalUnits: number;
  avgUnitSqft: number;
  regionCode: string;
  contingencyPct: number;
  softCostPct: number;
  laborAdjPct: number;
  materialAdjPct: number;
  arvEstimate?: number;
  scopeItems: ScopeItem[];
  saveVersionSnapshot?: boolean;
}

export async function generateEstimate(input: GenerateEstimateInput): Promise<EstimateAssembly> {
  const provider = await getActiveProvider();

  const regionalModifier = await provider.getRegionalModifier(input.regionCode);
  const overallFactor = regionalModifier?.overallFactor ?? 1.0;

  const mappingResults: MappingResult[] = [];
  const lineItems: EstimateLineItem[] = [];

  for (const scopeItem of input.scopeItems) {
    const mapping = await mapScopeItemToBenchmark(scopeItem, input.propertyType);
    mappingResults.push(mapping);

    if (!mapping.costItem) continue;

    const { lineItem } = calculateLineItem({
      scopeItem,
      costItem: mapping.costItem,
      totalUnits: input.totalUnits,
      avgUnitSqft: input.avgUnitSqft,
      regionalFactor: overallFactor,
      laborAdjPct: input.laborAdjPct,
      materialAdjPct: input.materialAdjPct,
    });

    lineItem.estimateId = input.estimateId;
    lineItems.push(lineItem);
  }

  const hardCostTotal = lineItems.reduce((s, l) => s + l.lineTotal, 0);
  const contingencyLine = calculateContingencyLine(input.estimateId, hardCostTotal, input.contingencyPct);
  const softCostLine = calculateSoftCostLine(input.estimateId, hardCostTotal, input.softCostPct);

  const allLines = [...lineItems, contingencyLine, softCostLine];

  const grandTotal = hardCostTotal + contingencyLine.lineTotal + softCostLine.lineTotal;
  const perUnitCost = input.totalUnits > 0 ? grandTotal / input.totalUnits : grandTotal;
  const totalSqft = input.totalUnits * input.avgUnitSqft;
  const perSqftCost = totalSqft > 0 ? grandTotal / totalSqft : 0;

  const range = computeEstimateRange(allLines);
  const mappingConf = computeMappingConfidence(mappingResults);
  const overallConf = Math.round(mappingConf * 100) / 100;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE cost_estimates SET
         hard_cost_total = $1, soft_cost_total = $2, contingency_total = $3,
         grand_total = $4, per_unit_cost = $5, per_sqft_cost = $6,
         cost_low = $7, cost_high = $8, confidence = $9,
         total_sqft = $10, generated_at = NOW(), status = 'generated',
         updated_at = NOW()
       WHERE id = $11`,
      [
        round2(hardCostTotal),
        round2(softCostLine.lineTotal),
        round2(contingencyLine.lineTotal),
        round2(grandTotal),
        round2(perUnitCost),
        round2(perSqftCost),
        round2(range.confidenceWeightedLow),
        round2(range.confidenceWeightedHigh),
        overallConf,
        round2(totalSqft),
        input.estimateId,
      ],
    );

    await client.query(
      `DELETE FROM cost_estimate_line_items WHERE estimate_id = $1`,
      [input.estimateId],
    );

    for (const li of allLines) {
      await client.query(
        `INSERT INTO cost_estimate_line_items (
           estimate_id, scope_item_id, trade, description, quantity, unit,
           unit_material_cost, unit_labor_cost, unit_equipment_cost, unit_total_cost,
           subtotal_material, subtotal_labor, subtotal_equipment, subtotal_pre_adj,
           regional_factor_applied, labor_adj_applied, material_adj_applied,
           waste_total, line_total, cost_low, cost_high, confidence,
           provider, benchmark_id, assumptions_json, is_contingency, is_soft_cost
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
        [
          li.estimateId, li.scopeItemId || null, li.trade, li.description, li.quantity, li.unit,
          li.unitMaterialCost, li.unitLaborCost, li.unitEquipmentCost, li.unitTotalCost,
          li.subtotalMaterial, li.subtotalLabor, li.subtotalEquipment, li.subtotalPreAdj,
          li.regionalFactorApplied, li.laborAdjApplied, li.materialAdjApplied,
          li.wasteTotal, li.lineTotal, li.costLow, li.costHigh, li.confidence,
          (li.provider || 'craftsman_local').slice(0, 40), li.benchmarkId || null,
          li.assumptionsJson ? JSON.stringify(li.assumptionsJson) : null,
          li.isContingency, li.isSoftCost,
        ],
      );
    }

    for (const m of mappingResults) {
      if (m.costItem) {
        await client.query(
          `UPDATE cost_estimate_scope_items SET
             mapped_benchmark_id = $1, mapped_provider = $2, mapping_confidence = $3,
             mapping_method = $4, regional_factor = $5, updated_at = NOW()
           WHERE id = $6`,
          [m.costItem.id, m.costItem.source.slice(0, 40), m.confidence, m.method, overallFactor, m.scopeItemId],
        );
      }
    }

    if (input.saveVersionSnapshot) {
      const { rows: verRows } = await client.query(
        'SELECT version FROM cost_estimates WHERE id = $1',
        [input.estimateId],
      );
      const version = verRows[0]?.version || 1;
      await client.query(
        `INSERT INTO cost_estimate_versions (estimate_id, version, snapshot_json, triggered_by)
         VALUES ($1, $2, $3, 'engine')`,
        [input.estimateId, version, JSON.stringify({ lineItems: allLines, range, grandTotal })],
      );
      await client.query(
        `UPDATE cost_estimates SET version = version + 1 WHERE id = $1`,
        [input.estimateId],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return {
    estimateId: input.estimateId,
    estimateName: '',
    dealId: input.dealId,
    propertyId: input.propertyId,
    propertyType: input.propertyType,
    status: 'generated',
    regionCode: input.regionCode,
    totalUnits: input.totalUnits,
    avgUnitSqft: input.avgUnitSqft,
    totalSqft: round2(totalSqft),
    contingencyPct: input.contingencyPct,
    softCostPct: input.softCostPct,
    laborAdjPct: input.laborAdjPct,
    materialAdjPct: input.materialAdjPct,
    provider: provider.id,
    arvEstimate: input.arvEstimate,
    hardCostTotal: round2(hardCostTotal),
    softCostTotal: round2(softCostLine.lineTotal),
    contingencyTotal: round2(contingencyLine.lineTotal),
    grandTotal: round2(grandTotal),
    perUnitCost: round2(perUnitCost),
    perSqftCost: round2(perSqftCost),
    costLow: round2(range.confidenceWeightedLow),
    costHigh: round2(range.confidenceWeightedHigh),
    confidence: overallConf,
    lineItems: allLines,
    scopeItems: input.scopeItems,
    generatedAt: new Date().toISOString(),
    version: 1,
  };
}

export async function getEstimateWithLines(estimateId: string): Promise<EstimateAssembly | null> {
  const client = await pool.connect();
  try {
    const { rows: eRows } = await client.query(
      'SELECT * FROM cost_estimates WHERE id = $1 LIMIT 1',
      [estimateId],
    );
    if (!eRows[0]) return null;

    const { rows: liRows } = await client.query(
      'SELECT * FROM cost_estimate_line_items WHERE estimate_id = $1 ORDER BY is_contingency, is_soft_cost, trade',
      [estimateId],
    );
    const { rows: siRows } = await client.query(
      'SELECT * FROM cost_estimate_scope_items WHERE estimate_id = $1 ORDER BY sort_order, created_at',
      [estimateId],
    );

    const e = eRows[0];
    return {
      estimateId: e.id,
      estimateName: e.estimate_name,
      dealId: e.deal_id,
      propertyId: e.property_id,
      propertyType: e.property_type,
      status: e.status,
      regionCode: e.region_code,
      totalUnits: e.total_units,
      avgUnitSqft: parseFloat(e.avg_unit_sqft || 0),
      totalSqft: parseFloat(e.total_sqft || 0),
      contingencyPct: parseFloat(e.contingency_pct),
      softCostPct: parseFloat(e.soft_cost_pct),
      laborAdjPct: parseFloat(e.labor_adj_pct),
      materialAdjPct: parseFloat(e.material_adj_pct),
      provider: e.provider,
      arvEstimate: e.arv_estimate ? parseFloat(e.arv_estimate) : undefined,
      hardCostTotal: parseFloat(e.hard_cost_total || 0),
      softCostTotal: parseFloat(e.soft_cost_total || 0),
      contingencyTotal: parseFloat(e.contingency_total || 0),
      grandTotal: parseFloat(e.grand_total || 0),
      perUnitCost: parseFloat(e.per_unit_cost || 0),
      perSqftCost: parseFloat(e.per_sqft_cost || 0),
      costLow: parseFloat(e.cost_low || 0),
      costHigh: parseFloat(e.cost_high || 0),
      confidence: parseFloat(e.confidence || 0),
      lineItems: liRows.map(rowToLineItem),
      scopeItems: siRows.map(rowToScopeItem),
      generatedAt: e.generated_at,
      version: e.version,
      notes: e.notes,
    };
  } finally {
    client.release();
  }
}

function rowToLineItem(r: any): EstimateLineItem {
  return {
    id: r.id,
    estimateId: r.estimate_id,
    scopeItemId: r.scope_item_id,
    trade: r.trade,
    description: r.description,
    quantity: parseFloat(r.quantity),
    unit: r.unit,
    unitMaterialCost: parseFloat(r.unit_material_cost || 0),
    unitLaborCost: parseFloat(r.unit_labor_cost || 0),
    unitEquipmentCost: parseFloat(r.unit_equipment_cost || 0),
    unitTotalCost: parseFloat(r.unit_total_cost || 0),
    subtotalMaterial: parseFloat(r.subtotal_material || 0),
    subtotalLabor: parseFloat(r.subtotal_labor || 0),
    subtotalEquipment: parseFloat(r.subtotal_equipment || 0),
    subtotalPreAdj: parseFloat(r.subtotal_pre_adj || 0),
    regionalFactorApplied: parseFloat(r.regional_factor_applied || 1),
    laborAdjApplied: parseFloat(r.labor_adj_applied || 0),
    materialAdjApplied: parseFloat(r.material_adj_applied || 0),
    wasteTotal: parseFloat(r.waste_total || 0),
    lineTotal: parseFloat(r.line_total || 0),
    costLow: parseFloat(r.cost_low || 0),
    costHigh: parseFloat(r.cost_high || 0),
    confidence: parseFloat(r.confidence || 0),
    provider: r.provider,
    benchmarkId: r.benchmark_id,
    assumptionsJson: r.assumptions_json,
    isContingency: r.is_contingency,
    isSoftCost: r.is_soft_cost,
  };
}

function rowToScopeItem(r: any): ScopeItem {
  return {
    id: r.id,
    estimateId: r.estimate_id,
    areaLabel: r.area_label,
    trade: r.trade,
    itemName: r.item_name,
    quantity: parseFloat(r.quantity),
    unit: r.unit,
    condition: r.condition,
    severity: r.severity,
    repairOrReplace: r.repair_or_replace,
    scopeNote: r.scope_note,
    photoRefs: r.photo_refs,
    voiceNoteRef: r.voice_note_ref,
    roomObservation: r.room_observation,
    appliesToAllUnits: r.applies_to_all_units,
    unitLabels: r.unit_labels,
    mappedBenchmarkId: r.mapped_benchmark_id,
    mappedProvider: r.mapped_provider,
    mappingConfidence: r.mapping_confidence ? parseFloat(r.mapping_confidence) : undefined,
    mappingMethod: r.mapping_method,
    regionalFactor: r.regional_factor ? parseFloat(r.regional_factor) : undefined,
    laborFactor: r.labor_factor ? parseFloat(r.labor_factor) : undefined,
    materialFactor: r.material_factor ? parseFloat(r.material_factor) : undefined,
    wasteFactor: parseFloat(r.waste_factor || 0.05),
    contingencyFactor: parseFloat(r.contingency_factor || 0.10),
    sortOrder: r.sort_order,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
