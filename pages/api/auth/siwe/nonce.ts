import type { NextApiRequest, NextApiResponse } from 'next';
import { generateNonce } from 'siwe';
import { pool } from '../../../../server/db';

const MESSAGE_EXPIRY_MS = 5 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + MESSAGE_EXPIRY_MS);

  try {
    await pool.query(
      `DELETE FROM siwe_nonces WHERE expires_at < NOW()`,
      []
    );
    await pool.query(
      `INSERT INTO siwe_nonces (nonce, expires_at) VALUES ($1, $2)`,
      [nonce, expiresAt]
    );
    console.log(`[SIWE Nonce] Stored nonce in DB, expires ${expiresAt.toISOString()}`);
  } catch (err: any) {
    console.error('[SIWE Nonce] DB write failed:', err.message);
    return res.status(500).json({
      error: 'Could not generate a sign-in session. Please try again.',
      code: 'NONCE_DB_ERROR',
    });
  }

  return res.json({ nonce, expiresIn: MESSAGE_EXPIRY_MS / 1000 });
}
