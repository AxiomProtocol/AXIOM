/**
 * POST /api/axiom-rail/payroll/batch
 *
 * DAO Contributor Payroll — batch initiation endpoint.
 *
 * Accepts a payroll run (org metadata + BSA identity + recipient list) and
 * creates one axiom_rail_payroll_run record plus one axiom_rail_payroll_recipient
 * record per contributor. Transfer records in stellar_payment_transfers are created
 * in the same DB transaction so each recipient gets a 28-char Stellar memo.
 *
 * Idempotency: keyed on SHA-256(orgName + runLabel + runDate + stellarAccount).
 * Duplicate requests within the same calendar day for the same run return the
 * original run ID with status 409.
 *
 * Security:
 *  - SEP-10 JWT required (Authorization: Bearer <token>)
 *  - Rate limited: 5 batch initiations per IP per hour
 *  - CORS restricted to known origins (allowlist)
 *  - BSA operator identity validated (same rules as SEP-31)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { verifyRailJwt, AXIOM_RAIL_DEPOSIT_ACCOUNT, AXIOM_RAIL_FEE_FIXED_USD, AXIOM_RAIL_FEE_PERCENT, AXIOM_RAIL_MIN_AMOUNT_USD, AXIOM_RAIL_MAX_AMOUNT_USD } from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { db } from '../../../../server/db';
import { axiomRailPayrollRuns, axiomRailPayrollRecipients } from '../../../../shared/payrollSchema';
import { stellarPaymentTransfers } from '../../../../shared/stellarSchema';
import { eq } from 'drizzle-orm';

interface Recipient {
  name: string;
  routingNumber: string;
  accountNumber: string;
  amountUsd: number;
  transferType?: 'ACH' | 'Wire';
}

interface BatchPayrollBody {
  orgName?: string;
  runLabel?: string;
  runDate?: string;
  stellarAccount?: string;
  bsa?: {
    legalName?: string;
    dob?: string;
    country?: string;
    idType?: string;
    idNumber?: string;
  };
  recipients?: Recipient[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'payroll/batch', { max: 5, windowMs: 3_600_000 })) return;

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { account: senderAccount, valid } = verifyRailJwt(token);
  if (!valid) return res.status(403).json({ error: 'Invalid or expired SEP-10 token' });

  const {
    orgName,
    runLabel,
    runDate,
    stellarAccount,
    bsa,
    recipients,
  } = req.body as BatchPayrollBody;

  // ── Run metadata validation ────────────────────────────────────────────────
  if (!orgName?.trim()) return res.status(400).json({ error: 'orgName is required' });
  if (!runLabel?.trim()) return res.status(400).json({ error: 'runLabel is required' });
  if (!runDate || !/^\d{4}-\d{2}-\d{2}$/.test(runDate)) {
    return res.status(400).json({ error: 'runDate must be in YYYY-MM-DD format' });
  }

  const resolvedStellarAccount = stellarAccount ?? senderAccount;

  // ── BSA operator identity validation ──────────────────────────────────────
  if (!bsa) return res.status(400).json({ error: 'bsa operator identity is required' });
  const missingBsa: string[] = [];
  if (!bsa.legalName) missingBsa.push('bsa.legalName');
  if (!bsa.dob) missingBsa.push('bsa.dob');
  if (!bsa.country) missingBsa.push('bsa.country');
  if (!bsa.idType) missingBsa.push('bsa.idType');
  if (!bsa.idNumber) missingBsa.push('bsa.idNumber');
  if (missingBsa.length > 0) {
    return res.status(400).json({ error: `Missing BSA identity fields: ${missingBsa.join(', ')}` });
  }

  const allowedIdTypes = ['ssn', 'passport'];
  if (!allowedIdTypes.includes(bsa.idType!)) {
    return res.status(400).json({ error: `bsa.idType must be one of: ${allowedIdTypes.join(', ')}` });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bsa.dob!)) {
    return res.status(400).json({ error: 'bsa.dob must be in YYYY-MM-DD format' });
  }
  if (bsa.idType === 'ssn') {
    if (!/^\d{4}$/.test(bsa.idNumber!)) {
      return res.status(400).json({ error: 'bsa.idNumber must be exactly 4 digits for SSN' });
    }
  } else {
    if (!/^[A-Z0-9]{3,20}$/i.test(bsa.idNumber!)) {
      return res.status(400).json({ error: 'bsa.idNumber must be 3–20 alphanumeric characters for passport' });
    }
  }

  // ── Recipient list validation ──────────────────────────────────────────────
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'recipients must be a non-empty array' });
  }
  if (recipients.length > 200) {
    return res.status(400).json({ error: 'Maximum 200 recipients per batch' });
  }

  const recipientErrors: string[] = [];
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    if (!r.name?.trim()) recipientErrors.push(`recipients[${i}].name is required`);
    if (!r.routingNumber || !/^\d{9}$/.test(r.routingNumber)) {
      recipientErrors.push(`recipients[${i}].routingNumber must be exactly 9 digits`);
    }
    if (!r.accountNumber?.trim()) recipientErrors.push(`recipients[${i}].accountNumber is required`);
    const amt = Number(r.amountUsd);
    if (isNaN(amt) || amt < AXIOM_RAIL_MIN_AMOUNT_USD) {
      recipientErrors.push(`recipients[${i}].amountUsd minimum is $${AXIOM_RAIL_MIN_AMOUNT_USD}`);
    }
    if (amt > AXIOM_RAIL_MAX_AMOUNT_USD) {
      recipientErrors.push(`recipients[${i}].amountUsd maximum is $${AXIOM_RAIL_MAX_AMOUNT_USD.toLocaleString()}`);
    }
  }
  if (recipientErrors.length > 0) {
    return res.status(400).json({ error: 'Recipient validation failed', details: recipientErrors });
  }

  // ── Idempotency key ────────────────────────────────────────────────────────
  const idempotencyKey = createHash('sha256')
    .update(`${orgName.trim()}|${runLabel.trim()}|${runDate}|${resolvedStellarAccount}`)
    .digest('hex');

  // Check for duplicate
  const existing = await db
    .select()
    .from(axiomRailPayrollRuns)
    .where(eq(axiomRailPayrollRuns.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing.length > 0) {
    const run = existing[0];
    const runRecipients = await db
      .select()
      .from(axiomRailPayrollRecipients)
      .where(eq(axiomRailPayrollRecipients.runId, run.id));

    return res.status(409).json({
      error: 'Duplicate payroll run — idempotency key already exists',
      runId: run.id,
      status: run.status,
      createdAt: run.createdAt,
      recipients: runRecipients.map(r => ({
        id: r.id,
        name: r.recipientName,
        amountUsd: r.amountUsd,
        memo: r.memo,
        status: r.status,
      })),
    });
  }

  // ── Compute totals ─────────────────────────────────────────────────────────
  const totalAmountUsd = recipients.reduce((sum, r) => sum + Number(r.amountUsd), 0);

  // ── Atomic DB transaction — create run + recipients + transfer records ─────
  const runId = uuidv4();
  const recipientRows: typeof axiomRailPayrollRecipients.$inferInsert[] = [];
  const transferRows: typeof stellarPaymentTransfers.$inferInsert[] = [];
  const recipientMemos: { index: number; name: string; memo: string; transferId: string; amountUsd: number; fee: number; amountOut: number }[] = [];

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const amt = Number(r.amountUsd);
    const fee = AXIOM_RAIL_FEE_FIXED_USD + amt * AXIOM_RAIL_FEE_PERCENT;
    const amountOut = Math.max(0, amt - fee);
    const txId = uuidv4();
    const memo = txId.replace(/-/g, '').slice(0, 28).toUpperCase();
    const transferType = r.transferType ?? 'ACH';

    const destinationAccount = [
      r.name,
      `Account: ${r.accountNumber}`,
      `Routing: ${r.routingNumber}`,
      transferType,
    ].join(' | ');

    transferRows.push({
      id: txId,
      axiomWalletAddress: resolvedStellarAccount.length === 56
        ? '0x0000000000000000000000000000000000000000'
        : resolvedStellarAccount,
      stellarPublicKey: resolvedStellarAccount.startsWith('G') ? resolvedStellarAccount : null,
      anchorId: 'axiom-rail',
      corridorId: 'usdc-to-usd-axiom-rail-rtp',
      sourceAmountAxusd: amt.toFixed(2),
      destinationCurrency: 'USD',
      destinationAmount: amountOut.toFixed(2),
      destinationAccount,
      feeEstimate: fee.toFixed(2),
      status: 'pending_user_transfer_start',
      sepProtocol: 'sep31',
      sep31StellarAccountId: AXIOM_RAIL_DEPOSIT_ACCOUNT,
      sep31StellarMemo: memo,
      anchorRawResponse: {
        payrollRunId: runId,
        payrollOrgName: orgName.trim(),
        payrollRunLabel: runLabel.trim(),
        bsa: {
          legalName: bsa.legalName,
          dob: bsa.dob,
          country: bsa.country,
          idType: bsa.idType,
          idNumber: bsa.idNumber,
          collectedAt: new Date().toISOString(),
        },
      },
    });

    recipientRows.push({
      runId,
      transferId: txId,
      recipientName: r.name.trim(),
      routingNumber: r.routingNumber,
      accountNumber: r.accountNumber.trim(),
      amountUsd: amt.toFixed(2),
      transferType,
      memo,
      status: 'pending',
    });

    recipientMemos.push({ index: i, name: r.name.trim(), memo, transferId: txId, amountUsd: amt, fee, amountOut });
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(axiomRailPayrollRuns).values({
        id: runId,
        stellarAccount: resolvedStellarAccount,
        orgName: orgName.trim(),
        runLabel: runLabel.trim(),
        runDate,
        bsaLegalName: bsa.legalName!,
        bsaDob: bsa.dob!,
        bsaCountry: bsa.country!,
        bsaIdType: bsa.idType!,
        bsaIdNumber: bsa.idNumber!,
        idempotencyKey,
        recipientCount: recipients.length,
        totalAmountUsd: totalAmountUsd.toFixed(2),
        status: 'pending',
      });

      await tx.insert(stellarPaymentTransfers).values(transferRows);
      await tx.insert(axiomRailPayrollRecipients).values(recipientRows);
    });
  } catch (err) {
    console.error('[AxiomRail Payroll] DB transaction error:', err);
    return res.status(500).json({ error: 'Failed to create payroll run' });
  }

  return res.status(201).json({
    runId,
    orgName: orgName.trim(),
    runLabel: runLabel.trim(),
    runDate,
    stellarDepositAccount: AXIOM_RAIL_DEPOSIT_ACCOUNT,
    status: 'pending',
    recipientCount: recipients.length,
    totalAmountUsd: totalAmountUsd.toFixed(2),
    feeFixed: AXIOM_RAIL_FEE_FIXED_USD.toFixed(2),
    feePercent: (AXIOM_RAIL_FEE_PERCENT * 100).toFixed(2),
    recipients: recipientMemos.map(r => ({
      index: r.index,
      name: r.name,
      transferId: r.transferId,
      memo: r.memo,
      amountUsd: r.amountUsd.toFixed(2),
      fee: r.fee.toFixed(2),
      amountOut: r.amountOut.toFixed(2),
    })),
  });
}
