import type { NextApiRequest, NextApiResponse } from 'next';
import { isAgentGovAuthorized } from '../../../lib/agent-gov/auth';
import { runIngestion } from '../../../lib/distressed-feed/ingestion';
import { matchListingsToBuyBoxes } from '../../../lib/distressed-feed/matching';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAgentGovAuthorized(req)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const { states } = req.body || {};
    const ingestionResult = await runIngestion(states);
    const matchResult = await matchListingsToBuyBoxes();

    return res.json({
      ingestion: ingestionResult,
      matching: matchResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Ingestion failed', detail: message });
  }
}
