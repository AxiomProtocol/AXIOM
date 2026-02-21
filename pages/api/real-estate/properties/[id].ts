import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { reProperties, reSales, reTaxes, rePropertyFacts } from '../../../../shared/realEstateSchema';
import { eq, desc } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta, safePropertyColumns } from '../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET is accepted');
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return errorResponse(res, 400, 'INVALID_ID', 'Property ID is required');
    }

    const [property] = await db.select(safePropertyColumns)
      .from(reProperties)
      .where(eq(reProperties.id, id))
      .limit(1);

    if (!property) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Property not found');
    }

    const [sales, taxes, facts] = await Promise.all([
      db.select().from(reSales)
        .where(eq(reSales.propertyId, id))
        .orderBy(desc(reSales.saleDate))
        .limit(10),
      db.select().from(reTaxes)
        .where(eq(reTaxes.propertyId, id))
        .orderBy(desc(reTaxes.taxYear))
        .limit(10),
      db.select().from(rePropertyFacts)
        .where(eq(rePropertyFacts.propertyId, id))
        .limit(50),
    ]);

    const hasRecords = sales.length > 0 || taxes.length > 0;
    const confidence = hasRecords ? 1.0 : 0.7;
    const sources = ['internal_db'];

    return successResponse(res, {
      property,
      sales,
      taxes,
      facts,
    }, buildMeta(sources, confidence));

  } catch (err: any) {
    console.error('Property profile error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch property profile');
  }
}
