import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { agAgents } from '../../../../shared/agentGovSchema';
import { isAgentGovAuthorized } from '../../../../lib/agent-gov/auth';
import { appendAuditRecord } from '../../../../lib/agent-gov/audit';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid agent ID' });

  if (req.method === 'GET') {
    const rows = await db.select().from(agAgents).where(eq(agAgents.id, id)).limit(1);
    if (rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    return res.json({ agent: rows[0] });
  }

  if (req.method === 'PATCH') {
    if (!isAgentGovAuthorized(req)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updates: Record<string, unknown> = {};
    const allowed = ['name', 'description', 'status', 'defaultMode', 'permissionScope', 'version'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updatedAt = new Date();

    const [updated] = await db.update(agAgents)
      .set(updates)
      .where(eq(agAgents.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Agent not found' });

    await appendAuditRecord('AGENT', id, { action: 'UPDATED', changes: updates });

    return res.json({ agent: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
