import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';
import { 
  sendLandStatusUpdateEmail,
  sendAdminNewSubmissionAlert 
} from '../../../lib/server/resendEmail';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@axiom.city';

const WORKFLOW_STAGES = {
  submission: {
    next: 'admin_review',
    label: 'Submission Received',
    status: 'new'
  },
  admin_review: {
    next: 'steward_assignment',
    label: 'Admin Review',
    status: 'reviewing'
  },
  steward_assignment: {
    next: 'steward_evaluation',
    label: 'Steward Assignment',
    status: 'steward_assigned'
  },
  steward_evaluation: {
    next: 'community_vote',
    label: 'Steward Evaluation',
    status: 'steward_evaluation'
  },
  community_vote: {
    next: 'final_approval',
    label: 'Community Vote',
    status: 'community_vote'
  },
  final_approval: {
    next: null,
    label: 'Final Approval',
    status: 'approved'
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { submissionId, action, data, adminId } = req.body;

      if (!submissionId || !action) {
        return res.status(400).json({
          success: false,
          error: 'Submission ID and action are required'
        });
      }

      const submissionResult = await db.execute(sql`
        SELECT * FROM land_submissions WHERE id = ${submissionId}
      `);

      if (submissionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Submission not found'
        });
      }

      const submission = submissionResult.rows[0] as any;

      switch (action) {
        case 'advance_to_review':
          await db.execute(sql`
            UPDATE land_submissions
            SET status = 'reviewing',
                approval_stage = 'admin_review',
                reviewed_by = ${adminId || null},
                updated_at = NOW()
            WHERE id = ${submissionId}
          `);
          break;

        case 'assign_steward':
          if (!data?.stewardId) {
            return res.status(400).json({
              success: false,
              error: 'Steward ID is required'
            });
          }
          await db.execute(sql`
            UPDATE land_submissions
            SET status = 'steward_assigned',
                approval_stage = 'steward_evaluation',
                assigned_steward_id = ${data.stewardId},
                steward_assignment_at = NOW(),
                updated_at = NOW()
            WHERE id = ${submissionId}
          `);
          break;

        case 'submit_steward_evaluation':
          if (!data?.recommendation) {
            return res.status(400).json({
              success: false,
              error: 'Recommendation is required'
            });
          }

          await db.execute(sql`
            INSERT INTO steward_reviews (
              submission_id, steward_id, risk_score, recommendation,
              location_analysis, market_analysis, development_potential,
              community_fit, concerns, notes, submitted_at, created_at
            ) VALUES (
              ${submissionId},
              ${submission.assigned_steward_id},
              ${data.riskScore || null},
              ${data.recommendation},
              ${data.locationAnalysis || null},
              ${data.marketAnalysis || null},
              ${data.developmentPotential || null},
              ${data.communityFit || null},
              ${data.concerns || null},
              ${data.notes || null},
              NOW(),
              NOW()
            )
          `);

          await db.execute(sql`
            UPDATE land_submissions
            SET steward_recommendation = ${data.recommendation},
                steward_evaluation_notes = ${data.notes || null},
                steward_evaluation_at = NOW(),
                updated_at = NOW()
            WHERE id = ${submissionId}
          `);
          break;

        case 'start_community_vote':
          const voteEndDate = new Date();
          voteEndDate.setDate(voteEndDate.getDate() + 7);

          await db.execute(sql`
            UPDATE land_submissions
            SET status = 'community_vote',
                approval_stage = 'community_vote',
                community_vote_status = 'active',
                community_vote_start_at = NOW(),
                community_vote_end_at = ${voteEndDate},
                updated_at = NOW()
            WHERE id = ${submissionId}
          `);
          break;

        case 'cast_vote':
          if (!data?.vote || !data?.voterId) {
            return res.status(400).json({
              success: false,
              error: 'Vote and voter ID are required'
            });
          }

          const existingVote = await db.execute(sql`
            SELECT id FROM community_votes
            WHERE submission_id = ${submissionId} AND voter_id = ${data.voterId}
          `);

          if (existingVote.rows.length > 0) {
            return res.status(400).json({
              success: false,
              error: 'You have already voted on this submission'
            });
          }

          await db.execute(sql`
            INSERT INTO community_votes (submission_id, voter_id, vote, weight, comment, created_at)
            VALUES (${submissionId}, ${data.voterId}, ${data.vote}, ${data.weight || 1}, ${data.comment || null}, NOW())
          `);

          if (data.vote === 'for') {
            await db.execute(sql`
              UPDATE land_submissions
              SET community_votes_for = community_votes_for + ${data.weight || 1},
                  updated_at = NOW()
              WHERE id = ${submissionId}
            `);
          } else if (data.vote === 'against') {
            await db.execute(sql`
              UPDATE land_submissions
              SET community_votes_against = community_votes_against + ${data.weight || 1},
                  updated_at = NOW()
              WHERE id = ${submissionId}
            `);
          }
          break;

        case 'complete_vote':
          const updatedSubmission = await db.execute(sql`
            SELECT community_votes_for, community_votes_against FROM land_submissions
            WHERE id = ${submissionId}
          `);
          
          const votes = updatedSubmission.rows[0] as any;
          const passed = votes.community_votes_for > votes.community_votes_against;

          await db.execute(sql`
            UPDATE land_submissions
            SET community_vote_status = 'completed',
                status = ${passed ? 'qualified' : 'rejected'},
                approval_stage = ${passed ? 'final_approval' : 'community_vote'},
                rejection_reason = ${!passed ? 'Community vote did not pass' : null},
                updated_at = NOW()
            WHERE id = ${submissionId}
          `);
          break;

        case 'final_approve':
          await db.execute(sql`
            UPDATE land_submissions
            SET status = 'approved',
                approval_stage = 'final_approval',
                final_approval_at = NOW(),
                final_approval_by = ${adminId || null},
                updated_at = NOW()
            WHERE id = ${submissionId}
          `);

          sendLandStatusUpdateEmail({
            ownerEmail: submission.owner_email,
            ownerName: submission.owner_name,
            propertyAddress: submission.property_address,
            newStatus: 'approved',
            message: 'Congratulations! Your property has been approved for our land acquisition program.'
          }).catch(err => console.error('Failed to send approval email:', err));
          break;

        case 'reject':
          await db.execute(sql`
            UPDATE land_submissions
            SET status = 'rejected',
                rejection_reason = ${data?.reason || 'Did not meet program criteria'},
                updated_at = NOW()
            WHERE id = ${submissionId}
          `);

          sendLandStatusUpdateEmail({
            ownerEmail: submission.owner_email,
            ownerName: submission.owner_name,
            propertyAddress: submission.property_address,
            newStatus: 'rejected',
            message: data?.reason || 'Unfortunately, your property did not meet our current program criteria.'
          }).catch(err => console.error('Failed to send rejection email:', err));
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action'
          });
      }

      const updatedResult = await db.execute(sql`
        SELECT ls.*, u.first_name || ' ' || u.last_name as steward_name
        FROM land_submissions ls
        LEFT JOIN users u ON ls.assigned_steward_id = u.id
        WHERE ls.id = ${submissionId}
      `);

      return res.status(200).json({
        success: true,
        data: {
          submission: updatedResult.rows[0],
          action,
          message: `Action '${action}' completed successfully`
        }
      });
    } catch (error: any) {
      console.error('Error processing workflow action:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { submissionId } = req.query;

      if (!submissionId) {
        return res.status(400).json({
          success: false,
          error: 'Submission ID required'
        });
      }

      const submission = await db.execute(sql`
        SELECT ls.*, u.first_name || ' ' || u.last_name as steward_name
        FROM land_submissions ls
        LEFT JOIN users u ON ls.assigned_steward_id = u.id
        WHERE ls.id = ${Number(submissionId)}
      `);

      if (submission.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Submission not found'
        });
      }

      const reviews = await db.execute(sql`
        SELECT sr.*, u.first_name || ' ' || u.last_name as steward_name
        FROM steward_reviews sr
        JOIN users u ON sr.steward_id = u.id
        WHERE sr.submission_id = ${Number(submissionId)}
        ORDER BY sr.created_at DESC
      `);

      const votes = await db.execute(sql`
        SELECT cv.*, u.first_name || ' ' || u.last_name as voter_name
        FROM community_votes cv
        JOIN users u ON cv.voter_id = u.id
        WHERE cv.submission_id = ${Number(submissionId)}
        ORDER BY cv.created_at DESC
      `);

      const sub = submission.rows[0] as any;
      const currentStage = sub.approval_stage || 'submission';
      const availableActions = getAvailableActions(currentStage, sub);

      return res.status(200).json({
        success: true,
        data: {
          submission: sub,
          reviews: reviews.rows,
          votes: votes.rows,
          workflow: {
            currentStage,
            stageInfo: WORKFLOW_STAGES[currentStage as keyof typeof WORKFLOW_STAGES],
            availableActions
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching workflow:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

function getAvailableActions(stage: string, submission: any): string[] {
  const actions: string[] = [];

  switch (stage) {
    case 'submission':
      actions.push('advance_to_review', 'reject');
      break;
    case 'admin_review':
      actions.push('assign_steward', 'reject');
      break;
    case 'steward_evaluation':
      if (!submission.steward_evaluation_at) {
        actions.push('submit_steward_evaluation');
      } else {
        actions.push('start_community_vote', 'reject');
      }
      break;
    case 'community_vote':
      if (submission.community_vote_status === 'active') {
        actions.push('cast_vote', 'complete_vote');
      } else if (submission.community_vote_status === 'completed') {
        actions.push('final_approve', 'reject');
      }
      break;
    case 'final_approval':
      if (submission.status !== 'approved') {
        actions.push('final_approve', 'reject');
      }
      break;
  }

  return actions;
}
