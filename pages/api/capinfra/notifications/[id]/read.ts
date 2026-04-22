/**
 * POST /api/capinfra/notifications/[id]/read — mark a notification read.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../lib/capinfra/auth';
import { NotFoundError } from '../../../../../lib/capinfra/errors';
import { markRead } from '../../../../../lib/capinfra/notifications';

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.SUPPORT_READ_ONLY,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const id = String(req.query.id ?? '');
      const updated = await markRead(id);
      if (!updated) throw new NotFoundError(`notification ${id} not found`);
      res.status(200).json({ notification: updated });
    },
  },
]);
