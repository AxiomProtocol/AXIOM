import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';
import { getSIWESession } from '../../../lib/middleware/siweAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ success: false, code: 'SIWE_AUTH_REQUIRED', error: 'Wallet authentication required.' });
  }

  const {
    entityId,
    entityType,
    eventType,
    limit: limitParam = '50',
    offset: offsetParam = '0',
  } = req.query;

  const limit = Math.min(Number(limitParam) || 50, 200);
  const offset = Number(offsetParam) || 0;

  try {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (entityId && typeof entityId === 'string') {
      params.push(entityId);
      conditions.push(`mel.entity_id = $${params.length}::uuid`);
    }

    if (entityType && typeof entityType === 'string') {
      params.push(entityType);
      conditions.push(`mel.entity_type = $${params.length}`);
    }

    if (eventType && typeof eventType === 'string') {
      params.push(eventType);
      conditions.push(`mel.event_type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);

    const result = await pool.query(
      `SELECT
         mel.id,
         mel.event_type,
         mel.entity_type,
         mel.entity_id,
         mel.matrix_event_id,
         mel.payload,
         mel.created_at,
         mr.matrix_room_id,
         mr.configured AS room_configured
       FROM matrix_event_links mel
       LEFT JOIN matrix_rooms mr ON mr.id = mel.room_id
       ${whereClause}
       ORDER BY mel.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM matrix_event_links mel ${whereClause}`,
      params.slice(0, params.length - 2),
    );

    const roomsResult = await pool.query(
      `SELECT id, matrix_room_id, entity_type, entity_id, configured, meta, created_at
       FROM matrix_rooms
       ORDER BY created_at DESC
       LIMIT 100`,
    );

    return res.status(200).json({
      success: true,
      events: result.rows.map((r) => ({
        id: r.id,
        eventType: r.event_type,
        entityType: r.entity_type,
        entityId: r.entity_id,
        matrixEventId: r.matrix_event_id,
        matrixRoomId: r.matrix_room_id,
        roomConfigured: r.room_configured,
        payload: r.payload || {},
        createdAt: r.created_at,
      })),
      rooms: roomsResult.rows.map((r) => ({
        id: r.id,
        matrixRoomId: r.matrix_room_id,
        entityType: r.entity_type,
        entityId: r.entity_id,
        configured: r.configured,
        meta: r.meta || {},
        createdAt: r.created_at,
      })),
      total: Number(countResult.rows[0]?.total || 0),
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('[matrix/events] error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
