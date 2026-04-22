/**
 * GET /api/capinfra/portfolio/ledger — list double-entry ledger rows.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../lib/capinfra/auth';
import { ZLedgerQuery } from '../../../../lib/capinfra/types';
import { listLedgerEntries } from '../../../../lib/capinfra/portfolio';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const q = ZLedgerQuery.parse(req.query);
      const items = await listLedgerEntries(q);
      res.status(200).json({ items });
    },
  },
]);
