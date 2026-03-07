import type { NormalizedListing, SourceResult } from '../types';

const USDA_RESALES_URL = 'https://properties.sc.egov.usda.gov/resales/api/properties';

interface UsdaRawListing {
  id?: string;
  propertyId?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  askingPrice?: number;
  listPrice?: number;
  appraisedValue?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  lotAcres?: number;
  yearBuilt?: number;
  status?: string;
  images?: string[];
  description?: string;
  saleDate?: string;
}

function normalizePropertyType(uType: string | undefined): string {
  if (!uType) return 'single_family';
  const t = uType.toLowerCase();
  if (t.includes('condo')) return 'condo';
  if (t.includes('town')) return 'townhouse';
  if (t.includes('multi')) return 'multifamily';
  if (t.includes('mobile') || t.includes('manufactured')) return 'manufactured';
  return 'single_family';
}

function normalizeUsdaListing(raw: UsdaRawListing): NormalizedListing | null {
  if (!raw.address || !raw.city || !raw.state || !raw.zip) return null;
  const listPrice = raw.askingPrice || raw.listPrice || 0;
  if (listPrice <= 0) return null;

  const estimatedValue = raw.appraisedValue || undefined;
  let discountPct: number | undefined;
  if (estimatedValue && estimatedValue > 0) {
    discountPct = Math.round(((estimatedValue - listPrice) / estimatedValue) * 100 * 100) / 100;
  }

  return {
    source: 'usda',
    sourceId: raw.id || raw.propertyId || `usda-${raw.address}-${raw.zip}`,
    address: raw.address,
    city: raw.city,
    state: raw.state.substring(0, 2).toUpperCase(),
    zip: raw.zip.substring(0, 10),
    county: raw.county || undefined,
    lat: raw.latitude || undefined,
    lon: raw.longitude || undefined,
    propertyType: normalizePropertyType(raw.propertyType),
    bedrooms: raw.bedrooms || undefined,
    bathrooms: raw.bathrooms || undefined,
    sqft: raw.sqft || undefined,
    lotSqft: raw.lotAcres ? Math.round(raw.lotAcres * 43560) : undefined,
    yearBuilt: raw.yearBuilt || undefined,
    listPrice,
    estimatedValue,
    discountPct,
    distressType: 'government',
    sourceUrl: raw.id ? `https://properties.sc.egov.usda.gov/resales/property/${raw.id}` : undefined,
    photos: raw.images || [],
    description: raw.description || `USDA Rural Development property in ${raw.city}, ${raw.state}.`,
    auctionDate: raw.saleDate ? new Date(raw.saleDate) : undefined,
  };
}

export async function fetchUsdaListings(states: string[] = ['GA', 'TX', 'NC', 'MS', 'AL', 'TN', 'SC', 'FL']): Promise<SourceResult> {
  const errors: string[] = [];
  const allListings: NormalizedListing[] = [];

  for (const state of states) {
    try {
      const params = new URLSearchParams({ state, pageSize: '100', page: '1' });

      const response = await fetch(`${USDA_RESALES_URL}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Axiom-Protocol/1.0 (Real Estate Research)',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        errors.push(`USDA ${state}: HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json() as { properties?: UsdaRawListing[]; results?: UsdaRawListing[] };
        const rawListings = data.properties || data.results || [];

        for (const raw of rawListings) {
          const normalized = normalizeUsdaListing(raw);
          if (normalized) allListings.push(normalized);
        }
      } else {
        errors.push(`USDA ${state}: Non-JSON response. API may require different access method.`);
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`USDA ${state}: ${message}`);
    }
  }

  return {
    source: 'usda',
    listings: allListings,
    errors,
    fetchedAt: new Date(),
  };
}
