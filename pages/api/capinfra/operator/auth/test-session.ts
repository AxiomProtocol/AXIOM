/**
 * DEV / TEST ONLY — sets the operator cookie without requiring the real key.
 *
 * This endpoint is disabled in production. Its sole purpose is to allow
 * Playwright E2E tests to authenticate as an operator without hard-coding
 * the ADMIN_SOLVENCY_KEY secret into test code.
 *
 * Enabled only when NODE_ENV !== 'production'.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { setOperatorCookie, getOperatorAdminKey } from '../../../../../lib/capinfra/operatorAuth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  try {
    const key = getOperatorAdminKey();
    setOperatorCookie(res, key);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(503).json({ error: 'OPERATOR_KEY_NOT_CONFIGURED' });
  }
}
