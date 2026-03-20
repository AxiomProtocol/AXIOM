import { pool } from '../../db';
import type { NextApiRequest } from 'next';

export interface SecSession {
  investorId: string;
  walletAddress: string;
  roles: string[];
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=').trim()];
    }).filter(([k]) => k.length > 0)
  );
}

export async function getSecSession(req: NextApiRequest): Promise<SecSession | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['siwe_session'];
  if (!sessionToken) return null;

  try {
    const sessionResult = await pool.query(
      `SELECT wallet_address FROM wallet_sessions WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken]
    );
    if (sessionResult.rows.length === 0) return null;

    const walletAddress = sessionResult.rows[0].wallet_address.toLowerCase();

    const investorResult = await pool.query(
      `SELECT i.id, r.role_code
       FROM sec_investors i
       LEFT JOIN sec_wallets w ON w.investor_id = i.id AND LOWER(w.wallet_address) = $1
       LEFT JOIN sec_roles r ON r.investor_id = i.id AND r.revoked_at IS NULL
       WHERE w.id IS NOT NULL
       LIMIT 10`,
      [walletAddress]
    );

    if (investorResult.rows.length === 0) {
      return { investorId: '', walletAddress, roles: ['investor'] };
    }

    const investorId = investorResult.rows[0].id;
    const roles = [...new Set(investorResult.rows.map((r: any) => r.role_code).filter(Boolean))];
    if (roles.length === 0) roles.push('investor');

    return { investorId, walletAddress, roles };
  } catch (err) {
    console.error('[sec:auth] Session error:', err);
    return null;
  }
}

export function hasRole(session: SecSession, role: string): boolean {
  return session.roles.includes(role) || session.roles.includes('admin');
}

export async function requireSecSession(req: NextApiRequest): Promise<SecSession> {
  const session = await getSecSession(req);
  if (!session) throw new Error('Authentication required');
  return session;
}

export async function requireRole(req: NextApiRequest, role: string): Promise<SecSession> {
  const session = await requireSecSession(req);
  if (!hasRole(session, role)) throw new Error(`Role required: ${role}`);
  return session;
}

export async function ensureSecInvestor(walletAddress: string, email?: string): Promise<string> {
  const lower = walletAddress.toLowerCase();

  // Check if already registered via wallet
  const existing = await pool.query(
    `SELECT i.id FROM sec_investors i
     JOIN sec_wallets w ON w.investor_id = i.id
     WHERE LOWER(w.wallet_address) = $1 LIMIT 1`,
    [lower]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  // Auto-generate investor profile from wallet address — no users table dependency
  const walletEmail = email || `${lower.slice(2, 12)}@wallet.axiom`;

  // Upsert investor record
  const investorResult = await pool.query(
    `INSERT INTO sec_investors (email, legal_name, status, investor_category)
     VALUES ($1, NULL, 'active', 'unverified')
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [walletEmail]
  );

  let investorId: string;
  if (investorResult.rows.length > 0) {
    investorId = investorResult.rows[0].id;
  } else {
    const sel = await pool.query(`SELECT id FROM sec_investors WHERE email = $1 LIMIT 1`, [walletEmail]);
    investorId = sel.rows[0].id;
  }

  await pool.query(
    `INSERT INTO sec_wallets (investor_id, wallet_address, chain_id, verification_status, is_primary)
     VALUES ($1, $2, 42161, 'verified', TRUE)
     ON CONFLICT (wallet_address, chain_id) DO NOTHING`,
    [investorId, lower]
  );

  await pool.query(
    `INSERT INTO sec_compliance_profiles (investor_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [investorId]
  );

  await pool.query(
    `INSERT INTO sec_roles (investor_id, role_code) VALUES ($1, 'investor') ON CONFLICT DO NOTHING`,
    [investorId]
  );

  return investorId;
}
