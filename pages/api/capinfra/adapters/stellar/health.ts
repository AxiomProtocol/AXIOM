/**
 * Capital Infrastructure — Stellar admin-detail health endpoint (3B.1a).
 * Admin-key gated. The PUBLIC `/api/capinfra/health` is unchanged.
 */

import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../lib/capinfra/auth';
import { stellarHealth } from '../../../../../lib/capinfra/adapters/stellar';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (_req, res) => {
      const health = await stellarHealth();
      res.status(200).json({ health });
    },
  },
]);
