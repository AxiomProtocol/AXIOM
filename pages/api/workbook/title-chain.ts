import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { caseId } = req.query;

  if (!caseId) {
    return res.status(400).json({ error: 'caseId is required' });
  }

  try {
    if (req.method === 'GET') {
      const result = await pool.query(
        `SELECT id, case_id, event_date, event_type, grantor, grantee, 
                description, document_ref, verified, notes, created_at
         FROM workbook_title_chain 
         WHERE case_id = $1 
         ORDER BY event_date ASC`,
        [caseId]
      );

      return res.status(200).json({ 
        success: true, 
        data: result.rows.map(row => ({
          id: row.id.toString(),
          date: row.event_date,
          type: row.event_type,
          grantor: row.grantor,
          grantee: row.grantee,
          description: row.description || '',
          documentRef: row.document_ref || '',
          verified: row.verified,
          notes: row.notes || '',
        }))
      });
    }

    if (req.method === 'POST') {
      const { date, type, grantor, grantee, description, documentRef, verified, notes } = req.body;

      if (!date || !type || !grantor || !grantee) {
        return res.status(400).json({ error: 'date, type, grantor, and grantee are required' });
      }

      const result = await pool.query(
        `INSERT INTO workbook_title_chain 
         (case_id, event_date, event_type, grantor, grantee, description, document_ref, verified, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, event_date, event_type, grantor, grantee, description, document_ref, verified, notes`,
        [caseId, date, type, grantor, grantee, description || '', documentRef || '', verified || false, notes || '']
      );

      const row = result.rows[0];
      return res.status(201).json({ 
        success: true, 
        data: {
          id: row.id.toString(),
          date: row.event_date,
          type: row.event_type,
          grantor: row.grantor,
          grantee: row.grantee,
          description: row.description || '',
          documentRef: row.document_ref || '',
          verified: row.verified,
          notes: row.notes || '',
        }
      });
    }

    if (req.method === 'PUT') {
      const { id, date, type, grantor, grantee, description, documentRef, verified, notes } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const result = await pool.query(
        `UPDATE workbook_title_chain 
         SET event_date = $1, event_type = $2, grantor = $3, grantee = $4, 
             description = $5, document_ref = $6, verified = $7, notes = $8, updated_at = NOW()
         WHERE id = $9 AND case_id = $10
         RETURNING id, event_date, event_type, grantor, grantee, description, document_ref, verified, notes`,
        [date, type, grantor, grantee, description || '', documentRef || '', verified || false, notes || '', id, caseId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const row = result.rows[0];
      return res.status(200).json({ 
        success: true, 
        data: {
          id: row.id.toString(),
          date: row.event_date,
          type: row.event_type,
          grantor: row.grantor,
          grantee: row.grantee,
          description: row.description || '',
          documentRef: row.document_ref || '',
          verified: row.verified,
          notes: row.notes || '',
        }
      });
    }

    if (req.method === 'DELETE') {
      const { eventId } = req.query;

      if (!eventId) {
        return res.status(400).json({ error: 'eventId is required' });
      }

      await pool.query(
        'DELETE FROM workbook_title_chain WHERE id = $1 AND case_id = $2',
        [eventId, caseId]
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Title chain API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
