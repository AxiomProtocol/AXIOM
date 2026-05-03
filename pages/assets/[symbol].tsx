/**
 * /assets/[symbol] — Per-asset disclosure page for external supported assets
 *
 * One template covering USDC, PAXG, XAUT, WBTC, cbETH.
 *
 * Hard rules:
 *   - Read-only. No writes anywhere on this page.
 *   - Axiom does NOT issue or custody the asset.
 *   - AXAG is not live and is not issued — surfaced explicitly.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { PageVisualSuite } from '../../components/visual';
import {
  getAssetMetadata,
  getAssetDisclosure,
  getAssetRiskSummary,
  getAssetUsdValue,
  isSupportedSymbol,
  CHAINS,
  type AssetMetadata,
  type AssetDisclosure,
  type AssetRiskSummary,
} from '../../lib/assets/externalAssetService';

interface SpotData {
  unitPriceUsd: number | null;
  oracleSource: string;
  fetchedAt: string;
  error?: string;
}

interface PageProps {
  metadata: AssetMetadata;
  disclosure: AssetDisclosure;
  risk: AssetRiskSummary;
  spot: SpotData;
}

const COLOR = {
  navy: '#1e3a5f',
  navyLight: '#2a4a73',
  border: '#c9d4dc',
  borderAlt: '#dde4ea',
  bg: '#ffffff',
  bgAlt: '#f8f9fb',
  text: '#111827',
  muted: '#6b7280',
  amber: '#92400e',
  green: '#166534',
  red: '#991b1b',
};

export const getServerSideProps: GetServerSideProps<PageProps> = async ({ params }) => {
  const symbol = typeof params?.symbol === 'string' ? params.symbol : '';
  if (!isSupportedSymbol(symbol)) {
    return { notFound: true };
  }
  const metadata = getAssetMetadata(symbol);
  const disclosure = getAssetDisclosure(symbol);
  const risk = getAssetRiskSummary(symbol);
  const spot = await getAssetUsdValue(symbol, 1);
  return {
    props: {
      metadata,
      disclosure,
      risk,
      spot: {
        unitPriceUsd: spot.unitPriceUsd,
        oracleSource: spot.oracleSource,
        fetchedAt: spot.fetchedAt,
        ...(spot.error ? { error: spot.error } : {}),
      },
    },
  };
};

function categoryLabel(c: string): string {
  switch (c) {
    case 'STABLE':
      return 'Reserve-grade stable';
    case 'GOLD':
      return 'Gold';
    case 'SILVER':
      return 'Silver';
    case 'BTC':
      return 'BTC reference';
    case 'STAKED_ETH':
      return 'Staked ETH (yield-bearing)';
    default:
      return c;
  }
}

function riskColor(level: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (level) {
    case 'LOW':
      return COLOR.green;
    case 'MEDIUM':
      return COLOR.amber;
    case 'HIGH':
      return COLOR.red;
  }
}

export default function AssetDetailPage({ metadata, disclosure, risk, spot }: PageProps) {
  const chain = CHAINS[metadata.primaryChainKey];
  const explorerUrl = chain.explorer(metadata.contractAddress);

  return (
    <DesignLawLayout>
      <PageVisualSuite preset="assets-symbol" />
      <Head>
        <title>{metadata.symbol} — {metadata.name} · External Supported Asset · Axiom</title>
        <meta
          name="description"
          content={`${metadata.name} (${metadata.symbol}) is supported by Axiom Protocol as an external asset on a read-only basis. Axiom does not issue or custody ${metadata.symbol}.`}
        />
      </Head>

      {/* Header band */}
      <div style={{
        background: COLOR.bgAlt,
        border: `1px solid ${COLOR.borderAlt}`,
        padding: '20px 24px',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: 32,
            color: COLOR.navy,
            margin: 0,
          }}>
            {metadata.symbol} · {metadata.name}
          </h1>
          <span style={{
            background: COLOR.navy,
            color: '#fff',
            padding: '4px 10px',
            fontFamily: '"Courier New", monospace',
            fontSize: 11,
            letterSpacing: '0.08em',
          }}>
            EXTERNAL_SUPPORTED
          </span>
        </div>
        <p style={{
          fontFamily: 'Georgia, serif',
          fontSize: 15,
          color: COLOR.text,
          marginTop: 12,
          marginBottom: 0,
          maxWidth: 760,
        }}>
          {disclosure.axiomSupportStatement} {disclosure.axiomIssuanceStatement}
        </p>
      </div>

      {/* What Axiom does / does not do */}
      <section style={{ marginBottom: 28 }}>
        <SectionHeading>What Axiom Does — and Does Not Do</SectionHeading>
        <ul style={{ paddingLeft: 22, color: COLOR.text, fontSize: 14, lineHeight: 1.8 }}>
          <li>Axiom supports {metadata.symbol} as an <strong>external supported asset</strong> on a read-only basis.</li>
          <li>Axiom does <strong>not</strong> issue {metadata.symbol}.</li>
          <li>Axiom does <strong>not</strong> custody the underlying reserve in this phase.</li>
          <li>No swaps, lending, deposits, withdrawals, or banking rails are offered for {metadata.symbol} by Axiom.</li>
          <li>Redemption / issuer rights depend on the underlying issuer&apos;s terms — see &quot;Issuer&quot; below.</li>
        </ul>
        <div style={{
          marginTop: 12,
          padding: '12px 16px',
          background: COLOR.bgAlt,
          border: `1px solid ${COLOR.borderAlt}`,
          fontFamily: '"Courier New", monospace',
          fontSize: 12,
          color: COLOR.amber,
        }}>
          AXAG is not live and is not issued.
        </div>
      </section>

      {/* Asset facts */}
      <section style={{ marginBottom: 28 }}>
        <SectionHeading>Asset Facts</SectionHeading>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          <Fact label="Symbol" value={metadata.symbol} />
          <Fact label="Name" value={metadata.name} />
          <Fact label="Category" value={categoryLabel(metadata.category)} />
          <Fact label="Issuer" value={metadata.issuer} />
          <Fact label="Issuer jurisdiction" value={metadata.issuerJurisdiction} />
          <Fact label="Chain" value={`${chain.name} (chainId ${chain.chainId})`} />
          <Fact label="Contract standard" value={`${metadata.contractStandard} (decimals ${metadata.contractDecimals})`} />
          <Fact label="Verification status" value={metadata.contractVerificationStatus} accent={COLOR.green} />
          <Fact label="Unit" value={metadata.unit} />
          <Fact label="Price source" value={metadata.priceSource} />
          <Fact
            label="Spot reference USD / token"
            value={spot.unitPriceUsd !== null ? `$${spot.unitPriceUsd.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : 'Unavailable'}
          />
          <Fact
            label="As of"
            value={spot.fetchedAt}
          />
        </div>
        <p style={{ marginTop: 12, fontSize: 12, color: COLOR.muted, fontFamily: '"Courier New", monospace' }}>
          Contract: <a href={explorerUrl} target="_blank" rel="noreferrer" style={{ color: COLOR.navy, wordBreak: 'break-all' }}>{metadata.contractAddress}</a>
        </p>
        {spot.error ? (
          <p style={{ marginTop: 8, fontSize: 12, color: COLOR.red, fontFamily: '"Courier New", monospace' }}>
            {spot.error}
          </p>
        ) : null}
      </section>

      {/* Reserve / backing */}
      <section style={{ marginBottom: 28 }}>
        <SectionHeading>Reserve & Backing Model</SectionHeading>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: COLOR.text, lineHeight: 1.7, maxWidth: 760 }}>
          {metadata.reserveModel}
        </p>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: COLOR.muted, marginTop: 4 }}>
          Reserve standard: {metadata.reserveStandard}
        </p>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: COLOR.text, marginTop: 12, maxWidth: 760 }}>
          {metadata.axiomCustodyStatement}
        </p>
      </section>

      {/* Disclosure block */}
      <section style={{ marginBottom: 28 }}>
        <SectionHeading>Disclosure</SectionHeading>
        <Disclosure label="Issuer" text={disclosure.issuerStatement} />
        <Disclosure label="Axiom support" text={disclosure.axiomSupportStatement} />
        <Disclosure label="Axiom issuance" text={disclosure.axiomIssuanceStatement} />
        <Disclosure label="Custody" text={disclosure.custodyStatement} />
        <Disclosure label="Redemption" text={disclosure.redemptionStatement} />
        <Disclosure label="Regulatory" text={disclosure.regulatoryStatement} />
        <Disclosure label="Scope" text={disclosure.scopeStatement} />
        <Disclosure label="Unit" text={disclosure.unitStatement} />
        <Disclosure label="AXAG" text={metadata.axagStatement} />
      </section>

      {/* Risk summary */}
      <section style={{ marginBottom: 28 }}>
        <SectionHeading>Risk Summary</SectionHeading>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <RiskRow label="Custody risk" item={risk.custodyRisk} />
          <RiskRow label="Reserve risk" item={risk.reserveRisk} />
          <RiskRow label="Redemption risk" item={risk.redemptionRisk} />
          <RiskRow label="Regulatory risk" item={risk.regulatoryRisk} />
          <RiskRow label="Oracle risk" item={risk.oracleRisk} />
          <RiskRow label="Liquidity risk" item={risk.liquidityRisk} />
          <RiskRow label="Axiom-side scope risk" item={risk.axiomScopeRisk} />
        </div>
      </section>

      {/* Risk notes */}
      <section style={{ marginBottom: 28 }}>
        <SectionHeading>Risk Notes</SectionHeading>
        <ul style={{ paddingLeft: 22, color: COLOR.text, fontSize: 14, lineHeight: 1.7 }}>
          {metadata.riskNotes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </section>

      {/* Disclosure links */}
      <section style={{ marginBottom: 28 }}>
        <SectionHeading>Issuer Disclosure Links</SectionHeading>
        <ul style={{ paddingLeft: 22, color: COLOR.text, fontSize: 14, lineHeight: 1.7 }}>
          {metadata.disclosureLinks.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noreferrer" style={{ color: COLOR.navy }}>
                {l.label}
              </a>
              {l.note ? <span style={{ color: COLOR.muted }}> — {l.note}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      {/* API surface */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeading>Read-Only APIs</SectionHeading>
        <div style={{ fontFamily: '"Courier New", monospace', fontSize: 13, color: COLOR.text, background: COLOR.bgAlt, padding: '14px 18px', border: `1px solid ${COLOR.borderAlt}` }}>
          <div>GET <Link href={`/api/assets/${metadata.symbol.toLowerCase()}/status`} style={{ color: COLOR.navy }}>/api/assets/{metadata.symbol.toLowerCase()}/status</Link></div>
          <div>GET <Link href={`/api/assets/${metadata.symbol.toLowerCase()}/balance?address=0x0000000000000000000000000000000000000000`} style={{ color: COLOR.navy }}>/api/assets/{metadata.symbol.toLowerCase()}/balance?address=0x...</Link></div>
          <div>GET <Link href="/api/assets" style={{ color: COLOR.navy }}>/api/assets</Link></div>
        </div>
      </section>

      <p style={{ marginTop: 24, color: COLOR.muted, fontSize: 12, fontFamily: '"Courier New", monospace' }}>
        Effective {metadata.effectiveDate} · Schema: asset-status-v1 · ←{' '}
        <Link href="/assets" style={{ color: COLOR.navy }}>All Supported Assets</Link>
      </p>
    </DesignLawLayout>
  );
}

function Fact({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ border: `1px solid ${COLOR.borderAlt}`, padding: '10px 14px', background: COLOR.bg }}>
      <div style={{
        fontFamily: '"Courier New", monospace',
        fontSize: 10,
        color: COLOR.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ color: accent ?? COLOR.text, fontFamily: 'Georgia, serif', fontSize: 14 }}>{value}</div>
    </div>
  );
}

function Disclosure({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginBottom: 12, paddingLeft: 14, borderLeft: `3px solid ${COLOR.border}` }}>
      <div style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: COLOR.navy, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: COLOR.text, lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}

function RiskRow({ label, item }: { label: string; item: { level: 'LOW' | 'MEDIUM' | 'HIGH'; note: string } }) {
  return (
    <div style={{ border: `1px solid ${COLOR.borderAlt}`, padding: '12px 14px', background: COLOR.bg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: COLOR.navy, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{
          background: riskColor(item.level),
          color: '#fff',
          fontFamily: '"Courier New", monospace',
          fontSize: 10,
          padding: '2px 8px',
          letterSpacing: '0.08em',
        }}>
          {item.level}
        </span>
      </div>
      <div style={{ color: COLOR.text, fontSize: 13, lineHeight: 1.6 }}>{item.note}</div>
    </div>
  );
}
