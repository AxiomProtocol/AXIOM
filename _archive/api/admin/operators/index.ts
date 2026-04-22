import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          o.operator_id, o.wallet_address, o.display_name, o.email, 
          o.role, o.status, o.onboarding_phase, o.created_at, o.activated_at,
          o.attestation_count, o.total_earnings
        FROM node_operators o
        ORDER BY o.created_at DESC
      `);

      const operators = result.rows.map(row => ({
        operatorId: row.operator_id,
        walletAddress: row.wallet_address,
        displayName: row.display_name,
        email: row.email,
        role: row.role,
        status: row.status,
        onboardingPhase: row.onboarding_phase,
        createdAt: row.created_at,
        activatedAt: row.activated_at,
        attestationCount: row.attestation_count || 0,
        totalEarnings: parseFloat(row.total_earnings) || 0,
      }));

      res.status(200).json({ operators });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching operators:', error);
    if (error.code === '42P01') {
      return res.status(200).json({ operators: [] });
    }
    res.status(500).json({ message: 'Failed to fetch operators' });
  }
}
