import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const balanceResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_balance_axusd), 0) as total
      FROM treasuries WHERE is_active = true
    `);

    const depositsResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount_axusd), 0) as total
      FROM treasury_transactions WHERE transaction_type = 'deposit'
    `);

    const disbursementsResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount_axusd), 0) as total
      FROM treasury_transactions WHERE transaction_type = 'disbursement'
    `);

    const activeProposalsResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM governance_proposals WHERE status = 'voting'
    `);

    const executedProposalsResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM governance_proposals WHERE status = 'executed'
    `);

    return res.status(200).json({
      success: true,
      data: {
        totalBalance: balanceResult.rows[0]?.total || '0',
        totalDeposits: depositsResult.rows[0]?.total || '0',
        totalDisbursements: disbursementsResult.rows[0]?.total || '0',
        activeProposals: parseInt(activeProposalsResult.rows[0]?.count as string || '0'),
        executedProposals: parseInt(executedProposalsResult.rows[0]?.count as string || '0')
      }
    });
  } catch (error) {
    console.error('Treasury stats error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch treasury stats' });
  }
}
