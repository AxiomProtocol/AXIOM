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
    const isRentCastError = err.message?.includes('RentCast API');
    const userMessage = isRentCastError
      ? `Property data lookup failed: ${err.message.replace(/RentCast API \d+: /, '').slice(0, 200)}`
      : 'Failed to enrich property data';
    return errorResponse(res, 500, 'ENRICH_FAILED', userMessage);
  }
}
