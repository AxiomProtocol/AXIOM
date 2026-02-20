const RENTCAST_BASE = 'https://api.rentcast.io/v1';

function getApiKey(): string | null {
  return process.env.RENTCAST_API_KEY || null;
}

function rentcastHeaders(): HeadersInit {
  return {
    'X-Api-Key': getApiKey() || '',
    'Accept': 'application/json',
  };
}

export interface RentcastRentEstimate {
  rent: number;
  rentRangeLow: number;
  rentRangeHigh: number;
  latitude?: number;
  longitude?: number;
  listings?: RentcastListing[];
}

export interface RentcastListing {
  id?: string;
  rent: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  distance?: number;
  address?: string;
  daysOnMarket?: number;
}

export interface RentcastValueEstimate {
  price: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  latitude?: number;
  longitude?: number;
  comparables?: RentcastComparable[];
}

export interface RentcastComparable {
  id?: string;
  price?: number;
  listDate?: string;
  removedDate?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  distance?: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface RentcastPropertyDetail {
  id?: string;
  formattedAddress?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  ownerOccupied?: boolean;
  lastSaleDate?: string;
  lastSalePrice?: number;
  assessedValue?: number;
  assessedLandValue?: number;
  assessedImprovementValue?: number;
  taxAmount?: number;
  taxYear?: number;
}

export function isRentcastConfigured(): boolean {
  return !!getApiKey();
}

export async function fetchRentEstimate(params: {
  address: string;
  propertyType?: string;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
}): Promise<RentcastRentEstimate | null> {
  const key = getApiKey();
  if (!key) return null;

  try {
    const qs = new URLSearchParams({ address: params.address });
    if (params.propertyType) qs.set('propertyType', params.propertyType);
    if (params.squareFootage) qs.set('squareFootage', String(params.squareFootage));
    if (params.bedrooms) qs.set('bedrooms', String(params.bedrooms));
    if (params.bathrooms) qs.set('bathrooms', String(params.bathrooms));

    const res = await fetch(`${RENTCAST_BASE}/avm/rent/long-term?${qs.toString()}`, {
      headers: rentcastHeaders(),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;
    return (await res.json()) as RentcastRentEstimate;
  } catch {
    return null;
  }
}

export async function fetchValueEstimate(params: {
  address: string;
  propertyType?: string;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
}): Promise<RentcastValueEstimate | null> {
  const key = getApiKey();
  if (!key) return null;

  try {
    const qs = new URLSearchParams({ address: params.address });
    if (params.propertyType) qs.set('propertyType', params.propertyType);
    if (params.squareFootage) qs.set('squareFootage', String(params.squareFootage));
    if (params.bedrooms) qs.set('bedrooms', String(params.bedrooms));
    if (params.bathrooms) qs.set('bathrooms', String(params.bathrooms));

    const res = await fetch(`${RENTCAST_BASE}/avm/value?${qs.toString()}`, {
      headers: rentcastHeaders(),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;
    return (await res.json()) as RentcastValueEstimate;
  } catch {
    return null;
  }
}

export async function fetchRentcastProperty(address: string): Promise<RentcastPropertyDetail | null> {
  const key = getApiKey();
  if (!key) return null;

  try {
    const qs = new URLSearchParams({ address });
    const res = await fetch(`${RENTCAST_BASE}/properties?${qs.toString()}`, {
      headers: rentcastHeaders(),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data[0] as RentcastPropertyDetail;
    if (data && typeof data === 'object' && !Array.isArray(data)) return data as RentcastPropertyDetail;
    return null;
  } catch {
    return null;
  }
}
