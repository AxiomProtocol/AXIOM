import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { DEFAULT_DD_TEMPLATE } from '../../../shared/dueDiligenceSchema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { dealId } = req.query;
  if (!dealId || typeof dealId !== 'string') {
    return res.status(400).json({ error: 'Deal ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const checklistResult = await pool.query(
        `SELECT * FROM dd_checklists WHERE deal_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [dealId]
      );

      if (checklistResult.rows.length === 0) {
        return res.status(200).json({ data: { checklist: null, items: [], progress: null } });
      }

      const checklist = checklistResult.rows[0];

      const itemsResult = await pool.query(
        `SELECT * FROM dd_checklist_items WHERE checklist_id = $1 ORDER BY sort_order, created_at`,
        [checklist.id]
      );

      const items = itemsResult.rows;
      const total = items.length;
      const complete = items.filter((i: any) => i.status === 'complete').length;
      const inProgress = items.filter((i: any) => i.status === 'inProgress').length;
      const blocked = items.filter((i: any) => i.status === 'blocked').length;
      const notStarted = items.filter((i: any) => i.status === 'notStarted').length;

      return res.status(200).json({
        data: {
          checklist,
          items,
          progress: {
            total,
            complete,
            inProgress,
            blocked,
            notStarted,
            percentComplete: total > 0 ? Math.round((complete / total) * 100) : 0,
          },
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const existing = await pool.query(
        `SELECT id FROM dd_checklists WHERE deal_id = $1 LIMIT 1`,
        [dealId]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Checklist already exists for this deal' });
      }

      const checklistResult = await pool.query(
        `INSERT INTO dd_checklists (deal_id, name) VALUES ($1, $2) RETURNING *`,
        [dealId, req.body?.name || 'Due Diligence Checklist']
      );

      const checklist = checklistResult.rows[0];

      for (let i = 0; i < DEFAULT_DD_TEMPLATE.length; i++) {
        const item = DEFAULT_DD_TEMPLATE[i];
        await pool.query(
          `INSERT INTO dd_checklist_items (checklist_id, category, name, priority, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [checklist.id, item.category, item.name, item.priority, i]
        );
      }

      const itemsResult = await pool.query(
        `SELECT * FROM dd_checklist_items WHERE checklist_id = $1 ORDER BY sort_order`,
        [checklist.id]
      );

      return res.status(201).json({
        data: {
          checklist,
          items: itemsResult.rows,
          progress: {
            total: itemsResult.rows.length,
            complete: 0,
            inProgress: 0,
            blocked: 0,
            notStarted: itemsResult.rows.length,
            percentComplete: 0,
          },
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
