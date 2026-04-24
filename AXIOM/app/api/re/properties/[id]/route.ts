import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function nowIso(): string {
  return new Date().toISOString();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const propResult = await db.query(
      `SELECT id, address_raw, address_normalized, street_number, street_name, unit,
              city, state, zip, county, fips, apn, lat, lon,
              property_type, year_built, sqft, lot_sqft, bedrooms, bathrooms,
              stories, garage, pool, zoning, is_active, meta, created_at, updated_at
       FROM re_properties WHERE id = $1`,
      [id]
    );

    if (propResult.rows.length === 0) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            as_of: nowIso(),
            sources_used: ['internal_db'],
            confidence: 0,
            warnings: [],
          },
          error: { code: 'NOT_FOUND', message: 'Property not found' },
        },
        { status: 404 }
      );
    }

    const salesResult = await db.query(
      `SELECT id, sale_date, sale_price, price_per_sqft, buyer, seller, deed_type, is_arms_length, created_at
       FROM re_sales WHERE property_id = $1 ORDER BY sale_date DESC LIMIT 20`,
      [id]
    );

    const taxesResult = await db.query(
      `SELECT id, tax_year, assessed_total, assessed_land, assessed_improvement, market_value, tax_amount, tax_rate, created_at
       FROM re_taxes WHERE property_id = $1 ORDER BY tax_year DESC LIMIT 10`,
      [id]
    );

    const factsResult = await db.query(
      `SELECT id, fact_type, fact_value, fact_numeric, as_of, confidence, created_at
       FROM re_property_facts WHERE property_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    const hasGeocode = propResult.rows[0].lat !== null && propResult.rows[0].lon !== null;
    const hasSaleOrTax = salesResult.rows.length > 0 || taxesResult.rows.length > 0;
    const confidence = hasGeocode && hasSaleOrTax ? 1.0 : hasGeocode ? 0.7 : 0.4;

    return NextResponse.json({
      data: {
        property: propResult.rows[0],
        sales: salesResult.rows,
        taxes: taxesResult.rows,
        facts: factsResult.rows,
      },
      meta: {
        as_of: nowIso(),
        sources_used: ['internal_db'],
        confidence,
        warnings: [],
      },
    });
  } catch (error) {
    console.error('Error in property profile endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: {
          as_of: nowIso(),
          sources_used: [],
          confidence: 0,
          warnings: ['Internal server error'],
        },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch property' },
      },
      { status: 500 }
    );
  }
}
