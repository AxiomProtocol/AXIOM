/**
 * /stellar-payments
 *
 * Circle USDC on Stellar — Payments Rail
 * Shows live network health, Circle anchor status, corridors, and payment initiation.
 */

import { useEffect, useState } from 'react';
import { DesignLawLayout } from '../components/design-law';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NetworkHealth {
  networkId: string;
  horizonReachable: boolean;
  latencyMs: number | null;
  currentLedger: number | null;
  currentFeeStroops: number | null;
  asOf: string;
}

interface AnchorStatus {
  anchorId: string;
  anchorName: string;
  isReachable: boolean;
  sep24Supported: boolean;
  sep31Supported: boolean;
  supportedAssets: { code: string; issuer: string | null; isNative: boolean }[];
  corridors: { from: string; to: string; currency: string }[];
  lastCheckedAt: string;
}

interface CorridorStatus {
  corridorId: string;
  sourceNetwork: string;
  destinationCurrency: string;
  destinationCountry: string;
  anchorId: string;
  status: string;
  estimatedSettlementMinutes: number | null;
  minAmountUsd: number | null;
  maxAmountUsd: number | null;
  feeEstimatePercent: number | null;
  notes: string;
}

interface HealthResponse {
  network: NetworkHealth;
  anchor: AnchorStatus;
  tomlEndpoints: {
    TRANSFER_SERVER_SEP0024?: string;
    WEB_AUTH_ENDPOINT?: string;
    SIGNING_KEY?: string;
  };
}

interface CorridorsResponse {
  corridors: CorridorStatus[];
  availableCorridors: number;
}

interface PaymentForm {
  senderWalletAddress: string;
  sourceAxusdAmount: string;
  destinationCurrency: string;
  destinationAccount: string;
  corridorId: string;
}

interface TransferResult {
  success: boolean;
  transferId: string | null;
  interactiveUrl: string | null;
  anchorTransferId: string | null;
  error: string | null;
  state: unknown;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    available:      { label: 'AVAILABLE',       bg: '#f0faf0', color: '#1a6b1a' },
    configured:     { label: 'CONFIGURED',      bg: '#eef3ff', color: '#1e3a5f' },
    pending_anchor: { label: 'ANCHOR PENDING',  bg: '#fffbea', color: '#7a5a00' },
    unavailable:    { label: 'UNAVAILABLE',     bg: '#fff0f0', color: '#8b1a1a' },
    unknown:        { label: 'UNKNOWN',         bg: '#f5f5f5', color: '#555' },
  };
  const c = cfg[status] ?? cfg.unknown;
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      fontFamily: 'monospace',
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      padding: '2px 8px',
      border: `1px solid ${c.color}33`,
    }}>
      {c.label}
    </span>
  );
}

function LiveDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: ok ? '#2d7a2d' : '#cc3333',
      marginRight: 6,
      flexShrink: 0,
    }} />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StellarPaymentsPage({ railEnabled }: { railEnabled: boolean }) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [corridors, setCorridors] = useState<CorridorsResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [corridorLoading, setCorridorLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [form, setForm] = useState<PaymentForm>({
    senderWalletAddress: '',
    sourceAxusdAmount: '',
    destinationCurrency: 'USD',
    destinationAccount: '',
    corridorId: 'axusd-to-usdc-stellar-usd',
  });
  const [submitting, setSubmitting] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stellar/health')
      .then(r => r.json())
      .then(d => setHealth(d))
      .catch(e => setHealthError(e.message))
      .finally(() => setHealthLoading(false));

    fetch('/api/stellar/corridors')
      .then(r => r.json())
      .then(d => setCorridors(d))
      .catch(() => null)
      .finally(() => setCorridorLoading(false));
  }, []);

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setTransferResult(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/stellar/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json() as TransferResult;
      setTransferResult(data);
      if (!data.success) setFormError(data.error ?? 'Payment initiation failed.');
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const nav = health?.network;
  const anchor = health?.anchor;
  const toml = health?.tomlEndpoints;

  return (
    <DesignLawLayout>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '2px solid #1e3a5f', paddingBottom: '2rem', marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#666', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
          LAYER 00 EXTENSION / PAYMENTS RAIL
        </p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2.2rem', fontWeight: 700, color: '#1e3a5f', marginBottom: '1rem', lineHeight: 1.2 }}>
          Stellar Payments Rail
        </h1>
        <p style={{ color: '#444', maxWidth: 640, lineHeight: 1.7, marginBottom: '1rem' }}>
          AXUSD-denominated payments routed through Circle's USDC anchor on the Stellar network.
          Converts AXUSD to USDC and delivers via Circle's SEP-24 interactive withdrawal protocol.
          Settlement on Stellar typically completes in under 5 seconds.
        </p>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#555' }}>
            Anchor: <strong style={{ color: '#1e3a5f' }}>Circle (USDC on Stellar)</strong>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#555' }}>
            Protocol: <strong style={{ color: '#1e3a5f' }}>SEP-0010 + SEP-0024</strong>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#555' }}>
            Network: <strong style={{ color: '#1e3a5f' }}>Stellar Mainnet</strong>
          </div>
        </div>
      </div>

      {/* ── Network Health ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#1e3a5f', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          Network Status
        </h2>
        {healthLoading ? (
          <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#888' }}>Querying Stellar Horizon...</p>
        ) : healthError ? (
          <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#cc3333' }}>Health check failed: {healthError}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1px', background: '#ddd' }}>
            {[
              {
                label: 'Horizon API',
                value: nav?.horizonReachable ? 'REACHABLE' : 'UNREACHABLE',
                ok: nav?.horizonReachable ?? false,
                mono: true,
              },
              {
                label: 'Current Ledger',
                value: nav?.currentLedger?.toLocaleString() ?? '—',
                ok: !!nav?.currentLedger,
                mono: true,
              },
              {
                label: 'Latency',
                value: nav?.latencyMs != null ? `${nav.latencyMs}ms` : '—',
                ok: (nav?.latencyMs ?? 9999) < 2000,
                mono: true,
              },
              {
                label: 'Circle Anchor',
                value: anchor?.isReachable ? 'REACHABLE' : 'UNREACHABLE',
                ok: anchor?.isReachable ?? false,
                mono: true,
              },
              {
                label: 'SEP-24',
                value: toml?.TRANSFER_SERVER_SEP0024 ? 'ENDPOINT FOUND' : 'NOT FOUND',
                ok: !!toml?.TRANSFER_SERVER_SEP0024,
                mono: true,
              },
              {
                label: 'SEP-10 Auth',
                value: toml?.WEB_AUTH_ENDPOINT ? 'ENDPOINT FOUND' : 'NOT FOUND',
                ok: !!toml?.WEB_AUTH_ENDPOINT,
                mono: true,
              },
            ].map(item => (
              <div key={item.label} style={{ background: '#fff', padding: '1rem 1.25rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
                  {item.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <LiveDot ok={item.ok} />
                  <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: '#1e3a5f' }}>
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Circle Anchor ──────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#1e3a5f', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          Circle Anchor — USDC on Stellar
        </h2>
        <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div>
              <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>USDC ISSUER (STELLAR MAINNET)</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#1e3a5f', wordBreak: 'break-all' }}>
                GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
              </p>
            </div>
            <div>
              <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>HOME DOMAIN</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1e3a5f' }}>centre.io</p>
            </div>
            <div>
              <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>SEP-24 TRANSFER SERVER</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: toml?.TRANSFER_SERVER_SEP0024 ? '#1e3a5f' : '#cc3333', wordBreak: 'break-all' }}>
                {toml?.TRANSFER_SERVER_SEP0024 ?? (healthLoading ? 'Loading...' : 'Not found in stellar.toml')}
              </p>
            </div>
            <div>
              <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>WEB AUTH ENDPOINT (SEP-10)</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: toml?.WEB_AUTH_ENDPOINT ? '#1e3a5f' : '#cc3333', wordBreak: 'break-all' }}>
                {toml?.WEB_AUTH_ENDPOINT ?? (healthLoading ? 'Loading...' : 'Not found in stellar.toml')}
              </p>
            </div>
          </div>
          {anchor && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #dde3ed' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>SUPPORTED ASSETS</p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {anchor.supportedAssets.length > 0 ? anchor.supportedAssets.map((a, i) => (
                  <span key={i} style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: '#eef3ff', color: '#1e3a5f', padding: '2px 10px', border: '1px solid #c7d5eb' }}>
                    {a.code}
                  </span>
                )) : (
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#888' }}>
                    {healthLoading ? 'Loading...' : 'USDC (default)'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Corridors ──────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#1e3a5f', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          Payment Corridors
        </h2>
        {corridorLoading ? (
          <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#888' }}>Loading corridors...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                  {['Route', 'Anchor', 'Settlement', 'Min', 'Max', 'Fee Est.', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 0.9rem', textAlign: 'left', fontWeight: 600, letterSpacing: '0.06em', fontSize: '0.72rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(corridors?.corridors ?? []).map((c, i) => (
                  <tr key={c.corridorId} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fb', borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.65rem 0.9rem', color: '#1e3a5f', fontWeight: 600 }}>
                      AXUSD → {c.destinationCurrency}
                      <span style={{ display: 'block', fontSize: '0.68rem', color: '#888', fontWeight: 400, marginTop: 2 }}>{c.destinationCountry}</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.9rem', color: '#444' }}>
                      {c.anchorId === 'circle-stellar' ? 'Circle' : c.anchorId}
                    </td>
                    <td style={{ padding: '0.65rem 0.9rem', color: '#444' }}>
                      {c.estimatedSettlementMinutes != null ? `~${c.estimatedSettlementMinutes}min` : '—'}
                    </td>
                    <td style={{ padding: '0.65rem 0.9rem', color: '#444' }}>
                      {c.minAmountUsd != null ? `$${c.minAmountUsd}` : '—'}
                    </td>
                    <td style={{ padding: '0.65rem 0.9rem', color: '#444' }}>
                      {c.maxAmountUsd != null ? `$${c.maxAmountUsd.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '0.65rem 0.9rem', color: '#444' }}>
                      {c.feeEstimatePercent != null ? `${c.feeEstimatePercent}%` : '—'}
                    </td>
                    <td style={{ padding: '0.65rem 0.9rem' }}>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── SEP Protocol Stack ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#1e3a5f', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          Protocol Stack
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1px', background: '#ddd' }}>
          {[
            {
              protocol: 'SEP-0010',
              label: 'Stellar Web Authentication',
              status: 'IMPLEMENTED',
              ok: true,
              desc: 'Challenge/sign/verify flow. Ephemeral keypairs generated server-side per payment session.',
            },
            {
              protocol: 'SEP-0024',
              label: 'Interactive Anchor',
              status: 'IMPLEMENTED',
              ok: true,
              desc: "Circle's interactive withdrawal UI. User completes bank/account details via Circle's hosted flow.",
            },
            {
              protocol: 'SEP-0031',
              label: 'Cross-Border Payments',
              status: 'REVIEWED',
              ok: false,
              desc: 'Not supported by Circle. Reserved for Bitso/MoneyGram expansion (MXN/BRL corridors).',
            },
            {
              protocol: 'SEP-0038',
              label: 'Anchor RFQ',
              status: 'REVIEWED',
              ok: false,
              desc: 'Price quote protocol. Circle anchor endpoint parsed from stellar.toml. Not yet wired in flow.',
            },
          ].map(p => (
            <div key={p.protocol} style={{ background: '#fff', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: '#1e3a5f' }}>{p.protocol}</span>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  background: p.ok ? '#f0faf0' : '#f5f5f5',
                  color: p.ok ? '#1a6b1a' : '#666',
                  border: `1px solid ${p.ok ? '#1a6b1a33' : '#ccc'}`,
                  letterSpacing: '0.06em',
                }}>
                  {p.status}
                </span>
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.85rem', color: '#333', marginBottom: '0.4rem' }}>{p.label}</p>
              <p style={{ fontSize: '0.78rem', color: '#666', lineHeight: 1.5 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Payment Initiation ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#1e3a5f', marginBottom: '0.5rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          Initiate Payment
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Generates a Circle SEP-24 interactive withdrawal URL. You will be redirected to Circle's hosted UI
          to complete destination details (bank account, recipient information). Transfer is tracked internally.
        </p>

        {railEnabled ? (
          <>
            {transferResult?.success && transferResult.interactiveUrl ? (
          <div style={{ background: '#f0faf0', border: '1px solid #2d7a2d', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#1a5c1a', fontWeight: 700, marginBottom: '0.75rem' }}>
              Payment session created. Complete at Circle.
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#555', marginBottom: '0.5rem' }}>
              Transfer ID: {transferResult.transferId}
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
              Anchor Transfer ID: {transferResult.anchorTransferId}
            </p>
            <a
              href={transferResult.interactiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: '#1e3a5f',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '0.6rem 1.5rem',
                textDecoration: 'none',
                letterSpacing: '0.04em',
              }}
            >
              OPEN CIRCLE WITHDRAWAL FLOW →
            </a>
            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#666' }}>
              After completing the Circle flow, check transfer status at{' '}
              <code style={{ fontFamily: 'monospace', background: '#e8f0e8', padding: '1px 4px' }}>
                /api/stellar/payment/{transferResult.transferId}
              </code>
            </p>
          </div>
        ) : null}

        {formError && (
          <div style={{ background: '#fff0f0', border: '1px solid #cc3333', padding: '1rem', marginBottom: '1.5rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#cc3333' }}>{formError}</p>
          </div>
        )}

        <form onSubmit={handlePaymentSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.72rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
              SENDER WALLET ADDRESS (EVM)
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={form.senderWalletAddress}
              onChange={e => setForm(f => ({ ...f, senderWalletAddress: e.target.value }))}
              required
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                padding: '0.6rem 0.75rem',
                border: '1px solid #ccc',
                background: '#fff',
                color: '#1e3a5f',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.72rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
              AMOUNT (AXUSD)
            </label>
            <input
              type="number"
              min="1"
              max="100000"
              step="0.01"
              placeholder="100.00"
              value={form.sourceAxusdAmount}
              onChange={e => setForm(f => ({ ...f, sourceAxusdAmount: e.target.value }))}
              required
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                padding: '0.6rem 0.75rem',
                border: '1px solid #ccc',
                background: '#fff',
                color: '#1e3a5f',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.72rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
              CORRIDOR
            </label>
            <select
              value={form.corridorId}
              onChange={e => {
                const cid = e.target.value;
                const destCurrency = cid.includes('global') ? 'USDC' : cid.includes('mxn') ? 'MXN' : 'USD';
                setForm(f => ({ ...f, corridorId: cid, destinationCurrency: destCurrency }));
              }}
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.82rem',
                padding: '0.6rem 0.75rem',
                border: '1px solid #ccc',
                background: '#fff',
                color: '#1e3a5f',
                boxSizing: 'border-box',
              }}
            >
              <option value="axusd-to-usdc-stellar-usd">AXUSD → USDC → USD Payout (Circle)</option>
              <option value="axusd-to-usdc-stellar-global">AXUSD → USDC → Global USDC (Circle)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.72rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
              DESTINATION CURRENCY
            </label>
            <input
              type="text"
              value={form.destinationCurrency}
              readOnly
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                padding: '0.6rem 0.75rem',
                border: '1px solid #ccc',
                background: '#f5f5f5',
                color: '#888',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.72rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
              DESTINATION ACCOUNT / MEMO
            </label>
            <input
              type="text"
              placeholder="Stellar address, bank account ref, or payment identifier"
              value={form.destinationAccount}
              onChange={e => setForm(f => ({ ...f, destinationAccount: e.target.value }))}
              required
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                padding: '0.6rem 0.75rem',
                border: '1px solid #ccc',
                background: '#fff',
                color: '#1e3a5f',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: submitting ? '#999' : '#1e3a5f',
                color: '#fff',
                border: 'none',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                fontWeight: 700,
                padding: '0.7rem 2rem',
                letterSpacing: '0.06em',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'INITIATING...' : 'INITIATE PAYMENT →'}
            </button>
            <p style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.5 }}>
              You will be redirected to Circle&#39;s hosted UI to complete the withdrawal.
              This action does not move funds — Circle initiates the transfer after you complete their flow.
            </p>
          </div>
        </form>
          </>
        ) : (
          <div style={{ background: '#f8f9fb', border: '1px solid #b8860b', padding: '1.5rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#b8860b', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              STATUS: CONFIGURED — NOT YET ACTIVATED
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', color: '#1e3a5f', marginBottom: '0.75rem' }}>
              The Stellar payments rail is fully configured and integrated with Circle USDC on Stellar.
              Payment initiation is not available until the rail is activated by the operations team.
            </p>
            <p style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.6 }}>
              Network health and corridor data above reflect the live Stellar Horizon network.
              Transfer initiation requires activation of the{' '}
              <code style={{ fontFamily: 'monospace', background: '#eef0f4', padding: '1px 4px' }}>ENABLE_STELLAR_PAYMENTS_RAIL</code>{' '}
              flag by the operations team.
            </p>
          </div>
        )}
      </section>

      {/* ── Architecture note ──────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#1e3a5f', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          How It Works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', background: '#ddd' }}>
          {[
            { step: '01', label: 'AXUSD on Arbitrum', desc: 'User holds AXUSD in their Arbitrum wallet. Swaps to USDC via the protocol DEX or PSM.' },
            { step: '02', label: 'SEP-10 Auth', desc: "Axiom generates a Stellar keypair for this session. Signs Circle's authentication challenge server-side." },
            { step: '03', label: 'SEP-24 Initiation', desc: "Axiom posts to Circle's interactive withdrawal endpoint. Circle returns a hosted URL and transfer ID." },
            { step: '04', label: 'User Completes Flow', desc: "User is redirected to Circle's hosted UI to provide destination bank, account, and compliance details." },
            { step: '05', label: 'Stellar Settlement', desc: 'Circle receives USDC on Stellar, settles to destination account. Axiom polls transfer status via SEP-24.' },
            { step: '06', label: 'Transfer Confirmed', desc: 'Stellar transaction hash recorded. Axiom DB updated. Transfer marked completed.' },
          ].map(s => (
            <div key={s.step} style={{ background: '#fff', padding: '1.25rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: '#e0e8f0', marginBottom: '0.5rem' }}>{s.step}</div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#1e3a5f', fontWeight: 600, marginBottom: '0.4rem' }}>{s.label}</p>
              <p style={{ fontSize: '0.78rem', color: '#666', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Disclosure ─────────────────────────────────────────────────────── */}
      <section style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '1.25rem', marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>DISCLOSURE</p>
        <p style={{ fontSize: '0.78rem', color: '#666', lineHeight: 1.6 }}>
          Stellar Payments Rail is a configured integration. Circle SEP-24 flow requires Circle anchor activation for live fund movement.
          Payments are denominated in AXUSD and converted to USDC at the point of transfer.
          Settlement times are estimates based on Stellar network performance and Circle anchor processing.
          This is not a custodial service. Axiom does not hold user funds in transit.
          Review the{' '}
          <a href="/disclosure" style={{ color: '#1e3a5f' }}>Disclosure</a> and{' '}
          <a href="/solvency" style={{ color: '#1e3a5f' }}>Solvency Console</a> before transacting.
        </p>
      </section>
    </DesignLawLayout>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      railEnabled: process.env.ENABLE_STELLAR_PAYMENTS_RAIL === 'true',
    },
  };
}
