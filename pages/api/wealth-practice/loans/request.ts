/**
 * POST /api/wealth-practice/loans/request
 *
 * Creates a new peer loan request within a Wealth Practice group.
 * Requires SIWE session — the borrower identity is derived from the session,
 * not the request body, to prevent IDOR. In dev mode, falls back to
 * the body-supplied borrowerMemberId (marked as __dev__).
 *
 * Loan starts in 'pending' status. Use PATCH .../[id]/activate to open
 * it for pledges (or submit a pledge directly — pledge auto-activates).
 *
 * BSA identity is SHA-256 hashed before storage.
 * Bank routing/account details are AES-256-GCM encrypted at rest.
 *
 * Security:
 *  - SIWE session required (dev fallback: body-supplied borrowerMemberId)
 *  - Rate limited: 5 requests per IP per 10 minutes
 *  - CORS restricted to allowlist origins
 *  - BSA fields hashed — never stored or returned in plaintext
 *  - Bank account/routing encrypted with AES-256-GCM
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { encryptBankField } from '../../../../lib/multichain/stellar/axiom-rail/bankEncryption';
import { pool } from '../../../../server/db';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'wealth-practice/loans/request', { max: 5, windowMs: 600_000 })) return;

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ error: 'Wallet sign-in required — connect your wallet and sign in to request a loan' });
  }

  const {
    groupId,
    borrowerMemberId: bodyBorrowerId,
    requestedAmountUsd,
    purpose,
    repaymentTerms,
    interestRate,
    routingNumber,
    accountNumber,
    accountName,
    bsaLegalName,
    bsaDob,
    bsaCountry,
    bsaIdType,
    bsaIdNumber,
  } = req.body as {
    groupId?: number | string;
    borrowerMemberId?: string;
    requestedAmountUsd?: string | number;
    purpose?: string;
    repaymentTerms?: string;
    interestRate?: string | number;
    routingNumber?: string;
    accountNumber?: string;
    accountName?: string;
    bsaLegalName?: string;
    bsaDob?: string;
    bsaCountry?: string;
    bsaIdType?: string;
    bsaIdNumber?: string;
  };

  const borrowerMemberId = siweWallet === '__dev__' ? bodyBorrowerId?.trim() : siweWallet;

  if (!borrowerMemberId) {
    return res.status(400).json({ error: 'Borrower identity could not be determined from your session' });
  }

  if (siweWallet !== '__dev__' && bodyBorrowerId && bodyBorrowerId.trim().toLowerCase() !== siweWallet.toLowerCase()) {
    return res.status(403).json({ error: 'You may only request loans as your own connected wallet' });
  }

  if (!groupId) return res.status(400).json({ error: 'groupId is required' });

  const parsedAmount = parseFloat(String(requestedAmountUsd ?? '0'));
  if (isNaN(parsedAmount) || parsedAmount < 10 || parsedAmount > 50000) {
    return res.status(400).json({ error: 'requestedAmountUsd must be between $10 and $50,000' });
  }

  if (!purpose?.trim()) return res.status(400).json({ error: 'purpose is required' });
  if (!repaymentTerms?.trim()) return res.status(400).json({ error: 'repaymentTerms is required' });

  const parsedRate = parseFloat(String(interestRate ?? '0'));
  if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
    return res.status(400).json({ error: 'interestRate must be between 0 and 100' });
  }

  if (!routingNumber || !/^\d{9}$/.test(routingNumber)) {
    return res.status(400).json({ error: 'routingNumber must be exactly 9 digits' });
  }
  if (!accountNumber?.trim()) return res.status(400).json({ error: 'accountNumber is required' });
  if (!accountName?.trim()) return res.status(400).json({ error: 'accountName is required' });

  const missingBsa: string[] = [];
  if (!bsaLegalName) missingBsa.push('bsaLegalName');
  if (!bsaDob) missingBsa.push('bsaDob');
  if (!bsaCountry) missingBsa.push('bsaCountry');
  if (!bsaIdType) missingBsa.push('bsaIdType');
  if (!bsaIdNumber) missingBsa.push('bsaIdNumber');
  if (missingBsa.length > 0) return res.status(400).json({ error: `Missing identity fields: ${missingBsa.join(', ')}` });

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

  try {
    const groupResult = await pool.query(
      `SELECT id, is_active FROM susu_purpose_groups WHERE id = $1`,
      [Number(groupId)]
    );
    if (groupResult.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    if (!groupResult.rows[0].is_active) return res.status(400).json({ error: 'Group is not active' });

    if (siweWallet !== '__dev__') {
      const memberCheck = await pool.query(
        `SELECT id FROM susu_group_members WHERE group_id = $1 AND LOWER(member_address) = $2 AND status = 'active'`,
        [Number(groupId), borrowerMemberId.toLowerCase()]
      );
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You must be an active member of this group to request a loan' });
      }
    }

    const bsaHash = createHash('sha256')
      .update(`${bsaLegalName}|${bsaDob}|${bsaCountry}|${bsaIdType}|${bsaIdNumber}`)
      .digest('hex');

    const encryptedRouting = encryptBankField(routingNumber);
    const encryptedAccount = encryptBankField(accountNumber.trim());
    const encryptedName = encryptBankField(accountName.trim());

    const loanId = uuidv4();

    await pool.query(
      `INSERT INTO wealth_practice_loans (
        id, group_id, borrower_member_id, requested_amount_usd,
        funded_amount_usd, purpose, repayment_terms, interest_rate,
        status, bsa_hash,
        borrower_routing_number, borrower_account_number, borrower_account_name,
        created_at
      ) VALUES ($1,$2,$3,$4,0,$5,$6,$7,'pending',$8,$9,$10,$11,NOW())`,
      [
        loanId,
        Number(groupId),
        borrowerMemberId,
        parsedAmount.toFixed(2),
        purpose.trim(),
        repaymentTerms.trim(),
        parsedRate.toFixed(4),
        bsaHash,
        encryptedRouting,
        encryptedAccount,
        encryptedName,
      ]
    );

    return res.status(201).json({
      success: true,
      loanId,
      groupId: Number(groupId),
      borrowerMemberId,
      requestedAmountUsd: parsedAmount.toFixed(2),
      purpose: purpose.trim(),
      repaymentTerms: repaymentTerms.trim(),
      interestRate: parsedRate.toFixed(4),
      status: 'pending',
      message: 'Loan request submitted. Activate it to open for pledges.',
    });
  } catch (err) {
    console.error('[WealthPractice Loans] Request error:', err);
    return res.status(500).json({ error: 'Failed to create loan request' });
  }
}
