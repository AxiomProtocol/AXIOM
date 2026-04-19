/**
 * GET /api/capinfra/identity/users/:userId — identity projection.
 *
 * Returns the canonical identity projection: user record, identity
 * profile, valid-claims list, and linked wallets. Compliance-admin auth
 * required.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../../lib/capinfra/auth';
import { getProjection } from '../../../../../../lib/capinfra/identity';
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
      const projection = await getProjection(userId);
      res.status(200).json({ projection });
    },
  },
]);
