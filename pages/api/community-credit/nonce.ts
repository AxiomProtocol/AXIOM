import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';

// V1: In-memory nonce store. Works correctly in single-instance deployments.
// For horizontal scaling or serverless environments, replace with a shared durable
// store (e.g. Redis SETEX, or a database-backed nonce table with TTL cleanup).
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

const NONCE_TTL_MS = 5 * 60 * 1000;

function cleanExpiredNonces() {
  const now = Date.now();
  for (const [key, val] of nonceStore.entries()) {
    if (val.expiresAt < now) nonceStore.delete(key);
  }
}

export function validateAndConsumeNonce(walletAddress: string, nonce: string): boolean {
  cleanExpiredNonces();
  const key = walletAddress.toLowerCase();
  const record = nonceStore.get(key);
  if (!record) return false;
  if (record.nonce !== nonce) return false;
  if (record.expiresAt < Date.now()) {
    nonceStore.delete(key);
    return false;
  }
  nonceStore.delete(key);
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ success: false, error: 'walletAddress is required' });
  }

  cleanExpiredNonces();

  const nonce = randomBytes(16).toString('hex');
  const expiresAt = Date.now() + NONCE_TTL_MS;
  const key = walletAddress.toLowerCase();
  nonceStore.set(key, { nonce, expiresAt });

  const message =
    `Axiom Protocol - Community Entry Credit wallet verification\n` +
    `Wallet: ${walletAddress.toLowerCase()}\n` +
    `Nonce: ${nonce}\n` +
    `Expires: ${new Date(expiresAt).toISOString()}`;

  return res.status(200).json({
    success: true,
    nonce,
    message,
    expiresAt,
  });
}
