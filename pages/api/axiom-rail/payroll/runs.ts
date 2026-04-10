/**
 * GET /api/axiom-rail/payroll/runs
 *
 * Returns the list of payroll runs associated with the authenticated
 * Stellar account (from SEP-10 JWT). Supports optional ?limit= and ?offset=
 * for pagination. Maximum 50 runs per page.
 *
 * Security:
 *  - SEP-10 JWT required (Authorization: Bearer <token>)
 *  - Rate limited: 30 requests per IP per minute
 *  - CORS restricted to known origins (allowlist)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyRailJwt } from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { stripBsaFromRecord } from '../../../../lib/multichain/stellar/axiom-rail/stripBsa';
import { db } from '../../../../server/db';
import { axiomRailPayrollRuns, axiomRailPayrollRecipients } from '../../../../shared/payrollSchema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'payroll/runs', { max: 30, windowMs: 60_000 })) return;

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { account: senderAccount, valid } = verifyRailJwt(token);
  if (!valid) return res.status(403).json({ error: 'Invalid or expired SEP-10 token' });

  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string ?? '20', 10) || 20));
  const offset = Math.max(0, parseInt(req.query.offset as string ?? '0', 10) || 0);

  try {
    const runs = await db
      .select()
      .from(axiomRailPayrollRuns)
      .where(eq(axiomRailPayrollRuns.stellarAccount, senderAccount))
      .orderBy(desc(axiomRailPayrollRuns.createdAt))
      .limit(limit)
      .offset(offset);

    const runsWithRecipients = await Promise.all(
      runs.map(async (run) => {
        const recipients = await db
          .select()
          .from(axiomRailPayrollRecipients)
          .where(eq(axiomRailPayrollRecipients.runId, run.id));

        // Explicitly select only fields needed by the history UI — BSA identity
        // columns and idempotencyKey are never returned to the frontend.
        // stripBsaFromRecord is applied defensively per Task #77 contract: it
        // strips anchorRawResponse.bsa from any record that carries it. Payroll
        // run rows store BSA data as top-level columns (already excluded above),
        // so this is a no-op today but protects against schema drift.
        return stripBsaFromRecord({
          id: run.id,
          stellarAccount: run.stellarAccount,
          orgName: run.orgName,
          runLabel: run.runLabel,
          runDate: run.runDate,
          recipientCount: run.recipientCount,
          totalAmountUsd: run.totalAmountUsd,
          status: run.status,
          createdAt: run.createdAt,
          recipients: recipients.map(r => ({
            id: r.id,
            name: r.recipientName,
            amountUsd: r.amountUsd,
            transferType: r.transferType,
            memo: r.memo,
            status: r.status,
            createdAt: r.createdAt,
          })),
        });
      })
    );

    return res.status(200).json({
      runs: runsWithRecipients,
      count: runsWithRecipients.length,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[AxiomRail Payroll] Runs query error:', err);
    return res.status(500).json({ error: 'Failed to retrieve payroll runs' });
  }
}
