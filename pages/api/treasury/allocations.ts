import type { NextApiRequest, NextApiResponse } from 'next';
import { allocationPolicyService } from '../../../lib/services/AllocationPolicyService';
import { treasuryLedgerService } from '../../../lib/services/TreasuryLedgerService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [actuals, bucketBalances, variance] = await Promise.all([
      allocationPolicyService.getLatestActuals(),
      treasuryLedgerService.getBucketBalances(),
      treasuryLedgerService.computeVariance(),
    ]);

    const bucketMap = new Map(bucketBalances.map((b) => [b.bucket, b]));
    const varianceMap = new Map(variance.map((v) => [v.bucket, v]));

    const enriched = actuals.map((a) => ({
      bucketName: a.bucketName,
      targetPct: a.targetPct,
      actualPct: a.actualPct,
      variancePct: a.variancePct,
      usdValue: a.usdValue,
      status: a.status,
      ledgerUsdValue: bucketMap.get(a.bucketName)?.totalUsdValue ?? 0,
      ledgerTxCount: bucketMap.get(a.bucketName)?.transactionCount ?? 0,
      policyStatus: varianceMap.get(a.bucketName)?.status ?? 'within_range',
    }));

    return res.status(200).json({
      success: true,
      data: enriched,
      count: enriched.length,
    });
  } catch (err: any) {
    console.error('[api/treasury/allocations]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch allocations' });
  }
}
