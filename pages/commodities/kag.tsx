/**
 * /commodities/kag — Silver Reserve · Kinesis KAG · Axiom Supported
 *
 * Phase 1: KAG direct support — Ethereum mainnet, read-only.
 * Phase 2: Silver sleeve in AXAU (governance vote required — see roadmap section).
 *
 * Hard rules (unchanged):
 *   - Axiom does not issue KAG.
 *   - Axiom does not custody the underlying silver.
 *   - AXAG wrapper token is not live and is not issued (Phase 2 sleeve design only).
 *   - No lending, no swaps, no ACH, no banking rails.
 */

import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout } from '../../components/design-law';
import {
  getKagAssetMetadata,
  getKagDisclosure,
  getKagRiskSummary,
  getKagUsdValue,
} from '../../lib/commodities/kagService';
import type {
  KagAssetMetadata,
  KagDisclosure,
  KagRiskSummary,
} from '../../lib/commodities/kagService';

// ─── Palette — silver / steel, mirrors AXAU's gold system ────────────────────
const S = {
  navy:      '#1e3a5f',
  navyLight: '#2a4a73',
  silver:    '#5c7a8f',
  silverDk:  '#3d5a6f',
  silverBg:  '#f4f7f9',
  border:    '#c9d4dc',
  borderAlt: '#dde4ea',
  bg:        '#ffffff',
  bgAlt:     '#f8f9fb',
  text:      '#111827',
  muted:     '#6b7280',
  green:     '#166534',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpotData {
  xagUsdPerTroyOz: number | null;
  kagUsdPerGram:   number | null;
  oracleSource:    string;
  fetchedAt:       string;
  error?:          string;
}

interface PageProps {
  metadata:  KagAssetMetadata;
  disclosure: KagDisclosure;
  risk:      KagRiskSummary;
  spot:      SpotData;
}

interface PortfolioBalance {
  walletAddress:    string;
  formattedBalance: string;
  grams:            number;
  troyOunces:       number;
  estimatedUsdValue: number | null;
  kagUsdPerGram:    number | null;
  oracleSource:     string;
  warnings:         string[];
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ spot }: { spot: SpotData }) {
  return (
    <section style={{ background: S.bgAlt, borderBottom: `1px solid ${S.border}`, overflow: 'hidden' }}>
      {/* Hero image strip — silver-toned overlay */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '21/6', minHeight: 160, maxHeight: 280, background: '#1a2a38', overflow: 'hidden' }}>
        {/* Simulated silver bar texture via CSS */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(90deg, #2a3d52 0px, #35506a 2px, #1e3040 4px, #2a3d52 8px)',
          opacity: 0.7,
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(92,122,143,0.3) 0%, rgba(30,58,95,0.5) 50%, rgba(15,25,40,0.8) 100%)',
        }} />
        {/* Live badge */}
        <div style={{ position: 'absolute', bottom: 16, left: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.9)', border: `1px solid ${S.border}`,
            padding: '5px 12px',
            fontFamily: '"Courier New", monospace', fontSize: 10,
            color: S.navy, letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', flexShrink: 0 }} />
            Live · Ethereum Mainnet · KAG{spot.kagUsdPerGram ? ` $${spot.kagUsdPerGram.toFixed(4)}/g` : ''}
          </span>
        </div>
      </div>

      {/* Headline block */}
      <div style={{ padding: '32px 0 40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: S.muted, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '3px 8px', border: `1px solid ${S.border}`, background: S.bg }}>Axiom Supported Commodity</span>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: S.silverDk, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '3px 8px', border: `1px solid ${S.silver}50`, background: S.silverBg }}>KAG · Ethereum Mainnet · LIVE</span>
        </div>
        <h1 style={{
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 'clamp(32px, 6vw, 60px)',
          fontWeight: 700, color: S.navy, lineHeight: 1.08,
          marginBottom: 14, letterSpacing: '-0.01em',
        }}>
          Silver Reserve — Kinesis KAG<br />
          <span style={{ color: S.silver }}>LBMA 999 Silver · KMS Labs Issued · Axiom Supported.</span>
        </h1>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: S.muted, maxWidth: 680, margin: '0 auto 10px', lineHeight: 1.80 }}>
          KAG is the Axiom stack&apos;s primary silver exposure layer. Issued by KMS Labs within the Kinesis ecosystem — 1 KAG = 1 gram of LBMA Good Delivery 999 fine silver,
          allocated in KMS Labs&apos; vault network. Axiom supports KAG as a direct on-chain asset on Ethereum mainnet.
          A governance-approved silver sleeve inside AXAU is the Phase 2 design target.
        </p>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: S.muted, maxWidth: 600, margin: '0 auto 14px', lineHeight: 1.70, letterSpacing: '0.02em' }}>
          Axiom does not issue KAG. Axiom does not custody the underlying silver. KAG is issued by KMS Labs under Liechtenstein TVTG regulation.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="#balance" style={{
            display: 'inline-block', padding: '12px 28px',
            background: S.navy, color: '#fff',
            fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.12em',
            textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
          }}>
            LOOK UP KAG BALANCE →
          </a>
          <a href="https://etherscan.io/token/0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e" target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-block', padding: '12px 28px',
            border: `1px solid ${S.border}`, color: S.navy,
            fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.12em',
            textTransform: 'uppercase', textDecoration: 'none', background: S.bg,
          }}>
            VIEW CONTRACT ↗
          </a>
        </div>
      </div>

      {/* Live metrics strip */}
      <div style={{ borderTop: `1px solid ${S.border}`, padding: '12px 0', background: S.bg, display: 'flex', flexWrap: 'wrap', gap: 0 }}>
        {[
          { label: 'Asset',    value: 'KAG' },
          { label: 'Issuer',   value: 'KMS Labs / Kinesis' },
          { label: 'KAG/g',    value: spot.kagUsdPerGram   ? `$${spot.kagUsdPerGram.toFixed(4)}`  : '…', live: true },
          { label: 'XAG/toz',  value: spot.xagUsdPerTroyOz ? `$${spot.xagUsdPerTroyOz.toFixed(3)}` : '…', live: true },
          { label: 'Standard', value: 'LBMA 999' },
          { label: 'Network',  value: 'Ethereum' },
          { label: 'Oracle',   value: 'CoinGecko XAG' },
        ].map(({ label, value, live }) => (
          <div key={label} style={{
            flex: '1 1 auto', minWidth: 90,
            padding: '6px 14px', textAlign: 'center',
            borderRight: `1px solid ${S.borderAlt}`,
          }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: S.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</p>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: live ? S.silverDk : S.navy, fontWeight: 700 }}>{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Asset Architecture ───────────────────────────────────────────────────────

function AssetArchitecture() {
  const steps = [
    {
      id: 'A',
      from: 'LBMA Good Delivery Bar',
      to: 'KMS Labs Vault',
      label: 'Physical Custody',
      desc: '1 gram of 999 fine silver is vaulted with KMS Labs\' vault network. Physical custody, insurance, and allocated silver storage are managed entirely by KMS Labs.',
    },
    {
      id: 'B',
      from: 'KMS Labs',
      to: 'KAG ERC-20',
      label: 'On-Chain Issuance',
      desc: 'KMS Labs issues KAG on Ethereum mainnet. Contract: 0x56Ba…741B8e (verified). Each KAG represents 1 gram of allocated LBMA 999 silver in the vault.',
    },
    {
      id: 'C',
      from: 'Axiom Stack',
      to: 'ERC-20 balanceOf',
      label: 'Axiom Integration',
      desc: 'Axiom supports KAG as a read-only external asset. Portfolio lookups, spot pricing via CoinGecko XAG/USD, and balance verification — no custody, no deposits.',
    },
    {
      id: 'D',
      from: 'KAG Holder',
      to: 'KMS Labs Platform',
      label: 'Redemption Path',
      desc: 'KAG holders redeem directly with KMS Labs. Physical silver delivery requires KYC on the Kinesis platform. Redemption is outside Axiom\'s scope in Phase 1.',
    },
  ];

  return (
    <section style={{ borderBottom: `1px solid ${S.border}`, padding: '60px 0' }}>
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: S.silver, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Asset Architecture</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 600, color: S.navy, lineHeight: 1.15 }}>
          How KAG Holds Silver
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: S.muted, maxWidth: 540, marginTop: 10, lineHeight: 1.65 }}>
          Physical custody stays with KMS Labs. Axiom integrates at the ERC-20 layer — read-only, no custody, no wrapping in Phase 1.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0, border: `1px solid ${S.border}` }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{
            padding: '24px 20px',
            borderRight: i < steps.length - 1 ? `1px solid ${S.border}` : 'none',
            background: S.bg,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 32, height: 32, background: S.navy, color: '#fff', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Courier New", monospace', fontSize: 12, fontWeight: 700,
              }}>{step.id}</span>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: S.silver, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{step.label}</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: S.navy, fontWeight: 700 }}>{step.from}</span>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: S.muted }}>→</span>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: S.silver, fontWeight: 700 }}>{step.to}</span>
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: S.muted, lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: '14px 18px', background: S.bgAlt, border: `1px solid ${S.border}` }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: S.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>KAG Contract — Ethereum Mainnet</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {[
            { label: 'KAG Token', addr: '0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e', url: 'https://etherscan.io/token/0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e' },
            { label: 'Issuer',    addr: 'KMS Labs — kinesis.money', url: 'https://kinesis.money' },
            { label: 'Standard',  addr: 'ERC-20 · 18 decimals · 1 token = 1 gram', url: '' },
          ].map(c => (
            c.url ? (
              <a key={c.label} href={c.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: S.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>{c.label}</p>
                <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: S.navy }}>{c.addr} ↗</p>
              </a>
            ) : (
              <div key={c.label}>
                <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: S.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>{c.label}</p>
                <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: S.navy }}>{c.addr}</p>
              </div>
            )
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Live Balance Lookup ───────────────────────────────────────────────────────

