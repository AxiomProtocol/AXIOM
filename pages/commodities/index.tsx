/**
 * /commodities — Tokenized Commodities Hub
 *
 * Main entry point for tokenized commodity assets inside Axiom Protocol.
 *
 * Sections:
 *   - Overview of the commodity integration layer
 *   - AXAU card (Axiom-issued gold reserve module — LIVE)
 *   - KAG card (external supported silver — EXTERNAL_SUPPORTED)
 *   - AXAG status card (NOT LIVE · NOT ISSUED)
 *   - Comparison table (AXAU vs KAG)
 *   - Links to portfolio, insights, and per-asset detail pages
 *   - Disclosures
 *
 * Hard rules:
 *   - Reference / informational only. No buy/sell language.
 *   - No financial advice. No yield claims.
 *   - AXAG remains NOT LIVE AND NOT ISSUED.
 *   - No write paths. No contract writes. No banking rails.
 */

import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { CommodityStatusBadge } from '../../components/commodities/CommodityStatusBadge';
import { CommodityComparisonTable } from '../../components/commodities/CommodityComparisonTable';
import { COMMODITY_DISCLOSURES, COMMODITY_PAGE_BANNER } from '../../lib/commodities/disclosures';
import { COMMODITY_REGISTRY } from '../../lib/commodities/registry';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const C = {
  navy:    '#1a1a2e',
  gold:    '#b8860b',
  blue:    '#1a3a6e',
  red:     '#8b1a1a',
  border:  '#d8d0c0',
  bg:      '#fafaf6',
  bgGold:  '#fdf8ee',
  bgBlue:  '#f0f4fb',
  bgRed:   '#fff8f8',
  muted:   '#666',
};

// ─── Asset Cards ──────────────────────────────────────────────────────────────

interface AssetCardProps {
  symbol: string;
  name: string;
  issuer: string;
  chain: string;
  unit: string;
  statusEl: React.ReactNode;
  description: string;
  detailHref?: string;
  accentColor?: string;
  bg?: string;
  borderColor?: string;
}

function AssetCard({
  symbol,
  name,
  issuer,
  chain,
  unit,
  statusEl,
  description,
  detailHref,
  accentColor = C.navy,
  bg = C.bg,
  borderColor = C.border,
}: AssetCardProps) {
  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        backgroundColor: bg,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '20px',
              fontWeight: 700,
              color: accentColor,
              letterSpacing: '0.04em',
            }}
          >
            {symbol}
          </span>
          <span style={{ marginLeft: '10px', fontSize: '14px', color: C.muted }}>
            {name}
          </span>
        </div>
        <div>{statusEl}</div>
      </div>

      <div style={{ fontSize: '12px', fontFamily: 'monospace', color: C.muted, lineHeight: '1.5' }}>
        <span style={{ marginRight: '16px' }}>Issuer: {issuer}</span>
        <span>Chain: {chain}</span>
      </div>

      <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#555' }}>{unit}</div>

      <p style={{ fontSize: '13px', color: '#333', lineHeight: '1.65', margin: 0 }}>{description}</p>

      {detailHref && (
        <div style={{ marginTop: '4px' }}>
          <Link
            href={detailHref}
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              color: accentColor,
              textDecoration: 'underline',
              letterSpacing: '0.04em',
            }}
          >
            View details →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Section: Layer explanation ───────────────────────────────────────────────

