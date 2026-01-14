import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Missing required field: walletAddress' });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    const hubId = parseInt(id as string);
    const normalizedWallet = walletAddress.toLowerCase();

    const hubResult = await pool.query(
      `SELECT id, is_active FROM susu_interest_hubs WHERE id = $1 AND is_active = true LIMIT 1`,
      [hubId]
    );

    if (hubResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hub not found' });
    }

    const existingResult = await pool.query(
      `SELECT id FROM susu_hub_members WHERE hub_id = $1 AND user_id = $2 LIMIT 1`,
      [hubId, normalizedWallet]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Already a member of this hub' });
    }

    await pool.query(
      `INSERT INTO susu_hub_members (hub_id, user_id, role, joined_at) VALUES ($1, $2, 'member', NOW())`,
      [hubId, normalizedWallet]
    );

    await pool.query(
      `UPDATE susu_interest_hubs SET member_count = member_count + 1, updated_at = NOW() WHERE id = $1`,
      [hubId]
    );

    await pool.query(
      `INSERT INTO susu_analytics_events (event_type, hub_id, user_id, created_at)
       VALUES ('hub_join', $1, $2, NOW())`,
      [hubId, normalizedWallet]
    );

    res.status(200).json({ success: true, message: 'Successfully joined hub' });
  } catch (error: any) {
    console.error('Error joining hub:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to join hub' });
  }
}
