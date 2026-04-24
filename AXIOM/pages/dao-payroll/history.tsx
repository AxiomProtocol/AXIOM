/**
 * /dao-payroll/history
 *
 * DAO Contributor Payroll — run history page.
 * Fetches payroll runs for the authenticated Stellar account (SEP-10 JWT)
 * and displays them with per-recipient status detail.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecipientSummary {
  id: string;
  name: string;
  amountUsd: string;
  transferType: string;
  memo: string | null;
  status: string;
  createdAt: string;
}

interface PayrollRun {
  id: string;
  orgName: string;
  runLabel: string;
  runDate: string;
  recipientCount: number;
  totalAmountUsd: string;
  status: string;
  createdAt: string;
  recipients: RecipientSummary[];
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function RunStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    pending:   { label: 'PENDING',   bg: '#fffbea', color: '#7a5a00' },
    completed: { label: 'COMPLETED', bg: '#f0faf0', color: '#1a6b1a' },
    failed:    { label: 'FAILED',    bg: '#fff0f0', color: '#8b1a1a' },
    processing:{ label: 'PROCESSING',bg: '#eef3ff', color: '#1e3a5f' },
  };
  const c = cfg[status] ?? { label: status.toUpperCase(), bg: '#f5f5f5', color: '#555' };
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 700,
      letterSpacing: '0.08em', padding: '2px 8px', border: `1px solid ${c.color}33`,
    }}>
      {c.label}
    </span>
  );
}

// ─── Run card ─────────────────────────────────────────────────────────────────

function RunCard({ run }: { run: PayrollRun }) {
  const [open, setOpen] = useState(false);
  const totalFee = run.recipients.reduce((s, r) => {
    const amt = parseFloat(r.amountUsd) || 0;
    return s + 0.50 + amt * 0.001;
  }, 0);
  const gross = parseFloat(run.totalAmountUsd);
  const net = Math.max(0, gross - totalFee);

  return (
    <div style={{ border: '1px solid #dde3ed', marginBottom: '1rem', background: '#fff' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}
      >
        <div>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#1e3a5f', fontWeight: 700, marginBottom: '0.2rem' }}>
            {run.orgName} — {run.runLabel}
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#888' }}>
            Pay date: {run.runDate} &nbsp;|&nbsp; Created: {new Date(run.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
          <RunStatusBadge status={run.status} />
          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#888' }}>
            {run.recipientCount} recipient{run.recipientCount !== 1 ? 's' : ''} &nbsp;|&nbsp; ${gross.toFixed(2)} gross
          </span>
        </div>
        <div style={{ width: '100%', display: 'flex', gap: '1.5rem', background: '#f8f9fb', padding: '0.5rem 0', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#888' }}>
            Run ID: <span style={{ color: '#1e3a5f' }}>{run.id}</span>
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#888' }}>
            Gross: <strong style={{ color: '#1e3a5f' }}>${gross.toFixed(2)}</strong>
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#888' }}>
            Fees: <strong style={{ color: '#7a5a00' }}>${totalFee.toFixed(2)}</strong>
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#888' }}>
            Net: <strong style={{ color: '#2d7a2d' }}>${net.toFixed(2)}</strong>
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#1e3a5f', marginLeft: 'auto', cursor: 'pointer' }}>
            {open ? '▲ COLLAPSE' : '▼ EXPAND'}
          </span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid #e8edf5', padding: '1rem 1.25rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '0.76rem' }}>
              <thead>
                <tr style={{ background: '#f0f4fa' }}>
                  {['Recipient', 'Amount', 'Type', 'Stellar Memo', 'Status', 'Created'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700, color: '#1e3a5f', letterSpacing: '0.05em', fontSize: '0.68rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {run.recipients.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fb', borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#1e3a5f', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#444' }}>${parseFloat(r.amountUsd).toFixed(2)}</td>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#444' }}>{r.transferType}</td>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#666', letterSpacing: '0.04em' }}>{r.memo ?? '—'}</td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      <RunStatusBadge status={r.status} />
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#888' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DaoPayrollHistoryPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jwtMissing, setJwtMissing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 10;

  const fetchRuns = useCallback(async (nextOffset = 0) => {
    setError(null);
    const jwt = typeof window !== 'undefined' ? localStorage.getItem('axiom_rail_jwt') : null;
    if (!jwt) {
      setJwtMissing(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/axiom-rail/payroll/runs?limit=${LIMIT}&offset=${nextOffset}`, {
        headers: { 'Authorization': `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to load payroll history');
        return;
      }
      if (nextOffset === 0) {
        setRuns(data.runs ?? []);
      } else {
        setRuns(prev => [...prev, ...(data.runs ?? [])]);
      }
      setHasMore((data.runs ?? []).length === LIMIT);
      setOffset(nextOffset + (data.runs ?? []).length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns(0);
  }, [fetchRuns]);

  return (
    <DesignLawLayout>
      <div style={{ borderBottom: '2px solid #1e3a5f', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#666', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
          AXIOM RAIL / PAYROLL MODULE
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 700, color: '#1e3a5f', lineHeight: 1.2 }}>
            Payroll History
          </h1>
          <Link href="/dao-payroll/run" style={{
            display: 'inline-block', background: '#1e3a5f', color: '#fff',
            fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700,
            padding: '0.6rem 1.5rem', textDecoration: 'none', letterSpacing: '0.04em',
          }}>
            + NEW RUN
          </Link>
        </div>
      </div>

      {jwtMissing && (
        <div style={{ background: '#fff8e1', border: '1px solid #b8860b', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#7a5a00', marginBottom: '0.5rem' }}>
            Session token not found. Authenticate via Axiom Rail to view your payroll history.
          </p>
          <Link href="/axiom-rail/deposit" style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#1e3a5f', fontWeight: 700 }}>
            AUTHENTICATE VIA AXIOM RAIL
          </Link>
        </div>
      )}

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #cc3333', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#cc3333' }}>{error}</p>
        </div>
      )}

      {loading && runs.length === 0 && (
        <p style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#888' }}>Loading payroll history...</p>
      )}

      {!loading && !jwtMissing && runs.length === 0 && !error && (
        <div style={{ border: '1px solid #dde3ed', padding: '2.5rem', textAlign: 'center', background: '#f8f9fb' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#1e3a5f', marginBottom: '0.5rem' }}>
            No payroll runs found.
          </p>
          <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '1.25rem' }}>
            Payroll runs for your Stellar account will appear here once submitted.
          </p>
          <Link href="/dao-payroll/run" style={{
            display: 'inline-block', background: '#1e3a5f', color: '#fff',
            fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700,
            padding: '0.6rem 1.5rem', textDecoration: 'none', letterSpacing: '0.04em',
          }}>
            RUN FIRST PAYROLL
          </Link>
        </div>
      )}

      {runs.map(run => <RunCard key={run.id} run={run} />)}

      {hasMore && (
        <button
          onClick={() => fetchRuns(offset)}
          disabled={loading}
          style={{
            display: 'block', width: '100%', padding: '0.75rem',
            background: 'transparent', border: '1px solid #dde3ed', cursor: 'pointer',
            fontFamily: 'monospace', fontSize: '0.78rem', color: '#1e3a5f', fontWeight: 700,
            letterSpacing: '0.06em', marginTop: '0.5rem',
          }}
        >
          {loading ? 'LOADING...' : 'LOAD MORE'}
        </button>
      )}

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e8edf5', display: 'flex', gap: '1.5rem' }}>
        <Link href="/dao-payroll" style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1e3a5f' }}>
          PAYROLL HOME
        </Link>
        <Link href="/axiom-payment-rails" style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1e3a5f' }}>
          AXIOM RAIL STATUS
        </Link>
      </div>
    </DesignLawLayout>
  );
}
