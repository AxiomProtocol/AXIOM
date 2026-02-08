import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { moduleId, walletAddress, action } = req.body;

    if (!moduleId || !walletAddress || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const enrollment = await pool.query(`
      SELECT id FROM training_enrollments 
      WHERE wallet_address = $1 
      AND payment_status IN ('completed', 'scholarship_approved')
      ORDER BY enrolled_at DESC LIMIT 1
    `, [walletAddress]);

    if (!enrollment.rows || enrollment.rows.length === 0) {
      return res.status(404).json({ error: 'No active enrollment found' });
    }

    const enrollmentId = enrollment.rows[0].id;

    if (action === 'complete') {
      await pool.query(`
        INSERT INTO training_module_progress (enrollment_id, module_id, status, completed_at)
        VALUES ($1, $2, 'completed', now())
        ON CONFLICT (enrollment_id, module_id) 
        DO UPDATE SET status = 'completed', completed_at = now()
      `, [enrollmentId, moduleId]);

      const [phase] = moduleId.split('-');
      const progressField = phase === 'online' ? 'online_progress' : 
                           phase === 'classroom' ? 'classroom_progress' : 'field_progress';
      
      const phaseModules = await pool.query(`
        SELECT COUNT(*) as total FROM training_module_progress 
        WHERE enrollment_id = $1 AND module_id LIKE $2 AND status = 'completed'
      `, [enrollmentId, `${phase}-%`]);

      const completedCount = parseInt(phaseModules.rows[0].total) || 0;
      const totalModules = phase === 'online' ? 12 : phase === 'classroom' ? 6 : 8;
      const progress = Math.round((completedCount / totalModules) * 100);

      await pool.query(`
        UPDATE training_enrollments 
        SET ${progressField} = $1
        WHERE id = $2
      `, [progress, enrollmentId]);

      return res.status(200).json({ 
        success: true, 
        message: 'Module marked as complete',
        progress 
      });
    }

    if (action === 'start') {
      await pool.query(`
        INSERT INTO training_module_progress (enrollment_id, module_id, status, started_at)
        VALUES ($1, $2, 'in_progress', now())
        ON CONFLICT (enrollment_id, module_id) 
        DO UPDATE SET status = 'in_progress', started_at = COALESCE(training_module_progress.started_at, now())
      `, [enrollmentId, moduleId]);

      return res.status(200).json({ success: true, message: 'Module started' });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error: any) {
    console.error('Progress update error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update progress'
    });
  }
}
