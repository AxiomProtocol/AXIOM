import { db } from '../../db';
import { propGeoCache, propProviderCalls } from '../../../shared/propertySchema';
import { eq, gt } from 'drizzle-orm';

interface GeoResult {
  lat: number;
  lon: number;
  addressNormalized: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  fips: string;
  censusTract: string;
  amenityScores: AmenityScores;
}

interface AmenityScores {
  groceryCount: number;
  schoolCount: number;
  parkCount: number;
  transitCount: number;
  hospitalCount: number;
  totalPoi: number;
  densityRating: 'low' | 'medium' | 'high';
}

function normalizeQueryKey(address: string): string {
  return address.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

async function fetchNominatim(address: string): Promise<{ lat: number; lon: number; display: string; addressParts: any } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1&countrycodes=us`;
  const start = Date.now();

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AxiomProtocol/1.0 (property-analysis)' },
    });

    const latency = Date.now() - start;
    await logProviderCall(null, 'nominatim', 'search', res.status, latency, false, null);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;

    const r = data[0];
    return {
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      display: r.display_name,
      addressParts: r.address,
    };
  } catch (err: any) {
    await logProviderCall(null, 'nominatim', 'search', 0, Date.now() - start, false, err.message);
    return null;
  }
}

async function fetchAmenities(lat: number, lon: number): Promise<AmenityScores> {
  const radiusMeters = 1609;
  const categories: Record<string, string> = {
    grocery: '["shop"~"supermarket|grocery|convenience"]',
    school: '["amenity"~"school|university|college"]',
    park: '["leisure"~"park|garden|playground"]',
    transit: '["public_transport"="stop_position"]',
    hospital: '["amenity"~"hospital|clinic|pharmacy"]',
  };

  const scores: AmenityScores = {
    groceryCount: 0,
    schoolCount: 0,
    parkCount: 0,
    transitCount: 0,
    hospitalCount: 0,
    totalPoi: 0,
    densityRating: 'low',
  };

  try {
    const query = `
      [out:json][timeout:10];
      (
        node(around:${radiusMeters},${lat},${lon})["shop"~"supermarket|grocery|convenience"];
        node(around:${radiusMeters},${lat},${lon})["amenity"~"school|university|college"];
        node(around:${radiusMeters},${lat},${lon})["leisure"~"park|garden|playground"];
        node(around:${radiusMeters},${lat},${lon})["public_transport"="stop_position"];
        node(around:${radiusMeters},${lat},${lon})["amenity"~"hospital|clinic|pharmacy"];
      );
      out count;
    `;

    const start = Date.now();
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    await logProviderCall(null, 'overpass', 'amenities', res.status, Date.now() - start, false, null);

    if (res.ok) {
      const data = await res.json();
      const total = data.elements?.[0]?.tags?.total ? parseInt(data.elements[0].tags.total) : 0;
      scores.totalPoi = total;
      scores.densityRating = total > 50 ? 'high' : total > 15 ? 'medium' : 'low';
    }
  } catch {
    // amenities are best-effort
  }

  return scores;
}

function extractFips(addressParts: any): string {
  return '';
}

function extractCensusTract(addressParts: any): string {
  return '';
}

export async function geocodeAddress(address: string, reportId?: string): Promise<GeoResult | null> {
  const key = normalizeQueryKey(address);

  const cached = await db.select().from(propGeoCache)
    .where(eq(propGeoCache.queryKey, key))
    .limit(1);

  if (cached.length && cached[0].expiresAt > new Date()) {
    return {
      lat: parseFloat(cached[0].lat),
      lon: parseFloat(cached[0].lon),
      addressNormalized: cached[0].addressNormalized || address,
      city: cached[0].city || '',
      state: cached[0].state || '',
      zip: cached[0].zip || '',
      county: cached[0].county || '',
      fips: cached[0].fips || '',
      censusTract: cached[0].censusTract || '',
      amenityScores: (cached[0].amenityScores as AmenityScores) || { groceryCount: 0, schoolCount: 0, parkCount: 0, transitCount: 0, hospitalCount: 0, totalPoi: 0, densityRating: 'low' },
    };
  }

  const nom = await fetchNominatim(address);
  if (!nom) return null;

  const amenities = await fetchAmenities(nom.lat, nom.lon);

  const ap = nom.addressParts || {};
  const result: GeoResult = {
    lat: nom.lat,
    lon: nom.lon,
    addressNormalized: nom.display,
    city: ap.city || ap.town || ap.village || '',
    state: ap.state || '',
    zip: ap.postcode || '',
    county: ap.county || '',
    fips: extractFips(ap),
    censusTract: extractCensusTract(ap),
    amenityScores: amenities,
  };

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  try {
    await db.insert(propGeoCache).values({
      queryKey: key,
      lat: result.lat.toString(),
      lon: result.lon.toString(),
      addressNormalized: result.addressNormalized,
      city: result.city,
      state: result.state,
      zip: result.zip,
      county: result.county,
      fips: result.fips,
      censusTract: result.censusTract,
      amenityScores: result.amenityScores,
      expiresAt,
    }).onConflictDoUpdate({
      target: propGeoCache.queryKey,
      set: {
        lat: result.lat.toString(),
        lon: result.lon.toString(),
        addressNormalized: result.addressNormalized,
        city: result.city,
        state: result.state,
        zip: result.zip,
        county: result.county,
        amenityScores: result.amenityScores,
        expiresAt,
      },
    });
  } catch {}

  return result;
}

async function logProviderCall(
  reportId: string | null,
  provider: string,
  endpoint: string,
  statusCode: number,
  latencyMs: number,
  cached: boolean,
  errorMessage: string | null
) {
  try {
    await db.insert(propProviderCalls).values({
      reportId: reportId || undefined,
      provider,
      endpoint,
      statusCode,
      latencyMs,
      cached,
      errorMessage,
    });
  } catch {}
}

export type { GeoResult, AmenityScores };
