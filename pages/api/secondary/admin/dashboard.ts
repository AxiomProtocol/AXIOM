import type { NextApiRequest, NextApiResponse } from 'next';
import { getSecSession } from '../../../../server/services/secondary/auth';
import { getAdminDashboard } from '../../../../server/services/secondary/analytics';
import { getAuditTrail } from '../../../../server/services/secondary/audit';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getSecSession(req);
  if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (!session.roles.includes('admin') && !session.roles.includes('compliance_officer')) {
    return res.status(403).json({ success: false, error: 'Admin role required' });
  }

  try {
    const [dashboard, recentAudit, complianceFlags, investorStats] = await Promise.all([
      getAdminDashboard(),
      getAuditTrail({ limit: 20 }),
      pool.query(
        `SELECT cp.*, i.email, i.legal_name FROM sec_compliance_profiles cp
         JOIN sec_investors i ON i.id = cp.investor_id
         WHERE cp.aml_status = 'flagged' OR cp.sanctions_status = 'flagged'
         ORDER BY cp.updated_at DESC LIMIT 20`
      ),
      pool.query(
        `SELECT COUNT(*) as total_investors, COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended
         FROM sec_investors`
      ),
    ]);

    return res.status(200).json({
      success: true,
      dashboard,
      recentAudit,
      complianceFlags: complianceFlags.rows,
      investorStats: investorStats.rows[0],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
