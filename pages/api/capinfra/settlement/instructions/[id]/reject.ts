/**
 * POST /api/capinfra/settlement/instructions/[id]/reject
 *
 * Reject a PENDING_OPERATOR_APPROVAL ACH instruction → FAILED (Phase 3B.3).
 * No ACH provider API call. Safe to auto-fail (no transfer submitted).
 *
 * Records a single-actor admin action (ach.rejection).
 * Only valid for ACH instructions in PENDING_OPERATOR_APPROVAL status.
 *
 * Body: { reasonCode: string, correlationId?: string }
 */

import { z } from 'zod';
import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../../lib/capinfra/auth';
import { rejectAchInstruction } from '../../../../../../lib/capinfra/settlement';
import { sendError } from '../../../../../../lib/capinfra/errors';

const ZBody = z.object({
  reasonCode: z.string().min(1),
  correlationId: z.string().optional(),
});

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.TREASURY_OPERATOR,
    handler: async (req, res) => {
      try {
        const id = String(req.query.id ?? '');
        const body = ZBody.parse(req.body);
        const updated = await rejectAchInstruction({
          instructionId: id,
          actor: getActor(req),
          reasonCode: body.reasonCode,
          correlationId: body.correlationId,
        });
        res.status(200).json({ instruction: updated });
      } catch (err) {
        sendError(res, err);
      }
    },
  },
]);
