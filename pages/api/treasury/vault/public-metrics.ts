import type { NextApiRequest, NextApiResponse } from 'next';
import { getVaultSummary } from '../../../../lib/treasury/vault/vaultService';

export interface PublicVaultMetrics {
  aumUsdc: number;
  idleUsdc: number;
  deployedUsdc: number;
  aaveApyPct: number | null;
  blendedApyPct: number | null;
  lastUpdated: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: true; data: PublicVaultMetrics } | { success: false; error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const summary = await getVaultSummary();

    const data: PublicVaultMetrics = {
      aumUsdc: summary.aumUsdc,
      idleUsdc: summary.idleUsdc,
      deployedUsdc: summary.deployedUsdc,
      aaveApyPct: summary.aavePosition.apyEstimatePct,
      blendedApyPct: summary.blendedApyEstimatePct,
      lastUpdated: summary.lastUpdated,
    };

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    return res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
}
