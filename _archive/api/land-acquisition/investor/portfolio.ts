import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const investmentsResult = await pool.query(`
      SELECT 
        ci.id,
        ci.campaign_id,
        ci.amount,
        ci.shares_received,
        ci.status,
        ci.created_at,
        cc.title as campaign_title,
        cc.status as campaign_status,
        cc.raised_amount,
        cc.target_amount,
        lo.location,
        lo.acreage,
        lo.property_type,
        lo.featured_image
      FROM crowdfunding_investments ci
      JOIN crowdfunding_campaigns cc ON ci.campaign_id = cc.id
      JOIN land_options lo ON cc.land_option_id = lo.id
      WHERE ci.investor_id = $1 AND ci.status != 'refunded'
      ORDER BY ci.created_at DESC
    `, [userId]);

    const poolMembershipsResult = await pool.query(`
      SELECT 
        pm.id,
        pm.pool_id,
        pm.total_contributed,
        pm.cycles_completed,
        pm.active,
        pm.joined_at,
        lap.name as pool_name,
        lap.status as pool_status,
        lap.target_amount,
        lap.total_contributed as pool_total,
        lap.member_count,
        lo.location,
        lo.acreage
      FROM pool_members pm
      JOIN land_acquisition_pools lap ON pm.pool_id = lap.id
      LEFT JOIN land_options lo ON lap.land_option_id = lo.id
      WHERE pm.user_id = $1 AND pm.active = true
      ORDER BY pm.joined_at DESC
    `, [userId]);

    const notificationsResult = await pool.query(`
      SELECT COUNT(*) as unread_count
      FROM investor_notifications
      WHERE user_id = $1 AND read = false
    `, [userId]);

    const pendingVotesResult = await pool.query(`
      SELECT COUNT(*) as pending_count
      FROM token_holder_proposals thp
      WHERE thp.status = 'active'
      AND (
        thp.campaign_id IN (SELECT campaign_id FROM crowdfunding_investments WHERE investor_id = $1)
        OR thp.pool_id IN (SELECT pool_id FROM pool_members WHERE user_id = $1)
      )
      AND NOT EXISTS (
        SELECT 1 FROM token_holder_votes thv 
        WHERE thv.proposal_id = thp.id AND thv.voter_id = $1
      )
    `, [userId]);

    const investments = investmentsResult.rows;
    const poolMemberships = poolMembershipsResult.rows;

    const totalInvested = investments.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount || 0), 0) +
                          poolMemberships.reduce((sum: number, pm: any) => sum + parseFloat(pm.total_contributed || 0), 0);
    const totalShares = investments.reduce((sum: number, inv: any) => sum + (inv.shares_received || 0), 0);

    const portfolioSummary = {
      totalInvested: totalInvested.toFixed(2),
      totalCurrentValue: totalInvested.toFixed(2),
      totalReturns: '0.00',
      activeCampaigns: investments.filter((inv: any) => inv.campaign_status === 'live' || inv.campaign_status === 'funded').length,
      activePools: poolMemberships.filter((pm: any) => pm.pool_status === 'active' || pm.pool_status === 'forming').length,
      totalSharesOwned: totalShares,
      pendingVotes: parseInt(pendingVotesResult.rows[0]?.pending_count || 0),
      unreadNotifications: parseInt(notificationsResult.rows[0]?.unread_count || 0),
    };

    res.status(200).json({
      success: true,
      data: {
        summary: portfolioSummary,
        investments: investments.map((inv: any) => ({
          id: inv.id,
          campaignId: inv.campaign_id,
          campaignTitle: inv.campaign_title,
          amount: inv.amount,
          sharesReceived: inv.shares_received,
          status: inv.status,
          campaignStatus: inv.campaign_status,
          location: inv.location,
          acreage: inv.acreage,
          propertyType: inv.property_type,
          featuredImage: inv.featured_image,
          percentFunded: ((parseFloat(inv.raised_amount) / parseFloat(inv.target_amount)) * 100).toFixed(1),
          investedAt: inv.created_at,
        })),
        poolMemberships: poolMemberships.map((pm: any) => ({
          id: pm.id,
          poolId: pm.pool_id,
          poolName: pm.pool_name,
          contributed: pm.total_contributed,
          cyclesCompleted: pm.cycles_completed,
          poolStatus: pm.pool_status,
          location: pm.location,
          acreage: pm.acreage,
          memberCount: pm.member_count,
          percentFunded: ((parseFloat(pm.pool_total) / parseFloat(pm.target_amount)) * 100).toFixed(1),
          joinedAt: pm.joined_at,
        })),
      },
    });
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
}
