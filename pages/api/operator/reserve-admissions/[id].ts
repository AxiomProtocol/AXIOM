/**
 * PATCH /api/operator/reserve-admissions/[id]
 *
 * Advances a reserve_admission_log record to a new status.
 * Primary use-case: APPROVED → EXECUTED once the Governance Safe multisig
 * transaction fires on Arbitrum One.
 *
 * Auth:    operator cookie (cap_operator_key)
 * Method:  PATCH only
 * Body:    { status, governanceSafeTxHash?, operatorNotes? }
 *
 * If `governanceSafeTxHash` is provided and `ARBISCAN_API_KEY` is set,
 * the endpoint attempts an optional on-chain tx receipt verification via
 * the Arbiscan API before writing. Verification failure is NON-BLOCKING —
 * the record is still updated; the verification result is returned in the
 * response as `arbiscanVerification` so the operator can audit it.
 *
 * Allowed status transitions (any operator-authorised move is permitted;
 * invalid target statuses are rejected with 400):
 *   PROPOSED  → APPROVED | EXECUTED | SUPERSEDED
 *   APPROVED  → EXECUTED | SUPERSEDED
 *   EXECUTED  → SUPERSEDED
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../lib/db';
import { reserveAdmissionLog } from '../../../../shared/reserveAdmissionSchema';
import {
  readOperatorCookie,
  isValidOperatorKey,
} from '../../../../lib/capinfra/operatorAuth';
import { eq } from 'drizzle-orm';

// ── Auth helper ───────────────────────────────────────────────────────────────

function requireOperator(req: NextApiRequest, res: NextApiResponse): boolean {
  const provided = readOperatorCookie(req);
  if (!isValidOperatorKey(provided)) {
    res.status(401).json({ error: 'Unauthorized — operator session required' });
    return false;
  }
  return true;
}

// ── Arbiscan tx receipt verification (optional, non-blocking) ─────────────────

interface ArbiscanVerification {
  attempted: boolean;
  confirmed: boolean | null;
  rawStatus: string | null;
  error: string | null;
}

async function verifyArbiscanTx(txHash: string): Promise<ArbiscanVerification> {
  const apiKey = process.env.ARBISCAN_API_KEY;
  if (!apiKey) {
    return { attempted: false, confirmed: null, rawStatus: null, error: 'ARBISCAN_API_KEY not set — skipped' };
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return { attempted: false, confirmed: null, rawStatus: null, error: 'tx hash does not match expected 0x + 64 hex chars format — skipped' };
  }

  try {
    const url =
      `https://api.arbiscan.io/api` +
      `?module=transaction&action=gettxreceiptstatus` +
      `&txhash=${encodeURIComponent(txHash)}` +
      `&apikey=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'AxiomProtocol/reserve-admission-verifier' },
    });

    if (!res.ok) {
      return {
        attempted: true,
        confirmed: null,
        rawStatus: null,
        error: `Arbiscan returned HTTP ${res.status}`,
      };
    }

    const json = await res.json() as { status: string; message: string; result: { status: string } };

    if (json.status !== '1') {
      return {
        attempted: true,
        confirmed: false,
        rawStatus: json.result?.status ?? null,
        error: `Arbiscan API error: ${json.message ?? 'unknown'}`,
      };
    }

    // result.status === '1' means tx succeeded; '0' means failed/pending
    const txStatus = json.result?.status;
    return {
      attempted: true,
      confirmed: txStatus === '1',
      rawStatus: txStatus ?? null,
      error: txStatus === '1' ? null : 'Transaction receipt status is not success (0 or pending)',
    };
  } catch (e) {
    return {
      attempted: true,
      confirmed: null,
      rawStatus: null,
      error: `Arbiscan fetch threw: ${(e as Error).message}`,
    };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

const ALLOWED_STATUSES = ['PROPOSED', 'APPROVED', 'EXECUTED', 'SUPERSEDED'] as const;
type AllowedStatus = typeof ALLOWED_STATUSES[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireOperator(req, res)) return;

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method Not Allowed — use PATCH' });
  }

  // ── Parse and validate [id] ────────────────────────────────────────────────
  const rawId = req.query.id;
  const id = typeof rawId === 'string' ? parseInt(rawId, 10) : NaN;

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid or missing record id — must be a positive integer' });
  }

  // ── Parse and validate body ────────────────────────────────────────────────
  const { status, governanceSafeTxHash, operatorNotes } = req.body ?? {};

  if (!status || !ALLOWED_STATUSES.includes(status as AllowedStatus)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`,
    });
  }

  // Validate tx hash format if provided
  const txHash: string | null = governanceSafeTxHash?.trim() || null;
  if (txHash && !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return res.status(400).json({
      error: 'governanceSafeTxHash must be a 0x-prefixed 64-character hex string, e.g. 0xabc...123',
    });
  }

  // ── Fetch existing record ──────────────────────────────────────────────────
  try {
    const existing = await db
      .select()
      .from(reserveAdmissionLog)
      .where(eq(reserveAdmissionLog.id, id))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: `No admission record found with id ${id}` });
    }

    const record = existing[0];

    // Guard: EXECUTED records can only be moved to SUPERSEDED
    if (record.status === 'EXECUTED' && status !== 'SUPERSEDED') {
      return res.status(409).json({
        error: `Record ${id} is already EXECUTED. It can only be moved to SUPERSEDED.`,
      });
    }

    // Guard: SUPERSEDED records are terminal
    if (record.status === 'SUPERSEDED') {
      return res.status(409).json({
        error: `Record ${id} is SUPERSEDED (terminal). Create a new record instead.`,
      });
    }

    // ── Optional Arbiscan verification ───────────────────────────────────────
    let arbiscanVerification: ArbiscanVerification | null = null;
    if (status === 'EXECUTED' && txHash) {
      arbiscanVerification = await verifyArbiscanTx(txHash);
      console.log(`[ReserveAdmissions PATCH] Arbiscan verification for ${txHash}:`, arbiscanVerification);
    }

    // ── Build update payload ─────────────────────────────────────────────────
    const updateValues: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (txHash !== null) {
      updateValues.governanceSafeTxHash = txHash;
    }

    if (typeof operatorNotes === 'string' && operatorNotes.trim()) {
      const existing_notes = record.operatorNotes ?? '';
      const separator = existing_notes ? '\n---\n' : '';
      updateValues.operatorNotes = `${existing_notes}${separator}${operatorNotes.trim()}`;
    }

    // Set admittedAt if moving to EXECUTED and not already set
    if (status === 'EXECUTED' && !record.admittedAt) {
      updateValues.admittedAt = new Date();
    }

    // ── Write to DB ──────────────────────────────────────────────────────────
    const [updated] = await db
      .update(reserveAdmissionLog)
      .set(updateValues)
      .where(eq(reserveAdmissionLog.id, id))
      .returning();

    return res.status(200).json({
      record: updated,
      arbiscanVerification,
    });

  } catch (err) {
    console.error('[ReserveAdmissions PATCH] failed:', err);
    return res.status(500).json({ error: 'Failed to update admission record', message: (err as Error).message });
  }
}
