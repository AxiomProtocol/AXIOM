import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import {
  increaseParticipants,
  increaseProductEscrows,
} from '../../../../shared/increaseParticipantSchema';
import { IncreaseService } from '../../../../lib/services/IncreaseService';
import { getSiweWallet } from '../../../../lib/server/banking/siweHelper';
import { eq, and } from 'drizzle-orm';

function isAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

// GET /api/banking/participant/status
// GET /api/banking/participant/status?wallet=0x...  (admin or SIWE wallet matching param)
//
// Self-status mode (no ?wallet param): wallet derived EXCLUSIVELY from SIWE session.
//   This is the canonical self-service path — UI never needs to thread the wallet address.
// Wallet-param mode: admin OR SIWE wallet must match the param.
//   In dev mode both paths accept the query param as fallback.
//
// Returns: account number, card status, account balance (dedicated only), insurance holds.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const walletParam = typeof req.query.wallet === 'string'
    ? req.query.wallet.toLowerCase()
    : null;

  const adminOk = isAdmin(req);
  let resolvedWallet: string;

  if (!walletParam) {
    // ── Self-status mode: SIWE-derived wallet, no param required ──
    const siweWallet = await getSiweWallet(req);
    if (!siweWallet) {
      return res.status(401).json({ error: 'Wallet sign-in required — connect and sign in to view your account status' });
    }
    if (siweWallet === '__dev__') {
      return res.status(400).json({ error: 'Dev mode: pass ?wallet=0x... to identify the participant' });
    }
    resolvedWallet = siweWallet;
  } else {
    // ── Wallet-param mode: format validation ──
    if (!/^0x[a-fA-F0-9]{40}$/i.test(walletParam)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }
    if (!adminOk) {
      const siweWallet = await getSiweWallet(req);
      if (!siweWallet) {
        return res.status(401).json({ error: 'Wallet sign-in required' });
      }
      resolvedWallet = siweWallet === '__dev__' ? walletParam : siweWallet;
      if (!/^0x[a-fA-F0-9]{40}$/i.test(resolvedWallet)) {
        return res.status(400).json({ error: 'Wallet address could not be determined from session' });
      }
    } else {
      resolvedWallet = walletParam;
    }
  }

  try {
    const rows = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, resolvedWallet))
      .limit(1);

    if (rows.length === 0) {
      return res.status(200).json({
        registered: false,
        hasVirtualAccount: false,
        cardStatus: 'not_requested',
        insuranceHoldStatus: null,
        canJoinWealthPractice: false,
        accountBalance: null,
        card: null,
      });
    }

    const p = rows[0];
    const hasVirtualAccount = !!(p.virtualRoutingNumber && p.virtualAccountNumber);

    // Fetch insurance-hold escrows from increase_product_escrows
    const holds = await db
      .select()
      .from(increaseProductEscrows)
      .where(
        and(
          eq(increaseProductEscrows.participantId, p.id),
          eq(increaseProductEscrows.product, 'wealth-practice'),
          eq(increaseProductEscrows.purpose, 'insurance-hold'),
        )
      );

    const fundedHold = holds.find((h) => h.status === 'funded');
    const pendingHold = holds.find((h) => h.status === 'pending');

    // Fetch account balance — ONLY for participant-dedicated accounts.
    // Requires BOTH increaseAccountId AND increaseEntityId to be set.
    // increaseEntityId proves the account was provisioned via the per-participant entity path.
    // This prevents any historical fallback records (where increaseAccountId == shared treasury)
    // from exposing the treasury balance to participants.
    const isParticipantDedicated = !!(p.increaseAccountId && p.increaseEntityId);
    let accountBalance: { availableBalanceCents: number; currentBalanceCents: number; currency: string } | null = null;
    if (isParticipantDedicated) {
      try {
        const bal = await IncreaseService.getAccountBalance(p.increaseAccountId!);
        accountBalance = {
          availableBalanceCents: bal.available_balance,
          currentBalanceCents: bal.current_balance,
          currency: bal.currency,
        };
      } catch {
        // Non-fatal — balance unavailable (e.g. API error or sandbox lag)
      }
    }
    // If participant does not have a dedicated entity+account, accountBalance is null.

    // Fetch card details if issued
    let cardDetails: { id: string; last4: string; expirationMonth: number; expirationYear: number; status: string } | null = null;
    if (p.cardId) {
      try {
        const card = await IncreaseService.getCard(p.cardId);
        cardDetails = {
          id: card.id,
          last4: card.last4,
          expirationMonth: card.expiration_month,
          expirationYear: card.expiration_year,
          status: card.status,
        };
      } catch {
        // Non-fatal
      }
    }

    // Account access mode for UI disclosure:
    //  - 'dedicated'     : participant has both a per-participant entity AND account (KYC provisioned)
    //  - 'virtual-only'  : participant has a virtual account number only (no dedicated entity/account)
    const accountAccessMode: 'dedicated' | 'virtual-only' = isParticipantDedicated ? 'dedicated' : 'virtual-only';

    return res.status(200).json({
      registered: true,
      participantRef: p.participantRef,
      fullName: p.fullName,
      status: p.status,
      hasVirtualAccount,
      hasDedicatedAccount: isParticipantDedicated,
      accountAccessMode,
      virtualRoutingNumber: hasVirtualAccount ? p.virtualRoutingNumber : null,
      virtualAccountNumber: hasVirtualAccount ? p.virtualAccountNumber : null,
      increaseEntityId: p.increaseEntityId ?? null,
      increaseAccountId: p.increaseAccountId ?? null,
      cardStatus: p.cardStatus,
      cardLast4: p.cardLast4 ?? null,
      card: cardDetails,
      // accountBalance is ONLY the participant's dedicated account balance.
      // null when in virtual-only mode — never exposes shared treasury balance.
      accountBalance,
      insuranceHolds: holds,
      insuranceHoldStatus: fundedHold ? 'funded' : pendingHold ? 'pending' : 'none',
      canJoinWealthPractice: !!fundedHold,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
