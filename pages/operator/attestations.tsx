/**
 * /operator/attestations — launch-readiness attestation console.
 *
 * Shows the current state of all required key rotation attestations and
 * runbook acknowledgments. Provides a one-click form for the operator to
 * record the ADMIN_SOLVENCY_KEY rotation + custody attestation without
 * re-entering the key (auth is the existing operator cookie).
 */

import type { GetServerSideProps } from 'next';
import { useState } from 'react';
import { OperatorConsoleLayout } from '../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../lib/capinfra/operatorAuth';
import { db } from '../../server/db';
import { launchAttestations } from '../../shared/launchAttestationsSchema';
import { desc } from 'drizzle-orm';
import type { LaunchAttestation } from '../../shared/launchAttestationsSchema';

interface KeyRotationRow {
  ref: string;
  required: boolean;
  attested: boolean;
  ackedBy: string | null;
  ackedAt: string | null;
  fingerprint: string | null;
  notes: string | null;
}

interface RunbookRow {
  runbook: string;
  acked: boolean;
  ackedBy: string | null;
  ackedAt: string | null;
  hashMatchesCurrent: boolean;
}

interface Props {
  keyRotations: KeyRotationRow[];
  runbooks: RunbookRow[];
  allClear: boolean;
  fetchedAt: string;
}

const REQUIRED_KEYS = ['DEPLOYER_PRIVATE_KEY', 'ADMIN_SOLVENCY_KEY'] as const;
const REQUIRED_RUNBOOKS = [
  'docs/operator/scheduler-runbook.md',
  'docs/solvency/ame-operations-runbook.md',
] as const;

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  let rows: LaunchAttestation[] = [];
  try {
    rows = await db
      .select()
      .from(launchAttestations)
      .orderBy(desc(launchAttestations.ackedAt))
      .limit(200);
  } catch {
    rows = [];
  }

  const keyRotations: KeyRotationRow[] = REQUIRED_KEYS.map((ref) => {
    const latest = rows.find((r) => r.kind === 'key_rotation' && r.ref === ref);
    return {
      ref,
      required: true,
      attested: !!latest,
      ackedBy: latest?.ackedBy ?? null,
      ackedAt: latest?.ackedAt ? new Date(latest.ackedAt).toISOString() : null,
      fingerprint: latest?.hash ?? null,
      notes: latest?.notes ?? null,
    };
  });

  let runbooks: RunbookRow[] = [];
  try {
    const { default: fs } = await import('node:fs');
    const { default: path } = await import('node:path');
    const { createHash } = await import('node:crypto');
    runbooks = REQUIRED_RUNBOOKS.map((rb) => {
      let currentHash: string | null = null;
      try {
        const buf = fs.readFileSync(path.join(process.cwd(), rb));
        currentHash = createHash('sha256').update(buf).digest('hex');
      } catch { /* file missing */ }
      const latest = rows.find((r) => r.kind === 'runbook_ack' && r.ref === rb);
      const acked = !!latest && latest.hash === currentHash;
      return {
        runbook: rb,
        acked,
        ackedBy: latest?.ackedBy ?? null,
        ackedAt: latest?.ackedAt ? new Date(latest.ackedAt).toISOString() : null,
        hashMatchesCurrent: latest ? latest.hash === currentHash : false,
      };
    });
  } catch {
    runbooks = REQUIRED_RUNBOOKS.map((rb) => ({
      runbook: rb, acked: false, ackedBy: null, ackedAt: null, hashMatchesCurrent: false,
    }));
  }

  const allClear =
    keyRotations.every((k) => k.attested) && runbooks.every((r) => r.acked);

  return {
    props: {
      keyRotations,
      runbooks,
      allClear,
      fetchedAt: new Date().toISOString(),
    },
  };
};

