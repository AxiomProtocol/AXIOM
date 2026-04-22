import type { NextApiRequest, NextApiResponse } from 'next';
import { getTemplates, seedTemplatesIfEmpty } from '../../../../server/services/cost-intelligence/templates';
import { pool } from '../../../../lib/db';
import type { PropertyType } from '../../../../lib/cost-intelligence/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const propertyType = req.query.propertyType as PropertyType | undefined;
      const templates = await getTemplates(propertyType);
      return res.json({ templates });
    }

    if (req.method === 'POST') {
      const { templateName, description, propertyType, rehabCategory, scopeItems } = req.body || {};
      if (!templateName || !scopeItems) {
        return res.status(400).json({ error: 'templateName and scopeItems required' });
      }
      const slug = templateName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `INSERT INTO cost_estimate_templates (template_name, template_slug, description, property_type, rehab_category, scope_items_json, is_system)
           VALUES ($1,$2,$3,$4,$5,$6,false) RETURNING *`,
          [templateName, slug, description || null, propertyType || 'both', rehabCategory || 'custom', JSON.stringify(scopeItems)],
        );
        return res.status(201).json({ template: rows[0] });
      } finally {
        client.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
