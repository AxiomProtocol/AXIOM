import type { NextApiRequest, NextApiResponse } from 'next';
import { getVaultSummary } from '../../../../lib/treasury/vault/vaultService';
import { ensureVaultPollerRunning } from '../../../../lib/treasury/vault/pollerSingleton';
import { readOperatorCookie, isValidOperatorKey } from '../../../../lib/capinfra/operatorAuth';

// Start on-chain event ingestion as soon as this module is loaded.
// In a persistent process this runs once; in cold-start serverless it runs
// per-execution context (DB dedup prevents duplicate rows).
ensureVaultPollerRunning();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const cookie = readOperatorCookie(req);
  if (!isValidOperatorKey(cookie)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const summary = await getVaultSummary();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, data: summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/treasury/vault/summary]', message);
    return res.status(500).json({ success: false, error: 'Failed to fetch vault summary' });
  }
}
