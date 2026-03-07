import type { NormalizedListing, SourceResult } from '../types';

const HOMEPATH_SEARCH_URL = 'https://www.homepath.com/listing/search';

interface FannieRawListing {
  propertyId?: string;
  caseNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    county?: string;
  };
  listPrice?: number;
  estimatedValue?: number;
  propertyDetails?: {
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    lotSize?: number;
    yearBuilt?: number;
  };
  coordinates?: {
    lat?: number;
    lng?: number;
  };
  status?: string;
  images?: string[];
  description?: string;
}

function normalizePropertyType(fType: string | undefined): string {
  if (!fType) return 'single_family';
  const t = fType.toLowerCase();
  if (t.includes('condo')) return 'condo';
  if (t.includes('town')) return 'townhouse';
  if (t.includes('multi')) return 'multifamily';
  if (t.includes('mobile') || t.includes('manufactured')) return 'manufactured';
  return 'single_family';
}

function normalizeFannieListing(raw: FannieRawListing): NormalizedListing | null {
  const addr = raw.address;
  if (!addr?.street || !addr?.city || !addr?.state || !addr?.zip) return null;
  const listPrice = raw.listPrice || 0;
  if (listPrice <= 0) return null;

  const estimatedValue = raw.estimatedValue || undefined;
  let discountPct: number | undefined;
  if (estimatedValue && estimatedValue > 0) {
    discountPct = Math.round(((estimatedValue - listPrice) / estimatedValue) * 100 * 100) / 100;
  }

  return {
    source: 'fannie_mae',
    sourceId: raw.propertyId || raw.caseNumber || `fnma-${addr.street}-${addr.zip}`,
    address: addr.street,
    city: addr.city,
    state: addr.state.substring(0, 2).toUpperCase(),
    zip: addr.zip.substring(0, 10),
    county: addr.county || undefined,
    lat: raw.coordinates?.lat || undefined,
    lon: raw.coordinates?.lng || undefined,
    propertyType: normalizePropertyType(raw.propertyDetails?.propertyType),
    bedrooms: raw.propertyDetails?.bedrooms || undefined,
    bathrooms: raw.propertyDetails?.bathrooms || undefined,
    sqft: raw.propertyDetails?.sqft || undefined,
    lotSqft: raw.propertyDetails?.lotSize || undefined,
    yearBuilt: raw.propertyDetails?.yearBuilt || undefined,
    listPrice,
    estimatedValue,
    discountPct,
    distressType: 'reo',
    sourceUrl: raw.propertyId
      ? `https://www.homepath.com/listing/${raw.propertyId}`
      : undefined,
    photos: raw.images || [],
    description: raw.description || `Fannie Mae REO property in ${addr.city}, ${addr.state}.`,
  };
}

export async function fetchFannieListings(states: string[] = ['GA', 'TX', 'NC', 'MS', 'AL', 'TN', 'SC', 'FL']): Promise<SourceResult> {
  const errors: string[] = [];
  const allListings: NormalizedListing[] = [];

  for (const state of states) {
    try {
      const body = {
        state: state,
        pageSize: 100,
        page: 1,
        sortBy: 'listPrice',
        sortOrder: 'asc',
      };

      const response = await fetch(HOMEPATH_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Axiom-Protocol/1.0 (Real Estate Research)',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        errors.push(`Fannie ${state}: HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json() as { properties?: FannieRawListing[]; listings?: FannieRawListing[]; results?: FannieRawListing[] };
        const rawListings = data.properties || data.listings || data.results || [];

        for (const raw of rawListings) {
          const normalized = normalizeFannieListing(raw);
          if (normalized) allListings.push(normalized);
        }
      } else {
        errors.push(`Fannie ${state}: Non-JSON response. HomePath may require browser session.`);
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Fannie ${state}: ${message}`);
    }
  }

  return {
    source: 'fannie_mae',
    listings: allListings,
    errors,
    fetchedAt: new Date(),
  };
}
