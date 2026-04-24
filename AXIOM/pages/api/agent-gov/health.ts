import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { agAgents, agPolicies, agBudgets, agIntents, agDecisions, agExecutions, agAuditLog } from '../../../shared/agentGovSchema';
import { sql, eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const [agents] = await db.select({ count: sql<number>`count(*)::int` }).from(agAgents);
  const [policies] = await db.select({ count: sql<number>`count(*)::int` }).from(agPolicies);
  const [activePolicies] = await db.select({ count: sql<number>`count(*)::int` }).from(agPolicies).where(eq(agPolicies.status, 'ACTIVE'));
  const [budgets] = await db.select({ count: sql<number>`count(*)::int` }).from(agBudgets);
  const [intents] = await db.select({ count: sql<number>`count(*)::int` }).from(agIntents);
  const [decisions] = await db.select({ count: sql<number>`count(*)::int` }).from(agDecisions);
  const [executions] = await db.select({ count: sql<number>`count(*)::int` }).from(agExecutions);
  const [auditEntries] = await db.select({ count: sql<number>`count(*)::int` }).from(agAuditLog);

  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    counts: {
      agents: agents.count,
      policies: policies.count,
      activePolicies: activePolicies.count,
      budgets: budgets.count,
      intents: intents.count,
      decisions: decisions.count,
      executions: executions.count,
      auditEntries: auditEntries.count,
    },
  });
}
