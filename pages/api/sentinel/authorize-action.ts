import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { authorizeAction } from '../../../lib/sentinel/authorizeAction';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const scanKey = req.headers['x-scan-key'];
  if (!scanKey) {
    return res.status(401).json({ error: 'Missing x-scan-key header' });
  }

  try {
    const { scope, actionType, subject, requestedNotional, metadata } = req.body;

    if (!scope || !actionType || !subject || requestedNotional === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: scope, actionType, subject, requestedNotional',
      });
    }

    const result = await authorizeAction({
      scope,
      actionType,
      subject,
      requestedNotional: Number(requestedNotional),
      metadata,
    });

    try {
      await pool.query(
        `INSERT INTO sentinel_decisions (scope, action_type, subject, max_notional, decision, reason_code, plain_language, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [scope, actionType, subject, result.maxNotional, result.decision, result.reasonCode, result.plainLanguage]
      );
    } catch (dbErr: any) {
      console.error('[sentinel/authorize-action] DB log error:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      authorization: result,
    });
  } catch (error: any) {
    console.error('[sentinel/authorize-action] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
