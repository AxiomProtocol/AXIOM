import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import {
  isValidOperatorKey,
  setOperatorCookie,
} from '../../../../../lib/capinfra/operatorAuth';
import { sendError, ValidationError, UnauthorizedError } from '../../../../../lib/capinfra/errors';

const ZBody = z.object({ key: z.string().min(1) });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  try {
    const body = ZBody.parse(req.body);
    if (!isValidOperatorKey(body.key)) throw new UnauthorizedError('invalid operator key');
    setOperatorCookie(res, body.key, { hostHeader: req.headers.host });
    res.status(200).json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
}
