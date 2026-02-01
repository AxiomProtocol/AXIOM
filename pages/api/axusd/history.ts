import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { days = '30' } = req.query;
  const daysNum = parseInt(days as string, 10) || 30;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    const result = await pool.query(
      `SELECT * FROM axusd_snapshots 
       WHERE snapshot_date >= $1 
       ORDER BY snapshot_date DESC 
       LIMIT $2`,
      [cutoffDate.toISOString(), daysNum]
    );

    const snapshots = result.rows;

    const latest = snapshots[0];
    const oldest = snapshots[snapshots.length - 1];

    const chartData = [...snapshots].reverse().map((s: any) => ({
      date: s.snapshot_date?.toISOString().split('T')[0],
      totalSupply: parseFloat(s.total_supply || '0'),
      reserves: parseFloat(s.psm_reserve_usdc || '0') + parseFloat(s.backstop_reserve_usdc || '0'),
      reserveRatio: parseFloat(s.reserve_ratio || '0'),
      pegPrice: parseFloat(s.peg_price || '1'),
      tvl: parseFloat(s.lp_tvl || '0'),
      apr: parseFloat(s.lp_apr || '0')
    }));

    let growthMetrics = null;
    if (latest && oldest) {
      const supplyGrowth = parseFloat(latest.total_supply || '0') - parseFloat(oldest.total_supply || '0');
      const tvlGrowth = parseFloat(latest.lp_tvl || '0') - parseFloat(oldest.lp_tvl || '0');
      
      growthMetrics = {
        supplyGrowth: supplyGrowth.toFixed(2),
        supplyGrowthPercent: oldest.total_supply && parseFloat(oldest.total_supply) > 0 
          ? ((supplyGrowth / parseFloat(oldest.total_supply)) * 100).toFixed(2) 
          : '0',
        tvlGrowth: tvlGrowth.toFixed(2),
        tvlGrowthPercent: oldest.lp_tvl && parseFloat(oldest.lp_tvl) > 0 
          ? ((tvlGrowth / parseFloat(oldest.lp_tvl)) * 100).toFixed(2) 
          : '0',
        periodDays: daysNum
      };
    }

    res.status(200).json({
      success: true,
      data: {
        snapshots: chartData,
        growthMetrics,
        latestSnapshot: latest ? {
          date: latest.snapshot_date?.toISOString(),
          totalSupply: latest.total_supply,
          reserves: (parseFloat(latest.psm_reserve_usdc || '0') + parseFloat(latest.backstop_reserve_usdc || '0')).toFixed(2),
          reserveRatio: latest.reserve_ratio,
          pegPrice: latest.peg_price,
          tvl: latest.lp_tvl,
          apr: latest.lp_apr
        } : null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('History API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch historical data',
      details: error.message
    });
  }
}
