import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { dpListings } from '../../../../shared/distressedFeedSchema';
import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm';
import { searchListings, isRepliersConfigured } from '../../../../lib/re/repliers';

async function handleMlsRepliers(req: NextApiRequest, res: NextApiResponse) {
  const { city, state, zip, min_price, max_price, min_bedrooms, min_beds, page = '1' } = req.query;
  const effectiveMinBeds = min_beds || min_bedrooms;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);

  if (!isRepliersConfigured()) {
    return res.json({
      listings: [],
      isTestMode: true,
      configured: false,
      source: 'mls_repliers',
      pagination: { page: pageNum, total: 0, totalPages: 0, limit: 20 },
    });
  }

  const result = await searchListings({
    city: city ? String(city) : undefined,
    state: state ? String(state) : undefined,
    zip: zip ? String(zip) : undefined,
    lastStatus: ['Pc', 'Exp'],
    daysOnMarketMin: 60,
    minPrice: min_price ? parseInt(String(min_price), 10) : undefined,
    maxPrice: max_price ? parseInt(String(max_price), 10) : undefined,
    minBeds: effectiveMinBeds ? parseInt(String(effectiveMinBeds), 10) : undefined,
    resultsPerPage: 20,
    pageNum,
  });

  const raw = result.data?.listings || [];
  const lastStatusLabel: Record<string, string> = {
    Pc: 'Price Changed',
    Exp: 'Expired',
    Sus: 'Suspended',
    Ter: 'Terminated',
  };

  const listings = raw.map((l) => {
    const addr = l.address || {};
    const fullAddress = [addr.streetNumber, addr.streetName, addr.streetSuffix].filter(Boolean).join(' ');
    const sqftRaw = l.details?.sqft;
    const sqft = sqftRaw ? parseInt(sqftRaw.replace(/[^0-9]/g, ''), 10) || null : null;

    return {
      mlsNumber: l.mlsNumber || null,
      source: 'mls_repliers',
      address: fullAddress || 'Address unavailable',
      city: addr.city || '',
      state: addr.state || '',
      zip: addr.zip || '',
      propertyType: l.details?.propertyType || 'Residential',
      bedrooms: l.details?.numBedrooms ?? null,
      bathrooms: l.details?.numBathrooms ?? null,
      sqft,
      yearBuilt: l.details?.yearBuilt ? parseInt(l.details.yearBuilt, 10) : null,
      listPrice: l.listPrice || 0,
      daysOnMarket: l.daysOnMarket ?? null,
      status: l.status || '',
      lastStatus: l.lastStatus || '',
      lastStatusLabel: lastStatusLabel[l.lastStatus || ''] || l.lastStatus || '',
      listDate: l.listDate || null,
      images: (l.images || []).map((img) => img.startsWith('http') ? img : `https://api.repliers.io/${img}`),
      description: l.details?.description || null,
      addressKey: l.addressKey || null,
      sourceUrl: l.mlsNumber ? `https://repliers.com/listing/${l.mlsNumber}` : null,
    };
  });

  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    listings,
    isTestMode: result.isTestMode,
    configured: true,
    source: 'mls_repliers',
    pagination: {
      page: pageNum,
      total: result.data?.count || listings.length,
      totalPages: result.data?.numPages || 1,
      limit: 20,
    },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { source } = req.query;

    if (source === 'mls_repliers') {
      return handleMlsRepliers(req, res);
    }

    const {
      state, city, distress_type, min_price, max_price,
      property_type, min_bedrooms, min_sqft,
      sort_by = 'newest', page = '1', limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(dpListings.status, 'active')];

    if (state) conditions.push(eq(dpListings.state, String(state).toUpperCase()));
    if (city) conditions.push(sql`LOWER(${dpListings.city}) = LOWER(${String(city)})`);
    if (distress_type) conditions.push(eq(dpListings.distressType, String(distress_type) as any));
    if (property_type) conditions.push(eq(dpListings.propertyType, String(property_type)));
    if (min_price) conditions.push(gte(dpListings.listPrice, String(min_price)));
    if (max_price) conditions.push(lte(dpListings.listPrice, String(max_price)));
    if (min_bedrooms) conditions.push(gte(dpListings.bedrooms, parseInt(String(min_bedrooms), 10)));
    if (min_sqft) conditions.push(gte(dpListings.sqft, parseInt(String(min_sqft), 10)));

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    let orderBy;
    switch (String(sort_by)) {
      case 'price_asc': orderBy = asc(dpListings.listPrice); break;
      case 'price_desc': orderBy = desc(dpListings.listPrice); break;
      case 'discount_desc': orderBy = desc(dpListings.discountPct); break;
      case 'auction_date': orderBy = asc(dpListings.auctionDate); break;
      default: orderBy = desc(dpListings.ingestedAt);
    }

    const [listings, countResult] = await Promise.all([
      db.select().from(dpListings).where(whereClause).orderBy(orderBy).limit(limitNum).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(dpListings).where(whereClause),
    ]);

    const totalCount = countResult[0]?.count ?? 0;

    return res.json({
      listings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to fetch listings', detail: message });
  }
}
