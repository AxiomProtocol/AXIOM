import type { NextApiRequest } from 'next';
import { pool } from '../../db';
import type { CanonicalAuthContext } from '../../../shared/contracts/identityStatus';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((cookie) => {
      const [key, ...val] = cookie.trim().split('=');
      return [key, val.join('=')];
    }),
  );
}

export async function resolveCanonicalAuthContext(req: NextApiRequest): Promise<CanonicalAuthContext> {
  const adminWallet = req.headers['x-admin-wallet'];
  const normalizedAdminWallet = Array.isArray(adminWallet) ? adminWallet[0] : adminWallet;

  if (normalizedAdminWallet) {
    return {
      actorId: normalizedAdminWallet,
      actorType: 'admin',
      orgId: null,
      domainScopes: ['field_intelligence', 'real_estate'],
      authProvider: 'header-admin-wallet',
      sessionId: 'header',
    };
  }

  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['siwe_session'];
  if (sessionToken) {
    try {
      const result = await pool.query(
        `SELECT wallet_address
         FROM wallet_sessions
         WHERE session_token = $1 AND expires_at > NOW()
         LIMIT 1`,
        [sessionToken],
      );
      const row = result.rows?.[0];
      if (row?.wallet_address) {
        return {
          actorId: row.wallet_address,
          actorType: 'admin',
          orgId: null,
          domainScopes: ['field_intelligence', 'real_estate'],
          authProvider: 'siwe',
          sessionId: sessionToken,
        };
      }
    } catch {
      // Keep fallback behavior for local/dev paths.
    }
  }

  return {
    actorId: 'system:anonymous',
    actorType: 'system',
    orgId: null,
    domainScopes: ['field_intelligence', 'real_estate'],
    authProvider: 'anonymous-fallback',
    sessionId: 'anonymous',
  };
}
