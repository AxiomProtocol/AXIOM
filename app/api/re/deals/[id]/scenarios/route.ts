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

    const result = await db.query(
      `SELECT id, deal_id, scenario_name, is_primary, description, created_at, updated_at
       FROM re_deal_scenarios WHERE deal_id = $1 ORDER BY is_primary DESC, created_at ASC`,
      [id]
    );

    return NextResponse.json({
      data: result.rows,
      meta: {
        as_of: nowIso(),
        sources_used: ['internal_db'],
        confidence: 0.7,
        warnings: [],
      },
    });
  } catch (error) {
    console.error('Error in scenarios GET endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch scenarios' },
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { scenario_name, is_primary, description, meta } = body;

    if (!scenario_name) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['user_input'], confidence: 0, warnings: [] },
          error: { code: 'MISSING_PARAMS', message: 'scenario_name is required' },
        },
        { status: 400 }
      );
    }

    if (is_primary) {
      await db.query(
        `UPDATE re_deal_scenarios SET is_primary = FALSE WHERE deal_id = $1`,
        [id]
      );
    }

    const result = await db.query(
      `INSERT INTO re_deal_scenarios (deal_id, scenario_name, is_primary, description, meta)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, deal_id, scenario_name, is_primary, created_at`,
      [id, scenario_name, is_primary ?? false, description ?? null, meta ? JSON.stringify(meta) : null]
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
    console.error('Error in scenarios POST endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create scenario' },
      },
      { status: 500 }
    );
  }
}
