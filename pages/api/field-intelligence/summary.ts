import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

const systems = [
  'kitchen',
  'bathroom',
  'flooring',
  'appliances',
  'hvac',
  'windows',
  'paint',
  'plumbing',
  'electrical',
  'doors',
  'exterior',
  'common_area',
  'site_parking',
  'other',
];

function initDistribution() {
  const base = {
    good: 0,
    light_rehab: 0,
    medium_rehab: 0,
    full_replace: 0,
    not_inspected: 0,
  };
  return systems.reduce<Record<string, typeof base>>((acc, system) => {
    acc[system] = { ...base };
    return acc;
  }, {});
}

function worstCondition(row: Record<string, any>) {
  const rank: Record<string, number> = {
    full_replace: 5,
    medium_rehab: 4,
    light_rehab: 3,
    good: 2,
    not_inspected: 1,
  };
  let current = 'good';
  let score = 2;
  for (const system of systems) {
    const c = row[system] || 'not_inspected';
    const r = rank[c] || 0;
    if (r > score) {
      score = r;
      current = c;
    }
  }
  return current;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : null;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId query parameter required' });
    }

    const sessionResult = await pool.query(
      `SELECT id, total_units
       FROM field_inspection_sessions
       WHERE id = $1
       LIMIT 1`,
      [sessionId],
    );
    const session = sessionResult.rows[0];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const walksResult = await pool.query(
      `SELECT *
       FROM field_unit_walk_rows
       WHERE session_id = $1`,
      [sessionId],
    );
    const walks = walksResult.rows;
    if (!walks.length) {
      return res.status(404).json({ error: 'No unit walks found for this session' });
    }

    const distribution = initDistribution();
    const unitConditionCounts: Record<string, number> = {
      good: 0,
      light_rehab: 0,
      medium_rehab: 0,
      full_replace: 0,
      not_inspected: 0,
    };

    for (const walk of walks) {
      for (const system of systems) {
        const condition = (walk as any)[system] || 'not_inspected';
        if (!(distribution as any)[system][condition]) (distribution as any)[system][condition] = 0;
        (distribution as any)[system][condition] += 1;
      }
      const worst = worstCondition(walk);
      unitConditionCounts[worst] = (unitConditionCounts[worst] || 0) + 1;
    }

    const defResult = await pool.query(
      `SELECT d.*
       FROM field_unit_walk_deficiencies d
       INNER JOIN field_unit_walk_rows w ON w.id = d.unit_walk_id
       WHERE w.session_id = $1`,
      [sessionId],
    );

    const deficiencies = defResult.rows;
    const totalDeficiencies = deficiencies.length;
    const criticalDeficiencies = deficiencies.filter((d) => d.severity === 'critical').length;
    const estimatedTotalRehabCost = deficiencies.reduce((acc, row) => {
      const n = row.estimated_repair_cost != null ? Number(row.estimated_repair_cost) : 0;
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    const estimatedAvgCostPerUnit = walks.length > 0 ? estimatedTotalRehabCost / walks.length : 0;

    const totalUnits = Number(session.total_units || 0);
    const unitsInspected = walks.length;
    const samplingPercentage = totalUnits > 0 ? (unitsInspected / totalUnits) * 100 : 0;

    const upsert = await pool.query(
      `INSERT INTO field_inspection_summaries (
         session_id,
         total_units_in_property,
         units_inspected,
         sampling_percentage,
         sampling_confidence_percentage,
         system_issue_distribution,
         units_in_good_condition,
         units_needing_light_rehab,
         units_needing_medium_rehab,
         units_needing_full_rehab,
         units_not_inspected,
         total_deficiencies,
         critical_deficiencies,
         deficiencies_by_system,
         estimated_total_rehab_cost,
         estimated_avg_cost_per_unit,
         likely_rehab_package,
         rehab_package_breakdown,
         system_condition_patterns,
         computed_at,
         updated_at,
         created_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
         $12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW(),NOW()
       )
       ON CONFLICT (session_id)
       DO UPDATE SET
         total_units_in_property = EXCLUDED.total_units_in_property,
         units_inspected = EXCLUDED.units_inspected,
         sampling_percentage = EXCLUDED.sampling_percentage,
         sampling_confidence_percentage = EXCLUDED.sampling_confidence_percentage,
         system_issue_distribution = EXCLUDED.system_issue_distribution,
         units_in_good_condition = EXCLUDED.units_in_good_condition,
         units_needing_light_rehab = EXCLUDED.units_needing_light_rehab,
         units_needing_medium_rehab = EXCLUDED.units_needing_medium_rehab,
         units_needing_full_rehab = EXCLUDED.units_needing_full_rehab,
         units_not_inspected = EXCLUDED.units_not_inspected,
         total_deficiencies = EXCLUDED.total_deficiencies,
         critical_deficiencies = EXCLUDED.critical_deficiencies,
         deficiencies_by_system = EXCLUDED.deficiencies_by_system,
         estimated_total_rehab_cost = EXCLUDED.estimated_total_rehab_cost,
         estimated_avg_cost_per_unit = EXCLUDED.estimated_avg_cost_per_unit,
         likely_rehab_package = EXCLUDED.likely_rehab_package,
         rehab_package_breakdown = EXCLUDED.rehab_package_breakdown,
         system_condition_patterns = EXCLUDED.system_condition_patterns,
         computed_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [
        sessionId,
        totalUnits,
        unitsInspected,
        samplingPercentage.toFixed(2),
        samplingPercentage.toFixed(2),
        distribution,
        unitConditionCounts.good || 0,
        unitConditionCounts.light_rehab || 0,
        unitConditionCounts.medium_rehab || 0,
        unitConditionCounts.full_replace || 0,
        unitConditionCounts.not_inspected || 0,
        totalDeficiencies,
        criticalDeficiencies,
        {},
        estimatedTotalRehabCost.toFixed(2),
        estimatedAvgCostPerUnit.toFixed(2),
        'mixed',
        {
          units_needing_light_rehab: unitConditionCounts.light_rehab || 0,
          units_needing_medium_rehab: unitConditionCounts.medium_rehab || 0,
          units_needing_full_rehab: unitConditionCounts.full_replace || 0,
        },
        distribution,
      ],
    );

    return res.status(200).json(upsert.rows[0]);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to compute inspection summary',
      details: error?.message || String(error),
    });
  }
}
