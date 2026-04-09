/**
 * POST /api/axiom-rail/sep31/transactions
 *
 * SEP-31 direct payment initiation.
 * Sending client POSTs a payment request; Axiom Rail returns a Stellar
 * account + memo for the client to send USDC to. Settlement is via
 * Increase ACH or domestic wire to the receiver's bank account.
 *
 * Requires SEP-10 JWT in Authorization header.
 * Requires sender identity fields (BSA compliance) in fields.sender.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyRailJwt, AXIOM_RAIL_DEPOSIT_ACCOUNT, AXIOM_RAIL_FEE_FIXED_USD, AXIOM_RAIL_FEE_PERCENT, AXIOM_RAIL_MIN_AMOUNT_USD, AXIOM_RAIL_MAX_AMOUNT_USD } from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import { db } from '../../../../server/db';
import { stellarPaymentTransfers } from '../../../../shared/stellarSchema';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { account: senderAccount, valid } = verifyRailJwt(token);
  if (!valid) return res.status(403).json({ error: 'Invalid or expired SEP-10 token' });

  const {
    asset_code,
    asset_issuer,
    amount,
    sender_id,
    receiver_id,
    fields,
  } = req.body as {
    asset_code?: string;
    asset_issuer?: string;
    amount?: string;
    sender_id?: string;
    receiver_id?: string;
    fields?: {
      transaction?: {
        receiver_account_number?: string;
        receiver_routing_number?: string;
        receiver_name?: string;
        transfer_type?: string;
      };
      sender?: {
        sender_legal_name?: string;
        sender_dob?: string;
        sender_country?: string;
        sender_id_type?: string;
        sender_id_number?: string;
      };
    };
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!asset_code || asset_code !== 'USDC') {
    return res.status(400).json({ error: 'asset_code must be USDC' });
  }

  const parsedAmount = parseFloat(amount ?? '0');
  if (isNaN(parsedAmount) || parsedAmount < AXIOM_RAIL_MIN_AMOUNT_USD) {
    return res.status(400).json({ error: `Minimum amount is $${AXIOM_RAIL_MIN_AMOUNT_USD}` });
  }
  if (parsedAmount > AXIOM_RAIL_MAX_AMOUNT_USD) {
    return res.status(400).json({ error: `Maximum amount is $${AXIOM_RAIL_MAX_AMOUNT_USD.toLocaleString()}` });
  }

  const txFields = fields?.transaction ?? {};
  const missingFields: string[] = [];
  if (!txFields.receiver_account_number) missingFields.push('fields.transaction.receiver_account_number');
  if (!txFields.receiver_routing_number) missingFields.push('fields.transaction.receiver_routing_number');
  if (!txFields.receiver_name) missingFields.push('fields.transaction.receiver_name');
  if (missingFields.length > 0) {
    return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
  }

  // ── BSA sender identity validation — presence check ───────────────────────
  const senderFields = fields?.sender ?? {};
  const missingSender: string[] = [];
  if (!senderFields.sender_legal_name) missingSender.push('fields.sender.sender_legal_name');
  if (!senderFields.sender_dob) missingSender.push('fields.sender.sender_dob');
  if (!senderFields.sender_country) missingSender.push('fields.sender.sender_country');
  if (!senderFields.sender_id_type) missingSender.push('fields.sender.sender_id_type');
  if (!senderFields.sender_id_number) missingSender.push('fields.sender.sender_id_number');
  if (missingSender.length > 0) {
    return res.status(400).json({ error: `Missing required sender identity fields (BSA): ${missingSender.join(', ')}` });
  }

  // ── BSA sender identity validation — format/semantic checks ───────────────
  const allowedIdTypes = ['ssn', 'passport'];
  if (!allowedIdTypes.includes(senderFields.sender_id_type!)) {
    return res.status(400).json({ error: `fields.sender.sender_id_type must be one of: ${allowedIdTypes.join(', ')}` });
  }
  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dobRegex.test(senderFields.sender_dob!)) {
    return res.status(400).json({ error: 'fields.sender.sender_dob must be in YYYY-MM-DD format' });
  }
  if (senderFields.sender_id_type === 'ssn') {
    if (!/^\d{4}$/.test(senderFields.sender_id_number!)) {
      return res.status(400).json({ error: 'fields.sender.sender_id_number must be exactly 4 digits for SSN' });
    }
  } else {
    if (!/^[A-Z0-9]{3,20}$/i.test(senderFields.sender_id_number!)) {
      return res.status(400).json({ error: 'fields.sender.sender_id_number must be 3–20 alphanumeric characters for passport' });
    }
  }

  // ── Fee calculation ────────────────────────────────────────────────────────
  const feeFixed = AXIOM_RAIL_FEE_FIXED_USD;
  const feePercent = parsedAmount * AXIOM_RAIL_FEE_PERCENT;
  const totalFee = feeFixed + feePercent;
  const amountOut = Math.max(0, parsedAmount - totalFee);

  // ── Generate transfer record ───────────────────────────────────────────────
  const txId = uuidv4();
  const memo = txId.replace(/-/g, '').slice(0, 28).toUpperCase();

  const destinationAccount = [
    txFields.receiver_name,
    `Account: ${txFields.receiver_account_number}`,
    `Routing: ${txFields.receiver_routing_number}`,
    txFields.transfer_type ?? 'ACH',
  ].join(' | ');

  try {
    await db.insert(stellarPaymentTransfers).values({
      id: txId,
      axiomWalletAddress: senderAccount.length === 56 ? '0x0000000000000000000000000000000000000000' : senderAccount,
      stellarPublicKey: senderAccount.startsWith('G') ? senderAccount : null,
      anchorId: 'axiom-rail',
      corridorId: 'usdc-to-usd-axiom-rail-rtp',
      sourceAmountAxusd: parsedAmount.toFixed(2),
      destinationCurrency: 'USD',
      destinationAmount: amountOut.toFixed(2),
      destinationAccount,
      feeEstimate: totalFee.toFixed(2),
      status: 'pending_user_transfer_start',
      sepProtocol: 'sep31',
      sep31StellarAccountId: AXIOM_RAIL_DEPOSIT_ACCOUNT,
      sep31StellarMemo: memo,
      // BSA identity record — never returned in public API responses
      anchorRawResponse: {
        submittedAt: new Date().toISOString(),
        bsa: {
          legalName: senderFields.sender_legal_name,
          dob: senderFields.sender_dob,
          country: senderFields.sender_country,
          idType: senderFields.sender_id_type,
          idNumber: senderFields.sender_id_number,
          collectedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error('[AxiomRail SEP-31] DB insert error:', err);
    return res.status(500).json({ error: 'Failed to create transaction record' });
  }

  return res.status(200).json({
    id: txId,
    stellar_account_id: AXIOM_RAIL_DEPOSIT_ACCOUNT,
    stellar_memo_type: 'text',
    stellar_memo: memo,
    fee_fixed: feeFixed.toFixed(2),
    fee_percent: (AXIOM_RAIL_FEE_PERCENT * 100).toFixed(2),
    amount_out: amountOut.toFixed(2),
    amount_out_asset: 'iso4217:USD',
  });
}
