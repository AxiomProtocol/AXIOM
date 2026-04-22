import { pool } from '../../server/db';

export type AuditAction = 
  | 'OPERATOR_ADVANCED'
  | 'OPERATOR_REJECTED'
  | 'OPERATOR_EMAIL_SENT';

export interface AuditLogEntry {
  adminWallet: string;
  action: AuditAction;
  targetOperatorId: string;
  details?: Record<string, any>;
}

export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO admin_audit_logs (admin_wallet, action, target_operator_id, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [entry.adminWallet, entry.action, entry.targetOperatorId, JSON.stringify(entry.details || {})]
    );
  } catch (error) {
    console.error('[AuditLog] Failed to log admin action:', error);
  }
}

export async function getAuditLogs(options?: { 
  adminWallet?: string; 
  targetOperatorId?: string; 
  limit?: number 
}): Promise<any[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (options?.adminWallet) {
    conditions.push(`admin_wallet = $${paramIndex++}`);
    params.push(options.adminWallet.toLowerCase());
  }

  if (options?.targetOperatorId) {
    conditions.push(`target_operator_id = $${paramIndex++}`);
    params.push(options.targetOperatorId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options?.limit || 100;

  const result = await pool.query(
    `SELECT * FROM admin_audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex}`,
    [...params, limit]
  );

  return result.rows;
}
