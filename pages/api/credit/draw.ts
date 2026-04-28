/**
 * POST /api/credit/draw
 *
 * Draws funds from an active credit line via Increase ACH to the
 * participant's registered bank account. SIWE-authenticated.
 *
 * Records the draw in stellar_payment_transfers with corridorId: 'usd-credit-draw-axiom'.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { cryptoCreditLines } from '../../../shared/cryptoCreditSchema';
import { stellarPaymentTransfers } from '../../../shared/stellarSchema';
import { increaseParticipants } from '../../../shared/increaseParticipantSchema';
import { getSiweWallet } from '../../../lib/server/banking/siweHelper';
import { IncreaseService, getAccountId, IncreaseDisabledError } from '../../../lib/services/IncreaseService';
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
    return res.status(403).json({ error: 'You may only draw from your own credit line' });
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
        inArray(cryptoCreditLines.status, ['active', 'warning']),
      ),
    )
    .limit(1);

  if (lines.length === 0) {
    return res.status(404).json({ error: 'No active credit line found' });
  }

  const line = lines[0];
  const creditLimitUsd = parseFloat(line.creditLimitUsd ?? '0');
  const drawnAmountUsd = parseFloat(line.drawnAmountUsd ?? '0');
  const availableCredit = creditLimitUsd - drawnAmountUsd;

  if (amount > availableCredit) {
    return res.status(400).json({
      error: `Requested amount ($${amount}) exceeds available credit ($${availableCredit.toFixed(2)})`,
      availableCredit: availableCredit.toFixed(2),
    });
  }

  const participants = await db
    .select()
    .from(increaseParticipants)
    .where(eq(increaseParticipants.walletAddress, wallet))
    .limit(1);

  if (participants.length === 0) {
    return res.status(404).json({ error: 'No registered participant bank account found. Please register your bank account first.' });
  }

  const participant = participants[0];

  if (!participant.virtualAccountNumber || !participant.virtualRoutingNumber) {
    return res.status(400).json({ error: 'No bank account registered. Please set up your banking details first.' });
  }

  const accountId = getAccountId();
  if (!accountId) {
    return res.status(503).json({ error: 'Banking account not configured' });
  }

  const amountCents = Math.round(amount * 100);
  const transferId = uuidv4();
  const idempotencyKey = `credit-draw-${line.id}-${transferId}`;

  let increaseTransfer;
  try {
    increaseTransfer = await IncreaseService.initiateAchTransfer(
      {
        account_id: accountId,
        account_number: participant.virtualAccountNumber,
        routing_number: participant.virtualRoutingNumber,
        amount: amountCents,
        statement_descriptor: `AXIOM CREDIT DRAW ${line.id.slice(0, 16).toUpperCase()}`,
        company_name: 'Axiom Protocol LLC',
      },
      idempotencyKey,
    );
  } catch (err) {
    if (err instanceof IncreaseDisabledError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[credit/draw] Increase ACH error:', msg);
    return res.status(502).json({ error: `ACH transfer failed: ${msg}` });
  }

  const newDrawn = (drawnAmountUsd + amount).toFixed(2);
  await db
    .update(cryptoCreditLines)
    .set({
      drawnAmountUsd: newDrawn,
      updatedAt: new Date(),
    })
    .where(eq(cryptoCreditLines.id, line.id));

  await db.insert(stellarPaymentTransfers).values({
    id: transferId,
    axiomWalletAddress: wallet,
    stellarPublicKey: null,
    anchorId: 'axiom-credit',
    corridorId: 'usd-credit-draw-axiom',
    sourceAmountAxusd: amount.toFixed(2),
    destinationCurrency: 'USD',
    destinationAmount: amount.toFixed(2),
    destinationAccount: `${participant.fullName} | Account: ${participant.virtualAccountNumber} | Routing: ${participant.virtualRoutingNumber} | ACH`,
    feeEstimate: '0.00',
    status: 'pending_anchor',
    sepProtocol: 'credit',
    anchorRawResponse: {
      creditLineId: line.id,
      increaseTransferId: increaseTransfer.id,
      increaseStatus: increaseTransfer.status,
      drawInitiatedAt: new Date().toISOString(),
    },
  });

  return res.status(201).json({
    success: true,
    transferId,
    amountUsd: amount,
    increaseTransferId: increaseTransfer.id,
    newDrawnAmountUsd: newDrawn,
    availableCredit: (creditLimitUsd - parseFloat(newDrawn)).toFixed(2),
    message: `$${amount.toFixed(2)} has been initiated via ACH. Funds will arrive in 1–3 business days.`,
  });
}
