import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../lib/db';
import { generateEstimate } from '../../../../../server/services/cost-intelligence/engine';
import type { ScopeItem, PropertyType } from '../../../../../lib/cost-intelligence/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const estimateId = Array.isArray(req.query.estimateId)
    ? req.query.estimateId[0]
    : req.query.estimateId;
  if (!estimateId) return res.status(400).json({ error: 'estimateId required' });

  try {
    const client = await pool.connect();
    let estimate: any;
    let scopeRows: any[];

    try {
      const { rows: eRows } = await client.query(
        'SELECT * FROM cost_estimates WHERE id = $1 LIMIT 1',
        [estimateId],
      );
      if (!eRows[0]) return res.status(404).json({ error: 'Estimate not found' });
      estimate = eRows[0];

      const { rows: siRows } = await client.query(
        'SELECT * FROM cost_estimate_scope_items WHERE estimate_id = $1 ORDER BY sort_order',
        [estimateId],
      );
      scopeRows = siRows;
    } finally {
      client.release();
    }

    if (!scopeRows.length) {
      return res.status(400).json({ error: 'No scope items — add scope items before generating.' });
    }

    const scopeItems: ScopeItem[] = scopeRows.map((r) => ({
      id: r.id,
      estimateId,
      areaLabel: r.area_label,
      trade: r.trade,
      itemName: r.item_name,
      quantity: parseFloat(r.quantity),
      unit: r.unit,
      condition: r.condition,
      severity: r.severity,
      repairOrReplace: r.repair_or_replace,
      scopeNote: r.scope_note,
      appliesToAllUnits: r.applies_to_all_units,
      unitLabels: r.unit_labels,
      mappedBenchmarkId: r.mapped_benchmark_id,
      mappedProvider: r.mapped_provider,
      mappingConfidence: r.mapping_confidence ? parseFloat(r.mapping_confidence) : undefined,
      mappingMethod: r.mapping_method,
      wasteFactor: parseFloat(r.waste_factor || 0.05),
      contingencyFactor: parseFloat(r.contingency_factor || 0.10),
    }));

    const body = req.body || {};
    const result = await generateEstimate({
      estimateId,
      dealId: estimate.deal_id,
      propertyId: estimate.property_id,
      propertyType: estimate.property_type as PropertyType,
      totalUnits: Number(estimate.total_units),
      avgUnitSqft: Number(body.avgUnitSqft || estimate.avg_unit_sqft || 1200),
      regionCode: body.regionCode || estimate.region_code || 'NATIONAL',
      contingencyPct: Number(body.contingencyPct || estimate.contingency_pct || 0.10),
      softCostPct: Number(body.softCostPct || estimate.soft_cost_pct || 0.05),
      laborAdjPct: Number(body.laborAdjPct || estimate.labor_adj_pct || 0),
      materialAdjPct: Number(body.materialAdjPct || estimate.material_adj_pct || 0),
      arvEstimate: body.arvEstimate ? Number(body.arvEstimate) : (estimate.arv_estimate ? Number(estimate.arv_estimate) : undefined),
      scopeItems,
      saveVersionSnapshot: true,
    });

    return res.json({ estimate: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
