/**
 * POST /api/stellar/sep31/initiate
 *
 * Initiates a direct (non-interactive) cross-border payment via SEP-31.
 * Authenticates with the anchor using SEP-10, then POSTs to DIRECT_PAYMENT_SERVER/transactions.
 * If STELLAR_SENDER_SECRET_KEY is configured server-side, also submits the Stellar payment.
 * Otherwise returns requiresManualStellarPayment: true with the anchor's receiving account and memo.
 *
 * Body (JSON):
 *   asset_code            (required) — e.g. "USDC"
 *   asset_issuer          (required) — e.g. "GA5ZSEJ..."
 *   amount                (required) — e.g. "100"
 *   transaction_fields    (required) — object with required recipient fields per anchor's /info
 *   quote_id              (optional) — SEP-38 firm quote ID to lock in the exchange rate
 *   corridor_id           (required) — Axiom corridor identifier
 *   sender_wallet_address (required) — Axiom wallet address of the initiating user
 *   stellar_public_key    (required) — keypair public key for SEP-10 auth
 *   stellar_secret_key    (required) — keypair secret key for SEP-10 auth
 *
 * Response 200:
 *   {
 *     sep31TransactionId, stellarAccountId, stellarMemoType, stellarMemo,
 *     requiresManualStellarPayment, dbTransferId
 *   }
 * Response 400: { error }
 * Response 501: { error } — anchor does not support SEP-31
 * Response 500: { error }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter } from '../../../../lib/multichain/stellar/StellarPaymentAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    asset_code,
    asset_issuer,
    amount,
    transaction_fields,
    quote_id,
    corridor_id,
    sender_wallet_address,
    stellar_public_key,
    stellar_secret_key,
  } = req.body ?? {};

  if (!asset_code || !asset_issuer || !amount) {
    return res.status(400).json({ error: 'asset_code, asset_issuer, and amount are required' });
  }
  if (!transaction_fields || typeof transaction_fields !== 'object') {
    return res.status(400).json({ error: 'transaction_fields object is required (use {} for anchors with no required fields)' });
  }
  if (!corridor_id || !sender_wallet_address) {
    return res.status(400).json({ error: 'corridor_id and sender_wallet_address are required' });
  }
  if (!stellar_public_key || !stellar_secret_key) {
    return res.status(400).json({ error: 'stellar_public_key and stellar_secret_key are required for SEP-10 auth' });
  }

  try {
    const adapter = getStellarPaymentAdapter();
    const result = await adapter.initiateSep31Payment({
      assetCode: String(asset_code),
      assetIssuer: String(asset_issuer),
      amount: String(amount),
      transactionFields: transaction_fields as Record<string, string>,
      quoteId: quote_id ? String(quote_id) : undefined,
      corridorId: String(corridor_id),
      senderWalletAddress: String(sender_wallet_address),
      stellarPublicKey: String(stellar_public_key),
      stellarSecretKey: String(stellar_secret_key),
    });
    return res.status(200).json(result);
  } catch (err: any) {
    const isUnavailable = err.message?.includes('does not expose DIRECT_PAYMENT_SERVER');
    const status = isUnavailable ? 501 : 500;
    return res.status(status).json({ error: err.message ?? 'SEP-31 initiation failed' });
  }
}
