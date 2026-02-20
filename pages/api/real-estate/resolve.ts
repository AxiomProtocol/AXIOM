import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { reProperties } from '../../../shared/realEstateSchema';
import { eq, sql } from 'drizzle-orm';
import { parseAddress, computeConfidence } from '../../../server/services/real-estate/address';
import { successResponse, errorResponse, buildMeta } from '../../../server/services/real-estate/helpers';
import { enrichProperty } from '../../../server/services/real-estate/rentcast';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST is accepted');
  }

  try {
    const { address } = req.body;
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

    const existing = await db.select()
      .from(reProperties)
      .where(eq(reProperties.addressNormalized, parsed.normalized))
      .limit(1);

    if (existing.length > 0) {
      const prop = existing[0];
      const hasSaleOrTax = true;
      const confidence = computeConfidence(parsed, true, hasSaleOrTax);
      return successResponse(res, {
        propertyId: prop.id,
        addressNormalized: prop.addressNormalized,
        parsed,
        matched: true,
      }, buildMeta(['internal_db', 'user_input'], confidence));
    }

    const trigram = await db.select({
      id: reProperties.id,
      addressNormalized: reProperties.addressNormalized,
      similarity: sql<number>`similarity(address_normalized, ${parsed.normalized})`,
    })
      .from(reProperties)
      .where(sql`similarity(address_normalized, ${parsed.normalized}) > 0.3`)
      .orderBy(sql`similarity(address_normalized, ${parsed.normalized}) DESC`)
      .limit(5);

    if (trigram.length > 0) {
      const confidence = computeConfidence(parsed, true, false);
      return successResponse(res, {
        propertyId: trigram[0].id,
        addressNormalized: trigram[0].addressNormalized,
        parsed,
        matched: true,
        fuzzy: true,
        similarityScore: trigram[0].similarity,
        alternatives: trigram.slice(1),
      }, buildMeta(['internal_db', 'user_input'], confidence));
    }

    const [newProp] = await db.insert(reProperties).values({
      addressRaw: address.trim(),
      addressNormalized: parsed.normalized,
      city: parsed.city || null,
      state: parsed.state || null,
      zip: parsed.zip || null,
    }).returning();

    let enrichment = null;
    if (process.env.RENTCAST_API_KEY) {
      try {
        enrichment = await enrichProperty(newProp.id);
      } catch (err: any) {
        console.error('Auto-enrich failed (non-blocking):', err.message);
        enrichment = { enriched: false, error: err.message };
      }
    }

    const sources = ['user_input'];
    if (enrichment?.enriched) sources.push('rentcast');
    const confidence = computeConfidence(parsed, false, enrichment?.enriched || false);
    return successResponse(res, {
      propertyId: newProp.id,
      addressNormalized: newProp.addressNormalized,
      parsed,
      matched: false,
      created: true,
      enrichment,
    }, buildMeta(sources, confidence));

  } catch (err: any) {
    console.error('Address resolve error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to resolve address');
  }
}
