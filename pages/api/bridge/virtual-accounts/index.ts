/**
 * GET  /api/bridge/virtual-accounts  — list virtual accounts for the authed wallet
 * POST /api/bridge/virtual-accounts  — create a new virtual account (persistent ACH deposit)
 *
 * Virtual accounts give users a dedicated routing+account number that permanently
 * forwards USD deposits → USDC on Arbitrum One.
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
      `SELECT id, bridge_virtual_account_id, source_currency,
              destination_payment_rail, destination_currency, destination_address,
              deposit_bank_name, deposit_account_number, deposit_routing_number,
              deposit_beneficiary_name, deposit_memo, status, created_at
       FROM bridge_virtual_accounts
       WHERE wallet_address = $1
       ORDER BY created_at DESC`,
      [wallet]
    );
    return res.status(200).json({ accounts: result.rows });
  }

  // ── POST ─────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { destinationAddress, destinationPaymentRail, destinationCurrency } = req.body ?? {};

    const toAddress = (destinationAddress ?? wallet) as string;
    const rail = (destinationPaymentRail ?? 'arbitrum') as string;
    const currency = (destinationCurrency ?? 'usdc') as string;

    if (!/^0x[0-9a-fA-F]{40}$/.test(toAddress)) {
      return res.status(400).json({ error: 'Invalid destination address.' });
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
      const va = await bridgeClient.createVirtualAccount({
        customer_id: customerId,
        source_currency: 'usd',
        destination: {
          payment_rail: rail,
          currency,
          address: toAddress.toLowerCase(),
        },
      });

      const dep = va.source_deposit_instructions;

      await pool.query(
        `INSERT INTO bridge_virtual_accounts
           (wallet_address, bridge_virtual_account_id, bridge_customer_id,
            source_currency, destination_payment_rail, destination_currency,
            destination_address, deposit_bank_name, deposit_account_number,
            deposit_routing_number, deposit_beneficiary_name, deposit_memo,
            status, raw_response)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (bridge_virtual_account_id) DO NOTHING`,
        [
          wallet,
          va.id,
          customerId,
          dep.currency ?? 'usd',
          rail,
          currency,
          toAddress.toLowerCase(),
          dep.bank_name ?? null,
          dep.account_number ?? null,
          dep.routing_number ?? null,
          dep.bank_beneficiary_name ?? null,
          dep.memo ?? null,
          va.status ?? 'active',
          JSON.stringify(va),
        ]
      );

      return res.status(201).json({
        id: va.id,
        status: va.status,
        depositInstructions: {
          bankName:         dep.bank_name,
          accountNumber:    dep.account_number,
          routingNumber:    dep.routing_number,
          beneficiaryName:  dep.bank_beneficiary_name,
          memo:             dep.memo,
          currency:         dep.currency,
          paymentRail:      dep.payment_rail,
        },
        destination: va.destination,
      });
    } catch (err: any) {
      console.error('[/api/bridge/virtual-accounts POST]', err.message);
      return res.status(500).json({ error: err.message ?? 'Failed to create virtual account.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
