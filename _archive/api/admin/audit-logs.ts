import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { isAdminWallet } from '../../../lib/admin/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const adminWallet = req.headers['x-admin-wallet'] as string;
  if (!isAdminWallet(adminWallet)) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { limit = '50', operatorId, adminFilter } = req.query;

  try {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (operatorId) {
      conditions.push(`target_operator_id = $${paramIndex++}`);
      params.push(operatorId);
    }

    if (adminFilter) {
      conditions.push(`admin_wallet = $${paramIndex++}`);
      params.push((adminFilter as string).toLowerCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitNum = Math.min(parseInt(limit as string) || 50, 200);

    const result = await pool.query(
      `SELECT id, admin_wallet, action, target_operator_id, details, created_at 
       FROM admin_audit_logs 
       ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex}`,
      [...params, limitNum]
    );

    res.status(200).json({ 
      logs: result.rows.map(row => ({
        id: row.id,
        adminWallet: row.admin_wallet,
        action: row.action,
        targetOperatorId: row.target_operator_id,
        details: row.details,
        createdAt: row.created_at,
      }))
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
}
