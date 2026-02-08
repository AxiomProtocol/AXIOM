import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const fundBalanceResult = await db.execute(sql`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM savings_accounts WHERE type = 'insurance_fund'
    `);

    const claimsResult = await db.execute(sql`
      SELECT COUNT(*) as total_claims,
             COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_claims,
             COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_claims,
             COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid
      FROM insurance_claims
    `);

    const activePoliciesResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM insurance_policies WHERE status = 'active'
    `);

    return res.status(200).json({
      success: true,
      data: {
        totalFundBalance: fundBalanceResult.rows[0]?.total || '0',
        totalClaims: parseInt(claimsResult.rows[0]?.total_claims as string || '0'),
        approvedClaims: parseInt(claimsResult.rows[0]?.approved_claims as string || '0'),
        pendingClaims: parseInt(claimsResult.rows[0]?.pending_claims as string || '0'),
        totalClaimsPaid: claimsResult.rows[0]?.total_paid || '0',
        activePolicies: parseInt(activePoliciesResult.rows[0]?.count as string || '0'),
        coverageRatio: 0.85,
        premiumRate: 0.02,
        claimApprovalRate: 0.92,
        currency: 'AXUSD'
      }
    });
  } catch (error) {
    console.error('Insurance stats error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch insurance stats' });
  }
}
