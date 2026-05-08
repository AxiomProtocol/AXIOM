import type { IncomingMessage } from 'http';
import { pool } from '../../server/db';
import { currentStripeAccountId } from '../stripe/client';

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

/**
 * Gate used by premium Sentinel API endpoints (signals, decisions, regimes).
 * Returns ok:true only when the request carries a valid SIWE session AND
 * that wallet holds an active (status = 'active') Sentinel subscription on
 * the current Stripe account. Rows stamped with a different stripe_account_id
 * (legacy accounts) are treated as non-entitling to prevent cross-account
 * data access after a Stripe account migration.
 */
export async function requireActiveSubscription(
  req: IncomingMessage,
): Promise<{ ok: true; walletAddress: string } | { ok: false; status: 401 | 403; error: string }> {
  const auth = await getAuthenticatedWallet(req);
  if (!auth.authenticated || !auth.walletAddress) {
    return { ok: false, status: 401, error: 'Wallet authentication required — sign in with your wallet first' };
  }

  const result = await pool.query(
    `SELECT status, stripe_account_id FROM sentinel_subscriptions
     WHERE wallet_address = $1 LIMIT 1`,
    [auth.walletAddress],
  );

  const row = result.rows[0] as { status: string; stripe_account_id: string | null } | undefined;
  if (!row || row.status !== 'active') {
    return { ok: false, status: 403, error: 'Active Sentinel Advisory subscription required' };
  }

  // Validate the row belongs to the currently-configured Stripe account.
  // Untagged rows (stripe_account_id IS NULL) are allowed through for back-compat
  // with records created before the account-stamping column existed.
  if (row.stripe_account_id) {
    let liveAccountId: string;
    try {
      liveAccountId = await currentStripeAccountId();
    } catch {
      // Stripe misconfigured — fail closed
      return { ok: false, status: 403, error: 'Payment provider verification unavailable' };
    }
    if (row.stripe_account_id !== liveAccountId) {
      return { ok: false, status: 403, error: 'Subscription is associated with a previous payment configuration — please contact support' };
    }
  }

  return { ok: true, walletAddress: auth.walletAddress };
}
