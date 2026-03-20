import { pool } from '../../db';

export async function auditLog(params: {
  actorId: string;
  actorType: 'investor' | 'issuer' | 'admin' | 'compliance_officer' | 'system' | 'broker';
  actorWallet?: string;
  objectType: 'wallet' | 'compliance_profile' | 'position' | 'listing' | 'bid' | 'matched_trade' | 'transfer_request' | 'approval_request' | 'settlement_instruction' | 'beneficial_ownership_record' | 'series' | 'offering';
  objectId: string;
  action: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO sec_audit_logs (actor_id, actor_type, actor_wallet, object_type, object_id, action, previous_state, new_state, metadata, ip_address)
       VALUES ($1, $2::sec_actor_type, $3, $4::sec_object_type, $5, $6, $7, $8, $9, $10)`,
      [
        params.actorId || null,
        params.actorType,
        params.actorWallet || null,
        params.objectType,
        params.objectId,
        params.action,
        params.previousState ? JSON.stringify(params.previousState) : null,
        params.newState ? JSON.stringify(params.newState) : null,
        params.metadata ? JSON.stringify(params.metadata) : null,
        params.ipAddress || null,
      ]
    );
  } catch (err) {
    console.error('[sec:audit] Log failed:', err);
  }
}

export async function getAuditTrail(params: {
  objectType?: string;
  objectId?: string;
  actorId?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.objectType) { conditions.push(`object_type = $${idx++}::sec_object_type`); values.push(params.objectType); }
  if (params.objectId) { conditions.push(`object_id = $${idx++}`); values.push(params.objectId); }
  if (params.actorId) { conditions.push(`actor_id = $${idx++}`); values.push(params.actorId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT * FROM sec_audit_logs ${where} ORDER BY occurred_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, params.limit || 50, params.offset || 0]
  );
  return result.rows;
}
