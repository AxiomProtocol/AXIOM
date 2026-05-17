import type { NextApiRequest, NextApiResponse } from 'next';
import { getIncomeSummary } from '../../../../lib/treasury/vault/vaultService';

const VALID_PERIODS = ['monthly', 'quarterly', 'ytd', 'inception'] as const;
type Period = typeof VALID_PERIODS[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rawPeriod = String(req.query.period ?? 'monthly');
  if (!VALID_PERIODS.includes(rawPeriod as Period)) {
    return res.status(400).json({
      error: `Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`,
    });
  }

  try {
    const summary = await getIncomeSummary(rawPeriod as Period);
    return res.status(200).json({ success: true, data: summary });
  } catch (err: any) {
    console.error('[api/treasury/income/summary]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch income summary' });
  }
}
