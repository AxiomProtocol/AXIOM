import type { NextApiRequest, NextApiResponse } from 'next';
import { enrichProperty } from '../../../../server/services/real-estate/rentcast';
import { successResponse, errorResponse, buildMeta } from '../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST is accepted');
  }

  try {
    const { propertyId } = req.body;
    if (!propertyId || typeof propertyId !== 'string') {
      return errorResponse(res, 400, 'INVALID_PARAMS', 'propertyId is required');
    }

    if (!process.env.RENTCAST_API_KEY) {
      return errorResponse(res, 503, 'SERVICE_UNAVAILABLE', 'Property data enrichment is not configured');
    }

    const result = await enrichProperty(propertyId);

    if (!result.enriched) {
      return errorResponse(res, 404, 'NO_DATA', result.error || 'No property data found from external sources');
    }

    return successResponse(res, {
      propertyId,
      ...result,
    }, buildMeta(['rentcast', 'internal_db'], 0.9));

  } catch (err: any) {
    console.error('Enrich error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to enrich property data');
  }
}
