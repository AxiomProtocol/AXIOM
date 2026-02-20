import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { properties } from '@/shared/realEstateSchema';
import { eq, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        {
          data: null,
          meta: {
            as_of: new Date().toISOString(),
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
    
    const existingProperty = await db
      .select({
        id: properties.id,
        addressNormalized: properties.addressNormalized,
        latitude: properties.latitude,
        longitude: properties.longitude,
        confidence: properties.confidence,
      })
      .from(properties)
      .where(eq(properties.addressNormalized, normalizedAddress))
      .limit(1);

    if (existingProperty.length > 0) {
      const prop = existingProperty[0];
      const hasGeocode = prop.latitude !== null && prop.longitude !== null;
      
      return NextResponse.json({
        data: {
          property_id: prop.id,
          confidence: hasGeocode ? 0.7 : 0.4,
          address_normalized: prop.addressNormalized,
        },
        meta: {
          as_of: new Date().toISOString(),
          sources_used: ['internal_db'],
          confidence: hasGeocode ? 0.7 : 0.4,
          warnings: [],
        },
      });
    }

    const newProperty = await db
      .insert(properties)
      .values({
        addressNormalized: normalizedAddress,
        addressRaw: address,
        confidence: 0.4,
        sourcesUsed: ['user_input'],
      })
      .returning({
        id: properties.id,
        addressNormalized: properties.addressNormalized,
      });

    return NextResponse.json(
      {
        data: {
          property_id: newProperty[0].id,
          confidence: 0.4,
          address_normalized: newProperty[0].addressNormalized,
        },
        meta: {
          as_of: new Date().toISOString(),
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
          as_of: new Date().toISOString(),
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