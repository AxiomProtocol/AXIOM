import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { isAdminWallet } from '../../../../../lib/admin/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminWallet = req.headers['x-admin-wallet'] as string | undefined;
  if (!isAdminWallet(adminWallet)) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const { id } = req.query;
  const noteId = parseInt(id as string, 10);
  
  if (isNaN(noteId)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  if (req.method === 'GET') {
    return handleGetDocuments(noteId, res);
  } else if (req.method === 'POST') {
    return handleAddDocument(noteId, req, res);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetDocuments(noteId: number, res: NextApiResponse) {
  try {
    const noteCheck = await pool.query('SELECT id FROM private_credit_notes WHERE id = $1', [noteId]);
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const query = `
      SELECT * FROM note_documents 
      WHERE note_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [noteId]);
    
    return res.status(200).json({
      documents: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
}

async function handleAddDocument(noteId: number, req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      documentType,
      fileName,
      fileUrl,
      fileHash,
    } = req.body;
    
    if (!documentType || !fileName) {
      return res.status(400).json({ 
        error: 'Missing required fields: documentType, fileName' 
      });
    }
    
    const noteCheck = await pool.query('SELECT id FROM private_credit_notes WHERE id = $1', [noteId]);
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const insertQuery = `
      INSERT INTO note_documents (
        note_id, document_type, file_name, file_url, file_hash, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, 1)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      noteId, documentType, fileName, fileUrl || null, fileHash || null,
    ]);
    
    return res.status(201).json({ 
      success: true, 
      document: result.rows[0],
      message: 'Document added successfully'
    });
  } catch (error) {
    console.error('Error adding document:', error);
    return res.status(500).json({ error: 'Failed to add document' });
  }
}
