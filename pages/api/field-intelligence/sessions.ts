import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { ensureContractEntityForSession } from '../../../server/services/contracts/fieldIntelligenceAdapter';
import { ensureMatrixRoomForInspection, postStructuredMatrixEvent } from '../../../server/services/matrix/workflow';

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

        let contractEntity: any = null;
        try { contractEntity = await ensureContractEntityForSession(session.id); } catch (_) {}

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

    if (req.method === 'POST') {
      const { dealId, propertyId, sessionName, totalUnits, inspectedBy, propertyType } = req.body || {};
      if (!dealId || !sessionName || !totalUnits) {
        return res.status(400).json({ error: 'dealId, sessionName, and totalUnits are required' });
      }

      let resolvedPropertyId = propertyId;
      if (!resolvedPropertyId) {
        const propResult = await pool.query(
          `SELECT property_id FROM re_deals WHERE id = $1 LIMIT 1`,
          [dealId],
        );
        resolvedPropertyId = propResult.rows[0]?.property_id || null;
      }
      if (!resolvedPropertyId) {
        return res.status(400).json({ error: 'propertyId is required and could not be resolved from the deal' });
      }

      const resolvedPropertyType = propertyType === 'sfr' ? 'sfr' : 'multifamily';

      const insertResult = await pool.query(
        `INSERT INTO field_inspection_sessions (
           deal_id, property_id, session_name, status,
           total_units, units_walked, inspected_by,
           property_type, created_at, updated_at
         ) VALUES (
           $1, $2, $3, 'planned',
           $4, 0, $5,
           $6, NOW(), NOW()
         ) RETURNING *`,
        [dealId, resolvedPropertyId, sessionName, Number(totalUnits), inspectedBy || null, resolvedPropertyType],
      );

      const newSession = insertResult.rows[0];
      try {
        await ensureContractEntityForSession(newSession.id);
      } catch (_) {}

      setImmediate(async () => {
        try {
          const room = await ensureMatrixRoomForInspection(newSession.id, sessionName);
          await postStructuredMatrixEvent(room.roomId, {
            eventType: 'axiom.inspection.started',
            payload: {
              inspectionId: newSession.id,
              dealId,
              sessionName,
              totalUnits: Number(totalUnits),
              inspectedBy: inspectedBy || null,
            },
            actor: inspectedBy || null,
          }, 'inspection', newSession.id);
        } catch (_) {}
      });

      return res.status(201).json(newSession);
    }

    if (req.method === 'PATCH') {
      const { id, status } = req.body || {};
      if (!id || !status) {
        return res.status(400).json({ error: 'id and status are required' });
      }

      const result = await pool.query(
        `UPDATE field_inspection_sessions
         SET status = $2::inspection_session_status,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, status],
      );
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: 'Session not found' });

      if (status === 'submitted') {
        setImmediate(async () => {
          try {
            const room = await ensureMatrixRoomForInspection(id, row.session_name);
            await postStructuredMatrixEvent(room.roomId, {
              eventType: 'axiom.inspection.submitted',
              payload: {
                inspectionId: id,
                dealId: row.deal_id,
                totalUnits: row.total_units,
                unitsInspected: row.units_walked || 0,
                confidenceScore: Number(row.sampling_confidence_score || 0),
                status: 'submitted',
              },
            }, 'inspection', id);
          } catch (_) {}
        });
      }

      try { await ensureContractEntityForSession(id); } catch (_) {}

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
