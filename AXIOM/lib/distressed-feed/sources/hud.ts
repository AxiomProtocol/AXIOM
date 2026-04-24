import type { NormalizedListing, SourceResult } from '../types';

const HUD_BASE_URL = 'https://www.hudhomestore.gov';
const CLOUDINARY_BASE = 'https://res.cloudinary.com/yardi/image/upload/q_auto,f_auto,c_limit/d_hhs:themes:common:images:NoImage.jpg/hhs/';

interface HudApiListing {
  propertyCaseNumber?: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  propertyCounty?: string;
  listPrice?: string;
  bedrooms?: string;
  bathrooms?: string;
  bathroomsdecimal?: number;
  squareFootage?: string;
  yearBuilt?: string;
  propertyAge?: string;
  propertyType?: string;
  latitude?: string;
  longitude?: string;
  galleryImages?: string;
  propertyThumb?: string;
  listingPeriod?: string;
  propertyStatusDesc?: string;
  bidOpenDate?: string;
  listDate?: string;
  periodDeadlineDate?: string;
  eligibleBidders?: string;
  bidderTypes?: string;
  fhaFinancing?: string;
  inAmenities?: string;
  outAmenities?: string;
  parkingType?: string;
  numberOfStories?: string;
}

function parseGalleryImages(galleryStr: string | undefined): string[] {
  if (!galleryStr) return [];
  const imgs = galleryStr.replace(/"/g, '').split(',');
  return imgs
    .map(img => img.trim())
    .filter(img => img.length > 0)
    .map(img => CLOUDINARY_BASE + img);
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

function normalizeHudApiListing(raw: HudApiListing): NormalizedListing | null {
  if (!raw.propertyAddress || !raw.propertyCity || !raw.propertyState || !raw.propertyZip) return null;
  const listPrice = parseFloat((raw.listPrice || '0').replace(/,/g, ''));
  if (listPrice <= 0) return null;

  const photos = parseGalleryImages(raw.galleryImages);
  if (photos.length === 0 && raw.propertyThumb) {
    photos.push(raw.propertyThumb);
  }

  const beds = parseInt(raw.bedrooms || '0', 10) || undefined;
  const baths = raw.bathroomsdecimal || parseFloat(raw.bathrooms || '0') || undefined;
  const sqft = parseInt(raw.squareFootage || '0', 10) || undefined;
  const yearBuilt = parseInt(raw.yearBuilt || '0', 10) || undefined;
  const lat = parseFloat(raw.latitude || '0') || undefined;
  const lon = parseFloat(raw.longitude || '0') || undefined;
  const caseNum = raw.propertyCaseNumber || '';

  const descParts = [
    `HUD foreclosed ${beds || ''}BR/${baths || ''}BA in ${raw.propertyCity}, ${raw.propertyState}.`,
    sqft ? `${sqft.toLocaleString()} sqft.` : '',
    yearBuilt ? `Built ${yearBuilt}.` : '',
    raw.listingPeriod ? `${raw.listingPeriod} listing.` : '',
    raw.eligibleBidders || '',
  ].filter(Boolean);

  let auctionDate: Date | undefined;
  if (raw.bidOpenDate) {
    try { auctionDate = new Date(raw.bidOpenDate); } catch {}
  }

  let expiresAt: Date | undefined;
  if (raw.periodDeadlineDate) {
    try { expiresAt = new Date(raw.periodDeadlineDate); } catch {}
  }

  return {
    source: 'hud',
    sourceId: `HUD-${caseNum}`,
    address: raw.propertyAddress,
    city: raw.propertyCity,
    state: raw.propertyState.substring(0, 2).toUpperCase(),
    zip: raw.propertyZip.substring(0, 10),
    county: raw.propertyCounty || undefined,
    lat,
    lon,
    propertyType: normalizePropertyType(raw.propertyType),
    bedrooms: beds,
    bathrooms: baths,
    sqft,
    yearBuilt,
    listPrice,
    distressType: 'government',
    sourceUrl: caseNum
      ? `https://www.hudhomestore.gov/Listing/PropertyDetails/${caseNum}`
      : undefined,
    photos,
    description: descParts.join(' '),
    auctionDate,
    expiresAt,
  };
}

async function isHudOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${HUD_BASE_URL}/searchresult?sState=GA`, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    const location = res.headers.get('location') || '';
    if (location.includes('/app_offline') || location.includes('app_offline')) return false;
    return res.status < 400;
  } catch {
    return false;
  }
}

async function getSessionAndToken(): Promise<{ cookies: string; token: string } | null> {
  try {
    const response = await fetch(`${HUD_BASE_URL}/searchresult?sState=GA`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) return null;

    const cookieParts: string[] = [];
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    for (const sc of setCookieHeaders) {
      const nameVal = sc.split(';')[0];
      if (nameVal) cookieParts.push(nameVal);
    }

    if (cookieParts.length === 0) {
      const rawSetCookie = response.headers.get('set-cookie');
      if (rawSetCookie) {
        const segments = rawSetCookie.split(/,(?=[^ ])/);
        for (const seg of segments) {
          const nameVal = seg.trim().split(';')[0];
          if (nameVal && nameVal.includes('=')) cookieParts.push(nameVal);
        }
      }
    }

    const cookies = cookieParts.join('; ');

    const html = await response.text();
    const tokenMatch = html.match(/id="request-verification-token"[^>]*value="([^"]*)"/);
    if (!tokenMatch) return null;

    if (!cookies || !cookies.includes('Antiforgery')) {
      return null;
    }

    return { cookies, token: tokenMatch[1] };
  } catch {
    return null;
  }
}

export async function fetchHudListings(states: string[] = ['GA', 'TX', 'NC', 'MS', 'AL', 'TN', 'SC', 'FL']): Promise<SourceResult> {
  const errors: string[] = [];
  const allListings: NormalizedListing[] = [];

  const online = await isHudOnline();
  if (!online) {
    errors.push('HUD HomeStore is currently offline for maintenance (redirects to /app_offline). Skipping ingestion — will retry on next scheduled run.');
    return { source: 'hud', listings: [], errors, fetchedAt: new Date() };
  }

  for (const state of states) {
    try {
      const session = await getSessionAndToken();
      if (!session) {
        errors.push(`HUD ${state}: Failed to get session/token`);
        continue;
      }

      const body = new URLSearchParams({
        __RequestVerificationToken: session.token,
        citystate: state,
        viewport: '',
        zoom: '10',
        geopickertype: '',
        geopickeroutput: '',
        locationchanged: '',
        locationgeoid: '',
        locationLat: '',
        locationLong: '',
        isdefault: '0',
      });

      const response = await fetch(`${HUD_BASE_URL}/SearchResult?handler=GetFilteredResult`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'RequestVerificationToken': session.token,
          'Cookie': session.cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': `${HUD_BASE_URL}/searchresult?sState=${state}`,
          'Origin': HUD_BASE_URL,
        },
        body: body.toString(),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const text = await response.text();
        errors.push(`HUD ${state}: HTTP ${response.status} - ${text.substring(0, 100)}`);
        continue;
      }

      const data = await response.json() as { searchresult?: HudApiListing[] };
      const rawListings = data.searchresult || [];

      for (const raw of rawListings) {
        const normalized = normalizeHudApiListing(raw);
        if (normalized) allListings.push(normalized);
      }

      await new Promise(r => setTimeout(r, 1500));
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
