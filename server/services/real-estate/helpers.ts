import type { NextApiResponse } from 'next';
import { reProperties } from '../../../shared/realEstateSchema';

export const safePropertyColumns = {
  id: reProperties.id,
  sourceId: reProperties.sourceId,
  externalId: reProperties.externalId,
  addressRaw: reProperties.addressRaw,
  addressNormalized: reProperties.addressNormalized,
  streetNumber: reProperties.streetNumber,
  streetName: reProperties.streetName,
  unit: reProperties.unit,
  city: reProperties.city,
  state: reProperties.state,
  zip: reProperties.zip,
  county: reProperties.county,
  fips: reProperties.fips,
  apn: reProperties.apn,
  lat: reProperties.lat,
  lon: reProperties.lon,
  propertyType: reProperties.propertyType,
  yearBuilt: reProperties.yearBuilt,
  sqft: reProperties.sqft,
  lotSqft: reProperties.lotSqft,
  bedrooms: reProperties.bedrooms,
  bathrooms: reProperties.bathrooms,
  stories: reProperties.stories,
  garage: reProperties.garage,
  pool: reProperties.pool,
  zoning: reProperties.zoning,
  isActive: reProperties.isActive,
  meta: reProperties.meta,
  createdAt: reProperties.createdAt,
  updatedAt: reProperties.updatedAt,
};

export interface ApiMeta {
  as_of: string;
  sources_used: string[];
  confidence: number;
  warnings?: string[];
}

export function successResponse(res: NextApiResponse, data: unknown, meta: ApiMeta) {
  return res.status(200).json({ data, meta, error: null });
}

export function errorResponse(
  res: NextApiResponse,
  status: number,
  code: string,
  message: string,
  meta?: Partial<ApiMeta>
) {
  return res.status(status).json({
    data: null,
    meta: {
      as_of: new Date().toISOString(),
      sources_used: [],
      confidence: 0,
      ...meta,
    },
    error: { code, message },
  });
}

export function buildMeta(
  sources: string[],
  confidence: number,
  warnings?: string[]
): ApiMeta {
  return {
    as_of: new Date().toISOString(),
    sources_used: sources,
    confidence,
    warnings: warnings?.length ? warnings : undefined,
  };
}

export function requireMethod(method: string) {
  return (req: { method?: string }, res: NextApiResponse): boolean => {
    if (req.method !== method) {
      errorResponse(res, 405, 'METHOD_NOT_ALLOWED', `Only ${method} is accepted`);
      return false;
    }
    return true;
  };
}

export function parseNumeric(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

export function safeNum(value: number, scale: number, maxIntDigits: number): string {
  if (!Number.isFinite(value)) return (0).toFixed(scale);
  const maxVal = Math.pow(10, maxIntDigits) - Math.pow(10, -scale);
  const clamped = Math.max(-maxVal, Math.min(maxVal, value));
  return clamped.toFixed(scale);
}

export function safeInt(value: number | null | undefined, max: number = 2147483647): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded > max || rounded < -max) return null;
  return rounded;
}
