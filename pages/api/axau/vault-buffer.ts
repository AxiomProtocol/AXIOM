import type { NextApiRequest, NextApiResponse } from 'next';
import { getVaultBuffer } from '../../../lib/services/AXAUFulfillmentService';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const buffer = await getVaultBuffer();
    return res.status(200).json({ success: true, data: buffer });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
