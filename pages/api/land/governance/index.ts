import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'land_governance_proposals'
      ) as exists
    `);

    if (!tableCheck.rows[0]?.exists) {
      return res.status(200).json({
        success: true,
        proposals: [],
        total: 0,
      });
    }

    const { status } = req.query;

    let query = `
      SELECT lgp.*,
        lc.name as land_candidate_name,
        lc.stage as land_candidate_stage
      FROM land_governance_proposals lgp
      LEFT JOIN land_candidates lc ON lc.approval_proposal_id = lgp.id
    `;
    const params: any[] = [];

    if (status && typeof status === 'string') {
      query += ` WHERE lgp.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY lgp.created_at DESC`;

    const result = await pool.query(query, params);

    const proposals = result.rows.map((p: any) => {
      const totalVotes = (p.votes_for || 0) + (p.votes_against || 0);
      return {
        ...p,
        total_votes: totalVotes,
      };
    });

    return res.status(200).json({
      success: true,
      proposals,
      total: proposals.length,
    });
  } catch (error: any) {
    console.error('Governance proposals fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch governance proposals',
      details: error.message,
    });
  }
}
