import type { IncomingMessage } from 'http';
import { pool } from '../../server/db';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => {
        const [key, ...val] = c.trim().split('=');
        return [key.trim(), val.join('=').trim()];
      })
      .filter(([k]) => k.length > 0),
  );
}

export interface WalletAuthResult {
  authenticated: boolean;
  walletAddress: string | null;
}

export async function getAuthenticatedWallet(
  req: IncomingMessage,
): Promise<WalletAuthResult> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['siwe_session'];
  if (!sessionToken) return { authenticated: false, walletAddress: null };

  const result = await pool.query(
    `SELECT wallet_address FROM wallet_sessions
     WHERE session_token = $1 AND expires_at > NOW()
     LIMIT 1`,
    [sessionToken],
  );

  if (!result.rows.length) return { authenticated: false, walletAddress: null };
  return { authenticated: true, walletAddress: result.rows[0].wallet_address as string };
}

export async function requireWalletOwnership(
  req: IncomingMessage,
  claimedWallet: string,
): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const auth = await getAuthenticatedWallet(req);
  if (!auth.authenticated || !auth.walletAddress) {
    return { ok: false, status: 401, error: 'Wallet authentication required — sign in with your wallet first' };
  }
  if (auth.walletAddress.toLowerCase() !== claimedWallet.toLowerCase()) {
    return { ok: false, status: 403, error: 'Wallet mismatch — authenticated wallet does not match requested wallet' };
  }
  return { ok: true };
}
