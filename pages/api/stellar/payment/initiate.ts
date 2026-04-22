/**
 * POST /api/stellar/payment/initiate
 *
 * Initiates a Stellar payment via Circle's SEP-24 interactive flow.
 *
 * Body:
 *   senderWalletAddress: string  — Axiom EVM wallet address
 *   sourceAxusdAmount: string    — Amount of AXUSD being sent
 *   destinationCurrency: string  — Target currency (USD, USDC)
 *   destinationAccount: string   — Destination account/address
 *   corridorId: string           — Corridor ID (from /api/stellar/corridors)
 *   memo?: string                — Optional payment memo
 *
 * Returns:
 *   transferId: string           — Internal DB transfer ID (UUID)
 *   anchorTransferId: string     — Circle anchor's transfer ID
 *   interactiveUrl: string       — URL for user to complete Circle's withdrawal UI
 *   state: StellarTransferState
 *
 * Auth: Requires wallet address — no admin key needed for user-initiated payments.
 * Rate limiting should be applied at the infrastructure layer.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter } from '../../../../lib/multichain/stellar/StellarPaymentAdapter';
import type { InitiatePaymentOptions } from '../../../../lib/multichain/adapters/StellarPaymentAdapterInterface';
import { db } from '../../../../server/db';
import { stellarPaymentTransfers } from '../../../../shared/stellarSchema';
import { eq } from 'drizzle-orm';

const VALID_CORRIDORS = [
  'axusd-to-usdc-stellar-usd',
  'axusd-to-usdc-stellar-global',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    senderWalletAddress,
    sourceAxusdAmount,
    destinationCurrency,
    destinationAccount,
    corridorId,
    memo,
    dryRun,
  } = req.body ?? {};

  // Validate required fields
  if (!senderWalletAddress || typeof senderWalletAddress !== 'string') {
    return res.status(400).json({ error: 'senderWalletAddress is required' });
  }
  if (!sourceAxusdAmount || typeof sourceAxusdAmount !== 'string') {
    return res.status(400).json({ error: 'sourceAxusdAmount is required' });
  }
  if (!destinationCurrency || typeof destinationCurrency !== 'string') {
    return res.status(400).json({ error: 'destinationCurrency is required (USD or USDC)' });
  }
  if (!destinationAccount || typeof destinationAccount !== 'string') {
    return res.status(400).json({ error: 'destinationAccount is required' });
  }
  if (!corridorId || typeof corridorId !== 'string') {
    return res.status(400).json({ error: `corridorId is required. Valid: ${VALID_CORRIDORS.join(', ')}` });
  }
  if (!VALID_CORRIDORS.includes(corridorId)) {
    return res.status(400).json({ error: `Invalid corridorId. Valid options: ${VALID_CORRIDORS.join(', ')}` });
  }

  // Validate amount
  const amount = parseFloat(sourceAxusdAmount);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'sourceAxusdAmount must be a positive number' });
  }
  if (amount < 1) {
    return res.status(400).json({ error: 'Minimum payment amount is 1 AXUSD' });
  }
  if (amount > 100000) {
    return res.status(400).json({ error: 'Maximum payment amount is 100,000 AXUSD per transaction' });
  }

  const options: InitiatePaymentOptions = {
    sourceAxusdAmount,
    destinationCurrency: destinationCurrency.toUpperCase(),
    destinationCountry: destinationCurrency === 'MXN' ? 'MX' : 'US',
    destinationAccount,
    corridorId,
    senderWalletAddress: senderWalletAddress.toLowerCase(),
    complianceToken: null,
    memo: memo ?? null,
    dryRun: Boolean(dryRun),
  };

  const adapter = getStellarPaymentAdapter('mainnet');
  const result = await adapter.initiatePayment(options);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error,
    });
  }

  // Fetch the interactive URL from DB (stored during initiatePayment)
  let interactiveUrl: string | null = null;
  if (result.transferId) {
    try {
      const rows = await db
        .select({ url: stellarPaymentTransfers.sep24InteractiveUrl })
        .from(stellarPaymentTransfers)
        .where(eq(stellarPaymentTransfers.id, result.transferId))
        .limit(1);
      interactiveUrl = rows[0]?.url ?? null;
    } catch {
      // non-fatal
    }
  }

  return res.status(201).json({
    success: true,
    transferId: result.transferId,
    interactiveUrl,
    anchorTransferId: result.state?.externalId ?? null,
    state: result.state,
    message: 'Payment initiated. Redirect user to interactiveUrl to complete the withdrawal through Circle.',
  });
}
