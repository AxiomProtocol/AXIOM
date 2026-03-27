import type { NextApiRequest, NextApiResponse } from 'next';
import { generateNonce } from 'siwe';
import { pool } from '../../../../server/db';

const MESSAGE_EXPIRY_MS = 5 * 60 * 1000;

const nonceMemory = new Map<string, Date>();

function pruneMemory() {
  const now = new Date();
  for (const [k, exp] of nonceMemory) {
    if (exp < now) nonceMemory.delete(k);
  }
}

function storeInDbBackground(nonce: string, expiresAt: Date): void {
  pool
    .query(
      `WITH cleanup AS (DELETE FROM siwe_nonces WHERE expires_at < NOW())
       INSERT INTO siwe_nonces (nonce, expires_at) VALUES ($1, $2) RETURNING id`,
      [nonce, expiresAt]
    )
    .then((r) => console.log(`[SIWE Nonce] DB stored nonce id=${r.rows[0]?.id}`))
    .catch((err) => console.warn('[SIWE Nonce] DB store failed (non-critical):', err.message));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = Math.random().toString(36).substring(7);
  const requestStart = Date.now();
  console.log(`[SIWE Nonce][${requestId}] Request started`);

  pruneMemory();

  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + MESSAGE_EXPIRY_MS);

  nonceMemory.set(nonce, expiresAt);
  storeInDbBackground(nonce, expiresAt);

  const totalDuration = Date.now() - requestStart;
  console.log(`[SIWE Nonce][${requestId}] Request completed in ${totalDuration}ms`);

  return res.json({ nonce, expiresIn: MESSAGE_EXPIRY_MS / 1000 });
}
