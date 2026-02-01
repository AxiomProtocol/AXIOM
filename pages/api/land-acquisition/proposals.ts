import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

const PROPOSAL_TEMPLATES = {
  land_acquisition: {
    title: "Land Acquisition Approval",
    description: "Community vote to approve the acquisition of land option and proceed with Reg CF crowdfunding",
    requiredFields: ["landOptionId", "purchasePrice", "targetAmount", "projectedReturns"],
    quorumRequired: 50,
    votingDuration: 7
  },
  development_plan: {
    title: "Development Plan Approval",
    description: "Approve the proposed development plan for acquired land",
    requiredFields: ["landOptionId", "developmentType", "estimatedCost", "timeline"],
    quorumRequired: 60,
    votingDuration: 14
  },
  budget_allocation: {
    title: "Budget Allocation",
    description: "Allocate funds from the treasury for land development activities",
    requiredFields: ["landOptionId", "amount", "purpose", "milestones"],
    quorumRequired: 55,
    votingDuration: 7
  },
  partnership: {
    title: "Partnership Agreement",
    description: "Approve partnership with external developers or landowners",
    requiredFields: ["landOptionId", "partnerName", "terms", "benefitAnalysis"],
    quorumRequired: 65,
    votingDuration: 10
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { landOptionId, status, template } = req.query;

      if (template === 'list') {
        return res.status(200).json({
          success: true,
          data: {
            templates: PROPOSAL_TEMPLATES
          }
        });
      }

      if (template && typeof template === 'string') {
        const templateData = PROPOSAL_TEMPLATES[template as keyof typeof PROPOSAL_TEMPLATES];
        if (!templateData) {
          return res.status(404).json({ success: false, error: 'Template not found' });
        }
        return res.status(200).json({
          success: true,
          data: { template: templateData, type: template }
        });
      }

      let result;
      
      if (landOptionId && status) {
        result = await db.execute(sql`
          SELECT 
            lgp.*,
            lo.location as land_location,
            lo.acreage,
            lo.purchase_price,
            u.first_name || ' ' || u.last_name as proposer_name
          FROM land_governance_proposals lgp
          LEFT JOIN land_options lo ON lgp.land_option_id = lo.id
          LEFT JOIN users u ON lgp.proposer_id = u.id
          WHERE lgp.land_option_id = ${Number(landOptionId)} AND lgp.status = ${String(status)}
          ORDER BY lgp.created_at DESC
        `);
      } else if (landOptionId) {
        result = await db.execute(sql`
          SELECT 
            lgp.*,
            lo.location as land_location,
            lo.acreage,
            lo.purchase_price,
            u.first_name || ' ' || u.last_name as proposer_name
          FROM land_governance_proposals lgp
          LEFT JOIN land_options lo ON lgp.land_option_id = lo.id
          LEFT JOIN users u ON lgp.proposer_id = u.id
          WHERE lgp.land_option_id = ${Number(landOptionId)}
          ORDER BY lgp.created_at DESC
        `);
      } else if (status) {
        result = await db.execute(sql`
          SELECT 
            lgp.*,
            lo.location as land_location,
            lo.acreage,
            lo.purchase_price,
            u.first_name || ' ' || u.last_name as proposer_name
          FROM land_governance_proposals lgp
          LEFT JOIN land_options lo ON lgp.land_option_id = lo.id
          LEFT JOIN users u ON lgp.proposer_id = u.id
          WHERE lgp.status = ${String(status)}
          ORDER BY lgp.created_at DESC
        `);
      } else {
        result = await db.execute(sql`
          SELECT 
            lgp.*,
            lo.location as land_location,
            lo.acreage,
            lo.purchase_price,
            u.first_name || ' ' || u.last_name as proposer_name
          FROM land_governance_proposals lgp
          LEFT JOIN land_options lo ON lgp.land_option_id = lo.id
          LEFT JOIN users u ON lgp.proposer_id = u.id
          ORDER BY lgp.created_at DESC
        `);
      }

      return res.status(200).json({
        success: true,
        data: {
          proposals: result.rows || [],
          templates: Object.keys(PROPOSAL_TEMPLATES)
        }
      });
    } catch (error: any) {
      console.error('Error fetching land proposals:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { 
        landOptionId, 
        title, 
        description, 
        proposalType, 
        proposerId,
        votingDuration = 7
      } = req.body;

      if (!landOptionId || !title || !description || !proposalType || !proposerId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: landOptionId, title, description, proposalType, proposerId' 
        });
      }

      const templateConfig = PROPOSAL_TEMPLATES[proposalType as keyof typeof PROPOSAL_TEMPLATES];
      const quorumRequired = templateConfig?.quorumRequired || 50;

      const votingStart = new Date();
      const votingEnd = new Date();
      votingEnd.setDate(votingEnd.getDate() + votingDuration);

      const result = await db.execute(sql`
        INSERT INTO land_governance_proposals (
          land_option_id, title, description, proposal_type, proposer_id,
          status, quorum_required, voting_start, voting_end, created_at
        ) VALUES (
          ${landOptionId}, ${title}, ${description}, ${proposalType}, ${proposerId},
          'active', ${quorumRequired}, ${votingStart}, ${votingEnd}, NOW()
        )
        RETURNING *
      `);

      return res.status(201).json({
        success: true,
        data: {
          proposal: result.rows[0],
          message: 'Land governance proposal created successfully'
        }
      });
    } catch (error: any) {
      console.error('Error creating land proposal:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { proposalId, vote, voterId } = req.body;

      if (!proposalId || !vote || !voterId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: proposalId, vote (for/against), voterId' 
        });
      }

      if (vote !== 'for' && vote !== 'against') {
        return res.status(400).json({ 
          success: false, 
          error: "Vote must be 'for' or 'against'" 
        });
      }

      const proposal = await db.execute(sql`
        SELECT * FROM land_governance_proposals WHERE id = ${proposalId}
      `);

      if (!proposal.rows || proposal.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Proposal not found' });
      }

      const prop = proposal.rows[0] as any;
      
      if (prop.status !== 'active') {
        return res.status(400).json({ success: false, error: 'Proposal is not active' });
      }

      if (new Date() > new Date(prop.voting_end)) {
        return res.status(400).json({ success: false, error: 'Voting period has ended' });
      }

      const existingVote = await db.execute(sql`
        SELECT * FROM land_proposal_votes 
        WHERE proposal_id = ${proposalId} AND voter_id = ${voterId}
      `);

      if (existingVote.rows && existingVote.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'You have already voted on this proposal' 
        });
      }

      await db.execute(sql`
        INSERT INTO land_proposal_votes (proposal_id, voter_id, vote, created_at)
        VALUES (${proposalId}, ${voterId}, ${vote}, NOW())
      `);

      const voteCounts = await db.execute(sql`
        SELECT 
          COUNT(*) FILTER (WHERE vote = 'for') as votes_for,
          COUNT(*) FILTER (WHERE vote = 'against') as votes_against,
          COUNT(*) as total_votes
        FROM land_proposal_votes 
        WHERE proposal_id = ${proposalId}
      `);

      const counts = voteCounts.rows[0] as any;
      const votesFor = parseInt(counts.votes_for) || 0;
      const votesAgainst = parseInt(counts.votes_against) || 0;
      const totalVotes = parseInt(counts.total_votes) || 0;

      let newStatus = 'active';
      if (totalVotes >= prop.quorum_required) {
        newStatus = votesFor > votesAgainst ? 'passed' : 'rejected';
      }

      const result = await db.execute(sql`
        UPDATE land_governance_proposals 
        SET votes_for = ${votesFor}, 
            votes_against = ${votesAgainst},
            status = ${newStatus},
            executed_at = CASE WHEN ${newStatus} != 'active' THEN NOW() ELSE NULL END
        WHERE id = ${proposalId}
        RETURNING *
      `);

      return res.status(200).json({
        success: true,
        data: {
          proposal: result.rows[0],
          message: `Vote recorded: ${vote}`,
          yourVote: vote,
          totalVotes,
          votesFor,
          votesAgainst
        }
      });
    } catch (error: any) {
      console.error('Error voting on proposal:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
