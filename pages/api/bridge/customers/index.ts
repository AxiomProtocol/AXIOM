/**
 * GET  /api/bridge/customers  — fetch the Bridge customer record for the authed wallet
 * POST /api/bridge/customers  — create or refresh the customer and return a KYC link if needed
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { bridgeService } from '../../../../lib/services/BridgeService';
import { rateLimitDefault } from '../../../../lib/rateLimit';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!rateLimitDefault(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const wallet = session.address.toLowerCase();

  // ── GET — return cached customer row ────────────────────────────────────────
  if (req.method === 'GET') {
    const result = await pool.query(
      `SELECT id, wallet_address, bridge_customer_id, kyc_status,
              full_name, email, type, kyc_link_url, kyc_link_expires_at,
              created_at, updated_at
       FROM bridge_customers WHERE wallet_address = $1`,
      [wallet]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ customer: null });
    }
    return res.status(200).json({ customer: result.rows[0] });
  }

  // ── POST — create or refresh ────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { fullName, email } = req.body ?? {};

    if (!fullName || typeof fullName !== 'string') {
      return res.status(400).json({ error: 'fullName is required.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }

    try {
      const result = await bridgeService.getOrCreateCustomer(wallet, fullName.trim(), email.trim());

      if (!result.customerId) {
        return res.status(422).json({ error: 'Failed to create settlement account. Try again.' });
      }

      return res.status(200).json({
        customerId: result.customerId,
        kycStatus: result.kycStatus,
        kycRequired: result.kycStatus !== 'approved',
        kycUrl: result.kycUrl ?? null,
      });
    } catch (err: any) {
      console.error('[/api/bridge/customers POST]', err.message);
      return res.status(500).json({ error: err.message ?? 'Settlement account creation failed.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
