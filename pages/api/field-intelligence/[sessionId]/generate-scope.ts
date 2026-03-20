import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { postStructuredMatrixEvent, getRoomByEntity } from '../../../../server/services/matrix/workflow';

// ─────────────────────────────────────────────────────────
//  System definitions per property type
// ─────────────────────────────────────────────────────────
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

// Strategy: which systems to prioritize per exit strategy
const STRATEGY_PRIORITY: Record<string, string[]> = {
  flip: [
    'kitchen', 'bathroom', 'flooring', 'paint', 'appliances', 'doors',
    'windows', 'exterior', 'landscaping', 'garage', 'hvac', 'plumbing',
    'electrical', 'roof', 'foundation', 'common_area', 'laundry_room',
    'site_parking', 'other',
  ],
  brrrr: [
    'hvac', 'plumbing', 'electrical', 'roof', 'foundation', 'windows',
    'doors', 'common_area', 'laundry_room', 'site_parking', 'appliances',
    'flooring', 'paint', 'bathroom', 'kitchen', 'exterior', 'landscaping',
    'garage', 'other',
  ],
  hold: [
    'hvac', 'plumbing', 'electrical', 'roof', 'appliances', 'foundation',
    'windows', 'doors', 'paint', 'exterior', 'flooring', 'common_area',
    'laundry_room', 'site_parking', 'bathroom', 'kitchen', 'landscaping',
    'garage', 'other',
  ],
};

// Condition severity weight
const CONDITION_WEIGHT: Record<string, number> = {
  good: 0,
  light_rehab: 1,
  medium_rehab: 2,
  full_replace: 3,
  not_inspected: -1,
};

// Estimated per-unit quantity for door/window priced items
const UNIT_QTY: Record<string, number> = {
  per_door: 4,
  per_window: 6,
};

// ─────────────────────────────────────────────────────────
//  DETERMINISTIC SCOPE ENGINE
// ─────────────────────────────────────────────────────────

interface Benchmark {
  low: number;
  mid: number;
  high: number;
  unit: string;
}

type CraftsmanMap = Record<string, Record<string, Benchmark>>;

interface SystemAnalysis {
  system: string;
  totalInspected: number;
  dist: Record<string, number>;
  effectiveCondition: string | null;
  pctNeedingWork: number;
  pctMediumPlus: number;
  pctFullReplace: number;
}

function analyzeSystem(system: string, rows: any[]): SystemAnalysis {
  const dist: Record<string, number> = {
    good: 0, light_rehab: 0, medium_rehab: 0, full_replace: 0, not_inspected: 0,
  };
  for (const row of rows) {
    const cond: string = row[system] || 'not_inspected';
    dist[cond] = (dist[cond] || 0) + 1;
  }
  const totalInspected = dist.good + dist.light_rehab + dist.medium_rehab + dist.full_replace;
  const totalNeedingWork = dist.light_rehab + dist.medium_rehab + dist.full_replace;
  const pctNeedingWork = totalInspected > 0 ? totalNeedingWork / totalInspected : 0;
  const pctMediumPlus = totalInspected > 0 ? (dist.medium_rehab + dist.full_replace) / totalInspected : 0;
  const pctFullReplace = totalInspected > 0 ? dist.full_replace / totalInspected : 0;

  // Effective condition = worst level affecting >= 25% of inspected units
  let effectiveCondition: string | null = null;
  if (totalInspected === 0) {
    effectiveCondition = null;
  } else if (pctFullReplace >= 0.25) {
    effectiveCondition = 'full_replace';
  } else if (pctMediumPlus >= 0.40) {
    effectiveCondition = 'medium_rehab';
  } else if (pctNeedingWork >= 0.25) {
    effectiveCondition = 'light_rehab';
  } else {
    effectiveCondition = null;
  }

  return { system, totalInspected, dist, effectiveCondition, pctNeedingWork, pctMediumPlus, pctFullReplace };
}

function computeCost(
  benchmark: Benchmark,
  units: number,
  sqftPerUnit: number,
  regionalFactor: number,
  tierLevel: 'low' | 'mid' | 'high' = 'mid',
): number {
  const base = benchmark[tierLevel];
  const qty = UNIT_QTY[benchmark.unit] || 1;
  let raw: number;
  switch (benchmark.unit) {
    case 'per_unit':
      raw = base * units;
      break;
    case 'per_sqft':
      raw = base * sqftPerUnit * units;
      break;
    case 'per_door':
    case 'per_window':
      raw = base * qty * units;
      break;
    case 'flat':
    default:
      raw = base;
      break;
  }
  return Math.round(raw * regionalFactor);
}

