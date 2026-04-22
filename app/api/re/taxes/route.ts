import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
      `SELECT id, property_id, tax_year, assessed_total, assessed_land, assessed_improvement,
              market_value, tax_amount, tax_rate, exemptions, created_at
       FROM re_taxes WHERE property_id = $1 ORDER BY tax_year DESC`,
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
    console.error('Error in taxes GET endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch taxes' },
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
      tax_year,
      assessed_total,
      assessed_land,
      assessed_improvement,
      market_value,
      tax_amount,
      tax_rate,
      exemptions,
      source_id,
      meta,
    } = body;

    if (!property_id || !tax_year) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['user_input'], confidence: 0, warnings: [] },
          error: { code: 'MISSING_PARAMS', message: 'property_id and tax_year are required' },
        },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO re_taxes (property_id, tax_year, assessed_total, assessed_land, assessed_improvement,
                             market_value, tax_amount, tax_rate, exemptions, source_id, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, property_id, tax_year, tax_amount, created_at`,
      [
        property_id, tax_year, assessed_total ?? null, assessed_land ?? null,
        assessed_improvement ?? null, market_value ?? null, tax_amount ?? null,
        tax_rate ?? null, exemptions ? JSON.stringify(exemptions) : null,
        source_id ?? null, meta ? JSON.stringify(meta) : null,
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
    console.error('Error in taxes POST endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create tax record' },
      },
      { status: 500 }
    );
  }
}
