import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId, isPublic, categoryId, limit } = req.query;

      let query = `
        SELECT 
          m.*,
          u.wallet_address,
          c.name as category_name,
          c.icon as category_icon,
          CASE 
            WHEN m.target_amount > 0 THEN 
              ROUND((m.current_amount::numeric / m.target_amount::numeric) * 100, 1)
            ELSE 0 
          END as progress_percent
        FROM susu_mission_cards m
        JOIN users u ON m.user_id = u.id
        LEFT JOIN susu_purpose_categories c ON m.purpose_category_id = c.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (userId) {
        query += ` AND m.user_id = $${paramIndex}`;
        params.push(parseInt(userId as string));
        paramIndex++;
      }

      if (isPublic === 'true') {
        query += ` AND m.is_public = true`;
      }

      if (categoryId) {
        query += ` AND m.purpose_category_id = $${paramIndex}`;
        params.push(parseInt(categoryId as string));
        paramIndex++;
      }

      query += ' ORDER BY m.created_at DESC';

      if (limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(parseInt(limit as string));
      }

      const { rows } = await pool.query(query, params);

      res.status(200).json({
        success: true,
        missionCards: rows
      });
    } catch (error: any) {
      console.error('Error fetching mission cards:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch mission cards' });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        userId,
        title,
        goalDescription,
        targetAmount,
        targetDate,
        purposeCategoryId,
        isPublic
      } = req.body;

      if (!userId || !title) {
        return res.status(400).json({ error: 'userId and title are required' });
      }

      const { rows } = await pool.query(`
        INSERT INTO susu_mission_cards (
          user_id, title, goal_description, target_amount,
          target_date, purpose_category_id, is_public
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        parseInt(userId),
        title,
        goalDescription || null,
        targetAmount ? parseFloat(targetAmount) : null,
        targetDate ? new Date(targetDate) : null,
        purposeCategoryId ? parseInt(purposeCategoryId) : null,
        isPublic !== false
      ]);

      res.status(201).json({
        success: true,
        missionCard: rows[0]
      });
    } catch (error: any) {
      console.error('Error creating mission card:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to create mission card' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, currentAmount, isCompleted, shareIncrement } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const updates: string[] = [];
      const params: any[] = [parseInt(id)];
      let paramIndex = 2;

      if (currentAmount !== undefined) {
        updates.push(`current_amount = $${paramIndex}`);
        params.push(parseFloat(currentAmount));
        paramIndex++;
      }

      if (isCompleted !== undefined) {
        updates.push(`is_completed = $${paramIndex}`);
        params.push(isCompleted);
        paramIndex++;
        if (isCompleted) {
          updates.push(`completed_at = NOW()`);
        }
      }

      if (shareIncrement) {
        updates.push(`share_count = share_count + 1`);
      }

      updates.push(`updated_at = NOW()`);

      const { rows } = await pool.query(`
        UPDATE susu_mission_cards
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING *
      `, params);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Mission card not found' });
      }

      res.status(200).json({
        success: true,
        missionCard: rows[0]
      });
    } catch (error: any) {
      console.error('Error updating mission card:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to update mission card' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
