/**
 * /commodities/insights — Commodity Insights Layer
 *
 * Reference-only commodity intelligence: gold spot, silver spot, gold/silver
 * ratio, AXAU implied USD, KAG implied USD, AXAG status, and optional
 * wallet-context concentration analysis when an address is provided.
 *
 * Hard rules:
 *   - Reference only. No buy/sell recommendations. No yield claims.
 *   - No automated rebalancing. No financial advice.
 *   - AXAG is NOT LIVE and NOT ISSUED.
 */

import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { PageVisualSuite } from '../../components/visual';
import {
  getCommodityInsights,
  type CommodityInsights,
  type RiskLabel,
} from '../../lib/commodities/insightsService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(value: number | null, opts?: { fraction?: number }): string {
  if (value === null) return '—';
  const frac = opts?.fraction ?? 2;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

function RiskBadge({ label }: { label: RiskLabel }) {
  const map: Record<RiskLabel, { color: string; bg: string }> = {
    HEALTHY: { color: '#2d5a27', bg: '#f0f7f0' },
    WATCH: { color: '#7a6010', bg: '#fffbf0' },
    DEGRADED: { color: '#a04020', bg: '#fff4ef' },
    CRITICAL: { color: '#8b1a1a', bg: '#fff8f8' },
  };
  const { color, bg } = map[label];
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
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: CommodityInsights['axau']['productStatus'] }) {
  const map: Record<typeof status, { color: string; bg: string }> = {
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

interface PageProps {
  initialInsights: CommodityInsights;
}

export default function CommodityInsightsPage({ initialInsights }: PageProps) {
  const [insights, setInsights] = useState<CommodityInsights>(initialInsights);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshWithWallet() {
    setError(null);
    if (address && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError('Invalid Ethereum address. Must be 0x followed by 40 hex characters.');
      return;
    }
    setLoading(true);
    try {
      const url = address
        ? `/api/commodities/insights?address=${encodeURIComponent(address)}`
        : `/api/commodities/insights`;
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setInsights(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DesignLawLayout>
      <PageVisualSuite preset="commodities-insights" />
      <Head>
        <title>Commodity Insights | Axiom Protocol</title>
        <meta
          name="description"
          content="Reference-only commodity intelligence: gold spot, silver spot, gold/silver ratio, AXAU and KAG implied USD values. AXAG is not live and is not issued."
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
          REFERENCE ONLY — AXAG IS NOT LIVE AND IS NOT ISSUED
        </strong>
        This page provides reference commodity prices and product comparisons.
        It does not constitute trading, investment, or rebalancing advice. No
        buy/sell recommendations are made. No yield is offered or implied.
      </div>

      {/* Title */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#888', marginBottom: '8px', letterSpacing: '0.08em' }}>
          COMMODITY INSIGHTS LAYER — REFERENCE ONLY
        </div>
        <h1 style={{ fontSize: '2rem', fontFamily: 'Georgia, serif', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>
          Commodity Insights
        </h1>
        <p style={{ color: '#555', fontSize: '15px', maxWidth: '720px', lineHeight: '1.6' }}>
          Gold and silver reference prices, gold/silver ratio, and product
          maturity comparison across AXAU (Axiom-issued gold rail), KAG
          (Kinesis Silver — external), and AXAG (not live, not issued).
        </p>
      </div>

      {/* Core metrics */}
      <section style={{ marginBottom: '36px' }}>
        <SectionHeading>Core Metrics</SectionHeading>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          <MetricCard
            title="Gold spot"
            value={formatUsd(insights.goldSpot.usdPerTroyOz, { fraction: 2 })}
            unit="USD per troy oz"
            source={insights.goldSpot.source}
            error={insights.goldSpot.error}
          />
          <MetricCard
            title="Silver spot"
            value={formatUsd(insights.silverSpot.usdPerTroyOz, { fraction: 3 })}
            unit="USD per troy oz"
            source={insights.silverSpot.source}
            error={insights.silverSpot.error}
            secondary={
              insights.silverSpot.usdPerGram !== null
                ? `${formatUsd(insights.silverSpot.usdPerGram, { fraction: 4 })} / gram`
                : undefined
            }
          />
          <MetricCard
            title="Gold / Silver ratio"
            value={insights.goldSilverRatio.value !== null ? `${insights.goldSilverRatio.value.toFixed(1)} : 1` : '—'}
            unit="reference only"
            source="derived (gold ÷ silver, per troy oz)"
            error={insights.goldSilverRatio.value === null ? insights.goldSilverRatio.note : undefined}
          />
          <MetricCard
            title="AXAU implied USD"
            value={formatUsd(insights.axau.impliedUsdPerToken, { fraction: 2 })}
            unit="reference USD per AXAU token"
            source={insights.axau.source}
            error={insights.axau.error}
          />
          <MetricCard
            title="KAG implied USD"
            value={formatUsd(insights.kag.impliedUsdPerToken, { fraction: 4 })}
            unit="USD per gram (= USD per KAG)"
            source={insights.kag.source}
            error={insights.kag.error}
          />
          <MetricCard
            title="Oracle health"
            value={insights.oracleHealth.label}
            unit={insights.oracleHealth.note}
            source="reference price availability"
          />
        </div>
      </section>

      {/* Product maturity */}
      <section style={{ marginBottom: '36px' }}>
        <SectionHeading>Product Maturity Comparison</SectionHeading>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #1a1a2e', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', fontWeight: 700, width: '90px' }}>Symbol</th>
              <th style={{ padding: '8px 10px', fontWeight: 700, width: '180px' }}>Status</th>
              <th style={{ padding: '8px 10px', fontWeight: 700 }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {([insights.axau, insights.kag, insights.axag] as const).map((a) => (
              <tr key={a.symbol} style={{ borderBottom: '1px solid #e8e4dc' }}>
                <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 700 }}>{a.symbol}</td>
                <td style={{ padding: '10px' }}>
                  <StatusBadge status={a.productStatus} />
                </td>
                <td style={{ padding: '10px', color: '#333', lineHeight: '1.6' }}>{a.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Comparison summary */}
      <section style={{ marginBottom: '36px' }}>
        <SectionHeading>AXAU vs KAG — Comparison Summary</SectionHeading>
        <div
          style={{
            padding: '14px 18px',
            border: '1px solid #c8d8c8',
            backgroundColor: '#f8fbf8',
            fontSize: '13px',
            lineHeight: '1.7',
            color: '#333',
          }}
        >
          <p style={{ margin: '0 0 10px' }}>{insights.comparison.summary}</p>
          <p style={{ margin: 0 }}>{insights.comparison.axauVsKag}</p>
        </div>
      </section>

      {/* Wallet context */}
      <section style={{ marginBottom: '36px' }}>
        <SectionHeading>Portfolio Context (Optional)</SectionHeading>
        <div
          style={{
            border: '1px solid #d8d0c0',
            backgroundColor: '#fafaf6',
            padding: '20px',
            marginBottom: '12px',
          }}
        >
          <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#666', marginBottom: '12px', letterSpacing: '0.05em' }}>
            ADD A WALLET ADDRESS FOR CONCENTRATION ANALYSIS — READ-ONLY
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
              placeholder="0x... (optional)"
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
              onClick={refreshWithWallet}
              disabled={loading}
              style={{
                padding: '10px 18px',
                border: '1px solid #1a1a2e',
                background: loading ? '#888' : '#1a1a2e',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              {loading ? 'LOADING…' : 'REFRESH WITH WALLET'}
            </button>
          </div>
          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                border: '1px solid #8b1a1a',
                background: '#fff8f8',
                color: '#8b1a1a',
                fontSize: '13px',
                fontFamily: 'monospace',
              }}
            >
              {error}
            </div>
          )}
        </div>

        {insights.portfolioContext ? (
          <div
            style={{
              border: '1px solid #d8d0c0',
              backgroundColor: '#fff',
              padding: '18px 22px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px 24px',
                marginBottom: '16px',
              }}
            >
              <Stat label="Gold allocation" value={formatUsd(insights.portfolioContext.goldUsdValue)} />
              <Stat label="Silver allocation" value={formatUsd(insights.portfolioContext.silverUsdValue)} />
              <Stat label="Commodity total" value={formatUsd(insights.portfolioContext.commodityUsdValue)} />
              <Stat label="Real-assets total" value={formatUsd(insights.portfolioContext.totalRealAssetsUsdValue)} />
              <Stat
                label="Commodity share"
                value={
                  insights.portfolioContext.commoditySharePct !== null
                    ? `${insights.portfolioContext.commoditySharePct.toFixed(2)}%`
                    : '—'
                }
              />
            </div>
            <div
              style={{
                borderTop: '1px solid #e8e4dc',
                paddingTop: '12px',
                fontSize: '13px',
                color: '#333',
                lineHeight: '1.6',
              }}
            >
              <strong style={{ marginRight: '8px' }}>Concentration:</strong>
              <RiskBadge label={insights.portfolioContext.concentration.label} />
              <span style={{ marginLeft: '12px' }}>{insights.portfolioContext.concentration.note}</span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>
              Wallet: {insights.portfolioContext.walletAddress}
            </div>
          </div>
        ) : (
          <div
            style={{
              border: '1px solid #d8d0c0',
              backgroundColor: '#fafaf6',
              padding: '20px',
              fontSize: '13px',
              color: '#666',
              textAlign: 'center',
            }}
          >
            No wallet context. Add an address above to see allocation analysis.
          </div>
        )}
      </section>

      {/* External Dependency / Disclosures */}
      <section style={{ marginBottom: '36px' }}>
        <SectionHeading>External Dependency Status</SectionHeading>
        <div
          style={{
            padding: '14px 18px',
            border: '1px solid #c8d0d8',
            backgroundColor: '#f8f9fb',
            fontSize: '13px',
            lineHeight: '1.7',
            color: '#333',
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <strong>Gold reference</strong> — {insights.goldSpot.source}
            {insights.goldSpot.error && (
              <div style={{ color: '#a04020', fontSize: '12px', marginTop: '4px' }}>
                {insights.goldSpot.error}
              </div>
            )}
          </div>
          <div>
            <strong>Silver reference</strong> — {insights.silverSpot.source}
            {insights.silverSpot.error && (
              <div style={{ color: '#a04020', fontSize: '12px', marginTop: '4px' }}>
                {insights.silverSpot.error}
              </div>
            )}
          </div>
        </div>
      </section>

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
          {insights.disclosures.map((d, i) => (
            <div key={i}>• {d}</div>
          ))}
        </div>
      </section>

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
        <div>
          As of: {insights.fetchedAt.slice(0, 19).replace('T', ' ')} UTC &nbsp;|&nbsp; Reference only
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="/api/commodities/insights" target="_blank" style={{ color: '#888' }}>
            /api/commodities/insights
          </a>
          <span>|</span>
          <Link href="/portfolio/real-assets" style={{ color: '#888' }}>
            /portfolio/real-assets
          </Link>
          <span>|</span>
          <Link href="/commodities/kag" style={{ color: '#888' }}>
            /commodities/kag
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}

function MetricCard({
  title,
  value,
  unit,
  source,
  error,
  secondary,
}: {
  title: string;
  value: string;
  unit: string;
  source: string;
  error?: string;
  secondary?: string;
}) {
  return (
    <div style={{ border: '1px solid #d8d0c0', background: '#fafaf6', padding: '14px 16px' }}>
      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888', marginBottom: '4px', letterSpacing: '0.05em' }}>
        {title.toUpperCase()}
      </div>
      <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 700, color: '#1a1a2e' }}>
        {value}
      </div>
      {secondary && (
        <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#444', marginTop: '2px' }}>
          {secondary}
        </div>
      )}
      <div style={{ fontSize: '11px', color: '#666', marginTop: '6px', lineHeight: '1.4' }}>
        {unit}
      </div>
      <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#888', marginTop: '4px', lineHeight: '1.4' }}>
        {source}
      </div>
      {error && (
        <div style={{ fontSize: '11px', color: '#a04020', marginTop: '6px', lineHeight: '1.4' }}>
          {error}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888', marginBottom: '4px', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: '#1a1a2e' }}>
        {value}
      </div>
    </div>
  );
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  const initialInsights = await getCommodityInsights();
  return { props: { initialInsights } };
};
