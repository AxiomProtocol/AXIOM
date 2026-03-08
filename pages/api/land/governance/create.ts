import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      title,
      description,
      rationale,
      proposal_type,
      land_candidate_id,
      requested_action,
      proposer_id,
      quorum_required,
    } = req.body;

    if (!title || !description || !proposal_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, proposal_type',
      });
    }

    const proposerId = proposer_id || 1;
    const quorum = quorum_required || 10;

    let landOptionId = null;
    if (land_candidate_id) {
      const candidateCheck = await pool.query(
        `SELECT id FROM land_candidates WHERE id = $1`,
        [land_candidate_id]
      );
      if (candidateCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Linked land candidate not found',
        });
      }
    }

    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'land_options'
      ) as exists
    `);

    if (tableCheck.rows[0]?.exists && land_candidate_id) {
      const optionCheck = await pool.query(
        `SELECT id FROM land_options LIMIT 1`
      );
      if (optionCheck.rows.length > 0) {
        landOptionId = optionCheck.rows[0].id;
      }
    }

    if (!landOptionId) {
      const tableExists = tableCheck.rows[0]?.exists;
      if (tableExists) {
        const insertOption = await pool.query(
          `INSERT INTO land_options (parcel_id, location, acreage, status)
           VALUES ($1, $2, $3, 'active')
           RETURNING id`,
          [`proposal-${Date.now()}`, 'Governance Proposal', 0]
        );
        landOptionId = insertOption.rows[0].id;
      } else {
        return res.status(500).json({
          success: false,
          error: 'land_options table not available',
        });
      }
    }

    const metadata = {
      rationale: rationale || null,
      requested_action: requested_action || null,
      land_candidate_id: land_candidate_id || null,
    };

    const now = new Date();
    const votingEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO land_governance_proposals 
        (land_option_id, title, description, proposal_type, proposer_id, status, 
         votes_for, votes_against, quorum_required, voting_starts_at, voting_ends_at, metadata)
       VALUES ($1, $2, $3, $4, $5, 'draft', 0, 0, $6, $7, $8, $9)
       RETURNING *`,
      [landOptionId, title, description, proposal_type, proposerId, quorum, now.toISOString(), votingEnds.toISOString(), JSON.stringify(metadata)]
    );

    if (land_candidate_id) {
      await pool.query(
        `UPDATE land_candidates SET approval_proposal_id = $1 WHERE id = $2`,
        [result.rows[0].id, land_candidate_id]
      );
    }

    return res.status(201).json({
      success: true,
      proposal: result.rows[0],
    });
  } catch (error: any) {
    console.error('Create governance proposal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create governance proposal',
      details: error.message,
    });
  }
}
