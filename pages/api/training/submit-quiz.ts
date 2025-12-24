import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { TRAINING_MODULES, CERTIFICATION_LEVELS, getCertificationLevel } from '../../../lib/organizerTraining';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { wallet, moduleId, answers } = req.body;

  if (!wallet || !moduleId || !answers) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const module = TRAINING_MODULES.find(m => m.id === moduleId);
  if (!module) {
    return res.status(404).json({ success: false, error: 'Module not found' });
  }

  try {
    let correct = 0;
    const totalQuestions = module.quiz.length;

    module.quiz.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        correct++;
      }
    });

    const score = Math.round((correct / totalQuestions) * 100);
    const passed = score >= module.passingScore;
    const walletLower = wallet.toLowerCase();

    const existing = await pool.query(
      `SELECT id, attempts FROM organizer_training_progress 
       WHERE wallet_address = $1 AND module_id = $2`,
      [walletLower, moduleId]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE organizer_training_progress 
         SET quiz_score = $1, passed = $2, attempts = attempts + 1, 
             completed_at = CASE WHEN $2 THEN NOW() ELSE completed_at END,
             updated_at = NOW()
         WHERE wallet_address = $3 AND module_id = $4`,
        [score, passed, walletLower, moduleId]
      );
    } else {
      await pool.query(
        `INSERT INTO organizer_training_progress 
         (wallet_address, module_id, quiz_score, passed, attempts, completed_at)
         VALUES ($1, $2, $3, $4, 1, CASE WHEN $4 THEN NOW() ELSE NULL END)`,
        [walletLower, moduleId, score, passed]
      );
    }

    if (passed) {
      const progressResult = await pool.query(
        `SELECT module_id FROM organizer_training_progress 
         WHERE wallet_address = $1 AND passed = true`,
        [walletLower]
      );

      const completedModules = progressResult.rows.map(r => r.module_id);
      const newCert = getCertificationLevel(completedModules);

      if (newCert) {
        const existingCert = await pool.query(
          `SELECT id FROM organizer_certifications 
           WHERE wallet_address = $1 AND certification_level = $2`,
          [walletLower, newCert.id]
        );

        if (existingCert.rows.length === 0) {
          await pool.query(
            `INSERT INTO organizer_certifications 
             (wallet_address, certification_level, earned_at, is_active)
             VALUES ($1, $2, NOW(), true)`,
            [walletLower, newCert.id]
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      result: {
        score,
        passed,
        passingScore: module.passingScore,
        correctAnswers: correct,
        totalQuestions,
        moduleId
      }
    });
  } catch (error) {
    console.error('Quiz submission error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit quiz' });
  }
}
