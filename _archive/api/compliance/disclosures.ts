import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { category, featureId, location } = req.query;
      
      let query = `
        SELECT * FROM compliance_disclosures
        WHERE is_active = true
        AND (expires_at IS NULL OR expires_at >= NOW())
      `;
      const params: any[] = [];
      let paramIndex = 1;
      
      if (category && typeof category === 'string') {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }
      
      if (featureId && typeof featureId === 'string') {
        query += ` AND feature_id = $${paramIndex}`;
        params.push(featureId);
        paramIndex++;
      }
      
      if (location && typeof location === 'string') {
        query += ` AND display_location = $${paramIndex}`;
        params.push(location);
        paramIndex++;
      }
      
      query += ` ORDER BY effective_date DESC`;
      
      const result = await pool.query(query, params);
      
      return res.status(200).json({ disclosures: result.rows });
    } catch (error) {
      console.error('Error fetching disclosures:', error);
      return res.status(500).json({ error: 'Failed to fetch disclosures' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
