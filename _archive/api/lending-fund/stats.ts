import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const totalPoolResult = await db.execute(sql`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM savings_accounts WHERE type = 'lending_pool'
    `);

    const activeLoansResult = await db.execute(sql`
      SELECT COUNT(*) as count, COALESCE(SUM(target_amount), 0) as total_amount
      FROM crowdfunding_campaigns WHERE status = 'active'
    `);

    const fundedResult = await db.execute(sql`
      SELECT COALESCE(SUM(raised_amount), 0) as total_raised
      FROM crowdfunding_campaigns WHERE status = 'funded'
    `);

    return res.status(200).json({
      success: true,
      data: {
        totalPoolSize: totalPoolResult.rows[0]?.total || '0',
        activeLoans: parseInt(activeLoansResult.rows[0]?.count as string || '0'),
        totalLentAmount: fundedResult.rows[0]?.total_raised || '0',
        activeCampaignTarget: activeLoansResult.rows[0]?.total_amount || '0',
        averageInterestRate: 8.5,
        utilizationRate: 0.65,
        defaultRate: 0.02,
        currency: 'AXUSD'
      }
    });
  } catch (error) {
    console.error('Lending fund stats error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch lending fund stats' });
  }
}
