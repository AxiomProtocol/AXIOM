import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { TRAINING_MODULES, CERTIFICATION_LEVELS, getCertificationLevel, getNextCertification, getModuleProgress } from '../../../lib/organizerTraining';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method === 'GET') {
    const { wallet } = req.query;

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }

    try {
      const progressResult = await pool.query(
        `SELECT module_id, quiz_score, passed, attempts, completed_at 
         FROM organizer_training_progress 
         WHERE wallet_address = $1`,
        [wallet.toLowerCase()]
      );

      const completedModules = progressResult.rows
        .filter(r => r.passed)
        .map(r => r.module_id);

      const currentCert = getCertificationLevel(completedModules);
      const nextCert = getNextCertification(completedModules);
      const progress = getModuleProgress(completedModules);

      const moduleProgress = TRAINING_MODULES.map(module => {
        const dbProgress = progressResult.rows.find(r => r.module_id === module.id);
        return {
          id: module.id,
          title: module.title,
          description: module.description,
          duration: module.duration,
          passed: dbProgress?.passed || false,
          quizScore: dbProgress?.quiz_score || null,
          attempts: dbProgress?.attempts || 0,
          completedAt: dbProgress?.completed_at || null
        };
      });

      const certResult = await pool.query(
        `SELECT certification_level, earned_at, is_active 
         FROM organizer_certifications 
         WHERE wallet_address = $1 AND is_active = true
         ORDER BY earned_at DESC`,
        [wallet.toLowerCase()]
      );

      return res.status(200).json({
        success: true,
        progress: {
          completedModules,
          totalModules: TRAINING_MODULES.length,
          percentage: progress.percentage,
          currentCertification: currentCert,
          nextCertification: nextCert,
          modules: moduleProgress,
          earnedCertifications: certResult.rows
        }
      });
    } catch (error) {
      console.error('Training progress error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch training progress' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
