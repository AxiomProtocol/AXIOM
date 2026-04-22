import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { AuditLogger } from '../../../server/services/sentinel/AuditLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));
    const verify = req.query.verify === 'true';

    const dataResult = await pool.query(
      `SELECT * FROM sentinel_audit_log
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM sentinel_audit_log`
    );
    const total = parseInt(countResult.rows[0].total);

    const response: any = {
      logs: dataResult.rows,
      pagination: {
        limit,
        total,
      },
    };

    if (verify) {
      const auditLogger = new AuditLogger();
      const verification = await auditLogger.verify(limit);
      response.verification = verification;
    }

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[sentinel/audit] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
