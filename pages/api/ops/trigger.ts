import type { NextApiRequest, NextApiResponse } from 'next';

const VALID_OPERATIONS = [
  'run-scan',
  'check-invalidations',
  'mark-expired',
  'run-signals',
  'full-cycle',
] as const;

type Operation = typeof VALID_OPERATIONS[number];

function getBaseUrl(req: NextApiRequest): string {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['host'] || 'localhost:5000';
  return `${protocol}://${host}`;
}

const OPERATION_ENDPOINTS: Record<Operation, string> = {
  'run-scan': '/api/mirdt/run-scan',
  'check-invalidations': '/api/mirdt/check-invalidations',
  'mark-expired': '/api/mirdt/mark-expired',
  'run-signals': '/api/sentinel/run-signals',
  'full-cycle': '/api/scheduler/run-cycle',
};

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

  const baseUrl = getBaseUrl(req);
  const endpoint = OPERATION_ENDPOINTS[operation as Operation];

  try {
    const url = operation === 'run-scan' && scanType
      ? `${baseUrl}${endpoint}?type=${scanType}`
      : `${baseUrl}${endpoint}`;

    const fetchRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(scanKey ? { 'x-scan-key': scanKey } : {}),
      },
      body: operation === 'full-cycle' ? JSON.stringify({ scanType: scanType || 'all' }) : undefined,
    });

    const data = await fetchRes.json();
    return res.status(fetchRes.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
