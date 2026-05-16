import type { NextApiRequest, NextApiResponse } from 'next';
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(503).json({ error: 'BANKING_DISABLED', reason: 'No banking provider configured.' });
}
