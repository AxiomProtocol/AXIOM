import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, error: 'Invalid ID' });
  }

  const candidateId = parseInt(id, 10);
  if (isNaN(candidateId)) {
    return res.status(400).json({ success: false, error: 'ID must be a number' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT gp.* FROM governance_proposals gp
         WHERE gp.land_candidate_id = $1
         ORDER BY gp.created_at DESC`,
        [candidateId]
      );

      return res.status(200).json({
        success: true,
        data: result.rows.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description,
          status: p.status,
          category: p.category,
          yesVotes: p.yes_votes,
          noVotes: p.no_votes,
          abstainVotes: p.abstain_votes,
          totalVotes: p.total_votes,
          quorumRequired: p.quorum_required,
          approvalThreshold: p.approval_threshold,
          votingStartsAt: p.voting_starts_at,
          votingEndsAt: p.voting_ends_at,
          createdAt: p.created_at
        }))
      });
    } catch (error) {
      console.error('Governance proposals fetch error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch proposals' });
    }
  }

  if (req.method === 'POST') {
    try {
      const candidateResult = await pool.query(
        'SELECT * FROM land_candidates WHERE id = $1',
        [candidateId]
      );

      if (candidateResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Land candidate not found' });
      }

      const candidate = candidateResult.rows[0];

      if (candidate.stage !== 'ready_for_vote') {
        return res.status(400).json({ 
          success: false, 
          error: 'Land candidate must be in "Ready for Vote" stage to create a governance proposal' 
        });
      }

      const existingProposal = await pool.query(
        `SELECT id FROM governance_proposals WHERE land_candidate_id = $1 AND status NOT IN ('rejected', 'expired', 'cancelled')`,
        [candidateId]
      );

      if (existingProposal.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'An active governance proposal already exists for this candidate',
          proposalId: existingProposal.rows[0].id
        });
      }

      const {
        treasuryId,
        poolId,
        amountAxusd,
        votingDurationDays = 7
      } = req.body;

      const votingStartsAt = new Date();
      const votingEndsAt = new Date(votingStartsAt.getTime() + votingDurationDays * 24 * 60 * 60 * 1000);

      const acreage = candidate.acreage ? Number(candidate.acreage) : 0;
      const askingPrice = candidate.asking_price ? Number(candidate.asking_price) : 0;
      const formattedPrice = askingPrice > 0 ? `$${askingPrice.toLocaleString()}` : 'TBD';
      const countyText = candidate.county ? `${candidate.county} County, ` : '';
      const stateText = candidate.state || 'AR';

      const description = `Proposal to acquire ${acreage} acres in ${countyText}${stateText}.\n\n${candidate.stewardship_intent || 'No stewardship intent specified.'}\n\nAsking Price: ${formattedPrice}`;

      const result = await pool.query(
        `INSERT INTO governance_proposals (
          land_candidate_id, pool_id, treasury_id, title, description,
          amount_axusd, category, status, quorum_required, approval_threshold,
          voting_starts_at, voting_ends_at, total_votes, yes_votes, no_votes, abstain_votes,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'due_diligence', 'active', 10, 51,
          $7, $8, 0, 0, 0, 0, NOW(), NOW()
        ) RETURNING *`,
        [
          candidateId,
          poolId || null,
          treasuryId || null,
          `Land Acquisition: ${candidate.name}`,
          description,
          amountAxusd || askingPrice || 0,
          votingStartsAt,
          votingEndsAt
        ]
      );

      await pool.query(
        `UPDATE land_candidates SET approval_proposal_id = $1, updated_at = NOW() WHERE id = $2`,
        [result.rows[0].id, candidateId]
      );

      await pool.query(
        `INSERT INTO system_audit_logs (action, entity_type, entity_id, details, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          'governance_proposal_created',
          'land_candidate',
          candidateId,
          JSON.stringify({ 
            proposalId: result.rows[0].id,
            candidateName: candidate.name,
            votingEndsAt
          })
        ]
      );

      const p = result.rows[0];
      return res.status(201).json({
        success: true,
        data: {
          id: p.id,
          title: p.title,
          description: p.description,
          status: p.status,
          category: p.category,
          votingStartsAt: p.voting_starts_at,
          votingEndsAt: p.voting_ends_at,
          createdAt: p.created_at
        }
      });
    } catch (error) {
      console.error('Governance proposal create error:', error);
      return res.status(500).json({ success: false, error: 'Failed to create governance proposal' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
