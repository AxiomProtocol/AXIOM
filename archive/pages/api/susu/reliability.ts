import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

function calculateReliabilityScore(profile: {
  totalContributions: number;
  onTimeContributions: number;
  lateContributions: number;
  missedContributions: number;
  earlyExits: number;
  ejections: number;
  totalPoolsCompleted: number;
  totalPoolsJoined: number;
}): number {
  if (profile.totalContributions === 0 && profile.totalPoolsJoined === 0) {
    return 100;
  }

  let score = 100;

  if (profile.totalContributions > 0) {
    const onTimeRate = profile.onTimeContributions / profile.totalContributions;
    score = score * (0.7 + (onTimeRate * 0.3));
  }

  score -= profile.lateContributions * 2;
  score -= profile.missedContributions * 10;
  score -= profile.earlyExits * 15;
  score -= profile.ejections * 25;

  if (profile.totalPoolsJoined > 0) {
    const completionRate = profile.totalPoolsCompleted / profile.totalPoolsJoined;
    score += completionRate * 10;
  }

  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId, walletAddress } = req.query;

      if (!userId && !walletAddress) {
        return res.status(400).json({ error: 'userId or walletAddress is required' });
      }

      let query = `
        SELECT 
          r.*,
          u.wallet_address
        FROM susu_reliability_profiles r
        JOIN users u ON r.user_id = u.id
      `;

      const params: any[] = [];

      if (userId) {
        query += ' WHERE r.user_id = $1';
        params.push(parseInt(userId as string));
      } else if (walletAddress) {
        query += ' WHERE LOWER(u.wallet_address) = LOWER($1)';
        params.push(walletAddress as string);
      }

      const { rows } = await pool.query(query, params);

      if (rows.length === 0) {
        return res.status(200).json({
          success: true,
          profile: null,
          message: 'No reliability profile found. User has not participated in any pools.'
        });
      }

      res.status(200).json({
        success: true,
        profile: rows[0]
      });
    } catch (error: any) {
      console.error('Error fetching reliability profile:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch profile' });
    }
  } else if (req.method === 'POST') {
    try {
      const { userId, event } = req.body;

      if (!userId || !event) {
        return res.status(400).json({ error: 'userId and event are required' });
      }

      const validEvents = [
        'pool_joined', 'pool_completed', 'contribution_on_time',
        'contribution_late', 'contribution_missed', 'early_exit', 'ejected'
      ];

      if (!validEvents.includes(event)) {
        return res.status(400).json({ 
          error: `Invalid event. Valid events: ${validEvents.join(', ')}` 
        });
      }

      const { rows: existingRows } = await pool.query(`
        SELECT * FROM susu_reliability_profiles WHERE user_id = $1
      `, [parseInt(userId)]);

      let profile;

      if (existingRows.length === 0) {
        const { rows: newRows } = await pool.query(`
          INSERT INTO susu_reliability_profiles (user_id)
          VALUES ($1)
          RETURNING *
        `, [parseInt(userId)]);
        profile = newRows[0];
      } else {
        profile = existingRows[0];
      }

      const updates: Record<string, number> = {};

      switch (event) {
        case 'pool_joined':
          updates.total_pools_joined = (profile.total_pools_joined || 0) + 1;
          break;
        case 'pool_completed':
          updates.total_pools_completed = (profile.total_pools_completed || 0) + 1;
          break;
        case 'contribution_on_time':
          updates.total_contributions = (profile.total_contributions || 0) + 1;
          updates.on_time_contributions = (profile.on_time_contributions || 0) + 1;
          break;
        case 'contribution_late':
          updates.total_contributions = (profile.total_contributions || 0) + 1;
          updates.late_contributions = (profile.late_contributions || 0) + 1;
          break;
        case 'contribution_missed':
          updates.total_contributions = (profile.total_contributions || 0) + 1;
          updates.missed_contributions = (profile.missed_contributions || 0) + 1;
          break;
        case 'early_exit':
          updates.early_exits = (profile.early_exits || 0) + 1;
          break;
        case 'ejected':
          updates.ejections = (profile.ejections || 0) + 1;
          break;
      }

      const updatedProfile = { ...profile, ...updates };
      const newScore = calculateReliabilityScore({
        totalContributions: updatedProfile.total_contributions || 0,
        onTimeContributions: updatedProfile.on_time_contributions || 0,
        lateContributions: updatedProfile.late_contributions || 0,
        missedContributions: updatedProfile.missed_contributions || 0,
        earlyExits: updatedProfile.early_exits || 0,
        ejections: updatedProfile.ejections || 0,
        totalPoolsCompleted: updatedProfile.total_pools_completed || 0,
        totalPoolsJoined: updatedProfile.total_pools_joined || 0
      });

      const setClauses = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`);
      setClauses.push(`reliability_score = $${Object.keys(updates).length + 2}`);
      setClauses.push(`updated_at = NOW()`);

      const { rows: finalRows } = await pool.query(`
        UPDATE susu_reliability_profiles
        SET ${setClauses.join(', ')}
        WHERE user_id = $1
        RETURNING *
      `, [parseInt(userId), ...Object.values(updates), newScore]);

      res.status(200).json({
        success: true,
        profile: finalRows[0],
        event,
        previousScore: profile.reliability_score,
        newScore
      });
    } catch (error: any) {
      console.error('Error updating reliability profile:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to update profile' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
