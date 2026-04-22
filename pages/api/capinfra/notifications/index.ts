/**
 * GET /api/capinfra/notifications — operator/user notifications listing.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../lib/capinfra/auth';
import { ZNotificationsListQuery } from '../../../../lib/capinfra/types';
import { listNotifications } from '../../../../lib/capinfra/notifications';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.SUPPORT_READ_ONLY,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const q = ZNotificationsListQuery.parse(req.query);
      const items = await listNotifications(q);
      res.status(200).json({ items });
    },
  },
]);
