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
    return handleGetCovenants(noteId, res);
  } else if (req.method === 'POST') {
    return handleAddCovenant(noteId, req, res);
  } else if (req.method === 'PUT') {
    return handleUpdateCovenant(noteId, req, res);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetCovenants(noteId: number, res: NextApiResponse) {
  try {
    const noteCheck = await pool.query('SELECT id FROM private_credit_notes WHERE id = $1', [noteId]);
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const query = `
      SELECT * FROM note_covenants 
      WHERE note_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [noteId]);
    
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_covenants,
        COUNT(*) FILTER (WHERE is_compliant = true) as compliant_count,
        COUNT(*) FILTER (WHERE is_compliant = false) as non_compliant_count,
        COUNT(*) FILTER (WHERE is_compliant IS NULL) as unchecked_count
      FROM note_covenants
      WHERE note_id = $1
    `;
    const summaryResult = await pool.query(summaryQuery, [noteId]);
    
    return res.status(200).json({
      covenants: result.rows,
      summary: {
        totalCovenants: parseInt(summaryResult.rows[0].total_covenants, 10),
        compliantCount: parseInt(summaryResult.rows[0].compliant_count, 10),
        nonCompliantCount: parseInt(summaryResult.rows[0].non_compliant_count, 10),
        uncheckedCount: parseInt(summaryResult.rows[0].unchecked_count, 10),
      }
    });
  } catch (error) {
    console.error('Error fetching covenants:', error);
    return res.status(500).json({ error: 'Failed to fetch covenants' });
  }
}

async function handleAddCovenant(noteId: number, req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      covenantName,
      description,
      checkFrequency = 'monthly',
      isCompliant,
      notes,
    } = req.body;
    
    if (!covenantName) {
      return res.status(400).json({ error: 'Missing required field: covenantName' });
    }
    
    const noteCheck = await pool.query('SELECT id FROM private_credit_notes WHERE id = $1', [noteId]);
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const insertQuery = `
      INSERT INTO note_covenants (
        note_id, covenant_name, description, check_frequency,
        is_compliant, last_checked_at, last_checked_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      noteId, covenantName, description, checkFrequency,
      isCompliant !== undefined ? isCompliant : null,
      isCompliant !== undefined ? new Date() : null,
      isCompliant !== undefined ? 1 : null,
      notes,
    ]);
    
    return res.status(201).json({ 
      success: true, 
      covenant: result.rows[0],
      message: 'Covenant added successfully'
    });
  } catch (error) {
    console.error('Error adding covenant:', error);
    return res.status(500).json({ error: 'Failed to add covenant' });
  }
}

async function handleUpdateCovenant(noteId: number, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { covenantId, isCompliant, notes } = req.body;
    
    if (!covenantId) {
      return res.status(400).json({ error: 'Missing required field: covenantId' });
    }
    
    const covenantCheck = await pool.query(
      'SELECT id FROM note_covenants WHERE id = $1 AND note_id = $2', 
      [covenantId, noteId]
    );
    if (covenantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Covenant not found' });
    }
    
    const updateQuery = `
      UPDATE note_covenants 
      SET is_compliant = $1, 
          last_checked_at = NOW(), 
          last_checked_by = 1,
          notes = COALESCE($2, notes),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [isCompliant, notes, covenantId]);
    
    return res.status(200).json({ 
      success: true, 
      covenant: result.rows[0],
      message: 'Covenant updated successfully'
    });
  } catch (error) {
    console.error('Error updating covenant:', error);
    return res.status(500).json({ error: 'Failed to update covenant' });
  }
}
