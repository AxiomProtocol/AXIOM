import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { reTaxes } from '../../../../shared/realEstateSchema';
import { eq, desc, sql } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta, parseNumeric } from '../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET is accepted');
  }

  try {
    const { property_id, page = '1', limit = '20' } = req.query;

    if (!property_id || typeof property_id !== 'string') {
      return errorResponse(res, 400, 'INVALID_PARAMS', 'property_id is required');
    }

    const pageNum = Math.max(1, parseNumeric(page, 1));
    const limitNum = Math.min(100, Math.max(1, parseNumeric(limit, 20)));
    const offset = (pageNum - 1) * limitNum;

    const [countResult, taxes] = await Promise.all([
      db.select({ total: sql<number>`count(*)` })
        .from(reTaxes)
        .where(eq(reTaxes.propertyId, property_id)),
      db.select()
        .from(reTaxes)
        .where(eq(reTaxes.propertyId, property_id))
        .orderBy(desc(reTaxes.taxYear))
        .limit(limitNum)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    return successResponse(res, {
      taxes,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }, buildMeta(['internal_db'], taxes.length > 0 ? 1.0 : 0.4));

  } catch (err: any) {
    console.error('Taxes fetch error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch tax data');
  }
}
