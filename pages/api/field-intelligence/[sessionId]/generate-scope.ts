import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { generateText } from '../../../../lib/server/gemini';
import { postStructuredMatrixEvent, getRoomByEntity } from '../../../../server/services/matrix/workflow';

const SFR_SYSTEMS = [
  'kitchen', 'bathroom', 'flooring', 'appliances', 'hvac',
  'windows', 'paint', 'plumbing', 'electrical', 'doors',
  'exterior', 'roof', 'foundation', 'garage', 'landscaping', 'other',
];

const MF_SYSTEMS = [
  'kitchen', 'bathroom', 'flooring', 'appliances', 'hvac',
  'windows', 'paint', 'plumbing', 'electrical', 'doors',
  'exterior', 'roof', 'common_area', 'laundry_room', 'site_parking',
  'foundation', 'landscaping', 'other',
];

const CONDITION_WEIGHT: Record<string, number> = {
  good: 0,
  light_rehab: 1,
  medium_rehab: 2,
  full_replace: 3,
  not_inspected: 0,
};

function buildConditionSummary(rows: any[], systems: string[]) {
  const dist: Record<string, Record<string, number>> = {};
  for (const sys of systems) {
    dist[sys] = { good: 0, light_rehab: 0, medium_rehab: 0, full_replace: 0, not_inspected: 0 };
  }
  let totalSeverity = 0;
  let totalScoredSystems = 0;

  for (const row of rows) {
    for (const sys of systems) {
      const cond = row[sys] || 'not_inspected';
      dist[sys][cond] = (dist[sys][cond] || 0) + 1;
      if (cond !== 'not_inspected') {
        totalSeverity += CONDITION_WEIGHT[cond] || 0;
        totalScoredSystems++;
      }
    }
  }

  const avgSeverity = totalScoredSystems > 0 ? totalSeverity / totalScoredSystems : 0;
  const unitsCount = rows.length;
  const systemLines = systems.map((sys) => {
    const d = dist[sys];
    const inspected = d.good + d.light_rehab + d.medium_rehab + d.full_replace;
    const upgradePct = inspected > 0 ? Math.round(((d.light_rehab + d.medium_rehab + d.full_replace) / inspected) * 100) : 0;
    const fullReplacePct = inspected > 0 ? Math.round((d.full_replace / inspected) * 100) : 0;
    return `  - ${sys}: ${upgradePct}% need upgrade, ${fullReplacePct}% need full replacement (of ${inspected} inspected)`;
  });

  return { dist, avgSeverity, unitsCount, systemLines };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rawSessionId = req.query.sessionId;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  try {
    const sessionResult = await pool.query(
      `SELECT fis.*, rd.deal_name, rd.id as deal_id_check
       FROM field_inspection_sessions fis
       LEFT JOIN re_deals rd ON rd.id = fis.deal_id
       WHERE fis.id = $1 LIMIT 1`,
      [sessionId],
    );
    const session = sessionResult.rows[0];
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const walksResult = await pool.query(
      `SELECT * FROM field_unit_walk_rows WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId],
    );
    const rows = walksResult.rows;
    if (rows.length === 0) return res.status(400).json({ error: 'No unit walks found. Walk at least one unit before generating a scope.' });

    const assumptionsResult = await pool.query(
      `SELECT a.* FROM re_deal_assumptions a
       INNER JOIN re_deal_scenarios s ON s.id = a.scenario_id
       WHERE s.deal_id = $1
       ORDER BY a.updated_at DESC LIMIT 1`,
      [session.deal_id],
    );
    const assumptions = assumptionsResult.rows[0] || {};

    const propertyType = req.body?.propertyType || session.property_type || 'multifamily';
    const activeSystems = propertyType === 'sfr' ? SFR_SYSTEMS : MF_SYSTEMS;

    const { avgSeverity, unitsCount, systemLines } = buildConditionSummary(rows, activeSystems);
    const arvEstimate = req.body?.arvEstimate || Number(assumptions.arv_estimate) || 0;
    const sqft = Number(req.body?.sqft) || (propertyType === 'sfr' ? 1400 : 1200);
    const dealName = session.deal_name || 'Subject Property';
    const samplingPct = session.total_units > 0 ? Math.round((rows.length / session.total_units) * 100) : 100;

    const costResult = await pool.query(
      `SELECT system, condition_level, cost_unit, cost_low, cost_mid, cost_high
       FROM rehab_cost_benchmarks
       WHERE property_type = $1 OR property_type = 'both'
       ORDER BY system, condition_level`,
      [propertyType],
    );
    const craftsman: Record<string, Record<string, any>> = {};
    for (const cr of costResult.rows) {
      if (!craftsman[cr.system]) craftsman[cr.system] = {};
      craftsman[cr.system][cr.condition_level] = {
        unit: cr.cost_unit,
        low: parseFloat(cr.cost_low),
        mid: parseFloat(cr.cost_mid),
        high: parseFloat(cr.cost_high),
      };
    }
    const craftsmanLines = Object.entries(craftsman).map(([sys, conds]) => {
      const parts = Object.entries(conds).map(([c, v]) =>
        `    ${c}: $${v.low.toLocaleString()}–$${v.high.toLocaleString()} ${v.unit}`
      ).join('\n');
      return `  ${sys}:\n${parts}`;
    });

    const prompt = `You are an expert real estate rehab estimator. Analyze this property inspection data and generate a structured rehab scope using the provided Craftsman reference costs.

PROPERTY: ${dealName}
TYPE: ${propertyType === 'sfr' ? 'Single Family Residence (SFR)' : 'Multi-Family'}
TOTAL UNITS: ${session.total_units} | UNITS INSPECTED: ${unitsCount} (${samplingPct}% sample)
ESTIMATED SQFT PER UNIT: ${sqft}
ARV ESTIMATE: $${arvEstimate.toLocaleString()}
AVERAGE CONDITION SEVERITY: ${avgSeverity.toFixed(2)} / 3.0 (0=good, 3=full replace)

SYSTEM CONDITIONS (% of inspected units needing work):
${systemLines.join('\n')}

CRAFTSMAN NATIONAL CONSTRUCTION ESTIMATOR — REFERENCE COSTS (use these as cost basis):
${craftsmanLines.join('\n')}

Generate a rehab scope for THREE exit strategies (flip, brrrr, hold) × THREE scope tiers (cosmetic, standard, full_gut).
- Use the Craftsman mid-range costs as your base cost for each line item
- Scale per_unit costs by total units, per_sqft by sqft × units
- Only include systems that actually need work based on inspection data
- BRRRR/hold: prioritize mechanical systems (HVAC, plumbing, electrical), rent-impacting items
- Flip: prioritize high-ROI cosmetic systems (kitchen, bathroom, flooring, paint)
- Do not exceed 10 line items per tier

Return ONLY valid JSON:
{
  "strategies": {
    "flip": {
      "cosmetic": {
        "total": <number>,
        "sqft_rate": <number>,
        "line_items": [{"system": "<string>", "description": "<string>", "cost": <number>}],
        "rationale": "<1 sentence>"
      },
      "standard": { same structure },
      "full_gut": { same structure }
    },
    "brrrr": { same as flip },
    "hold": { same as flip }
  },
  "recommended_tier": "<cosmetic|standard|full_gut>",
  "recommended_strategy": "<flip|brrrr|hold>",
  "confidence": <number 0-1>,
  "notes": "<2-3 sentences citing specific system conditions>"
}`;

    const rawText = await generateText(prompt, { model: 'gemini-3-flash', temperature: 0.2 });

    let scopeData: any;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      scopeData = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      return res.status(500).json({ error: 'AI response could not be parsed', rawText });
    }

    const strategies = ['flip', 'brrrr', 'hold'];
    const tiers = ['cosmetic', 'standard', 'full_gut'];
    for (const strat of strategies) {
      for (const tier of tiers) {
        const item = scopeData.strategies?.[strat]?.[tier];
        if (item && arvEstimate > 0) {
          item.mao = Math.round(arvEstimate * 0.70 - (item.total || 0));
        }
      }
    }

    const existingResult = await pool.query(
      `SELECT id FROM re_rehab_scopes WHERE inspection_session_id = $1 LIMIT 1`,
      [sessionId],
    );

    let scopeRow: any;
    if (existingResult.rows[0]) {
      const updateResult = await pool.query(
        `UPDATE re_rehab_scopes
         SET scope_name = $2,
             line_items = $3,
             package_mix = $4,
             recommended_budget = $5,
             confidence = $6
         WHERE inspection_session_id = $1
         RETURNING *`,
        [
          sessionId,
          `Field Intelligence Scope — ${new Date().toLocaleDateString()}`,
          JSON.stringify(scopeData.strategies),
          JSON.stringify({ recommended_tier: scopeData.recommended_tier, recommended_strategy: scopeData.recommended_strategy }),
          scopeData.strategies?.[scopeData.recommended_strategy || 'flip']?.[scopeData.recommended_tier || 'standard']?.total || 0,
          scopeData.confidence || 0.7,
        ],
      );
      scopeRow = updateResult.rows[0];
    } else {
      const insertResult = await pool.query(
        `INSERT INTO re_rehab_scopes (
           deal_id, inspection_session_id, scope_name,
           line_items, package_mix, recommended_budget, confidence
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          session.deal_id,
          sessionId,
          `Field Intelligence Scope — ${new Date().toLocaleDateString()}`,
          JSON.stringify(scopeData.strategies),
          JSON.stringify({ recommended_tier: scopeData.recommended_tier, recommended_strategy: scopeData.recommended_strategy }),
          scopeData.strategies?.[scopeData.recommended_strategy || 'flip']?.[scopeData.recommended_tier || 'standard']?.total || 0,
          scopeData.confidence || 0.7,
        ],
      );
      scopeRow = insertResult.rows[0];
    }

    setImmediate(async () => {
      try {
        const room = await getRoomByEntity('inspection', sessionId);
        if (room) {
          await postStructuredMatrixEvent(room.matrixRoomId, {
            eventType: 'axiom.scope.generated',
            payload: {
              scopeId: scopeRow?.id || null,
              inspectionId: sessionId,
              dealId: session.deal_id,
              unitsInspected: unitsCount,
              totalUnits: session.total_units,
              samplingPct,
              recommendedBudget: scopeData.strategies?.[scopeData.recommended_strategy || 'flip']?.[scopeData.recommended_tier || 'standard']?.total || 0,
              confidence: scopeData.confidence || 0.7,
            },
            actor: 'system',
          }, 'inspection', sessionId);
        }
      } catch (_) {}
    });

    return res.status(200).json({
      scopeId: scopeRow?.id,
      scope: scopeData,
      arvEstimate,
      unitsInspected: unitsCount,
      totalUnits: session.total_units,
      samplingPct,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to generate rehab scope',
      details: error?.message || String(error),
    });
  }
}
