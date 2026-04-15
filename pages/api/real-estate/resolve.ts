import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../server/db';
import { reProperties, reDeals } from '../../../shared/realEstateSchema';
import { eq, sql } from 'drizzle-orm';
import { parseAddress, computeConfidence } from '../../../server/services/real-estate/address';
import { successResponse, errorResponse, buildMeta, safePropertyColumns } from '../../../server/services/real-estate/helpers';
import { enrichProperty } from '../../../server/services/real-estate/rentcast';
import { searchListings, isRepliersConfigured } from '../../../lib/re/repliers';

type MlsSnapshot = {
  listPrice?: number;
  daysOnMarket?: number;
  listingStatus?: string;
  mlsNumber?: string;
  isTestMode?: boolean;
};

async function doRepliersLookup(parsed: ReturnType<typeof parseAddress>): Promise<MlsSnapshot | null> {
  if (!isRepliersConfigured()) return null;
  if (!parsed.city && !parsed.zip) return null;
  try {
    const mlsResult = await searchListings({
      city: parsed.city || undefined,
      state: parsed.state || undefined,
      zip: parsed.zip || undefined,
      status: 'A',
      resultsPerPage: 5,
    });
    if (mlsResult.data?.listings?.length) {
      const match = mlsResult.data.listings[0];
      return {
        listPrice: match.listPrice,
        daysOnMarket: match.daysOnMarket ?? undefined,
        listingStatus: match.status,
        mlsNumber: match.mlsNumber,
        isTestMode: mlsResult.isTestMode,
      };
    }
  } catch (mlsErr: any) {
    console.warn('Repliers MLS lookup failed (non-blocking):', mlsErr.message);
  }
  return null;
}

