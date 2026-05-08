import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { db } from '@/server/db';
import { treasuryAllocations } from '@/shared/treasurySchema';
import { desc, sql } from 'drizzle-orm';

interface AutoAllocMeta {
  source?: string;
  run_id?: string;
  deposit_id?: string;
  pct?: number;
  rationale?: string;
}

function parseMeta(raw: unknown): AutoAllocMeta {
  if (raw && typeof raw === 'object') return raw as AutoAllocMeta;
  return {};
}

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

    const rows = await db
      .select()
      .from(treasuryAllocations)
      .where(sql`metadata->>'run_id' = ${runId}`)
      .orderBy(treasuryAllocations.allocationBucket);

    const totalUsd = rows.reduce((s, r) => s + Number(r.usdValue ?? 0), 0);
    const firstMeta = parseMeta(rows[0]?.metadata);

    // Derive overall execution status from the row statuses
    const statuses = rows.map(r => r.status);
    const executionStatus =
      statuses.every(s => s === 'executed') ? 'executed' :
      statuses.some(s => s === 'executing') ? 'executing' :
      statuses.some(s => s === 'executed')  ? 'partial' :
      'recorded';

    return res.status(200).json({
      success: true,
      data: {
        run_id: runId,
        created_at: latestRow[0].createdAt,
        amount_usd: totalUsd,
        bucket_count: rows.length,
        source_label: 'AUTO (AI)',
        execution_status: executionStatus,
        rationale: firstMeta.rationale ?? null,
        deposit_id: firstMeta.deposit_id ?? null,
        buckets: rows.map(r => {
          const m = parseMeta(r.metadata);
          return {
            bucket: r.allocationBucket,
            asset: r.assetSymbol,
            usd_amount: Number(r.usdValue ?? 0),
            pct: m.pct ?? null,
            status: r.status,
          };
        }),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[last-auto-alloc]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
