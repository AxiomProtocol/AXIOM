import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { checkEntitlement } from '../../../../lib/workbook/entitlements';
import { detectCollisions } from '../../../../lib/workbook/identity-collision';
import { getUserFromSiweSession } from '../../../../lib/workbook/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserFromSiweSession(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const caseId = parseInt(req.query.caseId as string);
  if (isNaN(caseId)) {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  const caseResult = await pool.query(
    `SELECT * FROM workbook_cases WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [caseId, userId]
  );
  
  const caseRow = caseResult.rows[0];
  if (!caseRow) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const caseData = {
    id: caseRow.id,
    userId: caseRow.user_id,
    caseTitle: caseRow.case_title,
    ancestorPrimaryName: caseRow.ancestor_primary_name,
    ancestorNameVariants: caseRow.ancestor_name_variants,
    jurisdictionCode: caseRow.jurisdiction_code,
    status: caseRow.status,
    ethicalUseAcceptedAt: caseRow.ethical_use_accepted_at,
    createdAt: caseRow.created_at,
    updatedAt: caseRow.updated_at,
  };

  const entitlement = await checkEntitlement(userId);
  if (!entitlement.hasAccess) {
    return res.status(403).json({ error: 'Subscription required', requiresSubscription: true });
  }

  if (req.method === 'GET') {
    try {
      const sectionsResult = await pool.query(
        `SELECT * FROM workbook_section_states WHERE case_id = $1`,
        [caseId]
      );
      const sections = sectionsResult.rows.map(row => ({
        id: row.id,
        caseId: row.case_id,
        sectionKey: row.section_key,
        completionStatus: row.completion_status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const evidenceResult = await pool.query(
        `SELECT * FROM evidence_items WHERE case_id = $1`,
        [caseId]
      );
      const evidence = evidenceResult.rows;

      const claimsResult = await pool.query(
        `SELECT * FROM fact_claims WHERE case_id = $1`,
        [caseId]
      );
      const claims = claimsResult.rows;

      const tasksResult = await pool.query(
        `SELECT * FROM task_items WHERE case_id = $1`,
        [caseId]
      );
      const tasks = tasksResult.rows;

      const collisions = await detectCollisions(caseId, userId);

      const completedSections = sections.filter(s => s.completionStatus === 'complete').length;
      const totalSections = sections.length;
      const primarySources = evidence.filter((e: any) => e.primary_or_secondary === 'primary').length;
      const verifiedClaims = claims.filter((c: any) => c.confidence_level === 'verified').length;
      const openTasks = tasks.filter((t: any) => t.status === 'open').length;

      return res.status(200).json({
        success: true,
        data: {
          case: caseData,
          sections,
          stats: {
            completedSections,
            totalSections,
            evidenceCount: evidence.length,
            primarySources,
            claimsCount: claims.length,
            verifiedClaims,
            openTasks,
          },
          collisions,
        },
      });
    } catch (error) {
      console.error('Failed to fetch case details:', error);
      return res.status(500).json({ error: 'Failed to fetch case details' });
    }
  }

  if (req.method === 'PATCH') {
    if (!entitlement.isActive) {
      return res.status(403).json({ error: 'Active subscription required to update cases' });
    }

    try {
      const { caseTitle, ancestorPrimaryName, ancestorNameVariants, jurisdictionCode, status, ethicalUseAccepted } = req.body;

      const updates: string[] = ['updated_at = NOW()'];
      const values: any[] = [];
      let paramIndex = 1;

      if (caseTitle !== undefined) {
        updates.push(`case_title = $${paramIndex++}`);
        values.push(caseTitle);
      }
      if (ancestorPrimaryName !== undefined) {
        updates.push(`ancestor_primary_name = $${paramIndex++}`);
        values.push(ancestorPrimaryName);
      }
      if (ancestorNameVariants !== undefined) {
        updates.push(`ancestor_name_variants = $${paramIndex++}`);
        values.push(JSON.stringify(ancestorNameVariants));
      }
      if (jurisdictionCode !== undefined) {
        updates.push(`jurisdiction_code = $${paramIndex++}`);
        values.push(jurisdictionCode);
      }
      if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
      }
      if (ethicalUseAccepted === true && !caseData.ethicalUseAcceptedAt) {
        updates.push(`ethical_use_accepted_at = NOW()`);
      }

      values.push(caseId);

      const result = await pool.query(
        `UPDATE workbook_cases SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      const row = result.rows[0];
      const updated = {
        id: row.id,
        userId: row.user_id,
        caseTitle: row.case_title,
        ancestorPrimaryName: row.ancestor_primary_name,
        ancestorNameVariants: row.ancestor_name_variants,
        jurisdictionCode: row.jurisdiction_code,
        status: row.status,
        ethicalUseAcceptedAt: row.ethical_use_accepted_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error('Failed to update case:', error);
      return res.status(500).json({ error: 'Failed to update case' });
    }
  }

  if (req.method === 'DELETE') {
    if (!entitlement.isActive) {
      return res.status(403).json({ error: 'Active subscription required to delete cases' });
    }

    try {
      await pool.query(
        `UPDATE workbook_cases SET status = 'archived', updated_at = NOW() WHERE id = $1`,
        [caseId]
      );

      return res.status(200).json({ success: true, message: 'Case archived' });
    } catch (error) {
      console.error('Failed to archive case:', error);
      return res.status(500).json({ error: 'Failed to archive case' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
