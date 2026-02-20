export interface NominatimAddress {
  house_number?: string;
  road?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country_code?: string;
}

export interface GeocodeResult {
  lat: string;
  lon: string;
  display_name: string;
  address: NominatimAddress;
  boundingbox: string[];
  place_id: number;
  osm_type: string;
  osm_id: number;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'AxiomProtocol-RE-Intelligence/1.0 (axiomprotocol.io)';

export async function geocodeAddress(rawAddress: string): Promise<GeocodeResult | null> {
  try {
    const url =
      `${NOMINATIM_BASE}/search?q=${encodeURIComponent(rawAddress)}` +
      `&format=json&addressdetails=1&limit=1&countrycodes=us`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data: GeocodeResult[] = await res.json();
    return data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

export function extractAddressComponents(result: GeocodeResult): {
  street_number: string | null;
  street_name: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
} {
  const a = result.address;
  return {
    street_number: a.house_number || null,
    street_name: a.road || null,
    city: a.city || a.town || a.village || null,
    state: a.state || null,
    zip: a.postcode || null,
    county: a.county || null,
  };
}

export function buildNormalizedAddress(result: GeocodeResult): string {
  const a = result.address;
  const parts: string[] = [];
  if (a.house_number) parts.push(a.house_number);
  if (a.road) parts.push(a.road);
  const city = a.city || a.town || a.village;
  if (city) parts.push(city);
  if (a.state) parts.push(a.state);
  if (a.postcode) parts.push(a.postcode);
  return parts.join(', ').toLowerCase().trim();
}
