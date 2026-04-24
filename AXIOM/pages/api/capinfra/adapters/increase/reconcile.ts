/**
 * Capital Infrastructure — ACH/Increase manual reconciliation runner (3B.2).
 *
 * Admin-gated. POST runs the real diff engine against the Increase
 * transactions API and persists a cap_reconciliation_runs row + drift rows.
 * Returns the run id and summary; callers use
 * GET /reconciliation/runs/[id]/drift to read full drift detail.
 *
 * Runs reconciliation in active mode semantics (not forced dry-run).
 */

import { z } from 'zod';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../lib/capinfra/auth';
import { runAchReconciliation } from '../../../../../lib/capinfra/reconciliation/ach';

const ZBody = z
  .object({
    sinceIso: z.string().datetime().optional(),
    untilIso: z.string().datetime().optional(),
    remediationAssetId: z.string().optional().nullable(),
    remediationUserId: z.string().optional().nullable(),
  })
  .strict()
  .partial();

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.RISK_OPERATOR,
    handler: async (req, res) => {
      const body = ZBody.parse(req.body ?? {});
      const actor = getActor(req);
      const result = await runAchReconciliation({
        since: body.sinceIso ? new Date(body.sinceIso) : undefined,
        until: body.untilIso ? new Date(body.untilIso) : undefined,
        triggeredBy: actor,
        remediationAssetId: body.remediationAssetId ?? null,
        remediationUserId: body.remediationUserId ?? null,
        dryRun: false,
      });
      res.status(200).json({
        runId: result.run.id,
        status: result.run.status,
        comparedCount: result.comparedCount,
        driftCount: result.driftCount,
        driftUrl: `/api/capinfra/reconciliation/runs/${result.run.id}/drift`,
      });
    },
  },
]);
