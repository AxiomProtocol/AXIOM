import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { proposal_id, vote, voter_id } = req.body;

    if (!proposal_id || !vote) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: proposal_id, vote (for/against)',
      });
    }

    if (vote !== 'for' && vote !== 'against') {
      return res.status(400).json({
        success: false,
        error: 'Vote must be "for" or "against"',
      });
    }

    const proposalResult = await pool.query(
      `SELECT * FROM land_governance_proposals WHERE id = $1`,
      [proposal_id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found',
      });
    }

    const proposal = proposalResult.rows[0];

    if (proposal.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Cannot vote on a proposal with status "${proposal.status}". Only active proposals accept votes.`,
      });
    }

    if (proposal.voting_ends_at && new Date(proposal.voting_ends_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Voting period has ended for this proposal',
      });
    }

    const column = vote === 'for' ? 'votes_for' : 'votes_against';
    const updateResult = await pool.query(
      `UPDATE land_governance_proposals 
       SET ${column} = ${column} + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [proposal_id]
    );

    const updated = updateResult.rows[0];
    const totalVotes = (updated.votes_for || 0) + (updated.votes_against || 0);
    const quorumRequired = updated.quorum_required || 10;

    if (totalVotes >= quorumRequired) {
      const newStatus = updated.votes_for > updated.votes_against ? 'passed' : 'failed';
      await pool.query(
        `UPDATE land_governance_proposals SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newStatus, proposal_id]
      );
      updated.status = newStatus;

      if (newStatus === 'passed') {
        const metadata = updated.metadata || {};
        const candidateId = metadata.land_candidate_id;
        if (candidateId) {
          await pool.query(
            `UPDATE land_candidates 
             SET stage = 'funding', is_purchase_approved_by_vote = true, updated_at = NOW()
             WHERE id = $1 AND stage = 'community_vote'`,
            [candidateId]
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      proposal: {
        ...updated,
        total_votes: totalVotes,
      },
      quorum_reached: totalVotes >= quorumRequired,
    });
  } catch (error: any) {
    console.error('Vote on governance proposal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record vote',
      details: error.message,
    });
  }
}
