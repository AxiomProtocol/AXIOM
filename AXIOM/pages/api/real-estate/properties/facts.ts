import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { rePropertyFacts } from '../../../../shared/realEstateSchema';
import { eq, sql } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta } from '../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET is accepted');
  }

  try {
    const { property_id } = req.query;

    if (!property_id || typeof property_id !== 'string') {
      return errorResponse(res, 400, 'INVALID_PARAMS', 'property_id is required');
    }

    const facts = await db.select()
      .from(rePropertyFacts)
      .where(eq(rePropertyFacts.propertyId, property_id));

    const grouped: Record<string, { value: string | null; sourceId: string | null; asOf: string | null }> = {};
    for (const fact of facts) {
      grouped[fact.factType] = {
        value: fact.factValue,
        sourceId: fact.sourceId,
        asOf: fact.asOf,
      };
    }

    return successResponse(res, {
      propertyId: property_id,
      facts: grouped,
      factCount: facts.length,
    }, buildMeta(['internal_db'], facts.length > 0 ? 0.7 : 0.4));

  } catch (err: any) {
    console.error('Facts fetch error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch property facts');
  }
}
