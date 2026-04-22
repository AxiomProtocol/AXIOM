/**
 * POST /api/capinfra/adapters/increase/sweep-timeouts
 *
 * Fail all PENDING_OPERATOR_APPROVAL ACH instructions older than
 * timeoutMinutes (default: 60 minutes). Safe to call from a cron job.
 *
 * SUBMITTED instructions are NEVER swept — they require operator review
 * and reconciliation confirmation.
 *
 * Records a single-actor admin action (ach.sweep_timeouts) for each swept instruction.
 *
 * Body: { timeoutMinutes?: number, correlationId?: string }
 */

import { z } from 'zod';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../lib/capinfra/auth';
import { sweepAchTimeouts } from '../../../../../lib/capinfra/settlement';
import { sendError } from '../../../../../lib/capinfra/errors';

const ZBody = z.object({
  timeoutMinutes: z.number().int().positive().default(60),
  correlationId: z.string().optional(),
}).optional();

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      try {
        const body = ZBody.parse(req.body ?? {});
        const actor = getActor(req);
        const result = await sweepAchTimeouts({
          timeoutMinutes: body?.timeoutMinutes ?? 60,
          actor,
          correlationId: body?.correlationId,
        });
        res.status(200).json(result);
      } catch (err) {
        sendError(res, err);
      }
    },
  },
]);
