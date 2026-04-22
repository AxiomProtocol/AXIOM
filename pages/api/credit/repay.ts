/**
 * POST /api/credit/repay
 *
 * Records a repayment INTENT for a credit line. Does NOT immediately reduce
 * the drawn balance — that happens only after ops confirms actual payment receipt.
 *
 * The repayment is stored in stellar_payment_transfers as 'pending_user_transfer_start'.
 * Ops must verify payment and then manually update drawnAmountUsd + release collateral.
 *
 * SIWE-authenticated.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { cryptoCreditLines } from '../../../shared/cryptoCreditSchema';
import { stellarPaymentTransfers } from '../../../shared/stellarSchema';
import { getSiweWallet } from '../../../lib/server/banking/siweHelper';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });

  const { walletAddress, amountUsd } = req.body as {
    walletAddress?: string;
    amountUsd?: string | number;
  };

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'walletAddress is required' });
  }

  const wallet = walletAddress.toLowerCase();
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only repay your own credit line' });
  }

  const amount = parseFloat(String(amountUsd ?? '0'));
  if (isNaN(amount) || amount < 1) {
    return res.status(400).json({ error: 'amountUsd must be at least $1' });
  }

  const lines = await db
    .select()
    .from(cryptoCreditLines)
    .where(
      and(
        eq(cryptoCreditLines.participantWallet, wallet),
        inArray(cryptoCreditLines.status, ['active', 'warning', 'flagged']),
      ),
    )
    .limit(1);

  if (lines.length === 0) {
    return res.status(404).json({ error: 'No active credit line found' });
  }

  const line = lines[0];
  const drawnAmountUsd = parseFloat(line.drawnAmountUsd ?? '0');

  if (amount > drawnAmountUsd) {
    return res.status(400).json({
      error: `Repayment amount ($${amount}) exceeds outstanding balance ($${drawnAmountUsd.toFixed(2)})`,
      outstandingBalance: drawnAmountUsd.toFixed(2),
    });
  }

  const collateralAmount = parseFloat(line.collateralAmountRaw);
  const collateralFractionToRelease =
    drawnAmountUsd > 0 ? (amount / drawnAmountUsd) * collateralAmount : 0;

  const transferId = uuidv4();

  // Record repayment INTENT only. Balance is NOT reduced here.
  // Ops must confirm actual payment receipt, then:
  //   1. Update crypto_credit_lines.drawn_amount_usd -= repaymentAmount
  //   2. Release proportional collateral from BitGo custody
  await db.insert(stellarPaymentTransfers).values({
    id: transferId,
    axiomWalletAddress: wallet,
    stellarPublicKey: null,
    anchorId: 'axiom-credit',
    corridorId: 'usd-credit-draw-axiom',
    sourceAmountAxusd: amount.toFixed(2),
    destinationCurrency: 'USD',
    destinationAmount: amount.toFixed(2),
    destinationAccount: 'Axiom Protocol LLC Credit Repayment',
    feeEstimate: '0.00',
    status: 'pending_user_transfer_start',
    sepProtocol: 'credit',
    anchorRawResponse: {
      creditLineId: line.id,
      type: 'repayment_intent',
      repaymentAmountUsd: amount,
      currentDrawnAmountUsd: drawnAmountUsd,
      collateralFractionToRelease: collateralFractionToRelease.toFixed(8),
      collateralAsset: line.collateralAsset,
      intentRecordedAt: new Date().toISOString(),
      opsInstruction:
        'Verify incoming payment via ACH/wire. On confirmation: (1) reduce drawn_amount_usd, (2) release collateral from BitGo.',
    },
  });

  return res.status(201).json({
    success: true,
    transferId,
    amountIntended: amount,
    currentOutstandingBalance: drawnAmountUsd.toFixed(2),
    collateralFractionToRelease: collateralFractionToRelease.toFixed(8),
    collateralAsset: line.collateralAsset,
    message: `Repayment intent of $${amount.toFixed(2)} recorded. Send payment via ACH or wire to Axiom Protocol LLC. Your balance and collateral will be updated once ops confirms receipt.`,
  });
}
