/**
 * GET /api/capinfra/operator/assets/summary — asset registry overview.
 *
 * Returns one row per active asset with: latest SPOT price (with
 * staleness flag), most recent reserve snapshot (nullable in Phase 1),
 * and total audit event count. Auditor-read-only auth required.
 *
 * Optional query: ?status=ACTIVE|INACTIVE|... to filter, default ACTIVE.
 */

import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../lib/capinfra/auth';
import { listAssets } from '../../../../../lib/capinfra/assetRegistry';
import { getLatestPrice } from '../../../../../lib/capinfra/marketData';
import { db } from '../../../../../server/db';
import {
  capAuditEvents,
  capReserveSnapshots,
} from '../../../../../shared/capInfraSchema';
import { ZAssetType, ZRecordStatus } from '../../../../../lib/capinfra/types';
import { desc, eq, sql } from 'drizzle-orm';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    handler: async (req, res) => {
      const rawType = typeof req.query.type === 'string' ? req.query.type : undefined;
      const rawStatus = typeof req.query.status === 'string' ? req.query.status : undefined;
      const rawSymbol = typeof req.query.symbol === 'string' ? req.query.symbol.trim() : undefined;
      const typeParsed = rawType ? ZAssetType.safeParse(rawType) : undefined;
      const statusParsed = rawStatus ? ZRecordStatus.safeParse(rawStatus) : undefined;
      if (typeParsed && !typeParsed.success) {
        res.status(400).json({ error: 'Invalid type filter' });
        return;
      }
      if (statusParsed && !statusParsed.success) {
        res.status(400).json({ error: 'Invalid status filter' });
        return;
      }
      const assets = await listAssets({
        ...(typeParsed?.success ? { type: typeParsed.data } : {}),
        ...(statusParsed?.success ? { status: statusParsed.data } : {}),
        ...(rawSymbol ? { symbol: rawSymbol } : {}),
      });
      const items = await Promise.all(
        assets.map(async (asset) => {
          const [latestSpot, [latestReserve], [{ count }]] = await Promise.all([
            getLatestPrice(asset.id, 'SPOT'),
            db
              .select()
              .from(capReserveSnapshots)
              .where(eq(capReserveSnapshots.assetId, asset.id))
              .orderBy(desc(capReserveSnapshots.observedAt))
              .limit(1),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(capAuditEvents)
              .where(eq(capAuditEvents.assetId, asset.id)),
          ]);
          return {
            asset,
            latestSpot,
            latestReserve: latestReserve ?? null,
            auditEventCount: count ?? 0,
          };
        }),
      );
      res.status(200).json({ items });
    },
  },
]);
