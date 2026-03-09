import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM syn_reports WHERE offering_id = $1 ORDER BY created_at DESC`,
        [id]
      );
      return res.status(200).json({ success: true, reports: result.rows });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, reportType, content } = req.body;
      if (!title || !reportType) {
        return res.status(400).json({ success: false, error: 'title and reportType are required' });
      }

      const result = await pool.query(
        `INSERT INTO syn_reports (offering_id, title, report_type, content, published_at)
         VALUES ($1, $2, $3, $4, now()) RETURNING id`,
        [id, title, reportType, content || null]
      );

      return res.status(201).json({ success: true, reportId: result.rows[0].id });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
