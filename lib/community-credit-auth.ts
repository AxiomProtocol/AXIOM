import type { NextApiRequest } from 'next';
import { ethers } from 'ethers';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;

export type AuthResult =
  | { ok: true; verifiedAddress: string }
  | { ok: false; reason: string };

export function isAdminRequest(req: NextApiRequest): boolean {
  return !!(ADMIN_KEY && req.headers['x-admin-key'] === ADMIN_KEY);
}

export function verifyCreditAuth(req: NextApiRequest, claimedWallet: string): AuthResult {
  if (isAdminRequest(req)) {
    return { ok: true, verifiedAddress: claimedWallet.toLowerCase() };
  }

  const sig = req.headers['x-wallet-signature'] as string | undefined;
  const msgHeader = req.headers['x-wallet-message'] as string | undefined;

  if (!sig || !msgHeader) {
    return {
      ok: false,
      reason:
        'Wallet ownership proof required. Obtain a nonce from GET /api/community-credit/nonce, ' +
        'sign the message, then provide x-wallet-signature and x-wallet-message headers.',
    };
  }

  if (!msgHeader.includes('Nonce:') && !msgHeader.includes('Axiom Protocol')) {
    return { ok: false, reason: 'Message format invalid. Use the nonce-based message from GET /api/community-credit/nonce.' };
  }

  try {
    const recovered = ethers.verifyMessage(msgHeader, sig).toLowerCase();
    if (recovered !== claimedWallet.toLowerCase()) {
      return { ok: false, reason: 'Signature does not match the provided wallet address.' };
    }

    const expiryMatch = msgHeader.match(/Expires: (.+)/);
    if (expiryMatch) {
      const expiry = new Date(expiryMatch[1].trim()).getTime();
      if (isNaN(expiry) || expiry < Date.now()) {
        return { ok: false, reason: 'Signed message has expired. Obtain a fresh nonce and sign again.' };
      }
    }

    return { ok: true, verifiedAddress: recovered };
  } catch {
    return { ok: false, reason: 'Invalid signature format.' };
  }
}
