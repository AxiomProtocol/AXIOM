import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const proposals = await db.execute(sql`
      SELECT 
        gp.id,
        gp.pool_id,
        pp.name as pool_name,
        gp.title,
        gp.description,
        gp.amount_axusd,
        gp.category,
        gp.status,
        gp.voting_starts_at,
        gp.voting_ends_at,
        gp.total_votes,
        gp.yes_votes,
        gp.no_votes,
        gp.abstain_votes,
        gp.created_at
      FROM governance_proposals gp
      LEFT JOIN purpose_pools pp ON gp.pool_id = pp.id
      WHERE gp.status != 'draft'
      ORDER BY gp.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: proposals.rows.map((p: any) => ({
        id: p.id,
        poolId: p.pool_id,
        poolName: p.pool_name || 'General Treasury',
        title: p.title,
        description: p.description,
        amountAxusd: p.amount_axusd,
        category: p.category,
        status: p.status,
        votingStartsAt: p.voting_starts_at,
        votingEndsAt: p.voting_ends_at,
        totalVotes: p.total_votes,
        yesVotes: p.yes_votes,
        noVotes: p.no_votes,
        abstainVotes: p.abstain_votes,
        createdAt: p.created_at
      }))
    });
  } catch (error) {
    console.error('Proposals fetch error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch proposals' });
  }
}
