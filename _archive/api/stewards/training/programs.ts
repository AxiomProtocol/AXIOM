import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const programs = await pool.query(`
      SELECT 
        id,
        name,
        description,
        start_date as "startDate",
        end_date as "endDate",
        max_enrollment as "maxEnrollment",
        current_enrollment as "currentEnrollment",
        is_active as "isActive",
        is_accepting_enrollment as "isAcceptingEnrollment",
        field_site_location as "fieldSiteLocation",
        field_site_state as "fieldSiteState",
        classroom_schedule as "classroomSchedule",
        created_at as "createdAt"
      FROM training_programs
      WHERE is_active = true
      ORDER BY start_date ASC
    `);

    return res.status(200).json({
      success: true,
      programs: programs.rows
    });
  } catch (error) {
    console.error('Failed to fetch training programs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch training programs'
    });
  }
}
