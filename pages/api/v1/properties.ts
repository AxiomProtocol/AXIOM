/**
 * Axiom Data API — v1/properties
 *
 * Public tiered API for the Axiom distressed property dataset.
 * Authentication: X-Api-Key header or ?api_key= query param
 *
 * Tiers:
 *   free       — 10 req/day, JSON only, limited fields
 *   starter    — 500 req/day, JSON, all fields
 *   pro        — 5,000 req/day, JSON + CSV, all filters
 *   enterprise — Unlimited, all capabilities
 *
 * GET /api/v1/properties
 *   ?state=TX           Filter by state (2-letter code)
 *   ?city=Houston       Filter by city (partial match)
 *   ?county=Harris      Filter by county
 *   ?distressType=foreclosure|tax_lien|lis_pendens|pre_foreclosure|reo|auction
 *   ?source=courthouse|attom|hud|usda|...
 *   ?minPrice=100000
 *   ?maxPrice=400000
 *   ?propertyType=single_family
 *   ?page=1             (default 1)
 *   ?limit=25           (max: free=10, starter=50, pro=100, enterprise=250)
 *   ?format=json|csv    (csv requires starter+)
 *   ?sort=price_asc|price_desc|newest|auction_date
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { dpListings, dpApiKeys, TIER_DAILY_LIMITS } from '../../../shared/distressedFeedSchema';
import { eq, and, gte, lte, like, sql, desc, asc } from 'drizzle-orm';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

const TIER_MAX_LIMIT: Record<string, number> = {
  free: 10,
  starter: 50,
  pro: 100,
  enterprise: 250,
};

const FREE_FIELDS = ['id', 'address', 'city', 'state', 'zip', 'distressType', 'listPrice', 'propertyType', 'ingestedAt'] as const;

function maskFreeFields(listing: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of FREE_FIELDS) out[key] = listing[key];
  return out;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(',')
    ),
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// API key validation and rate limit check
// ---------------------------------------------------------------------------

async function validateAndThrottle(rawKey: string): Promise<{
  ok: boolean;
  tier: string;
  reason?: string;
  keyRow?: typeof dpApiKeys.$inferSelect;
}> {
  const rows = await db.select().from(dpApiKeys).where(eq(dpApiKeys.apiKey, rawKey)).limit(1);
  if (rows.length === 0) return { ok: false, reason: 'Invalid API key' };

  const key = rows[0];
  if (!key.active) return { ok: false, reason: 'API key is inactive' };

  const today = todayStr();

  // Reset counter if it's a new day
  if (key.resetDate !== today) {
    await db.update(dpApiKeys)
      .set({ requestsToday: 1, resetDate: today, lastUsedAt: new Date() })
      .where(eq(dpApiKeys.id, key.id));
    return { ok: true, tier: key.tier, keyRow: { ...key, requestsToday: 1, resetDate: today } };
  }

  const limit = TIER_DAILY_LIMITS[key.tier] ?? 10;
  if (key.requestsToday >= limit) {
    return {
      ok: false,
      reason: `Daily limit reached (${limit} requests/day on ${key.tier} tier). Resets at midnight UTC.`,
    };
  }

  await db.update(dpApiKeys)
    .set({ requestsToday: key.requestsToday + 1, lastUsedAt: new Date() })
    .where(eq(dpApiKeys.id, key.id));

  return { ok: true, tier: key.tier, keyRow: key };
}

// ---------------------------------------------------------------------------
// POST /api/v1/properties/keys — provision a free API key (self-serve)
// Not in this file — see /api/v1/keys.ts
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only GET is supported on this endpoint
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', allowed: ['GET'] });
  }

  // Extract API key
  const rawKey = (
    req.headers['x-api-key'] as string ||
    req.query.api_key as string ||
    ''
  ).trim();

  if (!rawKey) {
    return res.status(401).json({
      error: 'Authentication required',
      detail: 'Pass your API key via X-Api-Key header or ?api_key= query parameter.',
      docs: 'https://axiomprotocol.io/api-docs',
      getKey: '/api/v1/keys',
    });
  }

  const auth = await validateAndThrottle(rawKey);
  if (!auth.ok) {
    return res.status(auth.reason?.includes('limit') ? 429 : 401).json({
      error: auth.reason,
      docs: 'https://axiomprotocol.io/api-docs',
    });
  }

  const { tier } = auth;
  const today = todayStr();

  // Parse query params
  const {
    state, city, county, distressType, source,
    minPrice, maxPrice, propertyType,
    page = '1', limit: limitParam, format = 'json', sort = 'newest',
  } = req.query as Record<string, string>;

  const maxLimit = TIER_MAX_LIMIT[tier] ?? 10;
  const limit    = Math.min(parseInt(limitParam || '25', 10) || 25, maxLimit);
  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const offset   = (pageNum - 1) * limit;

  // CSV requires starter+
  if (format === 'csv' && tier === 'free') {
    return res.status(403).json({ error: 'CSV export requires Starter tier or above.' });
  }

  // Build filters
  const filters = [];
  filters.push(eq(dpListings.status, 'active'));

  if (state)        filters.push(eq(dpListings.state, state.toUpperCase()));
  if (county)       filters.push(like(dpListings.county!, `%${county}%`));
  if (propertyType) filters.push(eq(dpListings.propertyType, propertyType));
  if (distressType) {
    const validTypes = ['foreclosure','tax_lien','reo','wholesale','short_sale','auction','government','pre_foreclosure','lis_pendens'];
    if (validTypes.includes(distressType)) {
      filters.push(sql`${dpListings.distressType} = ${distressType}`);
    }
  }
  if (source) {
    const validSources = ['hud','fannie_mae','freddie_mac','usda','wholesaler','tax_sale','manual','attom','courthouse'];
    if (validSources.includes(source)) {
      filters.push(sql`${dpListings.source} = ${source}`);
    }
  }
  if (city)         filters.push(like(dpListings.city, `%${city}%`));
  if (minPrice)     filters.push(gte(dpListings.listPrice, minPrice));
  if (maxPrice)     filters.push(lte(dpListings.listPrice, maxPrice));

  // Sort
  let orderBy;
  switch (sort) {
    case 'price_asc':   orderBy = asc(dpListings.listPrice); break;
    case 'price_desc':  orderBy = desc(dpListings.listPrice); break;
    case 'auction_date': orderBy = asc(dpListings.auctionDate); break;
    default:            orderBy = desc(dpListings.ingestedAt); break;
  }

  // Execute query
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, countRows] = await Promise.all([
    db.select().from(dpListings).where(where).orderBy(orderBy).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(dpListings).where(where),
  ]);

  const total = countRows[0]?.count ?? 0;

  // Serialize rows — free tier gets masked fields
  const serialized = rows.map(r => {
    const obj: Record<string, unknown> = {
      id: r.id,
      source: r.source,
      address: r.address,
      city: r.city,
      state: r.state,
      zip: r.zip,
      county: r.county,
      propertyType: r.propertyType,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      sqft: r.sqft,
      yearBuilt: r.yearBuilt,
      listPrice: r.listPrice ? parseFloat(String(r.listPrice)) : null,
      estimatedValue: r.estimatedValue ? parseFloat(String(r.estimatedValue)) : null,
      discountPct: r.discountPct ? parseFloat(String(r.discountPct)) : null,
      distressType: r.distressType,
      status: r.status,
      auctionDate: r.auctionDate,
      sourceUrl: r.sourceUrl,
      description: r.description,
      ingestedAt: r.ingestedAt,
      updatedAt: r.updatedAt,
      metadata: r.metadata,
    };
    return tier === 'free' ? maskFreeFields(obj) : obj;
  });

  // Respond
  if (format === 'csv') {
    const csv = toCsv(serialized as Record<string, unknown>[]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="axiom-distressed-${today}.csv"`);
    return res.status(200).send(csv);
  }

  const remaining = Math.max(0, (TIER_DAILY_LIMITS[tier] ?? 10) - (auth.keyRow!.requestsToday));

  return res.status(200).json({
    meta: {
      total,
      page: pageNum,
      limit,
      pages: Math.ceil(total / limit),
      tier,
      requestsRemaining: remaining,
      dailyLimit: TIER_DAILY_LIMITS[tier] ?? 10,
      source: 'Axiom Protocol Distressed Property Dataset',
      generatedAt: new Date().toISOString(),
    },
    data: serialized,
  });
}
