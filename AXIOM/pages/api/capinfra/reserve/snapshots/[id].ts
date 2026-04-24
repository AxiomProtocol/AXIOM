import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../lib/capinfra/auth';
import { getSnapshot } from '../../../../../lib/capinfra/reserve/snapshot';
import { ValidationError } from '../../../../../lib/capinfra/errors';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    handler: async (req, res) => {
      const id = req.query.id;
      if (typeof id !== 'string' || !id) throw new ValidationError('id is required');
      const result = await getSnapshot(id);
      res.status(200).json(result);
    },
  },
]);
