import type { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminKey = getHeaderValue(req.headers['x-admin-key']);
  const configuredAdminKey = process.env.ADMIN_SOLVENCY_KEY;
  const isAuthorized = !!adminKey && !!configuredAdminKey && adminKey === configuredAdminKey;
  if (!isAuthorized && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const envPresence: Record<string, boolean> = {};
  const requiredVars = [
    'DATABASE_URL',
    'ALCHEMY_API_KEY',
    'ALPHA_VANTAGE_API_KEY',
    'DEPLOYER_PRIVATE_KEY',
    'MIRDT_SCAN_KEY',
    'DENET_NODE_KEY',
  ];
  for (const key of requiredVars) {
    envPresence[key] = !!process.env[key];
  }

  res.status(200).json({
    success: true,
    runtime: 'nodejs',
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV || 'undefined',
    hostname: os.hostname(),
    platform: process.platform,
    arch: process.arch,
    isVercel: !!process.env.VERCEL,
    isReplitDeployment: !!process.env.REPLIT_DEPLOYMENT,
    isReplit: !!process.env.REPL_ID,
    envPresence,
    timestamp: new Date().toISOString(),
  });
}
