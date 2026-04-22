import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { t3ComplianceOpsLog, t3ComplianceEvents } from '../../../../shared/erc3643Schema';
import { desc } from 'drizzle-orm';

function checkAdminKey(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return key === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });

  const limit = Math.min(Number(req.query.limit ?? 100), 500);

  try {
    const [opsRows, transferRows] = await Promise.all([
      db.select().from(t3ComplianceOpsLog).orderBy(desc(t3ComplianceOpsLog.createdAt)).limit(limit),
      db.select().from(t3ComplianceEvents).orderBy(desc(t3ComplianceEvents.createdAt)).limit(limit),
    ]);

    const opsEntries = opsRows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      eventType: 'claim_lifecycle',
      wallet: r.wallet,
      action: r.action,
      topic: r.topic ?? null,
      claimId: r.claimId ?? null,
      operatorAddress: r.operatorAddress ?? null,
      txHash: r.txHash ?? null,
      result: r.result,
      notes: r.notes ?? null,
      metadata: r.metadata ?? null,
    }));

    const transferEntries = transferRows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      eventType: 'transfer_compliance',
      wallet: r.fromAddress,
      action: r.result === 'pass' ? 'transfer_allowed' : 'transfer_blocked',
      topic: null,
      claimId: null,
      operatorAddress: null,
      txHash: r.txHash ?? null,
      result: r.result === 'pass' ? 'success' : 'blocked',
      notes: r.reason ?? null,
      metadata: {
        fromAddress: r.fromAddress,
        toAddress: r.toAddress,
        amount: r.amount,
        moduleChecked: r.moduleChecked,
      },
    }));

    const merged = [...opsEntries, ...transferEntries]
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, limit);

    return res.status(200).json({ success: true, data: merged });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
