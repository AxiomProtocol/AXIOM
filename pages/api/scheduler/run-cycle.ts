import type { NextApiRequest, NextApiResponse } from 'next';

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) return process.env.NODE_ENV === 'development';
  return req.headers['x-scan-key'] === scanKey;
}

function getBaseUrl(req: NextApiRequest): string {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['host'] || 'localhost:5000';
  return `${protocol}://${host}`;
}

interface StepResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  durationMs: number;
}

async function runStep(
  baseUrl: string,
  scanKey: string,
  step: string,
  endpoint: string,
  query?: string
): Promise<StepResult> {
  const start = Date.now();
  try {
    const url = `${baseUrl}${endpoint}${query ? `?${query}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-scan-key': scanKey,
      },
    });
    const data = await res.json();
    return {
      step,
      success: res.ok,
      data,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      step,
      success: false,
      error: err.message || 'Request failed',
      durationMs: Date.now() - start,
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const scanKey = process.env.MIRDT_SCAN_KEY || '';
  const baseUrl = getBaseUrl(req);
  const steps = req.body?.steps || ['mark-expired', 'check-invalidations', 'run-scan', 'run-signals'];
  const scanType = req.body?.scanType || 'all';

  const cycleStart = Date.now();
  const results: StepResult[] = [];

  for (const step of steps) {
    let result: StepResult;

    switch (step) {
      case 'mark-expired':
        result = await runStep(baseUrl, scanKey, 'mark-expired', '/api/mirdt/mark-expired');
        break;
      case 'check-invalidations':
        result = await runStep(baseUrl, scanKey, 'check-invalidations', '/api/mirdt/check-invalidations');
        break;
      case 'run-scan':
        result = await runStep(baseUrl, scanKey, 'run-scan', '/api/mirdt/run-scan', `type=${scanType}`);
        break;
      case 'run-signals':
        result = await runStep(baseUrl, scanKey, 'run-signals', '/api/sentinel/run-signals');
        break;
      default:
        result = { step, success: false, error: `Unknown step: ${step}`, durationMs: 0 };
    }

    results.push(result);

    if (!result.success && (step === 'run-scan' || step === 'mark-expired')) {
      break;
    }
  }

  const allSuccess = results.every(r => r.success);

  return res.status(allSuccess ? 200 : 207).json({
    success: allSuccess,
    cycleComplete: true,
    totalDurationMs: Date.now() - cycleStart,
    results,
    timestamp: new Date().toISOString(),
  });
}
