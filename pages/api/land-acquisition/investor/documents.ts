import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT 
          id.id,
          id.document_type,
          id.title,
          id.description,
          id.file_url,
          id.file_size,
          id.mime_type,
          id.generated_at,
          id.created_at,
          cc.title as campaign_title,
          lap.name as pool_name
        FROM investor_documents id
        LEFT JOIN crowdfunding_campaigns cc ON id.campaign_id = cc.id
        LEFT JOIN land_acquisition_pools lap ON id.pool_id = lap.id
        WHERE id.user_id = $1
        ORDER BY id.created_at DESC
      `, [userId]);

      res.status(200).json({
        success: true,
        data: {
          documents: result.rows.map((doc: any) => ({
            id: doc.id,
            type: doc.document_type,
            title: doc.title,
            description: doc.description,
            fileUrl: doc.file_url,
            fileSize: doc.file_size,
            mimeType: doc.mime_type,
            campaignTitle: doc.campaign_title,
            poolName: doc.pool_name,
            generatedAt: doc.generated_at,
            createdAt: doc.created_at,
          })),
        },
      });
    } catch (error) {
      console.error('Documents fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
