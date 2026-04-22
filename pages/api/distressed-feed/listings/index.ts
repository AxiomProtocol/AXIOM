import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { dpListings } from '../../../../shared/distressedFeedSchema';
import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm';
import { searchListings, isRepliersConfigured } from '../../../../lib/re/repliers';

interface StrategyPreset {
  label: string;
  lastStatus?: string[];
  daysOnMarketMin?: number;
  propertyTypes?: string[];
  classes?: string[];
  styles?: string[];
  styleKeywords?: string[];
  descriptionKeywords?: string[];
  searchKeyword?: string;
}

const STRATEGY_PRESETS: Record<string, StrategyPreset> = {
  all: {
    label: 'All Active',
  },
  price_reduced: {
    label: 'Price Reduced',
    lastStatus: ['Pc'],
    daysOnMarketMin: 30,
  },
  expired: {
    label: 'Expired / Withdrawn',
    lastStatus: ['Exp', 'Sus', 'Ter'],
    daysOnMarketMin: 60,
  },
  stale: {
    label: 'Stale (90+ DOM)',
    daysOnMarketMin: 90,
  },
  fixer_upper: {
    label: 'Fixer-Upper',
    descriptionKeywords: [
      'fixer', 'tlc', 'handyman', 'investor special', 'as-is', 'as is',
      'needs work', 'needs rehab', 'rehab', 'cash only', 'sold as-is',
      'cosmetic', 'sweat equity', 'project house', 'estate sale', 'distressed',
      'opportunity', 'bring your tools', 'value add', 'bring offers',
    ],
    searchKeyword: 'fixer',
  },
  fsbo: {
    label: 'For Sale by Owner',
    descriptionKeywords: [
      'for sale by owner', 'fsbo', 'no agent', 'no realtor',
      'owner finance', 'owner financing', 'seller financing', 'owner will carry',
      'owner-financed', 'sold by owner',
    ],
    searchKeyword: 'fsbo',
  },
  land: {
    label: 'Land / Lots',
    propertyTypes: ['Land', 'Farm'],
    styles: [
      'Lot', 'Acreage', 'Unimproved Land', 'Vacant Land', 'Vacant Lot',
      'Vacant Residential', 'Agricultural', 'Ranch', 'Farm',
    ],
    styleKeywords: ['lot', 'acreage', 'land', 'unimproved', 'vacant', 'agricultural', 'ranch', 'farm'],
  },
  multifamily_2_4: {
    label: '2-4 Unit Multifamily',
    propertyTypes: ['Residential Income'],
    styles: [
      'Duplex', 'Triplex', 'Fourplex', 'Quadruplex', 'Half Duplex',
      '2-4 Family', '2 Family', '3 Family', '4 Family',
      'Multi-Family', 'Multi Family', 'Multifamily',
    ],
    styleKeywords: ['duplex', 'triplex', 'fourplex', 'quadruplex', 'multi family', 'multi-family', 'multifamily', '2 family', '3 family', '4 family', '2-4 family'],
  },
  multifamily_5_plus: {
    label: '5+ Unit Multifamily',
    propertyTypes: ['Residential Income'],
    classes: ['CommercialProperty'],
    styles: [
      'Apartment Building', 'Apartment', '5+ Family', '6+ Family', '8+ Family',
      '5 Or More Units', '5+ Units', '5-10 Units',
    ],
    styleKeywords: ['apartment', '5+ unit', '5+ family', '6+ unit', '5 or more', '5-10 unit', '6+ family', '8+ family'],
  },
};

function postFilterByDescriptionKeywords(
  listings: Array<{ description?: string | null; details?: { description?: string } } & Record<string, unknown>>,
  keywords: string[],
): typeof listings {
  if (!keywords.length) return listings;
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  return listings.filter((l) => {
    const desc = String((l.description ?? l.details?.description ?? '')).toLowerCase();
    if (!desc) return false;
    return lowerKeywords.some((k) => desc.includes(k));
  });
}

