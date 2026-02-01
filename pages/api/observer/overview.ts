/**
 * Observer API - Overview Endpoint
 * 
 * Returns overview metrics for the Institutional Observer Dashboard.
 * Read-only endpoint, no authentication required.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { observerService } from '../../../server/services/observer/ObserverService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await observerService.getOverview();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Observer API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      cached: false,
      proofLinks: []
    });
  }
}
