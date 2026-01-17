import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { caseId } = req.query;

  if (!caseId) {
    return res.status(400).json({ error: 'caseId is required' });
  }

  try {
    if (req.method === 'GET') {
      const result = await pool.query(
        `SELECT id, case_id, email, name, role, status, invited_at, accepted_at
         FROM workbook_collaborators 
         WHERE case_id = $1 
         ORDER BY invited_at DESC`,
        [caseId]
      );

      return res.status(200).json({ 
        success: true, 
        data: result.rows.map(row => ({
          id: row.id.toString(),
          email: row.email,
          name: row.name,
          role: row.role,
          status: row.status,
          invitedAt: row.invited_at,
          acceptedAt: row.accepted_at,
        }))
      });
    }

    if (req.method === 'POST') {
      const { email, name, role } = req.body;

      if (!email || !name) {
        return res.status(400).json({ error: 'email and name are required' });
      }

      const inviteToken = uuidv4();

      const result = await pool.query(
        `INSERT INTO workbook_collaborators 
         (case_id, email, name, role, status, invite_token)
         VALUES ($1, $2, $3, $4, 'pending', $5)
         ON CONFLICT (case_id, email) DO UPDATE SET 
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           invite_token = EXCLUDED.invite_token,
           invited_at = NOW()
         RETURNING id, email, name, role, status, invited_at, accepted_at`,
        [caseId, email, name, role || 'viewer', inviteToken]
      );

      const row = result.rows[0];
      return res.status(201).json({ 
        success: true, 
        data: {
          id: row.id.toString(),
          email: row.email,
          name: row.name,
          role: row.role,
          status: row.status,
          invitedAt: row.invited_at,
          acceptedAt: row.accepted_at,
        }
      });
    }

    if (req.method === 'PUT') {
      const { id, role, status } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (role) {
        updates.push(`role = $${paramCount++}`);
        values.push(role);
      }
      if (status) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
        if (status === 'active') {
          updates.push(`accepted_at = NOW()`);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      values.push(id, caseId);

      const result = await pool.query(
        `UPDATE workbook_collaborators 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND case_id = $${paramCount}
         RETURNING id, email, name, role, status, invited_at, accepted_at`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Collaborator not found' });
      }

      const row = result.rows[0];
      return res.status(200).json({ 
        success: true, 
        data: {
          id: row.id.toString(),
          email: row.email,
          name: row.name,
          role: row.role,
          status: row.status,
          invitedAt: row.invited_at,
          acceptedAt: row.accepted_at,
        }
      });
    }

    if (req.method === 'DELETE') {
      const { collaboratorId } = req.query;

      if (!collaboratorId) {
        return res.status(400).json({ error: 'collaboratorId is required' });
      }

      await pool.query(
        'DELETE FROM workbook_collaborators WHERE id = $1 AND case_id = $2',
        [collaboratorId, caseId]
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Collaborators API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
