import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useWallet } from "../components/WalletConnect/WalletContext";
import { DesignLawLayout } from "../components/design-law";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       '#fafaf8',
  bgAlt:    '#f4f3ef',
  bgGold:   '#fdf8ec',
  bgNavy:   '#f0f3f7',
  border:   '#d1c9b8',
  borderAlt:'#e5e0d6',
  navy:     '#1e3a5f',
  gold:     '#b8860b',
  green:    '#166534',
  muted:    '#6b7280',
  text:     '#1a1a18',
};

// ─── NAV data types ───────────────────────────────────────────────────────────
interface AXUSDState {
  totalSupply?: string;
  totalSupplyFormatted?: string;
  psmUsdcReserve?: string;
  coverageRatioPct?: string;
  pegPrice?: string;
  mintFeeBps?: number;
  redeemFeeBps?: number;
  mintPaused?: boolean;
  psmPaused?: boolean;
  fetchedAt?: string;
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const [data, setData] = useState<AXUSDState>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/axusd/supply').then(r => r.json()),
      fetch('/api/axusd/psm').then(r => r.json()),
    ]).then(([supplyResult, psmResult]) => {
      const merged: AXUSDState = {};
      if (supplyResult.status === 'fulfilled') {
        const s = supplyResult.value?.data ?? supplyResult.value;
        if (s?.totalSupply) {
          const num = parseFloat(s.totalSupply);
          merged.totalSupplyFormatted = isNaN(num) ? s.totalSupply : num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }
      }
      if (psmResult.status === 'fulfilled') {
        const p = psmResult.value;
        const canonical = p?.data?.canonical;
        if (canonical) {
          merged.psmUsdcReserve = canonical.usdcReserves ? `$${parseFloat(canonical.usdcReserves).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined;
          merged.mintPaused = canonical.paused;
          merged.mintFeeBps = canonical.mintFee;
        }
      }
      setData(merged);
      setLoading(false);
    });
  }, []);

  const strip = [
    { label: 'Token', value: 'AXUSD' },
    { label: 'Layer', value: 'Layer 02 Settlement' },
    { label: 'Peg', value: data.pegPrice ? `$${data.pegPrice}` : '$1.0000' },
    { label: 'Supply', value: data.totalSupplyFormatted ? `${data.totalSupplyFormatted} AXUSD` : (loading ? '…' : 'N/A') },
    { label: 'PSM Reserve', value: data.psmUsdcReserve ?? (loading ? '…' : 'N/A') },
    { label: 'Standard', value: 'ERC-3643' },
    { label: 'Network', value: 'Arbitrum One' },
  ];

  return (
    <section style={{ background: C.bgAlt, borderBottom: `1px solid ${C.border}`, padding: '48px 0 0' }}>
      <div style={{ textAlign: 'center', padding: '0 20px 40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{
            fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            padding: '3px 8px', border: `1px solid ${C.border}`, background: C.bg,
          }}>Layer 02 Settlement</span>
          <span style={{
            fontFamily: '"Courier New", monospace', fontSize: 9, color: C.navy,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            padding: '3px 8px', border: `1px solid ${C.navy}30`, background: C.bgNavy,
          }}>ERC-3643 Identity-Gated</span>
          <span style={{
            fontFamily: '"Courier New", monospace', fontSize: 9, color: C.green,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            padding: '3px 8px', border: `1px solid #16653440`, background: '#f0fdf4',
          }}>LIVE</span>
        </div>
        <h1 style={{
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 'clamp(30px, 5.5vw, 56px)',
          fontWeight: 700, color: C.navy, lineHeight: 1.08,
          marginBottom: 14, letterSpacing: '-0.01em',
        }}>
          Unified AXUSD<br />
          <span style={{ color: C.gold }}>Settlement Layer Stablecoin</span>
        </h1>
        <p style={{
          fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted,
          maxWidth: 600, margin: '0 auto 24px', lineHeight: 1.75,
        }}>
          AXUSD is Axiom Protocol&apos;s Layer 02 settlement token — a USD-pegged instrument issued through
          the Peg Stability Module (PSM) and governed by an ERC-3643 identity framework. It connects
          directly to Layer 01 reserve infrastructure (AXAU/PAXG) and functions as the primary unit
          of account across the protocol.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/axusd-3643" style={{
            display: 'inline-block', padding: '12px 28px',
            background: C.navy, color: '#fff',
            fontFamily: '"Courier New", monospace', fontSize: 12,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            textDecoration: 'none', fontWeight: 700,
          }}>
            AXUSD ERC-3643 TERMINAL →
          </a>
          <a href="/dex" style={{
            display: 'inline-block', padding: '12px 28px',
            border: `1px solid ${C.border}`, color: C.navy,
            fontFamily: '"Courier New", monospace', fontSize: 12,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            textDecoration: 'none', background: C.bg,
          }}>
            DEX SETTLEMENT VENUE
          </a>
        </div>
      </div>

      {/* Token strip */}
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.bg, display: 'flex', flexWrap: 'wrap' }}>
        {strip.map(({ label, value }) => (
          <div key={label} style={{
            flex: '1 1 auto', minWidth: 100,
            padding: '8px 14px', textAlign: 'center',
            borderRight: `1px solid ${C.borderAlt}`,
          }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</p>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.navy, fontWeight: 700 }}>{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Architecture Strip ───────────────────────────────────────────────────────
function ArchitectureStrip() {
  const layers = [
    { layer: 'Layer 01', label: 'Reserve', token: 'AXAU', detail: 'PAXG-backed gold reserve instrument' },
    { layer: 'Layer 02', label: 'Settlement', token: 'AXUSD', detail: 'PSM-issued USD settlement token', active: true },
    { layer: 'Layer 02', label: 'DEX Venue', token: 'EulerSwap', detail: 'Primary settlement liquidity pool' },
    { layer: 'Layer 03', label: 'Asset Pipeline', token: 'RE + DePIN', detail: 'Real asset onboarding layer' },
    { layer: 'Layer 04', label: 'Intelligence', token: 'MIRDT + Sentinel', detail: 'Capital advisory signal engine' },
  ];

  return (
    <section style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '32px 0' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>
          Protocol Architecture — AXUSD Position
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0 }}>
          {layers.map((l, i) => (
            <div key={i} style={{
              padding: '16px 14px',
              borderLeft: `1px solid ${C.border}`,
              borderTop: `1px solid ${C.border}`,
              borderBottom: l.active ? `2px solid ${C.navy}` : `1px solid ${C.border}`,
              borderRight: i === layers.length - 1 ? `1px solid ${C.border}` : 'none',
              background: l.active ? C.bgNavy : C.bg,
            }}>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>{l.layer}</p>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: l.active ? C.navy : C.text, fontWeight: l.active ? 700 : 400, marginBottom: 4 }}>{l.token}</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 10, color: C.muted, lineHeight: 1.5 }}>{l.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── PSM Section ──────────────────────────────────────────────────────────────
function PSMSection() {
  const { walletState } = useWallet();
  const isConnected = walletState?.isConnected && walletState?.address;

  const [psmData, setPsmData] = useState<{
    usdcReserve?: string;
    feePercent?: string;
    available?: string;
    paused?: boolean;
  }>({});

  useEffect(() => {
    fetch('/api/axusd/psm')
      .then(r => r.json())
      .then(d => {
        const c = d?.data?.canonical;
        if (c) {
          setPsmData({
            usdcReserve: c.usdcReserves ? `$${parseFloat(c.usdcReserves).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
            feePercent: c.mintFeePct ?? '0.10%',
            paused: c.paused,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '56px 0' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Primary Entry Mechanism</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 700, color: C.navy, marginBottom: 12 }}>
          Peg Stability Module (PSM)
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, maxWidth: 620, lineHeight: 1.75, marginBottom: 36 }}>
          The PSM is the canonical path for acquiring AXUSD. It accepts USDC at a 1:1 rate with a
          protocol fee, and redeems AXUSD back to USDC from the reserve pool. There is no CDP
          collateral position, no liquidation risk, and no variable rate. Access requires a valid
          ERC-3643 identity credential.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0, border: `1px solid ${C.border}`, marginBottom: 36 }}>
          {[
            { label: 'Mechanism', value: 'USDC → AXUSD (1:1)' },
            { label: 'USDC Reserve', value: psmData.usdcReserve ?? '…' },
            { label: 'Protocol Fee', value: psmData.feePercent ?? '0.10%' },
            { label: 'Status', value: psmData.paused ? 'PAUSED' : 'ACTIVE', color: psmData.paused ? '#dc2626' : C.green },
            { label: 'Identity Req.', value: 'ERC-3643 Required' },
            { label: 'Redeem Path', value: 'AXUSD → USDC' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: '18px 20px', borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 13, color: color ?? C.navy, fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Identity gate notice */}
        <div style={{ border: `1px solid ${C.navy}30`, background: C.bgNavy, padding: '20px 24px', marginBottom: 24 }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.navy, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>
            ERC-3643 Identity Framework
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.text, lineHeight: 1.7, marginBottom: 12 }}>
            AXUSD operates under an ERC-3643 identity gating framework. All mint and redeem operations
            require an on-chain credential issued through the Axiom identity verification workflow. Wallets
            without a valid credential cannot execute PSM operations, regardless of token balance.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              'On-chain identity check before every transfer',
              'Credential issued after ops team verification',
              'Non-transferable — tied to originating address',
              'Revocable by protocol governance',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.navy, display: 'inline-block', marginTop: 6, flexShrink: 0 }} />
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* No credential path */}
        <div style={{ border: `1px solid ${C.border}`, background: C.bgAlt, padding: '20px 24px' }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>
            No Credential Yet?
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 14 }}>
            If your wallet does not yet hold a valid ERC-3643 credential, PSM and DEX transfers will be
            blocked at the contract level. To request identity verification and credential issuance,
            apply through the early access program. The review process is manual and typically takes 2–5
            business days.
          </p>
          <a href="/axusd-3643" style={{
            display: 'inline-block', padding: '10px 22px',
            background: C.navy, color: '#fff',
            fontFamily: '"Courier New", monospace', fontSize: 11,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            textDecoration: 'none', fontWeight: 700,
          }}>
            REQUEST IDENTITY CREDENTIAL →
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Reserve Connection ───────────────────────────────────────────────────────
function ReserveConnection() {
  return (
    <section style={{ background: C.bgAlt, borderBottom: `1px solid ${C.border}`, padding: '56px 0' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Reserve Architecture</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, color: C.navy, marginBottom: 12 }}>
          AXUSD → AXAU Reserve Relationship
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, maxWidth: 620, lineHeight: 1.75, marginBottom: 36 }}>
          AXUSD is the protocol&apos;s settlement-layer token. At the reserve layer, AXAU (Layer 01)
          provides the hard-asset backing. AXUSD participants gain exposure to protocol operations;
          the treasury maintains AXAU coverage positions to anchor reserve depth.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: `1px solid ${C.border}` }}>
          {[
            {
              title: 'PAXG (Gold Vault)',
              sub: 'Layer 01 Reserve Asset',
              desc: 'On-chain Paxos Gold (PAXG) held in the GoldVault contract. Verified via Chainlink XAU/USD oracle. 100%+ target coverage ratio.',
              href: '/axau',
              cta: 'VIEW AXAU RESERVE',
            },
            {
              title: 'PSM (USDC Pool)',
              sub: 'Layer 02 Issuance Engine',
              desc: 'USDC deposited in the Peg Stability Module becomes the primary backing for AXUSD at issuance. Reserve ratio monitored continuously.',
              href: null,
              cta: null,
            },
            {
              title: 'DEX Settlement Venue',
              sub: 'Layer 02 Liquidity',
              desc: 'EulerSwap is the primary on-chain settlement venue for AXUSD. Concentrated liquidity around the $1.00 peg anchors secondary market pricing.',
              href: '/dex',
              cta: 'VIEW DEX VENUE',
            },
          ].map((col, i) => (
            <div key={i} style={{
              padding: '24px 20px',
              borderRight: i < 2 ? `1px solid ${C.border}` : 'none',
            }}>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>{col.sub}</p>
              <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 10 }}>{col.title}</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 14 }}>{col.desc}</p>
              {col.href && (
                <a href={col.href} style={{
                  fontFamily: '"Courier New", monospace', fontSize: 10,
                  color: C.navy, letterSpacing: '0.1em', textTransform: 'uppercase',
                  textDecoration: 'none', borderBottom: `1px solid ${C.navy}`,
                }}>
                  {col.cta}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Issuance Mechanics ───────────────────────────────────────────────────────
function IssuanceMechanics() {
  const steps = [
    {
      num: '01',
      title: 'Identity Verification',
      detail: 'Wallet submits to the Axiom identity workflow. Credential is issued on-chain as an ERC-3643 claim after ops review. Non-transferable.',
    },
    {
      num: '02',
      title: 'USDC Deposit → PSM',
      detail: 'Credentialed wallet deposits USDC into the PSM contract. Contract verifies identity claim on-chain before accepting the deposit.',
    },
    {
      num: '03',
      title: 'AXUSD Minted at 1:1',
      detail: 'PSM issues AXUSD at a 1:1 rate minus the protocol fee (currently 10 bps). No collateral position is created. No liquidation risk.',
    },
    {
      num: '04',
      title: 'USDC Held in Reserve',
      detail: 'The deposited USDC is held in the PSM reserve pool. Reserve ratio is reported continuously via the solvency console.',
    },
    {
      num: '05',
      title: 'Transfer & Settlement',
      detail: 'AXUSD can be transferred only to other credentialed wallets. The ERC-3643 hook enforces this at every transfer, not just at issuance.',
    },
    {
      num: '06',
      title: 'Redeem Path',
      detail: 'To redeem, credentialed wallets return AXUSD to the PSM and receive USDC minus the protocol fee. Reserve pool must have sufficient USDC.',
    },
  ];

  return (
    <section style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '56px 0' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Issuance Mechanics</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, color: C.navy, marginBottom: 32 }}>
          PSM Mint → Settlement Lifecycle
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 0 }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              padding: '22px 20px',
              borderLeft: `1px solid ${C.border}`,
              borderTop: `1px solid ${C.border}`,
              borderBottom: i >= steps.length - 3 ? `1px solid ${C.border}` : 'none',
              borderRight: i % 3 === 2 ? `1px solid ${C.border}` : 'none',
            }}>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 20, fontWeight: 700, color: C.borderAlt, marginBottom: 10 }}>{s.num}</p>
              <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 8 }}>{s.title}</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contract Registry ────────────────────────────────────────────────────────
function ContractRegistry() {
  const contracts = [
    { name: 'AXUSD Token (ERC-3643)', address: '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C', status: 'LIVE', note: 'Settlement layer token contract' },
    { name: 'Peg Stability Module', address: '0x5db58d9c21369d1532a48Bdd658E4Fe415404922', status: 'LIVE', note: 'USDC ↔ AXUSD issuance engine' },
    { name: 'Oracle Adapter', address: '0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D', status: 'LIVE', note: 'ERC-7726 pricing oracle adapter' },
    { name: 'Backstop USDC', address: '0x54438249457694eB5431811f3f19444Af0a01B29', status: 'LIVE', note: 'Secondary reserve backstop pool' },
    { name: 'Rate Limiter', address: '0xE19E4172786A193997f985edC27f7932a0B65327', status: 'LIVE', note: 'Flow control and circuit breaker' },
    { name: 'Market Operations', address: '0x42E31Ac3A6aF2B2925a0B979A05156833b6660E4', status: 'CONFIGURED', note: 'Ops team authorization layer' },
    { name: 'Vault Engine (CDP)', address: '0x4675C09dDC1B3094cd86F6b59904CC3E06c98028', status: 'DEPRECATED', note: 'Legacy — CDP issuance path retired' },
    { name: 'T-Bill Vault', address: '0x091c146EC7c348552319E8D17cF7D0C9A4b3BCd4', status: 'PLANNED', note: 'Real-world asset reserve expansion' },
  ];

  const statusColor = (s: string) =>
    s === 'LIVE' ? C.green : s === 'CONFIGURED' ? '#92400e' : s === 'DEPRECATED' ? C.muted : '#6b7280';

  return (
    <section style={{ background: C.bgAlt, borderBottom: `1px solid ${C.border}`, padding: '56px 0' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Deployed Infrastructure</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: C.navy, marginBottom: 28 }}>
          AXUSD Contract Registry
        </h2>
        <div style={{ border: `1px solid ${C.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1fr 2fr', borderBottom: `1px solid ${C.border}`, padding: '10px 16px', background: C.bg }}>
            {['Contract', 'Address', 'Status', 'Note'].map(h => (
              <p key={h} style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{h}</p>
            ))}
          </div>
          {contracts.map((c, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr 2.5fr 1fr 2fr',
              borderBottom: i < contracts.length - 1 ? `1px solid ${C.borderAlt}` : 'none',
              padding: '12px 16px',
              background: c.status === 'DEPRECATED' ? '#f9f7f4' : C.bg,
              opacity: c.status === 'DEPRECATED' ? 0.7 : 1,
            }}>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.navy, fontWeight: 600 }}>{c.name}</p>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.muted, wordBreak: 'break-all' }}>
                <a
                  href={`https://arbiscan.io/address/${c.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: C.muted, textDecoration: 'none', borderBottom: `1px dotted ${C.muted}` }}
                >
                  {c.address.slice(0, 10)}…{c.address.slice(-8)}
                </a>
              </p>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: statusColor(c.status), fontWeight: 700 }}>{c.status}</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted }}>{c.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const items = [
    {
      q: 'What is AXUSD and how is it different from other stablecoins?',
      a: 'AXUSD is an ERC-3643-gated USD-pegged token issued exclusively through the Peg Stability Module. Unlike CDP stablecoins, there is no collateral position, no liquidation risk, and no variable stability fee. Unlike permissionless stablecoins, every transfer enforces on-chain identity verification.',
    },
    {
      q: 'What does ERC-3643 identity gating mean in practice?',
      a: 'Every AXUSD transfer — including PSM mint, redeem, and DEX swaps — triggers an on-chain check that the sending and receiving wallets hold a valid identity claim issued by Axiom. Wallets without a credential cannot receive or send AXUSD, regardless of token balance. This enforcement is at the contract level, not the application layer.',
    },
    {
      q: 'How do I get a credential if I do not have one?',
      a: 'Submit an access request through the AXUSD ERC-3643 Terminal page. The Axiom operations team performs identity review manually. Upon approval, a credential claim is issued to your wallet address on-chain. This process typically takes 2–5 business days.',
    },
    {
      q: 'Is there a CDP (collateralized debt position) mint path?',
      a: 'The legacy CDP issuance path (WETH/WBTC at 150% collateralization) has been retired. The Vault Engine contract remains deployed but is not in active use. All AXUSD issuance now occurs through the PSM at a 1:1 rate against USDC.',
    },
    {
      q: 'How does AXUSD relate to AXAU?',
      a: 'AXAU is the Layer 01 reserve instrument, backed by PAXG (on-chain Paxos Gold). AXUSD is the Layer 02 settlement token backed by USDC in the PSM. The treasury maintains AXAU coverage positions to provide hard-asset depth behind the protocol\'s broader reserve pool. They serve distinct roles within the same capital stack.',
    },
    {
      q: 'What is the protocol fee for PSM operations?',
      a: 'The PSM fee is currently 10 basis points (0.10%) for both mint and redeem operations. Fees accrue to the protocol treasury. Fee parameters are adjustable by governance.',
    },
    {
      q: 'How does AXUSD align with the GENIUS Act framework?',
      a: 'AXUSD is designed to align with key GENIUS Act principles: 100%+ reserve ratio target, asset segregation, on-chain reserve verification, and compliance-layer identity gating. No definitive legal compliance claim is made. Users should consult qualified legal counsel for jurisdiction-specific guidance.',
    },
  ];

  return (
    <section style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '56px 0' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 20px' }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Reference</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, color: C.navy, marginBottom: 28 }}>
          Frequently Asked Questions
        </h2>
        <div style={{ border: `1px solid ${C.border}` }}>
          {items.map((item, i) => (
            <div key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid ${C.borderAlt}` : 'none' }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                }}
              >
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.navy, fontWeight: 600, lineHeight: 1.5 }}>{item.q}</p>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 16, color: C.muted, flexShrink: 0, marginTop: 2 }}>
                  {open === i ? '−' : '+'}
                </span>
              </button>
              {open === i && (
                <div style={{ padding: '0 20px 18px', borderTop: `1px solid ${C.borderAlt}` }}>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.75, paddingTop: 14 }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Disclosures ──────────────────────────────────────────────────────────────
function Disclosures() {
  return (
    <section style={{ padding: '40px 0' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ border: `1px solid ${C.border}`, background: C.bgAlt, padding: '24px' }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>Important Disclosures</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
            {[
              'AXUSD is not a security, investment contract, or regulated financial product. It is a protocol-managed settlement instrument.',
              'Smart contract risk exists. Contracts are unaudited at this stage. Use only funds you can afford to lose.',
              'The CDP issuance path (WETH/WBTC collateral) has been retired. The Vault Engine contract is deployed but not in active use.',
              'AXUSD is designed to align with the GENIUS Act framework for payment stablecoins. No legal compliance is guaranteed.',
              'ERC-3643 credential requirements may be updated by governance. Non-credentialed wallets will lose transfer ability.',
              'PSM reserves may not cover large simultaneous redemption events. Reserve depth is disclosed in real time on the solvency console.',
            ].map((text, i) => (
              <div key={i} style={{ padding: '12px 14px', border: `1px solid ${C.borderAlt}`, background: C.bg }}>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: C.muted, lineHeight: 1.65 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AXUSDPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>AXUSD — Layer 02 Settlement Stablecoin | Axiom Protocol</title>
        <meta name="description" content="AXUSD is Axiom Protocol's Layer 02 settlement token — issued through the Peg Stability Module (PSM), identity-gated via ERC-3643, and anchored to the Layer 01 AXAU reserve infrastructure on Arbitrum One." />
      </Head>

      <Hero />
      <ArchitectureStrip />
      <PSMSection />
      <ReserveConnection />
      <IssuanceMechanics />
      <ContractRegistry />
      <FAQ />
      <Disclosures />
    </DesignLawLayout>
  );
}
