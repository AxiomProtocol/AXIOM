import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: 'ENDPOINT_RETIRED',
    reason: 'This webhook endpoint has been retired. The banking provider integration is no longer active.',
  });
}
