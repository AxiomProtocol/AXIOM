import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { proposalId } = req.query;
  const userId = req.headers['x-user-id'];

  if (req.method === 'GET') {
    try {
      const proposalResult = await pool.query(`
        SELECT 
          thp.*,
          u.wallet_address as proposer_name,
          cc.title as campaign_title,
          lap.name as pool_name
        FROM token_holder_proposals thp
        LEFT JOIN users u ON thp.proposer_id = u.id
        LEFT JOIN crowdfunding_campaigns cc ON thp.campaign_id = cc.id
        LEFT JOIN land_acquisition_pools lap ON thp.pool_id = lap.id
        WHERE thp.id = $1
      `, [proposalId]);

      if (!proposalResult.rows[0]) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      const votesResult = await pool.query(`
        SELECT 
          thv.*,
          u.wallet_address as voter_name
        FROM token_holder_votes thv
        LEFT JOIN users u ON thv.voter_id = u.id
        WHERE thv.proposal_id = $1
        ORDER BY thv.created_at DESC
      `, [proposalId]);

      const proposal = proposalResult.rows[0];

      res.status(200).json({
        success: true,
        data: {
          proposal: {
            id: proposal.id,
            title: proposal.title,
            description: proposal.description,
            proposalType: proposal.proposal_type,
            options: proposal.options || [],
            votingStartDate: proposal.voting_start_date,
            votingEndDate: proposal.voting_end_date,
            quorumPercentage: proposal.quorum_percentage,
            passingThreshold: proposal.passing_threshold,
            status: proposal.status,
            totalVotes: proposal.total_votes,
            totalVotingPower: proposal.total_voting_power,
            yesVotes: proposal.yes_votes,
            noVotes: proposal.no_votes,
            abstainVotes: proposal.abstain_votes,
            winningOption: proposal.winning_option,
            proposerName: proposal.proposer_name?.slice(0, 6) + '...',
            campaignTitle: proposal.campaign_title,
            poolName: proposal.pool_name,
            createdAt: proposal.created_at,
          },
          votes: votesResult.rows.map((v: any) => ({
            id: v.id,
            voterName: v.voter_name?.slice(0, 6) + '...',
            voteChoice: v.vote_choice,
            votingPower: v.voting_power,
            sharesHeld: v.shares_held,
            reason: v.reason,
            createdAt: v.created_at,
          })),
        },
      });
    } catch (error) {
      console.error('Proposal fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch proposal' });
    }
  } else if (req.method === 'POST') {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { voteChoice, reason } = req.body;

    if (!voteChoice || !['yes', 'no', 'abstain'].includes(voteChoice)) {
      return res.status(400).json({ error: 'Valid vote choice required (yes, no, abstain)' });
    }

    try {
      const proposalResult = await pool.query(
        `SELECT * FROM token_holder_proposals WHERE id = $1`,
        [proposalId]
      );

      const proposal = proposalResult.rows[0];
      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      if (proposal.status !== 'active') {
        return res.status(400).json({ error: 'Voting is not active for this proposal' });
      }

      if (new Date() > new Date(proposal.voting_end_date)) {
        return res.status(400).json({ error: 'Voting period has ended' });
      }

      const existingVote = await pool.query(
        `SELECT id FROM token_holder_votes WHERE proposal_id = $1 AND voter_id = $2`,
        [proposalId, userId]
      );

      if (existingVote.rows[0]) {
        return res.status(400).json({ error: 'You have already voted on this proposal' });
      }

      let sharesHeld = 0;
      
      if (proposal.campaign_id) {
        const investmentResult = await pool.query(
          `SELECT SUM(shares_received) as total FROM crowdfunding_investments 
           WHERE campaign_id = $1 AND investor_id = $2 AND status = 'confirmed'`,
          [proposal.campaign_id, userId]
        );
        sharesHeld = investmentResult.rows[0]?.total || 0;
      }
      
      if (proposal.pool_id) {
        const memberResult = await pool.query(
          `SELECT total_contributed FROM pool_members WHERE pool_id = $1 AND user_id = $2 AND active = true`,
          [proposal.pool_id, userId]
        );
        sharesHeld += parseFloat(memberResult.rows[0]?.total_contributed || 0);
      }

      if (sharesHeld === 0) {
        return res.status(403).json({ error: 'You must hold shares to vote' });
      }

      const userResult = await pool.query(
        `SELECT wallet_address FROM users WHERE id = $1`,
        [userId]
      );

      const votingPower = sharesHeld;

      await pool.query(`
        INSERT INTO token_holder_votes (proposal_id, voter_id, voter_wallet, vote_choice, voting_power, shares_held, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [proposalId, userId, userResult.rows[0]?.wallet_address, voteChoice, votingPower, sharesHeld, reason]);

      const voteColumn = voteChoice === 'yes' ? 'yes_votes' : voteChoice === 'no' ? 'no_votes' : 'abstain_votes';
      
      await pool.query(`
        UPDATE token_holder_proposals 
        SET total_votes = total_votes + 1, 
            total_voting_power = total_voting_power + $1,
            ${voteColumn} = ${voteColumn} + $1,
            updated_at = NOW()
        WHERE id = $2
      `, [votingPower, proposalId]);

      res.status(200).json({ success: true, message: 'Vote recorded' });
    } catch (error) {
      console.error('Vote error:', error);
      res.status(500).json({ error: 'Failed to record vote' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
