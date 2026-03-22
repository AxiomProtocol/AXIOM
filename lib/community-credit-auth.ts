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
        'Wallet ownership proof required. Provide x-wallet-signature and x-wallet-message headers. ' +
        'Sign the message with the wallet address you are using.',
    };
  }

  try {
    const recovered = ethers.verifyMessage(msgHeader, sig).toLowerCase();
    if (recovered !== claimedWallet.toLowerCase()) {
      return { ok: false, reason: 'Signature does not match the provided wallet address.' };
    }
    return { ok: true, verifiedAddress: recovered };
  } catch {
    return { ok: false, reason: 'Invalid signature format.' };
  }
}
