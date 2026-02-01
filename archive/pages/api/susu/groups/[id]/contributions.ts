import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const groupId = parseInt(id as string);

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT c.*, u.username, u.first_name, u.last_name, u.wallet_address
         FROM susu_contributions c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.group_id = $1
         ORDER BY c.cycle_number DESC, c.created_at DESC`,
        [groupId]
      );

      const summary = await pool.query(
        `SELECT 
           COUNT(*) as total_contributions,
           SUM(amount) as total_amount,
           COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
           COUNT(CASE WHEN is_late = true THEN 1 END) as late_count
         FROM susu_contributions WHERE group_id = $1`,
        [groupId]
      );

      res.status(200).json({ 
        success: true, 
        contributions: result.rows,
        summary: summary.rows[0]
      });
    } catch (error: any) {
      console.error('Error fetching contributions:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { userId, amount, cycleNumber, dueDate } = req.body;
      
      const result = await pool.query(
        `INSERT INTO susu_contributions (group_id, user_id, amount, cycle_number, due_date, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [groupId, userId, amount, cycleNumber || 1, dueDate]
      );

      res.status(201).json({ success: true, contribution: result.rows[0] });
    } catch (error: any) {
      console.error('Error creating contribution:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
