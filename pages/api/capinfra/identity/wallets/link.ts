/**
 * POST /api/capinfra/identity/wallets/link — link a wallet to a user.
 *
 * Idempotent: linking the same (chain, address, userId) twice returns
 * the existing row. Conflicting links to a different user surface 409.
 * Compliance-admin auth required.
 */

import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../lib/capinfra/auth';
import { ZWalletLink } from '../../../../../lib/capinfra/types';
import { linkWallet } from '../../../../../lib/capinfra/identity';

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.COMPLIANCE_ADMIN,
    handler: async (req, res) => {
      const input = ZWalletLink.parse(req.body);
      const actor = getActor(req);
      const correlationId = (req.headers['x-correlation-id'] as string) || undefined;
      const wallet = await linkWallet(input, actor, correlationId);
      res.status(201).json({ wallet });
    },
  },
]);
