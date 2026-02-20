import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function nowIso(): string {
  return new Date().toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('property_id');

    if (!propertyId) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: [] },
          error: { code: 'MISSING_PARAMS', message: 'property_id is required' },
        },
        { status: 400 }
      );
    }

    const result = await db.query(
      `SELECT id, property_id, sale_date, sale_price, price_per_sqft,
              buyer, seller, deed_type, document_number, is_arms_length, created_at
       FROM re_sales WHERE property_id = $1 ORDER BY sale_date DESC`,
      [propertyId]
    );

    return NextResponse.json({
      data: result.rows,
      meta: {
        as_of: nowIso(),
        sources_used: ['internal_db'],
        confidence: result.rows.length > 0 ? 0.7 : 0.4,
        warnings: [],
      },
    });
  } catch (error) {
    console.error('Error in sales GET endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch sales' },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      property_id,
      sale_date,
      sale_price,
      price_per_sqft,
      buyer,
      seller,
      deed_type,
      document_number,
      is_arms_length,
      source_id,
      meta,
    } = body;

    if (!property_id || !sale_date) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['user_input'], confidence: 0, warnings: [] },
          error: { code: 'MISSING_PARAMS', message: 'property_id and sale_date are required' },
        },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO re_sales (property_id, sale_date, sale_price, price_per_sqft, buyer, seller,
                             deed_type, document_number, is_arms_length, source_id, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, property_id, sale_date, sale_price, created_at`,
      [
        property_id, sale_date, sale_price ?? null, price_per_sqft ?? null,
        buyer ?? null, seller ?? null, deed_type ?? null, document_number ?? null,
        is_arms_length ?? true, source_id ?? null, meta ? JSON.stringify(meta) : null,
      ]
    );

    return NextResponse.json(
      {
        data: result.rows[0],
        meta: {
          as_of: nowIso(),
          sources_used: ['user_input'],
          confidence: 1.0,
          warnings: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in sales POST endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create sale record' },
      },
      { status: 500 }
    );
  }
}
