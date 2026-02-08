import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const enrollment = await pool.query(`
      SELECT 
        te.id,
        te.tier,
        te.current_phase as "currentPhase",
        te.phase_progress as "phaseProgress",
        te.online_progress as "onlineProgress",
        te.classroom_progress as "classroomProgress",
        te.field_progress as "fieldProgress",
        te.covenant_signed as "covenantSigned",
        te.enrolled_at as "enrolledAt",
        te.payment_status as "paymentStatus",
        tp.name as "programName"
      FROM training_enrollments te
      JOIN training_programs tp ON te.program_id = tp.id
      WHERE te.wallet_address = $1
      AND te.payment_status IN ('completed', 'scholarship_approved')
      ORDER BY te.enrolled_at DESC
      LIMIT 1
    `, [address]);

    if (!enrollment.rows || enrollment.rows.length === 0) {
      return res.status(200).json({
        success: true,
        enrollment: null,
        moduleProgress: []
      });
    }

    const enrollmentData = enrollment.rows[0];

    const moduleProgress = await pool.query(`
      SELECT 
        module_id as "moduleId",
        status,
        completed_at as "completedAt",
        quiz_score as "quizScore"
      FROM training_module_progress
      WHERE enrollment_id = $1
    `, [enrollmentData.id]);

    return res.status(200).json({
      success: true,
      enrollment: enrollmentData,
      moduleProgress: moduleProgress.rows
    });

  } catch (error: any) {
    console.error('Failed to fetch enrollment:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch enrollment'
    });
  }
}
