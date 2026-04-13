/**
 * POST /api/axiom-rail/escrow/create
 *
 * Creates a new escrow agreement and returns the escrow ID, shareable link,
 * and party tokens (shown once — hashes stored only).
 *
 * BSA identity is collected from the initiating party and stored as a
 * SHA-256 hash of the canonicalized fields.
 *
 * Security:
 *  - Rate limited: 5 requests per IP per hour
 *  - CORS restricted to allowlist origins
 *  - BSA data never stored in plaintext — SHA-256 hash only
 *  - Party tokens: 32-byte random hex, stored as SHA-256+salt hash
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, randomBytes } from 'crypto';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { db } from '../../../../server/db';
import { axiomRailEscrows } from '../../../../shared/escrowSchema';
import { sendEscrowCounterpartyInvitation } from '../../../../lib/email/resend';

const TOKEN_SALT = 'axiom-rail-escrow-party-token-v1';

function hashToken(plaintext: string): string {
  return createHash('sha256').update(`${TOKEN_SALT}:${plaintext}`).digest('hex');
}

function hashBsa(fields: Record<string, string>): string {
  const canonical = JSON.stringify(fields, Object.keys(fields).sort());
  return createHash('sha256').update(`bsa-escrow-v1:${canonical}`).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'escrow/create', { max: 5, windowMs: 3600_000 })) return;

  const {
    initiatorName,
    counterpartyName,
    counterpartyEmail,
    amountUsd,
    purpose,
    releaseCondition,
    deadline,
    beneficiaryRouting,
    beneficiaryAccount,
    beneficiaryBankName,
    bsaLegalName,
    bsaDob,
    bsaCountry,
    bsaIdType,
    bsaIdNumber,
  } = req.body as {
    initiatorName?: string;
    counterpartyName?: string;
    counterpartyEmail?: string;
    amountUsd?: string;
    purpose?: string;
    releaseCondition?: string;
    deadline?: string;
    beneficiaryRouting?: string;
    beneficiaryAccount?: string;
    beneficiaryBankName?: string;
    bsaLegalName?: string;
    bsaDob?: string;
    bsaCountry?: string;
    bsaIdType?: string;
    bsaIdNumber?: string;
  };

  if (!initiatorName?.trim()) return res.status(400).json({ error: 'initiatorName is required' });
  if (!counterpartyName?.trim()) return res.status(400).json({ error: 'counterpartyName is required' });
  if (!counterpartyEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(counterpartyEmail)) {
    return res.status(400).json({ error: 'counterpartyEmail must be a valid email address' });
  }

  const parsedAmount = parseFloat(amountUsd ?? '0');
  if (isNaN(parsedAmount) || parsedAmount < 1 || parsedAmount > 500000) {
    return res.status(400).json({ error: 'amountUsd must be between $1 and $500,000' });
  }

  const validPurposes = ['security_deposit', 'earnest_money', 'milestone'];
  if (!purpose || !validPurposes.includes(purpose)) {
    return res.status(400).json({ error: 'purpose must be one of: security_deposit, earnest_money, milestone' });
  }

  const validConditions = ['bilateral_approval', 'deadline'];
  if (!releaseCondition || !validConditions.includes(releaseCondition)) {
    return res.status(400).json({ error: 'releaseCondition must be one of: bilateral_approval, deadline' });
  }

  let parsedDeadline: Date | null = null;
  if (releaseCondition === 'deadline') {
    if (!deadline) return res.status(400).json({ error: 'deadline is required when releaseCondition is deadline' });
    parsedDeadline = new Date(deadline);
    if (isNaN(parsedDeadline.getTime()) || parsedDeadline <= new Date()) {
      return res.status(400).json({ error: 'deadline must be a valid future date' });
    }
  }

  if (!beneficiaryRouting || !/^\d{9}$/.test(beneficiaryRouting)) {
    return res.status(400).json({ error: 'beneficiaryRouting must be exactly 9 digits' });
  }
  if (!beneficiaryAccount?.trim()) return res.status(400).json({ error: 'beneficiaryAccount is required' });
  if (!beneficiaryBankName?.trim()) return res.status(400).json({ error: 'beneficiaryBankName is required' });

  const missingBsa: string[] = [];
  if (!bsaLegalName) missingBsa.push('bsaLegalName');
  if (!bsaDob) missingBsa.push('bsaDob');
  if (!bsaCountry) missingBsa.push('bsaCountry');
  if (!bsaIdType) missingBsa.push('bsaIdType');
  if (!bsaIdNumber) missingBsa.push('bsaIdNumber');
  if (missingBsa.length > 0) {
    return res.status(400).json({ error: `Missing identity fields: ${missingBsa.join(', ')}` });
  }

  if (!['ssn', 'passport'].includes(bsaIdType!)) {
    return res.status(400).json({ error: 'bsaIdType must be ssn or passport' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bsaDob!)) {
    return res.status(400).json({ error: 'bsaDob must be YYYY-MM-DD' });
  }
  if (bsaIdType === 'ssn' && !/^\d{4}$/.test(bsaIdNumber!)) {
    return res.status(400).json({ error: 'bsaIdNumber must be exactly 4 digits for SSN' });
  }
  if (bsaIdType === 'passport' && !/^[A-Z0-9]{3,20}$/i.test(bsaIdNumber!)) {
    return res.status(400).json({ error: 'bsaIdNumber must be 3–20 alphanumeric characters for passport' });
  }

  const initiatorPlainToken = randomBytes(32).toString('hex');
  const counterpartyPlainToken = randomBytes(32).toString('hex');
  const initiatorTokenHash = hashToken(initiatorPlainToken);
  const counterpartyTokenHash = hashToken(counterpartyPlainToken);

  const bsaHash = hashBsa({
    legalName: bsaLegalName!,
    dob: bsaDob!,
    country: bsaCountry!,
    idType: bsaIdType!,
    idNumber: bsaIdNumber!,
  });

  try {
    const [escrow] = await db.insert(axiomRailEscrows).values({
      initiatorName: initiatorName.trim(),
      counterpartyName: counterpartyName.trim(),
      counterpartyEmail: counterpartyEmail.trim().toLowerCase(),
      amountUsd: parsedAmount.toFixed(2),
      purpose: purpose as 'security_deposit' | 'earnest_money' | 'milestone',
      releaseCondition: releaseCondition as 'bilateral_approval' | 'deadline',
      deadline: parsedDeadline ?? undefined,
      beneficiaryRouting,
      beneficiaryAccount: beneficiaryAccount.trim(),
      beneficiaryBankName: beneficiaryBankName.trim(),
      initiatorTokenHash,
      counterpartyTokenHash,
      bsaHash,
      // Escrow starts as 'pending_funding' — the initiator must confirm receipt
      // of funds via the /fund endpoint (initiator token) before release triggers
      // activate. This ensures no payouts occur without a verified funding event.
      status: 'pending_funding',
    }).returning({ id: axiomRailEscrows.id });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://axiomprotocol.app';
    const escrowUrl = `${baseUrl}/escrow/${escrow.id}`;

    // Deliver counterparty token via email to prevent unilateral release:
    // the creator only receives the initiator token; the counterparty receives
    // their token exclusively through email to counterpartyEmail.
    try {
      await sendEscrowCounterpartyInvitation(counterpartyEmail.trim().toLowerCase(), {
        counterpartyName: counterpartyName.trim(),
        initiatorName: initiatorName.trim(),
        amountUsd: parsedAmount.toFixed(2),
        purpose,
        escrowUrl,
        counterpartyToken: counterpartyPlainToken,
      });
    } catch (emailErr) {
      console.warn('[AxiomRail Escrow] Counterparty email failed (escrow still created):', emailErr);
    }

    return res.status(201).json({
      escrowId: escrow.id,
      escrowUrl,
      initiatorToken: initiatorPlainToken,
      // counterpartyToken intentionally NOT returned — delivered exclusively to
      // counterpartyEmail so only the counterparty can perform their approval.
      amountUsd: parsedAmount.toFixed(2),
      purpose,
      releaseCondition,
      deadline: parsedDeadline?.toISOString() ?? null,
      counterpartyName: counterpartyName.trim(),
      counterpartyEmail: counterpartyEmail.trim().toLowerCase(),
      message: 'Escrow created. Your counterparty has been emailed their access token. Save your initiator token — it is shown once only.',
    });
  } catch (err) {
    console.error('[AxiomRail Escrow] Create error:', err);
    return res.status(500).json({ error: 'Failed to create escrow' });
  }
}