function LayerExplainer() {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        backgroundColor: C.bg,
        padding: '20px 24px',
        fontSize: '13px',
        lineHeight: '1.75',
        color: '#333',
      }}
    >
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: C.muted,
          marginBottom: '12px',
        }}
      >
        TOKENIZED COMMODITIES INTEGRATION LAYER — OVERVIEW
      </div>
      <p style={{ margin: '0 0 10px' }}>
        The Axiom Tokenized Commodities Integration Layer provides a unified
        read-only view of commodity assets recognized by Axiom Protocol. It supports
        two distinct product categories:
      </p>
      <ul style={{ margin: '0 0 10px', paddingLeft: '20px' }}>
        <li style={{ marginBottom: '6px' }}>
          <strong>Axiom-issued reserve modules</strong> — commodities where Axiom
          Protocol is the issuer. Currently: <strong>AXAU</strong> (gold, live on Arbitrum One).
          Future reserve modules require governance approval and a launch gate sign-off.
        </li>
        <li>
          <strong>External supported commodity assets</strong> — third-party tokenized
          commodities that Axiom integrates for portfolio visibility. Currently:{' '}
          <strong>KAG</strong> (Kinesis Silver, issued by KMS Labs). Axiom does not
          issue or custody these assets. Support is read-only.
        </li>
      </ul>
      <p style={{ margin: '0 0 10px' }}>
        <strong>AXAG</strong> (Axiom Silver Reserve) is acknowledged but is not live
        and is not issued. No AXAG token exists on any chain. This status will not
        change without governance approval and a launch gate.
      </p>
      <p style={{ margin: 0, color: C.muted, fontSize: '12px', fontFamily: 'monospace' }}>
        Reference only. Not financial advice. No buy/sell recommendations.
      </p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CommoditiesHubPage() {
  const axau = COMMODITY_REGISTRY.find((c) => c.symbol === 'AXAU')!;
  const kag  = COMMODITY_REGISTRY.find((c) => c.symbol === 'KAG')!;
  const axag = COMMODITY_REGISTRY.find((c) => c.symbol === 'AXAG')!;

  return (
    <DesignLawLayout>
      <Head>
        <title>Commodities | Axiom Protocol</title>
        <meta
          name="description"
          content="Axiom Protocol tokenized commodities hub. AXAU (gold reserve, live), KAG (Kinesis Silver, external), AXAG (not live, not issued). Reference only."
        />
      </Head>

      {/* Banner */}
      <div
        style={{
          border: `1px solid ${C.red}`,
          backgroundColor: C.bgRed,
          padding: '12px 18px',
          marginBottom: '28px',
          fontSize: '13px',
          lineHeight: '1.6',
          color: C.red,
          fontFamily: 'monospace',
        }}
      >
        {COMMODITY_PAGE_BANNER}
      </div>

      {/* Title */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: C.muted, marginBottom: '8px', letterSpacing: '0.08em' }}>
          COMMODITIES — INTEGRATION LAYER
        </div>
        <h1
          style={{
            fontSize: '2rem',
            fontFamily: 'Georgia, serif',
            fontWeight: 700,
            color: C.navy,
            margin: '0 0 10px',
          }}
        >
          Tokenized Commodities
        </h1>
        <p style={{ color: '#555', fontSize: '15px', maxWidth: '720px', lineHeight: '1.6', margin: 0 }}>
          Unified entry point for tokenized commodity assets on Axiom Protocol.
          Covers the AXAU gold reserve module, KAG external silver support, and
          the current status of AXAG.
        </p>
      </div>

      {/* Layer overview */}
      <section style={{ marginBottom: '36px' }}>
        <SectionHeading>Integration Layer Overview</SectionHeading>
        <LayerExplainer />
      </section>

      {/* Asset cards */}
      <section style={{ marginBottom: '36px' }}>
        <SectionHeading>Commodity Assets</SectionHeading>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
          }}
        >
          {/* AXAU */}
          <AssetCard
            symbol="AXAU"
            name={axau.name}
            issuer={axau.issuer}
            chain={axau.chain}
            unit={axau.unit}
            statusEl={<CommodityStatusBadge status={axau.productStatus} size="md" />}
            description={
              'AXAU is Axiom Protocol\'s gold reserve module, live on Arbitrum One. ' +
              'Gold reserves are held via PAXG and direct custodied gold. NAV is ' +
              'published on-chain by NAVEngine. The authoritative on-chain value governs. ' +
              'Additional reserve sleeves may be added through governance and launch gates.'
            }
            detailHref="/axau"
            accentColor={C.gold}
            bg={C.bgGold}
            borderColor="#c8a830"
          />

          {/* KAG */}
          <AssetCard
            symbol="KAG"
            name={kag.name}
            issuer={kag.issuer}
            chain={kag.chain}
            unit={kag.unit}
            statusEl={<CommodityStatusBadge status={kag.productStatus} size="md" />}
            description={
              'KAG is issued by KMS Labs within the Kinesis ecosystem. ' +
              'Axiom supports KAG as an external commodity asset for portfolio ' +
              'visibility. Axiom does not issue KAG. Axiom does not custody the ' +
              'underlying silver. Any redemption rights depend on KMS Labs / Kinesis terms.'
            }
            detailHref="/commodities/kag"
            accentColor={C.blue}
            bg={C.bgBlue}
            borderColor="#1a3a6e"
          />

          {/* AXAG */}
          <AssetCard
            symbol="AXAG"
            name={axag.name}
            issuer="n/a"
            chain="n/a — not deployed"
            unit={axag.unit}
            statusEl={<CommodityStatusBadge status={axag.productStatus} size="md" />}
            description={
              'AXAG is not live and is not issued. No AXAG token exists on any chain. ' +
              'The silver wrapper-token path is deferred pending governance approval, ' +
              'custody evaluation, and launch-gate sign-off. ' +
              'Axiom does not issue AXAG in this phase. Phase 1 silver support is KAG (external) only.'
            }
            accentColor={C.red}
            bg={C.bgRed}
            borderColor={C.red}
          />
        </div>
      </section>

      {/* Comparison */}
      <section style={{ marginBottom: '36px' }}>
        <SectionHeading>AXAU vs KAG — Comparison</SectionHeading>
        <div
          style={{
            border: `1px solid ${C.border}`,
            backgroundColor: '#fff',
            padding: '20px',
          }}
        >
          <CommodityComparisonTable showAxag />
        </div>
      </section>

      {/* Links */}
      <section style={{ marginBottom: '36px' }}>
        <SectionHeading>Related Pages</SectionHeading>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
          }}
        >
          {[
            { href: '/axau',                  label: 'AXAU — Gold Reserve',            note: 'Live system state, NAV, oracle' },
            { href: '/axau-disclosure',        label: 'AXAU Disclosure',                note: 'Full reserve & solvency disclosure' },
            { href: '/axau-early-access',      label: 'AXAU Early Access',              note: 'Request access to mint AXAU' },
            { href: '/commodities/kag',        label: 'KAG — Kinesis Silver',           note: 'External silver asset detail' },
            { href: '/commodities/insights',   label: 'Commodity Insights',             note: 'Gold/silver spot, ratio, comparison' },
            { href: '/portfolio/real-assets',  label: 'Real Assets Portfolio',          note: 'Wallet-aware commodity holdings' },
            { href: '/commodity-framework',    label: 'Commodity Expansion Framework',  note: 'Governance framework for new assets' },
          ].map(({ href, label, note }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                border: `1px solid ${C.border}`,
                backgroundColor: C.bg,
                padding: '14px 16px',
                textDecoration: 'none',
                color: C.navy,
              }}
            >
              <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                {label}
              </div>
              <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                {note}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* What is deferred */}
      <section style={{ marginBottom: '36px' }}>
        <SectionHeading>Current Scope &amp; Deferrals</SectionHeading>
        <div
          style={{
            border: `1px solid ${C.border}`,
            backgroundColor: C.bg,
            padding: '18px 22px',
            fontSize: '13px',
            lineHeight: '1.75',
            color: '#333',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <strong>Live scope (Phase 1):</strong>
            <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
              <li>AXAU — Axiom-issued gold reserve module on Arbitrum One</li>
              <li>KAG — External silver (KMS Labs / Kinesis) on Ethereum mainnet, read-only</li>
            </ul>
          </div>
          <div>
            <strong>Deferred / not live:</strong>
            <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
              <li>AXAG — Silver wrapper token. Not live. Not issued. Requires governance approval and launch gate.</li>
              <li>Additional precious metals (XPT, XPD) — deferred pending oracle and liquidity analysis</li>
              <li>Base metals, energy, agricultural commodities — see Commodity Expansion Framework for gates</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Disclosures */}
      <section style={{ marginBottom: '48px' }}>
        <SectionHeading>Disclosures</SectionHeading>
        <div
          style={{
            border: `1px solid #c8d0d8`,
            backgroundColor: '#f8f9fb',
            padding: '16px 20px',
            fontSize: '12px',
            lineHeight: '1.85',
            color: '#333',
            fontFamily: 'monospace',
          }}
        >
          {COMMODITY_DISCLOSURES.map((d, i) => (
            <div key={i}>• {d}</div>
          ))}
        </div>
      </section>
    </DesignLawLayout>
  );
}
