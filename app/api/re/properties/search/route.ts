import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { properties } from '@/shared/realEstateSchema';
import { sql, or, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const zip = searchParams.get('zip');

    const conditions = [];
    
    if (q) {
      conditions.push(sql`${properties.addressNormalized} % ${q.toLowerCase()}`);
    }
    
    if (city) {
      conditions.push(eq(properties.city, city));
    }
    
    if (state) {
      conditions.push(eq(properties.state, state));
    }
    
    if (zip) {
      conditions.push(eq(properties.zipCode, zip));
    }

    if (conditions.length === 0) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            as_of: new Date().toISOString(),
            sources_used: [],
            confidence: 0,
            warnings: ['At least one search parameter is required'],
          },
          error: {
            code: 'MISSING_PARAMS',
            message: 'Provide at least one of: q, city, state, zip',
          },
        },
        { status: 400 }
      );
    }

    const results = await db
      .select({
        id: properties.id,
        addressNormalized: properties.addressNormalized,
        addressRaw: properties.addressRaw,
        city: properties.city,
        state: properties.state,
        zipCode: properties.zipCode,
        county: properties.county,
        latitude: properties.latitude,
        longitude: properties.longitude,
        confidence: properties.confidence,
        createdAt: properties.createdAt,
      })
      .from(properties)
      .where(conditions.length > 1 ? or(...conditions) : conditions[0])
      .limit(50);

    return NextResponse.json({
      data: results,
      meta: {
        as_of: new Date().toISOString(),
        sources_used: ['internal_db'],
        confidence: 0.7,
        warnings: results.length === 50 ? ['Results limited to 50'] : [],
      },
    });
  } catch (error) {
    console.error('Error in properties search endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: {
          as_of: new Date().toISOString(),
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