import type { NextApiRequest, NextApiResponse } from 'next';
import { clearOperatorCookie } from '../../../../../lib/capinfra/operatorAuth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  clearOperatorCookie(res);
  res.status(200).json({ ok: true });
}
