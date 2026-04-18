const REPLIERS_BASE = 'https://api.repliers.io';
const REPLIERS_CDN = 'https://cdn.repliers.io';

export type RepliersImageSize = 'small' | 'medium' | 'large';

export function buildRepliersImageUrl(image: string, size: RepliersImageSize = 'large'): string {
  if (!image) return '';
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  const filename = image.replace(/^\/+/, '');
  return `${REPLIERS_CDN}/${filename}?class=${size}`;
}

function getApiKey(): { key: string; isTestMode: boolean } | null {
  const prodKey = process.env.REPLIERS_API_KEY;
  const testKey = process.env.REPLIERS_API_TEST_KEY;
  if (prodKey) return { key: prodKey, isTestMode: false };
  if (testKey) return { key: testKey, isTestMode: true };
  return null;
}

function repliersHeaders(apiKey: string): HeadersInit {
  return {
    'REPLIERS-API-KEY': apiKey,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

export interface RepliersAddress {
  city?: string;
  streetName?: string;
  streetNumber?: string;
  streetSuffix?: string;
  unitNumber?: string;
  zip?: string;
  state?: string;
}

export interface RepliersListing {
  mlsNumber?: string;
  status?: string;
  lastStatus?: string;
  listPrice?: number;
  soldPrice?: number;
  daysOnMarket?: number;
  listDate?: string;
  soldDate?: string;
  address?: {
    streetNumber?: string;
    streetName?: string;
    streetSuffix?: string;
    unitNumber?: string;
    city?: string;
    state?: string;
    zip?: string;
    area?: string;
    district?: string;
    majorIntersection?: string;
    neighborhood?: string;
    country?: string;
  };
  details?: {
    numBedrooms?: number;
    numBathrooms?: number;
    numBathroomsPlus?: number;
    sqft?: string;
    yearBuilt?: string;
    propertyType?: string;
    style?: string;
    garage?: string;
    lotWidth?: string;
    lotDepth?: string;
    lotSizeFrontTimesDepth?: string;
    description?: string;
  };
  map?: {
    latitude?: number;
    longitude?: number;
    streetViewUrl?: string;
  };
  images?: string[];
  addressKey?: string;
}

export interface RepliersListingsResponse {
  listings?: RepliersListing[];
  count?: number;
  numPages?: number;
  page?: number;
  pageSize?: number;
}

export interface RepliersEstimateResponse {
  price?: number;
  priceMin?: number;
  priceMax?: number;
  confidence?: number;
  comparables?: Array<{
    mlsNumber?: string;
    listPrice?: number;
    soldPrice?: number;
    address?: RepliersAddress;
    details?: {
      numBedrooms?: number;
      numBathrooms?: number;
      sqft?: string;
    };
    soldDate?: string;
    daysOnMarket?: number;
  }>;
}

export interface RepliersResult<T> {
  data: T | null;
  isTestMode: boolean;
}

export function isRepliersConfigured(): boolean {
  return getApiKey() !== null;
}

function normalizeImageUrls(images?: string[]): string[] {
  if (!images) return [];
  return images.map((img) => buildRepliersImageUrl(img, 'large'));
}

const EMPTY_LISTINGS: RepliersListingsResponse = { listings: [], count: 0, numPages: 0, page: 1 };
const EMPTY_ESTIMATE: RepliersEstimateResponse = {};

export async function searchListings(params: {
  city?: string;
  state?: string;
  zip?: string;
  streetNumber?: string;
  streetName?: string;
  streetSuffix?: string;
  status?: string;
  lastStatus?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  propertyType?: string | string[];
  classes?: string | string[];
  style?: string | string[];
  search?: string;
  daysOnMarketMin?: number;
  daysOnMarketMax?: number;
  addressKey?: string;
  pageNum?: number;
  resultsPerPage?: number;
}): Promise<RepliersResult<RepliersListingsResponse>> {
  const keyInfo = getApiKey();
  if (!keyInfo) return { data: EMPTY_LISTINGS, isTestMode: true };

  try {
    const qs = new URLSearchParams();
    const appendArr = (key: string, val: string | string[] | undefined) => {
      if (!val) return;
      const arr = Array.isArray(val) ? val : [val];
      arr.filter(Boolean).forEach((v) => qs.append(key, String(v)));
    };
    const appendNum = (key: string, val: number | undefined) => {
      if (val == null || !Number.isFinite(val)) return;
      qs.append(key, String(val));
    };
    const appendStr = (key: string, val: string | undefined) => {
      if (val) qs.append(key, val);
    };

    appendStr('city', params.city);
    appendStr('state', params.state);
    appendStr('zip', params.zip);
    appendStr('streetNumber', params.streetNumber);
    appendStr('streetName', params.streetName);
    appendStr('streetSuffix', params.streetSuffix);
    appendStr('status', params.status);
    appendArr('lastStatus', params.lastStatus);
    appendNum('minPrice', params.minPrice);
    appendNum('maxPrice', params.maxPrice);
    appendNum('minBeds', params.minBeds);
    appendNum('maxBeds', params.maxBeds);
    appendNum('minBaths', params.minBaths);
    appendNum('minSqft', params.minSqft);
    appendNum('maxSqft', params.maxSqft);
    appendArr('propertyType', params.propertyType);
    appendArr('class', params.classes);
    appendArr('style', params.style);
    appendStr('search', params.search);
    appendNum('minDaysOnMarket', params.daysOnMarketMin);
    appendNum('maxDaysOnMarket', params.daysOnMarketMax);
    appendStr('addressKey', params.addressKey);
    appendNum('pageNum', params.pageNum);
    appendNum('resultsPerPage', params.resultsPerPage);

    const res = await fetch(`${REPLIERS_BASE}/listings?${qs.toString()}`, {
      method: 'GET',
      headers: repliersHeaders(keyInfo.key),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[Repliers] searchListings HTTP ${res.status}`);
      return { data: EMPTY_LISTINGS, isTestMode: keyInfo.isTestMode };
    }

    const data = await res.json() as RepliersListingsResponse;
    if (data.listings) {
      data.listings = data.listings.map((l) => ({ ...l, images: normalizeImageUrls(l.images) }));
    }
    return { data, isTestMode: keyInfo.isTestMode };
  } catch (err) {
    console.warn('[Repliers] searchListings error:', err instanceof Error ? err.message : err);
    return { data: EMPTY_LISTINGS, isTestMode: keyInfo.isTestMode };
  }
}

export async function getSalesComps(params: {
  city?: string;
  state?: string;
  zip?: string;
  minBeds?: number;
  maxBeds?: number;
  resultsPerPage?: number;
}): Promise<RepliersResult<RepliersListingsResponse>> {
  return searchListings({
    ...params,
    status: 'U',
    resultsPerPage: params.resultsPerPage || 10,
  });
}

const EMPTY_LISTING: RepliersListing = {};

export async function getListingByMlsNumber(mlsNumber: string): Promise<RepliersResult<RepliersListing>> {
  const keyInfo = getApiKey();
  if (!keyInfo) return { data: EMPTY_LISTING, isTestMode: true };

  try {
    const res = await fetch(`${REPLIERS_BASE}/listings/${encodeURIComponent(mlsNumber)}`, {
      method: 'GET',
      headers: repliersHeaders(keyInfo.key),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[Repliers] getListingByMlsNumber HTTP ${res.status}`);
      return { data: EMPTY_LISTING, isTestMode: keyInfo.isTestMode };
    }

    const data = await res.json() as RepliersListing;
    return { data, isTestMode: keyInfo.isTestMode };
  } catch (err) {
    console.warn('[Repliers] getListingByMlsNumber error:', err instanceof Error ? err.message : err);
    return { data: EMPTY_LISTING, isTestMode: keyInfo.isTestMode };
  }
}

export async function getEstimate(params: {
  city?: string;
  streetName?: string;
  streetNumber?: string;
  streetSuffix?: string;
  zip?: string;
  state?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  overallQuality?: string;
}): Promise<RepliersResult<RepliersEstimateResponse>> {
  const keyInfo = getApiKey();
  if (!keyInfo) return { data: EMPTY_ESTIMATE, isTestMode: true };

  try {
    const body: Record<string, unknown> = {
      address: {
        city: params.city,
        streetName: params.streetName,
        streetNumber: params.streetNumber,
        streetSuffix: params.streetSuffix,
        zip: params.zip,
        state: params.state,
      },
    };
    if (params.beds) body.beds = params.beds;
    if (params.baths) body.baths = params.baths;
    if (params.sqft) body.sqft = params.sqft;
    if (params.overallQuality) body.overallQuality = params.overallQuality;

    const res = await fetch(`${REPLIERS_BASE}/estimates`, {
      method: 'POST',
      headers: repliersHeaders(keyInfo.key),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[Repliers] getEstimate HTTP ${res.status}`);
      return { data: EMPTY_ESTIMATE, isTestMode: keyInfo.isTestMode };
    }

    const data = await res.json() as RepliersEstimateResponse;
    return { data, isTestMode: keyInfo.isTestMode };
  } catch (err) {
    console.warn('[Repliers] getEstimate error:', err instanceof Error ? err.message : err);
    return { data: EMPTY_ESTIMATE, isTestMode: keyInfo.isTestMode };
  }
}
