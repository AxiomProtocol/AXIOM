import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { DesignLawLayout } from '../components/design-law';
import { PageVisualSuite } from '../components/visual';
import { CollateralClassificationPanel } from '../components/disclosure/CollateralClassificationPanel';
import { SeoHead } from '../components/seo/SeoHead';
import { ChevronDown } from 'lucide-react';

const LiveNavPanel = dynamic(() => import('../components/axau/LiveNavPanel'), { ssr: false });

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  navy:      '#1e3a5f',
  navyLight: '#2a4a73',
  gold:      '#b8860b',
  goldBg:    '#fdf8ee',
  border:    '#d1d5db',
  borderAlt: '#e5e7eb',
  bg:        '#ffffff',
  bgAlt:     '#fafaf8',
  bgGold:    '#fdf8ee',
  text:      '#111827',
  muted:     '#6b7280',
  green:     '#166534',
};

// ─── Removed decorative 3D icon components in favor of institutional data panels ─

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  const { address, isConnected }      = useAccount();
  const [xauPrice, setXauPrice]       = useState<string | null>(null);
  const [coveragePct, setCoveragePct] = useState<string | null>(null);
  const [coverageBps, setCoverageBps] = useState<number | null>(null);
  const [navPerToken, setNavPerToken] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<string | null>(null);
  const [slots, setSlots]             = useState<{ remaining: number; approved: number; cap: number; isFull: boolean } | null>(null);
  const [identityVerified, setIdentityVerified] = useState<boolean | null>(null);

  useEffect(() => {
    function fetchNav() {
      fetch('/api/axau/nav')
        .then(r => r.json())
        .then(d => {
          setXauPrice(d.xauUsdPrice);
          if (typeof d.coverageRatioPct === 'string') setCoveragePct(d.coverageRatioPct);
          if (typeof d.coverageRatioBps === 'number') setCoverageBps(d.coverageRatioBps);
          if (typeof d.backingNavPerToken === 'string') setNavPerToken(d.backingNavPerToken);
          if (typeof d.totalSupplyFormatted === 'string') setTotalSupply(d.totalSupplyFormatted);
        })
        .catch(() => {});
    }
    fetchNav();
    const id = setInterval(fetchNav, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch('/api/axau/access-slots')
      .then(r => r.json())
      .then(d => setSlots(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!address) { setIdentityVerified(null); return; }
    let cancelled = false;
    fetch(`/api/erc3643/identity/check?wallet=${address}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setIdentityVerified(d.verified === true); })
      .catch(() => { if (!cancelled) setIdentityVerified(null); });
    return () => { cancelled = true; };
  }, [address]);

  return (
    <section style={{ background: C.bgAlt, borderBottom: `1px solid ${C.border}`, padding: '0 0 0 0', overflow: 'hidden' }}>
      {/* Hero image strip */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '21/6', minHeight: 160, maxHeight: 340 }}>
        <Image
          src="/axau/hero-gold-vault.png"
          alt="Gold vault reserve"
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center 45%' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(250,250,248,0.65) 80%, #fafaf8 100%)' }} />
        {/* Live badge overlaid on image */}
        <div style={{ position: 'absolute', bottom: 16, left: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.9)', border: `1px solid ${C.border}`,
            padding: '5px 12px',
            fontFamily: '"Courier New", monospace', fontSize: 10,
            color: C.navy, letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', flexShrink: 0 }} />
            Mint Active · Arbitrum One{xauPrice && ` · XAU $${xauPrice}`}
          </span>
        </div>
      </div>

      {/* Headline block */}
      <div style={{ padding: '32px 0 40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '3px 8px', border: `1px solid ${C.border}`, background: C.bg }}>Layer 02 Reserve Infrastructure</span>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '3px 8px', border: `1px solid ${C.gold}40`, background: C.bgGold }}>AXAU · Arbitrum One · LIVE</span>
        </div>
        <h1 style={{
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 'clamp(32px, 6vw, 60px)',
          fontWeight: 700, color: C.navy, lineHeight: 1.08,
          marginBottom: 14, letterSpacing: '-0.01em',
        }}>
          AXAU — Layer 02 Reserve Unit<br />
          <span style={{ color: C.gold }}>Structured Around PAXG. Coverage-Enforced. On-Chain.</span>
        </h1>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, maxWidth: 640, margin: '0 auto 10px', lineHeight: 1.80 }}>
          AXAU is the Axiom Protocol&apos;s Layer 02 reserve unit — the settlement destination for capital that has moved through the AXUSD rail and elected reserve exposure. Reserve positions are structured around PAXG on Arbitrum One. Coverage ratio is enforced on-chain by the NAVEngine contract before every mint — the system cannot over-issue by design. ERC-3643 identity credential required.
        </p>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted, maxWidth: 600, margin: '0 auto 14px', lineHeight: 1.70, letterSpacing: '0.02em' }}>
          Not a gold ETF. Not a wrapped token. A reserve unit with on-chain coverage enforcement and two independently verifiable access paths.
        </p>
        {/* Path comparison pills */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ border: `2px solid ${C.navy}`, padding: '8px 16px', background: C.bg }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 3px' }}>Path A — Direct</p>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.navy, fontWeight: 700, margin: 0 }}>PAXG → AXAU · One Transaction · Instant</p>
          </div>
          <div style={{ border: `1px solid ${C.gold}40`, padding: '8px 16px', background: C.bgGold }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 3px' }}>Path B — Assisted</p>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.navy, fontWeight: 700, margin: 0 }}>AXUSD → AXAU · Ops-Mediated · ~1 Business Day</p>
          </div>
        </div>

        {/* Slot urgency strip — always visible when data loaded */}
        {slots && !slots.isFull && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: C.bgGold, border: `1px solid ${C.gold}60`, borderLeft: `3px solid ${slots.remaining <= 20 ? '#b45309' : C.gold}`, padding: '8px 16px', marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: slots.remaining <= 20 ? '#b45309' : C.gold, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
              {slots.remaining <= 10
                ? `Only ${slots.remaining} founding spot${slots.remaining === 1 ? '' : 's'} remaining`
                : slots.remaining <= 20
                ? `${slots.remaining} of 100 founding spots remaining — filling fast`
                : `${slots.approved} of 100 founding spots claimed`}
            </span>
            <a href="/axau-early-access" style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.navy, textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `1px solid ${C.navy}` }}>Apply →</a>
          </div>
        )}

        {/* Wallet-aware CTAs — 3 states */}
        {isConnected && identityVerified === true ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="/axau-buy" style={{
              display: 'inline-block', padding: '12px 28px',
              background: C.navy, color: '#fff',
              fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
            }}>
              MINT OR REDEEM AXAU →
            </a>
            <a href="/axau-buy" style={{
              display: 'inline-block', padding: '12px 28px',
              border: `1px solid ${C.border}`, color: C.navy,
              fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase', textDecoration: 'none', background: C.bg,
            }}>
              REDEEM AXAU
            </a>
          </div>
        ) : isConnected && identityVerified === false ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="/axau-early-access" style={{
              display: 'inline-block', padding: '12px 28px',
              background: C.gold, color: '#fff',
              fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
            }}>
              APPLY FOR EARLY ACCESS →{slots && !slots.isFull ? ` (${slots.remaining} SPOTS LEFT)` : ''}
            </a>
            <a href="/axau-buy#assisted-mint" style={{
              display: 'inline-block', padding: '12px 28px',
              border: `1px solid ${C.border}`, color: C.navy,
              fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase', textDecoration: 'none', background: C.bg,
            }}>
              SUBMIT ASSISTED REQUEST
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="/axau-buy" style={{
              display: 'inline-block', padding: '12px 28px',
              background: C.navy, color: '#fff',
              fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
            }}>
              MINT OR REDEEM AXAU →
            </a>
            <a href="/axau-early-access" style={{
              display: 'inline-block', padding: '12px 28px',
              border: `1px solid ${C.border}`, color: C.navy,
              fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase', textDecoration: 'none', background: C.bg,
            }}>
              APPLY FOR CREDENTIAL ACCESS
            </a>
          </div>
        )}
      </div>

      {/* Token strip */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 0', background: C.bg, display: 'flex', flexWrap: 'wrap', gap: 0 }}>
        {[
          { label: 'Token', value: 'AXAU', dynamic: false },
          { label: 'Reserve', value: 'PAXG / Paxos Gold', dynamic: false },
          { label: 'NAV / Unit', value: navPerToken ? `$${navPerToken}` : '…', dynamic: true },
          { label: 'Coverage', value: coveragePct ?? '…', dynamic: true, isCoverage: true },
          { label: 'Supply', value: totalSupply ? `${totalSupply} AXAU` : '…', dynamic: true },
          { label: 'Network', value: 'Arbitrum One', dynamic: false },
          { label: 'Oracle', value: 'Chainlink XAU/USD', dynamic: false },
        ].map(({ label, value, isCoverage }) => {
          const coverageColor = isCoverage && coverageBps !== null
            ? coverageBps >= 10600 ? C.green
              : coverageBps >= 10400 ? '#92400e'
              : '#991b1b'
            : C.navy;
          const dotColor = isCoverage && coverageBps !== null
            ? coverageBps >= 10600 ? '#16a34a'
              : coverageBps >= 10400 ? '#d97706'
              : '#dc2626'
            : null;
          return (
            <div key={label} style={{
              flex: '1 1 auto', minWidth: 90,
              padding: '6px 14px', textAlign: 'center',
              borderRight: `1px solid ${C.borderAlt}`,
            }}>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</p>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: coverageColor, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {dotColor && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
                )}
                {value}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Value Props ─────────────────────────────────────────────────────────────

function ReserveFlow() {
  const steps = [
    {
      id: 'A',
      from: 'PAXG',
      to: 'GoldVault Contract',
      label: 'Deposit',
      desc: 'PAXG is transferred to the GoldVault contract (0xaCc9…CF8). The vault holds all gold reserves on Arbitrum One.',
    },
    {
      id: 'B',
      from: 'NAVEngine',
      to: 'Coverage Check',
      label: 'Validation',
      desc: 'The NAVEngine reads the Chainlink XAU/USD oracle to compute reserve NAV. Coverage ratio (Reserve USD ÷ Supply USD) must be ≥105% to proceed.',
    },
    {
      id: 'C',
      from: 'Identity Registry',
      to: 'ERC-3643 Credential',
      label: 'Identity Gate',
      desc: 'The MintRedeemController verifies the recipient wallet has an active ERC-3643 on-chain identity credential. Unregistered wallets are rejected on-chain.',
    },
    {
      id: 'D',
      from: 'MintRedeemController',
      to: 'Recipient Wallet',
      label: 'AXAU Issuance',
      desc: 'If all checks pass, AXAU is minted to the recipient wallet in the same transaction. Token supply and coverage ratio update on-chain immediately.',
    },
  ];

  return (
    <section style={{ borderBottom: `1px solid ${C.border}`, padding: '60px 0' }}>
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Reserve Architecture</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 600, color: C.navy, lineHeight: 1.15 }}>
          How the Reserve Works
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, maxWidth: 520, marginTop: 10, lineHeight: 1.65 }}>
          AXAU issuance follows a four-step on-chain validation sequence. Every mint is fully verifiable on Arbitrum One. No off-chain custody, no manual overrides.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{
            padding: '24px 20px',
            borderRight: i < steps.length - 1 ? `1px solid ${C.border}` : 'none',
            background: C.bg,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 32, height: 32, background: C.navy, color: '#fff', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Courier New", monospace', fontSize: 12, fontWeight: 700,
              }}>{step.id}</span>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{step.label}</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.navy, fontWeight: 700 }}>{step.from}</span>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: C.muted }}>→</span>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, fontWeight: 700 }}>{step.to}</span>
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Contract address disclosure */}
      <div style={{ marginTop: 16, padding: '14px 18px', background: C.bgAlt, border: `1px solid ${C.border}` }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Key Reserve Contracts — Arbitrum One</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {[
            { label: 'GoldVault', addr: '0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8' },
            { label: 'MintRedeemController', addr: '0x682Ed413767b6275e29fc706391474F2C5Cc1A2A' },
            { label: 'NAVEngine', addr: '0x80F8634a43B26a2bd403396A42465F138aeCC519' },
            { label: 'AXAU Token', addr: '0xbcCA4D937d427829914498423aE6E04C846dB0Bb' },
          ].map(c => (
            <a key={c.label} href={`https://arbitrum.blockscout.com/address/${c.addr}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>{c.label}</p>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.navy }}>{c.addr.slice(0, 10)}…{c.addr.slice(-6)} ↗</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section id="how-it-works" style={{ borderBottom: `1px solid ${C.border}`, padding: '60px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Access Paths</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 600, color: C.navy }}>
          Direct Mint vs Assisted Mint
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, maxWidth: 500, margin: '10px auto 0', lineHeight: 1.65 }}>
          Both paths require a wallet with an active ERC-3643 identity credential on Arbitrum One. Apply once via the Early Access page.
        </p>
      </div>

      {/* Path comparison table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* Path A: Direct Mint */}
        <div style={{ border: `2px solid ${C.navy}`, background: C.bg }}>
          <div style={{ background: C.navy, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: '#fff', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Path A — Direct Mint</span>
            <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: '#94a3b8', letterSpacing: '0.1em' }}>PAXG → AXAU</span>
          </div>
          <div style={{ padding: '20px' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>
              Deposit PAXG directly to the GoldVault contract. The MintRedeemController verifies your identity, validates the coverage ratio, and mints AXAU to your wallet in a single on-chain transaction.
            </p>
            {[
              { label: 'Input Asset', value: 'PAXG (Paxos Gold ERC-20)' },
              { label: 'Settlement', value: 'Single on-chain transaction' },
              { label: 'Speed', value: 'Instant (Arbitrum One)' },
              { label: 'Identity Check', value: 'Required — ERC-3643 credential' },
              { label: 'Coverage Check', value: 'Enforced on-chain' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: `1px solid ${C.borderAlt}` }}>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{row.label}</span>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.navy, fontWeight: 700, textAlign: 'right' }}>{row.value}</span>
              </div>
            ))}
            <a href="/axau-buy" style={{ display: 'block', textAlign: 'center', marginTop: 20, padding: '11px 0', background: C.navy, color: '#fff', fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>
              OPEN DIRECT MINT TERMINAL →
            </a>
          </div>
        </div>

        {/* Path B: Assisted Mint */}
        <div style={{ border: `1px solid ${C.gold}40`, background: C.bgGold }}>
          <div style={{ background: C.gold, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: '#fff', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Path B — Assisted Mint</span>
            <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em' }}>AXUSD → AXAU</span>
          </div>
          <div style={{ padding: '20px' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>
              Submit a request using AXUSD. The operations team acquires PAXG, deposits it to the vault, and mints AXAU to your identity-verified wallet. Confirmations are sent by email at each stage.
            </p>
            {[
              { label: 'Input Asset', value: 'AXUSD (Axiom Stablecoin)' },
              { label: 'Settlement', value: 'Ops team — vault deposit + on-chain mint' },
              { label: 'Speed', value: 'Typically 1 business day' },
              { label: 'Identity Check', value: 'Required — ERC-3643 credential' },
              { label: 'Notifications', value: 'Email at submit, processing, fulfilled' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: `1px solid ${C.gold}20` }}>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{row.label}</span>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.navy, fontWeight: 700, textAlign: 'right' }}>{row.value}</span>
              </div>
            ))}
            <a href="/axau-buy" style={{ display: 'block', textAlign: 'center', marginTop: 20, padding: '11px 0', background: C.gold, color: '#fff', fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>
              SUBMIT ASSISTED REQUEST →
            </a>
          </div>
        </div>
      </div>

      {/* Identity prerequisite callout */}
      <div style={{ padding: '16px 20px', background: C.bgAlt, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 4px' }}>Identity Prerequisite</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, margin: 0 }}>
            Both paths require a one-time identity credential. Apply via the Early Access page — verification is handled by the operations team.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
          <a href="/axau-early-access" style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: '#fff', textDecoration: 'none', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, background: C.navy, padding: '9px 18px' }}>
            APPLY FOR ACCESS →
          </a>
          <a href="/axusd-3643" style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.navy, textDecoration: 'none', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, border: `1px solid ${C.navy}`, padding: '9px 18px', background: C.bg }}>
            GET AXUSD →
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Live Dashboard ───────────────────────────────────────────────────────────

function LiveDashboard() {
  return (
    <section style={{ borderBottom: `1px solid ${C.border}`, padding: '60px 0' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Real-Time Data</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 600, color: C.navy }}>
          Live Reserve Dashboard
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, marginTop: 6, maxWidth: 480, lineHeight: 1.6 }}>
          Every metric pulled directly from Arbitrum One in real time. XAU price is sourced from Chainlink's professional oracle network.
        </p>
      </div>
      <LiveNavPanel />
    </section>
  );
}

// ─── Silver Sleeve — Phase 2 ──────────────────────────────────────────────────

function SilverSleeveSection() {
  return (
    <section style={{ borderBottom: `1px solid ${C.border}`, padding: '48px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32, alignItems: 'center' }}>
        <div>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: '#5c7a8f', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Phase 2 — Deployment Ready · Pending Execution</p>
          <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 600, color: C.navy, marginBottom: 14, lineHeight: 1.2 }}>
            Silver Sleeve — KAG as Reserve Component
          </h2>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, lineHeight: 1.75 }}>
            AXAU was built from the start as a multi-commodity reserve. Phase 2 adds silver
            as a Gnosis Safe-admitted basket sleeve. KAG (Kinesis Silver — 1 gram LBMA 999 Ag per token)
            enters the AXSilverVault alongside PAXG. AXAU holders gain monetary metals backing — gold and silver together —
            without a new token or new disclosure regime.
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.7, marginTop: 10 }}>
            The AXM governance vote is waived — the silver sleeve is an operational collateral admission executed via Gnosis Safe quorum.
            Vault and oracle contracts have passed internal audit (AXAG-AUDIT-001). Remaining gates: Gnosis Safe execution, reserve KAG acquisition via Arbitrum bridge, and disclosure flip.
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.7, marginTop: 10 }}>
            When the silver sleeve activates, redemption returns PAXG from the gold vault or KAG from the silver vault — per the vault the holder selects at the time of redemption.
          </p>
        </div>
        <div>
          <div style={{ border: `1px solid #5c7a8f30`, background: '#f4f7f9', padding: '20px' }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: '#5c7a8f', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>Silver Sleeve Parameters</p>
            {[
              { label: 'Reserve asset',    value: 'KAG (Kinesis Silver — 1 g LBMA 999 Ag)' },
              { label: 'Denomination',     value: '1 KAG = 1 gram fine silver' },
              { label: 'Reserve haircut',  value: '8% (Tier 1 liquid commodity)' },
              { label: 'Max basket weight', value: '30% of total AXAU reserve' },
              { label: 'Oracle',           value: 'Chainlink XAG/USD ÷ 31.1035 g/toz' },
              { label: 'Coverage floor',   value: '105% — same as gold sleeve' },
              { label: 'KAG yield',        value: '0.45% annualised · compounds into reserve' },
              { label: 'Redemption',       value: 'AXAU → KAG (silver vault) or PAXG (gold vault)' },
              { label: 'Status',           value: 'Deployment ready · Gnosis Safe pending' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: `1px solid #dde4ea` }}>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{row.label}</span>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.navy, fontWeight: 600, textAlign: 'right' }}>{row.value}</span>
              </div>
            ))}
            <a href="/commodities/kag" style={{
              display: 'block', textAlign: 'center', marginTop: 18, padding: '11px',
              border: `1px solid #5c7a8f`, color: '#3d5a6f',
              fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.14em',
              textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700, background: '#fff',
            }}>
              VIEW SILVER RESERVE PAGE →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Purchase Terminal ────────────────────────────────────────────────────────

