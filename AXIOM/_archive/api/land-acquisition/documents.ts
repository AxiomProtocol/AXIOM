import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { submissionId } = req.query;
      
      if (!submissionId) {
        return res.status(400).json({ success: false, error: 'Submission ID required' });
      }

      const result = await db.execute(sql`
        SELECT * FROM land_documents 
        WHERE submission_id = ${parseInt(submissionId as string)}
        ORDER BY created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: result.rows
      });
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { submissionId, documentType, originalFilename, objectPath, fileSize, mimeType, description } = req.body;

      if (!submissionId || !objectPath || !originalFilename) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: submissionId, objectPath, originalFilename' 
        });
      }

      const result = await db.execute(sql`
        INSERT INTO land_documents (
          submission_id, document_type, original_filename, stored_filename,
          file_path, file_size, mime_type, description, created_at
        ) VALUES (
          ${parseInt(submissionId)},
          ${documentType || 'other'},
          ${originalFilename},
          ${objectPath.split('/').pop() || originalFilename},
          ${objectPath},
          ${fileSize || 0},
          ${mimeType || 'application/octet-stream'},
          ${description || null},
          NOW()
        )
        RETURNING *
      `);

      return res.status(201).json({
        success: true,
        data: {
          document: result.rows[0],
          message: 'Document uploaded successfully'
        }
      });
    } catch (error: any) {
      console.error('Error saving document:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { documentId } = req.query;

      if (!documentId) {
        return res.status(400).json({ success: false, error: 'Document ID required' });
      }

      const existing = await db.execute(sql`
        SELECT * FROM land_documents WHERE id = ${parseInt(documentId as string)}
      `);

      if (!existing.rows || existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      await db.execute(sql`
        DELETE FROM land_documents WHERE id = ${parseInt(documentId as string)}
      `);

      return res.status(200).json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
