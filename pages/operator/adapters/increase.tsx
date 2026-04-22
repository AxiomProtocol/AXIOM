import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';
import { db } from '../../../server/db';
import { capWebhookEvents, capReconciliationRuns, capReconciliationDrift } from '../../../shared/capInfraSchema';
import { desc, eq } from 'drizzle-orm';
import { achHealth } from '../../../lib/capinfra/adapters/ach';
import type { AdapterHealth } from '../../../lib/capinfra/adapters/types';

interface WebhookRow {
  id: string;
  externalEventId: string | null;
  status: string;
  signatureVerified: boolean;
  attempts: number;
  receivedAt: string;
  lastError: string | null;
}

interface ReconRun {
  id: string;
  status: string;
  comparedCount: number;
  driftCount: number;
  triggeredBy: string;
  startedAt: string | null;
  finishedAt: string | null;
}

interface DriftRow {
  id: string;
  kind: string;
  severity: string;
  externalRef: string | null;
  instructionId: string | null;
  remediation: string;
  remediationRef: string | null;
  remediationFailureJson: Record<string, unknown> | null;
}

interface Props {
  health: AdapterHealth;
  recent: WebhookRow[];
  reconRuns: ReconRun[];
  latestDrift: DriftRow[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  const [health, rows, runRows] = await Promise.all([
    achHealth(),
    db
      .select()
      .from(capWebhookEvents)
      .where(eq(capWebhookEvents.adapterKey, 'ACH'))
      .orderBy(desc(capWebhookEvents.receivedAt))
      .limit(20),
    db
      .select()
      .from(capReconciliationRuns)
      .where(eq(capReconciliationRuns.adapterKey, 'ACH'))
      .orderBy(desc(capReconciliationRuns.createdAt))
      .limit(10),
  ]);

  const latestRun = runRows[0];
  const driftRows = latestRun
    ? await db
        .select()
        .from(capReconciliationDrift)
        .where(eq(capReconciliationDrift.runId, latestRun.id))
        .limit(50)
    : [];

  return {
    props: {
      health: {
        ...health,
        lastDispatchAt: health.lastDispatchAt ? health.lastDispatchAt.toISOString() as unknown as Date : null,
        lastWebhookAt: health.lastWebhookAt ? health.lastWebhookAt.toISOString() as unknown as Date : null,
        lastWebhookVerifiedAt: health.lastWebhookVerifiedAt ? health.lastWebhookVerifiedAt.toISOString() as unknown as Date : null,
      },
      recent: rows.map((r) => ({
        id: r.id,
        externalEventId: r.externalEventId,
        status: r.status,
        signatureVerified: r.signatureVerified,
        attempts: r.attempts,
        receivedAt: r.receivedAt.toISOString(),
        lastError: r.lastError,
      })),
      reconRuns: runRows.map((r) => ({
        id: r.id,
        status: r.status,
        comparedCount: r.comparedCount,
        driftCount: r.driftCount,
        triggeredBy: r.triggeredBy,
        startedAt: r.startedAt ? r.startedAt.toISOString() : null,
        finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
      })),
      latestDrift: driftRows.map((d) => ({
        id: d.id,
        kind: d.kind,
        severity: d.severity,
        externalRef: d.externalRef,
        instructionId: d.instructionId,
        remediation: d.remediation,
        remediationRef: d.remediationRef,
        remediationFailureJson: (d.remediationFailureJson as Record<string, unknown> | null) ?? null,
      })),
    },
  };
};

const severityBadge: Record<string, string> = {
  INFORMATIONAL: 'bg-blue-50 text-blue-800 border-blue-200',
  WARNING: 'bg-amber-50 text-amber-900 border-amber-300',
  BLOCKING: 'bg-red-50 text-red-800 border-red-300',
  MANUAL_INTERVENTION: 'bg-purple-50 text-purple-800 border-purple-300',
};

export default function IncreaseAdapterPage({ health, recent, reconRuns, latestDrift }: Props) {
  const [recon, setRecon] = useState<{ runId: string; status: string; comparedCount: number; driftCount: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function runRecon() {
    setBusy(true);
    try {
      const res = await fetch('/api/capinfra/adapters/increase/reconcile', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-operator': 'operator-ui' },
        body: '{}',
      });
      setRecon(await res.json());
    } finally {
      setBusy(false);
    }
  }

  const modeBadge =
    health.mode === 'LIVE'
      ? 'bg-red-100 text-red-800 border-red-300'
      : 'bg-amber-100 text-amber-900 border-amber-300';

  return (
    <DesignLawLayout>
      <div className="py-8">
        <div className="mb-4">
          <Link href="/operator" className="text-sm underline">← Back to console</Link>
        </div>
        <div className="flex items-baseline gap-3 mb-1">
          <h1 className="text-2xl font-serif">Increase (ACH) adapter</h1>
          <span className={`text-xs uppercase tracking-wide border px-2 py-0.5 ${modeBadge}`}>{health.mode}</span>
          <span className="text-xs text-dl-muted font-mono">configVersion={health.configVersion}</span>
        </div>
        <p className="text-sm text-dl-muted mb-6">
          Phase 3B.2: ACH/wire DRY_RUN only. Verified webhooks advance settlement state via
          canonical path. Reconciliation diff runs against Increase API.
          LIVE mode is not permitted in this slice.
        </p>

        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Health detail</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-dl-muted">Reachable</dt>
              <dd className="font-mono">{health.reachable ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">Quarantined (24h)</dt>
              <dd className="font-mono">{health.quarantinedCount24h}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">Environment</dt>
              <dd className="font-mono">{String((health.details as Record<string, unknown>)?.environment ?? '—')}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">Account ID</dt>
              <dd className="font-mono">{String((health.details as Record<string, unknown>)?.accountId ?? '—')}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">Last webhook</dt>
              <dd className="font-mono text-xs break-all">{health.lastWebhookAt ? String(health.lastWebhookAt) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">Last verified</dt>
              <dd className="font-mono text-xs break-all">{health.lastWebhookVerifiedAt ? String(health.lastWebhookVerifiedAt) : '—'}</dd>
            </div>
          </dl>
          {!health.reachable && (
            <p className="mt-3 text-xs text-amber-700 border border-amber-300 bg-amber-50 px-2 py-1">
              reachable=false is expected in DRY_RUN with a synthetic sandbox account ID.
              This does not affect the public health endpoint.
            </p>
          )}
        </section>

        <section className="border border-dl-border p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-serif text-lg">Reconciliation</h2>
            <button
              onClick={runRecon}
              disabled={busy}
              className="text-xs uppercase tracking-wide border border-dl-border px-3 py-1 disabled:opacity-50"
            >
              {busy ? 'Running…' : 'Run reconciliation'}
            </button>
          </div>
          {recon && (
            <div className="mb-3 border border-dl-border p-2 font-mono text-xs">
              <span className="mr-4">runId: {recon.runId}</span>
              <span className="mr-4">status: {recon.status}</span>
              <span className="mr-4">compared: {recon.comparedCount}</span>
              <span>drift: {recon.driftCount}</span>
            </div>
          )}

          {reconRuns.length === 0 ? (
            <p className="text-sm text-dl-muted">No reconciliation runs yet.</p>
          ) : (
            <table className="w-full text-xs mb-4">
              <thead>
                <tr>
                  <th className="text-left font-mono">Run ID</th>
                  <th className="text-left font-mono">Status</th>
                  <th className="text-right font-mono">Compared</th>
                  <th className="text-right font-mono">Drift</th>
                  <th className="text-left font-mono">By</th>
                  <th className="text-left font-mono">Finished</th>
                </tr>
              </thead>
              <tbody>
                {reconRuns.map((r) => (
                  <tr key={r.id} className="border-t border-dl-border align-top">
                    <td className="font-mono text-xs break-all">{r.id}</td>
                    <td className="font-mono">{r.status}</td>
                    <td className="font-mono text-right">{r.comparedCount}</td>
                    <td className="font-mono text-right">{r.driftCount}</td>
                    <td className="font-mono">{r.triggeredBy}</td>
                    <td className="font-mono text-xs">{r.finishedAt ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {latestDrift.length > 0 && (
            <>
              <h3 className="font-serif text-sm mb-2">Latest run drift ({latestDrift.length} rows)</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left font-mono">Kind</th>
                    <th className="text-left font-mono">Severity</th>
                    <th className="text-left font-mono">External ref</th>
                    <th className="text-left font-mono">Remediation</th>
                    <th className="text-left font-mono">Ref / failure</th>
                  </tr>
                </thead>
                <tbody>
                  {latestDrift.map((d) => (
                    <tr key={d.id} className="border-t border-dl-border align-top">
                      <td className="font-mono">{d.kind}</td>
                      <td>
                        <span className={`text-[10px] border px-1 ${severityBadge[d.severity] ?? ''}`}>
                          {d.severity}
                        </span>
                      </td>
                      <td className="font-mono text-xs break-all">{d.externalRef ?? '—'}</td>
                      <td className="font-mono">{d.remediation}</td>
                      <td className="font-mono text-xs break-all">
                        {d.remediationRef ??
                          (d.remediationFailureJson
                            ? `FAILED: ${JSON.stringify(d.remediationFailureJson).slice(0, 60)}`
                            : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        <section className="border border-dl-border p-4">
          <h2 className="font-serif text-lg mb-3">Recent webhook events (last 20)</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-dl-muted">No Increase webhook events recorded yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left font-mono">Received</th>
                  <th className="text-left font-mono">Event ID</th>
                  <th className="text-left font-mono">Status</th>
                  <th className="text-left font-mono">Sig</th>
                  <th className="text-right font-mono">Attempts</th>
                  <th className="text-left font-mono">Last error</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-dl-border align-top">
                    <td className="font-mono text-xs">{r.receivedAt}</td>
                    <td className="font-mono break-all">{r.externalEventId ?? '—'}</td>
                    <td className="font-mono">{r.status}</td>
                    <td className="font-mono">{r.signatureVerified ? 'YES' : 'NO'}</td>
                    <td className="font-mono text-right">{r.attempts}</td>
                    <td className="font-mono break-all">{r.lastError ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </DesignLawLayout>
  );
}
