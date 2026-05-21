/**
 * POST /api/bridge/customers/kyc
 *
 * Generates a fresh KYC link for the authed wallet's Bridge customer.
 * If no Bridge customer exists yet, creates one first.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { rateLimitDefault } from '../../../../lib/rateLimit';
import { pool } from '../../../../server/db';
import * as bridgeClient from '../../../../lib/bridge/bridgeClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!rateLimitDefault(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const wallet = session.address.toLowerCase();
  const { redirectUri } = req.body ?? {};

  // Look up existing customer record
  const existing = await pool.query(
    `SELECT bridge_customer_id, full_name, email FROM bridge_customers WHERE wallet_address = $1`,
    [wallet]
  );

  if (existing.rows.length === 0 || !existing.rows[0].bridge_customer_id) {
    return res.status(404).json({
      error: 'No settlement account found. Create your account first via POST /api/bridge/customers.',
    });
  }

  const { bridge_customer_id, full_name, email } = existing.rows[0];

  try {
    const kycLink = await bridgeClient.createKycLink(bridge_customer_id, {
      full_name,
      email,
      redirect_uri: redirectUri ?? 'https://axiomprotocol.app/settlement/kyc-complete',
    });

    // Cache the latest KYC link
    await pool.query(
      `UPDATE bridge_customers
       SET kyc_link_url = $1, kyc_link_expires_at = $2, updated_at = NOW()
       WHERE wallet_address = $3`,
      [kycLink.url, kycLink.expires_at, wallet]
    );

    return res.status(200).json({
      kycUrl: kycLink.url,
      expiresAt: kycLink.expires_at,
      kycStatus: kycLink.kyc_status,
    });
  } catch (err: any) {
    console.error('[/api/bridge/customers/kyc POST]', err.message);
    return res.status(500).json({ error: err.message ?? 'Failed to generate KYC link.' });
  }
}
