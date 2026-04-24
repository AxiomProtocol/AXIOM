/**
 * /rent-collection/dashboard
 *
 * Landlord rent collection dashboard.
 * Prompts for management token (stored in sessionStorage only — never URL).
 * Fetches GET /api/axiom-rail/rent/dashboard and displays properties + payment history.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law';

const NAVY = '#1e3a5f';
const MONO = 'monospace';
const SERIF = 'Georgia, serif';

const SESSION_KEY = 'axiom_rail_rent_mgmt_token';

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

interface Payment {
  transferId: string;
  amountUsd: string;
  fee: string;
  status: string;
  transferType: string | null;
  tenantAccountName: string | null;
  submittedAt: string | null;
  initiatedAt: string;
  completedAt: string | null;
}

interface Property {
  id: string;
  slug: string;
  landlordName: string;
  propertyAddress: string;
  defaultRentAmount: string | null;
  receivingBankName: string;
  createdAt: string;
  payments: Payment[];
  totalReceived: string;
  pendingCount: number;
}

interface DashboardData {
  properties: Property[];
  propertyCount: number;
}

function statusLabel(s: string): { label: string; color: string } {
  if (s === 'completed') return { label: 'Settled', color: '#1a6b1a' };
  if (s === 'pending_user_transfer_start' || s === 'pending_anchor') return { label: 'Pending', color: '#7a5a00' };
  if (s === 'error') return { label: 'Error', color: '#cc3333' };
  return { label: s, color: '#555' };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PaymentTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return <p style={{ fontFamily: MONO, fontSize: '0.78rem', color: '#888', margin: 0 }}>No payments yet.</p>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ background: NAVY, color: '#fff' }}>
            {['Date', 'Tenant', 'Amount', 'Fee', 'Method', 'Status'].map(h => (
              <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, letterSpacing: '0.05em', fontSize: '0.7rem' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map((p, i) => {
            const { label, color } = statusLabel(p.status);
            return (
              <tr key={p.transferId} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fb', borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem 0.75rem', color: '#444' }}>{formatDate(p.submittedAt ?? p.initiatedAt)}</td>
                <td style={{ padding: '0.5rem 0.75rem', color: NAVY }}>{p.tenantAccountName ?? '—'}</td>
                <td style={{ padding: '0.5rem 0.75rem', color: NAVY, fontWeight: 700 }}>${parseFloat(p.amountUsd).toFixed(2)}</td>
                <td style={{ padding: '0.5rem 0.75rem', color: '#666' }}>${parseFloat(p.fee ?? '0').toFixed(2)}</td>
                <td style={{ padding: '0.5rem 0.75rem', color: '#444' }}>{p.transferType ?? '—'}</td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <span style={{ fontFamily: MONO, fontSize: '0.68rem', fontWeight: 700, color, border: `1px solid ${color}33`, background: `${color}11`, padding: '1px 6px' }}>
                    {label.toUpperCase()}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function RentCollectionDashboardPage() {
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  // Check sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) fetchDashboard(stored);
  }, []);

  async function fetchDashboard(mgmtToken: string) {
    setSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/axiom-rail/rent/dashboard', {
        headers: { 'X-Mgmt-Token': mgmtToken },
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json.error ?? 'Authentication failed');
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }
      setData(json as DashboardData);
      // Store in sessionStorage on success
      sessionStorage.setItem(SESSION_KEY, mgmtToken);
    } catch {
      setAuthError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleTokenSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    fetchDashboard(token.trim());
  }

  function signOut() {
    sessionStorage.removeItem(SESSION_KEY);
    setData(null);
    setToken('');
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://axiomprotocol.app';

  if (!data) {
    return (
      <DesignLawLayout>
        <div style={{ borderBottom: `2px solid ${NAVY}`, paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#888', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
            AXIOM RAIL / RENT COLLECTION
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: '1.8rem', fontWeight: 700, color: NAVY, marginBottom: '0.5rem' }}>
            Landlord Dashboard
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#444', lineHeight: 1.7, maxWidth: 520 }}>
            Enter your management token to view your properties and payment history.
            Your token is stored in this browser session only and never sent to any third party.
          </p>
        </div>

        <div style={{ maxWidth: 480 }}>
          {authError && (
            <div style={{ background: '#fff0f0', border: '1px solid #cc3333', padding: '0.9rem', marginBottom: '1.25rem' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.78rem', color: '#cc3333', margin: 0 }}>{authError}</p>
            </div>
          )}

          <form onSubmit={handleTokenSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontFamily: MONO, fontSize: '0.7rem', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                Management Token
              </label>
              <input
                type="password"
                required
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Paste your management token here"
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'LOADING...' : 'ACCESS DASHBOARD'}
            </button>
          </form>

          <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#888', marginTop: '1.25rem', lineHeight: 1.6 }}>
            Do not have a property yet?{' '}
            <Link href="/rent-collection/setup" style={{ color: NAVY }}>Set up rent collection</Link>
          </p>
        </div>
      </DesignLawLayout>
    );
  }

  return (
    <DesignLawLayout>
      <div style={{ borderBottom: `2px solid ${NAVY}`, paddingBottom: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#888', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
            AXIOM RAIL / RENT COLLECTION
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: '1.8rem', fontWeight: 700, color: NAVY, marginBottom: '0.25rem' }}>
            Landlord Dashboard
          </h1>
          <p style={{ fontFamily: MONO, fontSize: '0.75rem', color: '#666', margin: 0 }}>
            {data.propertyCount} {data.propertyCount === 1 ? 'property' : 'properties'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/rent-collection/setup" style={primaryBtn}>
            ADD PROPERTY
          </Link>
          <button onClick={signOut} style={outlineBtn}>
            SIGN OUT
          </button>
        </div>
      </div>

      {data.properties.length === 0 && (
        <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '2rem', textAlign: 'center', maxWidth: 520 }}>
          <p style={{ fontFamily: SERIF, fontSize: '1rem', color: NAVY, marginBottom: '0.5rem' }}>No properties found for this token.</p>
          <p style={{ fontSize: '0.82rem', color: '#555', marginBottom: '1.25rem' }}>Register your first property to get started.</p>
          <Link href="/rent-collection/setup" style={primaryBtn}>SET UP RENT COLLECTION</Link>
        </div>
      )}

      {data.properties.map(prop => (
        <section key={prop.id} style={{ marginBottom: '2.5rem' }}>
          <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '1.25rem', marginBottom: '1px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <p style={{ fontFamily: SERIF, fontSize: '1rem', color: NAVY, fontWeight: 700, marginBottom: '0.25rem' }}>
                  {prop.propertyAddress}
                </p>
                <p style={{ fontFamily: MONO, fontSize: '0.72rem', color: '#666', margin: 0 }}>
                  {prop.landlordName} · Receiving bank: {prop.receivingBankName}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: MONO, fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>TOTAL SETTLED</p>
                  <p style={{ fontFamily: MONO, fontSize: '1rem', color: NAVY, fontWeight: 700, margin: 0 }}>${parseFloat(prop.totalReceived).toFixed(2)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: MONO, fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>PENDING</p>
                  <p style={{ fontFamily: MONO, fontSize: '1rem', color: '#7a5a00', fontWeight: 700, margin: 0 }}>{prop.pendingCount}</p>
                </div>
              </div>
            </div>

            {/* Payment link */}
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #dde3ed' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>TENANT PAYMENT LINK</p>
              <p style={{ fontFamily: MONO, fontSize: '0.78rem', color: NAVY, wordBreak: 'break-all', margin: 0 }}>
                {baseUrl}/rent-collection/pay/{prop.slug}
              </p>
            </div>

            {prop.defaultRentAmount && (
              <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#666', marginTop: '0.5rem' }}>
                Default rent: ${parseFloat(prop.defaultRentAmount).toFixed(2)}/month
              </p>
            )}

            <button
              onClick={() => setExpandedSlug(expandedSlug === prop.slug ? null : prop.slug)}
              style={{ ...outlineBtn, fontSize: '0.72rem', padding: '0.4rem 1rem', marginTop: '0.75rem' }}
            >
              {expandedSlug === prop.slug ? 'HIDE PAYMENTS' : `VIEW ${prop.payments.length} PAYMENT${prop.payments.length !== 1 ? 'S' : ''}`}
            </button>
          </div>

          {expandedSlug === prop.slug && (
            <div style={{ border: '1px solid #dde3ed', borderTop: 'none' }}>
              <PaymentTable payments={prop.payments} />
            </div>
          )}
        </section>
      ))}
    </DesignLawLayout>
  );
}
