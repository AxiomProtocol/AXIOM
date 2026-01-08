import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const totalResult = await db.execute(sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(acreage), 0) as total_acreage
      FROM land_candidates
      WHERE stage != 'archived'
    `);

    const underReviewResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM land_candidates WHERE stage = 'under_review'
    `);

    const readyForVoteResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM land_candidates WHERE stage = 'ready_for_vote'
    `);

    const acquiredResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM land_candidates WHERE stage = 'acquired'
    `);

    return res.status(200).json({
      success: true,
      data: {
        totalCandidates: parseInt(totalResult.rows[0]?.count as string || '0'),
        totalAcreage: Math.round(parseFloat(totalResult.rows[0]?.total_acreage as string || '0')),
        underReview: parseInt(underReviewResult.rows[0]?.count as string || '0'),
        readyForVote: parseInt(readyForVoteResult.rows[0]?.count as string || '0'),
        acquired: parseInt(acquiredResult.rows[0]?.count as string || '0')
      }
    });
  } catch (error) {
    console.error('Land stats error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch land stats' });
  }
}
