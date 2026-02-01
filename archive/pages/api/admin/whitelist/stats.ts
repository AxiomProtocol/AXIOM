import type { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../../lib/adminAuth';
import { pool } from '../../../../lib/db';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    try {
      const [totalRes, todayRes, weekRes, walletRes, countryRes, investmentRes, airdropPendingRes, airdropCompletedRes] = await Promise.all([
        client.query(`SELECT COUNT(*) FROM tge_notifications WHERE unsubscribed = false OR unsubscribed IS NULL`),
        client.query(`SELECT COUNT(*) FROM tge_notifications WHERE created_at >= CURRENT_DATE AND (unsubscribed = false OR unsubscribed IS NULL)`),
        client.query(`SELECT COUNT(*) FROM tge_notifications WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND (unsubscribed = false OR unsubscribed IS NULL)`),
        client.query(`SELECT COUNT(*) FROM tge_notifications WHERE wallet_address IS NOT NULL AND (unsubscribed = false OR unsubscribed IS NULL)`),
        client.query(`SELECT country, COUNT(*) as count FROM tge_notifications WHERE (unsubscribed = false OR unsubscribed IS NULL) GROUP BY country ORDER BY count DESC`),
        client.query(`SELECT investment_interest as range, COUNT(*) as count FROM tge_notifications WHERE (unsubscribed = false OR unsubscribed IS NULL) GROUP BY investment_interest ORDER BY count DESC`),
        client.query(`SELECT COUNT(*) FROM tge_notifications WHERE airdrop_status = 'pending'`),
        client.query(`SELECT COUNT(*) FROM tge_notifications WHERE airdrop_status = 'completed'`)
      ]);

      res.status(200).json({
        total: parseInt(totalRes.rows[0].count),
        today: parseInt(todayRes.rows[0].count),
        thisWeek: parseInt(weekRes.rows[0].count),
        withWallet: parseInt(walletRes.rows[0].count),
        byCountry: countryRes.rows,
        byInvestment: investmentRes.rows,
        airdropPending: parseInt(airdropPendingRes.rows[0].count),
        airdropCompleted: parseInt(airdropCompletedRes.rows[0].count)
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching whitelist stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

export default withAdminAuth(handler);
