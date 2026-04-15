const REPLIERS_BASE = 'https://api.repliers.io';

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

export async function searchListings(params: {
  city?: string;
  state?: string;
  zip?: string;
  status?: string;
  lastStatus?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  daysOnMarketMin?: number;
  addressKey?: string;
  pageNum?: number;
  resultsPerPage?: number;
}): Promise<RepliersResult<RepliersListingsResponse>> {
  const keyInfo = getApiKey();
  if (!keyInfo) return { data: null, isTestMode: true };

  try {
    const body: Record<string, unknown> = {};
    if (params.city) body.city = params.city;
    if (params.state) body.state = params.state;
    if (params.zip) body.zip = params.zip;
    if (params.status) body.status = params.status;
    if (params.lastStatus) {
      body.lastStatus = Array.isArray(params.lastStatus) ? params.lastStatus : [params.lastStatus];
    }
    if (params.minPrice) body.minPrice = params.minPrice;
    if (params.maxPrice) body.maxPrice = params.maxPrice;
    if (params.minBeds) body.minBeds = params.minBeds;
    if (params.maxBeds) body.maxBeds = params.maxBeds;
    if (params.daysOnMarketMin) body.daysOnMarket = { min: params.daysOnMarketMin };
    if (params.addressKey) body.addressKey = params.addressKey;
    if (params.pageNum) body.pageNum = params.pageNum;
    if (params.resultsPerPage) body.resultsPerPage = params.resultsPerPage;

    const res = await fetch(`${REPLIERS_BASE}/listings`, {
      method: 'POST',
      headers: repliersHeaders(keyInfo.key),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[Repliers] searchListings HTTP ${res.status}`);
      return { data: null, isTestMode: keyInfo.isTestMode };
    }

    const data = await res.json() as RepliersListingsResponse;
    return { data, isTestMode: keyInfo.isTestMode };
  } catch (err) {
    console.warn('[Repliers] searchListings error:', err instanceof Error ? err.message : err);
    return { data: null, isTestMode: keyInfo.isTestMode };
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

export async function getListingByMlsNumber(mlsNumber: string): Promise<RepliersResult<RepliersListing | null>> {
  const keyInfo = getApiKey();
  if (!keyInfo) return { data: null, isTestMode: true };

  try {
    const res = await fetch(`${REPLIERS_BASE}/listings/${encodeURIComponent(mlsNumber)}`, {
      method: 'GET',
      headers: repliersHeaders(keyInfo.key),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[Repliers] getListingByMlsNumber HTTP ${res.status}`);
      return { data: null, isTestMode: keyInfo.isTestMode };
    }

    const data = await res.json() as RepliersListing;
    return { data, isTestMode: keyInfo.isTestMode };
  } catch (err) {
    console.warn('[Repliers] getListingByMlsNumber error:', err instanceof Error ? err.message : err);
    return { data: null, isTestMode: keyInfo.isTestMode };
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
  if (!keyInfo) return { data: null, isTestMode: true };

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
    if (params.beds) body.numBedrooms = params.beds;
    if (params.baths) body.numBathrooms = params.baths;
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
      return { data: null, isTestMode: keyInfo.isTestMode };
    }

    const data = await res.json() as RepliersEstimateResponse;
    return { data, isTestMode: keyInfo.isTestMode };
  } catch (err) {
    console.warn('[Repliers] getEstimate error:', err instanceof Error ? err.message : err);
    return { data: null, isTestMode: keyInfo.isTestMode };
  }
}
