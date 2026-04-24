import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../lib/db';
import { mapScopeItemToBenchmark } from '../../../../../server/services/cost-intelligence/mapping';
import type { ScopeItem } from '../../../../../lib/cost-intelligence/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const estimateId = Array.isArray(req.query.estimateId)
    ? req.query.estimateId[0]
    : req.query.estimateId;
  if (!estimateId) return res.status(400).json({ error: 'estimateId required' });

  try {
    if (req.method === 'GET') {
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `SELECT s.*, b.system as benchmark_system, b.condition_level as benchmark_condition,
                  b.cost_mid as benchmark_mid, b.cost_unit as benchmark_unit
           FROM cost_estimate_scope_items s
           LEFT JOIN rehab_cost_benchmarks b ON b.id = s.mapped_benchmark_id
           WHERE s.estimate_id = $1
           ORDER BY s.sort_order, s.created_at`,
          [estimateId],
        );
        return res.json({ scopeItems: rows });
      } finally {
        client.release();
      }
    }

    if (req.method === 'POST') {
      const {
        areaLabel, trade, itemName, quantity, unit,
        condition, severity, repairOrReplace, scopeNote,
        appliesToAllUnits, unitLabels, wasteFactor,
        contingencyFactor, sortOrder, autoMap,
      } = req.body || {};

      if (!itemName || !trade) {
        return res.status(400).json({ error: 'itemName and trade are required' });
      }

      const client = await pool.connect();
      try {
        const { rows: estRows } = await client.query(
          'SELECT property_type FROM cost_estimates WHERE id = $1',
          [estimateId],
        );
        if (!estRows[0]) return res.status(404).json({ error: 'Estimate not found' });
        const propertyType = estRows[0].property_type;

        const scopeItem: ScopeItem = {
          estimateId,
          areaLabel: areaLabel || null,
          trade,
          itemName,
          quantity: Number(quantity) || 1,
          unit: unit || 'each',
          condition: condition || null,
          severity: severity || null,
          repairOrReplace: repairOrReplace || 'replace',
          scopeNote: scopeNote || null,
          appliesToAllUnits: appliesToAllUnits === true,
          unitLabels: unitLabels || null,
          wasteFactor: Number(wasteFactor) || 0.05,
          contingencyFactor: Number(contingencyFactor) || 0.10,
          sortOrder: Number(sortOrder) || 0,
        };

        let mappedBenchmarkId: string | null = null;
        let mappingConf: number | null = null;

        if (autoMap !== false) {
          const mapping = await mapScopeItemToBenchmark(scopeItem, propertyType);
          if (mapping.costItem) {
            mappedBenchmarkId = mapping.costItem.id;
            mappingConf = mapping.confidence;
          }
        }

        const { rows } = await client.query(
          `INSERT INTO cost_estimate_scope_items (
             estimate_id, area_label, trade, item_name, quantity, unit,
             condition, severity, repair_or_replace, scope_note,
             applies_to_all_units, unit_labels, waste_factor, contingency_factor,
             sort_order, mapped_benchmark_id, mapping_confidence, mapping_method
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           RETURNING *`,
          [
            estimateId, areaLabel || null, trade, itemName,
            Number(quantity) || 1, unit || 'each',
            condition || null, severity || null, repairOrReplace || 'replace', scopeNote || null,
            appliesToAllUnits === true, unitLabels || null,
            Number(wasteFactor) || 0.05, Number(contingencyFactor) || 0.10,
            Number(sortOrder) || 0, mappedBenchmarkId, mappingConf, 'auto',
          ],
        );
        return res.status(201).json({ scopeItem: rows[0], mappedBenchmarkId });
      } finally {
        client.release();
      }
    }

    if (req.method === 'DELETE') {
      const { scopeItemId } = req.query;
      if (!scopeItemId) return res.status(400).json({ error: 'scopeItemId required' });
      const client = await pool.connect();
      try {
        await client.query(
          'DELETE FROM cost_estimate_scope_items WHERE id = $1 AND estimate_id = $2',
          [scopeItemId, estimateId],
        );
        return res.json({ ok: true });
      } finally {
        client.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
