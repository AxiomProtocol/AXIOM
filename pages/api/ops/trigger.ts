import type { NextApiRequest, NextApiResponse } from 'next';
import {
  markExpired,
  checkInvalidations,
  runScan,
  runSignals,
  runFullCycle,
} from '../../../server/services/ops/operations';

const VALID_OPERATIONS = [
  'run-scan',
  'check-invalidations',
  'mark-expired',
  'run-signals',
  'full-cycle',
] as const;

type Operation = typeof VALID_OPERATIONS[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { operation, scanType } = req.body || {};

  if (!operation || !VALID_OPERATIONS.includes(operation)) {
    return res.status(400).json({
      success: false,
      error: `Invalid operation. Valid: ${VALID_OPERATIONS.join(', ')}`,
    });
  }

  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey && process.env.NODE_ENV !== 'development') {
    return res.status(500).json({ success: false, error: 'Scan key not configured' });
  }

  try {
    let result: any;

    switch (operation as Operation) {
      case 'mark-expired':
        result = await markExpired();
        break;
      case 'check-invalidations':
        result = await checkInvalidations();
        break;
      case 'run-scan':
        result = await runScan(scanType || 'all');
        break;
      case 'run-signals':
        result = await runSignals();
        break;
      case 'full-cycle':
        result = await runFullCycle(scanType || 'all');
        break;
    }

    const status = result.success ? 200 : (operation === 'full-cycle' && result.cycleComplete ? 207 : 500);
    return res.status(status).json(result);
  } catch (err: any) {
    console.error(`[ops/trigger] Error running ${operation}:`, err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
