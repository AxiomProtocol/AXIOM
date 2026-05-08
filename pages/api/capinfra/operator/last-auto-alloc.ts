import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { db } from '@/server/db';
import { treasuryAllocations } from '@/shared/treasurySchema';
import { eq, desc, and, sql } from 'drizzle-orm';

/**
 * GET /api/capinfra/operator/last-auto-alloc
 *
 * Returns the most recent AI auto-allocation run — its run ID, date,
 * total amount, and per-bucket breakdown.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Find the most recent AUTO_AI run_id
    const latestRow = await db
      .select({
        runId: sql<string>`metadata->>'run_id'`,
        createdAt: treasuryAllocations.createdAt,
      })
      .from(treasuryAllocations)
      .where(sql`metadata->>'source' = 'AUTO_AI'`)
      .orderBy(desc(treasuryAllocations.createdAt))
      .limit(1);

    if (!latestRow[0]) {
      return res.status(200).json({ success: true, data: null });
    }

    const runId = latestRow[0].runId;

    // Fetch all rows for this run
    const rows = await db
      .select()
      .from(treasuryAllocations)
      .where(sql`metadata->>'run_id' = ${runId}`)
      .orderBy(treasuryAllocations.allocationBucket);

    const totalUsd = rows.reduce((s, r) => s + Number(r.usdValue ?? 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        run_id: runId,
        created_at: latestRow[0].createdAt,
        amount_usd: totalUsd,
        bucket_count: rows.length,
        rationale: (rows[0]?.metadata as any)?.rationale ?? null,
        deposit_id: (rows[0]?.metadata as any)?.deposit_id ?? null,
        buckets: rows.map(r => ({
          bucket: r.allocationBucket,
          asset: r.assetSymbol,
          usd_amount: Number(r.usdValue ?? 0),
          pct: (r.metadata as any)?.pct ?? null,
        })),
      },
    });
  } catch (err: any) {
    console.error('[last-auto-alloc]', err?.message ?? err);
    return res.status(500).json({ success: false, error: err?.message ?? 'Failed' });
  }
}