// Pick the Craftsman condition level to use for each scope tier
function tierConditionLevel(
  analysis: SystemAnalysis,
  tier: 'cosmetic' | 'standard' | 'full_gut',
): 'light_rehab' | 'medium_rehab' | 'full_replace' {
  if (tier === 'cosmetic') return 'light_rehab';
  if (tier === 'full_gut') {
    return analysis.pctFullReplace >= 0.25 ? 'full_replace' : 'medium_rehab';
  }
  // standard: use effective condition
  if (analysis.effectiveCondition === 'full_replace') return 'medium_rehab';
  if (analysis.effectiveCondition === 'medium_rehab') return 'medium_rehab';
  return 'light_rehab';
}

// Is a system included in a given tier?
function includedInTier(analysis: SystemAnalysis, tier: 'cosmetic' | 'standard' | 'full_gut'): boolean {
  if (!analysis.effectiveCondition) return false;
  if (tier === 'cosmetic') return analysis.pctNeedingWork > 0;
  if (tier === 'standard') return analysis.pctMediumPlus >= 0.30 || analysis.pctNeedingWork >= 0.50;
  return analysis.pctNeedingWork > 0; // full_gut: everything that needs work
}

interface LineItem {
  system: string;
  description: string;
  cost: number;
}

interface ScopeTier {
  total: number;
  sqft_rate: number;
  line_items: LineItem[];
  rationale: string;
  mao?: number;
}

function buildTier(
  strategy: string,
  tier: 'cosmetic' | 'standard' | 'full_gut',
  analyses: SystemAnalysis[],
  craftsman: CraftsmanMap,
  totalUnits: number,
  sqftPerUnit: number,
  regionalFactor: number,
  regionName: string,
  arvEstimate: number,
): ScopeTier {
  const priorityOrder = STRATEGY_PRIORITY[strategy] || STRATEGY_PRIORITY.hold;
  const sorted = [...analyses].sort(
    (a, b) => priorityOrder.indexOf(a.system) - priorityOrder.indexOf(b.system),
  );

  const lineItems: LineItem[] = [];
  let total = 0;

  for (const analysis of sorted) {
    if (!includedInTier(analysis, tier)) continue;
    const condLevel = tierConditionLevel(analysis, tier);
    const bm = craftsman[analysis.system]?.[condLevel];
    if (!bm) continue;

    // Units needing work = pct × total inspected units (extrapolated to all units)
    const unitsForCalc = tier === 'full_gut'
      ? totalUnits
      : Math.max(1, Math.round(analysis.pctNeedingWork * totalUnits));

    const cost = computeCost(bm, unitsForCalc, sqftPerUnit, regionalFactor, 'mid');
    if (cost <= 0) continue;

    const condLabel = condLevel === 'light_rehab' ? 'light rehab'
      : condLevel === 'medium_rehab' ? 'mid rehab' : 'full replace';

    lineItems.push({
      system: analysis.system,
      description: `${analysis.system.replace(/_/g, ' ')} — ${condLabel} (${Math.round(analysis.pctNeedingWork * 100)}% of units)`,
      cost,
    });
    total += cost;

    if (lineItems.length >= 10) break;
  }

  // Contingency: 10% cosmetic, 12% standard, 15% full_gut
  const contingencyPct = tier === 'cosmetic' ? 0.10 : tier === 'standard' ? 0.12 : 0.15;
  const contingency = Math.round(total * contingencyPct);
  total += contingency;

  const totalSqft = totalUnits * sqftPerUnit;
  const sqftRate = totalSqft > 0 ? Math.round((total / totalSqft) * 100) / 100 : 0;

  const rationale = tier === 'cosmetic'
    ? `Cosmetic pass targeting light-rehab items to improve marketability with minimal capital.`
    : tier === 'standard'
    ? `Standard renovation addressing systems with ≥30–50% of units needing medium work. ${regionName} pricing applied.`
    : `Full gut addressing all systems showing deterioration across inspected units at ${regionName} rates.`;

  const mao = arvEstimate > 0 ? Math.round(arvEstimate * 0.70 - total) : undefined;

  return { total, sqft_rate: sqftRate, line_items: lineItems, rationale, ...(mao !== undefined ? { mao } : {}) };
}

