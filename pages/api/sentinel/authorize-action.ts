import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { authorizeAction } from '../../../lib/sentinel/authorizeAction';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expectedKey = process.env.MIRDT_SCAN_KEY;
  if (!expectedKey && process.env.NODE_ENV !== 'development') {
    return res.status(503).json({ error: 'Sentinel authorization not configured' });
  }
  if (expectedKey) {
    const scanKey = req.headers['x-scan-key'];
    if (scanKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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
      const nonceResult = await pool.query(`SELECT COALESCE(MAX(nonce), 0) + 1 AS next_nonce FROM sentinel_decisions`);
      const nextNonce = nonceResult.rows[0].next_nonce;
      const prevHashResult = await pool.query(`SELECT log_hash FROM sentinel_decisions ORDER BY nonce DESC LIMIT 1`);
      const prevHash = prevHashResult.rows[0]?.log_hash || '0'.repeat(64);
      const crypto = await import('crypto');
      const logPayload = JSON.stringify({ nonce: nextNonce, scope, actionType, subject, maxNotional: result.maxNotional, decision: result.decision, reasonCode: result.reasonCode, prevHash });
      const logHash = crypto.createHash('sha256').update(logPayload).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await pool.query(
        `INSERT INTO sentinel_decisions (scope, action_type, subject, max_notional, expires_at, decision, reason_code, plain_language, log_hash, prev_hash, nonce, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [scope, actionType, subject, result.maxNotional, expiresAt, result.decision, result.reasonCode, result.plainLanguage, logHash, prevHash, nextNonce]
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
