import { createHash } from 'crypto';
import { pool } from '../db';

function canonicalJson(obj: unknown): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'number' || typeof obj === 'boolean') return JSON.stringify(obj);
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }
  if (typeof obj === 'object') {
    const sorted = Object.keys(obj as Record<string, unknown>).sort();
    const pairs = sorted.map(
      (k) => JSON.stringify(k) + ':' + canonicalJson((obj as Record<string, unknown>)[k])
    );
    return '{' + pairs.join(',') + '}';
  }
  return JSON.stringify(obj);
}

function computeHash(payload: unknown, prevHash: string | null): string {
  const canonical = canonicalJson(payload);
  const input = prevHash ? prevHash + '|' + canonical : canonical;
  return createHash('sha256').update(input).digest('hex');
}

async function getLastHash(entityType: string, entityId: string): Promise<string | null> {
  const result = await pool.query(
    `SELECT hash FROM gef_audit_hash_chain
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [entityType, entityId]
  );
  return result.rows.length > 0 ? result.rows[0].hash : null;
}

export async function appendAuditEvent(
  entityType: string,
  entityId: string,
  eventType: string,
  payloadJson: Record<string, unknown>
): Promise<{ eventId: string; hash: string }> {
  const prevHash = await getLastHash(entityType, entityId);
  const hash = computeHash({ entityType, entityId, eventType, payload: payloadJson }, prevHash);

  const result = await pool.query(
    `INSERT INTO gef_audit_hash_chain (entity_type, entity_id, event_type, payload_json, prev_hash, hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING event_id`,
    [entityType, entityId, eventType, JSON.stringify(payloadJson), prevHash, hash]
  );

  return { eventId: result.rows[0].event_id, hash };
}

export async function appendAuditEventInTransaction(
  client: any,
  entityType: string,
  entityId: string,
  eventType: string,
  payloadJson: Record<string, unknown>
): Promise<{ eventId: string; hash: string }> {
  const prevResult = await client.query(
    `SELECT hash FROM gef_audit_hash_chain
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [entityType, entityId]
  );
  const prevHash = prevResult.rows.length > 0 ? prevResult.rows[0].hash : null;
  const hash = computeHash({ entityType, entityId, eventType, payload: payloadJson }, prevHash);

  const result = await client.query(
    `INSERT INTO gef_audit_hash_chain (entity_type, entity_id, event_type, payload_json, prev_hash, hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING event_id`,
    [entityType, entityId, eventType, JSON.stringify(payloadJson), prevHash, hash]
  );

  return { eventId: result.rows[0].event_id, hash };
}

export async function verifyChainIntegrity(
  entityType: string,
  entityId: string
): Promise<{ valid: boolean; totalEvents: number; brokenAt?: string }> {
  const result = await pool.query(
    `SELECT event_id, entity_type, entity_id, event_type, payload_json, prev_hash, hash, created_at
     FROM gef_audit_hash_chain
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at ASC`,
    [entityType, entityId]
  );

  if (result.rows.length === 0) return { valid: true, totalEvents: 0 };

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    const expectedPrev = i === 0 ? null : result.rows[i - 1].hash;
    if (row.prev_hash !== expectedPrev) {
      return { valid: false, totalEvents: result.rows.length, brokenAt: row.event_id };
    }
    const recomputed = computeHash(
      { entityType: row.entity_type, entityId: row.entity_id, eventType: row.event_type, payload: row.payload_json },
      row.prev_hash
    );
    if (recomputed !== row.hash) {
      return { valid: false, totalEvents: result.rows.length, brokenAt: row.event_id };
    }
  }

  return { valid: true, totalEvents: result.rows.length };
}

export { computeHash, canonicalJson };
