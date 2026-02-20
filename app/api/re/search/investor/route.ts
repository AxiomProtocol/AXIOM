import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function nowIso(): string {
  return new Date().toISOString();
}

interface InvestorSearchBody {
  q?: string;
  lat?: number;
  lon?: number;
  radius_meters?: number;
  bbox?: {
    min_lon: number;
    min_lat: number;
    max_lon: number;
    max_lat: number;
  };
  strategy?: string;
  min_arv?: number;
  max_purchase_price?: number;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: InvestorSearchBody = await request.json();
    const {
      q,
      lat,
      lon,
      radius_meters,
      bbox,
      strategy,
      min_arv,
      max_purchase_price,
      limit: limitParam,
    } = body;

    const limit = Math.min(limitParam ?? 20, 100);
    const conditions: string[] = [`p.is_active = TRUE`];
    const params: (string | number)[] = [];
    let idx = 1;

    if (q) {
      conditions.push(`similarity(p.address_normalized, $${idx}) > 0.15`);
      params.push(q.toLowerCase());
      idx++;
    }

    if (lat !== undefined && lon !== undefined && radius_meters !== undefined) {
      conditions.push(
        `ST_DWithin(p.location_point::geography, ST_MakePoint($${idx}, $${idx + 1})::geography, $${idx + 2})`
      );
      params.push(lon, lat, radius_meters);
      idx += 3;
    } else if (bbox) {
      conditions.push(
        `ST_Within(p.location_point, ST_MakeEnvelope($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, 4326))`
      );
      params.push(bbox.min_lon, bbox.min_lat, bbox.max_lon, bbox.max_lat);
      idx += 4;
    }

    if (strategy) {
      conditions.push(`d.strategy = $${idx}`);
      params.push(strategy);
      idx++;
    }

    if (min_arv !== undefined) {
      conditions.push(`a.arv_estimate >= $${idx}`);
      params.push(min_arv);
      idx++;
    }

    if (max_purchase_price !== undefined) {
      conditions.push(`a.purchase_price <= $${idx}`);
      params.push(max_purchase_price);
      idx++;
    }

    params.push(limit);

    const whereClause = conditions.join(' AND ');

    const result = await db.query(
      `SELECT
         d.id AS deal_id,
         d.deal_name,
         d.strategy,
         d.status,
         d.target_purchase_price,
         p.id AS property_id,
         p.address_normalized,
         p.city,
         p.state,
         p.zip,
         p.lat,
         p.lon,
         p.property_type,
         p.sqft,
         p.bedrooms,
         a.purchase_price,
         a.arv_estimate,
         a.monthly_rent,
         m.cap_rate,
         m.cash_on_cash,
         m.dscr,
         m.noi,
         CASE WHEN a.purchase_price > 0 THEN (a.arv_estimate - a.purchase_price) / a.purchase_price ELSE NULL END AS margin_pct
       FROM re_deals d
       JOIN re_properties p ON p.id = d.property_id
       LEFT JOIN re_deal_scenarios s ON s.deal_id = d.id AND s.is_primary = TRUE
       LEFT JOIN re_deal_assumptions a ON a.scenario_id = s.id
       LEFT JOIN re_deal_metrics m ON m.scenario_id = s.id
       WHERE ${whereClause}
       ORDER BY margin_pct DESC NULLS LAST, m.cap_rate DESC NULLS LAST
       LIMIT $${idx}`,
      params
    );

    const rows = result.rows;

    const ranked = rows.map((row: Record<string, unknown>) => {
      const passedConstraints: string[] = [];
      const failedConstraints: string[] = [];
      const tightConstraints: string[] = [];

      if (q) {
        passedConstraints.push('address_match');
      }

      if (lat !== undefined && lon !== undefined && radius_meters !== undefined) {
        passedConstraints.push('geo_radius');
      }

      if (bbox) {
        passedConstraints.push('geo_bbox');
      }

      const capRate = parseFloat(String(row.cap_rate)) || 0;
      const dscr = parseFloat(String(row.dscr)) || 0;
      const marginPct = parseFloat(String(row.margin_pct)) || 0;

      if (capRate < 0.05) {
        tightConstraints.push('cap_rate_below_5pct');
      } else {
        passedConstraints.push('cap_rate_above_5pct');
      }

      if (dscr < 1.0) {
        failedConstraints.push('dscr_below_1');
      } else if (dscr < 1.2) {
        tightConstraints.push('dscr_below_1_2');
      } else {
        passedConstraints.push('dscr_adequate');
      }

      if (marginPct < 0.1) {
        failedConstraints.push('low_margin');
      } else if (marginPct < 0.2) {
        tightConstraints.push('thin_margin');
      } else {
        passedConstraints.push('adequate_margin');
      }

      return {
        ...row,
        explanation: {
          passed_constraints: passedConstraints,
          failed_constraints: failedConstraints,
          tight_constraints: tightConstraints,
        },
      };
    });

    const warnings: string[] = [];
    if (rows.length === limit) {
      warnings.push(`Results limited to ${limit}`);
    }
    if (!q && !lat && !bbox) {
      warnings.push('No geo or text filter applied - results may be broad');
    }

    return NextResponse.json({
      data: ranked,
      meta: {
        as_of: nowIso(),
        sources_used: ['internal_db', 'derived_computation'],
        confidence: rows.length > 0 ? 0.7 : 0.4,
        warnings,
      },
    });
  } catch (error) {
    console.error('Error in investor search endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to perform investor search' },
      },
      { status: 500 }
    );
  }
}
