import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function nowIso(): string {
  return new Date().toISOString();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { decided_by, decision, rationale, snapshot_metrics } = body;

    if (!decision) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['user_input'], confidence: 0, warnings: [] },
          error: { code: 'MISSING_PARAMS', message: 'decision is required' },
        },
        { status: 400 }
      );
    }

    const dealCheck = await db.query(`SELECT id FROM re_deals WHERE id = $1`, [id]);
    if (dealCheck.rows.length === 0) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['internal_db'], confidence: 0, warnings: [] },
          error: { code: 'NOT_FOUND', message: 'Deal not found' },
        },
        { status: 404 }
      );
    }

    const result = await db.query(
      `INSERT INTO re_decision_log (deal_id, decided_by, decision, rationale, snapshot_metrics)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, deal_id, decided_by, decision, rationale, decided_at, created_at`,
      [
        id, decided_by ?? null, decision, rationale ?? null,
        snapshot_metrics ? JSON.stringify(snapshot_metrics) : null,
      ]
    );

    const statusMap: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      close: 'closed',
      archive: 'archived',
    };

    const newStatus = statusMap[decision.toLowerCase()];
    if (newStatus) {
      await db.query(
        `UPDATE re_deals SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newStatus, id]
      );
    }

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
    console.error('Error in decisions POST endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to append decision' },
      },
      { status: 500 }
    );
  }
}
