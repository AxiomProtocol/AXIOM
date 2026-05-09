import { z } from 'zod';
import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../../lib/capinfra/auth';
import { db } from '../../../../../server/db';
import { capPolicyDecisions } from '../../../../../shared/capInfraSchema';

const ZQuery = z.object({
  userId: z.string().optional(),
  assetId: z.string().optional(),
  action: z.string().optional(),
  allowed: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  reasonCode: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    handler: async (req, res) => {
      const f = ZQuery.parse(req.query);
      const limit = f.limit ?? 100;
      const conds: SQL[] = [];
      if (f.userId) conds.push(eq(capPolicyDecisions.userId, f.userId));
      if (f.assetId) conds.push(eq(capPolicyDecisions.assetId, f.assetId));
      if (f.action) conds.push(eq(capPolicyDecisions.actionType, f.action as any));
      if (typeof f.allowed === 'boolean') conds.push(eq(capPolicyDecisions.allowed, f.allowed));
      if (f.reasonCode) conds.push(eq(capPolicyDecisions.reasonCode, f.reasonCode));
      if (f.from) conds.push(gte(capPolicyDecisions.createdAt, new Date(f.from)));
      if (f.to) conds.push(lte(capPolicyDecisions.createdAt, new Date(f.to)));
      const q = db
        .select()
        .from(capPolicyDecisions)
        .orderBy(desc(capPolicyDecisions.createdAt), desc(capPolicyDecisions.id))
        .limit(limit);
      const items = conds.length > 0 ? await q.where(and(...conds)) : await q;
      res.status(200).json({ items });
    },
  },
]);
