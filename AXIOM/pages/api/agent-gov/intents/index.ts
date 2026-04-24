import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { agIntents } from '../../../../shared/agentGovSchema';
import { isAgentGovAuthorized } from '../../../../lib/agent-gov/auth';
import { appendAuditRecord } from '../../../../lib/agent-gov/audit';
import { desc, eq, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    if (!isAgentGovAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

    const { agent_id, status, intent_type, limit } = req.query;
    const conditions: SQL[] = [];

    if (agent_id && typeof agent_id === 'string') {
      conditions.push(eq(agIntents.agentId, agent_id));
    }
    if (status && typeof status === 'string') {
      conditions.push(eq(agIntents.status, status as any));
    }
    if (intent_type && typeof intent_type === 'string') {
      conditions.push(eq(agIntents.intentType, intent_type as any));
    }

    const take = Math.min(Number(limit) || 50, 200);

    const query = conditions.length > 0
      ? db.select().from(agIntents).where(and(...conditions)).orderBy(desc(agIntents.requestedAt)).limit(take)
      : db.select().from(agIntents).orderBy(desc(agIntents.requestedAt)).limit(take);

    const rows = await query;
    return res.json({ intents: rows });
  }

  if (req.method === 'POST') {
    if (!isAgentGovAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

    const { agentId, intentType, payload, correlationId } = req.body;
    if (!agentId || !intentType || !payload) {
      return res.status(400).json({ error: 'agentId, intentType, and payload are required' });
    }

    const validTypes = ['TRADE', 'UNDERWRITE', 'PARAM_CHANGE_PROPOSAL', 'REPORT'];
    if (!validTypes.includes(intentType)) {
      return res.status(400).json({ error: `intentType must be one of: ${validTypes.join(', ')}` });
    }

    const [intent] = await db.insert(agIntents).values({
      agentId,
      intentType,
      payload,
      correlationId: correlationId || null,
      status: 'PENDING',
    }).returning();

    await appendAuditRecord('INTENT', intent.id, { action: 'SUBMITTED', agentId, intentType });

    return res.status(201).json({ intent });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
