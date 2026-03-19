/**
 * Axiom Matrix Coordination Layer
 *
 * Structured, event-driven coordination across all six intelligence layers.
 * Persists room records and event links to DB regardless of Matrix configuration.
 * When MATRIX_HOMESERVER_URL + MATRIX_ACCESS_TOKEN are set, emits real events.
 * Fails gracefully in all cases — never blocks a workflow.
 */

import crypto from 'crypto';
import { pool } from '../../../lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MatrixEntityType =
  | 'deal'
  | 'inspection'
  | 'project_outcome'
  | 'offering'
  | 'asset';

export type AxiomEventType =
  | 'axiom.deal.created'
  | 'axiom.inspection.started'
  | 'axiom.inspection.submitted'
  | 'axiom.scope.generated'
  | 'axiom.execution.started'
  | 'axiom.execution.updated'
  | 'axiom.outcome.submitted'
  | 'axiom.outcome.verified'
  | 'axiom.outcome.rejected'
  | 'axiom.cost_signal.created'
  | 'axiom.offering.created'
  | 'axiom.commitment.submitted'
  | 'axiom.capital.funded'
  | 'axiom.distribution.sent';

export interface MatrixStructuredEvent {
  eventType: AxiomEventType;
  payload: Record<string, unknown>;
  actor?: string | null;
}

export interface EnsureMatrixRoomInput {
  entityType: MatrixEntityType;
  entityId: string;
  name: string;
  topic?: string;
  createdBy?: string | null;
}

