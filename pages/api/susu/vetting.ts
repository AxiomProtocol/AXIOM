import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { groupId, applicantId, status } = req.query;
      
      let whereConditions: string[] = [];
      if (groupId) whereConditions.push(`vr.group_id = ${parseInt(groupId as string)}`);
      if (applicantId) whereConditions.push(`vr.applicant_user_id = ${parseInt(applicantId as string)}`);
      if (status) whereConditions.push(`vr.status = '${status}'`);
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      const requests = await db.execute(sql.raw(`
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
        ${whereClause}
        ORDER BY vr.created_at DESC
      `));
      
      return res.json({ requests: requests.rows });
    }
    
    if (req.method === 'POST') {
      const { action } = req.body;
      
      if (action === 'apply') {
        const { applicantUserId, groupId, applicationMessage, votingPeriodDays } = req.body;
        
        if (!applicantUserId || !groupId) {
          return res.status(400).json({ error: 'applicantUserId and groupId are required' });
        }
        
        const existing = await db.execute(sql.raw(`
          SELECT id FROM susu_vetting_requests
          WHERE applicant_user_id = ${applicantUserId} 
          AND group_id = ${groupId}
          AND status = 'pending'
        `));
        
        if (existing.rows.length > 0) {
          return res.status(400).json({ error: 'Pending application already exists for this group' });
        }
        
        const riskSettings = await db.execute(sql.raw(`
          SELECT * FROM susu_risk_settings WHERE group_id = ${groupId} LIMIT 1
        `));
        
        const settings = riskSettings.rows[0] || {
          vetting_votes_required: 3,
          vetting_approval_threshold: 0.66,
          vetting_period_days: 3
        };
        
        const reliability = await db.execute(sql.raw(`
          SELECT reliability_score FROM susu_reliability_profiles
          WHERE user_id = ${applicantUserId}
          LIMIT 1
        `));
        
        const votingDeadline = new Date();
        votingDeadline.setDate(votingDeadline.getDate() + (votingPeriodDays || settings.vetting_period_days || 3));
        
        const result = await db.execute(sql.raw(`
          INSERT INTO susu_vetting_requests 
          (applicant_user_id, group_id, votes_required, approval_threshold, voting_deadline,
           application_message, reliability_score_at_application, status)
          VALUES (${applicantUserId}, ${groupId}, ${settings.vetting_votes_required || 3},
                  ${settings.vetting_approval_threshold || 0.66}, 
                  '${votingDeadline.toISOString()}',
                  ${applicationMessage ? `'${applicationMessage.replace(/'/g, "''")}'` : 'NULL'},
                  ${reliability.rows[0]?.reliability_score || 'NULL'}, 'pending')
          RETURNING *
        `));
        
        return res.status(201).json({ 
          message: 'Application submitted for vetting',
          request: result.rows[0]
        });
      }
      
      if (action === 'vote') {
        const { vettingRequestId, voterUserId, vote, voteReason } = req.body;
        
        if (!vettingRequestId || !voterUserId || vote === undefined) {
          return res.status(400).json({ error: 'vettingRequestId, voterUserId, and vote are required' });
        }
        
        const request = await db.execute(sql.raw(`
          SELECT * FROM susu_vetting_requests WHERE id = ${vettingRequestId}
        `));
        
        if (request.rows.length === 0) {
          return res.status(404).json({ error: 'Vetting request not found' });
        }
        
        if (request.rows[0].status !== 'pending') {
          return res.status(400).json({ error: 'Vetting is already closed' });
        }
        
        const isMember = await db.execute(sql.raw(`
          SELECT id FROM susu_group_members 
          WHERE group_id = ${request.rows[0].group_id} AND user_id = ${voterUserId}
        `));
        
        if (isMember.rows.length === 0) {
          return res.status(403).json({ error: 'Only group members can vote' });
        }
        
        const existingVote = await db.execute(sql.raw(`
          SELECT id FROM susu_vetting_votes
          WHERE vetting_request_id = ${vettingRequestId} AND voter_user_id = ${voterUserId}
        `));
        
        if (existingVote.rows.length > 0) {
          return res.status(400).json({ error: 'You have already voted' });
        }
        
        await db.execute(sql.raw(`
          INSERT INTO susu_vetting_votes (vetting_request_id, voter_user_id, vote, vote_reason)
          VALUES (${vettingRequestId}, ${voterUserId}, ${vote}, 
                  ${voteReason ? `'${voteReason.replace(/'/g, "''")}'` : 'NULL'})
        `));
        
        const votes = await db.execute(sql.raw(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN vote = true THEN 1 ELSE 0 END) as approvals,
            SUM(CASE WHEN vote = false THEN 1 ELSE 0 END) as rejections
          FROM susu_vetting_votes
          WHERE vetting_request_id = ${vettingRequestId}
        `));
        
        const { total, approvals, rejections } = votes.rows[0];
        const votesRequired = request.rows[0].votes_required;
        const approvalThreshold = parseFloat(request.rows[0].approval_threshold);
        
        let newStatus = 'pending';
        let statusUpdate = '';
        
        if (parseInt(total) >= votesRequired) {
          const approvalRate = parseInt(approvals) / parseInt(total);
          
          if (approvalRate >= approvalThreshold) {
            newStatus = 'approved';
            statusUpdate = `, approved_at = NOW()`;
            
            await db.execute(sql.raw(`
              INSERT INTO susu_group_members (group_id, user_id, role, joined_at)
              VALUES (${request.rows[0].group_id}, ${request.rows[0].applicant_user_id}, 'member', NOW())
              ON CONFLICT DO NOTHING
            `));
          } else {
            newStatus = 'rejected';
            statusUpdate = `, rejected_at = NOW()`;
          }
          
          await db.execute(sql.raw(`
            UPDATE susu_vetting_requests 
            SET status = '${newStatus}'${statusUpdate}
            WHERE id = ${vettingRequestId}
          `));
        }
        
        return res.json({
          message: 'Vote recorded',
          voteStats: { total: parseInt(total), approvals: parseInt(approvals), rejections: parseInt(rejections) },
          status: newStatus
        });
      }
      
      if (action === 'withdraw') {
        const { vettingRequestId, applicantUserId } = req.body;
        
        const result = await db.execute(sql.raw(`
          UPDATE susu_vetting_requests 
          SET status = 'withdrawn'
          WHERE id = ${vettingRequestId} 
          AND applicant_user_id = ${applicantUserId}
          AND status = 'pending'
          RETURNING *
        `));
        
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
