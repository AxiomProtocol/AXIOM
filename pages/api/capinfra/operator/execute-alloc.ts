import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { db } from '@/server/db';
import { treasuryAllocations } from '@/shared/treasurySchema';
import { capAuditEvents } from '@/shared/capInfraSchema';
import { desc, sql } from 'drizzle-orm';
import { generateId } from '@/lib/capinfra/ids';

/**
 * POST /api/capinfra/operator/execute-alloc
 *
 * Admin-only: execute a completed AI auto-allocation run.
 * Fetches live prices, converts USD→tokens, writes reserve_positions,
 * debits the internal wallet, and marks allocations as executed.
 *
 * Body:
 *   { run_id: string }                     — execute a specific run
 *   { latest: true }                       — execute the most recent recorded run
 *   { run_id: string, user_id?: string }   — with explicit user override
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  let runId: string | undefined = typeof body.run_id === 'string' ? body.run_id : undefined;
  const userId = typeof body.user_id === 'string' ? body.user_id : undefined;
  const useLatest = body.latest === true;

  // If no run_id provided, resolve the latest recorded run
  if (!runId && useLatest) {
    const latestRow = await db
      .select({ runId: sql<string>`metadata->>'run_id'` })
      .from(treasuryAllocations)
      .where(sql`metadata->>'source' = 'AUTO_AI' AND status = 'recorded'`)
      .orderBy(desc(treasuryAllocations.createdAt))
      .limit(1);
    runId = latestRow[0]?.runId ?? undefined;
    if (!runId) {
      return res.status(404).json({ success: false, error: 'No unexecuted AUTO_AI allocation run found' });
    }
  }

  if (!runId) {
    return res.status(400).json({
      success: false,
      error: 'Provide run_id or set latest: true',
    });
  }

  try {
    const { executeAlloc } = await import('@/lib/wallet/executeAlloc');
    const result = await executeAlloc({ runId, userId });

    return res.status(200).json({
      success: true,
      exec_id: result.execId,
      run_id: result.runId,
      amount_usd: result.amountUsd,
      bucket_count: result.buckets.length,
      executed_at: result.executedAt,
      prices_fetched_at: result.pricesFetchedAt,
      buckets: result.buckets.map(b => ({
        bucket:           b.bucket,
        asset:            b.asset,
        usd_amount:       b.usdAmount,
        pct:              b.pct,
        quantity:         Number(b.quantity.toFixed(8)),
        mark_price:       b.markPrice,
        price_source:     b.priceSource,
        execution_path:   b.executionPath,
        status:           b.status,
        tx_hash:          b.txHash,
        settlement_status: b.settlementStatus,
        settlement_ref:   b.settlementRef,
        settlement_note:  b.settlementNote,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[execute-alloc]', msg);

    await db.insert(capAuditEvents).values({
      id: generateId('ae'),
      eventType: 'treasury_allocation.execution_failed',
      aggregateType: 'treasury_allocation',
      aggregateId: runId,
      payloadJson: { error: msg, run_id: runId, source: 'execute-alloc' },
      actor: 'operator',
    }).onConflictDoNothing();

    return res.status(500).json({ success: false, error: msg });
  }
}
