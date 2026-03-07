import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { agBudgets } from '../../../../shared/agentGovSchema';
import { isAgentGovAuthorized } from '../../../../lib/agent-gov/auth';
import { appendAuditRecord } from '../../../../lib/agent-gov/audit';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    if (!isAgentGovAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });
    const agentId = req.query.agent_id as string | undefined;
    const query = agentId
      ? db.select().from(agBudgets).where(eq(agBudgets.agentId, agentId)).orderBy(desc(agBudgets.createdAt))
      : db.select().from(agBudgets).orderBy(desc(agBudgets.createdAt));
    const rows = await query;
    return res.json({ budgets: rows });
  }

  if (req.method === 'POST') {
    if (!isAgentGovAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

    const {
      agentId, policyId, denom,
      maxNotionalPerTrade, maxNotionalPerDay, maxDailyLoss, maxOpenPositions,
      allowedVenues, allowedAssets,
    } = req.body;

    if (!agentId || !policyId || maxNotionalPerTrade === undefined || maxNotionalPerDay === undefined || maxDailyLoss === undefined || maxOpenPositions === undefined) {
      return res.status(400).json({ error: 'agentId, policyId, maxNotionalPerTrade, maxNotionalPerDay, maxDailyLoss, maxOpenPositions are required' });
    }

    const [budget] = await db.insert(agBudgets).values({
      agentId,
      policyId,
      denom: denom || 'AXUSD',
      maxNotionalPerTrade: String(maxNotionalPerTrade),
      maxNotionalPerDay: String(maxNotionalPerDay),
      maxDailyLoss: String(maxDailyLoss),
      maxOpenPositions,
      allowedVenues: allowedVenues || [],
      allowedAssets: allowedAssets || [],
    }).returning();

    await appendAuditRecord('BUDGET', budget.id, { action: 'CREATED', agentId, policyId });

    return res.status(201).json({ budget });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
