import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { insuranceClaims } from '../../../shared/schema';
import { desc, eq, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = '10', status = 'all' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 10, 50);

    let claims;
    if (status !== 'all') {
      claims = await db.select()
        .from(insuranceClaims)
        .where(eq(insuranceClaims.status, status as string))
        .orderBy(desc(insuranceClaims.submittedAt))
        .limit(limitNum);
    } else {
      claims = await db.select()
        .from(insuranceClaims)
        .orderBy(desc(insuranceClaims.submittedAt))
        .limit(limitNum);
    }

    const statsResult = await db.select({
      total: sql<number>`count(*)`,
      approved: sql<number>`count(*) filter (where status = 'approved' or status = 'paid')`,
      pending: sql<number>`count(*) filter (where status = 'pending')`,
      totalPaid: sql<number>`coalesce(sum(claim_amount) filter (where status = 'paid'), 0)`
    }).from(insuranceClaims);

    const stats = statsResult[0] || { total: 0, approved: 0, pending: 0, totalPaid: 0 };

    return res.status(200).json({
      success: true,
      claims: claims.map((c: InferSelectModel<typeof insuranceClaims>) => ({
        id: c.id,
        claimantAddress: c.claimantAddress,
        susuPoolName: c.susuPoolName || `SUSU Pool #${c.susuPoolId}`,
        claimAmount: parseFloat(c.claimAmount as string) || 0,
        claimReason: c.claimReason,
        status: c.status,
        submittedAt: c.submittedAt?.toISOString(),
        resolvedAt: c.resolvedAt?.toISOString(),
        txHash: c.txHash
      })),
      stats: {
        total: Number(stats.total) || 0,
        approved: Number(stats.approved) || 0,
        pending: Number(stats.pending) || 0,
        totalPaid: Number(stats.totalPaid) || 0
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
