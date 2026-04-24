import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { reProperties, reSales, reDealMetrics, reDeals, reDealScenarios } from '../../../shared/realEstateSchema';
import { eq, desc, and, gte, lte, ilike, sql } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta, parseNumeric, safePropertyColumns } from '../../../server/services/real-estate/helpers';

interface InvestorConstraint {
  field: string;
  op: 'gte' | 'lte' | 'eq' | 'between';
  value: number | [number, number];
}

interface RankedResult {
  property: Record<string, unknown>;
  score: number;
  explanations: {
    passed_constraints: string[];
    failed_constraints: string[];
    tight_constraints: string[];
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST is accepted');
  }

  try {
    const {
      address_query,
      city, state, zip, property_type,
      lat, lon, radius_miles,
      bbox,
      min_sqft, max_sqft,
      min_cap_rate, min_cash_on_cash, max_price,
      sort_by = 'score',
      limit: queryLimit = 20,
    } = req.body;

    const conditions = [];
    const warnings: string[] = [];

    if (address_query && typeof address_query === 'string') {
      conditions.push(sql`similarity(${reProperties.addressNormalized}, ${address_query.toLowerCase()}) > 0.2`);
    }
    if (city) conditions.push(ilike(reProperties.city, `%${city}%`));
    if (state) conditions.push(ilike(reProperties.state, state));
    if (zip) conditions.push(ilike(reProperties.zip, zip));
    if (property_type) conditions.push(ilike(reProperties.propertyType, property_type));
    if (min_sqft) conditions.push(gte(reProperties.sqft, parseNumeric(min_sqft)));
    if (max_sqft) conditions.push(lte(reProperties.sqft, parseNumeric(max_sqft)));

    if (lat && lon && radius_miles) {
      const radiusKm = parseNumeric(radius_miles) * 1.60934;
      conditions.push(
        sql`(6371 * acos(cos(radians(${parseNumeric(lat)})) * cos(radians(${reProperties.lat}::float8)) * cos(radians(${reProperties.lon}::float8) - radians(${parseNumeric(lon)})) + sin(radians(${parseNumeric(lat)})) * sin(radians(${reProperties.lat}::float8)))) <= ${radiusKm}`
      );
    }

    if (bbox && Array.isArray(bbox) && bbox.length === 4) {
      conditions.push(
        sql`${reProperties.lat}::float8 BETWEEN ${bbox[1]} AND ${bbox[3]} AND ${reProperties.lon}::float8 BETWEEN ${bbox[0]} AND ${bbox[2]}`
      );
    }

    const limitNum = Math.min(100, Math.max(1, parseNumeric(queryLimit, 20)));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const properties = await db.select(safePropertyColumns)
      .from(reProperties)
      .where(whereClause)
      .limit(limitNum * 2);

    if (properties.length === 0) {
      return successResponse(res, {
        results: [],
        total: 0,
      }, buildMeta(['internal_db'], 0.4, ['No properties matched the search criteria']));
    }

    const ranked: RankedResult[] = [];

    for (const prop of properties) {
      let score = 50;
      const passed: string[] = [];
      const failed: string[] = [];
      const tight: string[] = [];

      const deals = await db.select().from(reDeals)
        .where(eq(reDeals.propertyId, prop.id)).limit(5);

      let bestMetrics: Record<string, unknown> | null = null;
      for (const deal of deals) {
        const scenarios = await db.select().from(reDealScenarios)
          .where(eq(reDealScenarios.dealId, deal.id));
        for (const scenario of scenarios) {
          const [metrics] = await db.select().from(reDealMetrics)
            .where(eq(reDealMetrics.scenarioId, scenario.id)).limit(1);
          if (metrics) {
            bestMetrics = metrics as any;
          }
        }
      }

      if (bestMetrics) {
        const capRate = parseNumeric((bestMetrics as any).capRate);
        const cashOnCash = parseNumeric((bestMetrics as any).cashOnCash);
        const dscr = parseNumeric((bestMetrics as any).dscr);

        score += capRate * 3;
        score += cashOnCash * 2;
        if (dscr >= 1.25) { score += 15; passed.push('DSCR >= 1.25'); }
        else if (dscr >= 1.0) { score += 5; tight.push('DSCR between 1.0 and 1.25'); }
        else { score -= 20; failed.push('DSCR below 1.0'); }

        if (min_cap_rate && capRate >= parseNumeric(min_cap_rate)) {
          passed.push(`Cap rate ${capRate.toFixed(1)}% meets min ${min_cap_rate}%`);
        } else if (min_cap_rate) {
          failed.push(`Cap rate ${capRate.toFixed(1)}% below min ${min_cap_rate}%`);
          score -= 10;
        }

        if (min_cash_on_cash && cashOnCash >= parseNumeric(min_cash_on_cash)) {
          passed.push(`Cash-on-cash ${cashOnCash.toFixed(1)}% meets min ${min_cash_on_cash}%`);
        } else if (min_cash_on_cash) {
          failed.push(`Cash-on-cash ${cashOnCash.toFixed(1)}% below min ${min_cash_on_cash}%`);
          score -= 10;
        }
      } else {
        score -= 10;
        warnings.push(`Property ${prop.id} has no computed metrics`);
      }

      if (address_query) {
        passed.push('Address match via trigram similarity');
        score += 5;
      }

      ranked.push({
        property: {
          id: prop.id,
          addressRaw: prop.addressRaw,
          addressNormalized: prop.addressNormalized,
          city: prop.city,
          state: prop.state,
          zip: prop.zip,
          propertyType: prop.propertyType,
          sqft: prop.sqft,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          yearBuilt: prop.yearBuilt,
          metrics: bestMetrics,
        },
        score: Math.max(0, Math.min(100, Math.round(score))),
        explanations: { passed_constraints: passed, failed_constraints: failed, tight_constraints: tight },
      });
    }

    ranked.sort((a, b) => b.score - a.score);
    const finalResults = ranked.slice(0, limitNum);

    return successResponse(res, {
      results: finalResults,
      total: finalResults.length,
    }, buildMeta(['internal_db', 'derived_computation'], finalResults.length > 0 ? 0.7 : 0.4, warnings.length > 0 ? warnings : undefined));

  } catch (err: any) {
    console.error('Investor search error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to execute investor search');
  }
}
