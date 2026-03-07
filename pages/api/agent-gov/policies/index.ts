import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { agPolicies } from '../../../../shared/agentGovSchema';
import { isAgentGovAuthorized } from '../../../../lib/agent-gov/auth';
import { appendAuditRecord } from '../../../../lib/agent-gov/audit';
import { desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    if (!isAgentGovAuthorized(req)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const rows = await db.select().from(agPolicies).orderBy(desc(agPolicies.createdAt));
    return res.json({ policies: rows });
  }

  if (req.method === 'POST') {
    if (!isAgentGovAuthorized(req)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, rules, version } = req.body;
    if (!name || !rules) {
      return res.status(400).json({ error: 'name and rules are required' });
    }

    const [policy] = await db.insert(agPolicies).values({
      name,
      version: version || 1,
      rules,
    }).returning();

    await appendAuditRecord('POLICY', policy.id, { action: 'CREATED', name, version: version || 1 });

    return res.status(201).json({ policy });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