function MintTerminal() {
  return (
    <section id="mint-terminal" style={{ borderBottom: `1px solid ${C.border}`, padding: '60px 0' }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Purchase</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 600, color: C.navy }}>
          Buy AXAU with AXUSD
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, marginTop: 6, maxWidth: 520, lineHeight: 1.6 }}>
          Mint AXAU directly with PAXG, or submit an assisted request using AXUSD. Both paths require a verified wallet on Arbitrum One.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20, alignItems: 'start' }}>

        {/* CTA card */}
        <div style={{ border: `1px solid ${C.gold}40`, background: C.bgGold }}>
          <div style={{ padding: '28px 28px 24px' }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>Live Purchase</p>
            <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 22, color: C.navy, fontWeight: 600, marginBottom: 10, lineHeight: 1.2 }}>
              Get a live quote and mint or request AXAU in minutes.
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 24 }}>
              Direct Mint: deposit PAXG and receive AXAU on-chain instantly. Assisted Mint: submit a request with AXUSD and the operations team handles fulfillment — typically within 1 business day.
            </p>
            <a href="/axau-buy" style={{
              display: 'block', textAlign: 'center', padding: '14px',
              background: C.navy, color: '#fff',
              fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.14em',
              textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
            }}>
              OPEN MINT &amp; REDEEM →
            </a>
          </div>
          <div style={{ borderTop: `1px solid ${C.gold}30`, padding: '16px 28px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Direct Mint', value: 'PAXG → AXAU' },
              { label: 'Assisted Mint', value: 'AXUSD request' },
              { label: 'Redeem', value: 'AXAU → PAXG' },
            ].map(stat => (
              <div key={stat.label}>
                <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>{stat.label}</p>
                <p style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: C.navy, fontWeight: 700, margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Process guide */}
        <div style={{ border: `1px solid ${C.border}`, background: C.bgAlt, padding: '24px' }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>Purchase Guide</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.borderAlt}` }}>
            Everything you need to know before placing an order.
          </p>

          {[
            { step: '1', label: 'Connect Your Wallet', detail: 'Connect via the top nav. Your wallet address auto-fills on the purchase form. Any Arbitrum-compatible wallet works.' },
            { step: '2', label: 'Enter AXUSD Amount', detail: 'Type in how much AXUSD you want to spend or pick a quick amount. The AXAU quote updates live as you type.' },
            { step: '3', label: 'Submit the Request', detail: 'For assisted mint, add your email and submit. An order confirmation is sent to your inbox. For direct mint, sign the on-chain transaction.' },
            { step: '4', label: 'Receive AXAU', detail: 'Direct mint settles on-chain in one transaction. Assisted requests are fulfilled by the operations team, typically within 1 business day.' },
          ].map((item, i, arr) => (
            <div key={item.step} style={{ display: 'flex', gap: 12, marginBottom: i < arr.length - 1 ? 16 : 0, paddingBottom: i < arr.length - 1 ? 16 : 0, borderBottom: i < arr.length - 1 ? `1px solid ${C.borderAlt}` : 'none' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                border: `1px solid ${C.gold}`, background: C.bgGold,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Courier New", monospace', fontSize: 10, color: C.navy, fontWeight: 700,
              }}>
                {item.step}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.navy, fontWeight: 600, margin: '0 0 3px' }}>{item.label}</p>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, lineHeight: 1.55, margin: 0 }}>{item.detail}</p>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.borderAlt}` }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, lineHeight: 1.65 }}>
              Gold Vault on Arbitrum One.{' '}
              <a href="https://arbiscan.io/address/0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8" target="_blank" rel="noopener noreferrer" style={{ color: C.navy, textDecoration: 'none' }}>View Contract ↗</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Reserve Architecture ─────────────────────────────────────────────────────

