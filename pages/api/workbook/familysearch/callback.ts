import type { NextApiRequest, NextApiResponse } from 'next';
import { exchangeCodeForToken, saveFamilySearchToken } from '../../../../lib/workbook/familysearch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error } = req.query;

  if (error) {
    return res.redirect('/workbook?fs_error=auth_denied');
  }

  if (!code || !state) {
    return res.redirect('/workbook?fs_error=missing_params');
  }

  try {
    const stateStr = Array.isArray(state) ? state[0] : state;
    const [userIdStr] = stateStr.split(':');
    const userId = parseInt(userIdStr);

    if (isNaN(userId)) {
      return res.redirect('/workbook?fs_error=invalid_state');
    }

    const codeStr = Array.isArray(code) ? code[0] : code;
    const { accessToken, expiresIn } = await exchangeCodeForToken(codeStr);

    await saveFamilySearchToken(userId, accessToken, expiresIn);

    res.redirect('/workbook?fs_connected=true');
  } catch (err) {
    console.error('FamilySearch callback error:', err);
    res.redirect('/workbook?fs_error=exchange_failed');
  }
}
