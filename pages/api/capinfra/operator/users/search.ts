import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../lib/capinfra/auth';
import { db } from '../../../../../server/db';
import {
  capUsers,
  capWallets,
} from '../../../../../shared/capInfraSchema';
import { ilike, or, inArray } from 'drizzle-orm';

const MAX_RESULTS = 10;

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!q || q.length < 2) {
        res.status(200).json({ items: [] });
        return;
      }

      const pattern = `%${q}%`;

      const byUser = await db
        .select({
          id: capUsers.id,
          primaryEmail: capUsers.primaryEmail,
          externalId: capUsers.externalId,
          entityType: capUsers.entityType,
          status: capUsers.status,
        })
        .from(capUsers)
        .where(
          or(
            ilike(capUsers.primaryEmail, pattern),
            ilike(capUsers.externalId, pattern),
            ilike(capUsers.id, pattern),
          ),
        )
        .limit(MAX_RESULTS);

      let byWallet: typeof byUser = [];
      if (byUser.length < MAX_RESULTS) {
        const wallets = await db
          .select({ userId: capWallets.userId, address: capWallets.address })
          .from(capWallets)
          .where(ilike(capWallets.address, pattern))
          .limit(MAX_RESULTS);

        const walletUserIds = wallets
          .map((w) => w.userId)
          .filter((uid) => !byUser.some((u) => u.id === uid));

        if (walletUserIds.length > 0) {
          byWallet = await db
            .select({
              id: capUsers.id,
              primaryEmail: capUsers.primaryEmail,
              externalId: capUsers.externalId,
              entityType: capUsers.entityType,
              status: capUsers.status,
            })
            .from(capUsers)
            .where(inArray(capUsers.id, walletUserIds))
            .limit(MAX_RESULTS - byUser.length);
        }
      }

      const items = [...byUser, ...byWallet].slice(0, MAX_RESULTS);
      res.status(200).json({ items });
    },
  },
]);