function ReserveArchitecture() {
  return (
    <section style={{ borderBottom: `1px solid ${C.border}`, padding: '60px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40, alignItems: 'start' }}>
        {/* Left */}
        <div>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Reserve System</p>
          <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 600, color: C.navy, marginBottom: 16, lineHeight: 1.2 }}>
            How the reserve is structured
          </h2>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, lineHeight: 1.75, marginBottom: 24 }}>
            AXAU uses a multi-layer reserve architecture. Gold (XAU) is the founding anchor — the first and most liquid reserve.
            Additional reserve layers can be added through AXM governance, making the backing richer over time.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Backing NAV', formula: 'Total Reserve USD ÷ Supply', desc: 'The floor value per AXAU — what each token is worth in reserve backing.' },
              { label: 'Mint NAV', formula: 'Backing NAV × 1.05', desc: 'The price to mint. The 5% premium builds a reserve buffer with each mint.' },
              { label: 'Coverage Ratio', formula: 'Reserve USD ÷ (Supply × $1)', desc: 'Must stay ≥ 105%. Minting pauses automatically if it falls below.' },
            ].map(item => (
              <div key={item.label} style={{ border: `1px solid ${C.border}`, background: C.bg, padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 14, color: C.navy, fontWeight: 600 }}>{item.label}</span>
                  <code style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, background: C.bgGold, padding: '2px 7px', border: `1px solid ${C.borderAlt}` }}>{item.formula}</code>
                </div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>Reserve Layers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { phase: 'Phase 1', name: 'Gold (XAU) — PAXG',       asset: 'On-chain gold reserve — Arbitrum One',              status: 'LIVE',      active: true,  silver: false },
              { phase: 'Phase 2', name: 'Silver (XAG) — KAG',      asset: 'Silver sleeve · Gnosis Safe deployment pending',     status: 'DEPLOYMENT READY', active: false, silver: true  },
              { phase: 'Phase 3', name: 'Land (Real Property)',     asset: 'Appraised US real estate via acquisition pipeline',  status: 'PLANNED',   active: false, silver: false },
              { phase: 'Phase 4+', name: 'Additional Commodities',  asset: 'Governance-approved reserve assets',                 status: 'PLANNED',   active: false, silver: false },
            ].map(layer => (
              <div key={layer.phase} style={{
                border: `1px solid ${layer.active ? C.gold : layer.silver ? '#5c7a8f50' : C.border}`,
                background: layer.active ? C.bgGold : layer.silver ? '#f4f7f9' : C.bg,
                padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 32, height: 32, flexShrink: 0,
                  background: layer.active
                    ? 'radial-gradient(ellipse at 35% 30%, #FFE07A, #C9913A, #7A5010)'
                    : layer.silver
                      ? 'radial-gradient(ellipse at 35% 30%, #c8d8e8, #5c7a8f, #3d5a6f)'
                      : C.bgAlt,
                  border: `1px solid ${layer.active ? C.gold : layer.silver ? '#5c7a8f' : C.border}`,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 14, color: C.navy, fontWeight: 600 }}>{layer.name}</span>
                    <span style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: layer.active ? C.green : layer.silver ? '#3d5a6f' : C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: layer.silver ? 700 : 400 }}>{layer.status}</span>
                  </div>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted }}>{layer.asset}</span>
                  {layer.silver && (
                    <div style={{ marginTop: 4 }}>
                      <a href="/commodities/kag" style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.navy, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', borderBottom: `1px solid ${C.border}` }}>
                        Silver Reserve page →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Network image */}
          <div style={{ marginTop: 16, position: 'relative', height: 180, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <Image src="/axau/network-3d.png" alt="On-chain network" fill style={{ objectFit: 'cover', opacity: 0.85 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(255,255,255,0.7) 0%, transparent 50%)' }} />
            <div style={{ position: 'absolute', bottom: 12, left: 16 }}>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: C.navy, letterSpacing: '0.14em', textTransform: 'uppercase' }}>7 Contracts · Arbitrum One · All Verified</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const items = [
    {
      q: 'How do I get AXAU?',
      a: 'Visit the Mint & Redeem page and choose your path. Direct Mint: deposit PAXG to receive AXAU on-chain in a single transaction. Assisted Mint: submit a request with AXUSD and the operations team handles fulfillment — typically within 1 business day. Your wallet must be identity-verified on Arbitrum One.',
    },
    {
      q: 'What is AXAU backed by?',
      a: 'AXAU is currently backed by on-chain gold reserves (PAXG) held in the GoldVault contract on Arbitrum One. The reserve value and coverage ratio are publicly verifiable on-chain at all times. The protocol enforces a minimum coverage ratio of ≥105%. A Phase 2 silver sleeve (KAG — Kinesis Silver) is deployment ready, pending Gnosis Safe execution and reserve KAG acquisition. When activated, redemption will return PAXG from the gold vault or KAG from the silver vault, per the holder\'s selection.',
    },
    {
      q: 'Is there any risk of losing my gold?',
      a: 'The GoldVault is an automated control layer on Arbitrum One. On-chain protocol risk exists, as with all on-chain infrastructure. The protocol enforces a ≥105% coverage ratio — if this falls, minting pauses automatically. The reserve dashboard and all contract addresses are publicly available for verification.',
    },
    {
      q: 'How much does it cost to mint AXAU?',
      a: 'For Direct Mint: deposit PAXG at the current Mint NAV. For Assisted Mint: spend AXUSD — the protocol applies a 5% mint premium at the time of purchase. This premium builds a reserve buffer, making the system more over-collateralized with every order. Arbitrum One gas fees apply to all on-chain transactions.',
    },
    {
      q: 'Where are the automated control layers deployed? Have they been reviewed?',
      a: 'All 7 AXAU on-chain control layers are deployed and verified on Arbitrum One via Blockscout. An external security review is on the roadmap for the next protocol phase. Contract addresses are listed in the Live Reserve Dashboard above.',
    },
    {
      q: 'What does "coverage ratio ≥ 105%" mean?',
      a: 'The protocol must hold at least $1.05 in reserves for every $1.00 of AXAU in circulation. This 5% buffer provides protection against small oracle price fluctuations and ensures the system is always more than fully backed.',
    },
  ];

  return (
    <section style={{ borderBottom: `1px solid ${C.border}`, padding: '60px 0' }}>
      <div style={{ maxWidth: 720 }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Questions</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 600, color: C.navy, marginBottom: 32 }}>
          Frequently asked questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((item, i) => (
            <div key={i} style={{ border: `1px solid ${C.border}`, background: open === i ? C.bgAlt : C.bg }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{ width: '100%', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 15, color: C.navy, fontWeight: 600, lineHeight: 1.3, flex: 1 }}>{item.q}</span>
                <ChevronDown style={{ width: 16, height: 16, color: C.gold, transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
              </button>
              {open === i && (
                <div style={{ padding: '0 20px 16px', borderTop: `1px solid ${C.borderAlt}` }}>
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

// ─── Collateral Classification ───────────────────────────────────────────────

function CollateralClassificationSection() {
  return (
    <section style={{ borderBottom: `1px solid ${C.border}`, padding: '48px 0' }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Collateral Risk Policy</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 600, color: C.navy, margin: 0 }}>
          Live Admission Classification
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.7, marginTop: 8, maxWidth: 720 }}>
          The badge below is read live from the asset registry the policy
          evaluator enforces server-side. RED assets are not borrowable, YELLOW
          assets enforce a per-transaction cap, and GREEN assets are subject to
          global caps only.
        </p>
      </div>
      <CollateralClassificationPanel symbol="AXAU" compact />
    </section>
  );
}

// ─── Disclosures ─────────────────────────────────────────────────────────────

function Disclosures() {
  return (
    <section style={{ padding: '48px 0' }}>
      <div style={{ border: `1px solid ${C.border}`, background: C.bgAlt, padding: '24px' }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>Important Disclosures</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            'AXAU is not a security, investment contract, or regulated financial product. It is a protocol-managed reserve instrument.',
            'On-chain protocol risk exists. The automated control layers are unaudited at this stage. Use only funds you can afford to lose.',
            'Gold market prices (XAU/USD) fluctuate. The value of AXAU in USD terms may increase or decrease.',
            'The protocol is designed to align with applicable digital asset regulations, including the GENIUS Act framework. No legal compliance is guaranteed.',
            'Mint and redeem functions may be paused by governance at any time for protocol safety.',
            'AXAU is issued under the ERC-3643 standard with identity compliance controls. Transfer restrictions may apply.',
          ].map((notice, i) => (
            <p key={i} style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: C.muted, lineHeight: 1.6, paddingLeft: 12, borderLeft: `2px solid ${C.borderAlt}` }}>
              {notice}
            </p>
          ))}
        </div>
        <div style={{ paddingTop: 16, borderTop: `1px solid ${C.borderAlt}`, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {[
            ['Token Contract', '0xbcCA4D937d427829914498423aE6E04C846dB0Bb', 'https://arbitrum.blockscout.com/address/0xbcCA4D937d427829914498423aE6E04C846dB0Bb'],
            ['MintRedeem Controller', '0x682Ed413767b6275e29fc706391474F2C5Cc1A2A', 'https://arbitrum.blockscout.com/address/0x682Ed413767b6275e29fc706391474F2C5Cc1A2A'],
            ['NAV Engine', '0x80F8634a43B26a2bd403396A42465F138aeCC519', 'https://arbitrum.blockscout.com/address/0x80F8634a43B26a2bd403396A42465F138aeCC519'],
            ['Gold Vault', '0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8', 'https://arbitrum.blockscout.com/address/0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8'],
          ].map(([label, addr, url]) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
              <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.navy }}>{addr.slice(0, 10)}…{addr.slice(-6)} ↗</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AxauPage() {
  return (
    <DesignLawLayout>
      <PageVisualSuite preset="axau" />
      <SeoHead
        title="AXAU | Reserve Asset Infrastructure by Axiom Protocol"
        description="AXAU is Axiom Protocol's reserve-linked digital asset infrastructure designed for disciplined capital systems and transparent asset coordination."
        path="/axau"
      />

      <Hero />
      <section style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '24px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Link href="/disclosure" className="text-sm text-dl-navy underline">Disclosure and reserve transparency</Link>
          <Link href="/axusd" className="text-sm text-dl-navy underline">AXUSD settlement infrastructure</Link>
          <Link href="/observer/reserve-performance" className="text-sm text-dl-navy underline">Reserve performance observer</Link>
          <Link href="/contact" className="text-sm text-dl-navy underline">Contact</Link>
        </div>
      </section>
      <ReserveFlow />
      <HowItWorks />
      <LiveDashboard />
      <SilverSleeveSection />
      <CollateralClassificationSection />
      <MintTerminal />
      <ReserveArchitecture />
      <FAQ />
      <Disclosures />
    </DesignLawLayout>
  );
}
