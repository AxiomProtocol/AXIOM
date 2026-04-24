import type { NextApiRequest, NextApiResponse } from 'next';

function isAuthorized(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (req.headers['x-admin-key'] === adminKey && adminKey) return true;
  if (!adminKey && process.env.NODE_ENV === 'development') return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const liveEnabled = process.env.EXECUTION_LIVE_ENABLED === 'true';
  if (!liveEnabled) {
    return res.status(403).json({
      error: 'Live execution is disabled system-wide',
      code: 'LIVE_DISABLED',
      message: 'EXECUTION_LIVE_ENABLED is not set to true. Live execution will be activated when the Graduated Execution Framework reaches operational readiness.',
    });
  }

  return res.status(501).json({
    error: 'Live execution is not yet implemented',
    code: 'NOT_IMPLEMENTED',
    message: 'Live execution infrastructure is under development. Use paper execution to build qualification history.',
  });
}
