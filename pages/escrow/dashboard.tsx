/**
 * /escrow/dashboard
 *
 * Party-token-gated escrow dashboard. Shows all open and closed escrows
 * associated with a given party token (initiator or counterparty role).
 */

import { useState } from 'react';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law';

const NAVY = '#1e3a5f';
const MONO = 'monospace';

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  fontFamily: MONO,
  fontSize: '0.85rem',
  color: NAVY,
  background: '#fff',
  border: '1px solid #bbc8da',
  padding: '0.5rem 0.75rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: MONO,
  fontSize: '0.7rem',
  color: NAVY,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '0.35rem',
};

const primaryBtn: React.CSSProperties = {
  background: NAVY,
  color: '#fff',
  fontFamily: MONO,
  fontSize: '0.85rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  padding: '0.65rem 1.75rem',
  border: 'none',
  cursor: 'pointer',
};

const outlineBtn: React.CSSProperties = {
  ...primaryBtn,
  background: '#fff',
  color: NAVY,
  border: `1px solid ${NAVY}`,
  textDecoration: 'none',
  display: 'inline-block',
};

interface EscrowSummary {
  escrowId: string;
  role: 'initiator' | 'counterparty';
  initiatorName: string;
  counterpartyName: string;
  counterpartyEmail: string;
  amountUsd: string;
  purpose: string;
  purposeLabel: string;
  releaseCondition: string;
  deadline: string | null;
  status: string;
  initiatorApproved: boolean;
  counterpartyApproved: boolean;
  createdAt: string;
  updatedAt: string;
  releasedAt: string | null;
}

interface DashboardData {
  escrows: EscrowSummary[];
  openCount: number;
  closedCount: number;
  total: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending_funding: { bg: '#fff8e1', text: '#7d4a00', border: '#f39c12' },
  funded: { bg: '#e3f2fd', text: '#1a3a5f', border: '#42a5f5' },
  releasing: { bg: '#e8f5e9', text: '#1a4a1a', border: '#66bb6a' },
  released: { bg: '#e8f5e9', text: '#1a4a1a', border: '#43a047' },
  disputed: { bg: '#fdecea', text: '#7d1c1c', border: '#e57373' },
  cancelled: { bg: '#f5f5f5', text: '#666', border: '#bbb' },
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function EscrowRow({ escrow }: { escrow: EscrowSummary }) {
  const color = STATUS_COLORS[escrow.status] ?? STATUS_COLORS.pending_funding;
  const other = escrow.role === 'initiator' ? escrow.counterpartyName : escrow.initiatorName;

  return (
    <div style={{ border: '1px solid #dde4ee', marginBottom: '0.75rem', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: '0.8rem', color: NAVY, fontWeight: 700, marginBottom: '0.2rem' }}>
            {escrow.purposeLabel} — ${Number(escrow.amountUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontFamily: MONO, fontSize: '0.72rem', color: '#7a8fa8' }}>
            {escrow.role === 'initiator' ? 'You initiated' : 'Counterparty initiated'} · with {other}
          </div>
        </div>
        <span style={{
          background: color.bg,
          color: color.text,
          border: `1px solid ${color.border}`,
          fontFamily: MONO,
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '0.2rem 0.6rem',
          whiteSpace: 'nowrap',
        }}>
          {escrow.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: '0.65rem', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Release</div>
          <div style={{ fontFamily: MONO, fontSize: '0.78rem', color: NAVY }}>
            {escrow.releaseCondition === 'bilateral_approval' ? 'Bilateral Approval' : `Deadline: ${formatDate(escrow.deadline)}`}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: '0.65rem', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Approvals</div>
          <div style={{ fontFamily: MONO, fontSize: '0.78rem', color: NAVY }}>
            {[escrow.initiatorApproved ? '✓ Initiator' : '○ Initiator', escrow.counterpartyApproved ? '✓ Counterparty' : '○ Counterparty'].join(' · ')}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: '0.65rem', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Created</div>
          <div style={{ fontFamily: MONO, fontSize: '0.78rem', color: NAVY }}>{formatDate(escrow.createdAt)}</div>
        </div>
      </div>

      <Link
        href={`/escrow/${escrow.escrowId}`}
        style={{ fontFamily: MONO, fontSize: '0.78rem', color: NAVY, textDecoration: 'underline' }}
      >
        View escrow →
      </Link>
    </div>
  );
}

export default function EscrowDashboardPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open');

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/axiom-rail/escrow/dashboard', {
        headers: { 'X-Party-Token': token.trim() },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load dashboard.');
        return;
      }
      setData(json as DashboardData);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = data?.escrows.filter(e => {
    if (filter === 'open') return !['released', 'cancelled'].includes(e.status);
    if (filter === 'closed') return ['released', 'cancelled'].includes(e.status);
    return true;
  }) ?? [];

