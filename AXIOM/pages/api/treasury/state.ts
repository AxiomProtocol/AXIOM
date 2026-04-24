import type { NextApiRequest, NextApiResponse } from 'next';
import { reserveAccountingService } from '../../../lib/services/ReserveAccountingService';
import { treasuryLedgerService } from '../../../lib/services/TreasuryLedgerService';
import { allocationPolicyService } from '../../../lib/services/AllocationPolicyService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [composition, bucketBalances, allocations] = await Promise.all([
      reserveAccountingService.getComposition(),
      treasuryLedgerService.getBucketBalances(),
      allocationPolicyService.getLatestActuals(),
    ]);

    const byBucket = Object.fromEntries(
      bucketBalances.map((b) => [b.bucket, { usdValue: b.totalUsdValue, txCount: b.transactionCount }]),
    );

    return res.status(200).json({
      success: true,
      data: {
        totals: {
          totalUsd: composition.totalUsd,
          totalFiatUsd: composition.totalFiatUsd,
          totalUsdcUsd: composition.totalUsdcUsd,
          totalPaxgUsd: composition.totalPaxgUsd,
          totalAxusdSupplyUsd: composition.totalAxusdSupplyUsd,
          reserveRatio: composition.reserveRatio,
          paxgPrice: composition.paxgPrice,
        },
        byAsset: composition.breakdown.map((b) => ({
          assetSymbol: b.assetSymbol,
          positionType: b.positionType,
          usdValue: b.usdValue,
          pct: b.pct,
          trustSource: b.trustSource,
        })),
        byBucket,
        allocations,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[api/treasury/state]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to compute treasury state' });
  }
}
