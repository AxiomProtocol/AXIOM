/**
 * Capital Infrastructure — Reconciliation append-only store (3B.1b).
 *
 * The only module permitted to write to cap_reconciliation_runs and
 * cap_reconciliation_drift. Both tables are strictly append-only:
 *   - No row is updated after status reaches COMPLETED or FAILED.
 *   - Drift rows are never updated; remediation outcome is encoded
 *     in the original insert.
 */

import { db } from '../../../server/db';
import {
  capReconciliationRuns,
  capReconciliationDrift,
  type NewCapReconciliationRun,
  type NewCapReconciliationDrift,
  type CapReconciliationRun,
  type CapReconciliationDrift,
} from '../../../shared/capInfraSchema';
import { eq } from 'drizzle-orm';
import { generateId } from '../ids';

export type RunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export async function createRun(input: {
  adapterKey: string;
  windowSince: Date;
  windowUntil: Date;
  triggeredBy: string;
}): Promise<CapReconciliationRun> {
  const id = generateId('rr');
  const [row] = await db
    .insert(capReconciliationRuns)
    .values({
      id,
      adapterKey: input.adapterKey,
      windowSince: input.windowSince,
      windowUntil: input.windowUntil,
      triggeredBy: input.triggeredBy,
      status: 'QUEUED',
      comparedCount: 0,
      driftCount: 0,
    } satisfies NewCapReconciliationRun)
    .returning();
  return row;
}

export async function markRunStarted(runId: string): Promise<void> {
  await db
    .update(capReconciliationRuns)
    .set({ status: 'RUNNING', startedAt: new Date() })
    .where(eq(capReconciliationRuns.id, runId));
}

export async function markRunCompleted(
  runId: string,
  comparedCount: number,
  driftCount: number,
  notes?: string,
): Promise<void> {
  await db
    .update(capReconciliationRuns)
    .set({
      status: 'COMPLETED',
      comparedCount,
      driftCount,
      notes: notes ?? null,
      finishedAt: new Date(),
    })
    .where(eq(capReconciliationRuns.id, runId));
}

export async function markRunFailed(runId: string, reason: string): Promise<void> {
  await db
    .update(capReconciliationRuns)
    .set({
      status: 'FAILED',
      notes: reason,
      finishedAt: new Date(),
    })
    .where(eq(capReconciliationRuns.id, runId));
}

export interface DriftRowInput {
  runId: string;
  adapterKey: string;
  kind: string;
  severity: 'INFORMATIONAL' | 'WARNING' | 'BLOCKING' | 'MANUAL_INTERVENTION';
  externalRef?: string;
  instructionId?: string;
  detailJson?: Record<string, unknown>;
  remediation: 'NONE' | 'ALERT_RAISED' | 'ENQUEUED_INSTRUCTION' | 'SETTLED_BY_RECON';
  remediationRef?: string;
  remediationFailureJson?: Record<string, unknown>;
}

export async function appendDriftRow(input: DriftRowInput): Promise<CapReconciliationDrift> {
  const id = generateId('rd');
  const [row] = await db
    .insert(capReconciliationDrift)
    .values({
      id,
      runId: input.runId,
      adapterKey: input.adapterKey,
      kind: input.kind,
      severity: input.severity,
      externalRef: input.externalRef ?? null,
      instructionId: input.instructionId ?? null,
      detailJson: (input.detailJson ?? null) as Record<string, unknown> | null,
      remediation: input.remediation,
      remediationRef: input.remediationRef ?? null,
      remediationFailureJson: (input.remediationFailureJson ?? null) as Record<string, unknown> | null,
    } satisfies NewCapReconciliationDrift)
    .returning();
  return row;
}
