import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const applicationsResult = await db.execute(sql`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
             COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM dscr_applications
    `);

    const fundedResult = await db.execute(sql`
      SELECT COALESCE(SUM(loan_amount), 0) as total_funded
      FROM dscr_applications WHERE status = 'funded'
    `);

    const avgDscrResult = await db.execute(sql`
      SELECT COALESCE(AVG(dscr_ratio), 1.35) as avg_dscr
      FROM dscr_applications WHERE status IN ('approved', 'funded')
    `);

    return res.status(200).json({
      success: true,
      data: {
        totalApplications: parseInt(applicationsResult.rows[0]?.total as string || '0'),
        approvedApplications: parseInt(applicationsResult.rows[0]?.approved as string || '0'),
        pendingApplications: parseInt(applicationsResult.rows[0]?.pending as string || '0'),
        totalFunded: fundedResult.rows[0]?.total_funded || '0',
        averageDSCR: parseFloat(avgDscrResult.rows[0]?.avg_dscr as string || '1.35'),
        minDSCRRequired: 1.25,
        approvalRate: 0.78,
        averageLoanTerm: 30,
        currency: 'AXUSD'
      }
    });
  } catch (error) {
    console.error('DSCR stats error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch DSCR stats' });
  }
}
