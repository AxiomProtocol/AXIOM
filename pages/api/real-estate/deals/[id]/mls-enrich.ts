import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { reDeals, reProperties } from '../../../../../shared/realEstateSchema';
import { eq } from 'drizzle-orm';
import { searchListings, isRepliersConfigured } from '../../../../../lib/re/repliers';
import { successResponse, errorResponse, buildMeta } from '../../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET or POST accepted');
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  try {
    const [deal] = await db.select().from(reDeals).where(eq(reDeals.id, id)).limit(1);
    if (!deal) {
      return errorResponse(res, 404, 'DEAL_NOT_FOUND', 'Deal does not exist');
    }

    const existingMeta = (deal.meta || {}) as Record<string, unknown>;

    if (req.method === 'GET') {
      return successResponse(res, {
        mlsEnrichment: (existingMeta.mlsEnrichment as Record<string, unknown>) || null,
      }, buildMeta(['internal_db'], 1.0));
    }

    if (!isRepliersConfigured()) {
      return successResponse(res, {
        mlsEnrichment: null,
        configured: false,
      }, buildMeta([], 0, ['Repliers API not configured']));
    }

    const [property] = await db.select().from(reProperties).where(eq(reProperties.id, deal.propertyId)).limit(1);
    if (!property) {
      return errorResponse(res, 404, 'PROPERTY_NOT_FOUND', 'Associated property not found');
    }

    const city = property.city || undefined;
    const state = property.state || undefined;
    const zip = property.zip || undefined;

    if (!city && !zip) {
      return successResponse(res, {
        mlsEnrichment: null,
        configured: true,
        reason: 'Insufficient address data for MLS lookup',
      }, buildMeta([], 0, ['Insufficient address data']));
    }

    const mlsResult = await searchListings({
      city,
      state,
      zip,
      status: 'A',
      resultsPerPage: 5,
    });

    let mlsEnrichment: Record<string, unknown>;

    if (mlsResult.data?.listings?.length) {
      const match = mlsResult.data.listings[0];
      mlsEnrichment = {
        listPrice: match.listPrice ?? null,
        daysOnMarket: match.daysOnMarket ?? null,
        listingStatus: match.status ?? null,
        mlsNumber: match.mlsNumber ?? null,
        isTestMode: mlsResult.isTestMode,
        enrichedAt: new Date().toISOString(),
      };
    } else {
      mlsEnrichment = {
        listPrice: null,
        daysOnMarket: null,
        listingStatus: null,
        mlsNumber: null,
        isTestMode: mlsResult.isTestMode,
        enrichedAt: new Date().toISOString(),
        noListingFound: true,
      };
    }

    const updatedMeta = { ...existingMeta, mlsEnrichment };
    await db.update(reDeals)
      .set({ meta: updatedMeta, updatedAt: new Date() })
      .where(eq(reDeals.id, id));

    return successResponse(res, {
      mlsEnrichment,
      configured: true,
    }, buildMeta(['repliers_mls'], mlsResult.isTestMode ? 0.6 : 0.9));

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('MLS enrich error:', msg);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to enrich deal with MLS data');
  }
}
