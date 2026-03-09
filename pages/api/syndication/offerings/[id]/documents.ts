import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM syn_offering_documents WHERE offering_id = $1 ORDER BY created_at DESC`,
        [id]
      );
      return res.status(200).json({ success: true, documents: result.rows });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, docType, url, visibility } = req.body;
      if (!name || !docType) {
        return res.status(400).json({ success: false, error: 'name and docType are required' });
      }

      const result = await pool.query(
        `INSERT INTO syn_offering_documents (offering_id, name, doc_type, url, visibility)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [id, name, docType, url || null, visibility || 'private']
      );

      return res.status(201).json({ success: true, documentId: result.rows[0].id });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { documentId } = req.body;
      if (!documentId) {
        return res.status(400).json({ success: false, error: 'documentId is required' });
      }

      await pool.query(
        `DELETE FROM syn_offering_documents WHERE id = $1 AND offering_id = $2`,
        [documentId, id]
      );

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