function BalanceLookup({ kagUsdPerGram }: { kagUsdPerGram: number | null }) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<PortfolioBalance | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function lookup() {
    setError(null);
    setResult(null);
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError('Invalid Ethereum address — must be 0x followed by 40 hex characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/commodities/kag/balance?address=${encodeURIComponent(address)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const d = json.data;
      setResult({
        walletAddress:     d.walletAddress,
        formattedBalance:  d.formattedBalance,
        grams:             d.grams,
        troyOunces:        d.troyOunces,
        estimatedUsdValue: d.estimatedUsdValue,
        kagUsdPerGram:     d.kagUsdPerGram,
        oracleSource:      d.oracleSource,
        warnings:          d.warnings ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="balance" style={{ borderBottom: `1px solid ${S.border}`, padding: '60px 0' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: S.silver, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Portfolio Lookup</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 600, color: S.navy }}>
          Look Up KAG Balance
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: S.muted, marginTop: 6, maxWidth: 520, lineHeight: 1.6 }}>
          Check the KAG balance of any Ethereum wallet. Read-only — no deposits, no transfers, no Axiom-side ledger.
        </p>
      </div>

      <div style={{ border: `1px solid ${S.border}`, background: S.bgAlt, padding: '24px' }}>
        <div style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: S.muted, marginBottom: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Read-only · Ethereum mainnet · ERC-20 balanceOf
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value.trim())}
            placeholder="0x…"
            spellCheck={false}
            style={{
              flex: '1 1 360px', minWidth: '280px',
              padding: '10px 12px',
              border: `1px solid ${S.border}`,
              fontFamily: '"Courier New", monospace', fontSize: 13,
              background: S.bg, outline: 'none',
            }}
          />
          <button
            onClick={lookup}
            disabled={loading || !address}
            style={{
              padding: '10px 20px',
              border: `1px solid ${S.navy}`,
              background: loading ? '#888' : S.navy,
              color: '#fff',
              fontFamily: '"Courier New", monospace', fontSize: 12,
              cursor: loading || !address ? 'not-allowed' : 'pointer',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
            }}
          >
            {loading ? 'LOADING…' : 'LOOK UP →'}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', border: '1px solid #8b1a1a', background: '#fff8f8', color: '#8b1a1a', fontSize: 12, fontFamily: '"Courier New", monospace' }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 20, borderTop: `1px solid ${S.borderAlt}`, paddingTop: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { label: 'Wallet', value: result.walletAddress.slice(0, 10) + '…' + result.walletAddress.slice(-6), mono: true },
                { label: 'KAG Balance', value: result.formattedBalance + ' KAG', mono: true, highlight: true },
                { label: 'Grams', value: result.grams + ' g Ag', mono: true },
                { label: 'Troy Oz', value: result.troyOunces + ' toz', mono: true },
                { label: 'Est. USD Value', value: result.estimatedUsdValue !== null ? `$${result.estimatedUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '— (oracle unavailable)', mono: true },
                { label: 'Oracle', value: result.oracleSource, mono: false },
              ].map(row => (
                <div key={row.label} style={{ background: S.bg, border: `1px solid ${S.borderAlt}`, padding: '12px 14px' }}>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: S.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 4px' }}>{row.label}</p>
                  <p style={{ fontFamily: row.mono ? '"Courier New", monospace' : 'Georgia, serif', fontSize: 13, color: row.highlight ? S.silverDk : S.navy, fontWeight: row.highlight ? 700 : 400, margin: 0 }}>{row.value}</p>
                </div>
              ))}
            </div>
            {result.warnings.length > 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', border: '1px solid #d8c870', background: '#fffbf0', color: '#7a6010', fontSize: 12, lineHeight: 1.6 }}>
                {result.warnings.map((w, i) => <div key={i}>• {w}</div>)}
              </div>
            )}
          </div>
        )}

        <p style={{ marginTop: 14, fontSize: 11, color: S.muted, fontFamily: 'Georgia, serif', lineHeight: 1.6 }}>
          Axiom never holds your KAG. This is a read-only on-chain call to the KAG ERC-20 contract.
          Spot price via CoinGecko XAG/USD ÷ 31.1035 g/troy oz.
        </p>
      </div>
    </section>
  );
}

// ─── Reserve and Issuer Details ───────────────────────────────────────────────

function ReserveAndIssuer({ metadata, disclosure }: Pick<PageProps, 'metadata' | 'disclosure'>) {
  return (
    <section style={{ borderBottom: `1px solid ${S.border}`, padding: '60px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40, alignItems: 'start' }}>

        {/* Issuer panel */}
        <div>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: S.silver, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>Issuer</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'Issuer',         value: metadata.issuer },
              { label: 'Regulator',      value: metadata.issuerRegulator },
              { label: 'Platform',       value: 'kinesis.money', url: 'https://kinesis.money' },
              { label: 'Token standard', value: 'ERC-20 — Ethereum mainnet' },
              { label: 'Contract',       value: metadata.contractAddress, url: `https://etherscan.io/token/${metadata.contractAddress}`, mono: true, short: true },
              { label: 'Axiom role',     value: disclosure.axiomSupportStatement },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: `1px solid ${S.borderAlt}` }}>
                <dt style={{ minWidth: 140, fontFamily: '"Courier New", monospace', fontSize: 10, color: S.muted, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0, paddingTop: 1 }}>{row.label}</dt>
                <dd style={{ margin: 0, fontSize: 13, fontFamily: (row as any).mono ? '"Courier New", monospace' : 'Georgia, serif', color: S.text, lineHeight: 1.5 }}>
                  {(row as any).url ? (
                    <a href={(row as any).url} target="_blank" rel="noopener noreferrer" style={{ color: '#2d5a8e' }}>
                      {(row as any).short ? (row.value.slice(0, 10) + '…' + row.value.slice(-6) + ' ↗') : (row.value + ' ↗')}
                    </a>
                  ) : row.value}
                </dd>
              </div>
            ))}
          </div>
        </div>

        {/* Reserve panel */}
        <div>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: S.silver, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>Reserve Model</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Physical asset', desc: '999 fine silver bars — LBMA Good Delivery standard. Each KAG is 1 gram of allocated silver.', status: 'VERIFIED' },
              { label: 'Custody',        desc: 'Held in KMS Labs vault network — not Axiom. Monthly reserve attestations published at kinesis.money/reserves.', status: 'EXTERNAL' },
              { label: 'Redemption',     desc: 'KAG → physical silver via KMS Labs platform. Requires KYC. Minimum gram threshold applies.', status: 'KMS_LABS' },
              { label: 'Oracle (Axiom)', desc: 'Axiom reads XAG/USD from CoinGecko and converts using 31.1035 g/troy oz for spot display only.', status: 'READ_ONLY' },
            ].map(row => (
              <div key={row.label} style={{ border: `1px solid ${S.border}`, background: S.bg, padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 14, color: S.navy, fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: S.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{row.status}</span>
                </div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: S.muted, lineHeight: 1.55, margin: 0 }}>{row.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: '12px 16px', border: `1px solid ${S.border}`, background: S.bgAlt, fontSize: 12, fontFamily: 'Georgia, serif', color: S.muted, lineHeight: 1.6 }}>
            {disclosure.custodyStatement}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Phase 2 Roadmap — Silver Sleeve in AXAU ─────────────────────────────────

function Phase2Roadmap() {
  return (
    <section style={{ borderBottom: `1px solid ${S.border}`, padding: '60px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40, alignItems: 'start' }}>

        {/* Left: Roadmap explanation */}
        <div>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: S.silver, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Phase 2 Design Target</p>
          <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 600, color: S.navy, marginBottom: 16, lineHeight: 1.2 }}>
            Silver Sleeve Inside AXAU
          </h2>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: S.muted, lineHeight: 1.75, marginBottom: 20 }}>
            Rather than issuing a separate AXAG wrapper token, the Phase 2 design target is to add silver as a basket sleeve inside the existing AXAU reserve.
            AXAU&apos;s multi-layer reserve architecture was designed from the start to support additional commodity components admitted through governance.
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: S.muted, lineHeight: 1.75 }}>
            A silver sleeve adds silver exposure to AXAU holders without creating a second token, second audit surface, or second disclosure flip.
            AXAU becomes the reserve unit backed by both gold and silver — the monetary metals pairing that has anchored reserve systems for centuries.
          </p>

          {/* Governance gate callout */}
          <div style={{ marginTop: 20, padding: '14px 18px', border: `1px solid ${S.silver}50`, background: S.silverBg }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: S.silverDk, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 6px' }}>Required to Activate</p>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontFamily: 'Georgia, serif', fontSize: 13, color: S.muted, lineHeight: 1.7 }}>
              <li>AXM governance vote approving silver admission</li>
              <li>KAG-on-Arbitrum or cross-chain bridge resolution</li>
              <li>Reserve KAG acquisition and vault deposit</li>
              <li>External audit of the silver vault contract</li>
            </ul>
          </div>
        </div>

        {/* Right: Reserve layers */}
        <div>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: S.silver, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>AXAU Reserve Layers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                phase: 'Phase 1',
                name:   'Gold (XAU) — PAXG',
                asset:  'On-chain gold reserve · Arbitrum One',
                status: 'LIVE',
                active: true,
                color:  '#C9913A',
              },
              {
                phase: 'Phase 2',
                name:   'Silver (XAG) — KAG',
                asset:  'Silver sleeve · governance vote required',
                status: 'IN DESIGN',
                active: false,
                color:  S.silver,
                current: true,
              },
              {
                phase: 'Phase 3',
                name:   'Land (Real Property)',
                asset:  'Appraised US real estate',
                status: 'PLANNED',
                active: false,
                color:  '#6b7280',
              },
              {
                phase: 'Phase 4+',
                name:   'Additional Commodities',
                asset:  'Governance-approved assets',
                status: 'PLANNED',
                active: false,
                color:  '#6b7280',
              },
            ].map(layer => (
              <div key={layer.phase} style={{
                border: `1px solid ${layer.current ? S.silver : layer.active ? '#C9913A' : S.border}`,
                background: layer.current ? S.silverBg : layer.active ? '#fdf8ee' : S.bg,
                padding: '14px 16px',
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 32, height: 32, flexShrink: 0,
                  background: layer.active
                    ? 'radial-gradient(ellipse at 35% 30%, #FFE07A, #C9913A, #7A5010)'
                    : layer.current
                      ? `radial-gradient(ellipse at 35% 30%, #c8d8e8, ${S.silver}, #3d5a6f)`
                      : S.bgAlt,
                  border: `1px solid ${layer.color}40`,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 14, color: S.navy, fontWeight: 600 }}>{layer.name}</span>
                    <span style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: layer.active ? S.green : layer.current ? S.silverDk : S.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: layer.current ? 700 : 400 }}>{layer.status}</span>
                  </div>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: S.muted }}>{layer.asset}</span>
                  {layer.current && (
                    <div style={{ marginTop: 6 }}>
                      <a href="/axau" style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: S.navy, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', borderBottom: `1px solid ${S.navy}40` }}>
                        View AXAU Reserve →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* AXAG accurate note */}
          <div style={{ marginTop: 16, padding: '12px 16px', border: `1px solid ${S.borderAlt}`, background: S.bgAlt, fontSize: 12, fontFamily: 'Georgia, serif', color: S.muted, lineHeight: 1.65 }}>
            <strong style={{ fontFamily: '"Courier New", monospace', fontSize: 10, display: 'block', marginBottom: 4, color: S.navy, letterSpacing: '0.06em' }}>AXAG WRAPPER TOKEN STATUS</strong>
            AXAG is not live and is not issued. The Phase 2 design target is a silver sleeve inside AXAU rather than a standalone AXAG wrapper token.
            A standalone AXAG token path remains available if governance chooses it, but requires additional gates (KMS Labs ToS confirmation, wrapper token legal opinion, dedicated audit).
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Risk Summary ─────────────────────────────────────────────────────────────

function RiskSummary({ risk }: Pick<PageProps, 'risk'>) {
  const rows: { key: keyof KagRiskSummary; label: string }[] = [
    { key: 'custodyRisk',    label: 'Custody risk' },
    { key: 'reserveRisk',    label: 'Reserve risk' },
    { key: 'redemptionRisk', label: 'Redemption risk' },
    { key: 'regulatoryRisk', label: 'Regulatory risk' },
    { key: 'oracleRisk',     label: 'Oracle risk' },
    { key: 'liquidityRisk',  label: 'Liquidity risk' },
    { key: 'axiomScopeRisk', label: 'Axiom scope risk' },
  ];

  function levelColor(l: 'LOW' | 'MEDIUM' | 'HIGH') {
    return l === 'LOW' ? '#166534' : l === 'MEDIUM' ? '#92400e' : '#991b1b';
  }
  function levelBg(l: 'LOW' | 'MEDIUM' | 'HIGH') {
    return l === 'LOW' ? '#f0fdf4' : l === 'MEDIUM' ? '#fffbeb' : '#fef2f2';
  }

  return (
    <section style={{ borderBottom: `1px solid ${S.border}`, padding: '60px 0' }}>
      <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: S.silver, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Risk Assessment</p>
      <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 600, color: S.navy, marginBottom: 28 }}>
        Risk Dimensions
      </h2>
      <div style={{ border: `1px solid ${S.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: S.bgAlt }}>
              <th style={{ padding: '10px 16px', fontFamily: '"Courier New", monospace', fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'left', borderBottom: `2px solid ${S.border}`, width: 180 }}>Dimension</th>
              <th style={{ padding: '10px 16px', fontFamily: '"Courier New", monospace', fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'left', borderBottom: `2px solid ${S.border}`, width: 90 }}>Level</th>
              <th style={{ padding: '10px 16px', fontFamily: '"Courier New", monospace', fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'left', borderBottom: `2px solid ${S.border}` }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label }) => {
              const r = risk[key];
              return (
                <tr key={key} style={{ borderBottom: `1px solid ${S.borderAlt}` }}>
                  <td style={{ padding: '10px 16px', fontFamily: '"Courier New", monospace', fontSize: 11, color: S.navy, fontWeight: 600 }}>{label}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px',
                      fontSize: 10, fontFamily: '"Courier New", monospace', letterSpacing: '0.05em',
                      border: `1px solid ${levelColor(r.level)}`,
                      color: levelColor(r.level), background: levelBg(r.level),
                    }}>
                      {r.level}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'Georgia, serif', fontSize: 12, color: S.muted, lineHeight: 1.6 }}>{r.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Disclosures ──────────────────────────────────────────────────────────────

function Disclosures({ metadata, disclosure }: Pick<PageProps, 'metadata' | 'disclosure'>) {
  return (
    <section style={{ padding: '48px 0' }}>
      <div style={{ border: `1px solid ${S.border}`, background: S.bgAlt, padding: '24px' }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: S.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>Important Disclosures</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            'Axiom does not issue KAG. KAG is issued by KMS Labs within the Kinesis ecosystem.',
            'Axiom does not custody the underlying physical silver. Custody is managed by KMS Labs.',
            'Silver market prices (XAG/USD) fluctuate. The USD value of KAG may increase or decrease.',
            'Redemption of KAG for physical silver is subject entirely to KMS Labs terms and conditions.',
            'AXAG is not live and is not issued. Phase 2 is a silver sleeve design target inside AXAU, pending governance vote.',
            disclosure.regulatoryStatement,
          ].map((notice, i) => (
            <p key={i} style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: S.muted, lineHeight: 1.6, paddingLeft: 12, borderLeft: `2px solid ${S.borderAlt}` }}>
              {notice}
            </p>
          ))}
        </div>
        <div style={{ paddingTop: 16, borderTop: `1px solid ${S.borderAlt}`, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {[
            { label: 'KAG Contract',  addr: '0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e', url: 'https://etherscan.io/token/0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e' },
            { label: 'Reserves',      addr: 'kinesis.money/reserves',                      url: 'https://kinesis.money/reserves' },
            { label: 'API: KAG status', addr: '/api/commodities/kag/status',                url: '/api/commodities/kag/status' },
          ].map(({ label, addr, url }) => (
            <a key={label} href={url} target={url.startsWith('http') ? '_blank' : undefined} rel={url.startsWith('http') ? 'noopener noreferrer' : undefined} style={{ textDecoration: 'none' }}>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: S.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: S.navy }}>{addr} ↗</p>
            </a>
          ))}
        </div>
        <p style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${S.borderAlt}`, fontFamily: 'Georgia, serif', fontSize: 11, color: S.muted }}>
          Effective date: {metadata.effectiveDate}. This page does not constitute an offer to sell or solicitation to purchase any security, commodity, or digital asset.
          Participants should obtain independent legal and tax advice before engaging with any asset referenced on this page.
        </p>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KagPage({ metadata, disclosure, risk, spot }: PageProps) {
  return (
    <DesignLawLayout>
      <Head>
        <title>Silver Reserve — Kinesis KAG · Axiom Supported | Axiom Protocol</title>
        <meta
          name="description"
          content="KAG is Axiom's primary silver exposure layer — 1 KAG = 1 gram LBMA 999 fine silver, issued by KMS Labs on Ethereum mainnet. Phase 2 silver sleeve in AXAU pending governance vote. AXAG is not live and is not issued."
        />
      </Head>

      <Hero spot={spot} />
      <AssetArchitecture />
      <BalanceLookup kagUsdPerGram={spot.kagUsdPerGram} />
      <ReserveAndIssuer metadata={metadata} disclosure={disclosure} />
      <Phase2Roadmap />
      <RiskSummary risk={risk} />
      <Disclosures metadata={metadata} disclosure={disclosure} />
    </DesignLawLayout>
  );
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  const [metadata, disclosure, risk, spotRaw] = await Promise.all([
    Promise.resolve(getKagAssetMetadata()),
    Promise.resolve(getKagDisclosure()),
    Promise.resolve(getKagRiskSummary()),
    getKagUsdValue(1),
  ]);

  const spot: SpotData = {
    xagUsdPerTroyOz: spotRaw.xagUsdPerTroyOz,
    kagUsdPerGram:   spotRaw.kagUsdPerGram,
    oracleSource:    spotRaw.oracleSource,
    fetchedAt:       spotRaw.fetchedAt,
    ...(spotRaw.error ? { error: spotRaw.error } : {}),
  };

  return { props: { metadata, disclosure, risk, spot } };
};
