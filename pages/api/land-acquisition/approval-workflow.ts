import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';
import { 
  sendLandStatusUpdateEmail 
} from '../../../lib/server/resendEmail';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { submissionId } = req.query;

      if (!submissionId) {
        return res.status(400).json({ success: false, error: 'Submission ID required' });
      }

      const result = await db.execute(sql`
        SELECT 
          ls.*,
          sa.wallet as steward_wallet,
          sr.name as steward_region,
          gp.id as proposal_id,
          gp.title as proposal_title,
          gp.status as proposal_status,
          gp.votes_for,
          gp.votes_against
        FROM land_submissions ls
        LEFT JOIN steward_assignments sa ON ls.assigned_steward_id = sa.id
        LEFT JOIN steward_regions sr ON sa.region_id = sr.id
        LEFT JOIN governance_proposals gp ON gp.reference_id = CAST(ls.id AS VARCHAR) 
          AND gp.proposal_type = 'land_acquisition'
        WHERE ls.id = ${parseInt(submissionId as string)}
      `);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Submission not found' });
      }

      const submission = result.rows[0] as any;
      
      const stages = [
        {
          id: 1,
          name: 'Submission Received',
          status: 'completed',
          completedAt: submission.created_at,
          description: 'Property details submitted by landowner'
        },
        {
          id: 2,
          name: 'Admin Review',
          status: submission.status === 'new' ? 'current' : 'completed',
          completedAt: submission.status !== 'new' ? submission.updated_at : null,
          description: 'Initial qualification review by admin team'
        },
        {
          id: 3,
          name: 'Steward Assignment',
          status: submission.assigned_steward_id ? 'completed' : 
                  ['reviewing', 'qualified'].includes(submission.status) ? 'current' : 'pending',
          completedAt: submission.assigned_steward_id ? submission.updated_at : null,
          steward: submission.steward_wallet ? {
            wallet: submission.steward_wallet,
            region: submission.steward_region
          } : null,
          description: 'Field steward assigned to evaluate property'
        },
        {
          id: 4,
          name: 'Steward Evaluation',
          status: submission.status === 'qualified' && submission.assigned_steward_id ? 'current' :
                  submission.proposal_id ? 'completed' : 'pending',
          description: 'On-site property evaluation and due diligence'
        },
        {
          id: 5,
          name: 'Community Vote',
          status: submission.proposal_id && submission.proposal_status === 'active' ? 'current' :
                  submission.proposal_status === 'passed' || submission.proposal_status === 'rejected' ? 'completed' : 'pending',
          proposal: submission.proposal_id ? {
            id: submission.proposal_id,
            title: submission.proposal_title,
            status: submission.proposal_status,
            votesFor: submission.votes_for,
            votesAgainst: submission.votes_against
          } : null,
          description: 'Token holders vote on acquisition proposal'
        },
        {
          id: 6,
          name: 'Final Approval',
          status: submission.status === 'approved' ? 'completed' :
                  submission.proposal_status === 'passed' ? 'current' : 'pending',
          completedAt: submission.status === 'approved' ? submission.reviewed_at : null,
          description: 'Final executive approval and contract preparation'
        }
      ];

      return res.status(200).json({
        success: true,
        data: {
          submission,
          stages,
          currentStage: stages.find(s => s.status === 'current')?.id || 1
        }
      });
    } catch (error: any) {
      console.error('Error fetching approval workflow:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { submissionId, action, reviewerNotes } = req.body;

      if (!submissionId || !action) {
        return res.status(400).json({ success: false, error: 'Submission ID and action required' });
      }

      const validActions = [
        'advance_to_review',
        'assign_steward',
        'complete_evaluation',
        'create_proposal',
        'approve',
        'reject'
      ];

      if (!validActions.includes(action)) {
        return res.status(400).json({ success: false, error: 'Invalid action' });
      }

      const existing = await db.execute(sql`
        SELECT * FROM land_submissions WHERE id = ${submissionId}
      `);

      if (!existing.rows || existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Submission not found' });
      }

      const submission = existing.rows[0] as any;
      let newStatus = submission.status;
      let result;

      switch (action) {
        case 'advance_to_review':
          newStatus = 'reviewing';
          result = await db.execute(sql`
            UPDATE land_submissions
            SET status = 'reviewing', updated_at = NOW()
            WHERE id = ${submissionId}
            RETURNING *
          `);
          break;

        case 'complete_evaluation':
          newStatus = 'qualified';
          result = await db.execute(sql`
            UPDATE land_submissions
            SET status = 'qualified', 
                notes = COALESCE(notes, '') || ${reviewerNotes ? `\n[Steward Evaluation]: ${reviewerNotes}` : ''},
                updated_at = NOW()
            WHERE id = ${submissionId}
            RETURNING *
          `);
          break;

        case 'create_proposal':
          const proposalResult = await db.execute(sql`
            INSERT INTO governance_proposals (
              title, description, proposal_type, reference_id,
              voting_start, voting_end, required_quorum,
              votes_for, votes_against, status, created_at
            ) VALUES (
              ${`Land Acquisition: ${submission.property_address}`},
              ${`Proposal to acquire ${parseFloat(submission.acreage).toLocaleString()} acres at ${submission.property_address}, ${submission.city}, ${submission.state}. Asking price: $${parseFloat(submission.asking_price || 0).toLocaleString()}.`},
              'land_acquisition',
              ${String(submissionId)},
              NOW(),
              NOW() + INTERVAL '7 days',
              10,
              0, 0, 'active', NOW()
            )
            RETURNING *
          `);
          result = { rows: existing.rows };
          break;

        case 'approve':
          newStatus = 'approved';
          result = await db.execute(sql`
            UPDATE land_submissions
            SET status = 'approved', reviewed_at = NOW(), updated_at = NOW()
            WHERE id = ${submissionId}
            RETURNING *
          `);
          break;

        case 'reject':
          newStatus = 'rejected';
          result = await db.execute(sql`
            UPDATE land_submissions
            SET status = 'rejected', 
                reviewed_at = NOW(), 
                notes = COALESCE(notes, '') || ${reviewerNotes ? `\n[Rejection Reason]: ${reviewerNotes}` : ''},
                updated_at = NOW()
            WHERE id = ${submissionId}
            RETURNING *
          `);
          break;

        default:
          result = { rows: existing.rows };
      }

      if (newStatus !== submission.status && ['reviewing', 'qualified', 'approved', 'rejected'].includes(newStatus)) {
        sendLandStatusUpdateEmail({
          ownerEmail: submission.owner_email,
          ownerName: submission.owner_name,
          propertyAddress: submission.property_address,
          newStatus
        }).catch(err => console.error('Failed to send status update email:', err));
      }

      return res.status(200).json({
        success: true,
        data: {
          submission: result?.rows?.[0] || submission,
          action,
          message: `Action '${action}' completed successfully`
        }
      });
    } catch (error: any) {
      console.error('Error processing workflow action:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
