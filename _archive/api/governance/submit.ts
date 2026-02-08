import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';
import { isDatabaseConfigured } from '../../../lib/envValidation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { title, type, summary, description, specifications, timeline, budget, proposer } = req.body;

  if (!title || !type || !summary || !description || !proposer) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (!proposer.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({ success: false, error: 'Invalid proposer address' });
  }

  if (!isDatabaseConfigured()) {
    return res.status(200).json({
      success: true,
      message: 'Proposal submitted for review (demo mode)',
      proposalId: `AXP-${Date.now().toString(36).toUpperCase()}`,
    });
  }

  let client;
  try {
    client = await pool.connect();
    
    const result = await client.query(
      `INSERT INTO dao_grants (
        proposer_address, title, description, category, requested_amount, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
      RETURNING id`,
      [
        proposer,
        title,
        `${summary}\n\n${description}${specifications ? `\n\nSpecifications:\n${specifications}` : ''}${timeline ? `\n\nTimeline: ${timeline}` : ''}`,
        type,
        budget ? parseFloat(budget.replace(/[^0-9.]/g, '')) || 0 : 0,
      ]
    );

    const proposalId = `AXP-${String(result.rows[0].id).padStart(3, '0')}`;

    return res.status(201).json({
      success: true,
      message: 'Proposal submitted for review',
      proposalId,
    });
  } catch (error: any) {
    console.error('Error submitting proposal:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit proposal',
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}
