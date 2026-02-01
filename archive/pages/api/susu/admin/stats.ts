import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

const ADMIN_WALLETS = [
  '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96',
].map(w => w.toLowerCase());

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const walletAddress = req.headers['x-wallet-address'] as string;
  if (!walletAddress || !ADMIN_WALLETS.includes(walletAddress.toLowerCase())) {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }

  try {
    const { hubId, startDate, endDate } = req.query;

    const params: any[] = [];
    let paramIndex = 1;
    let hubFilter = '';
    let dateFilter = '';

    if (hubId) {
      const parsedHubId = parseInt(hubId as string);
      if (!isNaN(parsedHubId)) {
        hubFilter = `AND hub_id = $${paramIndex}`;
        params.push(parsedHubId);
        paramIndex++;
      }
    }

    if (startDate && endDate) {
      const startDateStr = String(startDate).slice(0, 10);
      const endDateStr = String(endDate).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(startDateStr) && /^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
        dateFilter = `AND created_at >= $${paramIndex} AND created_at <= $${paramIndex + 1}`;
        params.push(startDateStr, endDateStr);
        paramIndex += 2;
      }
    }

    const [hubStats, groupStats, eventStats, funnelStats] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total_hubs,
          SUM(member_count) as total_hub_members
        FROM susu_interest_hubs
        WHERE is_active = true
      `),
      pool.query(
        `SELECT 
          COUNT(*) as total_groups,
          COUNT(CASE WHEN graduated_to_pool_id IS NOT NULL THEN 1 END) as graduated_groups,
          SUM(member_count) as total_group_members
        FROM susu_purpose_groups
        WHERE is_active = true ${hubFilter}`,
        hubId ? [parseInt(hubId as string)] : []
      ),
      pool.query(
        `SELECT 
          event_type,
          COUNT(*) as count
        FROM susu_analytics_events
        WHERE 1=1 ${hubFilter} ${dateFilter}
        GROUP BY event_type
        ORDER BY count DESC`,
        params
      ),
      pool.query(
        `SELECT 
          DATE(created_at) as date,
          event_type,
          COUNT(*) as count
        FROM susu_analytics_events
        WHERE created_at >= NOW() - INTERVAL '30 days' ${hubFilter}
        GROUP BY DATE(created_at), event_type
        ORDER BY date DESC`,
        hubId ? [parseInt(hubId as string)] : []
      )
    ]);

    const eventCounts = eventStats.rows.reduce((acc: any, row: any) => {
      acc[row.event_type] = parseInt(row.count);
      return acc;
    }, {});

    const conversionRate = eventCounts.group_join && eventCounts.hub_join
      ? ((eventCounts.group_join / eventCounts.hub_join) * 100).toFixed(1)
      : '0';

    const graduationRate = eventCounts.graduation && eventCounts.group_create
      ? ((eventCounts.graduation / eventCounts.group_create) * 100).toFixed(1)
      : '0';

    res.status(200).json({
      success: true,
      stats: {
        totalHubs: parseInt(hubStats.rows[0]?.total_hubs || 0),
        totalHubMembers: parseInt(hubStats.rows[0]?.total_hub_members || 0),
        totalGroups: parseInt(groupStats.rows[0]?.total_groups || 0),
        graduatedGroups: parseInt(groupStats.rows[0]?.graduated_groups || 0),
        totalGroupMembers: parseInt(groupStats.rows[0]?.total_group_members || 0),
        events: eventCounts,
        conversionRate,
        graduationRate,
        dailyFunnel: funnelStats.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching SUSU admin stats:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch stats' });
  }
}
