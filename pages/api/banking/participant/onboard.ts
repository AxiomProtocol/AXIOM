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
// Full KYC onboarding: accepts identity fields, creates entity + virtual account number + card,
// and persists all IDs to the participant record in one SIWE-authenticated transaction.
// If the Increase program does not support individual entity creation (B2B model),
// provisioning falls back to virtual account number only and cardStatus='program_required'.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    walletAddress,
    fullName,
    email,
    phone,
    // KYC fields — optional in B2B/virtual-account mode; required for full entity provisioning
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
    // Return existing participant if already onboarded
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

    const hasKyc = dateOfBirth && ssnLast4 && addressLine1 && city && state && zip;
    const provisioningLog: string[] = [];

    // Step 1: Create individual entity (if KYC fields provided)
    if (hasKyc) {
      try {
        const entity = await IncreaseService.createIndividualEntity({
          name: fullName.trim(),
          date_of_birth: dateOfBirth,
          identification: { ssn_last4: ssnLast4 },
          address: { line1: addressLine1, city, state, zip },
        });
        increaseEntityId = entity.id;
        provisioningLog.push(`entity:${entity.id}`);

        // Step 2: Create a sub-account for this entity
        const programId = getProgramId();
        if (programId) {
          try {
            const account = await IncreaseService.createAccount({
              name: `${fullName.trim()} — ${participantRef}`,
              entity_id: entity.id,
              program_id: programId,
            });
            increaseAccountId = account.id;
            provisioningLog.push(`account:${account.id}`);
          } catch (err) {
            provisioningLog.push(`account:failed:${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } catch (err) {
        provisioningLog.push(`entity:failed:${err instanceof Error ? err.message : String(err)}`);
        // Fall back to B2B shared entity
        increaseEntityId = entityId || null;
      }
    } else {
      // B2B mode — use shared entity ID
      increaseEntityId = entityId || null;
    }

    // Step 3: Provision virtual account number (sub-account of Axiom Nexus Account)
    const targetAccountId = increaseAccountId || accountId;
    if (targetAccountId) {
      try {
        const vAccount = await IncreaseService.createParticipantVirtualAccount({
          account_id: targetAccountId,
          participant_ref: participantRef,
          full_name: fullName.trim(),
        });
        virtualAccountNumberId = vAccount.id;
        virtualRoutingNumber = vAccount.routing_number;
        virtualAccountNumber = vAccount.account_number;
        increaseAccountId = increaseAccountId || targetAccountId;
        provisioningLog.push(`virtual_account:${vAccount.id}`);
      } catch (err) {
        provisioningLog.push(`virtual_account:failed:${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Step 4: Issue virtual card
    if (targetAccountId) {
      try {
        const card = await IncreaseService.issueVirtualCard({
          account_id: targetAccountId,
          description: `Axiom Nexus — ${participantRef}`,
        });
        cardId = card.id;
        cardLast4 = card.last4;
        cardStatus = 'active';
        provisioningLog.push(`card:${card.id}`);
      } catch (err) {
        cardStatus = 'program_required';
        provisioningLog.push(`card:failed:${err instanceof Error ? err.message : String(err)}`);
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
      provisioning: {
        virtualAccount: !!(virtualRoutingNumber && virtualAccountNumber),
        card: cardStatus === 'active',
        entity: !!increaseEntityId,
        log: provisioningLog,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
