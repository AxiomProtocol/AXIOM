import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { ensureContractEntityForSession } from '../../../server/services/contracts/fieldIntelligenceAdapter';

type SessionRow = {
  id: string;
  deal_id: string;
  property_id: string;
  session_name: string;
  status: string;
  total_units: number;
  units_walked: number;
  sampling_confidence_score: string | null;
  created_at: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
      const dealId = typeof req.query.dealId === 'string' ? req.query.dealId : undefined;

      if (sessionId) {
        const result = await pool.query(
          `SELECT *
           FROM field_inspection_sessions
           WHERE id = $1
           LIMIT 1`,
          [sessionId],
        );
        const session = result.rows[0] as SessionRow | undefined;
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const contractEntity = await ensureContractEntityForSession(session.id);

        return res.status(200).json({
          id: session.id,
          dealId: session.deal_id,
          propertyId: session.property_id,
          sessionName: session.session_name,
          status: session.status,
          totalUnits: session.total_units,
          unitsWalked: session.units_walked || 0,
          samplingConfidenceScore: Number(session.sampling_confidence_score || 0),
          createdAt: session.created_at,
          contractEntityId: contractEntity?.id || null,
          contractStatus: contractEntity?.current_status || null,
          contractVersion: contractEntity?.version || null,
          contractUpdatedAt: contractEntity?.updated_at || null,
        });
      }

      if (dealId) {
        const result = await pool.query(
          `SELECT *
           FROM field_inspection_sessions
           WHERE deal_id = $1
           ORDER BY created_at DESC
           LIMIT 100`,
          [dealId],
        );
        return res.status(200).json(result.rows);
      }

      return res.status(400).json({ error: 'sessionId or dealId is required' });
    }

    if (req.method === 'PATCH') {
      const { id, status } = req.body || {};
      if (!id || !status) {
        return res.status(400).json({ error: 'id and status are required' });
      }

      const result = await pool.query(
        `UPDATE field_inspection_sessions
         SET status = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, status],
      );
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: 'Session not found' });

      await ensureContractEntityForSession(id);
      return res.status(200).json(row);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to process field intelligence session request',
      details: error?.message || String(error),
    });
  }
}
