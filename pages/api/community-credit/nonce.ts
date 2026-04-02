import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { pool } from '../../../server/db';

const NONCE_TTL_MS = 5 * 60 * 1000;

export async function validateAndConsumeNonce(walletAddress: string, nonce: string): Promise<boolean> {
  const key = walletAddress.toLowerCase();
  const result = await pool.query(
    `DELETE FROM community_credit_nonces
     WHERE wallet_address = $1 AND nonce = $2 AND expires_at > NOW()
     RETURNING id`,
    [key, nonce]
  );
  return result.rowCount != null && result.rowCount > 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ success: false, error: 'walletAddress is required' });
  }

  const key = walletAddress.toLowerCase();
  const nonce = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

  await pool.query(
    `DELETE FROM community_credit_nonces WHERE wallet_address = $1`,
    [key]
  );
  await pool.query(
    `INSERT INTO community_credit_nonces (wallet_address, nonce, expires_at) VALUES ($1, $2, $3)`,
    [key, nonce, expiresAt]
  );

  const message =
    `Axiom Protocol - Community Entry Credit wallet verification\n` +
    `Wallet: ${key}\n` +
    `Nonce: ${nonce}\n` +
    `Expires: ${expiresAt.toISOString()}`;

  return res.status(200).json({
    success: true,
    nonce,
    message,
    expiresAt: expiresAt.getTime(),
  });
}
