import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { category, status, featureId } = req.query;
      
      let query = `
        SELECT c.*, 
          COALESCE(json_agg(e.*) FILTER (WHERE e.id IS NOT NULL), '[]') as evidence
        FROM compliance_claims c
        LEFT JOIN compliance_evidence e ON e.claim_id = c.id
        WHERE c.is_public = true
      `;
      const params: any[] = [];
      let paramIndex = 1;
      
      if (category && typeof category === 'string') {
        query += ` AND c.category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }
      
      if (status && typeof status === 'string') {
        query += ` AND c.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (featureId && typeof featureId === 'string') {
        query += ` AND c.feature_id = $${paramIndex}`;
        params.push(featureId);
        paramIndex++;
      }
      
      query += ` GROUP BY c.id ORDER BY c.display_order DESC, c.created_at DESC`;
      
      const result = await pool.query(query, params);
      
      return res.status(200).json({ claims: result.rows });
    } catch (error) {
      console.error('Error fetching compliance claims:', error);
      return res.status(500).json({ error: 'Failed to fetch compliance claims' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
