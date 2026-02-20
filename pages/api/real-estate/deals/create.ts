import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { reDeals, reProperties } from '../../../../shared/realEstateSchema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta } from '../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST is accepted');
  }

  try {
    const { propertyId, strategy, name, notes } = req.body;

    if (!propertyId || typeof propertyId !== 'string') {
      return errorResponse(res, 400, 'INVALID_PARAMS', 'propertyId is required');
    }

    const validStrategies = ['brrrr', 'flip', 'hold', 'note', 'multifamily'];
    if (!strategy || !validStrategies.includes(strategy)) {
      return errorResponse(res, 400, 'INVALID_STRATEGY', `Strategy must be one of: ${validStrategies.join(', ')}`);
    }

    const [property] = await db.select()
      .from(reProperties)
      .where(eq(reProperties.id, propertyId))
      .limit(1);

    if (!property) {
      return errorResponse(res, 404, 'PROPERTY_NOT_FOUND', 'Referenced property does not exist');
    }

    const [deal] = await db.insert(reDeals).values({
      propertyId,
      strategy,
      status: 'draft',
      dealName: name || `${strategy.toUpperCase()} - ${property.addressNormalized || property.addressRaw}`,
      notes: notes || null,
    }).returning();

    return successResponse(res, { deal }, buildMeta(['internal_db', 'user_input'], 0.7));

  } catch (err: any) {
    console.error('Deal create error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to create deal');
  }
}
