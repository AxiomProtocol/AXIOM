/**
 * /stack/polygon — Polygon PoS Network Overview
 *
 * Public disclosure page describing Polygon's strategic role in the
 * Axiom Protocol multi-chain architecture: payments settlement, treasury
 * routing, and enterprise-grade on-chain financial rails.
 */

import React from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

const CAPABILITIES = [
  { key: 'Settlement',    enabled: true,  note: 'Enterprise AXUSD settlement layer' },
  { key: 'Payments',      enabled: true,  note: 'Primary payments and treasury routing' },
  { key: 'Treasury',      enabled: true,  note: 'Treasury routing for enterprise flows' },
  { key: 'Identity',      enabled: true,  note: 'Credential delivery via Arbitrum mirror' },
  { key: 'Reserve',       enabled: false, note: 'Managed on Arbitrum One' },
  { key: 'Issuance',      enabled: false, note: 'Canonical issuance on Arbitrum One' },
  { key: 'Governance',    enabled: false, note: 'Governance on Arbitrum One' },
  { key: 'Distribution',  enabled: false, note: 'Distribution layer is Sui' },
];

const CONTRACTS = [
  { name: 'IdentityRegistryStorage', role: 'ERC-3643 KYC storage layer' },
  { name: 'TrustedIssuersRegistry',  role: 'Registry of trusted claim issuers' },
  { name: 'ClaimTopicsRegistry',     role: 'Registry of required claim topics' },
  { name: 'IdentityRegistry',        role: 'Main ERC-3643 identity registry' },
  { name: 'ModularCompliance',       role: 'Compliance engine (country + transfer limit)' },
  { name: 'CountryAllowModule',      role: 'Country allowlist compliance module' },
  { name: 'TransferLimitModule',     role: 'Per-wallet daily transfer limit module' },
  { name: 'AxiomStable3643',         role: 'ERC-3643 AXUSD stablecoin on Polygon PoS' },
];

const DEFI_YIELD_LAYER = [
  { protocol: 'Aave v3',     role: 'Yield layer',    asset: 'USDC / AXUSD',   status: 'READ-ONLY', note: 'Supply APY monitoring; AXUSD reserve earning context' },
  { protocol: 'Aave v3',     role: 'Yield layer',    asset: 'WBTC / WETH',    status: 'READ-ONLY', note: 'Collateral market depth for AXUSD backing context' },
];

const DEFI_DEX_LAYER = [
  { protocol: 'Uniswap v3',  role: 'DEX layer',      pair: 'AXUSD / USDC',    status: 'PLANNED',   note: 'Primary AXUSD liquidity venue on Polygon; pending AXUSD Polygon deployment' },
  { protocol: 'Uniswap v3',  role: 'DEX layer',      pair: 'USDC / POL',      status: 'ACTIVE',    note: 'Reference liquidity pool — read-only market intelligence' },
];

const API_ENDPOINTS = [
  { method: 'GET',  path: '/api/polygon/status',                         desc: 'Integration phase and feature-flag status' },
  { method: 'GET',  path: '/api/polygon/chain-health',                   desc: 'RPC connectivity and block freshness' },
  { method: 'GET',  path: '/api/polygon/contracts',                      desc: 'Deployed automated control layer addresses' },
  { method: 'GET',  path: '/api/polygon/identity?address=0x…',           desc: 'On-chain ERC-3643 identity state for a wallet' },
  { method: 'GET',  path: '/api/polygon/identity/[wallet]',              desc: 'Credential bridge state (mirror mode)' },
  { method: 'POST', path: '/api/polygon/identity/bridge',                desc: 'Bridge Arbitrum credential to Polygon' },
  { method: 'POST', path: '/api/polygon/proofs/verify',                  desc: 'Off-chain Merkle proof verification' },
];

const DL = {
  bg:      '#0b0f17',
  card:    '#0f172a',
  border:  '#1e293b',
  muted:   '#64748b',
  body:    '#94a3b8',
  light:   '#e2e8f0',
  gold:    '#b8956a',
  green:   '#4ade80',
  amber:   '#fbbf24',
  red:     '#f87171',
  blue:    '#60a5fa',
};

