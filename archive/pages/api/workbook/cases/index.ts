import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { checkEntitlement } from '../../../../lib/workbook/entitlements';
import { getUserFromSiweSession } from '../../../../lib/workbook/auth';

const SECTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'Courthouse', 'Legal', 'Checklist', 'Exports'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserFromSiweSession(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const entitlement = await checkEntitlement(userId);
  if (!entitlement.hasAccess) {
    return res.status(403).json({ error: 'Subscription required', requiresSubscription: true });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM workbook_cases WHERE user_id = $1 ORDER BY updated_at DESC`,
        [userId]
      );
      
      const cases = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        caseTitle: row.case_title,
        ancestorPrimaryName: row.ancestor_primary_name,
        ancestorNameVariants: row.ancestor_name_variants,
        jurisdictionCode: row.jurisdiction_code,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return res.status(200).json({ success: true, data: cases });
    } catch (error) {
      console.error('Failed to fetch cases:', error);
      return res.status(500).json({ error: 'Failed to fetch cases' });
    }
  }

  if (req.method === 'POST') {
    if (!entitlement.canCreate) {
      return res.status(403).json({ error: 'Active subscription required to create cases' });
    }

    try {
      const { caseTitle, ancestorPrimaryName, ancestorNameVariants, jurisdictionCode } = req.body;

      if (!caseTitle || !ancestorPrimaryName) {
        return res.status(400).json({ error: 'Case title and ancestor name are required' });
      }

      const result = await pool.query(
        `INSERT INTO workbook_cases (user_id, case_title, ancestor_primary_name, ancestor_name_variants, jurisdiction_code)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, caseTitle, ancestorPrimaryName, JSON.stringify(ancestorNameVariants || []), jurisdictionCode || null]
      );
      
      const row = result.rows[0];
      const newCase = {
        id: row.id,
        userId: row.user_id,
        caseTitle: row.case_title,
        ancestorPrimaryName: row.ancestor_primary_name,
        ancestorNameVariants: row.ancestor_name_variants,
        jurisdictionCode: row.jurisdiction_code,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      for (const key of SECTION_KEYS) {
        await pool.query(
          `INSERT INTO workbook_section_states (case_id, section_key, completion_status) VALUES ($1, $2, $3)`,
          [newCase.id, key, 'not_started']
        );
      }

      return res.status(201).json({ success: true, data: newCase });
    } catch (error) {
      console.error('Failed to create case:', error);
      return res.status(500).json({ error: 'Failed to create case' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
