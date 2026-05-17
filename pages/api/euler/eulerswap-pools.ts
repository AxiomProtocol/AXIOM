import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * DEPRECATED — 2026-05-17
 * Euler Finance integration removed. Returns 410 Gone permanently.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', '2026-05-17');
  return res.status(410).json({
    deprecated: true,
    replacement: 'Aave v3',
    message: 'Euler Finance integration removed.',
  });
}
