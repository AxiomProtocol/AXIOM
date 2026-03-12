import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM syn_investor_profiles ORDER BY created_at DESC LIMIT 200`
      );
      return res.status(200).json({ success: true, profiles: result.rows });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { legalName, email, accreditationStatus, entityName, offeringId, stage, softCircleAmount } = req.body;

      if (!legalName) {
        return res.status(400).json({ success: false, error: 'legalName is required' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const profileResult = await client.query(
          `INSERT INTO syn_investor_profiles (legal_name, email, accreditation_status, entity_name)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [legalName, email || null, accreditationStatus || 'unverified', entityName || null]
        );

        const profileId = profileResult.rows[0].id;

        let pipelineId = null;
        if (offeringId) {
          const pipelineResult = await client.query(
            `INSERT INTO syn_pipeline (offering_id, investor_profile_id, stage, soft_circle_amount)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [offeringId, profileId, stage || 'lead', softCircleAmount || null]
          );
          pipelineId = pipelineResult.rows[0].id;
        }

        await client.query('COMMIT');

        return res.status(201).json({
          success: true,
          profileId,
          pipelineId,
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
