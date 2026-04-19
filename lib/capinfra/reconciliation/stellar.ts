/**
 * Capital Infrastructure — Stellar reconciliation orchestrator (3B.1b).
 *
 * Replaces the Phase 3B.1a skeleton. Resolves the active STELLAR
 * adapter config and delegates to the real diff engine in stellarDiff.ts.
 * The public function signature is unchanged from the skeleton so
 * callers (operator UI, admin endpoints, smoke harness) require no
 * changes.
 *
 * The reconciliation runner is still DRY_RUN-only in this slice:
 * corrective instructions are enqueued but dispatched with the DRY_RUN
 * adapter dispatcher (no live Stellar payments are submitted).
 */

import { db } from '../../../server/db';
import { capAdapters } from '../../../shared/capInfraSchema';
import { and, eq, desc } from 'drizzle-orm';
import { STELLAR_ADAPTER_KIND } from '../adapters/stellar';
import type { StellarAdapterConfig } from '../adapters/stellar/config';
import { runStellarDiff } from './stellarDiff';
import type { StellarDiffResult } from './stellarDiff';

export interface RunStellarReconciliationInput {
  since?: Date;
  until?: Date;
  dryRun?: boolean;
  /** Actor identity to attribute this run to. Defaults to system actor. */
  triggeredBy?: string;
  /** Override for remediation ids (optional; used in smoke harness). */
  remediationAssetId?: string | null;
  remediationUserId?: string | null;
}

const DEFAULT_WINDOW_HOURS = 24;

export async function runStellarReconciliation(
  input: RunStellarReconciliationInput = {},
): Promise<StellarDiffResult> {
  const until = input.until ?? new Date();
  const since = input.since ?? new Date(until.getTime() - DEFAULT_WINDOW_HOURS * 60 * 60 * 1000);
  const triggeredBy = input.triggeredBy ?? 'operator';

  // Resolve the active Stellar adapter config.
  const [adapterRow] = await db
    .select()
    .from(capAdapters)
    .where(
      and(
        eq(capAdapters.kind, STELLAR_ADAPTER_KIND),
        eq(capAdapters.isActive, true),
      ),
    )
    .orderBy(desc(capAdapters.createdAt))
    .limit(1);

  const cfg = adapterRow?.configJson as StellarAdapterConfig | null | undefined;
  const network = cfg?.network === 'public' ? 'public' : 'testnet';
  const anchorAccount = cfg?.anchorAccount ?? '';
  const assetCode = cfg?.assetCode ?? 'AXUSD';

  return runStellarDiff({
    network,
    anchorAccount,
    assetCode,
    remediationAssetId: input.remediationAssetId ?? null,
    remediationUserId: input.remediationUserId ?? null,
    windowSince: since,
    windowUntil: until,
    triggeredBy,
    dryRun: input.dryRun !== false,
  });
}
