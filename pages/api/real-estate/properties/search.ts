import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { reProperties } from '../../../../shared/realEstateSchema';
import { sql, ilike, and, gte, lte } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta, parseNumeric } from '../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET is accepted');
  }

  try {
    const { q, city, state, zip, property_type, min_sqft, max_sqft, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseNumeric(page, 1));
    const limitNum = Math.min(100, Math.max(1, parseNumeric(limit, 20)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];

    if (q && typeof q === 'string') {
      conditions.push(sql`similarity(address_normalized, ${q.toLowerCase()}) > 0.2`);
    }
    if (city && typeof city === 'string') {
      conditions.push(ilike(reProperties.city, `%${city}%`));
    }
    if (state && typeof state === 'string') {
      conditions.push(ilike(reProperties.state, state));
    }
    if (zip && typeof zip === 'string') {
      conditions.push(ilike(reProperties.zip, zip));
    }
    if (property_type && typeof property_type === 'string') {
      conditions.push(ilike(reProperties.propertyType, property_type));
    }
    if (min_sqft) {
      conditions.push(gte(reProperties.sqft, parseNumeric(min_sqft)));
    }
    if (max_sqft) {
      conditions.push(lte(reProperties.sqft, parseNumeric(max_sqft)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, properties] = await Promise.all([
      db.select({ total: sql<number>`count(*)` })
        .from(reProperties)
        .where(whereClause),
      db.select({
        id: reProperties.id,
        addressRaw: reProperties.addressRaw,
        addressNormalized: reProperties.addressNormalized,
        city: reProperties.city,
        state: reProperties.state,
        zip: reProperties.zip,
        propertyType: reProperties.propertyType,
        sqft: reProperties.sqft,
        bedrooms: reProperties.bedrooms,
        bathrooms: reProperties.bathrooms,
        yearBuilt: reProperties.yearBuilt,
        createdAt: reProperties.createdAt,
      })
        .from(reProperties)
        .where(whereClause)
        .orderBy(reProperties.createdAt)
        .limit(limitNum)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    return successResponse(res, {
      properties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, buildMeta(['internal_db'], properties.length > 0 ? 0.7 : 0.4));

  } catch (err: any) {
    console.error('Property search error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to search properties');
  }
}
