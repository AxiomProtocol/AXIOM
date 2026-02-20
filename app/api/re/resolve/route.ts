import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    const normalizedAddress = address.trim().toLowerCase();

    const existing = await db.query(
      `SELECT id, address_normalized, lat, lon FROM re_properties WHERE address_normalized = $1 LIMIT 1`,
      [normalizedAddress]
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
        },
        meta: {
          as_of: nowIso(),
          sources_used: ['internal_db'],
          confidence,
          warnings: [],
        },
      });
    }

    const inserted = await db.query(
      `INSERT INTO re_properties (address_raw, address_normalized) VALUES ($1, $2) RETURNING id, address_normalized`,
      [address, normalizedAddress]
    );

    return NextResponse.json(
      {
        data: {
          property_id: inserted.rows[0].id,
          confidence: 0.4,
          address_normalized: inserted.rows[0].address_normalized,
        },
        meta: {
          as_of: nowIso(),
          sources_used: ['user_input'],
          confidence: 0.4,
          warnings: ['New property stub created - geocoding pending'],
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