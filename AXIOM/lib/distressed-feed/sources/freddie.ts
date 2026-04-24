import type { NormalizedListing, SourceResult } from '../types';

const HOMESTEPS_BASE = 'https://www.homesteps.com';

interface HomestepsListing {
  id?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  listPrice?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;
  status?: string;
  images?: string[];
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

function normalizeHomestepsListing(raw: HomestepsListing): NormalizedListing | null {
  if (!raw.address || !raw.city || !raw.state || !raw.zipCode) return null;
  const listPrice = raw.listPrice || 0;
  if (listPrice <= 0) return null;

  const id = raw.id || `fhlmc-${raw.address}-${raw.zipCode}`;
  const beds = raw.bedrooms || undefined;
  const baths = raw.bathrooms || undefined;

  const descParts = [
    `Freddie Mac REO ${beds || ''}BR/${baths || ''}BA in ${raw.city}, ${raw.state}.`,
    raw.squareFeet ? `${raw.squareFeet.toLocaleString()} sqft.` : '',
    raw.yearBuilt ? `Built ${raw.yearBuilt}.` : '',
  ].filter(Boolean);

  return {
    source: 'freddie_mac',
    sourceId: `FHLMC-${id}`,
    address: raw.address,
    city: raw.city,
    state: raw.state.substring(0, 2).toUpperCase(),
    zip: raw.zipCode.substring(0, 10),
    county: raw.county || undefined,
    lat: raw.latitude || undefined,
    lon: raw.longitude || undefined,
    propertyType: normalizePropertyType(raw.propertyType),
    bedrooms: beds,
    bathrooms: baths,
    sqft: raw.squareFeet || undefined,
    lotSqft: raw.lotSize || undefined,
    yearBuilt: raw.yearBuilt || undefined,
    listPrice,
    distressType: 'reo',
    sourceUrl: `${HOMESTEPS_BASE}/property/${id}`,
    photos: raw.images || [],
    description: descParts.join(' '),
    expiresAt: raw.firstLookEndDate ? new Date(raw.firstLookEndDate) : undefined,
  };
}

async function tryHomestepsApi(state: string): Promise<{ listings: HomestepsListing[]; error?: string }> {
  try {
    const response = await fetch(`${HOMESTEPS_BASE}/api/properties/search`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `${HOMESTEPS_BASE}/`,
        'Origin': HOMESTEPS_BASE,
      },
      body: JSON.stringify({
        state,
        pageSize: 100,
        page: 1,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return { listings: [], error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { listings: [], error: 'HomeSteps does not expose a public search API. Properties are listed on MLS.' };
    }

    const data = await response.json() as { properties?: HomestepsListing[]; results?: HomestepsListing[] };
    return { listings: data.properties || data.results || [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { listings: [], error: msg };
  }
}

export async function fetchFreddieListings(states: string[] = ['GA', 'TX', 'NC', 'MS', 'AL', 'TN', 'SC', 'FL']): Promise<SourceResult> {
  const errors: string[] = [];
  const allListings: NormalizedListing[] = [];

  for (const state of states) {
    const result = await tryHomestepsApi(state);
    if (result.error) {
      errors.push(`Freddie ${state}: ${result.error}`);
    }
    for (const raw of result.listings) {
      const normalized = normalizeHomestepsListing(raw);
      if (normalized) allListings.push(normalized);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  return {
    source: 'freddie_mac',
    listings: allListings,
    errors,
    fetchedAt: new Date(),
  };
}
