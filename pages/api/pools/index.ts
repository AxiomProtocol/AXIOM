import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const pools = await db.execute(sql`
      SELECT 
        pp.id,
        pp.name,
        pp.purpose,
        pp.description,
        pp.status,
        pp.target_amount_axusd,
        pp.current_amount_axusd,
        pp.min_commit_axusd,
        pp.max_commit_axusd,
        pp.member_limit,
        pp.current_member_count,
        pp.start_at,
        pp.end_at,
        pp.land_candidate_id,
        lc.name as land_candidate_name,
        lc.location as land_candidate_location,
        lc.acreage as land_candidate_acreage
      FROM purpose_pools pp
      LEFT JOIN land_candidates lc ON pp.land_candidate_id = lc.id
      WHERE pp.status != 'draft'
      ORDER BY pp.created_at DESC
    `);

    const formattedPools = pools.rows.map((pool: any) => ({
      id: pool.id,
      name: pool.name,
      purpose: pool.purpose,
      description: pool.description,
      status: pool.status,
      targetAmountAxusd: pool.target_amount_axusd,
      currentAmountAxusd: pool.current_amount_axusd,
      minCommitAxusd: pool.min_commit_axusd,
      maxCommitAxusd: pool.max_commit_axusd,
      memberLimit: pool.member_limit,
      currentMemberCount: pool.current_member_count,
      startAt: pool.start_at,
      endAt: pool.end_at,
      landCandidate: pool.land_candidate_name ? {
        name: pool.land_candidate_name,
        location: pool.land_candidate_location,
        acreage: pool.land_candidate_acreage?.toString()
      } : null
    }));

    return res.status(200).json({
      success: true,
      data: formattedPools
    });
  } catch (error) {
    console.error('Pools fetch error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch pools' });
  }
}
