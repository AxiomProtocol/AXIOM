import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { agPolicies } from '../../../../../shared/schema';
import { isAgentGovAuthorized } from '../../../../../lib/agent-gov/auth';
import { appendAuditRecord } from '../../../../../lib/agent-gov/audit';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAgentGovAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid policy ID' });

  const existing = await db.select().from(agPolicies).where(eq(agPolicies.id, id)).limit(1);
  if (existing.length === 0) return res.status(404).json({ error: 'Policy not found' });

  await db.update(agPolicies)
    .set({ status: 'DEPRECATED', updatedAt: new Date() })
    .where(eq(agPolicies.status, 'ACTIVE'));

  const [activated] = await db.update(agPolicies)
    .set({ status: 'ACTIVE', updatedAt: new Date() })
    .where(eq(agPolicies.id, id))
    .returning();

  await appendAuditRecord('POLICY', id, { action: 'ACTIVATED', name: activated.name, version: activated.version });

  return res.json({ policy: activated });
}
