/**
 * POST /api/capinfra/adapters/increase/validate
 *
 * Run the five ACH gate validation checks (Phase 3B.3).
 * Records each check as a single-actor admin action for traceability.
 *
 * Body: { actor?: string, correlationId?: string }
 */

import { z } from 'zod';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../lib/capinfra/auth';
import { runAchValidation } from '../../../../../lib/capinfra/reconciliation/ach';
import { sendError } from '../../../../../lib/capinfra/errors';

const ZBody = z.object({
  correlationId: z.string().optional(),
}).optional();

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      try {
        const body = ZBody.parse(req.body);
        const actor = getActor(req);
        const result = await runAchValidation({
          actor,
          correlationId: body?.correlationId,
        });
        res.status(200).json({ ...result, allPassed: result.passed });
      } catch (err) {
        sendError(res, err);
      }
    },
  },
]);
