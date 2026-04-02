import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { increaseParticipants } from '../../../../shared/increaseParticipantSchema';
import {
  IncreaseService,
  getAccountId,
} from '../../../../lib/services/IncreaseService';
import { getSiweWallet } from '../../../../lib/server/banking/siweHelper';
import { eq } from 'drizzle-orm';

function generateRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'AXM-';
  for (let i = 0; i < 8; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

// POST /api/banking/participant/onboard
//
// Per-participant Increase provisioning via virtual account number model.
// Per-participant entity/account creation requires Increase entity management
// (a BaaS/program feature). We instead issue a dedicated virtual account number
// under the main Axiom Nexus account — each participant gets a unique routing +
// account number that routes to the Axiom Nexus master account.
//
// Steps:
//   1. Create virtual account number under main Axiom account — HARD FAIL
//   2. Persist participant record — HARD FAIL
//
// KYC fields (name, DOB, SSN-last4, address) are stored in our database for
// internal identity reference. SSN last-4 is never forwarded to Increase.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    walletAddress,
    fullName,
    email,
    phone,
    dateOfBirth,
    ssnLast4,
    addressLine1,
    city,
    state,
    zip,
  } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────────
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Full legal name required (minimum 2 characters)' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address required' });
  }
  if (!dateOfBirth || typeof dateOfBirth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return res.status(400).json({ error: 'Date of birth required (YYYY-MM-DD)' });
  }
  if (!ssnLast4 || typeof ssnLast4 !== 'string' || !/^\d{4}$/.test(ssnLast4)) {
    return res.status(400).json({ error: 'Last 4 digits of SSN required' });
  }
  if (!addressLine1 || typeof addressLine1 !== 'string' || addressLine1.trim().length < 3) {
    return res.status(400).json({ error: 'Street address required' });
  }
  if (!city || typeof city !== 'string' || city.trim().length < 1) {
    return res.status(400).json({ error: 'City required' });
  }
  if (!state || typeof state !== 'string' || !/^[A-Z]{2}$/.test(state)) {
    return res.status(400).json({ error: 'State required (2-letter abbreviation, e.g. TX)' });
  }
  if (!zip || typeof zip !== 'string' || !/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'ZIP code required (5 digits)' });
  }

  const mainAccountId = getAccountId();
  if (!mainAccountId) {
    return res.status(502).json({
      error: 'Increase account not configured. Set INCREASE_SANDBOX_ACCOUNT_ID (sandbox) or INCREASE_ACCOUNT_ID (production).',
      code: 'ACCOUNT_ID_MISSING',
    });
  }

  const wallet = walletAddress.toLowerCase();

  // ── SIWE auth ─────────────────────────────────────────────────────────────────
  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ error: 'Wallet sign-in required — connect your wallet and sign in to register' });
  }
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only onboard your own connected wallet' });
  }

  try {
    // ── Idempotency: return existing participant immediately ───────────────────
    const existing = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (existing.length > 0) {
      return res.status(200).json({ success: true, participant: existing[0], isNew: false });
    }

    // ── Generate unique participant reference code ─────────────────────────────
    let participantRef = generateRef();
    for (let i = 0; i < 5; i++) {
      const check = await db
        .select()
        .from(increaseParticipants)
        .where(eq(increaseParticipants.participantRef, participantRef))
        .limit(1);
      if (check.length === 0) break;
      participantRef = generateRef();
    }

    // ── Step 1: Create virtual account number under main Axiom account — HARD FAIL
    // Entity management (POST /entities) requires Increase BaaS/program features.
    // Virtual account numbers work with all Increase account types and route
    // incoming ACH/wire to the main Axiom Nexus account.
    let vAccount: { id: string; routing_number: string; account_number: string };
    try {
      vAccount = await IncreaseService.createParticipantVirtualAccount({
        account_id: mainAccountId,
        participant_ref: participantRef,
        full_name: fullName.trim(),
      });
    } catch (err) {
      return res.status(502).json({
        error: `Virtual account provisioning failed: ${err instanceof Error ? err.message : String(err)}`,
        code: 'VIRTUAL_ACCOUNT_PROVISIONING_FAILED',
        note: 'Your account was NOT created. Please verify your information and retry.',
      });
    }

    // ── Step 2: Persist participant record ────────────────────────────────────
    const [participant] = await db
      .insert(increaseParticipants)
      .values({
        walletAddress: wallet,
        participantRef,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        status: 'registered',
        virtualAccountNumberId: vAccount.id,
        virtualRoutingNumber: vAccount.routing_number,
        virtualAccountNumber: vAccount.account_number,
        cardStatus: 'card_pending',
        cardId: null,
        cardLast4: null,
        increaseEntityId: null,
        increaseAccountId: mainAccountId,
      })
      .returning();

    return res.status(201).json({
      success: true,
      participant,
      isNew: true,
      provisioningStatus: {
        entity: 'shared-org',
        account: 'main-account',
        virtualAccount: 'ok',
        card: 'pending',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
