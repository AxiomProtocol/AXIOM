import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { agAuditLog } from '../../../../shared/agentGovSchema';
import { isAgentGovAuthorized } from '../../../../lib/agent-gov/auth';
import { desc, eq, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAgentGovAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  const { entity_type, entity_id, limit } = req.query;
  const conditions: SQL[] = [];

  if (entity_type && typeof entity_type === 'string') {
    conditions.push(eq(agAuditLog.entityType, entity_type as any));
  }
  if (entity_id && typeof entity_id === 'string') {
    conditions.push(eq(agAuditLog.entityId, entity_id));
  }

  const take = Math.min(Number(limit) || 50, 500);

  const query = conditions.length > 0
    ? db.select().from(agAuditLog).where(and(...conditions)).orderBy(desc(agAuditLog.createdAt)).limit(take)
    : db.select().from(agAuditLog).orderBy(desc(agAuditLog.createdAt)).limit(take);

  const rows = await query;
  return res.json({ audit: rows, count: rows.length });
}
