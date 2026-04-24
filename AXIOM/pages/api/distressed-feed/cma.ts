import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getEstimate,
  getListingByMlsNumber,
  searchListings,
  isRepliersConfigured,
} from '../../../lib/re/repliers';

interface CmaComp {
  mlsNumber: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  listPrice: number | null;
  soldPrice: number | null;
  pricePerSqft: number | null;
  daysOnMarket: number | null;
  soldDate: string | null;
  listDate: string | null;
  status: string;
  lastStatus: string;
  propertyType: string | null;
  propertyStyle: string | null;
  distanceScore: number;
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function average(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function parseSqft(raw: any): number | null {
  if (!raw) return null;
  const n = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildPropertyTypeLabel(l: any): string | null {
  const style = l.details?.style?.trim();
  const ptype = l.details?.propertyType?.trim();
  if (style && ptype && style.toLowerCase() !== ptype.toLowerCase()) return `${style} (${ptype})`;
  if (style) return style;
  if (ptype) return ptype;
  return null;
}

function scoreSimilarity(
  comp: { beds: number | null; baths: number | null; sqft: number | null; yearBuilt: number | null },
  subject: { beds: number | null; baths: number | null; sqft: number | null; yearBuilt: number | null },
): number {
  let score = 100;
  if (subject.beds && comp.beds) score -= Math.abs(comp.beds - subject.beds) * 10;
  if (subject.baths && comp.baths) score -= Math.abs(comp.baths - subject.baths) * 8;
  if (subject.sqft && comp.sqft) {
    const pct = Math.abs(comp.sqft - subject.sqft) / subject.sqft;
    score -= Math.min(40, pct * 100);
  }
  if (subject.yearBuilt && comp.yearBuilt) {
    score -= Math.min(20, Math.abs(comp.yearBuilt - subject.yearBuilt) * 0.4);
  }
  return Math.max(0, Math.round(score));
}

function mapToComp(l: any, subject: any): CmaComp {
  const addr = l.address || {};
  const sqft = parseSqft(l.details?.sqft);
  const beds = l.details?.numBedrooms ?? null;
  const baths = l.details?.numBathrooms ?? null;
  const yearBuilt = l.details?.yearBuilt ? parseInt(l.details.yearBuilt, 10) || null : null;
  const price = l.soldPrice || l.listPrice || 0;
  const ppsf = price && sqft ? Math.round(price / sqft) : null;

  return {
    mlsNumber: l.mlsNumber || null,
    address: [addr.streetNumber, addr.streetName, addr.streetSuffix].filter(Boolean).join(' '),
    city: addr.city || '',
    state: addr.state || '',
    zip: addr.zip || '',
    beds,
    baths,
    sqft,
    yearBuilt,
    listPrice: l.listPrice || null,
    soldPrice: l.soldPrice || null,
    pricePerSqft: ppsf,
    daysOnMarket: l.daysOnMarket ?? null,
    soldDate: l.soldDate || null,
    listDate: l.listDate || null,
    status: l.status || '',
    lastStatus: l.lastStatus || '',
    propertyType: buildPropertyTypeLabel(l),
    propertyStyle: l.details?.style || null,
    distanceScore: scoreSimilarity({ beds, baths, sqft, yearBuilt }, subject),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isRepliersConfigured()) {
    return res.json({
      configured: false,
      isTestMode: true,
      subject: null,
      avm: null,
      comps: { sold: [], active: [] },
      stats: null,
    });
  }

  const src = req.method === 'GET' ? req.query : req.body;
  const mlsNumber = src.mlsNumber ? String(src.mlsNumber) : '';
  let city = src.city ? String(src.city) : '';
  let state = src.state ? String(src.state) : '';
  let zip = src.zip ? String(src.zip) : '';
  let beds = src.beds ? parseInt(String(src.beds), 10) : null;
  let baths = src.baths ? parseFloat(String(src.baths)) : null;
  let sqft = src.sqft ? parseInt(String(src.sqft), 10) : null;
  let yearBuilt = src.yearBuilt ? parseInt(String(src.yearBuilt), 10) : null;
  let propertyType = src.propertyType ? String(src.propertyType) : '';
  let propertyStyle = src.propertyStyle ? String(src.propertyStyle) : '';
  let listPrice = src.listPrice ? parseFloat(String(src.listPrice)) : null;
  let streetNumber = '';
  let streetName = '';
  let streetSuffix = '';
  let subjectListing: any = null;

  if (mlsNumber) {
    const detail = await getListingByMlsNumber(mlsNumber);
    if (detail.data && detail.data.mlsNumber) {
      subjectListing = detail.data;
      const a = detail.data.address || {};
      city = city || a.city || '';
      state = state || a.state || '';
      zip = zip || a.zip || '';
      streetNumber = a.streetNumber || '';
      streetName = a.streetName || '';
      streetSuffix = a.streetSuffix || '';
      beds = beds ?? detail.data.details?.numBedrooms ?? null;
      baths = baths ?? detail.data.details?.numBathrooms ?? null;
      sqft = sqft ?? parseSqft(detail.data.details?.sqft);
      yearBuilt = yearBuilt ?? (detail.data.details?.yearBuilt ? parseInt(detail.data.details.yearBuilt, 10) || null : null);
      propertyType = propertyType || detail.data.details?.propertyType || '';
      propertyStyle = propertyStyle || detail.data.details?.style || '';
      listPrice = listPrice ?? (detail.data.listPrice || null);
    }
  }

  if (!city && !zip) {
    return res.status(400).json({ error: 'Provide mlsNumber, or city/state, or zip' });
  }

  const subjectMatcher = { beds, baths, sqft, yearBuilt };
  const compStyle = propertyStyle ? [propertyStyle] : undefined;
  const compPropertyType = propertyType ? [propertyType] : undefined;

  const minBeds = beds ? Math.max(1, beds - 1) : undefined;
  const maxBeds = beds ? beds + 1 : undefined;
  const minSqft = sqft ? Math.max(100, Math.floor(sqft * 0.7)) : undefined;
  const maxSqft = sqft ? Math.ceil(sqft * 1.3) : undefined;

  const baseScopeStrict = {
    city: city || undefined,
    state: state || undefined,
    zip: zip || undefined,
    minBeds,
    maxBeds,
    minSqft,
    maxSqft,
    style: compStyle,
    propertyType: compPropertyType,
    resultsPerPage: 30,
  };

  const baseScopeLoose = {
    city: city || undefined,
    state: state || undefined,
    zip: zip || undefined,
    minBeds,
    maxBeds,
    propertyType: compPropertyType,
    resultsPerPage: 30,
  };

  const [avmResult, soldStrict, activeStrict, soldLoose, activeLoose] = await Promise.all([
    getEstimate({
      city: city || undefined,
      state: state || undefined,
      zip: zip || undefined,
      streetName: streetName || undefined,
      streetNumber: streetNumber || undefined,
      streetSuffix: streetSuffix || undefined,
      beds: beds || undefined,
      baths: baths || undefined,
      sqft: sqft || undefined,
    }),
    searchListings({ ...baseScopeStrict, lastStatus: ['Sld'], status: 'U' }),
    searchListings({ ...baseScopeStrict, status: 'A' }),
    searchListings({ ...baseScopeLoose, lastStatus: ['Sld'], status: 'U' }),
    searchListings({ ...baseScopeLoose, status: 'A' }),
  ]);

  const isTestMode = avmResult.isTestMode;

  const dedupeByMls = (list: any[]): any[] => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const l of list) {
      const key = l.mlsNumber || `${l.address?.streetNumber}-${l.address?.streetName}-${l.address?.zip}`;
      if (!key || key === '--' || seen.has(key)) continue;
      if (mlsNumber && l.mlsNumber === mlsNumber) continue;
      seen.add(key);
      out.push(l);
    }
    return out;
  };

  let soldRaw = dedupeByMls([...(soldStrict.data?.listings || []), ...(soldLoose.data?.listings || [])]);
  let activeRaw = dedupeByMls([...(activeStrict.data?.listings || []), ...(activeLoose.data?.listings || [])]);

  const sold = soldRaw
    .map((l) => mapToComp(l, subjectMatcher))
    .filter((c) => c.soldPrice && c.soldPrice > 0)
    .sort((a, b) => b.distanceScore - a.distanceScore)
    .slice(0, 12);

  const active = activeRaw
    .map((l) => mapToComp(l, subjectMatcher))
    .filter((c) => c.listPrice && c.listPrice > 0)
    .sort((a, b) => b.distanceScore - a.distanceScore)
    .slice(0, 12);

  const soldPrices = sold.map((c) => c.soldPrice!).filter(Boolean) as number[];
  const soldPpsf = sold.map((c) => c.pricePerSqft).filter((n): n is number => n != null);
  const soldDom = sold.map((c) => c.daysOnMarket).filter((n): n is number => n != null);
  const activePrices = active.map((c) => c.listPrice!).filter(Boolean) as number[];
  const activePpsf = active.map((c) => c.pricePerSqft).filter((n): n is number => n != null);

  const arvByPpsf = sqft && median(soldPpsf) ? median(soldPpsf)! * sqft : null;
  const medianSold = median(soldPrices);
  const arvBlend = arvByPpsf && medianSold
    ? Math.round((arvByPpsf + medianSold) / 2)
    : (arvByPpsf || medianSold || null);

  const subjectPpsf = listPrice && sqft ? Math.round(listPrice / sqft) : null;
  const vsAvm = avmResult.data?.price && listPrice ? listPrice - avmResult.data.price : null;
  const vsArv = arvBlend && listPrice ? listPrice - arvBlend : null;
  const vsMedianSold = medianSold && listPrice ? listPrice - medianSold : null;

  const stats = {
    soldCount: sold.length,
    activeCount: active.length,
    soldMedianPrice: medianSold,
    soldAvgPrice: average(soldPrices),
    soldMedianPpsf: median(soldPpsf),
    soldAvgPpsf: average(soldPpsf),
    soldMedianDom: median(soldDom),
    activeMedianPrice: median(activePrices),
    activeAvgPrice: average(activePrices),
    activeMedianPpsf: median(activePpsf),
    arvByPpsf,
    arvMedianSold: medianSold,
    arvBlend,
    subjectPpsf,
    vsAvm,
    vsArv,
    vsMedianSold,
  };

  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    configured: true,
    isTestMode,
    subject: {
      mlsNumber: mlsNumber || null,
      address: [streetNumber, streetName, streetSuffix].filter(Boolean).join(' ') || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      beds,
      baths,
      sqft,
      yearBuilt,
      listPrice,
      propertyType: subjectListing ? buildPropertyTypeLabel(subjectListing) : (propertyStyle || propertyType || null),
      propertyStyle: propertyStyle || null,
    },
    avm: avmResult.data
      ? {
          price: avmResult.data.price ?? null,
          priceMin: avmResult.data.priceMin ?? null,
          priceMax: avmResult.data.priceMax ?? null,
          confidence: avmResult.data.confidence ?? null,
        }
      : null,
    comps: { sold, active },
    stats,
    generatedAt: new Date().toISOString(),
  });
}
