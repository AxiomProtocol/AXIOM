import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { address, nodeId } = req.query;

  try {
    const client = await pool.connect();
    try {
      let query = `
        SELECT * FROM depin_performance_metrics
        WHERE 1=1
      `;
      const params: any[] = [];

      if (address && typeof address === 'string') {
        params.push(address);
        query += ` AND LOWER(operator_address) = LOWER($${params.length})`;
      }

      if (nodeId) {
        params.push(parseInt(nodeId as string));
        query += ` AND node_id = $${params.length}`;
      }

      query += ` ORDER BY period_end DESC LIMIT 30`;

      const result = await client.query(query, params);

      const metrics = result.rows.map(row => ({
        id: row.id,
        nodeId: row.node_id,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        uptimePercentage: row.uptime_percentage,
        totalRequests: row.total_requests,
        successfulRequests: row.successful_requests,
        avgResponseTime: row.avg_response_time,
        bonusEarned: row.bonus_earned,
        slashingPenalty: row.slashing_penalty,
        performanceScore: row.performance_score,
        rank: row.rank
      }));

      const leaderboardResult = await client.query(`
        SELECT 
          node_id,
          operator_address,
          AVG(uptime_percentage) as avg_uptime,
          AVG(performance_score) as avg_score,
          SUM(bonus_earned) as total_bonus
        FROM depin_performance_metrics
        WHERE period_end > NOW() - INTERVAL '30 days'
        GROUP BY node_id, operator_address
        ORDER BY avg_score DESC
        LIMIT 10
      `);

      const leaderboard = leaderboardResult.rows.map((row, i) => ({
        rank: i + 1,
        nodeId: row.node_id,
        operatorAddress: row.operator_address,
        avgUptime: parseFloat(row.avg_uptime || '0').toFixed(2),
        avgScore: parseFloat(row.avg_score || '0').toFixed(2),
        totalBonus: parseFloat(row.total_bonus || '0').toFixed(8)
      }));

      res.json({
        metrics,
        leaderboard,
        summary: {
          avgUptime: metrics.length > 0 
            ? (metrics.reduce((sum, m) => sum + parseFloat(m.uptimePercentage || '0'), 0) / metrics.length).toFixed(2)
            : '0',
          totalBonus: metrics.reduce((sum, m) => sum + parseFloat(m.bonusEarned || '0'), 0).toFixed(8),
          totalPenalty: metrics.reduce((sum, m) => sum + parseFloat(m.slashingPenalty || '0'), 0).toFixed(8)
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ message: 'Failed to fetch metrics', error: error.message });
  }
}
