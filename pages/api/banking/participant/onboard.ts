import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { increaseParticipants } from '../../../../shared/increaseParticipantSchema';
import {
  IncreaseService,
  getProgramId,
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
// Per-participant Increase provisioning — mandatory KYC path.
// Accepts identity + KYC fields, creates:
//   1. Individual Increase entity (name, DOB, SSN, address) — HARD FAIL
//   2. Per-participant Increase account (entity_id + program_id) — HARD FAIL
//   3. Virtual account number under the participant's account — HARD FAIL
//   4. Virtual debit card — BEST EFFORT (non-blocking)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    walletAddress,
    fullName,
    email,
    phone,
    dateOfBirth,
    ssn,
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
  const ssnDigits = typeof ssn === 'string' ? ssn.replace(/\D/g, '') : '';
  if (ssnDigits.length !== 9) {
    return res.status(400).json({ error: 'Social Security Number required (9 digits)' });
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

    // ── Step 1: Create per-participant individual entity — HARD FAIL ──────────
    let entity: { id: string };
    try {
      entity = await IncreaseService.createIndividualEntity({
        name: fullName.trim(),
        date_of_birth: dateOfBirth,
        identification: { ssn: ssnDigits },
        address: {
          line1: addressLine1.trim(),
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
        },
      });
    } catch (err) {
      return res.status(502).json({
        error: `Identity verification failed: ${err instanceof Error ? err.message : String(err)}`,
        code: 'ENTITY_PROVISIONING_FAILED',
        note: 'Your account was NOT created. Please verify your information and retry.',
      });
    }
    const increaseEntityId = entity.id;

    // ── Step 2: Create per-participant account — HARD FAIL ────────────────────
    const programId = getProgramId();

    let increaseAccountId: string;

    if (programId) {
      let account: { id: string };
      try {
        account = await IncreaseService.createAccount({
          name: `${fullName.trim()} — ${participantRef}`,
          entity_id: increaseEntityId,
          program_id: programId,
        });
      } catch (err) {
        return res.status(502).json({
          error: `Account provisioning failed: ${err instanceof Error ? err.message : String(err)}`,
          code: 'ACCOUNT_PROVISIONING_FAILED',
          note: 'Your entity was created but the account could not be provisioned. Please retry or contact support.',
          increaseEntityId,
        });
      }
      increaseAccountId = account.id;
    } else {
      return res.status(502).json({
        error: 'Increase program ID not configured — per-participant account provisioning requires INCREASE_PROGRAM_ID (or INCREASE_SANDBOX_PROGRAM_ID in sandbox).',
        code: 'PROGRAM_ID_MISSING',
        note: 'Set INCREASE_SANDBOX_PROGRAM_ID / INCREASE_PROGRAM_ID to enable per-participant account provisioning.',
      });
    }

    // ── Step 3: Provision virtual account number — HARD FAIL ──────────────────
    let vAccount: { id: string; routing_number: string; account_number: string };
    try {
      vAccount = await IncreaseService.createParticipantVirtualAccount({
        account_id: increaseAccountId,
        participant_ref: participantRef,
        full_name: fullName.trim(),
      });
    } catch (err) {
      return res.status(502).json({
        error: `Virtual account provisioning failed: ${err instanceof Error ? err.message : String(err)}`,
        code: 'VIRTUAL_ACCOUNT_PROVISIONING_FAILED',
        note: 'Your entity and account were created but the virtual account number could not be issued. Please retry.',
        increaseEntityId,
        increaseAccountId,
      });
    }

    // ── Step 4: Issue virtual debit card — BEST EFFORT ────────────────────────
    let cardId: string | null = null;
    let cardLast4: string | null = null;
    let cardStatus = 'card_pending';

    try {
      const card = await IncreaseService.issueVirtualCard({
        account_id: increaseAccountId,
        description: `Axiom Nexus — ${participantRef}`,
      });
      cardId = card.id;
      cardLast4 = card.last4;
      cardStatus = 'active';
    } catch {
      cardStatus = 'card_pending';
    }

    // ── Persist complete participant record ────────────────────────────────────
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
        cardStatus,
        cardId,
        cardLast4,
        increaseEntityId,
        increaseAccountId,
      })
      .returning();

    return res.status(201).json({
      success: true,
      participant,
      isNew: true,
      provisioningStatus: {
        entity: 'ok',
        account: 'dedicated',
        virtualAccount: 'ok',
        card: cardStatus === 'active' ? 'ok' : 'pending',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
