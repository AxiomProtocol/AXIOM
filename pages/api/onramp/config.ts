/**
 * Onramp Config API - Returns client-safe configuration
 * GET /api/onramp/config
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getClientSafeConfig } from '../../../lib/onramp/config';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = getClientSafeConfig();
    return res.status(200).json(config);
  } catch (error) {
    console.error('Failed to get onramp config:', error);
    return res.status(500).json({ error: 'Failed to load configuration' });
  }
}
