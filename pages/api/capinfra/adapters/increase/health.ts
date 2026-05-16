/**
 * Capital Infrastructure — ACH adapter admin-detail health endpoint (3B.2).
 * Admin-gated. The PUBLIC /api/capinfra/health is unchanged.
 * reachable=false with a synthetic sandbox accountId is expected in DRY_RUN
 * and must NOT propagate to the public health surface.
 */

import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../lib/capinfra/auth';
import { achHealth } from '../../../../../lib/capinfra/adapters/ach';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (_req, res) => {
      const health = await achHealth();
      res.status(200).json({ health });
    },
  },
]);
