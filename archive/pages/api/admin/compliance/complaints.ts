import type { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../../lib/adminAuth';
import { pool } from '../../../../lib/db';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { status, limit = '50', offset = '0' } = req.query;
      
      let query = `
        SELECT * FROM compliance_complaints
      `;
      const params: any[] = [];
      let paramIndex = 1;
      
      if (status && typeof status === 'string' && status !== 'all') {
        query += ` WHERE status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      query += ` ORDER BY 
        CASE WHEN status = 'pending' THEN 0
             WHEN status = 'investigating' THEN 1
             WHEN status = 'resolved' THEN 2
             ELSE 3 END,
        created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit as string), parseInt(offset as string));
      
      const result = await pool.query(query, params);
      
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
          COUNT(*) FILTER (WHERE status = 'investigating')::int as investigating,
          COUNT(*) FILTER (WHERE status = 'resolved')::int as resolved,
          COUNT(*) FILTER (WHERE status = 'dismissed')::int as dismissed
        FROM compliance_complaints
      `);
      
      return res.status(200).json({ 
        complaints: result.rows,
        stats: statsResult.rows[0]
      });
    } catch (error) {
      console.error('Error fetching complaints:', error);
      return res.status(500).json({ error: 'Failed to fetch complaints' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler);
