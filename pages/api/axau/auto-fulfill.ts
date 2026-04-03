import type { NextApiRequest, NextApiResponse } from 'next';
import { autoFulfillRequest } from '../../../lib/services/AXAUFulfillmentService';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;

export const config = {
  api: { responseLimit: false, bodyParser: true },
  maxDuration: 60,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { requestId } = req.body;
  if (!requestId || typeof requestId !== 'string') {
    return res.status(400).json({ error: 'requestId required' });
  }

  try {
    const result = await autoFulfillRequest(requestId);
    if (!result.success) {
      return res.status(400).json({ error: result.error, data: result });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
