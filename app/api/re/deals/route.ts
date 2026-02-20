import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function nowIso(): string {
  return new Date().toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('property_id');
    const status = searchParams.get('status');

    const conditions: string[] = [];
    const params: string[] = [];
    let idx = 1;

    if (propertyId) {
      conditions.push(`property_id = $${idx}`);
      params.push(propertyId);
      idx++;
    }

    if (status) {
      conditions.push(`status = $${idx}`);
      params.push(status);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT id, property_id, user_id, created_by_wallet, deal_name, strategy, status,
              target_purchase_price, notes, created_at, updated_at
       FROM re_deals ${whereClause} ORDER BY created_at DESC LIMIT 50`,
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
    console.error('Error in deals GET endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch deals' },
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
      user_id,
      created_by_wallet,
      deal_name,
      strategy,
      target_purchase_price,
      notes,
      meta,
    } = body;

    if (!property_id || !deal_name || !strategy) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['user_input'], confidence: 0, warnings: [] },
          error: { code: 'MISSING_PARAMS', message: 'property_id, deal_name and strategy are required' },
        },
        { status: 400 }
      );
    }

    const validStrategies = ['brrrr', 'flip', 'hold', 'note', 'multifamily'];
    if (!validStrategies.includes(strategy)) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['user_input'], confidence: 0, warnings: [] },
          error: { code: 'INVALID_STRATEGY', message: `strategy must be one of: ${validStrategies.join(', ')}` },
        },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO re_deals (property_id, user_id, created_by_wallet, deal_name, strategy, target_purchase_price, notes, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, property_id, deal_name, strategy, status, created_at`,
      [
        property_id, user_id ?? null, created_by_wallet ?? null,
        deal_name, strategy, target_purchase_price ?? null,
        notes ?? null, meta ? JSON.stringify(meta) : null,
      ]
    );

    return NextResponse.json(
      {
        data: result.rows[0],
        meta: {
          as_of: nowIso(),
          sources_used: ['user_input'],
          confidence: 0.4,
          warnings: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in deals POST endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create deal' },
      },
      { status: 500 }
    );
  }
}
