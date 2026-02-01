import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';
import { isDatabaseConfigured, createDatabaseErrorResponse } from '../../../lib/envValidation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return getProposals(req, res);
  } else if (req.method === 'POST') {
    return createProposal(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function createProposal(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { title, category, description, discussionUrl } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description required' });
    }
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO dao_grants (title, description, category, status, proposer_address, voting_start_date, voting_end_date)
        VALUES ($1, $2, $3, 'pending', $4, $5, $6) RETURNING id
      `, [title, description, category || 'other', '0x0000000000000000000000000000000000000000', 
          new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);
      res.status(201).json({ success: true, proposalId: result.rows[0].id });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
}

async function getProposals(req: NextApiRequest, res: NextApiResponse) {

  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Database not configured',
      proposals: []
    });
  }

  let client;
  try {
    client = await pool.connect();
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

    if (proposals.length > 0) {
      res.json({ proposals, isDemo: false });
    } else {
      res.json({ proposals: getSampleProposals(), isDemo: true });
    }
  } catch (error: any) {
    console.error('Error fetching governance proposals:', error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === '42P01') {
      return res.json({ proposals: getSampleProposals(), isDemo: true });
    }
    
    res.json({ proposals: getSampleProposals(), isDemo: true });
  } finally {
    if (client) {
      client.release();
    }
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

function getSampleProposals() {
  return [
    {
      id: 'AIP-001',
      proposalId: 1,
      title: 'Increase DSCR Lending Pool Allocation',
      description: 'Proposal to increase the Series B DSCR rental pool allocation from $1.5M to $2.5M to meet growing demand for long-term rental financing.',
      status: 'active',
      category: 'Treasury',
      proposer: '0x1234...5678',
      forVotes: 8500000,
      againstVotes: 1200000,
      abstainVotes: 300000,
      quorum: 10000000,
      quorumReached: true,
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalVoters: 127,
      requestedAmount: 1000000
    },
    {
      id: 'AIP-002',
      proposalId: 2,
      title: 'Add BRRRR Refinance Pathway',
      description: 'Enable seamless conversion of completed fix-and-flip loans to long-term DSCR loans through an automated BRRRR refinance pathway.',
      status: 'passed',
      category: 'Protocol',
      proposer: '0xABCD...EFGH',
      forVotes: 12000000,
      againstVotes: 800000,
      abstainVotes: 200000,
      quorum: 10000000,
      quorumReached: true,
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalVoters: 189,
      requestedAmount: 0
    },
    {
      id: 'AIP-003',
      proposalId: 3,
      title: 'Quarterly Investor Distribution Schedule',
      description: 'Standardize yield distributions to quarterly intervals aligned with SEC reporting requirements for Reg D 506(c) compliance.',
      status: 'active',
      category: 'Governance',
      proposer: '0x9876...4321',
      forVotes: 5200000,
      againstVotes: 2100000,
      abstainVotes: 700000,
      quorum: 10000000,
      quorumReached: false,
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalVoters: 94,
      requestedAmount: 0
    }
  ];
}
