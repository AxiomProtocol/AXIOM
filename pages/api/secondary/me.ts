import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { getSecSession, ensureSecInvestor } from '../../../server/services/secondary/auth';
import { getUnreadNotifications } from '../../../server/services/secondary/notifications';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const session = await getSecSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });

    if (!session.investorId) {
      const investorId = await ensureSecInvestor(session.walletAddress);
      const investor = await pool.query(`SELECT * FROM sec_investors WHERE id = $1 LIMIT 1`, [investorId]);
      const compliance = await pool.query(`SELECT * FROM sec_compliance_profiles WHERE investor_id = $1 LIMIT 1`, [investorId]);
      return res.status(200).json({ success: true, investor: investor.rows[0], compliance: compliance.rows[0], roles: session.roles, walletAddress: session.walletAddress });
    }

    const [investorResult, complianceResult, walletsResult] = await Promise.all([
      pool.query(`SELECT * FROM sec_investors WHERE id = $1 LIMIT 1`, [session.investorId]),
      pool.query(`SELECT * FROM sec_compliance_profiles WHERE investor_id = $1 LIMIT 1`, [session.investorId]),
      pool.query(`SELECT id, wallet_address, chain_id, verification_status, is_primary, created_at FROM sec_wallets WHERE investor_id = $1 ORDER BY is_primary DESC`, [session.investorId]),
    ]);

    const notifications = await getUnreadNotifications(session.investorId);

    return res.status(200).json({
      success: true,
      investor: investorResult.rows[0],
      compliance: complianceResult.rows[0],
      wallets: walletsResult.rows,
      roles: session.roles,
      walletAddress: session.walletAddress,
      unreadNotificationCount: notifications.length,
    });
  }

  if (req.method === 'PATCH') {
    const session = await getSecSession(req);
    if (!session || !session.investorId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const { legalName, entityType, phone, jurisdiction } = req.body;
    const result = await pool.query(
      `UPDATE sec_investors SET legal_name = COALESCE($2, legal_name), entity_type = COALESCE($3::sec_entity_type, entity_type),
       phone = COALESCE($4, phone), jurisdiction = COALESCE($5, jurisdiction), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [session.investorId, legalName || null, entityType || null, phone || null, jurisdiction || null]
    );
    return res.status(200).json({ success: true, investor: result.rows[0] });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
