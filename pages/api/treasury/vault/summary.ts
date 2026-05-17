import type { NextApiRequest, NextApiResponse } from 'next';
import { getVaultSummary } from '../../../../lib/treasury/vault/vaultService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const summary = await getVaultSummary();
    return res.status(200).json({ success: true, data: summary });
  } catch (err: any) {
    console.error('[api/treasury/vault/summary]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch vault summary' });
  }
}
