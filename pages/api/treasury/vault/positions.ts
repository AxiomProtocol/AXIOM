import type { NextApiRequest, NextApiResponse } from 'next';
import { getVaultSummary } from '../../../../lib/treasury/vault/vaultService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const summary = await getVaultSummary();
    const positions = [
      {
        strategyKey: 'aave_v3',
        ...summary.aavePosition,
      },
      {
        strategyKey: 'camelot',
        ...summary.camelotPosition,
      },
    ];
    return res.status(200).json({ success: true, data: positions });
  } catch (err: any) {
    console.error('[api/treasury/vault/positions]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch vault positions' });
  }
}
