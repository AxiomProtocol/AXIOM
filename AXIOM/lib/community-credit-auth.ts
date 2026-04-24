import type { NextApiRequest } from 'next';
import { ethers } from 'ethers';
import { validateAndConsumeNonce } from '../pages/api/community-credit/nonce';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;

export type AuthResult =
  | { ok: true; verifiedAddress: string }
  | { ok: false; reason: string };

export function isAdminRequest(req: NextApiRequest): boolean {
  return !!(ADMIN_KEY && req.headers['x-admin-key'] === ADMIN_KEY);
}

export async function verifyCreditAuth(req: NextApiRequest, claimedWallet: string): Promise<AuthResult> {
  if (isAdminRequest(req)) {
    return { ok: true, verifiedAddress: claimedWallet.toLowerCase() };
  }

  const sig = req.headers['x-wallet-signature'] as string | undefined;
  const rawMsgHeader = req.headers['x-wallet-message'] as string | undefined;

  if (!sig || !rawMsgHeader) {
    return {
      ok: false,
      reason:
        'Wallet ownership proof required. Obtain a nonce from GET /api/community-credit/nonce, ' +
        'sign the message, then provide x-wallet-signature and x-wallet-message headers.',
    };
  }

  let msgHeader: string;
  try {
    msgHeader = decodeURIComponent(rawMsgHeader);
  } catch {
    msgHeader = rawMsgHeader;
  }

  if (!msgHeader.includes('Nonce:') || !msgHeader.includes('Axiom Protocol')) {
    return { ok: false, reason: 'Message format invalid. Use the nonce-based message from GET /api/community-credit/nonce.' };
  }

  const nonceMatch = msgHeader.match(/Nonce:\s*([a-f0-9]{32})/);
  if (!nonceMatch) {
    return { ok: false, reason: 'No valid nonce found in message. Obtain a fresh nonce and sign again.' };
  }
  const nonce = nonceMatch[1];

  const expiryMatch = msgHeader.match(/Expires:\s*(.+)/);
  if (expiryMatch) {
    const expiry = new Date(expiryMatch[1].trim()).getTime();
    if (isNaN(expiry) || expiry < Date.now()) {
      return { ok: false, reason: 'Signed message has expired. Obtain a fresh nonce and sign again.' };
    }
  }

  let recovered: string;
  try {
    recovered = ethers.verifyMessage(msgHeader, sig).toLowerCase();
  } catch (_err) {
    return { ok: false, reason: 'Invalid signature format.' };
  }

  if (recovered !== claimedWallet.toLowerCase()) {
    return { ok: false, reason: 'Signature does not match the provided wallet address.' };
  }

  const nonceValid = await validateAndConsumeNonce(claimedWallet, nonce);
  if (!nonceValid) {
    return { ok: false, reason: 'Nonce is invalid, expired, or has already been used. Obtain a fresh nonce and sign again.' };
  }

  return { ok: true, verifiedAddress: recovered };
}
