import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEFAULT_CHECKLIST_ITEMS = [
  { category: 'title', task_name: 'Title Search', description: 'Complete title search to verify ownership history', sort_order: 1 },
  { category: 'title', task_name: 'Lien Check', description: 'Verify no outstanding liens or encumbrances', sort_order: 2 },
  { category: 'title', task_name: 'Deed Review', description: 'Review current deed and legal description', sort_order: 3 },
  { category: 'environmental', task_name: 'Phase I ESA', description: 'Environmental Site Assessment screening', sort_order: 4 },
  { category: 'environmental', task_name: 'Wetlands Check', description: 'Verify wetlands status and any restrictions', sort_order: 5 },
  { category: 'environmental', task_name: 'Flood Zone Review', description: 'Check FEMA flood zone designation', sort_order: 6 },
  { category: 'survey', task_name: 'Boundary Survey', description: 'Confirm property boundaries and corners', sort_order: 7 },
  { category: 'survey', task_name: 'Easement Identification', description: 'Identify all easements and rights-of-way', sort_order: 8 },
  { category: 'survey', task_name: 'Topographic Survey', description: 'Review elevation and terrain features', sort_order: 9 },
  { category: 'access', task_name: 'Road Access Verification', description: 'Confirm legal road access to property', sort_order: 10 },
  { category: 'access', task_name: 'Utility Access', description: 'Verify water, electric, and other utility availability', sort_order: 11 },
  { category: 'zoning', task_name: 'Zoning Verification', description: 'Confirm current zoning and permitted uses', sort_order: 12 },
  { category: 'zoning', task_name: 'Building Restrictions', description: 'Review any covenants or building restrictions', sort_order: 13 },
  { category: 'financial', task_name: 'Tax Assessment Review', description: 'Review property tax history and current assessment', sort_order: 14 },
  { category: 'financial', task_name: 'Appraisal', description: 'Obtain independent property appraisal', sort_order: 15 },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const candidateId = parseInt(id as string);

  if (isNaN(candidateId)) {
    return res.status(400).json({ success: false, error: 'Invalid candidate ID' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM land_checklist_items 
         WHERE land_candidate_id = $1 
         ORDER BY sort_order ASC, created_at ASC`,
        [candidateId]
      );

      const items = result.rows.map(row => ({
        id: row.id,
        category: row.category,
        taskName: row.task_name,
        description: row.description,
        isRequired: row.is_required,
        isCompleted: row.is_completed,
        completedBy: row.completed_by,
        completedAt: row.completed_at,
        notes: row.notes,
        documentUrl: row.document_url,
        sortOrder: row.sort_order
      }));

      const categories = ['title', 'environmental', 'survey', 'access', 'zoning', 'financial'];
      const progress = categories.reduce((acc, cat) => {
        const catItems = items.filter(i => i.category === cat);
        const completed = catItems.filter(i => i.isCompleted).length;
        acc[cat] = { total: catItems.length, completed, percentage: catItems.length > 0 ? Math.round((completed / catItems.length) * 100) : 0 };
        return acc;
      }, {} as Record<string, { total: number; completed: number; percentage: number }>);

      const totalItems = items.length;
      const completedItems = items.filter(i => i.isCompleted).length;

      return res.status(200).json({
        success: true,
        data: {
          items,
          progress,
          overall: {
            total: totalItems,
            completed: completedItems,
            percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
          }
        }
      });
    } catch (error) {
      console.error('Checklist fetch error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch checklist' });
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'generate') {
      try {
        const existing = await pool.query(
          'SELECT COUNT(*) as count FROM land_checklist_items WHERE land_candidate_id = $1',
          [candidateId]
        );

        if (parseInt(existing.rows[0].count) > 0) {
          return res.status(400).json({ success: false, error: 'Checklist already exists for this property' });
        }

        for (const item of DEFAULT_CHECKLIST_ITEMS) {
          await pool.query(
            `INSERT INTO land_checklist_items (land_candidate_id, category, task_name, description, sort_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [candidateId, item.category, item.task_name, item.description, item.sort_order]
          );
        }

        await pool.query(
          `INSERT INTO land_history (land_candidate_id, event_type, event_title, event_description)
           VALUES ($1, 'checklist_generated', 'Due Diligence Checklist Created', 'Automated checklist with ${DEFAULT_CHECKLIST_ITEMS.length} items generated')`,
          [candidateId]
        );

        return res.status(201).json({ success: true, message: 'Checklist generated successfully' });
      } catch (error) {
        console.error('Checklist generation error:', error);
        return res.status(500).json({ success: false, error: 'Failed to generate checklist' });
      }
    }

    const { taskName, category, description, isRequired = true } = req.body;
    if (!taskName || !category) {
      return res.status(400).json({ success: false, error: 'Task name and category required' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO land_checklist_items (land_candidate_id, category, task_name, description, is_required)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [candidateId, category, taskName, description, isRequired]
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Checklist item add error:', error);
      return res.status(500).json({ success: false, error: 'Failed to add checklist item' });
    }
  }

  if (req.method === 'PATCH') {
    const { itemId, isCompleted, notes, documentUrl, completedBy } = req.body;

    if (!itemId) {
      return res.status(400).json({ success: false, error: 'Item ID required' });
    }

    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (typeof isCompleted === 'boolean') {
        updates.push(`is_completed = $${paramIndex++}`);
        values.push(isCompleted);
        if (isCompleted) {
          updates.push(`completed_at = NOW()`);
          if (completedBy) {
            updates.push(`completed_by = $${paramIndex++}`);
            values.push(completedBy);
          }
        } else {
          updates.push(`completed_at = NULL, completed_by = NULL`);
        }
      }

      if (notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        values.push(notes);
      }

      if (documentUrl !== undefined) {
        updates.push(`document_url = $${paramIndex++}`);
        values.push(documentUrl);
      }

      updates.push('updated_at = NOW()');
      values.push(itemId, candidateId);

      const result = await pool.query(
        `UPDATE land_checklist_items SET ${updates.join(', ')} 
         WHERE id = $${paramIndex++} AND land_candidate_id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Checklist item not found' });
      }

      return res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Checklist update error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update checklist item' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