  return (
    <DesignLawLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ marginBottom: '0.5rem', fontFamily: MONO, fontSize: '0.7rem', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Axiom Rail / Escrow
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.6rem', color: NAVY, fontWeight: 700, margin: '0 0 0.4rem' }}>
          Escrow Dashboard
        </h1>
        <p style={{ fontFamily: MONO, fontSize: '0.82rem', color: '#4a6080', marginBottom: '2rem' }}>
          Enter your party token to view all escrows where you are a participant.
        </p>

        {!data && (
          <form onSubmit={handleLookup} style={{ marginBottom: '1.5rem' }}>
            {error && (
              <div style={{ background: '#fdecea', border: '1px solid #e57373', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                <p style={{ fontFamily: MONO, fontSize: '0.82rem', color: '#7d1c1c', margin: 0 }}>{error}</p>
              </div>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Party Token</label>
              <input
                style={inputStyle}
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                required
                placeholder="Paste your initiator or counterparty token"
                autoComplete="off"
              />
              <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#7a8fa8', marginTop: '0.35rem' }}>
                Token was issued when the escrow was created.
              </div>
            </div>
            <button type="submit" style={primaryBtn} disabled={loading}>
              {loading ? 'Loading…' : 'View Dashboard'}
            </button>
          </form>
        )}

        {data && (
          <>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', flex: 1, minWidth: 280 }}>
                {[
                  { label: 'Total', value: data.total },
                  { label: 'Open', value: data.openCount },
                  { label: 'Closed', value: data.closedCount },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#f8f9fb', border: '1px solid #dde4ee', padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontFamily: MONO, fontSize: '1.2rem', color: NAVY, fontWeight: 700 }}>{value}</div>
                    <div style={{ fontFamily: MONO, fontSize: '0.65rem', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  </div>
                ))}
              </div>
              <button
                style={{ ...outlineBtn, padding: '0.4rem 1rem', fontSize: '0.78rem' }}
                onClick={() => setData(null)}
              >
                Change Token
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0', marginBottom: '1.25rem', border: '1px solid #dde4ee' }}>
              {(['open', 'closed', 'all'] as const).map(f => (
                <button
                  key={f}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    fontFamily: MONO,
                    fontSize: '0.78rem',
                    fontWeight: filter === f ? 700 : 400,
                    background: filter === f ? NAVY : '#fff',
                    color: filter === f ? '#fff' : NAVY,
                    border: 'none',
                    borderRight: f !== 'all' ? '1px solid #dde4ee' : 'none',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                  onClick={() => setFilter(f)}
                >
                  {f === 'open' ? `Open (${data.openCount})` : f === 'closed' ? `Closed (${data.closedCount})` : `All (${data.total})`}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p style={{ fontFamily: MONO, fontSize: '0.85rem', color: '#7a8fa8' }}>No escrows in this view.</p>
            ) : (
              filtered.map(e => <EscrowRow key={e.escrowId} escrow={e} />)
            )}

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #dde4ee' }}>
              <Link href="/escrow/new" style={{ ...primaryBtn }}>Open New Escrow</Link>
            </div>
          </>
        )}
      </div>
    </DesignLawLayout>
  );
}
