import type { NormalizedListing, SourceResult } from '../types';

const HUD_SEARCH_URL = 'https://www.hudhomestore.gov/Listing/PropertySearchResult';

interface HudSearchParams {
  sState: string;
  iPageSize: number;
  iPage: number;
  sPropertyType?: string;
  sLoanType?: string;
}

interface HudRawListing {
  CaseNumber?: string;
  Address?: string;
  City?: string;
  State?: string;
  Zip?: string;
  County?: string;
  Beds?: number;
  Baths?: number;
  SqFt?: number;
  LotSize?: string;
  YearBuilt?: number;
  ListPrice?: number;
  SalePrice?: number;
  PropertyType?: string;
  Status?: string;
  ListingDate?: string;
  BidDeadline?: string;
  FHACaseNumber?: string;
  Latitude?: number;
  Longitude?: number;
  PhotoUrl?: string;
}

function normalizePropertyType(hudType: string | undefined): string {
  if (!hudType) return 'single_family';
  const t = hudType.toLowerCase();
  if (t.includes('condo')) return 'condo';
  if (t.includes('townhouse') || t.includes('town')) return 'townhouse';
  if (t.includes('multi') || t.includes('duplex') || t.includes('triplex') || t.includes('fourplex')) return 'multifamily';
  if (t.includes('mobile') || t.includes('manufactured')) return 'manufactured';
  return 'single_family';
}

function parseLotSqft(lotSize: string | undefined): number | undefined {
  if (!lotSize) return undefined;
  const match = lotSize.match(/([\d,.]+)/);
  if (!match) return undefined;
  const val = parseFloat(match[1].replace(/,/g, ''));
  if (lotSize.toLowerCase().includes('acre')) return Math.round(val * 43560);
  return Math.round(val);
}

function normalizeHudListing(raw: HudRawListing): NormalizedListing | null {
  if (!raw.Address || !raw.City || !raw.State || !raw.Zip) return null;
  const listPrice = raw.ListPrice || raw.SalePrice || 0;
  if (listPrice <= 0) return null;

  return {
    source: 'hud',
    sourceId: raw.CaseNumber || raw.FHACaseNumber || `hud-${raw.Address}-${raw.Zip}`,
    address: raw.Address,
    city: raw.City,
    state: raw.State.substring(0, 2).toUpperCase(),
    zip: raw.Zip.substring(0, 10),
    county: raw.County || undefined,
    lat: raw.Latitude || undefined,
    lon: raw.Longitude || undefined,
    propertyType: normalizePropertyType(raw.PropertyType),
    bedrooms: raw.Beds || undefined,
    bathrooms: raw.Baths || undefined,
    sqft: raw.SqFt || undefined,
    lotSqft: parseLotSqft(raw.LotSize),
    yearBuilt: raw.YearBuilt || undefined,
    listPrice,
    distressType: 'government',
    sourceUrl: raw.CaseNumber
      ? `https://www.hudhomestore.gov/Listing/PropertyDetails/${raw.CaseNumber}`
      : undefined,
    photos: raw.PhotoUrl ? [raw.PhotoUrl] : [],
    description: `HUD foreclosed property in ${raw.City}, ${raw.State}. ${raw.PropertyType || 'Residential'}.`,
    auctionDate: raw.BidDeadline ? new Date(raw.BidDeadline) : undefined,
  };
}

export async function fetchHudListings(states: string[] = ['GA', 'TX', 'NC', 'MS', 'AL', 'TN', 'SC', 'FL']): Promise<SourceResult> {
  const errors: string[] = [];
  const allListings: NormalizedListing[] = [];

  for (const state of states) {
    try {
      const params: HudSearchParams = {
        sState: state,
        iPageSize: 100,
        iPage: 1,
      };

      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => searchParams.set(k, String(v)));

      const response = await fetch(`${HUD_SEARCH_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Axiom-Protocol/1.0 (Real Estate Research)',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        errors.push(`HUD ${state}: HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json() as { Properties?: HudRawListing[]; properties?: HudRawListing[]; results?: HudRawListing[] };
        const rawListings = data.Properties || data.properties || data.results || [];

        for (const raw of rawListings) {
          const normalized = normalizeHudListing(raw);
          if (normalized) allListings.push(normalized);
        }
      } else {
        errors.push(`HUD ${state}: Non-JSON response (${contentType}). Endpoint may require browser session.`);
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`HUD ${state}: ${message}`);
    }
  }

  return {
    source: 'hud',
    listings: allListings,
    errors,
    fetchedAt: new Date(),
  };
}
