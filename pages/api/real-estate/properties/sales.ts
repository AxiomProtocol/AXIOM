import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { reSales, reProperties } from '../../../../shared/realEstateSchema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta, parseNumeric } from '../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET is accepted');
  }

  try {
    const { property_id, min_price, max_price, start_date, end_date, page = '1', limit = '20' } = req.query;

    if (!property_id || typeof property_id !== 'string') {
      return errorResponse(res, 400, 'INVALID_PARAMS', 'property_id is required');
    }

    const pageNum = Math.max(1, parseNumeric(page, 1));
    const limitNum = Math.min(100, Math.max(1, parseNumeric(limit, 20)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(reSales.propertyId, property_id)];

    if (min_price) {
      conditions.push(gte(reSales.salePrice, String(parseNumeric(min_price))));
    }
    if (max_price) {
      conditions.push(lte(reSales.salePrice, String(parseNumeric(max_price))));
    }
    if (start_date && typeof start_date === 'string') {
      conditions.push(gte(reSales.saleDate, start_date));
    }
    if (end_date && typeof end_date === 'string') {
      conditions.push(lte(reSales.saleDate, end_date));
    }

    const whereClause = and(...conditions);

    const [countResult, sales] = await Promise.all([
      db.select({ total: sql<number>`count(*)` })
        .from(reSales)
        .where(whereClause),
      db.select()
        .from(reSales)
        .where(whereClause)
        .orderBy(desc(reSales.saleDate))
        .limit(limitNum)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    return successResponse(res, {
      sales,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }, buildMeta(['internal_db'], sales.length > 0 ? 1.0 : 0.4));

  } catch (err: any) {
    console.error('Sales fetch error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch sales data');
  }
}
