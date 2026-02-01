import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';
import { verifySIWEAddress } from '../../../lib/middleware/siweAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM dao_grants
        ORDER BY created_at DESC
        LIMIT 50
      `);

      const grants = result.rows.map(row => ({
        id: row.id,
        proposerAddress: row.proposer_address,
        title: row.title,
        description: row.description,
        category: row.category,
        requestedAmount: row.requested_amount,
        status: row.status,
        votesFor: row.votes_for,
        votesAgainst: row.votes_against,
        votesAbstain: row.votes_abstain,
        quorumReached: row.quorum_reached,
        votingStartDate: row.voting_start_date,
        votingEndDate: row.voting_end_date,
        fundedAmount: row.funded_amount,
        createdAt: row.created_at
      }));

      res.json({ grants });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching grants:', error);
    res.status(500).json({ message: 'Failed to fetch grants', error: error.message });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { proposerAddress, title, description, category, requestedAmount } = req.body;

    // Validate required fields
    if (!proposerAddress || !title || !description || !category || !requestedAmount) {
      return res.status(400).json({ error: 'Missing required fields: proposerAddress, title, description, category, requestedAmount' });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(proposerAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Verify SIWE authentication - ensure wallet ownership
    const siweVerification = await verifySIWEAddress(req);
    if (!siweVerification.valid) {
      return res.status(401).json({ 
        error: siweVerification.error,
        code: 'SIWE_VERIFICATION_FAILED',
        authenticatedAddress: siweVerification.authenticatedAddress
      });
    }

    // Validate title length
    const sanitizedTitle = title.trim().slice(0, 200);
    if (sanitizedTitle.length < 5) {
      return res.status(400).json({ error: 'Title must be at least 5 characters' });
    }

    // Validate description length
    const sanitizedDescription = description.trim().slice(0, 5000).replace(/<script[^>]*>.*?<\/script>/gi, '');
    if (sanitizedDescription.length < 50) {
      return res.status(400).json({ error: 'Description must be at least 50 characters' });
    }

    // Validate category
    const validCategories = ['development', 'marketing', 'community', 'infrastructure', 'research', 'education', 'partnerships', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category. Must be one of: ' + validCategories.join(', ') });
    }

    // Validate requested amount
    const parsedAmount = parseFloat(requestedAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 100000000000) {
      return res.status(400).json({ error: 'Invalid requested amount - must be a positive number up to 100 billion AXM' });
    }

    const client = await pool.connect();
    try {
      const votingStartDate = new Date();
      const votingEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const result = await client.query(`
        INSERT INTO dao_grants (
          proposer_address, title, description, category, requested_amount,
          status, votes_for, votes_against, votes_abstain, quorum_reached,
          voting_start_date, voting_end_date, funded_amount, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'voting', '0', '0', '0', false, $6, $7, '0', NOW())
        RETURNING *
      `, [proposerAddress.toLowerCase(), sanitizedTitle, sanitizedDescription, category, parsedAmount.toString(), votingStartDate, votingEndDate]);

      res.status(201).json({ 
        success: true, 
        grant: {
          id: result.rows[0].id,
          title: result.rows[0].title,
          status: result.rows[0].status
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating grant:', error);
    res.status(500).json({ error: 'Failed to create grant proposal. Please try again.' });
  }
}
