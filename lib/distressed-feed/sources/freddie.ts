import type { NormalizedListing, SourceResult } from '../types';

const HOMESTEPS_URL = 'https://www.homesteps.com/api/properties/search';

interface FreddieRawListing {
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

function normalizeFreddieListing(raw: FreddieRawListing): NormalizedListing | null {
  if (!raw.address || !raw.city || !raw.state || !raw.zipCode) return null;
  const listPrice = raw.listPrice || 0;
  if (listPrice <= 0) return null;

  return {
    source: 'freddie_mac',
    sourceId: raw.id || `fhlmc-${raw.address}-${raw.zipCode}`,
    address: raw.address,
    city: raw.city,
    state: raw.state.substring(0, 2).toUpperCase(),
    zip: raw.zipCode.substring(0, 10),
    county: raw.county || undefined,
    lat: raw.latitude || undefined,
    lon: raw.longitude || undefined,
    propertyType: normalizePropertyType(raw.propertyType),
    bedrooms: raw.bedrooms || undefined,
    bathrooms: raw.bathrooms || undefined,
    sqft: raw.squareFeet || undefined,
    lotSqft: raw.lotSize || undefined,
    yearBuilt: raw.yearBuilt || undefined,
    listPrice,
    distressType: 'reo',
    sourceUrl: raw.id ? `https://www.homesteps.com/property/${raw.id}` : undefined,
    photos: raw.images || [],
    description: raw.description || `Freddie Mac REO property in ${raw.city}, ${raw.state}.`,
  };
}

export async function fetchFreddieListings(states: string[] = ['GA', 'TX', 'NC', 'MS', 'AL', 'TN', 'SC', 'FL']): Promise<SourceResult> {
  const errors: string[] = [];
  const allListings: NormalizedListing[] = [];

  for (const state of states) {
    try {
      const body = { state, pageSize: 100, page: 1 };

      const response = await fetch(HOMESTEPS_URL, {
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
        errors.push(`Freddie ${state}: HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json() as { properties?: FreddieRawListing[]; results?: FreddieRawListing[] };
        const rawListings = data.properties || data.results || [];

        for (const raw of rawListings) {
          const normalized = normalizeFreddieListing(raw);
          if (normalized) allListings.push(normalized);
        }
      } else {
        errors.push(`Freddie ${state}: Non-JSON response. HomeSteps may require browser session.`);
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Freddie ${state}: ${message}`);
    }
  }

  return {
    source: 'freddie_mac',
    listings: allListings,
    errors,
    fetchedAt: new Date(),
  };
}
