import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { sectionKey } = req.query;
      
      let result;
      if (sectionKey && typeof sectionKey === 'string') {
        result = await pool.query(
          `SELECT id, section_key as "sectionKey", title, url, notes, active, created_at as "createdAt"
           FROM resource_directory_items 
           WHERE active = true AND section_key = $1
           ORDER BY title`,
          [sectionKey]
        );
      } else {
        result = await pool.query(
          `SELECT id, section_key as "sectionKey", title, url, notes, active, created_at as "createdAt"
           FROM resource_directory_items 
           WHERE active = true
           ORDER BY section_key, title`
        );
      }

      return res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      return res.status(500).json({ error: 'Failed to fetch resources' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
