import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function nowIso(): string {
  return new Date().toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const zip = searchParams.get('zip');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const radius = searchParams.get('radius');

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let idx = 1;

    if (q) {
      conditions.push(`COALESCE(address_normalized, address_raw) ILIKE $${idx}`);
      const escapedQ = q.trim().replace(/[%_\\]/g, '\\$&');
      params.push(`%${escapedQ}%`);
      idx++;
    }

    if (city) {
      conditions.push(`city = $${idx}`);
      params.push(city);
      idx++;
    }

    if (state) {
      conditions.push(`state = $${idx}`);
      params.push(state);
      idx++;
    }

    if (zip) {
      conditions.push(`zip = $${idx}`);
      params.push(zip);
      idx++;
    }

    if (lat && lon && radius) {
      conditions.push(
        `ST_DWithin(location_point::geography, ST_MakePoint($${idx}, $${idx + 1})::geography, $${idx + 2})`
      );
      params.push(parseFloat(lon), parseFloat(lat), parseFloat(radius));
      idx += 3;
    }

    if (conditions.length === 0) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            as_of: nowIso(),
            sources_used: [],
            confidence: 0,
            warnings: ['At least one search parameter is required'],
          },
          error: {
            code: 'MISSING_PARAMS',
            message: 'Provide at least one of: q, city, state, zip, lat+lon+radius',
          },
        },
        { status: 400 }
      );
    }

    const whereClause = conditions.join(' AND ');
    const result = await db.query(
      `SELECT id, address_normalized, address_raw, city, state, zip, county, lat, lon, property_type, sqft, bedrooms, year_built, created_at
       FROM re_properties
       WHERE is_active = TRUE AND ${whereClause}
       ORDER BY created_at DESC
       LIMIT 50`,
      params
    );

    return NextResponse.json({
      data: result.rows,
      meta: {
        as_of: nowIso(),
        sources_used: ['internal_db'],
        confidence: 0.7,
        warnings: result.rows.length === 50 ? ['Results limited to 50'] : [],
      },
    });
  } catch (error) {
    console.error('Error in properties search endpoint:', error);
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
          message: 'Failed to search properties',
        },
      },
      { status: 500 }
    );
  }
}