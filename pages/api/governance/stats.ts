import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '../../../lib/db';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    try {
      const statsResult = await client.query(`
        SELECT 
          COUNT(*) as total_proposals,
          COUNT(*) FILTER (WHERE status IN ('approved', 'funded', 'completed')) as passed_proposals,
          COUNT(*) FILTER (WHERE status = 'voting') as active_proposals,
          COALESCE(SUM(votes_for::numeric + votes_against::numeric + votes_abstain::numeric), 0) as total_voting_power
        FROM dao_grants
        WHERE status != 'draft'
      `);

      const votersResult = await client.query(`
        SELECT COUNT(DISTINCT voter_address) as total_voters
        FROM dao_grant_votes
      `);

      const stats = statsResult.rows[0];
      const voters = votersResult.rows[0];

      const totalVotingPower = parseFloat(stats.total_voting_power || '0');
      const formattedVotingPower = totalVotingPower >= 1000000000 
        ? `${(totalVotingPower / 1000000000).toFixed(1)}B AXM`
        : totalVotingPower >= 1000000
          ? `${(totalVotingPower / 1000000).toFixed(1)}M AXM`
          : `${totalVotingPower.toLocaleString()} AXM`;

      res.json({
        stats: {
          totalProposals: parseInt(stats.total_proposals) || 0,
          passedProposals: parseInt(stats.passed_proposals) || 0,
          activeProposals: parseInt(stats.active_proposals) || 0,
          totalVoters: parseInt(voters.total_voters) || 0,
          totalVotingPower: formattedVotingPower,
          averageParticipation: '0%',
          treasuryBalance: '0 AXM'
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching governance stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
