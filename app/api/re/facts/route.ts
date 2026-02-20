import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function nowIso(): string {
  return new Date().toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { property_id, fact_type, fact_value, fact_numeric, as_of, source_id, confidence, meta } = body;

    if (!property_id || !fact_type) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['user_input'], confidence: 0, warnings: [] },
          error: { code: 'MISSING_PARAMS', message: 'property_id and fact_type are required' },
        },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO re_property_facts (property_id, fact_type, fact_value, fact_numeric, as_of, source_id, confidence, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, property_id, fact_type, fact_value, fact_numeric, as_of, confidence, created_at`,
      [
        property_id, fact_type, fact_value ?? null, fact_numeric ?? null,
        as_of ?? null, source_id ?? null, confidence ?? null,
        meta ? JSON.stringify(meta) : null,
      ]
    );

    return NextResponse.json(
      {
        data: result.rows[0],
        meta: {
          as_of: nowIso(),
          sources_used: ['user_input'],
          confidence: confidence ?? 0.7,
          warnings: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in facts POST endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to upsert fact' },
      },
      { status: 500 }
    );
  }
}
