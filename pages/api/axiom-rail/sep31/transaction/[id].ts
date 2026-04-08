/**
 * GET /api/axiom-rail/sep31/transaction/:id
 *
 * SEP-31 transaction status. Returns the current state of a direct payment
 * initiated via POST /api/axiom-rail/sep31/transactions.
 *
 * Requires SEP-10 JWT in Authorization header.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyRailJwt } from '../../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import { db } from '../../../../../server/db';
import { stellarPaymentTransfers } from '../../../../../shared/stellarSchema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { valid } = verifyRailJwt(token);
  if (!valid) return res.status(403).json({ error: 'Invalid or expired SEP-10 token' });

  const { id } = req.query as { id: string };
  if (!id) return res.status(400).json({ error: 'id path param required' });

  try {
    const [row] = await db
      .select()
      .from(stellarPaymentTransfers)
      .where(eq(stellarPaymentTransfers.id, id))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = {
      id: row.id,
      status: row.status,
      amount_in: row.sourceAmountAxusd,
      amount_in_asset: 'stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      amount_out: row.destinationAmount ?? undefined,
      amount_out_asset: 'iso4217:USD',
      amount_fee: row.feeEstimate ?? undefined,
      amount_fee_asset: 'iso4217:USD',
      stellar_account_id: row.sep31StellarAccountId ?? undefined,
      stellar_memo: row.sep31StellarMemo ?? undefined,
      stellar_memo_type: row.sep31StellarMemo ? 'text' : undefined,
      stellar_transaction_id: row.stellarTransactionHash ?? undefined,
      started_at: row.initiatedAt?.toISOString(),
      completed_at: row.completedAt?.toISOString() ?? undefined,
      updated_at: row.updatedAt?.toISOString(),
      message: statusMessage(row.status),
    };

    return res.status(200).json({ transaction });
  } catch (err) {
    console.error('[AxiomRail SEP-31] Transaction status error:', err);
    return res.status(500).json({ error: 'Failed to retrieve transaction' });
  }
}

function statusMessage(status: string): string {
  const messages: Record<string, string> = {
    pending_user_transfer_start: 'Awaiting USDC transfer to Axiom Rail anchor account. Send USDC with the provided memo.',
    pending_external: 'USDC received. Initiating ACH/wire settlement to destination bank account.',
    pending_anchor: 'ACH or wire transfer in progress. Settlement typically completes within 1–3 business days.',
    pending_stellar: 'Verifying Stellar transaction on-chain.',
    completed: 'Settlement complete. Funds have been delivered to the destination bank account.',
    error: 'An error occurred. Contact support@axiomprotocol.app for assistance.',
    refunded: 'Transfer was refunded. USDC has been returned to the originating account.',
    expired: 'Transfer expired before USDC was received. Please initiate a new transaction.',
  };
  return messages[status] ?? 'Status unknown.';
}
