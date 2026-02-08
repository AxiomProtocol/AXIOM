import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      return res.status(200).json({
        success: true,
        data: {
          membershipStatus: null,
          axusdBalance: '0',
          axusdCommitted: '0',
          axusdAvailable: '0',
          commitments: [],
          votingHistory: []
        }
      });
    }

    const membershipResult = await db.execute(sql`
      SELECT membership_status FROM membership_records WHERE user_id = ${userId} LIMIT 1
    `);

    const balanceResult = await db.execute(sql`
      SELECT axusd_balance, axusd_committed, axusd_available
      FROM member_balances WHERE user_id = ${userId} LIMIT 1
    `);

    const commitmentsResult = await db.execute(sql`
      SELECT pc.pool_id, pp.name as pool_name, pc.amount_axusd, pc.status
      FROM pool_commitments pc
      LEFT JOIN purpose_pools pp ON pc.pool_id = pp.id
      WHERE pc.user_id = ${userId}
    `);

    const votesResult = await db.execute(sql`
      SELECT gv.proposal_id, gp.title, gv.vote, gv.created_at
      FROM governance_votes gv
      LEFT JOIN governance_proposals gp ON gv.proposal_id = gp.id
      WHERE gv.user_id = ${userId}
      ORDER BY gv.created_at DESC
    `);

    const membership = membershipResult.rows[0];
    const balance = balanceResult.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        membershipStatus: membership?.membership_status || null,
        axusdBalance: balance?.axusd_balance || '0',
        axusdCommitted: balance?.axusd_committed || '0',
        axusdAvailable: balance?.axusd_available || '0',
        commitments: commitmentsResult.rows.map((c: any) => ({
          poolId: c.pool_id,
          poolName: c.pool_name || 'Unknown Pool',
          amount: c.amount_axusd,
          status: c.status
        })),
        votingHistory: votesResult.rows.map((v: any) => ({
          proposalId: v.proposal_id,
          title: v.title || 'Unknown Proposal',
          vote: v.vote,
          createdAt: v.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Membership status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch membership status' });
  }
}
