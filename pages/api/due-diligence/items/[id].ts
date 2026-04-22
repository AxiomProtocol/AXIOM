import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  if (req.method === 'PATCH') {
    try {
      const { status, owner, notes, evidenceLinks, priority } = req.body || {};

      const sets: string[] = [];
      const vals: any[] = [];
      let paramIdx = 1;

      if (status !== undefined) {
        const valid = ['notStarted', 'inProgress', 'blocked', 'complete'];
        if (!valid.includes(status)) {
          return res.status(400).json({ error: `Invalid status. Must be one of: ${valid.join(', ')}` });
        }
        sets.push(`status = $${paramIdx++}`);
        vals.push(status);

        if (status === 'complete') {
          sets.push(`completed_at = NOW()`);
        } else {
          sets.push(`completed_at = NULL`);
        }
      }

      if (owner !== undefined) {
        sets.push(`owner = $${paramIdx++}`);
        vals.push(owner);
      }

      if (notes !== undefined) {
        sets.push(`notes = $${paramIdx++}`);
        vals.push(notes);
      }

      if (evidenceLinks !== undefined) {
        sets.push(`evidence_links = $${paramIdx++}`);
        vals.push(JSON.stringify(evidenceLinks));
      }

      if (priority !== undefined) {
        sets.push(`priority = $${paramIdx++}`);
        vals.push(priority);
      }

      if (sets.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      sets.push(`updated_at = NOW()`);

      vals.push(id);
      const result = await pool.query(
        `UPDATE dd_checklist_items SET ${sets.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        vals
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      return res.status(200).json({ data: { item: result.rows[0] } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
