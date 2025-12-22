import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : null;
      const applicantId = req.query.applicantId ? parseInt(req.query.applicantId as string) : null;
      const status = req.query.status as string || null;
      
      const validStatuses = ['pending', 'approved', 'rejected', 'expired', 'withdrawn'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      const requests = await db.execute(sql`
        SELECT 
          vr.*,
          u.email as applicant_email,
          u.wallet_address as applicant_wallet,
          spg.name as group_name,
          (SELECT COUNT(*) FROM susu_vetting_votes WHERE vetting_request_id = vr.id) as total_votes,
          (SELECT COUNT(*) FROM susu_vetting_votes WHERE vetting_request_id = vr.id AND vote = true) as approve_votes,
          (SELECT COUNT(*) FROM susu_vetting_votes WHERE vetting_request_id = vr.id AND vote = false) as reject_votes
        FROM susu_vetting_requests vr
        LEFT JOIN users u ON vr.applicant_user_id = u.id
        LEFT JOIN susu_purpose_groups spg ON vr.group_id = spg.id
        WHERE 
          (${groupId}::int IS NULL OR vr.group_id = ${groupId})
          AND (${applicantId}::int IS NULL OR vr.applicant_user_id = ${applicantId})
          AND (${status}::text IS NULL OR vr.status = ${status}::susu_vetting_status)
        ORDER BY vr.created_at DESC
      `);
      
      return res.json({ requests: requests.rows });
    }
    
    if (req.method === 'POST') {
      const action = req.body.action;
      
      if (action === 'apply') {
        const applicantUserId = parseInt(req.body.applicantUserId);
        const groupId = parseInt(req.body.groupId);
        const applicationMessage = req.body.applicationMessage || null;
        const votingPeriodDays = parseInt(req.body.votingPeriodDays) || 3;
        
        if (!applicantUserId || isNaN(applicantUserId) || !groupId || isNaN(groupId)) {
          return res.status(400).json({ error: 'Valid applicantUserId and groupId are required' });
        }
        
        const existing = await db.execute(sql`
          SELECT id FROM susu_vetting_requests
          WHERE applicant_user_id = ${applicantUserId} 
          AND group_id = ${groupId}
          AND status = 'pending'
        `);
        
        if (existing.rows.length > 0) {
          return res.status(400).json({ error: 'Pending application already exists for this group' });
        }
        
        const riskSettings = await db.execute(sql`
          SELECT * FROM susu_risk_settings WHERE group_id = ${groupId} LIMIT 1
        `);
        
        const settings = riskSettings.rows[0] || {
          vetting_votes_required: 3,
          vetting_approval_threshold: 0.66,
          vetting_period_days: 3
        };
        
        const reliability = await db.execute(sql`
          SELECT reliability_score FROM susu_reliability_profiles
          WHERE user_id = ${applicantUserId}
          LIMIT 1
        `);
        
        const votingDeadline = new Date();
        votingDeadline.setDate(votingDeadline.getDate() + (votingPeriodDays || parseInt(settings.vetting_period_days) || 3));
        
        const result = await db.execute(sql`
          INSERT INTO susu_vetting_requests 
          (applicant_user_id, group_id, votes_required, approval_threshold, voting_deadline,
           application_message, reliability_score_at_application, status)
          VALUES (${applicantUserId}, ${groupId}, ${parseInt(settings.vetting_votes_required) || 3},
                  ${parseFloat(settings.vetting_approval_threshold) || 0.66}, 
                  ${votingDeadline.toISOString()},
                  ${applicationMessage},
                  ${reliability.rows[0]?.reliability_score || null}, 'pending')
          RETURNING *
        `);
        
        return res.status(201).json({ 
          message: 'Application submitted for vetting',
          request: result.rows[0]
        });
      }
      
      if (action === 'vote') {
        const vettingRequestId = parseInt(req.body.vettingRequestId);
        const voterUserId = parseInt(req.body.voterUserId);
        const vote = !!req.body.vote;
        const voteReason = req.body.voteReason || null;
        
        if (!vettingRequestId || isNaN(vettingRequestId) || !voterUserId || isNaN(voterUserId)) {
          return res.status(400).json({ error: 'Valid vettingRequestId and voterUserId are required' });
        }
        
        const request = await db.execute(sql`
          SELECT * FROM susu_vetting_requests WHERE id = ${vettingRequestId}
        `);
        
        if (request.rows.length === 0) {
          return res.status(404).json({ error: 'Vetting request not found' });
        }
        
        if (request.rows[0].status !== 'pending') {
          return res.status(400).json({ error: 'Vetting is already closed' });
        }
        
        const isMember = await db.execute(sql`
          SELECT id FROM susu_group_members 
          WHERE group_id = ${request.rows[0].group_id} AND user_id = ${voterUserId}
        `);
        
        if (isMember.rows.length === 0) {
          return res.status(403).json({ error: 'Only group members can vote' });
        }
        
        const existingVote = await db.execute(sql`
          SELECT id FROM susu_vetting_votes
          WHERE vetting_request_id = ${vettingRequestId} AND voter_user_id = ${voterUserId}
        `);
        
        if (existingVote.rows.length > 0) {
          return res.status(400).json({ error: 'You have already voted' });
        }
        
        await db.execute(sql`
          INSERT INTO susu_vetting_votes (vetting_request_id, voter_user_id, vote, vote_reason)
          VALUES (${vettingRequestId}, ${voterUserId}, ${vote}, ${voteReason})
        `);
        
        const votes = await db.execute(sql`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN vote = true THEN 1 ELSE 0 END) as approvals,
            SUM(CASE WHEN vote = false THEN 1 ELSE 0 END) as rejections
          FROM susu_vetting_votes
          WHERE vetting_request_id = ${vettingRequestId}
        `);
        
        const total = parseInt(votes.rows[0].total);
        const approvals = parseInt(votes.rows[0].approvals);
        const rejections = parseInt(votes.rows[0].rejections);
        const votesRequired = parseInt(request.rows[0].votes_required);
        const approvalThreshold = parseFloat(request.rows[0].approval_threshold);
        
        let newStatus = 'pending';
        
        if (total >= votesRequired) {
          const approvalRate = approvals / total;
          
          if (approvalRate >= approvalThreshold) {
            newStatus = 'approved';
            
            await db.execute(sql`
              UPDATE susu_vetting_requests 
              SET status = 'approved', approved_at = NOW()
              WHERE id = ${vettingRequestId}
            `);
            
            await db.execute(sql`
              INSERT INTO susu_group_members (group_id, user_id, role, joined_at)
              VALUES (${request.rows[0].group_id}, ${request.rows[0].applicant_user_id}, 'member', NOW())
              ON CONFLICT DO NOTHING
            `);
          } else {
            newStatus = 'rejected';
            await db.execute(sql`
              UPDATE susu_vetting_requests 
              SET status = 'rejected', rejected_at = NOW()
              WHERE id = ${vettingRequestId}
            `);
          }
        }
        
        return res.json({
          message: 'Vote recorded',
          voteStats: { total, approvals, rejections },
          status: newStatus
        });
      }
      
      if (action === 'withdraw') {
        const vettingRequestId = parseInt(req.body.vettingRequestId);
        const applicantUserId = parseInt(req.body.applicantUserId);
        
        if (!vettingRequestId || isNaN(vettingRequestId) || !applicantUserId || isNaN(applicantUserId)) {
          return res.status(400).json({ error: 'Valid vettingRequestId and applicantUserId are required' });
        }
        
        const result = await db.execute(sql`
          UPDATE susu_vetting_requests 
          SET status = 'withdrawn'
          WHERE id = ${vettingRequestId} 
          AND applicant_user_id = ${applicantUserId}
          AND status = 'pending'
          RETURNING *
        `);
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Request not found or cannot be withdrawn' });
        }
        
        return res.json({ message: 'Application withdrawn', request: result.rows[0] });
      }
      
      return res.status(400).json({ error: 'Invalid action. Use: apply, vote, or withdraw' });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Vetting API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