function listingMatchesPropertyIntent(
  l: { class?: string; details?: { style?: string; propertyType?: string } } & Record<string, unknown>,
  preset: StrategyPreset,
): boolean {
  const style = String(l.details?.style || '').toLowerCase();
  const ptype = String(l.details?.propertyType || '').toLowerCase();
  const cls = String(l.class || '').toLowerCase();

  if (preset.styleKeywords && preset.styleKeywords.length) {
    if (preset.styleKeywords.some((k) => style.includes(k.toLowerCase()))) return true;
  }
  if (preset.styles && preset.styles.length) {
    if (preset.styles.some((s) => style === s.toLowerCase())) return true;
  }
  if (preset.propertyTypes && preset.propertyTypes.length) {
    if (preset.propertyTypes.some((p) => ptype === p.toLowerCase())) return true;
  }
  if (preset.classes && preset.classes.length) {
    if (preset.classes.some((c) => cls === c.toLowerCase())) return true;
  }
  return false;
}

async function handleMlsRepliers(req: NextApiRequest, res: NextApiResponse) {
  const {
    city, state, zip,
    min_price, max_price,
    min_bedrooms, min_beds, max_beds,
    min_baths, min_sqft,
    min_dom, max_dom,
    property_type,
    strategy = 'price_reduced',
    page = '1',
  } = req.query;
  const effectiveMinBeds = min_beds || min_bedrooms;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const strategyKey = String(strategy);
  const preset = STRATEGY_PRESETS[strategyKey] || STRATEGY_PRESETS.all;

  if (!isRepliersConfigured()) {
    return res.json({
      listings: [],
      isTestMode: true,
      configured: false,
      source: 'mls_repliers',
      strategies: Object.entries(STRATEGY_PRESETS).map(([id, p]) => ({ id, label: p.label })),
      activeStrategy: strategyKey,
      pagination: { page: pageNum, total: 0, totalPages: 0, limit: 20 },
    });
  }

  const userPropertyTypes = property_type
    ? String(property_type).split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  const propertyTypes = userPropertyTypes && userPropertyTypes.length > 0
    ? userPropertyTypes
    : preset.propertyTypes;

  const dom = min_dom !== undefined && min_dom !== ''
    ? parseInt(String(min_dom), 10)
    : preset.daysOnMarketMin;
  const domMax = max_dom ? parseInt(String(max_dom), 10) : undefined;

  const hasPropertyIntent = !!(
    (preset.styles && preset.styles.length) ||
    (preset.styleKeywords && preset.styleKeywords.length) ||
    (preset.propertyTypes && preset.propertyTypes.length) ||
    (preset.classes && preset.classes.length)
  );
  const hasDescriptionIntent = !!(preset.descriptionKeywords && preset.descriptionKeywords.length);
  const needsClientPostFilter = hasPropertyIntent || hasDescriptionIntent;
  const PAGE_LIMIT = 20;
  const fetchPageSize = needsClientPostFilter ? 100 : PAGE_LIMIT;
  const MAX_REPLIERS_PAGES = needsClientPostFilter ? 10 : 1;
  const TARGET_FILTERED = pageNum * PAGE_LIMIT + PAGE_LIMIT * 2;

  const baseSearchParams = {
    city: city ? String(city) : undefined,
    state: state ? String(state) : undefined,
    zip: zip ? String(zip) : undefined,
    lastStatus: preset.lastStatus,
    daysOnMarketMin: dom,
    daysOnMarketMax: domMax,
    minPrice: min_price ? parseInt(String(min_price), 10) : undefined,
    maxPrice: max_price ? parseInt(String(max_price), 10) : undefined,
    minBeds: effectiveMinBeds ? parseInt(String(effectiveMinBeds), 10) : undefined,
    maxBeds: max_beds ? parseInt(String(max_beds), 10) : undefined,
    minBaths: min_baths ? parseInt(String(min_baths), 10) : undefined,
    minSqft: min_sqft ? parseInt(String(min_sqft), 10) : undefined,
    propertyType: propertyTypes,
    classes: preset.classes,
    search: preset.searchKeyword,
    resultsPerPage: fetchPageSize,
  };

  let raw: any[] = [];
  let upstreamTotal = 0;
  let upstreamPages = 0;
  let isTestMode = false;

  for (let p = 1; p <= MAX_REPLIERS_PAGES; p += 1) {
    const result = await searchListings({ ...baseSearchParams, pageNum: p });
    isTestMode = result.isTestMode || isTestMode;
    const pageListings = result.data?.listings || [];
    upstreamTotal = result.data?.count || upstreamTotal;
    upstreamPages = result.data?.numPages || upstreamPages;
    raw.push(...pageListings);
    if (pageListings.length === 0) break;
    if (upstreamPages && p >= upstreamPages) break;
    const filteredSoFar = hasPropertyIntent
      ? raw.filter((l) => listingMatchesPropertyIntent(l as any, preset)).length
      : raw.length;
    if (filteredSoFar >= TARGET_FILTERED) break;
  }

  const lastStatusLabel: Record<string, string> = {
    Pc: 'Price Changed',
    Exp: 'Expired',
    Sus: 'Suspended',
    Ter: 'Terminated',
  };

  if (hasPropertyIntent) {
    raw = raw.filter((l) => listingMatchesPropertyIntent(l as any, preset));
  }
  if (hasDescriptionIntent && preset.descriptionKeywords) {
    raw = postFilterByDescriptionKeywords(raw as any, preset.descriptionKeywords) as typeof raw;
  }

  const filteredTotal = raw.length;
  const filteredPages = Math.max(1, Math.ceil(filteredTotal / PAGE_LIMIT));
  if (needsClientPostFilter) {
    const start = (pageNum - 1) * PAGE_LIMIT;
    raw = raw.slice(start, start + PAGE_LIMIT);
  }

  function buildPropertyTypeLabel(l: any): string {
    const style = l.details?.style?.trim();
    const ptype = l.details?.propertyType?.trim();
    const cls = l.class?.trim();
    const friendlyClass = cls ? cls.replace(/Property$/, '') : '';
    if (style && ptype && style.toLowerCase() !== ptype.toLowerCase()) {
      return `${style} (${ptype})`;
    }
    if (style) return style;
    if (ptype) return ptype;
    if (friendlyClass) return friendlyClass;
    return 'Unknown';
  }

  const listings = raw.map((l: any) => {
    const addr = l.address || {};
    const fullAddress = [addr.streetNumber, addr.streetName, addr.streetSuffix].filter(Boolean).join(' ');
    const sqftRaw = l.details?.sqft;
    const sqft = sqftRaw ? parseInt(String(sqftRaw).replace(/[^0-9]/g, ''), 10) || null : null;

    return {
      mlsNumber: l.mlsNumber || null,
      source: 'mls_repliers',
      address: fullAddress || 'Address unavailable',
      city: addr.city || '',
      state: addr.state || '',
      zip: addr.zip || '',
      propertyType: buildPropertyTypeLabel(l),
      propertyStyle: l.details?.style || null,
      propertyClass: l.class || null,
      propertyTypeRaw: l.details?.propertyType || null,
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
      images: l.images || [],
      description: l.details?.description || null,
      addressKey: l.addressKey || null,
      sourceUrl: l.mlsNumber ? `/property/${encodeURIComponent(l.mlsNumber)}` : null,
    };
  });

  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    listings,
    isTestMode,
    configured: true,
    source: 'mls_repliers',
    strategies: Object.entries(STRATEGY_PRESETS).map(([id, p]) => ({ id, label: p.label })),
    activeStrategy: strategyKey,
    pagination: {
      page: pageNum,
      total: needsClientPostFilter ? filteredTotal : (upstreamTotal || listings.length),
      totalPages: needsClientPostFilter ? filteredPages : (upstreamPages || 1),
      limit: PAGE_LIMIT,
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
