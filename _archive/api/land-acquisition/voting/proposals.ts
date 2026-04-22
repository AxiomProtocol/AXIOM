import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { campaignId, poolId, status, userId } = req.query;

    try {
      let query = `
        SELECT 
          thp.*,
          u.wallet_address as proposer_name,
          cc.title as campaign_title,
          lap.name as pool_name,
          lo.location
        FROM token_holder_proposals thp
        LEFT JOIN users u ON thp.proposer_id = u.id
        LEFT JOIN crowdfunding_campaigns cc ON thp.campaign_id = cc.id
        LEFT JOIN land_acquisition_pools lap ON thp.pool_id = lap.id
        LEFT JOIN land_options lo ON thp.land_option_id = lo.id OR cc.land_option_id = lo.id OR lap.land_option_id = lo.id
        WHERE 1=1
      `;

      const params: any[] = [];

      if (campaignId) {
        params.push(campaignId);
        query += ` AND thp.campaign_id = $${params.length}`;
      }

      if (poolId) {
        params.push(poolId);
        query += ` AND thp.pool_id = $${params.length}`;
      }

      if (status) {
        params.push(status);
        query += ` AND thp.status = $${params.length}`;
      }

      if (userId) {
        params.push(userId);
        query += ` AND (
          thp.campaign_id IN (SELECT campaign_id FROM crowdfunding_investments WHERE investor_id = $${params.length})
          OR thp.pool_id IN (SELECT pool_id FROM pool_members WHERE user_id = $${params.length})
        )`;
      }

      query += ` ORDER BY thp.created_at DESC`;

      const result = await pool.query(query, params);

      res.status(200).json({
        success: true,
        data: {
          proposals: result.rows.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            proposalType: p.proposal_type,
            options: p.options || [],
            votingStartDate: p.voting_start_date,
            votingEndDate: p.voting_end_date,
            quorumPercentage: p.quorum_percentage,
            passingThreshold: p.passing_threshold,
            status: p.status,
            totalVotes: p.total_votes,
            totalVotingPower: p.total_voting_power,
            yesVotes: p.yes_votes,
            noVotes: p.no_votes,
            abstainVotes: p.abstain_votes,
            proposerName: p.proposer_name?.slice(0, 6) + '...',
            campaignTitle: p.campaign_title,
            poolName: p.pool_name,
            location: p.location,
            createdAt: p.created_at,
          })),
        },
      });
    } catch (error) {
      console.error('Proposals fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch proposals' });
    }
  } else if (req.method === 'POST') {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { 
      campaignId, 
      poolId, 
      landOptionId,
      title, 
      description, 
      proposalType, 
      options,
      votingDurationDays 
    } = req.body;

    if (!title || !description || !proposalType) {
      return res.status(400).json({ error: 'Title, description, and proposal type required' });
    }

    try {
      const votingStartDate = new Date();
      const votingEndDate = new Date(Date.now() + (votingDurationDays || 7) * 24 * 60 * 60 * 1000);

      const result = await pool.query(`
        INSERT INTO token_holder_proposals 
        (campaign_id, pool_id, land_option_id, proposer_id, title, description, proposal_type, options, voting_start_date, voting_end_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
        RETURNING id
      `, [
        campaignId || null,
        poolId || null,
        landOptionId || null,
        userId,
        title,
        description,
        proposalType,
        JSON.stringify(options || []),
        votingStartDate,
        votingEndDate,
      ]);

      const investorsResult = await pool.query(`
        SELECT DISTINCT investor_id as user_id FROM crowdfunding_investments WHERE campaign_id = $1 AND status = 'confirmed'
        UNION
        SELECT DISTINCT user_id FROM pool_members WHERE pool_id = $2 AND active = true
      `, [campaignId, poolId]);

      for (const investor of investorsResult.rows) {
        await pool.query(`
          INSERT INTO investor_notifications (user_id, campaign_id, pool_id, type, title, message, action_url)
          VALUES ($1, $2, $3, 'vote_required', 'New Proposal: Vote Required', $4, $5)
        `, [
          investor.user_id,
          campaignId,
          poolId,
          `A new proposal "${title}" requires your vote. Voting ends on ${votingEndDate.toLocaleDateString()}.`,
          `/land-acquisition/voting/${result.rows[0].id}`
        ]);
      }

      res.status(201).json({
        success: true,
        data: { proposalId: result.rows[0].id },
      });
    } catch (error) {
      console.error('Proposal create error:', error);
      res.status(500).json({ error: 'Failed to create proposal' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
