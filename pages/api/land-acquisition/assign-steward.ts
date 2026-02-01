import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await db.execute(sql`
        SELECT 
          sa.id,
          sa.wallet,
          sa.role,
          sr.name as region_name,
          sr.coverage,
          sa.status,
          sa.created_at,
          (
            SELECT COUNT(*) FROM land_submissions ls 
            WHERE ls.assigned_steward_id = sa.id 
            AND ls.status NOT IN ('approved', 'rejected', 'archived')
          ) as active_assignments
        FROM steward_assignments sa
        LEFT JOIN steward_regions sr ON sa.region_id = sr.id
        WHERE sa.status = 'active'
        ORDER BY active_assignments ASC, sa.created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: result.rows
      });
    } catch (error: any) {
      console.error('Error fetching stewards:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { submissionId, stewardId, autoAssign } = req.body;

      if (!submissionId) {
        return res.status(400).json({ success: false, error: 'Submission ID required' });
      }

      let selectedStewardId = stewardId;

      if (autoAssign && !stewardId) {
        const stewardResult = await db.execute(sql`
          SELECT 
            sa.id,
            sa.wallet,
            sr.coverage,
            (
              SELECT COUNT(*) FROM land_submissions ls 
              WHERE ls.assigned_steward_id = sa.id 
              AND ls.status NOT IN ('approved', 'rejected', 'archived')
            ) as active_count
          FROM steward_assignments sa
          LEFT JOIN steward_regions sr ON sa.region_id = sr.id
          WHERE sa.status = 'active'
          ORDER BY active_count ASC, RANDOM()
          LIMIT 1
        `);

        if (stewardResult.rows && stewardResult.rows.length > 0) {
          selectedStewardId = (stewardResult.rows[0] as any).id;
        }
      }

      if (!selectedStewardId) {
        return res.status(400).json({ 
          success: false, 
          error: 'No available stewards for assignment' 
        });
      }

      const result = await db.execute(sql`
        UPDATE land_submissions
        SET 
          assigned_steward_id = ${selectedStewardId},
          status = CASE WHEN status = 'new' THEN 'reviewing' ELSE status END,
          updated_at = NOW()
        WHERE id = ${submissionId}
        RETURNING *
      `);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Submission not found' });
      }

      const stewardInfo = await db.execute(sql`
        SELECT sa.*, sr.name as region_name
        FROM steward_assignments sa
        LEFT JOIN steward_regions sr ON sa.region_id = sr.id
        WHERE sa.id = ${selectedStewardId}
      `);

      return res.status(200).json({
        success: true,
        data: {
          submission: result.rows[0],
          steward: stewardInfo.rows[0],
          message: 'Steward assigned successfully'
        }
      });
    } catch (error: any) {
      console.error('Error assigning steward:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