function StatusChip({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block font-dl-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border ${
        ok
          ? 'border-dl-forest text-dl-forest'
          : 'border-red-600 text-red-600'
      }`}
    >
      {ok ? 'attested' : 'pending'}
    </span>
  );
}

export default function AttestationsPage({ keyRotations, runbooks, allClear, fetchedAt }: Props) {
  const [ackedBy, setAckedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const adminKeyRow = keyRotations.find((k) => k.ref === 'ADMIN_SOLVENCY_KEY');
  const alreadyAttested = adminKeyRow?.attested ?? false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ackedBy.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/operator/record-key-attestation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ackedBy: ackedBy.trim(), notes: notes.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ ok: true, message: `Attestation recorded. Fingerprint: ${data.fingerprint?.slice(0, 16)}…` });
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setResult({ ok: false, message: data.error ?? 'Unknown error' });
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OperatorConsoleLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-dl-mono text-xs uppercase tracking-widest text-dl-gold mb-1">
              Operator Console
            </p>
            <h1 className="font-dl-serif text-2xl md:text-3xl text-dl-navy">
              Launch Attestations
            </h1>
            <p className="text-sm text-dl-gray mt-1">
              Durable record of key rotations and runbook acknowledgments required before AXAU bankless launch.
            </p>
          </div>
          <span
            className={`font-dl-mono text-[10px] uppercase tracking-widest px-3 py-1 border mt-1 ${
              allClear
                ? 'border-dl-forest text-dl-forest'
                : 'border-amber-600 text-amber-600'
            }`}
          >
            {allClear ? 'All Clear' : 'Blockers Present'}
          </span>
        </div>

        <section>
          <h2 className="font-dl-serif text-lg text-dl-navy mb-3">Key Rotation Attestations</h2>
          <div className="border border-dl-rule divide-y divide-dl-rule">
            <div className="grid grid-cols-12 gap-0 bg-dl-offwhite px-4 py-2 font-dl-mono text-[10px] uppercase tracking-widest text-dl-gray">
              <span className="col-span-3">Key Ref</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2">Attested By</span>
              <span className="col-span-3">Attested At</span>
              <span className="col-span-2">Fingerprint</span>
            </div>
            {keyRotations.map((k) => (
              <div key={k.ref} className="grid grid-cols-12 gap-0 px-4 py-3 items-center hover:bg-dl-offwhite transition-colors">
                <span className="col-span-3 font-dl-mono text-xs text-dl-navy">{k.ref}</span>
                <span className="col-span-2"><StatusChip ok={k.attested} /></span>
                <span className="col-span-2 font-dl-mono text-xs text-dl-gray">{k.ackedBy ?? '—'}</span>
                <span className="col-span-3 font-dl-mono text-xs text-dl-gray">
                  {k.ackedAt ? new Date(k.ackedAt).toLocaleString() : '—'}
                </span>
                <span className="col-span-2 font-dl-mono text-[10px] text-dl-gray truncate" title={k.fingerprint ?? ''}>
                  {k.fingerprint ? `${k.fingerprint.slice(0, 12)}…` : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-dl-serif text-lg text-dl-navy mb-3">Runbook Acknowledgments</h2>
          <div className="border border-dl-rule divide-y divide-dl-rule">
            <div className="grid grid-cols-12 gap-0 bg-dl-offwhite px-4 py-2 font-dl-mono text-[10px] uppercase tracking-widest text-dl-gray">
              <span className="col-span-6">Runbook</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2">Acked By</span>
              <span className="col-span-2">Hash Match</span>
            </div>
            {runbooks.map((r) => (
              <div key={r.runbook} className="grid grid-cols-12 gap-0 px-4 py-3 items-center hover:bg-dl-offwhite transition-colors">
                <span className="col-span-6 font-dl-mono text-xs text-dl-navy break-all">{r.runbook}</span>
                <span className="col-span-2"><StatusChip ok={r.acked} /></span>
                <span className="col-span-2 font-dl-mono text-xs text-dl-gray">{r.ackedBy ?? '—'}</span>
                <span className="col-span-2 font-dl-mono text-xs text-dl-gray">
                  {r.hashMatchesCurrent ? 'yes' : r.ackedBy ? 'drift' : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {!alreadyAttested && (
          <section className="border border-dl-rule p-6">
            <h2 className="font-dl-serif text-lg text-dl-navy mb-1">
              Record ADMIN_SOLVENCY_KEY Attestation
            </h2>
            <p className="text-sm text-dl-gray mb-4">
              Submitting this form records that you hold custody of the current ADMIN_SOLVENCY_KEY. The server will fingerprint the live key — you do not re-enter it here.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block font-dl-mono text-xs uppercase tracking-widest text-dl-gray mb-1">
                  Attested By
                </label>
                <input
                  type="text"
                  value={ackedBy}
                  onChange={(e) => setAckedBy(e.target.value)}
                  placeholder="e.g. protocol-operator"
                  required
                  className="w-full border border-dl-rule px-3 py-2 font-dl-mono text-sm text-dl-navy bg-white focus:outline-none focus:border-dl-navy"
                />
              </div>
              <div>
                <label className="block font-dl-mono text-xs uppercase tracking-widest text-dl-gray mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Rotation date, reason, or custody statement"
                  className="w-full border border-dl-rule px-3 py-2 font-dl-mono text-sm text-dl-navy bg-white focus:outline-none focus:border-dl-navy"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !ackedBy.trim()}
                className="bg-dl-navy text-white font-dl-mono text-xs uppercase tracking-widest px-6 py-2.5 disabled:opacity-50 hover:bg-dl-navy/90 transition-colors"
              >
                {submitting ? 'Recording…' : 'Record Attestation'}
              </button>
              {result && (
                <p className={`font-dl-mono text-xs mt-2 ${result.ok ? 'text-dl-forest' : 'text-red-600'}`}>
                  {result.message}
                </p>
              )}
            </form>
          </section>
        )}

        {alreadyAttested && (
          <section className="border border-dl-forest p-4">
            <p className="font-dl-mono text-xs text-dl-forest uppercase tracking-widest">
              ADMIN_SOLVENCY_KEY attestation recorded — attested by {adminKeyRow?.ackedBy} at{' '}
              {adminKeyRow?.ackedAt ? new Date(adminKeyRow.ackedAt).toLocaleString() : '—'}
            </p>
            {adminKeyRow?.notes && (
              <p className="font-dl-mono text-xs text-dl-gray mt-1">{adminKeyRow.notes}</p>
            )}
          </section>
        )}

        <p className="font-dl-mono text-[10px] text-dl-gray">
          Fetched at {new Date(fetchedAt).toLocaleString()} · Readiness check: /api/operator/readiness
        </p>
      </div>
    </OperatorConsoleLayout>
  );
}
