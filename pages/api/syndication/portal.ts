import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';')
      .map(cookie => {
        const [key, ...val] = cookie.trim().split('=');
        const sanitizedKey = key.replace(/[^\w\-_.]/g, '');
        const sanitizedVal = val.join('=').replace(/[^\w\-_.=]/g, '');
        return [sanitizedKey, sanitizedVal];
      })
      .filter(([key]) => key.length > 0)
  );
}

async function getAuthenticatedWallet(req: NextApiRequest): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['siwe_session'];
  if (!sessionToken) return null;
  try {
    const result = await pool.query(
      `SELECT wallet_address FROM wallet_sessions WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken]
    );
    return result.rows.length > 0 ? result.rows[0].wallet_address : null;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const wallet = await getAuthenticatedWallet(req);
  if (!wallet) {
    return res.status(401).json({ success: false, error: 'Authentication required. Connect your wallet and sign in.' });
  }

  const walletLower = wallet.toLowerCase();

  try {
    const profileResult = await pool.query(
      `SELECT id, legal_name, email, entity_name, wallet_address, accreditation_status, kyc_status
       FROM syn_investor_profiles
       WHERE LOWER(wallet_address) = $1`,
      [walletLower]
    );

    if (profileResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        wallet: walletLower,
        profile: null,
        holdings: [],
        subscriptions: [],
        distributions: [],
        capitalCalls: [],
        documents: [],
      });
    }

    const profile = profileResult.rows[0];
    const profileId = profile.id;

    const [holdingsRes, subsRes, distRes, ccRes, docsRes] = await Promise.all([
      pool.query(
        `SELECT c.id, c.offering_id, c.share_class, c.units, c.ownership_pct,
                c.capital_contributed, c.distributions_received,
                o.name AS offering_name, o.slug AS offering_slug, o.status AS offering_status,
                o.offering_type, o.preferred_return, o.projected_irr, o.hold_period_years,
                o.settlement_mode
         FROM syn_cap_table c
         JOIN syn_offerings o ON o.id = c.offering_id
         WHERE c.investor_profile_id = $1
         ORDER BY c.created_at DESC`,
        [profileId]
      ),

      pool.query(
        `SELECT s.id, s.offering_id, s.amount, s.status, s.funding_method, s.payment_currency,
                s.submitted_at, s.approved_at, s.funded_at,
                o.name AS offering_name, o.slug AS offering_slug, o.status AS offering_status
         FROM syn_subscriptions s
         JOIN syn_offerings o ON o.id = s.offering_id
         WHERE s.investor_profile_id = $1
         ORDER BY s.created_at DESC`,
        [profileId]
      ),

      pool.query(
        `SELECT d.id, d.offering_id, d.distribution_type, d.gross_amount, d.net_amount,
                d.status, d.currency, d.paid_at, d.period_start, d.period_end, d.meta,
                o.name AS offering_name, o.slug AS offering_slug
         FROM syn_distributions d
         JOIN syn_offerings o ON o.id = d.offering_id
         WHERE d.investor_profile_id = $1
         ORDER BY d.created_at DESC`,
        [profileId]
      ),

      pool.query(
        `SELECT cc.id, cc.offering_id, cc.amount_called, cc.currency, cc.due_date,
                cc.status, cc.sent_at, cc.meta,
                o.name AS offering_name, o.slug AS offering_slug,
                s.amount AS subscription_amount
         FROM syn_capital_calls cc
         JOIN syn_subscriptions s ON s.id = cc.subscription_id
         JOIN syn_offerings o ON o.id = cc.offering_id
         WHERE s.investor_profile_id = $1
         ORDER BY cc.created_at DESC`,
        [profileId]
      ),

      pool.query(
        `SELECT d.id, d.offering_id, d.name, d.doc_type, d.url, d.visibility, d.created_at,
                o.name AS offering_name, o.slug AS offering_slug
         FROM syn_offering_documents d
         JOIN syn_offerings o ON o.id = d.offering_id
         WHERE d.visibility IN ('public', 'investor')
           AND d.offering_id IN (
             SELECT offering_id FROM syn_subscriptions WHERE investor_profile_id = $1
             UNION
             SELECT offering_id FROM syn_cap_table WHERE investor_profile_id = $1
           )
         ORDER BY d.created_at DESC`,
        [profileId]
      ),
    ]);

    const totalInvested = holdingsRes.rows.reduce(
      (sum: number, r: any) => sum + parseFloat(r.capital_contributed || '0'), 0
    );
    const totalDistributed = distRes.rows
      .filter((r: any) => r.status === 'completed')
      .reduce((sum: number, r: any) => sum + parseFloat(r.net_amount || '0'), 0);
    const pendingCalls = ccRes.rows
      .filter((r: any) => r.status === 'sent' || r.status === 'pending')
      .reduce((sum: number, r: any) => sum + parseFloat(r.amount_called || '0'), 0);

    return res.status(200).json({
      success: true,
      wallet: walletLower,
      profile: {
        id: profile.id,
        legalName: profile.legal_name,
        email: profile.email,
        entityName: profile.entity_name,
        accreditationStatus: profile.accreditation_status,
        kycStatus: profile.kyc_status,
      },
      summary: {
        totalInvested,
        totalDistributed,
        pendingCalls,
        holdingCount: holdingsRes.rows.length,
        activeOfferings: holdingsRes.rows.filter((r: any) =>
          ['raising', 'funded', 'active'].includes(r.offering_status)
        ).length,
      },
      holdings: holdingsRes.rows,
      subscriptions: subsRes.rows,
      distributions: distRes.rows,
      capitalCalls: ccRes.rows,
      documents: docsRes.rows,
    });
  } catch (error: any) {
    console.error('[Portal] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load portal data.' });
  }
}
