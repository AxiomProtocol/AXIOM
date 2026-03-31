import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../../server/db';
import { increaseParticipants } from '../../../../shared/increaseParticipantSchema';
import {
  IncreaseService,
  getAccountId,
  getEntityId,
  getProgramId,
} from '../../../../lib/services/IncreaseService';
import { eq } from 'drizzle-orm';

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

function generateRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'AXM-';
  for (let i = 0; i < 8; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

// POST /api/banking/participant/onboard
//
// Full KYC onboarding for Axiom Nexus accounts.
// Accepts identity fields, creates entity + virtual account number + card,
// and persists all IDs to the participant record.
//
// Failure policy:
//   - KYC entity provisioning failure  → 502 (caller must retry — no silent fallback)
//   - Sub-account creation failure     → 502 (caller must retry)
//   - Virtual account number failure   → 502 (participant cannot receive ACH without it)
//   - Card issuance failure            → best-effort; response includes cardStatus detail
//
// When KYC fields are omitted (B2B / virtual-account-only mode):
//   - entity = shared org entity (entityId env var)
//   - sub-account = skipped (program_id not required)
//   - virtual account + card still attempted
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    walletAddress,
    fullName,
    email,
    phone,
    // KYC fields — required only for full individual entity provisioning
    dateOfBirth,
    ssnLast4,
    addressLine1,
    city,
    state,
    zip,
  } = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Full name required' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const wallet = walletAddress.toLowerCase();

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ error: 'Wallet sign-in required — connect your wallet and sign in to register' });
  }
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only onboard your own connected wallet' });
  }

  try {
    // Return existing participant immediately — idempotent
    const existing = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (existing.length > 0) {
      return res.status(200).json({ success: true, participant: existing[0], isNew: false });
    }

    // Generate unique participant reference code
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

    const accountId = getAccountId();
    const entityId = getEntityId();

    let increaseEntityId: string | null = null;
    let increaseAccountId: string | null = null;
    let virtualAccountNumberId: string | null = null;
    let virtualRoutingNumber: string | null = null;
    let virtualAccountNumber: string | null = null;
    let cardId: string | null = null;
    let cardLast4: string | null = null;
    let cardStatus = 'not_requested';

    const hasKyc = !!(dateOfBirth && ssnLast4 && addressLine1 && city && state && zip);

    // Step 1: Create individual entity (KYC mode) — HARD FAIL if this fails
    if (hasKyc) {
      let entity: { id: string };
      try {
        entity = await IncreaseService.createIndividualEntity({
          name: fullName.trim(),
          date_of_birth: dateOfBirth,
          identification: { ssn_last4: ssnLast4 },
          address: { line1: addressLine1, city, state, zip },
        });
      } catch (err) {
        return res.status(502).json({
          error: `KYC entity provisioning failed: ${err instanceof Error ? err.message : String(err)}`,
          code: 'ENTITY_PROVISIONING_FAILED',
          note: 'Participant was NOT created. Please retry.',
        });
      }
      increaseEntityId = entity.id;

      // Step 2: Create sub-account — HARD FAIL if this fails (participant needs an account for ACH)
      const programId = getProgramId();
      if (programId) {
        let account: { id: string };
        try {
          account = await IncreaseService.createAccount({
            name: `${fullName.trim()} — ${participantRef}`,
            entity_id: entity.id,
            program_id: programId,
          });
        } catch (err) {
          return res.status(502).json({
            error: `Sub-account provisioning failed: ${err instanceof Error ? err.message : String(err)}`,
            code: 'ACCOUNT_PROVISIONING_FAILED',
            note: 'Entity was created but the account could not be provisioned. Please retry or contact support.',
            increaseEntityId: entity.id,
          });
        }
        increaseAccountId = account.id;
      }
    } else {
      // B2B / virtual-account-only mode — use shared org entity
      increaseEntityId = entityId || null;
    }

    // Step 3: Provision virtual account number — HARD FAIL (participant cannot receive ACH without it)
    const targetAccountId = increaseAccountId || accountId;
    if (targetAccountId) {
      let vAccount: { id: string; routing_number: string; account_number: string };
      try {
        vAccount = await IncreaseService.createParticipantVirtualAccount({
          account_id: targetAccountId,
          participant_ref: participantRef,
          full_name: fullName.trim(),
        });
      } catch (err) {
        return res.status(502).json({
          error: `Virtual account provisioning failed: ${err instanceof Error ? err.message : String(err)}`,
          code: 'VIRTUAL_ACCOUNT_PROVISIONING_FAILED',
          note: 'Participant was NOT created. Please retry.',
          increaseEntityId: increaseEntityId ?? undefined,
          increaseAccountId: increaseAccountId ?? undefined,
        });
      }
      virtualAccountNumberId = vAccount.id;
      virtualRoutingNumber = vAccount.routing_number;
      virtualAccountNumber = vAccount.account_number;
      increaseAccountId = increaseAccountId || targetAccountId;
    }

    // Step 4: Issue virtual card — BEST EFFORT (card is a convenience feature, not blocking)
    if (targetAccountId) {
      try {
        const card = await IncreaseService.issueVirtualCard({
          account_id: targetAccountId,
          description: `Axiom Nexus — ${participantRef}`,
        });
        cardId = card.id;
        cardLast4 = card.last4;
        cardStatus = 'active';
      } catch {
        // Card issuance is best-effort — program may not support it in sandbox/B2B mode
        cardStatus = 'program_required';
      }
    }

    const [participant] = await db
      .insert(increaseParticipants)
      .values({
        walletAddress: wallet,
        participantRef,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        status: 'registered',
        virtualAccountNumberId,
        virtualRoutingNumber,
        virtualAccountNumber,
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
        entity: !!increaseEntityId ? 'ok' : 'skipped',
        account: !!increaseAccountId ? 'ok' : 'skipped',
        virtualAccount: !!(virtualRoutingNumber && virtualAccountNumber) ? 'ok' : 'skipped',
        card: cardStatus === 'active' ? 'ok' : cardStatus,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
