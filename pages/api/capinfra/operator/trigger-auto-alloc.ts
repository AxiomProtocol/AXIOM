import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { db } from '@/server/db';
import { capCardDeposits, capAuditEvents } from '@/shared/capInfraSchema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/capinfra/ids';

/**
 * POST /api/capinfra/operator/trigger-auto-alloc
 *
 * Admin-only: manually re-trigger AI auto-allocation for a specific deposit.
 * Body: { deposit_id: string }  OR  { amount_cents: number } (ad-hoc amount)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { deposit_id, amount_cents } = req.body ?? {};

  // Resolve amountCents and depositId
  let amountCents: number;
  let depositId: string;

  if (deposit_id) {
    const rows = await db
      .select()
      .from(capCardDeposits)
      .where(eq(capCardDeposits.id, deposit_id))
      .limit(1);
    const dep = rows[0];
    if (!dep) {
      return res.status(404).json({ success: false, error: `Deposit ${deposit_id} not found` });
    }
    amountCents = dep.amountCents;
    depositId = dep.id;
  } else if (amount_cents != null && Number.isInteger(Number(amount_cents)) && Number(amount_cents) > 0) {
    amountCents = Number(amount_cents);
    depositId = `manual_${Date.now()}`;
  } else {
    return res.status(400).json({
      success: false,
      error: 'Provide deposit_id (existing deposit) or amount_cents (ad-hoc amount)',
    });
  }

  try {
    const { runAutoAlloc } = await import('@/lib/wallet/autoAllocate');
    const result = await runAutoAlloc({ amountCents, depositId });

    return res.status(200).json({
      success: true,
      run_id: result.runId,
      amount_usd: result.amountUsd,
      bucket_count: result.buckets.length,
      buckets: result.buckets,
      rationale: result.rationale,
    });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error('[trigger-auto-alloc]', msg);

    await db.insert(capAuditEvents).values({
      id: generateId('ae'),
      eventType: 'card_deposit.auto_allocation_failed',
      aggregateType: 'card_deposit',
      aggregateId: depositId,
      payloadJson: { error: msg, source: 'trigger-auto-alloc', amountCents },
      actor: 'operator',
    }).onConflictDoNothing();

    return res.status(500).json({ success: false, error: msg });
  }
}
