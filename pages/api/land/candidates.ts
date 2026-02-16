import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const candidatesResult = await pool.query(`
      SELECT *
      FROM land_candidates
      ORDER BY
        CASE stage
          WHEN 'acquired' THEN 1
          WHEN 'acquisition_in_progress' THEN 2
          WHEN 'approved' THEN 3
          WHEN 'vote_pending' THEN 4
          WHEN 'ready_for_vote' THEN 5
          WHEN 'under_evaluation' THEN 6
          WHEN 'under_review' THEN 7
          WHEN 'steward_assigned' THEN 8
          WHEN 'sourced' THEN 9
          WHEN 'candidate' THEN 10
          ELSE 11
        END,
        created_at DESC
    `);

    const candidates = candidatesResult.rows.map((c: any) => {
      const checks = [
        c.is_access_verified,
        c.is_title_reviewed,
        c.is_survey_verified,
        c.is_environmental_screened,
        c.is_mineral_rights_reviewed,
        c.is_option_docs_uploaded,
      ];
      const dueDiligenceChecks = checks.filter(Boolean).length;

      return {
        ...c,
        due_diligence_checks: dueDiligenceChecks,
        due_diligence_total: 6,
      };
    });

    const statsResult = await pool.query(`
      SELECT stage, COUNT(*)::int as count
      FROM land_candidates
      GROUP BY stage
    `);

    const byStage: Record<string, number> = {};
    let total = 0;
    for (const row of statsResult.rows) {
      byStage[row.stage] = row.count;
      total += row.count;
    }

    return res.status(200).json({
      success: true,
      candidates,
      stats: {
        total,
        byStage,
      },
    });
  } catch (error: any) {
    console.error('Land candidates fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch land candidates',
      details: error.message,
    });
  }
}
