import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { agIntents, agDecisions } from '../../../../../shared/agentGovSchema';
import { isAgentGovAuthorized } from '../../../../../lib/agent-gov/auth';
import { appendAuditRecord } from '../../../../../lib/agent-gov/audit';
import { evaluateIntent } from '../../../../../lib/agent-gov/policy-engine';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAgentGovAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid intent ID' });

  const rows = await db.select().from(agIntents).where(eq(agIntents.id, id)).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: 'Intent not found' });

  const intent = rows[0];

  const result = await evaluateIntent(
    intent.agentId,
    intent.id,
    intent.intentType as any,
    intent.payload as Record<string, unknown>,
  );

  const statusMap: Record<string, string> = {
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED',
    THROTTLE: 'REJECTED',
    DOWNGRADE: 'APPROVED',
    HALT: 'REJECTED',
  };

  const newStatus = statusMap[result.decision] || 'REJECTED';

  await db.update(agIntents)
    .set({ status: newStatus as any, updatedAt: new Date() })
    .where(eq(agIntents.id, id));

  const [decision] = await db.insert(agDecisions).values({
    intentId: id,
    policyId: result.policyId,
    regimeId: result.regimeId,
    decision: result.decision as any,
    reason: result.reason,
    checks: result.checks,
  }).returning();

  await appendAuditRecord('DECISION', decision.id, {
    action: 'EVALUATED',
    intentId: id,
    decision: result.decision,
    regime: result.regime,
    reason: result.reason,
  });

  return res.json({ decision, result });
}
