import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          g.id,
          g.proposer_address,
          g.title,
          g.description,
          g.category,
          g.requested_amount,
          g.status,
          g.votes_for,
          g.votes_against,
          g.votes_abstain,
          g.quorum_reached,
          g.voting_start_date,
          g.voting_end_date,
          g.created_at,
          COUNT(DISTINCT v.voter_address) as total_voters
        FROM dao_grants g
        LEFT JOIN dao_grant_votes v ON g.id = v.grant_id
        WHERE g.status != 'draft'
        GROUP BY g.id
        ORDER BY g.created_at DESC
      `);

      const proposals = result.rows.map(row => ({
        id: `AXP-${String(row.id).padStart(3, '0')}`,
        proposalId: row.id,
        title: row.title,
        description: row.description,
        status: mapStatus(row.status, row.voting_start_date, row.voting_end_date),
        category: capitalizeFirst(row.category || 'other'),
        proposer: formatAddress(row.proposer_address),
        forVotes: parseFloat(row.votes_for || '0'),
        againstVotes: parseFloat(row.votes_against || '0'),
        abstainVotes: parseFloat(row.votes_abstain || '0'),
        quorum: 10000000,
        quorumReached: row.quorum_reached || false,
        startDate: row.voting_start_date ? new Date(row.voting_start_date).toISOString().split('T')[0] : null,
        endDate: row.voting_end_date ? new Date(row.voting_end_date).toISOString().split('T')[0] : null,
        totalVoters: parseInt(row.total_voters) || 0,
        requestedAmount: parseFloat(row.requested_amount || '0')
      }));

      res.json({ proposals });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching governance proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
}

function mapStatus(dbStatus: string, startDate: Date | null, endDate: Date | null): string {
  if (dbStatus === 'approved' || dbStatus === 'funded' || dbStatus === 'completed') return 'passed';
  if (dbStatus === 'rejected' || dbStatus === 'cancelled') return 'rejected';
  
  const now = new Date();
  if (startDate && new Date(startDate) > now) return 'pending';
  if (endDate && new Date(endDate) < now) return 'passed';
  if (dbStatus === 'voting') return 'active';
  
  return 'pending';
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatAddress(address: string): string {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
