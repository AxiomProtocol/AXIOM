import { pool } from '../../../lib/db';

export interface CalibrationResult {
  regionsUpdated: number;
  signalsProcessed: number;
  updates: Array<{
    regionCode: string;
    regionName: string;
    previousFactor: number;
    newFactor: number;
    sampleSize: number;
    avgVariancePct: number;
  }>;
}

const LEARNING_RATE = 0.08;
const MIN_SAMPLE_SIZE = 3;
const MAX_FACTOR_SHIFT = 0.10;
const FACTOR_FLOOR = 0.70;
const FACTOR_CEILING = 1.60;

function bayesianUpdate(prior: number, variance: number, weight: number): number {
  const adjustment = variance * LEARNING_RATE * weight;
  const clamped = Math.max(-MAX_FACTOR_SHIFT, Math.min(MAX_FACTOR_SHIFT, adjustment));
  const updated = prior * (1 + clamped);
  return Math.max(FACTOR_FLOOR, Math.min(FACTOR_CEILING, updated));
}

function resolveRegionCode(city: string, state: string): string | null {
  const normalized = (city || '').toLowerCase();
  if (['atlanta', 'decatur', 'marietta', 'smyrna'].some(c => normalized.includes(c))) return 'ATL';
  if (['charlotte', 'concord', 'gastonia'].some(c => normalized.includes(c))) return 'CLT';
  if (['houston', 'sugar land', 'pasadena', 'pearland'].some(c => normalized.includes(c))) return 'HOU';
  if (['dallas', 'fort worth', 'arlington', 'garland', 'irving', 'plano'].some(c => normalized.includes(c))) return 'DAL';
  if (['phoenix', 'mesa', 'scottsdale', 'tempe', 'glendale', 'chandler'].some(c => normalized.includes(c))) return 'PHX';
  if (['chicago', 'aurora', 'naperville', 'joliet'].some(c => normalized.includes(c))) return 'CHI';
  if (['detroit', 'warren', 'sterling heights', 'ann arbor'].some(c => normalized.includes(c))) return 'DET';
  if (['philadelphia', 'camden', 'chester'].some(c => normalized.includes(c))) return 'PHI';
  if (['boston', 'cambridge', 'somerville', 'quincy'].some(c => normalized.includes(c))) return 'BOS';
  if (['new york', 'brooklyn', 'bronx', 'queens', 'manhattan', 'staten island', 'newark', 'jersey city'].some(c => normalized.includes(c))) return 'NYC';
  if (['los angeles', 'long beach', 'compton', 'inglewood', 'pasadena', 'burbank', 'glendale'].some(c => normalized.includes(c))) return 'LA';
  if (['san francisco', 'oakland', 'san jose', 'berkeley', 'fremont'].some(c => normalized.includes(c))) return 'SF';
  if (['seattle', 'bellevue', 'tacoma', 'renton', 'kent'].some(c => normalized.includes(c))) return 'SEA';
  return 'NATIONAL';
}

export async function runBenchmarkCalibration(options?: { dryRun?: boolean }): Promise<CalibrationResult> {
  const { dryRun = false } = options || {};

  const outcomesRes = await pool.query(`
    SELECT
      vpo.id,
      vpo.actual_rehab_cost,
      vpo.deal_id,
      rd.property_id,
      rp.city,
      rp.state,
      ce.total_cost_mid as estimated_cost
    FROM verified_project_outcomes vpo
    JOIN re_deals rd ON rd.id = vpo.deal_id
    LEFT JOIN re_properties rp ON rp.id = rd.property_id
    LEFT JOIN cost_estimates ce ON ce.deal_id = vpo.deal_id
    WHERE vpo.status = 'approved'
      AND vpo.actual_rehab_cost > 0
      AND NOT EXISTS (
        SELECT 1 FROM market_cost_signals mcs
        WHERE mcs.payload->>'outcome_id' = vpo.id::text
          AND mcs.source_layer = 'verified_outcome'
      )
    ORDER BY vpo.reviewed_at DESC
    LIMIT 100
  `);

  if (outcomesRes.rows.length === 0) {
    return { regionsUpdated: 0, signalsProcessed: 0, updates: [] };
  }

  const regionBuckets: Record<string, {
    regionCode: string;
    variances: number[];
    outcomes: typeof outcomesRes.rows;
  }> = {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const row of outcomesRes.rows) {
      const regionCode = resolveRegionCode(row.city || '', row.state || '') || 'NATIONAL';
      if (!regionBuckets[regionCode]) {
        regionBuckets[regionCode] = { regionCode, variances: [], outcomes: [] };
      }

      let variancePct = 0;
      if (row.estimated_cost && Number(row.estimated_cost) > 0) {
        const actual = Number(row.actual_rehab_cost);
        const estimated = Number(row.estimated_cost);
        variancePct = (actual - estimated) / estimated;
      }

      regionBuckets[regionCode].variances.push(variancePct);
      regionBuckets[regionCode].outcomes.push(row);

      if (!dryRun) {
        await client.query(
          `INSERT INTO market_cost_signals
            (zip, market, source_layer, capex_per_unit, confidence, sample_size, payload, created_at)
           VALUES ($1, $2, 'verified_outcome', $3, $4, 1, $5, NOW())`,
          [
            null,
            regionCode,
            Number(row.actual_rehab_cost),
            variancePct === 0 ? 0.5 : 0.8,
            JSON.stringify({
              outcome_id: row.id,
              deal_id: row.deal_id,
              actual_cost: Number(row.actual_rehab_cost),
              estimated_cost: row.estimated_cost ? Number(row.estimated_cost) : null,
              variance_pct: variancePct,
            }),
          ]
        );
      }
    }

    const updates: CalibrationResult['updates'] = [];
    let regionsUpdated = 0;

    for (const [regionCode, bucket] of Object.entries(regionBuckets)) {
      if (bucket.variances.length < MIN_SAMPLE_SIZE) continue;

      const avgVariance = bucket.variances.reduce((a, b) => a + b, 0) / bucket.variances.length;
      const weight = Math.min(1.0, bucket.variances.length / 10);

      const factorRes = await client.query(
        `SELECT overall_factor, region_name FROM regional_cost_modifiers WHERE region_code = $1 LIMIT 1`,
        [regionCode]
      );

      if (factorRes.rows.length === 0) continue;

      const prior = Number(factorRes.rows[0].overall_factor);
      const regionName = factorRes.rows[0].region_name;
      const updated = bayesianUpdate(prior, avgVariance, weight);

      if (!dryRun) {
        await client.query(
          `UPDATE regional_cost_modifiers
           SET overall_factor = $1, updated_at = NOW()
           WHERE region_code = $2`,
          [updated.toFixed(4), regionCode]
        );
      }

      updates.push({
        regionCode,
        regionName,
        previousFactor: Number(prior.toFixed(4)),
        newFactor: Number(updated.toFixed(4)),
        sampleSize: bucket.variances.length,
        avgVariancePct: Number((avgVariance * 100).toFixed(2)),
      });
      regionsUpdated++;
    }

    if (!dryRun) {
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }

    return {
      regionsUpdated,
      signalsProcessed: outcomesRes.rows.length,
      updates,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
