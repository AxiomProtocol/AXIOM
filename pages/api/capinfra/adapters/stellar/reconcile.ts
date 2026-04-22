/**
 * Capital Infrastructure — Stellar manual reconciliation runner endpoint
 * (3B.1a interface; full diff logic lands in 3B.1b).
 *
 * Admin-gated. POST runs a dry-run reconciliation pass and returns the
 * structured report. The current implementation is a typed skeleton
 * (no remote→local diff); the endpoint exists so the operator UI and
 * smoke harness can wire to a stable contract today.
 */

/**
 * Capital Infrastructure — Stellar reconciliation trigger endpoint (3B.1b).
 *
 * POST runs the real diff engine against Horizon and persists a
 * cap_reconciliation_runs row + drift rows. Returns the run id and
 * summary; callers use GET /reconciliation/runs/[id]/drift to read the
 * full drift detail.
 *
 * Still DRY_RUN-only in this slice; the adapter mode remains unchanged.
 */

import { z } from 'zod';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../lib/capinfra/auth';
import { runStellarReconciliation } from '../../../../../lib/capinfra/reconciliation/stellar';

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
      const result = await runStellarReconciliation({
        since: body.sinceIso ? new Date(body.sinceIso) : undefined,
        until: body.untilIso ? new Date(body.untilIso) : undefined,
        triggeredBy: actor,
        remediationAssetId: body.remediationAssetId ?? null,
        remediationUserId: body.remediationUserId ?? null,
        dryRun: true,
      });
      // Surface the run id prominently so callers can poll .../drift.
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
