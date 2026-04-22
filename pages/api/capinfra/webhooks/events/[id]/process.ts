/**
 * Capital Infrastructure — Manual webhook event processor endpoint (3B.1b).
 *
 * Admin-gated POST. Triggers the canonical processor for a single
 * cap_webhook_events row by id. Returns the structured ProcessResult.
 * The operator UI and smoke harness use this to drive settlement
 * transitions from verified Stellar webhook events.
 *
 * The ingress endpoint may also call the processor fire-and-forget
 * right after a verified insert; this endpoint exists for the
 * operator-driven retry / smoke-harness path.
 */

import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../../lib/capinfra/auth';
import { processEvent } from '../../../../../../lib/capinfra/webhooks/processor';

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      const id = req.query.id as string;
      if (!id) {
        res.status(400).json({ error: 'MISSING_ID' });
        return;
      }
      const result = await processEvent(id);
      res.status(200).json({ result });
    },
  },
]);
