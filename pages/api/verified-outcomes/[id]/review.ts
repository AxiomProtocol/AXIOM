import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { isAuthorizedReviewer } from '../../../../lib/reviewerAuth';
import { postStructuredMatrixEvent, getRoomByEntity } from '../../../../server/services/matrix/workflow';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const reviewerAddress = session.address;

  if (!isAuthorizedReviewer(reviewerAddress)) {
    return res.status(403).json({
      error: 'This wallet is not authorized to review outcomes.',
      code: 'REVIEWER_NOT_AUTHORIZED',
    });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Outcome ID is required' });
  }

  const { decision, notes } = req.body;

  if (!decision || !['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be "approved" or "rejected"' });
  }

  try {
    const check = await pool.query(
      `SELECT id, status, submitted_by FROM verified_project_outcomes WHERE id = $1`,
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Outcome not found' });
    }

    const submittedBy = check.rows[0].submitted_by;
    if (submittedBy && submittedBy.toLowerCase() === reviewerAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Submitter cannot review their own outcome.' });
    }

    const newStatus = decision === 'approved' ? 'approved' : 'rejected';

    await pool.query(
      `UPDATE verified_project_outcomes SET
        status = $1,
        reviewed_by = $2,
        reviewed_at = NOW(),
        verification_timestamp = CASE WHEN $1 = 'approved' THEN NOW() ELSE verification_timestamp END,
        updated_at = NOW()
       WHERE id = $3`,
      [newStatus, reviewerAddress, id]
    );

    await pool.query(
      `INSERT INTO verification_reviews (outcome_id, reviewer, decision, notes, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, reviewerAddress, decision, notes || null]
    );

    const updated = await pool.query(
      `SELECT * FROM verified_project_outcomes WHERE id = $1`,
      [id]
    );
    const outcome = updated.rows[0];

    setImmediate(async () => {
      try {
        const room = await getRoomByEntity('project_outcome', id);
        if (room) {
          if (decision === 'approved') {
            await postStructuredMatrixEvent(room.matrixRoomId, {
              eventType: 'axiom.outcome.verified',
              payload: {
                outcomeId: id,
                dealId: outcome?.deal_id || null,
                reviewedBy: reviewerAddress,
                actualRehabCost: outcome?.actual_rehab_cost || null,
                actualTimelineDays: outcome?.actual_timeline_days || null,
                axmRewardEligible: outcome?.axm_reward_eligible || false,
              },
              actor: reviewerAddress,
            }, 'project_outcome', id);
            await postStructuredMatrixEvent(room.matrixRoomId, {
              eventType: 'axiom.cost_signal.created',
              payload: {
                outcomeId: id,
                dealId: outcome?.deal_id || null,
                signalSource: 'verified_outcome',
                rehabCost: outcome?.actual_rehab_cost || null,
                timelineDays: outcome?.actual_timeline_days || null,
              },
              actor: 'system',
            }, 'project_outcome', id);
          } else {
            await postStructuredMatrixEvent(room.matrixRoomId, {
              eventType: 'axiom.outcome.rejected',
              payload: {
                outcomeId: id,
                dealId: outcome?.deal_id || null,
                reviewedBy: reviewerAddress,
                notes: notes || null,
              },
              actor: reviewerAddress,
            }, 'project_outcome', id);
          }
        }
      } catch (_) {}
    });

    return res.status(200).json({ outcome });
  } catch (err: any) {
    console.error('POST /api/verified-outcomes/[id]/review error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
