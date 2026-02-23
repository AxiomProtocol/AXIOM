import type { NextApiRequest } from 'next';

export function isCapitalAuthorized(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (req.headers['x-admin-key'] === adminKey && adminKey) return true;
  if (!adminKey && process.env.NODE_ENV === 'development') return true;
  return false;
}

export function buildMeta(sourcesUsed: string[], warnings: string[], confidence?: string) {
  return {
    as_of: new Date().toISOString(),
    sources_used: sourcesUsed,
    confidence: confidence ?? (warnings.length === 0 ? 'HIGH' : 'MEDIUM'),
    warnings,
  };
}
