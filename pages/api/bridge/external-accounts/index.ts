/**
 * GET    /api/bridge/external-accounts        — list linked bank accounts
 * POST   /api/bridge/external-accounts        — link a new bank account for ACH withdrawal
 * DELETE /api/bridge/external-accounts?id=... — remove a linked bank account
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { rateLimitDefault } from '../../../../lib/rateLimit';
import { pool } from '../../../../server/db';
import * as bridgeClient from '../../../../lib/bridge/bridgeClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!rateLimitDefault(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const wallet = session.address.toLowerCase();

  // ── GET ──────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const result = await pool.query(
      `SELECT id, bridge_external_account_id, bank_name, account_holder_name,
              account_type, last4, routing_number, currency, status, created_at
       FROM bridge_external_accounts
       WHERE wallet_address = $1 AND status != 'deleted'
       ORDER BY created_at DESC`,
      [wallet]
    );
    return res.status(200).json({ accounts: result.rows });
  }

  // ── POST ─────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      accountHolderName,
      accountNumber,
      routingNumber,
      accountType,
      bankName,
    } = req.body ?? {};

    if (!accountHolderName || typeof accountHolderName !== 'string') {
      return res.status(400).json({ error: 'accountHolderName is required.' });
    }
    if (!accountNumber || typeof accountNumber !== 'string' || !/^\d{4,17}$/.test(accountNumber)) {
      return res.status(400).json({ error: 'accountNumber must be 4-17 digits.' });
    }
    if (!routingNumber || typeof routingNumber !== 'string' || !/^\d{9}$/.test(routingNumber)) {
      return res.status(400).json({ error: 'routingNumber must be 9 digits.' });
    }

    // Fetch the Bridge customer ID for this wallet
    const custRow = await pool.query(
      `SELECT bridge_customer_id, kyc_status FROM bridge_customers WHERE wallet_address = $1`,
      [wallet]
    );
    if (custRow.rows.length === 0 || !custRow.rows[0].bridge_customer_id) {
      return res.status(422).json({
        error: 'Settlement account not found. Create your account first.',
        code: 'NO_BRIDGE_CUSTOMER',
      });
    }
    if (custRow.rows[0].kyc_status !== 'approved') {
      return res.status(422).json({
        error: `Identity verification required. KYC status: ${custRow.rows[0].kyc_status}.`,
        code: 'KYC_REQUIRED',
      });
    }

    const customerId = custRow.rows[0].bridge_customer_id as string;

    try {
      const ext = await bridgeClient.createExternalAccount({
        customer_id: customerId,
        account_owner_name: accountHolderName.trim(),
        account_number: accountNumber,
        routing_number: routingNumber,
        account_type: accountType ?? 'checking',
        bank_name: bankName ?? undefined,
        currency: 'usd',
      });

      await pool.query(
        `INSERT INTO bridge_external_accounts
           (wallet_address, bridge_external_account_id, bridge_customer_id,
            bank_name, account_holder_name, account_type, last4,
            routing_number, currency, status, raw_response)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (bridge_external_account_id) DO NOTHING`,
        [
          wallet,
          ext.id,
          customerId,
          ext.bank_name ?? bankName ?? null,
          ext.account_name ?? accountHolderName,
          accountType ?? 'checking',
          ext.last_4 ?? accountNumber.slice(-4),
          routingNumber,
          'usd',
          ext.status ?? 'pending',
          JSON.stringify(ext),
        ]
      );

      return res.status(201).json({
        id: ext.id,
        bankName: ext.bank_name,
        accountHolderName: ext.account_name,
        last4: ext.last_4,
        status: ext.status,
        currency: ext.currency,
      });
    } catch (err: any) {
      console.error('[/api/bridge/external-accounts POST]', err.message);
      return res.status(500).json({ error: err.message ?? 'Failed to link bank account.' });
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query as { id?: string };
    if (!id) return res.status(400).json({ error: 'id query param required.' });

    // Confirm the account belongs to this wallet
    const row = await pool.query(
      `SELECT bridge_external_account_id FROM bridge_external_accounts
       WHERE id = $1 AND wallet_address = $2`,
      [id, wallet]
    );
    if (row.rows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found.' });
    }

    try {
      await bridgeClient.deleteExternalAccount(row.rows[0].bridge_external_account_id);
    } catch {
      // Best-effort — mark deleted locally even if Bridge call fails
    }

    await pool.query(
      `UPDATE bridge_external_accounts SET status = 'deleted', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