export interface MatrixRoomRecord {
  id: string;
  matrixRoomId: string;
  entityType: string;
  entityId: string;
  configured: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function matrixConfig() {
  return {
    enabled: Boolean(process.env.MATRIX_HOMESERVER_URL && process.env.MATRIX_ACCESS_TOKEN),
    homeserverUrl: process.env.MATRIX_HOMESERVER_URL || '',
    accessToken: process.env.MATRIX_ACCESS_TOKEN || '',
    userId: process.env.MATRIX_USER_ID || '@axiom:localhost',
  };
}

function syntheticRoomId(entityType: string, entityId: string): string {
  return `axiom-unconfigured:${entityType}:${entityId}`;
}

// ---------------------------------------------------------------------------
// Arbitrum Readiness — Event Hashing
// ---------------------------------------------------------------------------

/**
 * Create a deterministic SHA-256 hash of a structured event payload.
 * Used as a future reference anchor for on-chain verification.
 */
export function createEventHash(eventPayload: Record<string, unknown>): string {
  const canonical = JSON.stringify(eventPayload, Object.keys(eventPayload).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Store an event hash reference against an entity (future Arbitrum anchor).
 * Currently persists to DB only — on-chain write is a future phase.
 */
export async function storeEventHashReference(
  entityId: string,
  entityType: string,
  hash: string,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO matrix_event_links (room_id, entity_type, entity_id, event_type, matrix_event_id, payload, created_at)
       SELECT mr.id, $2, $3::uuid, 'arbitrum.hash.reference', $4,
              jsonb_build_object('hash', $4, 'anchored', false), NOW()
       FROM matrix_rooms mr
       WHERE mr.entity_id = $3::uuid AND mr.entity_type = $2
       LIMIT 1`,
      [null, entityType, entityId, hash],
    );
  } catch (err: any) {
    console.warn('[matrix] storeEventHashReference non-fatal:', err?.message);
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers (real Matrix calls when configured)
// ---------------------------------------------------------------------------

async function matrixPost(path: string, body: Record<string, unknown>): Promise<string | null> {
  const cfg = matrixConfig();
  if (!cfg.enabled) return null;
  try {
    const res = await fetch(`${cfg.homeserverUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as any;
    return data?.room_id || data?.event_id || null;
  } catch (err: any) {
    console.warn('[matrix] HTTP call non-fatal:', path, err?.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function upsertMatrixRoom(
  entityType: string,
  entityId: string,
  matrixRoomId: string,
  configured: boolean,
  meta?: Record<string, unknown>,
): Promise<string | null> {
  try {
    const result = await pool.query(
      `INSERT INTO matrix_rooms (matrix_room_id, entity_type, entity_id, configured, meta, created_at)
       VALUES ($1, $2, $3::uuid, $4, $5, NOW())
       ON CONFLICT (matrix_room_id) DO UPDATE
         SET configured = EXCLUDED.configured,
             meta = COALESCE(EXCLUDED.meta, matrix_rooms.meta)
       RETURNING id`,
      [matrixRoomId, entityType, entityId, configured, meta ? JSON.stringify(meta) : null],
    );
    return result.rows[0]?.id || null;
  } catch (err: any) {
    console.warn('[matrix] upsertMatrixRoom non-fatal:', err?.message);
    return null;
  }
}

async function insertEventLink(
  roomDbId: string,
  entityType: string,
  entityId: string,
  eventType: string,
  matrixEventId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO matrix_event_links (room_id, entity_type, entity_id, event_type, matrix_event_id, payload, created_at)
       VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, NOW())`,
      [roomDbId, entityType, entityId, eventType, matrixEventId, JSON.stringify(payload)],
    );
  } catch (err: any) {
    console.warn('[matrix] insertEventLink non-fatal:', err?.message);
  }
}

// ---------------------------------------------------------------------------
// Core: ensureRoom
// ---------------------------------------------------------------------------

export async function ensureMatrixRoom(
  input: EnsureMatrixRoomInput,
): Promise<{ roomId: string; configured: boolean; dbRoomId: string | null }> {
  const cfg = matrixConfig();

  // Check if room already exists for this entity
  try {
    const existing = await pool.query(
      `SELECT id, matrix_room_id, configured FROM matrix_rooms
       WHERE entity_type = $1 AND entity_id = $2::uuid
       LIMIT 1`,
      [input.entityType, input.entityId],
    );
    if (existing.rows[0]) {
      return {
        roomId: existing.rows[0].matrix_room_id,
        configured: existing.rows[0].configured,
        dbRoomId: existing.rows[0].id,
      };
    }
  } catch (err: any) {
    console.warn('[matrix] existing room check non-fatal:', err?.message);
  }

  let matrixRoomId: string;
  let configured = false;

  if (cfg.enabled) {
    const realRoomId = await matrixPost('/_matrix/client/v3/createRoom', {
      visibility: 'private',
      name: input.name,
      topic: input.topic || '',
      creation_content: {
        'axiom.entity_type': input.entityType,
        'axiom.entity_id': input.entityId,
      },
    });
    matrixRoomId = realRoomId || syntheticRoomId(input.entityType, input.entityId);
    configured = Boolean(realRoomId);
  } else {
    matrixRoomId = syntheticRoomId(input.entityType, input.entityId);
  }

  const dbRoomId = await upsertMatrixRoom(
    input.entityType,
    input.entityId,
    matrixRoomId,
    configured,
    { name: input.name, createdBy: input.createdBy },
  );

  return { roomId: matrixRoomId, configured, dbRoomId };
}

// ---------------------------------------------------------------------------
// Core: postStructuredEvent
// ---------------------------------------------------------------------------

export async function postStructuredMatrixEvent(
  roomId: string,
  event: MatrixStructuredEvent,
  entityType: string,
  entityId: string,
): Promise<{ sent: boolean; eventId: string | null; hash: string }> {
  const cfg = matrixConfig();
  const hash = createEventHash({
    eventType: event.eventType,
    entityId,
    entityType,
    timestamp: new Date().toISOString(),
    ...event.payload,
  });

  const fullPayload = {
    ...event.payload,
    _axiom_event_type: event.eventType,
    _actor: event.actor || null,
    _entity_id: entityId,
    _entity_type: entityType,
    _timestamp: new Date().toISOString(),
    _hash: hash,
  };

  let matrixEventId: string | null = null;
  let sent = false;

  if (cfg.enabled && !roomId.startsWith('axiom-unconfigured:')) {
    const txnId = `axiom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    matrixEventId = await matrixPost(
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/${event.eventType}/${txnId}`,
      fullPayload,
    );
    sent = Boolean(matrixEventId);
  }

  // Persist to DB regardless
  try {
    const roomResult = await pool.query(
      `SELECT id FROM matrix_rooms WHERE entity_id = $1::uuid AND entity_type = $2 LIMIT 1`,
      [entityId, entityType],
    );
    const dbRoomId = roomResult.rows[0]?.id;
    if (dbRoomId) {
      await insertEventLink(dbRoomId, entityType, entityId, event.eventType, matrixEventId, fullPayload);
    }
  } catch (err: any) {
    console.warn('[matrix] event DB persist non-fatal:', err?.message);
  }

  return { sent, eventId: matrixEventId, hash };
}

// ---------------------------------------------------------------------------
// Entity-specific room helpers
// ---------------------------------------------------------------------------

export async function ensureMatrixRoomForDeal(dealId: string, dealName?: string, createdBy?: string | null) {
  return ensureMatrixRoom({
    entityType: 'deal',
    entityId: dealId,
    name: `Deal Room — ${dealName || dealId.slice(0, 8)}`,
    topic: 'Axiom deal coordination, underwriting, and execution tracking.',
    createdBy,
  });
}

export async function ensureMatrixRoomForInspection(
  inspectionSessionId: string,
  sessionName?: string,
  createdBy?: string | null,
) {
  return ensureMatrixRoom({
    entityType: 'inspection',
    entityId: inspectionSessionId,
    name: `Inspection Room — ${sessionName || inspectionSessionId.slice(0, 8)}`,
    topic: 'Field intelligence capture, unit walk matrix, and scope generation.',
    createdBy,
  });
}

export async function ensureMatrixRoomForProjectOutcome(
  outcomeId: string,
  createdBy?: string | null,
) {
  return ensureMatrixRoom({
    entityType: 'project_outcome',
    entityId: outcomeId,
    name: `Verification Room — ${outcomeId.slice(0, 8)}`,
    topic: 'Verified execution outcome — predicted vs actual, reviewer coordination.',
    createdBy,
  });
}

export async function ensureMatrixRoomForOffering(
  offeringId: string,
  offeringName?: string,
  createdBy?: string | null,
) {
  return ensureMatrixRoom({
    entityType: 'offering',
    entityId: offeringId,
    name: `Capital Room — ${offeringName || offeringId.slice(0, 8)}`,
    topic: 'Capital formation, investor commitments, and funding coordination.',
    createdBy,
  });
}

// ---------------------------------------------------------------------------
// Query: get room by entity
// ---------------------------------------------------------------------------

export async function getRoomByEntity(
  entityType: string,
  entityId: string,
): Promise<MatrixRoomRecord | null> {
  try {
    const result = await pool.query(
      `SELECT id, matrix_room_id, entity_type, entity_id, configured, created_at
       FROM matrix_rooms
       WHERE entity_type = $1 AND entity_id = $2::uuid
       LIMIT 1`,
      [entityType, entityId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      matrixRoomId: row.matrix_room_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      configured: row.configured,
      createdAt: row.created_at,
    };
  } catch (err: any) {
    console.warn('[matrix] getRoomByEntity non-fatal:', err?.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Query: get coordination events for entity
// ---------------------------------------------------------------------------

export async function getCoordinationEvents(
  entityId: string,
  entityType?: string,
  limit = 50,
): Promise<Array<{
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  matrixEventId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}>> {
  try {
    const params: unknown[] = [entityId, limit];
    const typeFilter = entityType ? 'AND mel.entity_type = $3' : '';
    if (entityType) params.splice(1, 0, entityType);

    const query = `
      SELECT mel.id, mel.event_type, mel.entity_type, mel.entity_id,
             mel.matrix_event_id, mel.payload, mel.created_at
      FROM matrix_event_links mel
      WHERE mel.entity_id = $1::uuid
      ${typeFilter}
      ORDER BY mel.created_at DESC
      LIMIT $${params.length}
    `;
    const result = await pool.query(query, params);
    return result.rows.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      entityType: r.entity_type,
      entityId: r.entity_id,
      matrixEventId: r.matrix_event_id,
      payload: r.payload || {},
      createdAt: r.created_at,
    }));
  } catch (err: any) {
    console.warn('[matrix] getCoordinationEvents non-fatal:', err?.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Invite
// ---------------------------------------------------------------------------

export async function inviteUsersToMatrixRoom(
  roomId: string,
  userIds: string[],
): Promise<{ invited: number }> {
  const cfg = matrixConfig();
  if (!cfg.enabled || roomId.startsWith('axiom-unconfigured:')) {
    return { invited: 0 };
  }

  let invited = 0;
  for (const userId of userIds) {
    try {
      await matrixPost(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/invite`, {
        user_id: userId,
      });
      invited++;
    } catch (_) {}
  }
  return { invited };
}