function computeRecommendation(
  avgSeverity: number,
  samplingPct: number,
): { recommended_tier: string; recommended_strategy: string; confidence: number; notes: string } {
  let recommended_tier: string;
  let recommended_strategy: string;

  if (avgSeverity >= 2.2) {
    recommended_tier = 'full_gut';
    recommended_strategy = 'brrrr';
  } else if (avgSeverity >= 1.3) {
    recommended_tier = 'standard';
    recommended_strategy = avgSeverity >= 1.8 ? 'brrrr' : 'flip';
  } else {
    recommended_tier = 'cosmetic';
    recommended_strategy = 'flip';
  }

  const confidence = Math.min(0.90, 0.55 + (samplingPct / 100) * 0.35);

  const notes = [
    `Average condition severity of ${avgSeverity.toFixed(2)}/3.0 across inspected systems.`,
    `${Math.round(samplingPct)}% unit sample — confidence level ${Math.round(confidence * 100)}%.`,
    recommended_tier === 'full_gut'
      ? 'Multiple systems show widespread deterioration; full renovation scope is warranted.'
      : recommended_tier === 'standard'
      ? 'Significant mechanical and cosmetic work needed across the majority of units.'
      : 'Property is in relatively good condition; targeted cosmetic improvements recommended.',
  ].join(' ');

  return { recommended_tier, recommended_strategy, confidence, notes };
}

