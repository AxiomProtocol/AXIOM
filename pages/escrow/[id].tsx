/**
 * /escrow/[id]
 *
 * Public escrow status card. Shows amount held, condition, timeline, and
 * action buttons (approve release, dispute) for party token holders.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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

const dangerBtn: React.CSSProperties = {
  ...primaryBtn,
  background: '#c0392b',
};

interface EscrowStatus {
  escrowId: string;
  initiatorName: string;
  counterpartyName: string;
  amountUsd: string;
  purpose: string;
  purposeLabel: string;
  releaseCondition: string;
  conditionLabel: string;
  deadline: string | null;
  status: string;
  initiatorApproved: boolean;
  counterpartyApproved: boolean;
  createdAt: string;
  updatedAt: string;
  releasedAt: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending_funding: { bg: '#fff8e1', text: '#7d4a00', border: '#f39c12' },
  funded: { bg: '#e3f2fd', text: '#1a3a5f', border: '#42a5f5' },
  releasing: { bg: '#e8f5e9', text: '#1a4a1a', border: '#66bb6a' },
  released: { bg: '#e8f5e9', text: '#1a4a1a', border: '#43a047' },
  disputed: { bg: '#fdecea', text: '#7d1c1c', border: '#e57373' },
  cancelled: { bg: '#f5f5f5', text: '#666', border: '#bbb' },
};

type ActiveForm = 'none' | 'approve' | 'dispute';

export default function EscrowStatusPage() {
  const router = useRouter();
  const { id } = router.query;

  const [escrow, setEscrow] = useState<EscrowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeForm, setActiveForm] = useState<ActiveForm>('none');
  const [partyToken, setPartyToken] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || !id) return;
    loadEscrow();
  }, [router.isReady, id]);

  async function loadEscrow() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/axiom-rail/escrow/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error ?? 'Failed to load escrow.');
        return;
      }
      setEscrow(data as EscrowStatus);
    } catch {
      setLoadError('Network error. Could not load escrow.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/axiom-rail/escrow/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyToken: partyToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? 'Failed to submit approval.');
        return;
      }
      setActionResult(data.message ?? 'Approval recorded.');
      setActiveForm('none');
      setPartyToken('');
      await loadEscrow();
    } catch {
      setActionError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDispute(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/axiom-rail/escrow/${id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyToken: partyToken.trim(),
          reason: disputeReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? 'Failed to record dispute.');
        return;
      }
      setActionResult(data.message ?? 'Dispute recorded.');
      setActiveForm('none');
      setPartyToken('');
      setDisputeReason('');
      await loadEscrow();
    } catch {
      setActionError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function cancelForm() {
    setActiveForm('none');
    setPartyToken('');
    setDisputeReason('');
    setActionError(null);
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const statusColor = escrow
    ? (STATUS_COLORS[escrow.status] ?? STATUS_COLORS.pending_funding)
    : STATUS_COLORS.pending_funding;
  // Actions only available when funded. Approve action is bilateral_approval only.
  const canAct = escrow && escrow.status === 'funded';
  const canApprove = canAct && escrow.releaseCondition === 'bilateral_approval';
  const canDispute = canAct;

  return (
    <DesignLawLayout>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ marginBottom: '0.5rem', fontFamily: MONO, fontSize: '0.7rem', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Axiom Rail / Escrow / Status
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.6rem', color: NAVY, fontWeight: 700, margin: '0 0 0.4rem' }}>
          Escrow Status
        </h1>

        {loading && (
          <p style={{ fontFamily: MONO, fontSize: '0.85rem', color: '#7a8fa8', marginTop: '2rem' }}>Loading escrow…</p>
        )}

        {loadError && (
          <div style={{ background: '#fdecea', border: '1px solid #e57373', padding: '1rem 1.25rem', marginTop: '1.5rem' }}>
            <p style={{ fontFamily: MONO, fontSize: '0.85rem', color: '#7d1c1c', margin: 0 }}>{loadError}</p>
          </div>
        )}

        {escrow && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <span style={{
                background: statusColor.bg,
                color: statusColor.text,
                border: `1px solid ${statusColor.border}`,
                fontFamily: MONO,
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '0.3rem 0.8rem',
              }}>
                {escrow.status.replace(/_/g, ' ')}
              </span>
              <span style={{ fontFamily: MONO, fontSize: '0.75rem', color: '#7a8fa8' }}>
                ID: {escrow.escrowId.slice(0, 8)}…
              </span>
            </div>

            {actionResult && (
              <div style={{ background: '#e8f5e9', border: '1px solid #4caf50', padding: '0.75rem 1.25rem', marginBottom: '1.25rem' }}>
                <p style={{ fontFamily: MONO, fontSize: '0.85rem', color: '#1a4a1a', margin: 0 }}>{actionResult}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Amount Held', value: `$${Number(escrow.amountUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                { label: 'Purpose', value: escrow.purposeLabel },
                { label: 'Release Condition', value: escrow.conditionLabel },
                { label: 'Initiator', value: escrow.initiatorName },
                { label: 'Counterparty', value: escrow.counterpartyName },
                { label: 'Created', value: formatDate(escrow.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#f8f9fb', border: '1px solid #dde4ee', padding: '0.75rem' }}>
                  <div style={{ fontFamily: MONO, fontSize: '0.65rem', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>{label}</div>
                  <div style={{ fontFamily: MONO, fontSize: '0.82rem', color: NAVY, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>

            {escrow.releaseCondition === 'deadline' && escrow.deadline && (
              <div style={{ background: '#fff8e1', border: '1px solid #f39c12', padding: '0.75rem 1.25rem', marginBottom: '1.25rem' }}>
                <span style={{ fontFamily: MONO, fontSize: '0.82rem', color: '#7d4a00' }}>
                  Auto-release deadline: <strong>{formatDate(escrow.deadline)}</strong>
                </span>
              </div>
            )}

            {escrow.status === 'pending_funding' && (
              <div style={{ background: '#fff8e1', border: '1px solid #f39c12', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                <p style={{ fontFamily: MONO, fontSize: '0.82rem', color: '#7d4a00', margin: 0 }}>
                  <strong>Awaiting funding confirmation.</strong> Funds must be verified as received by Axiom Rail
                  before approvals or disputes can be submitted. Funding is confirmed by the Axiom Rail settlement
                  layer upon detection of a verified inbound deposit. If you believe funds have been deposited,
                  contact Axiom Rail support with your escrow ID.
                </p>
              </div>
            )}

            {escrow.status === 'disputed' && (
              <div style={{ background: '#fdecea', border: '1px solid #e57373', padding: '0.75rem 1.25rem', marginBottom: '1.25rem' }}>
                <p style={{ fontFamily: MONO, fontSize: '0.82rem', color: '#7d1c1c', margin: 0 }}>
                  This escrow is under dispute. An administrator will review and issue a resolution.
                  No further approvals can be submitted until the dispute is resolved.
                </p>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Approval Status</div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: escrow.initiatorApproved ? '#4caf50' : '#bbb',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontFamily: MONO, fontSize: '0.82rem', color: NAVY }}>{escrow.initiatorName} (Initiator)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: escrow.counterpartyApproved ? '#4caf50' : '#bbb',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontFamily: MONO, fontSize: '0.82rem', color: NAVY }}>{escrow.counterpartyName} (Counterparty)</span>
                </div>
              </div>
            </div>

            {escrow.releasedAt && (
              <div style={{ background: '#e8f5e9', border: '1px solid #4caf50', padding: '0.75rem 1.25rem', marginBottom: '1.25rem' }}>
                <span style={{ fontFamily: MONO, fontSize: '0.82rem', color: '#1a4a1a' }}>
                  Released: {formatDate(escrow.releasedAt)}
                </span>
              </div>
            )}

            {canAct && escrow.releaseCondition === 'deadline' && activeForm === 'none' && (
              <div style={{ background: '#e3f2fd', border: '1px solid #42a5f5', padding: '0.75rem 1.25rem', marginBottom: '1.25rem' }}>
                <p style={{ fontFamily: MONO, fontSize: '0.82rem', color: '#1a3a5f', margin: 0 }}>
                  This escrow releases automatically at the deadline. If you need to dispute, use the button below.
                  Bilateral approval is not available for deadline escrows.
                </p>
              </div>
            )}

            {canAct && activeForm === 'none' && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {canApprove && (
                  <button style={primaryBtn} onClick={() => setActiveForm('approve')}>
                    Approve Release
                  </button>
                )}
                {canDispute && (
                  <button style={dangerBtn} onClick={() => setActiveForm('dispute')}>
                    Dispute
                  </button>
                )}
              </div>
            )}

            {canApprove && activeForm === 'approve' && (
              <form onSubmit={handleApprove} style={{ marginBottom: '1.5rem', background: '#f8f9fb', border: '1px solid #dde4ee', padding: '1.25rem' }}>
                <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                  Approve Release
                </div>
                {actionError && (
                  <div style={{ background: '#fdecea', border: '1px solid #e57373', padding: '0.6rem 0.9rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontFamily: MONO, fontSize: '0.82rem', color: '#7d1c1c', margin: 0 }}>{actionError}</p>
                  </div>
                )}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Your Party Token</label>
                  <input
                    style={inputStyle}
                    type="password"
                    value={partyToken}
                    onChange={e => setPartyToken(e.target.value)}
                    required
                    placeholder="Paste your party token here"
                    autoComplete="off"
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="submit" style={primaryBtn} disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Confirm Approval'}
                  </button>
                  <button type="button" style={outlineBtn} onClick={cancelForm}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {canAct && activeForm === 'dispute' && (
              <form onSubmit={handleDispute} style={{ marginBottom: '1.5rem', background: '#fff5f5', border: '1px solid #e57373', padding: '1.25rem' }}>
                <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#7d1c1c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                  Raise Dispute
                </div>
                <p style={{ fontFamily: MONO, fontSize: '0.78rem', color: '#7d1c1c', marginBottom: '0.75rem', marginTop: 0 }}>
                  Disputing will freeze this escrow. An administrator will review and issue a resolution.
                </p>
                {actionError && (
                  <div style={{ background: '#fdecea', border: '1px solid #e57373', padding: '0.6rem 0.9rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontFamily: MONO, fontSize: '0.82rem', color: '#7d1c1c', margin: 0 }}>{actionError}</p>
                  </div>
                )}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Your Party Token</label>
                  <input
                    style={inputStyle}
                    type="password"
                    value={partyToken}
                    onChange={e => setPartyToken(e.target.value)}
                    required
                    placeholder="Paste your party token here"
                    autoComplete="off"
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Reason for Dispute (optional)</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    placeholder="Describe the dispute reason…"
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="submit" style={dangerBtn} disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Confirm Dispute'}
                  </button>
                  <button type="button" style={outlineBtn} onClick={cancelForm}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {!canAct && activeForm === 'none' && (
              <p style={{ fontFamily: MONO, fontSize: '0.78rem', color: '#7a8fa8', marginBottom: '1.25rem' }}>
                {escrow.status === 'releasing' && 'Funds are being released.'}
                {escrow.status === 'released' && 'Escrow closed. Funds released.'}
                {escrow.status === 'disputed' && 'Escrow frozen — pending admin resolution.'}
                {escrow.status === 'cancelled' && 'Escrow cancelled.'}
              </p>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid #dde4ee' }}>
              <Link href="/escrow/new" style={{ ...outlineBtn }}>Open New Escrow</Link>
              <Link href="/escrow/dashboard" style={{ ...outlineBtn }}>My Dashboard</Link>
            </div>
          </>
        )}
      </div>
    </DesignLawLayout>
  );
}
