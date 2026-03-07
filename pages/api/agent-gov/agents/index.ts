import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { agAgents } from '../../../../shared/agentGovSchema';
import { isAgentGovAuthorized } from '../../../../lib/agent-gov/auth';
import { appendAuditRecord } from '../../../../lib/agent-gov/audit';
import { desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const rows = await db.select().from(agAgents).orderBy(desc(agAgents.createdAt));
    return res.json({ agents: rows });
  }

  if (req.method === 'POST') {
    if (!isAgentGovAuthorized(req)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, description, modelProvider, modelName, version, permissionScope, defaultMode } = req.body;
    if (!name || !modelProvider || !modelName) {
      return res.status(400).json({ error: 'name, modelProvider, and modelName are required' });
    }

    const [agent] = await db.insert(agAgents).values({
      name,
      description: description || null,
      modelProvider,
      modelName,
      version: version || '1.0.0',
      permissionScope: permissionScope || { allowed_domains: [], venues: [], symbols: [] },
      defaultMode: defaultMode || 'ADVISORY',
    }).returning();

    await appendAuditRecord('AGENT', agent.id, { action: 'CREATED', agent });

    return res.status(201).json({ agent });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
