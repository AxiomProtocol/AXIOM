import { z } from 'zod';
import { createRouter } from '../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../lib/capinfra/auth';
import { getAssetHeadroom } from '../../../../lib/capinfra/reserve/service';

const ZQuery = z.object({ assetId: z.string().min(1) });

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    handler: async (req, res) => {
      const { assetId } = ZQuery.parse(req.query);
      const headroom = await getAssetHeadroom(assetId);
      res.status(200).json({ headroom });
    },
  },
]);
