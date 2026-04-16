import type { NextApiRequest, NextApiResponse } from 'next';
import { homepageTruthService } from '../../../lib/services/HomepageTruthService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const truth = await homepageTruthService.resolve();
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
    return res.status(200).json({ success: true, data: truth });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[api/homepage/truth]', message);
    return res.status(500).json({ success: false, error: 'Failed to resolve homepage truth' });
  }
}
