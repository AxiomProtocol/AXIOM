import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../../server/db';
import {
  increaseParticipants,
  increaseProductEscrows,
} from '../../../../shared/increaseParticipantSchema';
import { IncreaseService, getAccountId } from '../../../../lib/services/IncreaseService';
import { eq, and } from 'drizzle-orm';

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=')];
    }).filter(([k]) => k.length > 0)
  );
}

async function getSiweWallet(req: NextApiRequest): Promise<string | null> {
  if (process.env.NODE_ENV === 'development') return '__dev__';
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['siwe_session'];
  if (!token) return null;
  try {
    const result = await pool.query(
      `SELECT wallet_address FROM wallet_sessions WHERE session_token = $1 AND expires_at > NOW() LIMIT 1`,
      [token]
    );
    return result.rows[0]?.wallet_address ?? null;
  } catch {
    return null;
  }
}

function isAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

// GET /api/banking/participant/status?wallet=0x...
// Returns full participant status including Increase account balance and card details.
// Insurance holds are read from increase_product_escrows (product='wealth-practice', purpose='insurance-hold').
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const wallet = typeof req.query.wallet === 'string'
    ? req.query.wallet.toLowerCase()
    : null;

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/i.test(wallet)) {
    return res.status(400).json({ error: 'Valid wallet address required (?wallet=0x...)' });
  }

  const adminOk = isAdmin(req);
  // Derive authoritative wallet from SIWE session for non-admin paths.
  // In dev mode, fall back to the query param. In production, SIWE wallet is the ONLY identity.
  let resolvedWallet = wallet;
  if (!adminOk) {
    const siweWallet = await getSiweWallet(req);
    if (!siweWallet) {
      return res.status(401).json({ error: 'Wallet sign-in required' });
    }
    resolvedWallet = siweWallet === '__dev__' ? wallet : siweWallet;
    if (!resolvedWallet || !/^0x[a-fA-F0-9]{40}$/i.test(resolvedWallet)) {
      return res.status(400).json({ error: 'Wallet address could not be determined from session' });
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

    // Fetch account balance — only from participant's DEDICATED account.
    // Never fall back to the shared treasury account (getAccountId()) as that would
    // expose aggregate treasury balance to individual participants.
    let accountBalance: { availableBalanceCents: number; currentBalanceCents: number; currency: string } | null = null;
    if (p.increaseAccountId) {
      try {
        const bal = await IncreaseService.getAccountBalance(p.increaseAccountId);
        accountBalance = {
          availableBalanceCents: bal.available_balance,
          currentBalanceCents: bal.current_balance,
          currency: bal.currency,
        };
      } catch {
        // Non-fatal — balance unavailable (e.g. API error or sandbox lag)
      }
    }
    // If no dedicated account, accountBalance stays null (virtual-account-only participants
    // track their holdings via ACH deposit records, not an Increase account balance)

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
    //  - 'dedicated'     : participant has a per-participant Increase entity + account (KYC provisioned)
    //  - 'virtual-only'  : participant has a virtual account number under the shared org account (no KYC entity)
    const accountAccessMode: 'dedicated' | 'virtual-only' = p.increaseAccountId ? 'dedicated' : 'virtual-only';

    return res.status(200).json({
      registered: true,
      participantRef: p.participantRef,
      fullName: p.fullName,
      status: p.status,
      hasVirtualAccount,
      hasDedicatedAccount: !!p.increaseAccountId,
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
