import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';
import { getTierById } from '../../../../lib/stewardTraining';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, acknowledgments } = req.body;

    if (!walletAddress || !acknowledgments) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const allAcknowledged = Object.values(acknowledgments).every(Boolean);
    if (!allAcknowledged) {
      return res.status(400).json({ error: 'All acknowledgments must be accepted' });
    }

    const enrollment = await pool.query(`
      SELECT id, tier, covenant_signed, user_id
      FROM training_enrollments 
      WHERE wallet_address = $1 
      AND payment_status IN ('completed', 'scholarship_approved')
      ORDER BY enrolled_at DESC LIMIT 1
    `, [walletAddress]);

    if (!enrollment.rows || enrollment.rows.length === 0) {
      return res.status(404).json({ error: 'No active enrollment found' });
    }

    const enrollmentData = enrollment.rows[0];

    if (enrollmentData.covenant_signed) {
      return res.status(400).json({ error: 'Covenant already signed' });
    }

    const tier = getTierById(enrollmentData.tier);
    const axusdReward = tier?.axusdReward || 2000;

    await pool.query(`
      INSERT INTO steward_covenants (
        enrollment_id,
        user_id,
        wallet_address,
        signed_at,
        acknowledgments,
        ip_address,
        covenant_version
      ) VALUES ($1, $2, $3, now(), $4, $5, '1.0')
    `, [
      enrollmentData.id,
      enrollmentData.user_id,
      walletAddress,
      JSON.stringify(acknowledgments),
      req.headers['x-forwarded-for'] || req.socket.remoteAddress
    ]);

    await pool.query(`
      UPDATE training_enrollments 
      SET 
        covenant_signed = true,
        covenant_signed_at = now(),
        current_phase = 'graduated',
        axusd_reward_amount = $1,
        graduation_date = now()
      WHERE id = $2
    `, [axusdReward, enrollmentData.id]);

    await pool.query(`
      INSERT INTO training_certificates (
        enrollment_id,
        user_id,
        wallet_address,
        certificate_number,
        issued_at,
        tier
      ) VALUES ($1, $2, $3, $4, now(), $5)
    `, [
      enrollmentData.id,
      enrollmentData.user_id,
      walletAddress,
      `SC-${Date.now().toString(36).toUpperCase()}`,
      enrollmentData.tier
    ]);

    return res.status(200).json({
      success: true,
      message: 'Covenant signed successfully',
      axusdReward
    });

  } catch (error: any) {
    console.error('Sign covenant error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to sign covenant'
    });
  }
}
