/**
 * GET /api/capinfra/identity/users/:userId/claims — claims projection.
 *
 * Returns the user's claim list (valid + historical) without the
 * surrounding profile/wallet payload. Compliance-admin auth required.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../../lib/capinfra/auth';
import { getClaims } from '../../../../../../lib/capinfra/identity';
import { ValidationError } from '../../../../../../lib/capinfra/errors';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.COMPLIANCE_ADMIN,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const userId = req.query.userId;
      if (typeof userId !== 'string' || userId.length === 0) {
        throw new ValidationError('userId required');
      }
      const claims = await getClaims(userId);
      res.status(200).json({ claims });
    },
  },
]);
