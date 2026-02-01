import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

const ADMIN_WALLETS = [
  '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96',
].map(w => w.toLowerCase());

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { categoryId, activeOnly } = req.query;

      let query = `
        SELECT 
          t.*,
          c.name as category_name,
          c.icon as category_icon
        FROM susu_templates t
        LEFT JOIN susu_purpose_categories c ON t.purpose_category_id = c.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (activeOnly !== 'false') {
        query += ` AND t.is_active = true`;
      }

      if (categoryId) {
        query += ` AND t.purpose_category_id = $${paramIndex}`;
        params.push(parseInt(categoryId as string));
        paramIndex++;
      }

      query += ' ORDER BY t.usage_count DESC, t.name ASC';

      const { rows } = await pool.query(query, params);

      res.status(200).json({
        success: true,
        templates: rows
      });
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch templates' });
    }
  } else if (req.method === 'POST') {
    const walletAddress = req.headers['x-wallet-address'] as string;
    if (!walletAddress || !ADMIN_WALLETS.includes(walletAddress.toLowerCase())) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    try {
      const {
        name,
        description,
        purposeCategoryId,
        suggestedContribution,
        suggestedCycleDays,
        suggestedMemberCount,
        rotationMethod,
        defaultCharterText,
        createdBy
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Template name is required' });
      }

      const { rows } = await pool.query(`
        INSERT INTO susu_templates (
          name, description, purpose_category_id,
          suggested_contribution, suggested_cycle_days, suggested_member_count,
          rotation_method, default_charter_text, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        name,
        description || null,
        purposeCategoryId ? parseInt(purposeCategoryId) : null,
        suggestedContribution ? parseFloat(suggestedContribution) : null,
        suggestedCycleDays ? parseInt(suggestedCycleDays) : null,
        suggestedMemberCount ? parseInt(suggestedMemberCount) : null,
        rotationMethod || 'sequential',
        defaultCharterText || null,
        createdBy ? parseInt(createdBy) : null
      ]);

      res.status(201).json({
        success: true,
        template: rows[0]
      });
    } catch (error: any) {
      console.error('Error creating template:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to create template' });
    }
  } else if (req.method === 'PUT') {
    const walletAddress = req.headers['x-wallet-address'] as string;
    if (!walletAddress || !ADMIN_WALLETS.includes(walletAddress.toLowerCase())) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    try {
      const { id, isActive } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Template id is required' });
      }

      const { rows } = await pool.query(`
        UPDATE susu_templates
        SET is_active = $2
        WHERE id = $1
        RETURNING *
      `, [parseInt(id), isActive !== false]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.status(200).json({
        success: true,
        template: rows[0]
      });
    } catch (error: any) {
      console.error('Error updating template:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to update template' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
