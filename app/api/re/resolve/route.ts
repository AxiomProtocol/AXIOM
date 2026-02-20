import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geocodeAddress, extractAddressComponents, buildNormalizedAddress } from '@/lib/re/geocoder';

function nowIso(): string {
  return new Date().toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        {
          data: null,
          meta: {
            as_of: nowIso(),
            sources_used: ['user_input'],
            confidence: 0,
            warnings: ['Invalid address provided'],
          },
          error: {
            code: 'INVALID_INPUT',
            message: 'Address is required and must be a string',
          },
        },
        { status: 400 }
      );
    }

    const rawAddress = address.trim();
    const normalizedFallback = rawAddress.toLowerCase();

    const existing = await db.query(
      `SELECT id, address_normalized, lat, lon
       FROM re_properties
       WHERE address_normalized = $1 OR address_raw ILIKE $2
       LIMIT 1`,
      [normalizedFallback, rawAddress]
    );

    if (existing.rows.length > 0) {
      const prop = existing.rows[0];
      const hasGeocode = prop.lat !== null && prop.lon !== null;
      const confidence = hasGeocode ? 0.7 : 0.4;

      return NextResponse.json({
        data: {
          property_id: prop.id,
          confidence,
          address_normalized: prop.address_normalized,
          geocoded: hasGeocode,
        },
        meta: {
          as_of: nowIso(),
          sources_used: ['internal_db'],
          confidence,
          warnings: hasGeocode ? [] : ['Property found but not yet geocoded — run ingest to populate coordinates'],
        },
      });
    }

    const geo = await geocodeAddress(rawAddress);

    let addressNormalized = normalizedFallback;
    let lat: number | null = null;
    let lon: number | null = null;
    let city: string | null = null;
    let state: string | null = null;
    let zip: string | null = null;
    let county: string | null = null;
    let streetNumber: string | null = null;
    let streetName: string | null = null;
    const sourcesUsed: string[] = ['user_input'];
    const warnings: string[] = [];

    if (geo) {
      addressNormalized = buildNormalizedAddress(geo);
      lat = parseFloat(geo.lat);
      lon = parseFloat(geo.lon);
      const components = extractAddressComponents(geo);
      city = components.city;
      state = components.state;
      zip = components.zip;
      county = components.county;
      streetNumber = components.street_number;
      streetName = components.street_name;
      sourcesUsed.push('internal_db');
    } else {
      warnings.push('Geocoding unavailable — address stored without coordinates. Run ingest to populate.');
    }

    const existingNormalized = await db.query(
      `SELECT id, address_normalized, lat, lon FROM re_properties WHERE address_normalized = $1 LIMIT 1`,
      [addressNormalized]
    );

    if (existingNormalized.rows.length > 0) {
      const prop = existingNormalized.rows[0];
      const hasGeocode = prop.lat !== null && prop.lon !== null;
      const confidence = hasGeocode ? 0.7 : 0.4;
      return NextResponse.json({
        data: {
          property_id: prop.id,
          confidence,
          address_normalized: prop.address_normalized,
          geocoded: hasGeocode,
        },
        meta: {
          as_of: nowIso(),
          sources_used: ['internal_db'],
          confidence,
          warnings,
        },
      });
    }

    const locationSql = lat !== null && lon !== null
      ? `ST_SetSRID(ST_MakePoint($10, $9), 4326)`
      : 'NULL';

    const inserted = await db.query(
      `INSERT INTO re_properties (
         address_raw, address_normalized, street_number, street_name,
         city, state, zip, county, lat, lon, location_point
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ${locationSql})
       RETURNING id, address_normalized, lat, lon`,
      lat !== null && lon !== null
        ? [rawAddress, addressNormalized, streetNumber, streetName, city, state, zip, county, lat, lon]
        : [rawAddress, addressNormalized, streetNumber, streetName, city, state, zip, county, null, null]
    );

    const newProp = inserted.rows[0];
    const hasGeocode = newProp.lat !== null;
    const confidence = hasGeocode ? 0.4 : 0.2;

    return NextResponse.json(
      {
        data: {
          property_id: newProp.id,
          confidence,
          address_normalized: newProp.address_normalized,
          geocoded: hasGeocode,
        },
        meta: {
          as_of: nowIso(),
          sources_used: sourcesUsed,
          confidence,
          warnings: [
            ...warnings,
            'New property stub created — run POST /api/re/ingest with property_id to fetch sales and tax data',
          ],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in resolve endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: {
          as_of: nowIso(),
          sources_used: [],
          confidence: 0,
          warnings: ['Internal server error'],
        },
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to resolve address',
        },
      },
      { status: 500 }
    );
  }
}
