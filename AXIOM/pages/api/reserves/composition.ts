import type { NextApiRequest, NextApiResponse } from 'next';
import { reserveAccountingService } from '../../../lib/services/ReserveAccountingService';
import { disclosureSnapshotService } from '../../../lib/services/DisclosureSnapshotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [composition, latestSnapshot] = await Promise.all([
      reserveAccountingService.getComposition(),
      disclosureSnapshotService.getLatestSnapshot(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalUsd: composition.totalUsd,
        totalFiatUsd: composition.totalFiatUsd,
        totalUsdcUsd: composition.totalUsdcUsd,
        totalPaxgUsd: composition.totalPaxgUsd,
        totalAxusdSupplyUsd: composition.totalAxusdSupplyUsd,
        reserveRatio: composition.reserveRatio,
        paxgPrice: composition.paxgPrice,
        breakdown: composition.breakdown.map((b) => ({
          assetSymbol: b.assetSymbol,
          positionType: b.positionType,
          quantity: b.quantity,
          markPrice: b.markPrice,
          usdValue: b.usdValue,
          pct: parseFloat(b.pct.toFixed(2)),
          trustSource: {
            source: b.trustSource.source,
            confidence: b.trustSource.confidence,
            lastVerifiedAt: b.trustSource.lastVerifiedAt,
          },
        })),
        lastSnapshotAt: latestSnapshot?.createdAt ?? null,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[api/reserves/composition]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to compute reserve composition' });
  }
}
