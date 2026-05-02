/**
 * /portfolio/real-assets — Real Assets Portfolio View
 *
 * Wallet-aware unified view of AXUSD + AXAU + KAG holdings.
 *
 * Hard rules:
 *   - Read-only. No deposits. No transfers. No swaps. No banking.
 *   - No AXAG issuance. No KAG custody. No internal ledgering.
 *   - No synthetic balances. Structured warnings on any unavailable data.
 */

import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import {
  REAL_ASSETS_DISCLOSURES,
  type RealAssetPosition,
  type RealAssetsPortfolio,
} from '../../lib/portfolio/realAssetsPortfolio';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(value: number | null): string {
  if (value === null) return '—';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(2)}%`;
}

function StatusBadge({ status }: { status: RealAssetPosition['productStatus'] }) {
  const map: Record<RealAssetPosition['productStatus'], { color: string; bg: string }> = {
    LIVE: { color: '#2d5a27', bg: '#f0f7f0' },
    EXTERNAL_SUPPORTED: { color: '#1a3a6e', bg: '#f0f4fb' },
    NOT_LIVE_NOT_ISSUED: { color: '#8b1a1a', bg: '#fff8f8' },
  };
  const { color, bg } = map[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        letterSpacing: '0.05em',
        border: `1px solid ${color}`,
        color,
        backgroundColor: bg,
      }}
    >
      {status}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; portfolio: RealAssetsPortfolio };

export default function RealAssetsPortfolioPage() {
  const [address, setAddress] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function lookup() {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setState({
        kind: 'error',
        message: 'Invalid Ethereum address. Must be 0x followed by 40 hex characters.',
      });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const res = await fetch(
        `/api/portfolio/real-assets?address=${encodeURIComponent(address)}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setState({ kind: 'ready', portfolio: json.data });
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Lookup failed',
      });
    }
  }

  return (
    <DesignLawLayout>
      <Head>
        <title>Real Assets Portfolio | Axiom Protocol</title>
        <meta
          name="description"
          content="Unified read-only portfolio view of AXUSD, AXAU, and KAG holdings. No custody. No issuance. AXAG is not live and is not issued."
        />
      </Head>

      {/* Banner */}
      <div
        style={{
          border: '1px solid #8b1a1a',
          backgroundColor: '#fff8f8',
          padding: '14px 18px',
          marginBottom: '32px',
          fontSize: '13px',
          lineHeight: '1.6',
        }}
      >
        <strong style={{ fontFamily: 'monospace', display: 'block', marginBottom: '4px', color: '#8b1a1a' }}>
          AXAG IS NOT LIVE AND IS NOT ISSUED
        </strong>
        Read-only portfolio view. No deposits, no transfers, no swaps, no banking
        rails. Axiom does not issue KAG. Axiom does not directly custody the
        underlying silver. Any redemption rights for KAG depend on KMS Labs / Kinesis terms.
      </div>

      {/* Title */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#888', marginBottom: '8px', letterSpacing: '0.08em' }}>
          REAL ASSETS PORTFOLIO — READ-ONLY
        </div>
        <h1 style={{ fontSize: '2rem', fontFamily: 'Georgia, serif', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>
          Real Assets Portfolio
        </h1>
        <p style={{ color: '#555', fontSize: '15px', maxWidth: '720px', lineHeight: '1.6' }}>
          Look up the on-chain holdings of an Ethereum-compatible wallet across
          Axiom-supported real-asset products: AXUSD (Axiom-issued stablecoin),
          AXAU (Axiom-issued gold rail), and KAG (Kinesis Silver — external).
        </p>
      </div>

      {/* Address input */}
      <section style={{ marginBottom: '36px' }}>
        <SectionHeading>Wallet Lookup</SectionHeading>
        <div
          style={{
            border: '1px solid #d8d0c0',
            backgroundColor: '#fafaf6',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#666', marginBottom: '12px', letterSpacing: '0.05em' }}>
            ENTER WALLET ADDRESS — READ-ONLY ON-CHAIN BALANCE READS
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
              placeholder="0x..."
              spellCheck={false}
              style={{
                flex: '1 1 360px',
                minWidth: '280px',
                padding: '10px 12px',
                border: '1px solid #c8c0b0',
                fontFamily: 'monospace',
                fontSize: '13px',
                background: '#fff',
              }}
            />
            <button
              onClick={lookup}
              disabled={state.kind === 'loading' || !address}
              style={{
                padding: '10px 18px',
                border: '1px solid #1a1a2e',
                background: state.kind === 'loading' ? '#888' : '#1a1a2e',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '13px',
                cursor: state.kind === 'loading' || !address ? 'not-allowed' : 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              {state.kind === 'loading' ? 'LOADING…' : 'LOOK UP PORTFOLIO'}
            </button>
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#888', lineHeight: '1.6' }}>
            Read-only. No deposits. No transfers. Axiom never holds your assets.
            Balances are read directly from public chain state via Alchemy.
          </div>
        </div>
      </section>

      {/* States */}
      {state.kind === 'idle' && (
        <section style={{ marginBottom: '48px' }}>
          <div
            style={{
              border: '1px solid #d8d0c0',
              backgroundColor: '#fafaf6',
              padding: '32px',
              textAlign: 'center',
              color: '#666',
              fontSize: '14px',
            }}
          >
            Enter a wallet address above to view its real-asset holdings.
          </div>
        </section>
      )}

      {state.kind === 'error' && (
        <section style={{ marginBottom: '48px' }}>
          <div
            style={{
              border: '1px solid #8b1a1a',
              backgroundColor: '#fff8f8',
              padding: '14px 18px',
              color: '#8b1a1a',
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          >
            {state.message}
          </div>
        </section>
      )}

      {state.kind === 'loading' && (
        <section style={{ marginBottom: '48px' }}>
          <div
            style={{
              border: '1px solid #d8d0c0',
              backgroundColor: '#fafaf6',
              padding: '32px',
              textAlign: 'center',
              color: '#666',
              fontSize: '14px',
              fontFamily: 'monospace',
            }}
          >
            Reading on-chain balances and reference prices…
          </div>
        </section>
      )}

      {state.kind === 'ready' && <PortfolioView portfolio={state.portfolio} />}

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid #d8d0c0',
          paddingTop: '20px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#888',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'space-between',
        }}
      >
        <div>Phase 1 — Read-Only Real Assets Portfolio</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a
            href="/api/portfolio/real-assets?address=0x0000000000000000000000000000000000000000"
            target="_blank"
            style={{ color: '#888' }}
          >
            /api/portfolio/real-assets
          </a>
          <span>|</span>
          <Link href="/commodities/kag" style={{ color: '#888' }}>
            /commodities/kag
          </Link>
          <span>|</span>
          <Link href="/commodities/insights" style={{ color: '#888' }}>
            /commodities/insights
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}

// ─── Portfolio view ──────────────────────────────────────────────────────────

function PortfolioView({ portfolio }: { portfolio: RealAssetsPortfolio }) {
  const noPositions = portfolio.positions.every(
    (p) => p.estimatedUsdValue === 0 || (p.rawBalance === '0' && p.estimatedUsdValue !== null),
  );

  return (
    <>
      {portfolio.warnings.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <div
            style={{
              border: '1px solid #d8c870',
              background: '#fffbf0',
              padding: '12px 14px',
              fontSize: '12px',
              color: '#7a6010',
              lineHeight: '1.6',
            }}
          >
            <strong style={{ fontFamily: 'monospace', display: 'block', marginBottom: '4px' }}>
              WARNINGS
            </strong>
            {portfolio.warnings.map((w, i) => (
              <div key={i}>• {w}</div>
            ))}
          </div>
        </section>
      )}

      {/* Totals */}
      <section style={{ marginBottom: '36px' }}>
        <SectionHeading>Portfolio Totals</SectionHeading>
        <div
          style={{
            background: '#f4f1eb',
            border: '1px solid #d8d0c0',
            padding: '18px 22px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px 24px',
          }}
        >
          <Stat label="Total real-assets value" value={formatUsd(portfolio.totals.totalUsdValue)} big />
          <Stat label="Stable value" value={formatUsd(portfolio.totals.stableUsdValue)} />
          <Stat label="Commodity value" value={formatUsd(portfolio.totals.commodityUsdValue)} />
          <Stat label="Gold value" value={formatUsd(portfolio.totals.goldUsdValue)} />
          <Stat label="Silver value" value={formatUsd(portfolio.totals.silverUsdValue)} />
          <Stat label="Axiom-issued value" value={formatUsd(portfolio.totals.axiomIssuedUsdValue)} />
          <Stat label="External value" value={formatUsd(portfolio.totals.externalUsdValue)} />
        </div>

        <div
          style={{
            marginTop: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          <SplitCard
            title="Stable vs Commodity"
            left={{ label: 'Stable', pct: portfolio.totals.commodityVsStable.stablePct }}
            right={{ label: 'Commodity', pct: portfolio.totals.commodityVsStable.commodityPct }}
          />
          <SplitCard
            title="Gold vs Silver"
            left={{ label: 'Gold', pct: portfolio.totals.goldVsSilver.goldPct }}
            right={{ label: 'Silver', pct: portfolio.totals.goldVsSilver.silverPct }}
          />
          <SplitCard
            title="Axiom-issued vs External"
            left={{ label: 'Axiom', pct: portfolio.totals.axiomVsExternal.axiomIssuedPct }}
            right={{ label: 'External', pct: portfolio.totals.axiomVsExternal.externalPct }}
          />
        </div>

        {noPositions && (
          <div
            style={{
              marginTop: '16px',
              border: '1px solid #d8d0c0',
              background: '#fafaf6',
              padding: '14px 18px',
              fontSize: '13px',
              color: '#555',
            }}
          >
            This wallet does not hold any of the supported real-asset products (AXUSD, AXAU, KAG).
          </div>
        )}
      </section>

      {/* Positions */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Positions</SectionHeading>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '760px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1a1a2e', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>Asset</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>Issuer</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>Chain</th>
                <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Quantity</th>
                <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Unit USD</th>
                <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Value (USD)</th>
                <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Allocation</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.positions.map((p) => (
                <tr key={p.symbol} style={{ borderBottom: '1px solid #e8e4dc', verticalAlign: 'top' }}>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1a1a2e' }}>{p.symbol}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{p.riskDisclosureLabel}</div>
                  </td>
                  <td style={{ padding: '12px 10px', fontSize: '13px', color: '#333' }}>
                    {p.issuer}
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {p.axiomIssued ? 'Axiom-issued' : 'External'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px', fontSize: '13px', color: '#333' }}>
                    {p.chain}
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>
                      chainId {p.chainId}
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', textAlign: 'right' }}>
                    {p.formattedBalance}
                  </td>
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', textAlign: 'right' }}>
                    {p.estimatedUnitUsd !== null
                      ? `$${p.estimatedUnitUsd.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}`
                      : '—'}
                  </td>
                  <td
                    style={{
                      padding: '12px 10px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      textAlign: 'right',
                    }}
                  >
                    {formatUsd(p.estimatedUsdValue)}
                  </td>
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', textAlign: 'right' }}>
                    {formatPct(p.allocationPct)}
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <StatusBadge status={p.productStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Disclosures */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Disclosures</SectionHeading>
        <div
          style={{
            padding: '14px 18px',
            border: '1px solid #c8d0d8',
            backgroundColor: '#f8f9fb',
            fontSize: '13px',
            lineHeight: '1.8',
            color: '#333',
          }}
        >
          {REAL_ASSETS_DISCLOSURES.map((d, i) => (
            <div key={i}>• {d}</div>
          ))}
        </div>
        <div style={{ marginTop: '12px', fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>
          As of: {portfolio.fetchedAt.slice(0, 19).replace('T', ' ')} UTC &nbsp;|&nbsp; Wallet: {portfolio.walletAddress}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888', marginBottom: '4px', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: big ? '24px' : '16px',
          fontFamily: 'monospace',
          fontWeight: 700,
          color: '#1a1a2e',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SplitCard({
  title,
  left,
  right,
}: {
  title: string;
  left: { label: string; pct: number | null };
  right: { label: string; pct: number | null };
}) {
  return (
    <div style={{ border: '1px solid #d8d0c0', background: '#fff', padding: '12px 14px' }}>
      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888', marginBottom: '8px', letterSpacing: '0.05em' }}>
        {title}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontFamily: 'monospace' }}>
        <span>
          <strong>{left.label}</strong> {formatPct(left.pct)}
        </span>
        <span>
          <strong>{right.label}</strong> {formatPct(right.pct)}
        </span>
      </div>
    </div>
  );
}
