import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, description, icon, sort_order as "sortOrder", is_active as "isActive" 
       FROM susu_purpose_categories 
       WHERE is_active = true 
       ORDER BY sort_order ASC`
    );

    res.status(200).json({
      success: true,
      categories: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch categories' });
  }
}
