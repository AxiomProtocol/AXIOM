/**
 * GET  /api/operator/reserve-admissions
 * POST /api/operator/reserve-admissions
 *
 * Governance audit trail for AXUSD reserve asset admission decisions.
 * Each record documents one PLANNED → LIVE transition approved by governance.
 *
 * GET  — returns all admission records, optionally filtered by ?assetId=
 *         Auth: operator cookie (cap_operator_key)
 * POST — creates a new admission record
 *         Auth: operator cookie (cap_operator_key)
 *         Body: { assetId, assetSymbol, sleeve, proposalTitle, proposalDescription,
 *                 complianceResolution?, dualCountingGuardAcknowledged, governanceSafeTxHash?,
 *                 status, registryChangeSummary?, admittedAt?, operatorNotes? }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../lib/db';
import { reserveAdmissionLog } from '../../../../shared/reserveAdmissionSchema';
import {
  readOperatorCookie,
  isValidOperatorKey,
} from '../../../../lib/capinfra/operatorAuth';
import { eq, desc } from 'drizzle-orm';

function requireOperator(req: NextApiRequest, res: NextApiResponse): boolean {
  const provided = readOperatorCookie(req);
  if (!isValidOperatorKey(provided)) {
    res.status(401).json({ error: 'Unauthorized — operator session required' });
    return false;
  }
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (!requireOperator(req, res)) return;

  // ── GET — list admission records ─────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const assetId = req.query.assetId as string | undefined;

      const rows = assetId
        ? await db
            .select()
            .from(reserveAdmissionLog)
            .where(eq(reserveAdmissionLog.assetId, assetId))
            .orderBy(desc(reserveAdmissionLog.createdAt))
        : await db
            .select()
            .from(reserveAdmissionLog)
            .orderBy(desc(reserveAdmissionLog.createdAt));

      return res.status(200).json({ records: rows, count: rows.length });
    } catch (err) {
      console.error('[ReserveAdmissions] GET failed:', err);
      return res.status(500).json({ error: 'Failed to fetch admission records', message: (err as Error).message });
    }
  }

  // ── POST — create admission record ───────────────────────────────────────
  if (req.method === 'POST') {
    const {
      assetId,
      assetSymbol,
      sleeve,
      proposalTitle,
      proposalDescription,
      complianceResolution,
      dualCountingGuardAcknowledged,
      governanceSafeTxHash,
      status,
      registryChangeSummary,
      admittedAt,
      operatorNotes,
    } = req.body ?? {};

    if (!assetId || !assetSymbol || !sleeve || !proposalTitle || !proposalDescription) {
      return res.status(400).json({
        error: 'Missing required fields: assetId, assetSymbol, sleeve, proposalTitle, proposalDescription',
      });
    }

    if (dualCountingGuardAcknowledged !== true) {
      return res.status(400).json({
        error: 'dualCountingGuardAcknowledged must be true — operator must explicitly confirm the dual-counting guard',
      });
    }

    const allowedStatuses = ['PROPOSED', 'APPROVED', 'EXECUTED', 'SUPERSEDED'];
    const recordStatus: string = allowedStatuses.includes(status) ? status : 'APPROVED';

    try {
      const [inserted] = await db
        .insert(reserveAdmissionLog)
        .values({
          assetId,
          assetSymbol,
          sleeve,
          proposalTitle,
          proposalDescription,
          complianceResolution: complianceResolution ?? null,
          dualCountingGuardAcknowledged: true,
          governanceSafeTxHash: governanceSafeTxHash ?? null,
          status: recordStatus,
          registryChangeSummary: registryChangeSummary ?? null,
          admittedAt: admittedAt ? new Date(admittedAt) : null,
          operatorNotes: operatorNotes ?? null,
        })
        .returning();

      return res.status(201).json({ record: inserted });
    } catch (err) {
      console.error('[ReserveAdmissions] POST failed:', err);
      return res.status(500).json({ error: 'Failed to create admission record', message: (err as Error).message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
