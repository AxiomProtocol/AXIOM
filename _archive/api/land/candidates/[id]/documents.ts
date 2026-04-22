import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, error: 'Invalid ID' });
  }

  const candidateId = parseInt(id, 10);
  if (isNaN(candidateId)) {
    return res.status(400).json({ success: false, error: 'ID must be a number' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT id, document_type, original_filename, file_path, file_size, mime_type, description, created_at
         FROM land_documents
         WHERE land_submission_id = $1
         ORDER BY created_at DESC`,
        [candidateId]
      );

      return res.status(200).json({
        success: true,
        data: result.rows.map(doc => ({
          id: doc.id,
          documentType: doc.document_type,
          originalFilename: doc.original_filename,
          filePath: doc.file_path,
          fileSize: doc.file_size,
          mimeType: doc.mime_type,
          description: doc.description,
          createdAt: doc.created_at
        }))
      });
    } catch (error) {
      console.error('Documents fetch error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch documents' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        documentType,
        originalFilename,
        storedFilename,
        filePath,
        fileSize,
        mimeType,
        description
      } = req.body;

      if (!originalFilename || !filePath) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const result = await pool.query(
        `INSERT INTO land_documents (
          land_submission_id, document_type, original_filename, stored_filename, 
          file_path, file_size, mime_type, description, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *`,
        [
          candidateId,
          documentType || 'other',
          originalFilename,
          storedFilename || originalFilename,
          filePath,
          fileSize || 0,
          mimeType || 'application/octet-stream',
          description || null
        ]
      );

      const doc = result.rows[0];
      return res.status(201).json({
        success: true,
        data: {
          id: doc.id,
          documentType: doc.document_type,
          originalFilename: doc.original_filename,
          filePath: doc.file_path,
          fileSize: doc.file_size,
          mimeType: doc.mime_type,
          description: doc.description,
          createdAt: doc.created_at
        }
      });
    } catch (error) {
      console.error('Document create error:', error);
      return res.status(500).json({ success: false, error: 'Failed to add document' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { documentId } = req.body;
      
      if (!documentId) {
        return res.status(400).json({ success: false, error: 'Document ID required' });
      }

      await pool.query(
        'DELETE FROM land_documents WHERE id = $1 AND land_submission_id = $2',
        [documentId, candidateId]
      );

      return res.status(200).json({ success: true, message: 'Document deleted' });
    } catch (error) {
      console.error('Document delete error:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete document' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
