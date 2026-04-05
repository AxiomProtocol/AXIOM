import type { NextApiRequest, NextApiResponse } from 'next';
import { systemStateService } from '../../../lib/services/SystemStateService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const state = await systemStateService.getSystemState();
    return res.status(200).json({ success: true, data: state });
  } catch (err: any) {
    console.error('[api/system/status]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to compute system status' });
  }
}