const MONO  = '"Courier New", Courier, monospace';
const SERIF = 'Georgia, "Times New Roman", serif';

function Badge({ ok, labelTrue, labelFalse }: { ok: boolean; labelTrue: string; labelFalse: string }) {
  return (
    <span style={{
      fontFamily: MONO,
      fontSize: 10,
      letterSpacing: '0.08em',
      padding: '2px 8px',
      background: ok ? '#0a3d1f' : '#1e293b',
      color: ok ? DL.green : DL.muted,
      border: `1px solid ${ok ? '#166534' : DL.border}`,
    }}>
      {ok ? labelTrue : labelFalse}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: SERIF,
      fontSize: 15,
      color: '#cbd5e1',
      borderBottom: `1px solid ${DL.border}`,
      paddingBottom: 8,
      marginBottom: 20,
      fontWeight: 'normal',
    }}>
      {children}
    </h2>
  );
}

export default function PolygonStackPage() {
  return (
    <DesignLawLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 40 }}>
          <p style={{
            fontFamily: MONO,
            fontSize: 10,
            color: DL.muted,
            letterSpacing: '0.10em',
            marginBottom: 10,
            textTransform: 'uppercase',
          }}>
            Stack / Multi-Chain Architecture
          </p>
          <h1 style={{
            fontFamily: SERIF,
            fontSize: 32,
            color: '#f8fafc',
            margin: '0 0 12px',
            fontWeight: 'normal',
            letterSpacing: '-0.01em',
          }}>
            Polygon PoS Network
          </h1>
          <p style={{ fontFamily: SERIF, fontSize: 16, color: DL.body, maxWidth: 640, lineHeight: 1.7, margin: 0 }}>
            Polygon PoS is the payments and enterprise settlement layer in the Axiom
            Protocol multi-chain model. It hosts the ERC-3643 AXUSD stablecoin contract
            suite for high-throughput, low-cost on-chain financial rails serving
            enterprise treasury routing and cross-border settlement.
          </p>
        </div>

        {/* ── Strategic Role ── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeading>Strategic Role</SectionHeading>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 1,
            border: `1px solid ${DL.border}`,
            background: DL.border,
          }}>
            {[
              { label: 'Chain',          value: 'Polygon PoS' },
              { label: 'Chain ID',       value: '137' },
              { label: 'Testnet',        value: 'Amoy (80002)' },
              { label: 'Role',           value: 'Payments · Settlement' },
              { label: 'Native Asset',   value: 'POL' },
              { label: 'Status',         value: 'Phase 2 — Pending Deploy' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: DL.card, padding: '14px 16px' }}>
                <p style={{ fontFamily: MONO, fontSize: 10, color: DL.muted, margin: '0 0 4px', letterSpacing: '0.06em' }}>
                  {label.toUpperCase()}
                </p>
                <p style={{ fontFamily: MONO, fontSize: 12, color: DL.light, margin: 0 }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Capabilities ── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeading>Chain Capabilities</SectionHeading>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${DL.border}` }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Capability</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map(({ key, enabled, note }) => (
                <tr key={key} style={{ borderBottom: `1px solid #0f172a` }}>
                  <td style={{ padding: '7px 8px', color: DL.light }}>{key}</td>
                  <td style={{ padding: '7px 8px' }}>
                    <Badge ok={enabled} labelTrue="ACTIVE" labelFalse="NOT ASSIGNED" />
                  </td>
                  <td style={{ padding: '7px 8px', color: DL.body }}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Identity Bridge ── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeading>Identity Bridge — onchainid_mirror</SectionHeading>
          <p style={{ fontFamily: SERIF, fontSize: 14, color: DL.body, lineHeight: 1.75, marginBottom: 16, maxWidth: 680 }}>
            Polygon does not maintain an independent identity registry. Wallet eligibility
            is derived from the canonical Arbitrum One ERC-3643 identity registry
            (the source of truth) and mirrored to Polygon as a lightweight credential
            attestation. This approach avoids ZK proof dependencies at launch while
            preserving multi-party authorization integrity.
          </p>
          <dl style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            gap: '8px 16px',
            fontFamily: MONO,
            fontSize: 11,
          }}>
            <dt style={{ color: DL.muted }}>Bridge Mode</dt>
            <dd style={{ margin: 0, color: DL.light }}>onchainid_mirror</dd>
            <dt style={{ color: DL.muted }}>Source of Truth</dt>
            <dd style={{ margin: 0, color: DL.light }}>Arbitrum One — ERC-3643 IdentityRegistry</dd>
            <dt style={{ color: DL.muted }}>Revocation Sync</dt>
            <dd style={{ margin: 0, color: DL.light }}>Propagated on revokeCredential() call</dd>
            <dt style={{ color: DL.muted }}>ZK Proof Required</dt>
            <dd style={{ margin: 0 }}><Badge ok={false} labelTrue="YES" labelFalse="NOT AT LAUNCH" /></dd>
          </dl>
        </section>

        {/* ── Native USDC and CCTP ── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeading>Native USDC &amp; Circle CCTP</SectionHeading>
          <p style={{ fontFamily: SERIF, fontSize: 14, color: DL.body, lineHeight: 1.75, marginBottom: 20, maxWidth: 680 }}>
            Polygon PoS hosts Circle&apos;s native USDC — not a bridged representation, but a
            token issued directly by Circle on Polygon. This makes Polygon a natural
            enterprise settlement layer for protocols that need dollar-denominated liquidity
            without bridge custody risk. Axiom&apos;s Polygon integration is designed to
            co-settle AXUSD positions against native USDC reserves held on-chain.
          </p>
          <dl style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr',
            gap: '8px 16px',
            fontFamily: MONO,
            fontSize: 11,
            marginBottom: 20,
          }}>
            <dt style={{ color: DL.muted }}>USDC Issuance</dt>
            <dd style={{ margin: 0, color: DL.light }}>Native — issued by Circle directly on Polygon PoS</dd>
            <dt style={{ color: DL.muted }}>USDC Contract</dt>
            <dd style={{ margin: 0 }}>
              <a href="https://polygonscan.com/token/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
                target="_blank" rel="noreferrer" style={{ color: DL.blue, textDecoration: 'none' }}>
                0x3c499c…c3359 (Polygonscan)
              </a>
            </dd>
            <dt style={{ color: DL.muted }}>Cross-Chain Transfer</dt>
            <dd style={{ margin: 0, color: DL.light }}>Circle CCTP (Cross-Chain Transfer Protocol)</dd>
            <dt style={{ color: DL.muted }}>CCTP Routes</dt>
            <dd style={{ margin: 0, color: DL.light }}>Polygon ↔ Ethereum · Polygon ↔ Arbitrum One</dd>
            <dt style={{ color: DL.muted }}>Transfer Mechanism</dt>
            <dd style={{ margin: 0, color: DL.light }}>Burn-and-mint — no bridge custody or wrapped tokens</dd>
            <dt style={{ color: DL.muted }}>Axiom Integration</dt>
            <dd style={{ margin: 0, color: DL.body }}>Planned — AXUSD co-settlement against native USDC on Polygon</dd>
          </dl>
          <div style={{
            padding: '12px 16px',
            background: DL.card,
            border: `1px solid ${DL.border}`,
            fontFamily: MONO,
            fontSize: 10,
            color: DL.muted,
            lineHeight: 1.7,
          }}>
            CCTP enables atomic cross-chain USDC moves without custodial bridge risk. When Axiom
            deploys AXUSD on Polygon, native USDC via CCTP provides a composable dollar liquidity
            layer for enterprise treasury routing — settling positions between Arbitrum One (core
            execution) and Polygon (payments settlement) without wrapping or bridge exposure.
          </div>
        </section>

        {/* ── Automated Control Layer Suite ── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeading>Automated Control Layer Suite</SectionHeading>
          <p style={{ fontFamily: SERIF, fontSize: 13, color: DL.muted, marginBottom: 14, lineHeight: 1.6 }}>
            Eight automated control layers constitute the full ERC-3643 AXUSD deployment
            on Polygon PoS. All addresses are populated post-deployment. Empty addresses
            indicate pending deployment.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${DL.border}` }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Contract</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Role</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Network</th>
              </tr>
            </thead>
            <tbody>
              {CONTRACTS.map(({ name, role }) => (
                <tr key={name} style={{ borderBottom: `1px solid #0a0f1a` }}>
                  <td style={{ padding: '7px 8px', color: DL.blue }}>{name}</td>
                  <td style={{ padding: '7px 8px', color: DL.body }}>{role}</td>
                  <td style={{ padding: '7px 8px', color: DL.muted }}>Polygon Mainnet · Amoy</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Deployment Phases ── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeading>Deployment Phases</SectionHeading>
          <div style={{ fontFamily: MONO, fontSize: 11, color: DL.body, lineHeight: 2 }}>
            {[
              { phase: 'Phase 1', label: 'Foundation',         status: 'COMPLETE', note: 'Chain config, capability flags, RPC provider factory, Merkle proof toolchain' },
              { phase: 'Phase 2', label: 'Amoy Testnet',       status: 'PENDING',  note: 'ERC-3643 suite deployment to Amoy testnet; identity bridge integration' },
              { phase: 'Phase 3', label: 'Polygon Mainnet',    status: 'FUTURE',   note: 'Production AXUSD deployment; admin role transfer to multi-party authorization' },
              { phase: 'Phase 4', label: 'Enterprise Rails',   status: 'FUTURE',   note: 'Treasury routing, cross-border settlement, enterprise account onboarding' },
            ].map(({ phase, label, status, note }) => (
              <div key={phase} style={{
                display: 'grid',
                gridTemplateColumns: '80px 180px 100px 1fr',
                gap: '0 16px',
                padding: '10px 0',
                borderBottom: `1px solid ${DL.border}`,
                alignItems: 'start',
              }}>
                <span style={{ color: DL.gold }}>{phase}</span>
                <span style={{ color: DL.light }}>{label}</span>
                <span>
                  <Badge
                    ok={status === 'COMPLETE'}
                    labelTrue="COMPLETE"
                    labelFalse={status}
                  />
                </span>
                <span style={{ color: DL.muted, fontSize: 10 }}>{note}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── DeFi Infrastructure ── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeading>On-Chain Financial Rails — DeFi Infrastructure</SectionHeading>
          <p style={{ fontFamily: SERIF, fontSize: 14, color: DL.body, lineHeight: 1.75, marginBottom: 20, maxWidth: 680 }}>
            Polygon PoS hosts two complementary on-chain financial rail layers: Aave v3 as
            the yield and collateral market layer, and Uniswap v3 as the DEX layer for
            AXUSD liquidity. Both are integrated as read-only market intelligence services
            at this phase of the Axiom Polygon deployment.
          </p>
          <p style={{ fontFamily: MONO, fontSize: 10, color: DL.gold, letterSpacing: '0.08em', marginBottom: 12, textTransform: 'uppercase' }}>
            Aave v3 — Yield Layer
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: 11, marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${DL.border}` }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Protocol</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Role</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Asset</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {DEFI_YIELD_LAYER.map(({ protocol, role, asset, status, note }) => (
                <tr key={asset} style={{ borderBottom: `1px solid #0a0f1a` }}>
                  <td style={{ padding: '7px 8px', color: DL.blue }}>{protocol}</td>
                  <td style={{ padding: '7px 8px', color: DL.gold }}>{role}</td>
                  <td style={{ padding: '7px 8px', color: DL.light }}>{asset}</td>
                  <td style={{ padding: '7px 8px' }}>
                    <Badge ok={status === 'ACTIVE'} labelTrue="ACTIVE" labelFalse={status} />
                  </td>
                  <td style={{ padding: '7px 8px', color: DL.muted }}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontFamily: MONO, fontSize: 10, color: DL.gold, letterSpacing: '0.08em', marginBottom: 12, textTransform: 'uppercase' }}>
            Uniswap v3 — DEX Layer
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${DL.border}` }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Protocol</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Role</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Pair</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {DEFI_DEX_LAYER.map(({ protocol, role, pair, status, note }) => (
                <tr key={pair} style={{ borderBottom: `1px solid #0a0f1a` }}>
                  <td style={{ padding: '7px 8px', color: DL.blue }}>{protocol}</td>
                  <td style={{ padding: '7px 8px', color: DL.gold }}>{role}</td>
                  <td style={{ padding: '7px 8px', color: DL.light }}>{pair}</td>
                  <td style={{ padding: '7px 8px' }}>
                    <Badge ok={status === 'ACTIVE'} labelTrue="ACTIVE" labelFalse={status} />
                  </td>
                  <td style={{ padding: '7px 8px', color: DL.muted }}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{
            marginTop: 14,
            padding: '10px 14px',
            border: `1px solid ${DL.border}`,
            fontFamily: MONO,
            fontSize: 10,
            color: DL.muted,
            lineHeight: 1.7,
          }}>
            API: <span style={{ color: DL.blue }}>/api/aave/polygon/market</span> · <span style={{ color: DL.blue }}>/api/uniswap/pools</span>
          </div>
        </section>

        {/* ── API Endpoints ── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeading>Integration API Reference</SectionHeading>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${DL.border}` }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal', width: 50 }}>Method</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Endpoint</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: DL.muted, fontWeight: 'normal' }}>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {API_ENDPOINTS.map(({ method, path, desc }) => (
                <tr key={path} style={{ borderBottom: `1px solid #0a0f1a` }}>
                  <td style={{ padding: '7px 8px', color: method === 'POST' ? DL.amber : DL.blue }}>{method}</td>
                  <td style={{ padding: '7px 8px', color: DL.light }}>{path}</td>
                  <td style={{ padding: '7px 8px', color: DL.body }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Explorer Links ── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeading>Block Explorers</SectionHeading>
          <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px 16px', fontFamily: MONO, fontSize: 11 }}>
            <dt style={{ color: DL.muted }}>Polygon Mainnet</dt>
            <dd style={{ margin: 0 }}>
              <a href="https://polygonscan.com" target="_blank" rel="noreferrer"
                style={{ color: DL.blue, textDecoration: 'none' }}>
                polygonscan.com
              </a>
            </dd>
            <dt style={{ color: DL.muted }}>Amoy Testnet</dt>
            <dd style={{ margin: 0 }}>
              <a href="https://amoy.polygonscan.com" target="_blank" rel="noreferrer"
                style={{ color: DL.blue, textDecoration: 'none' }}>
                amoy.polygonscan.com
              </a>
            </dd>
            <dt style={{ color: DL.muted }}>Amoy Faucet</dt>
            <dd style={{ margin: 0 }}>
              <a href="https://faucet.polygon.technology" target="_blank" rel="noreferrer"
                style={{ color: DL.blue, textDecoration: 'none' }}>
                faucet.polygon.technology
              </a>
            </dd>
          </dl>
        </section>

        {/* ── Disclosure ── */}
        <section style={{
          padding: '16px 20px',
          border: `1px solid ${DL.border}`,
          background: DL.card,
        }}>
          <p style={{ fontFamily: MONO, fontSize: 10, color: DL.muted, margin: 0, lineHeight: 1.8 }}>
            DISCLOSURE — Polygon PoS integration is in pre-deployment phase.
            No assets are held on Polygon at this time. Contract addresses will be
            published on Polygonscan upon deployment. The identity bridge operates in
            onchainid_mirror mode — Arbitrum One remains the canonical identity registry.
            This page is informational only and does not constitute an offer of any
            financial product or service.
          </p>
        </section>

      </div>
    </DesignLawLayout>
  );
}
