import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    try {
      const operatorStatsResult = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
          SUM(attestation_count) as total_attestations,
          SUM(total_earnings::numeric) as total_rewards
        FROM node_operators
      `);

      const stats = operatorStatsResult.rows[0];

      const roleBreakdownResult = await client.query(`
        SELECT role, COUNT(*) as count
        FROM node_operators
        WHERE status = 'ACTIVE'
        GROUP BY role
      `);

      const roleBreakdown = roleBreakdownResult.rows.reduce((acc: any, row: any) => {
        acc[row.role] = parseInt(row.count);
        return acc;
      }, {});

      const phaseBreakdownResult = await client.query(`
        SELECT onboarding_phase, COUNT(*) as count
        FROM node_operators
        WHERE status IN ('PENDING', 'ONBOARDING')
        GROUP BY onboarding_phase
      `);

      const phaseBreakdown = phaseBreakdownResult.rows.reduce((acc: any, row: any) => {
        acc[row.onboarding_phase] = parseInt(row.count);
        return acc;
      }, {});

      res.status(200).json({
        totalOperators: parseInt(stats.total) || 0,
        activeOperators: parseInt(stats.active) || 0,
        totalAttestations: parseInt(stats.total_attestations) || 0,
        totalRewardsUsd: parseFloat(stats.total_rewards) || 0,
        roleBreakdown,
        phaseBreakdown,
        observationWindowEnd: '2026-03-26',
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    if (error.code === '42P01') {
      return res.status(200).json({
        totalOperators: 0,
        activeOperators: 0,
        totalAttestations: 0,
        totalRewardsUsd: 0,
        roleBreakdown: {},
        phaseBreakdown: {},
        observationWindowEnd: '2026-03-26',
      });
    }
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
}
