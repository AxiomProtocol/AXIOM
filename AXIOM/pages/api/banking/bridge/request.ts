import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import {
  increaseParticipants,
  bridgeConversionRequests,
} from '../../../../shared/increaseParticipantSchema';
import { eq, desc } from 'drizzle-orm';
import { getSiweWallet } from '../../../../lib/server/banking/siweHelper';

// POST /api/banking/bridge/request  — submit a conversion request
// GET  /api/banking/bridge/request?wallet=X  — list user's requests

const VALID_DIRECTIONS = ['fiat_to_axusd', 'axusd_to_fiat'] as const;
const MIN_CENTS = 100;      // $1.00
const MAX_CENTS = 100_000_00; // $100,000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── GET: list requests ─────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { wallet } = req.query;
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ success: false, error: 'wallet required' });
    }
    try {
      const rows = await db
        .select()
        .from(bridgeConversionRequests)
        .where(eq(bridgeConversionRequests.walletAddress, wallet.toLowerCase()))
        .orderBy(desc(bridgeConversionRequests.requestedAt))
        .limit(50);
      return res.status(200).json({ success: true, requests: rows });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  }

  // ── POST: create request ───────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ success: false, error: 'Wallet sign-in required' });
  }

  const { direction, amountCents, walletAddress: bodyWallet, notes } = req.body;

  const wallet: string =
    siweWallet === '__dev__' ? String(bodyWallet || '').toLowerCase() : siweWallet.toLowerCase();

  if (!wallet || !/^0x[a-f0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ success: false, error: 'Valid wallet address required' });
  }
  if (!VALID_DIRECTIONS.includes(direction)) {
    return res.status(400).json({ success: false, error: 'direction must be fiat_to_axusd or axusd_to_fiat' });
  }
  const cents = Number(amountCents);
  if (!Number.isInteger(cents) || cents < MIN_CENTS || cents > MAX_CENTS) {
    return res.status(400).json({
      success: false,
      error: `Amount must be between $1.00 and $100,000.00 (provided ${cents} cents)`,
    });
  }

  // Participant must be registered
  const participants = await db
    .select()
    .from(increaseParticipants)
    .where(eq(increaseParticipants.walletAddress, wallet))
    .limit(1);

  if (participants.length === 0) {
    return res.status(402).json({
      success: false,
      error: 'Axiom Nexus account required — register your banking account before submitting a conversion.',
      code: 'NEXUS_NOT_REGISTERED',
    });
  }

  const participant = participants[0];

  // Check for an existing pending request for same direction (prevent duplicates)
  const pendingRows = await db
    .select()
    .from(bridgeConversionRequests)
    .where(eq(bridgeConversionRequests.walletAddress, wallet))
    .limit(10);

  const hasPending = pendingRows.some(
    (r) => r.status === 'pending' && r.direction === direction,
  );
  if (hasPending) {
    return res.status(409).json({
      success: false,
      error: 'You already have a pending conversion in that direction. Wait for it to be processed before submitting another.',
      code: 'PENDING_EXISTS',
    });
  }

  // AXUSD amount = same as fiat amount (1:1 via PSM)
  const axusdAmount = (cents / 100).toFixed(2);

  const [request] = await db
    .insert(bridgeConversionRequests)
    .values({
      participantId: participant.id,
      walletAddress: wallet,
      direction,
      amountCents: cents,
      axusdAmount,
      status: 'pending',
      notes: notes ? String(notes).slice(0, 500) : null,
    })
    .returning();

  return res.status(201).json({
    success: true,
    request,
    message:
      direction === 'fiat_to_axusd'
        ? `Conversion request submitted. Once your fiat deposit is confirmed, ${axusdAmount} AXUSD will be delivered to your wallet.`
        : `Conversion request submitted. Send ${axusdAmount} AXUSD to the PSM, then USD will be credited to your account via ACH.`,
  });
}
