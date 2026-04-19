import { z } from 'zod';
import { createRouter } from '../../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../../lib/capinfra/auth';
import { retirePolicyVersion } from '../../../../../../lib/capinfra/policy/publication';
import { ValidationError } from '../../../../../../lib/capinfra/errors';

const ZBody = z.object({ reasonCode: z.string().min(1).max(100) });

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.COMPLIANCE_ADMIN,
    handler: async (req, res) => {
      const id = req.query.id;
      if (typeof id !== 'string' || id.length === 0) {
        throw new ValidationError('id is required');
      }
      const body = ZBody.parse(req.body);
      const actor = getActor(req);
      const row = await retirePolicyVersion(id, actor, body.reasonCode);
      res.status(200).json({ policy: row });
    },
  },
]);
