import { NextApiRequest, NextApiResponse } from 'next';
import { calculateStewardEligibility } from '../../../lib/stewardCorps';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, application } = req.body;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  if (!application || typeof application !== 'object') {
    return res.status(400).json({ error: 'Application data required' });
  }

  const { motivation, localKnowledge, availability, responsibility } = application;

  if (!motivation || !localKnowledge || !availability || !responsibility) {
    return res.status(400).json({ error: 'All application fields are required' });
  }

  try {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS steward_applications (
          id SERIAL PRIMARY KEY,
          wallet_address VARCHAR(255) NOT NULL,
          motivation TEXT NOT NULL,
          local_knowledge TEXT NOT NULL,
          availability TEXT NOT NULL,
          responsibility TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'applicant',
          probation_start_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    } catch (tableErr) {
      console.log('Table already exists or creation failed');
    }

    const existingApp = await pool.query(
      `SELECT id, status FROM steward_applications 
       WHERE LOWER(wallet_address) = LOWER($1) 
       AND status != 'rejected'
       ORDER BY created_at DESC LIMIT 1`,
      [wallet]
    );

    if (existingApp.rows.length > 0) {
      const status = existingApp.rows[0].status;
      if (status === 'applicant' || status === 'probationary' || status === 'full') {
        return res.status(400).json({ 
          error: 'You already have an active application or steward status',
          status 
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO steward_applications 
        (wallet_address, motivation, local_knowledge, availability, responsibility, status) 
       VALUES ($1, $2, $3, $4, $5, 'applicant')
       RETURNING id, status, created_at`,
      [wallet, motivation, localKnowledge, availability, responsibility]
    );

    console.log('steward_application_submitted', { 
      wallet: wallet.slice(0, 10), 
      applicationId: result.rows[0].id 
    });

    return res.status(200).json({
      success: true,
      applicationId: result.rows[0].id,
      status: 'applicant',
      createdAt: result.rows[0].created_at,
      message: 'Application submitted successfully'
    });
  } catch (error: any) {
    console.error('Error submitting application:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit application'
    });
  }
}
