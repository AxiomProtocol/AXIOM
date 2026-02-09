import crypto from 'crypto';
import { pool } from '../../db';

export class AuditLogger {
  private lastHash: string = '0'.repeat(64);

  async initialize(): Promise<void> {
    const result = await pool.query(
      `SELECT row_hash FROM sentinel_audit_log ORDER BY created_at DESC LIMIT 1`
    );
    if (result.rows.length > 0) {
      this.lastHash = result.rows[0].row_hash;
    }
  }

  async log(
    actor: string,
    action: string,
    resourceType: string,
    resourceId: string | null,
    payload: any
  ): Promise<{ id: string; rowHash: string }> {
    const prevHash = this.lastHash;
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    const rowHash = crypto
      .createHash('sha256')
      .update(prevHash + canonical)
      .digest('hex');

    const result = await pool.query(
      `INSERT INTO sentinel_audit_log (id, created_at, actor, action, resource_type, resource_id, payload_json, prev_hash, row_hash)
       VALUES (gen_random_uuid(), NOW(), $1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [actor, action, resourceType, resourceId, payload, prevHash, rowHash]
    );

    this.lastHash = rowHash;
    return { id: result.rows[0].id, rowHash };
  }

  async verify(limit: number = 100): Promise<{ valid: boolean; checked: number; brokenAt?: string }> {
    const result = await pool.query(
      `SELECT id, prev_hash, row_hash, payload_json FROM sentinel_audit_log ORDER BY created_at ASC LIMIT $1`,
      [limit]
    );

    let expectedPrev = '0'.repeat(64);
    for (const row of result.rows) {
      if (row.prev_hash !== expectedPrev) {
        return { valid: false, checked: result.rows.indexOf(row), brokenAt: row.id };
      }
      
      const canonical = JSON.stringify(row.payload_json, Object.keys(row.payload_json).sort());
      const computed = crypto
        .createHash('sha256')
        .update(row.prev_hash + canonical)
        .digest('hex');

      if (computed !== row.row_hash) {
        return { valid: false, checked: result.rows.indexOf(row), brokenAt: row.id };
      }

      expectedPrev = row.row_hash;
    }

    return { valid: true, checked: result.rows.length };
  }

  getLastHash(): string {
    return this.lastHash;
  }
}
