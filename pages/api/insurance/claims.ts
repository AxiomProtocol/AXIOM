import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = '10', status = 'all' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 10, 50);

    let claimsQuery = `
      SELECT id, claimant_address, susu_pool_id, susu_pool_name, claim_amount, 
             claim_reason, status, tx_hash, submitted_at, resolved_at
      FROM insurance_claims
    `;
    const params: any[] = [];

    if (status !== 'all') {
      claimsQuery += ` WHERE status = $1`;
      params.push(status);
    }

    claimsQuery += ` ORDER BY submitted_at DESC LIMIT $${params.length + 1}`;
    params.push(limitNum);

    const claimsResult = await pool.query(claimsQuery, params);

    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved' OR status = 'paid') as approved,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COALESCE(SUM(claim_amount) FILTER (WHERE status = 'paid'), 0) as total_paid
      FROM insurance_claims
    `);

    const stats = statsResult.rows[0] || { total: 0, approved: 0, pending: 0, total_paid: 0 };

    return res.status(200).json({
      success: true,
      claims: claimsResult.rows.map((c: any) => ({
        id: c.id,
        claimantAddress: c.claimant_address,
        susuPoolName: c.susu_pool_name || `SUSU Pool #${c.susu_pool_id}`,
        claimAmount: parseFloat(c.claim_amount) || 0,
        claimReason: c.claim_reason,
        status: c.status,
        submittedAt: c.submitted_at?.toISOString(),
        resolvedAt: c.resolved_at?.toISOString(),
        txHash: c.tx_hash
      })),
      stats: {
        total: Number(stats.total) || 0,
        approved: Number(stats.approved) || 0,
        pending: Number(stats.pending) || 0,
        totalPaid: Number(stats.total_paid) || 0
      }
    });
  } catch (error) {
    console.error('Insurance claims error:', error);
    return res.status(200).json({
      success: true,
      claims: [],
      stats: { total: 0, approved: 0, pending: 0, totalPaid: 0 }
    });
  }
}