// ─────────────────────────────────────────────────────────
//  API HANDLER
// ─────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rawSessionId = req.query.sessionId;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  try {
    // ── 1. Load session + property address ────────────────
    const sessionResult = await pool.query(
      `SELECT fis.*,
              rd.deal_name, rd.id AS deal_id_check,
              rp.city, rp.state, rp.zip
       FROM field_inspection_sessions fis
       LEFT JOIN re_deals rd ON rd.id = fis.deal_id
       LEFT JOIN re_properties rp ON rp.id = rd.property_id
       WHERE fis.id = $1 LIMIT 1`,
      [sessionId],
    );
    const session = sessionResult.rows[0];
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // ── 2. Load unit walks ────────────────────────────────
    const walksResult = await pool.query(
      `SELECT * FROM field_unit_walk_rows WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId],
    );
    const rows = walksResult.rows;
    if (rows.length === 0) {
      return res.status(400).json({ error: 'No unit walks found. Walk at least one unit before generating a scope.' });
    }

    // ── 3. Resolve property type + active systems ─────────
    const propertyType = req.body?.propertyType || session.property_type || 'multifamily';
    const activeSystems = propertyType === 'sfr' ? SFR_SYSTEMS : MF_SYSTEMS;
    const totalUnits = session.total_units || rows.length;
    const arvEstimate = Number(req.body?.arvEstimate) || 0;
    const sqftPerUnit = Number(req.body?.sqft) || (propertyType === 'sfr' ? 1400 : 1200);
    const dealName = session.deal_name || 'Subject Property';
    const samplingPct = totalUnits > 0 ? (rows.length / totalUnits) * 100 : 100;

    // ── 4. Regional cost lookup by city + state ───────────
    const city: string = session.city || '';
    const state: string = session.state || '';
    let regionalFactor = 1.0;
    let regionCode = 'NATIONAL';
    let regionName = 'National Average';

    if (city || state) {
      const regionResult = await pool.query(
        `SELECT region_code, region_name, overall_factor
         FROM regional_cost_modifiers
         WHERE
           ($1 != '' AND EXISTS (SELECT 1 FROM unnest(metro_areas) m WHERE lower(m) = lower($1)))
           OR ($2 != '' AND $2 = ANY(states))
         ORDER BY
           CASE WHEN ($1 != '' AND EXISTS (SELECT 1 FROM unnest(metro_areas) m WHERE lower(m) = lower($1)))
                THEN 0 ELSE 1 END
         LIMIT 1`,
        [city, state],
      );
      if (regionResult.rows[0]) {
        regionalFactor = parseFloat(regionResult.rows[0].overall_factor);
        regionCode = regionResult.rows[0].region_code;
        regionName = regionResult.rows[0].region_name;
      }
    }

    // ── 5. Load Craftsman cost benchmarks ─────────────────
    const costResult = await pool.query(
      `SELECT system, condition_level, cost_unit, cost_low, cost_mid, cost_high
       FROM rehab_cost_benchmarks
       WHERE property_type = $1 OR property_type = 'both'
       ORDER BY system, condition_level`,
      [propertyType],
    );
    const craftsman: CraftsmanMap = {};
    for (const cr of costResult.rows) {
      if (!craftsman[cr.system]) craftsman[cr.system] = {};
      craftsman[cr.system][cr.condition_level] = {
        unit: cr.cost_unit,
        low: parseFloat(cr.cost_low),
        mid: parseFloat(cr.cost_mid),
        high: parseFloat(cr.cost_high),
      };
    }

    // ── 6. Analyze each system ────────────────────────────
    const analyses = activeSystems.map((sys) => analyzeSystem(sys, rows));

    // Average severity across all inspected systems
    const scored = analyses.filter((a) => a.effectiveCondition !== null && a.totalInspected > 0);
    const avgSeverity = scored.length > 0
      ? scored.reduce((acc, a) => {
          const w = CONDITION_WEIGHT[a.effectiveCondition!] ?? 0;
          return acc + w;
        }, 0) / scored.length
      : 0;

    // ── 7. Build all 9 strategy × tier packages ───────────
    const strategies = ['flip', 'brrrr', 'hold'] as const;
    const tiers = ['cosmetic', 'standard', 'full_gut'] as const;

    const strategiesOutput: Record<string, any> = {};
    for (const strat of strategies) {
      strategiesOutput[strat] = {};
      for (const tier of tiers) {
        strategiesOutput[strat][tier] = buildTier(
          strat,
          tier,
          analyses,
          craftsman,
          totalUnits,
          sqftPerUnit,
          regionalFactor,
          regionName,
          arvEstimate,
        );
      }
    }

    // ── 8. Recommendation ─────────────────────────────────
    const { recommended_tier, recommended_strategy, confidence, notes } =
      computeRecommendation(avgSeverity, samplingPct);

    const scopeData = {
      strategies: strategiesOutput,
      recommended_tier,
      recommended_strategy,
      confidence,
      notes,
      region: { code: regionCode, name: regionName, factor: regionalFactor },
      engine: 'deterministic_v1',
    };

    // ── 9. Persist scope ──────────────────────────────────
    const recommendedBudget =
      scopeData.strategies?.[recommended_strategy]?.[recommended_tier]?.total || 0;

    const existingResult = await pool.query(
      `SELECT id FROM re_rehab_scopes WHERE inspection_session_id = $1 LIMIT 1`,
      [sessionId],
    );

    let scopeRow: any;
    if (existingResult.rows[0]) {
      const updateResult = await pool.query(
        `UPDATE re_rehab_scopes
         SET scope_name = $2, line_items = $3, package_mix = $4,
             recommended_budget = $5, confidence = $6
         WHERE inspection_session_id = $1 RETURNING *`,
        [
          sessionId,
          `Field Scope — ${regionName} — ${new Date().toLocaleDateString()}`,
          JSON.stringify(scopeData.strategies),
          JSON.stringify({ recommended_tier, recommended_strategy, region: scopeData.region }),
          recommendedBudget,
          confidence,
        ],
      );
      scopeRow = updateResult.rows[0];
    } else {
      const insertResult = await pool.query(
        `INSERT INTO re_rehab_scopes (
           deal_id, inspection_session_id, scope_name,
           line_items, package_mix, recommended_budget, confidence
         ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          session.deal_id,
          sessionId,
          `Field Scope — ${regionName} — ${new Date().toLocaleDateString()}`,
          JSON.stringify(scopeData.strategies),
          JSON.stringify({ recommended_tier, recommended_strategy, region: scopeData.region }),
          recommendedBudget,
          confidence,
        ],
      );
      scopeRow = insertResult.rows[0];
    }

    // ── 10. Matrix event (non-blocking) ───────────────────
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
              unitsInspected: rows.length,
              totalUnits,
              samplingPct: Math.round(samplingPct),
              recommendedBudget,
              confidence,
              regionCode,
              engine: 'deterministic_v1',
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
      unitsInspected: rows.length,
      totalUnits,
      samplingPct: Math.round(samplingPct),
      region: scopeData.region,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to generate rehab scope',
      details: error?.message || String(error),
    });
  }
}
