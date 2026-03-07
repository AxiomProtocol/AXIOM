import type { NormalizedListing, SourceResult } from '../types';

const HOMEPATH_BASE = 'https://homepath.fanniemae.com';

interface HomepathListing {
  propertyId?: string;
  caseNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  listPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  propertyType?: string;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  status?: string;
  description?: string;
  firstLookEndDate?: string;
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

function normalizeHomepathListing(raw: HomepathListing): NormalizedListing | null {
  if (!raw.address || !raw.city || !raw.state || !raw.zip) return null;
  const listPrice = raw.listPrice || 0;
  if (listPrice <= 0) return null;

  const id = raw.propertyId || raw.caseNumber || `fnma-${raw.address}-${raw.zip}`;
  const beds = raw.bedrooms || undefined;
  const baths = raw.bathrooms || undefined;

  const descParts = [
    `Fannie Mae REO ${beds || ''}BR/${baths || ''}BA in ${raw.city}, ${raw.state}.`,
    raw.sqft ? `${raw.sqft.toLocaleString()} sqft.` : '',
    raw.yearBuilt ? `Built ${raw.yearBuilt}.` : '',
    'HomePath financing available.',
  ].filter(Boolean);

  return {
    source: 'fannie_mae',
    sourceId: `FNMA-${id}`,
    address: raw.address,
    city: raw.city,
    state: raw.state.substring(0, 2).toUpperCase(),
    zip: raw.zip.substring(0, 10),
    county: raw.county || undefined,
    lat: raw.latitude || undefined,
    lon: raw.longitude || undefined,
    propertyType: normalizePropertyType(raw.propertyType),
    bedrooms: beds,
    bathrooms: baths,
    sqft: raw.sqft || undefined,
    lotSqft: raw.lotSize || undefined,
    yearBuilt: raw.yearBuilt || undefined,
    listPrice,
    distressType: 'reo',
    sourceUrl: `${HOMEPATH_BASE}/listing/${id}`,
    photos: raw.photos || [],
    description: descParts.join(' '),
    expiresAt: raw.firstLookEndDate ? new Date(raw.firstLookEndDate) : undefined,
  };
}

async function tryHomepathApi(state: string): Promise<{ listings: HomepathListing[]; error?: string }> {
  try {
    const response = await fetch(`${HOMEPATH_BASE}/cfl/property-inventory`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `${HOMEPATH_BASE}/`,
        'Origin': HOMEPATH_BASE,
      },
      body: JSON.stringify({
        state: state,
        pageSize: 200,
        page: 1,
        propertyType: 'Single Family',
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return { listings: [], error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { listings: [], error: 'HomePath requires browser authentication (Cloudflare protected). Use manual import or MLS feed.' };
    }

    const data = await response.json() as { properties?: HomepathListing[]; listings?: HomepathListing[]; results?: HomepathListing[] };
    return { listings: data.properties || data.listings || data.results || [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { listings: [], error: msg };
  }
}

export async function fetchFannieListings(states: string[] = ['GA', 'TX', 'NC', 'MS', 'AL', 'TN', 'SC', 'FL']): Promise<SourceResult> {
  const errors: string[] = [];
  const allListings: NormalizedListing[] = [];

  for (const state of states) {
    const result = await tryHomepathApi(state);
    if (result.error) {
      errors.push(`Fannie ${state}: ${result.error}`);
    }
    for (const raw of result.listings) {
      const normalized = normalizeHomepathListing(raw);
      if (normalized) allListings.push(normalized);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  return {
    source: 'fannie_mae',
    listings: allListings,
    errors,
    fetchedAt: new Date(),
  };
}