async function persistMlsToDeal(dealId: string, mlsData: MlsSnapshot): Promise<void> {
  try {
    const [existingDeal] = await db.select().from(reDeals).where(eq(reDeals.id, dealId)).limit(1);
    if (existingDeal) {
      const existingDealMeta = (existingDeal.meta || {}) as Record<string, unknown>;
      await db.update(reDeals)
        .set({
          meta: {
            ...existingDealMeta,
            mlsEnrichment: { ...mlsData, enrichedAt: new Date().toISOString() },
          },
          updatedAt: new Date(),
        })
        .where(eq(reDeals.id, dealId));
    }
  } catch (dealErr: any) {
    console.warn('Deal MLS persistence failed (non-blocking):', dealErr.message);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST is accepted');
  }

  try {
    const { address, dealId } = req.body;
    if (!address || typeof address !== 'string' || address.trim().length < 5) {
      return errorResponse(res, 400, 'INVALID_ADDRESS', 'A valid address string is required (min 5 chars)');
    }

    const parsed = parseAddress(address);
    if (!parsed.normalized) {
      return errorResponse(res, 400, 'PARSE_FAILED', 'Could not parse the provided address', {
        confidence: 0.2,
        sources_used: ['user_input'],
      });
    }

    const existing = await db.select(safePropertyColumns)
      .from(reProperties)
      .where(eq(reProperties.addressNormalized, parsed.normalized))
      .limit(1);

    if (existing.length > 0) {
      const prop = existing[0];
      const confidence = computeConfidence(parsed, true, true);

      const mlsData = await doRepliersLookup(parsed);
      if (dealId && typeof dealId === 'string' && mlsData) {
        await persistMlsToDeal(dealId, mlsData);
      }

      const sources = ['internal_db', 'user_input'];
      if (mlsData) sources.push('repliers_mls');
      return successResponse(res, {
        propertyId: prop.id,
        addressNormalized: prop.addressNormalized,
        parsed,
        matched: true,
        mlsData: mlsData || undefined,
      }, buildMeta(sources, confidence));
    }

    try {
      const trigram = await db.select({
        id: reProperties.id,
        addressNormalized: reProperties.addressNormalized,
        streetNumber: reProperties.streetNumber,
        streetName: reProperties.streetName,
        city: reProperties.city,
        state: reProperties.state,
        zip: reProperties.zip,
        similarity: sql<number>`similarity(address_normalized, ${parsed.normalized})`,
      })
        .from(reProperties)
        .where(sql`similarity(address_normalized, ${parsed.normalized}) > 0.6`)
        .orderBy(sql`similarity(address_normalized, ${parsed.normalized}) DESC`)
        .limit(5);

      const validMatches = trigram.filter(m => {
        if (parsed.streetNumber && m.streetNumber && parsed.streetNumber !== m.streetNumber) return false;
        return true;
      });

      if (validMatches.length > 0) {
        const confidence = computeConfidence(parsed, true, false);

        const mlsData = await doRepliersLookup(parsed);
        if (dealId && typeof dealId === 'string' && mlsData) {
          await persistMlsToDeal(dealId, mlsData);
        }

        const sources = ['internal_db', 'user_input'];
        if (mlsData) sources.push('repliers_mls');
        return successResponse(res, {
          propertyId: validMatches[0].id,
          addressNormalized: validMatches[0].addressNormalized,
          parsed,
          matched: true,
          fuzzy: true,
          similarityScore: validMatches[0].similarity,
          alternatives: validMatches.slice(1).map(a => ({ id: a.id, addressNormalized: a.addressNormalized, similarity: a.similarity })),
          mlsData: mlsData || undefined,
        }, buildMeta(sources, confidence));
      }
    } catch (trigramErr: any) {
      console.warn('Trigram search unavailable (pg_trgm may not be installed):', trigramErr.message);
    }

    const newIdResult = await pool.query(`SELECT gen_random_uuid() as new_id`);
    const newPropId = newIdResult.rows[0].new_id;

    await pool.query(
      `INSERT INTO re_properties (id, address_raw, address_normalized, street_number, street_name,
         city, state, zip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newPropId,
        address.trim(),
        parsed.normalized,
        parsed.streetNumber || null,
        parsed.streetName || null,
        parsed.city || null,
        parsed.state || null,
        parsed.zip || null,
      ]
    );
    const propFetch = await pool.query(
      `SELECT id, address_raw AS "addressRaw", address_normalized AS "addressNormalized",
              city, state, zip
       FROM re_properties WHERE id = $1`,
      [newPropId]
    );
    const newProp = propFetch.rows[0];

    let enrichment = null;
    if (process.env.RENTCAST_API_KEY) {
      try {
        enrichment = await enrichProperty(newProp.id);
      } catch (err: any) {
        console.error('Auto-enrich failed (non-blocking):', err.message);
        enrichment = { enriched: false, error: err.message };
      }
    }

    const mlsData = await doRepliersLookup(parsed);
    if (dealId && typeof dealId === 'string' && mlsData) {
      await persistMlsToDeal(dealId, mlsData);
    }

    const sources = ['user_input'];
    if (enrichment?.enriched) sources.push('rentcast');
    if (mlsData) sources.push('repliers_mls');
    const confidence = computeConfidence(parsed, false, enrichment?.enriched || false);

    return successResponse(res, {
      propertyId: newProp.id,
      addressNormalized: newProp.addressNormalized,
      parsed,
      matched: false,
      created: true,
      enrichment,
      mlsData: mlsData || undefined,
    }, buildMeta(sources, confidence));

  } catch (err: any) {
    console.error('Address resolve error:', err.message, err.cause?.message, err.stack);
    const causeMsg = err.cause?.message || '';
    const errMsg = err.message || '';
    const isDbError = [errMsg, causeMsg].some(m =>
      m.includes('relation') || m.includes('connect') || m.includes('ECONNREFUSED') ||
      m.includes('does not exist') || m.includes('timeout')
    );
    const userMessage = isDbError
      ? 'Database connection issue. The system may need to be redeployed or the database is temporarily unavailable.'
      : 'Failed to resolve address';
    return errorResponse(res, 500, 'INTERNAL_ERROR', userMessage);
  }
}
