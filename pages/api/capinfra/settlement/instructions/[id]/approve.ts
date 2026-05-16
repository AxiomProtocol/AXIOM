/**
 * POST /api/capinfra/settlement/instructions/[id]/approve
 *
 * Approve a PENDING_OPERATOR_APPROVAL ACH instruction (Phase 3B.3).
 * Calls the ACH provider API and transitions to SUBMITTED.
 * No portfolio write — SUBMITTED ≠ bank-final.
 *
 * Records a single-actor admin action (ach.approval).
 * Only valid for ACH instructions in PENDING_OPERATOR_APPROVAL status.
 */

import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../../lib/capinfra/auth';
import { approveAchInstruction } from '../../../../../../lib/capinfra/settlement';
import { sendError } from '../../../../../../lib/capinfra/errors';

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.TREASURY_OPERATOR,
    handler: async (req, res) => {
      try {
        const id = String(req.query.id ?? '');
        const correlationId =
          typeof req.body?.correlationId === 'string' ? req.body.correlationId : undefined;
        const updated = await approveAchInstruction({
          instructionId: id,
          actor: getActor(req),
          correlationId,
        });
        res.status(200).json({ instruction: updated });
      } catch (err) {
        sendError(res, err);
      }
    },
  },
]);
