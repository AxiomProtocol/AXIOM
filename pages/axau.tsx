import Head from 'next/head';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { DesignLawLayout } from '../components/design-law';
import { ChevronDown, ExternalLink, CheckCircle } from 'lucide-react';

const LiveNavPanel    = dynamic(() => import('../components/axau/LiveNavPanel'),    { ssr: false });
const MintRedeemPanel = dynamic(() => import('../components/axau/MintRedeemPanel'), { ssr: false });

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

// ─── 3D Icon Components ──────────────────────────────────────────────────────

function GoldCoinIcon({ size = 64 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'radial-gradient(ellipse at 38% 30%, #FFE07A 0%, #C9913A 42%, #7A5010 100%)',
      boxShadow: 'inset -3px -3px 10px rgba(0,0,0,0.4), inset 2px 2px 6px rgba(255,240,160,0.5), 4px 8px 16px rgba(0,0,0,0.2)',
      transform: 'perspective(300px) rotateX(18deg) rotateY(-20deg)',
    }} />
  );
}

function ShieldIcon({ size = 60 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size * 1.1, flexShrink: 0, filter: 'drop-shadow(3px 6px 10px rgba(0,0,0,0.18))' }}>
      <svg viewBox="0 0 60 68" width={size} height={size * 1.13} fill="none">
        <defs>
          <linearGradient id="sg" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#FFE07A" />
            <stop offset="50%" stopColor="#C9913A" />
            <stop offset="100%" stopColor="#7A5010" />
          </linearGradient>
        </defs>
        <path d="M30 2L58 13V38C58 52 44 64 30 66C16 64 2 52 2 38V13L30 2Z" fill="url(#sg)" />
        <path d="M19 34l8 8 14-16" stroke="rgba(255,255,255,0.9)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function LiquidityIcon({ size = 60 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, filter: 'drop-shadow(3px 6px 10px rgba(0,0,0,0.15))' }}>
      <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
        <defs>
          <linearGradient id="ag" x1="0%" y1="20%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#FFE07A" />
            <stop offset="60%" stopColor="#C9913A" />
            <stop offset="100%" stopColor="#7A5010" />
          </linearGradient>
        </defs>
        <path d="M10 32H54M54 32L38 16M54 32L38 48" stroke="url(#ag)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 20H22M6 44H22" stroke="url(#ag)" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
      </svg>
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  const { address, isConnected } = useAccount();
  const [xauPrice, setXauPrice]       = useState<string | null>(null);
  const [coveragePct, setCoveragePct] = useState<string | null>(null);
  const [coverageBps, setCoverageBps] = useState<number | null>(null);
  const [isVerified, setIsVerified]   = useState<boolean | null>(null);

  useEffect(() => {
    function fetchNav() {
      fetch('/api/axau/nav')
        .then(r => r.json())
        .then(d => {
          setXauPrice(d.xauUsdPrice);
          if (typeof d.coverageRatioPct === 'string') setCoveragePct(d.coverageRatioPct);
          if (typeof d.coverageRatioBps === 'number') setCoverageBps(d.coverageRatioBps);
        })
        .catch(() => {});
    }
    fetchNav();
    const id = setInterval(fetchNav, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isConnected || !address) { setIsVerified(null); return; }
    fetch(`/api/erc3643/identity/check?wallet=${address}`)
      .then(r => r.json())
      .then(d => setIsVerified(d.verified === true))
      .catch(() => setIsVerified(null));
  }, [address, isConnected]);

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
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
          AXAU — Axiom Gold Reserve Unit
        </p>
        <h1 style={{
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 'clamp(32px, 6vw, 68px)',
          fontWeight: 700, color: C.navy, lineHeight: 1.08,
          marginBottom: 14, letterSpacing: '-0.01em',
        }}>
          Your Wealth,<br />
          <span style={{ color: C.gold }}>Anchored in Gold</span>
        </h1>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: C.muted, maxWidth: 500, margin: '0 auto 28px', lineHeight: 1.7 }}>
          AXAU is a gold reserve unit backed by PAXG — Paxos Gold on Arbitrum One. Every token is fully verifiable on-chain.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href={isVerified === true ? '#mint-terminal' : '/axau-access'}
            style={{
              display: 'inline-block', padding: '12px 28px',
              background: C.navy, color: '#fff',
              fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
            }}
          >
            {isVerified === true ? 'MINT AXAU →' : 'APPLY FOR ACCESS →'}
          </a>
          <a href="/axau-buy" style={{
            display: 'inline-block', padding: '12px 28px',
            border: `1px solid ${C.gold}`, color: C.gold,
            fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.12em',
            textTransform: 'uppercase', textDecoration: 'none', background: C.bgGold, fontWeight: 700,
          }}>
            BUY WITH AXUSD →
          </a>
          <a href="#how-it-works" style={{
            display: 'inline-block', padding: '12px 28px',
            border: `1px solid ${C.border}`, color: C.navy,
            fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.12em',
            textTransform: 'uppercase', textDecoration: 'none', background: C.bg,
          }}>
            HOW IT WORKS
          </a>
        </div>
      </div>

      {/* Token strip */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 0', background: C.bg, display: 'flex', flexWrap: 'wrap', gap: 0 }}>
        {(['Token', 'Reserve', 'Network', 'Standard', 'Oracle', 'Coverage'] as const).map((label) => {
          const staticValues: Record<string, string> = {
            Token: 'AXAU',
            Reserve: 'PAXG — Paxos Gold',
            Network: 'Arbitrum One',
            Standard: 'ERC-3643',
            Oracle: 'Chainlink XAU/USD',
          };
          const isCoverage = label === 'Coverage';
          const value = isCoverage
            ? (coveragePct ?? '…')
            : staticValues[label];
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

function ValueProps() {
  const cards = [
    {
      icon: <GoldCoinIcon />,
      badge: 'TIER 1 RESERVE',
      title: 'Pure Gold Backing',
      body: 'Every AXAU token is backed by PAXG — Paxos Gold on Arbitrum One. One PAXG equals one troy ounce of physical gold held in professional custody.',
    },
    {
      icon: <ShieldIcon />,
      badge: 'FULLY AUDITABLE',
      title: 'On-Chain Transparency',
      body: 'Gold reserves, coverage ratios, and all system parameters are publicly verifiable on-chain, 24 hours a day, 7 days a week. No black boxes.',
    },
    {
      icon: <LiquidityIcon />,
      badge: 'ARBITRUM SPEED',
      title: 'Instant Liquidity',
      body: 'Mint AXAU with PAXG in a single transaction on Arbitrum. Redeem back to PAXG anytime. No lock-ups, no waiting periods, no intermediaries.',
    },
  ];

  return (
    <section style={{ borderBottom: `1px solid ${C.border}`, padding: '60px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Why AXAU</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 600, color: C.navy, lineHeight: 1.2 }}>
          The gold standard,<br />redesigned for the digital era
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {cards.map(card => (
          <div key={card.title} style={{ border: `1px solid ${C.border}`, background: C.bgAlt, padding: '28px 24px' }}>
            <div style={{ marginBottom: 20 }}>{card.icon}</div>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>{card.badge}</p>
            <h3 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 20, color: C.navy, fontWeight: 600, marginBottom: 10, lineHeight: 1.2 }}>{card.title}</h3>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Get PAXG on Arbitrum',
      body: 'Use the built-in swap to exchange ETH or USDC for PAXG (Paxos Gold) directly on Arbitrum One. No need to leave the platform.',
      note: 'Minimum: any amount of PAXG',
    },
    {
      num: '02',
      title: 'Mint Your AXAU',
      body: 'Approve PAXG, then submit the mint. Your PAXG moves to the gold vault and AXAU is issued to your wallet at the current Mint NAV price.',
      note: '2 wallet signatures total',
    },
    {
      num: '03',
      title: 'Hold or Redeem Anytime',
      body: "Hold AXAU as your gold reserve unit. When you're ready, redeem back to PAXG at the Backing NAV price — no lock-up, no waiting.",
      note: 'Redeem anytime',
    },
  ];

  return (
    <section id="how-it-works" style={{ borderBottom: `1px solid ${C.border}`, padding: '60px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Get Started</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 600, color: C.navy }}>
          How it works
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
        {steps.map((step, i) => (
          <div key={step.num} style={{
            padding: '28px 24px',
            borderRight: i < steps.length - 1 ? `1px solid ${C.border}` : 'none',
            background: C.bg,
          }}>
            <div style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 56, color: C.borderAlt, lineHeight: 1,
              marginBottom: 16, fontWeight: 700, letterSpacing: '-0.02em',
            }}>
              {step.num}
            </div>
            <h3 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 18, color: C.navy, fontWeight: 600, marginBottom: 10, lineHeight: 1.3 }}>
              {step.title}
            </h3>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 14 }}>
              {step.body}
            </p>
            <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {step.note}
            </span>
          </div>
        ))}
      </div>

      {/* PAXG explainer */}
      <div style={{ marginTop: 20, border: `1px solid ${C.border}`, background: C.bgGold, padding: '20px 24px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ width: 44, height: 44, flexShrink: 0 }}>
          <Image src="/axau/gold-coin-3d.png" alt="Gold coin" width={44} height={44} style={{ objectFit: 'cover', borderRadius: '50%' }} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 5 }}>What is PAXG?</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.65 }}>
            PAXG (Paxos Gold) is a regulated digital token where 1 token = 1 troy ounce of physical gold held at Brink's vaults in London. Issued by Paxos Trust Company.
          </p>
        </div>
        <a href="https://paxos.com/paxgold/" target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, alignSelf: 'center',
          fontFamily: '"Courier New", monospace', fontSize: 10, color: C.navy, textDecoration: 'none',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Learn More <ExternalLink style={{ width: 11, height: 11 }} />
        </a>
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

// ─── Mint Terminal ────────────────────────────────────────────────────────────

function MintTerminal() {
  return (
    <section id="mint-terminal" style={{ borderBottom: `1px solid ${C.border}`, padding: '60px 0' }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>On-Chain</p>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 600, color: C.navy }}>
          Mint & Redeem Terminal
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, marginTop: 6, maxWidth: 480, lineHeight: 1.6 }}>
          Connect your wallet on Arbitrum One and start building your gold reserve in minutes.
        </p>
      </div>

      {/* Buy with AXUSD callout */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
        background: C.bgGold, border: `1px solid ${C.gold}40`,
        padding: '18px 24px', marginBottom: 24,
      }}>
        <div>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 4px' }}>
            DON&apos;T HAVE PAXG?
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.navy, margin: 0, lineHeight: 1.5 }}>
            Use <strong>AXUSD</strong> instead — the protocol acquires PAXG and mints to your wallet.
            No gold market knowledge required.
          </p>
        </div>
        <a href="/axau-buy" style={{
          display: 'inline-block', padding: '10px 22px', flexShrink: 0,
          background: C.navy, color: '#fff',
          fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em',
          textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
        }}>
          BUY WITH AXUSD →
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20, alignItems: 'start' }}>
        <MintRedeemPanel />

        {/* Side guide */}
        <div style={{ border: `1px solid ${C.border}`, background: C.bgAlt, padding: '24px' }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>Transaction Guide</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.borderAlt}` }}>
            All steps completed within Axiom Protocol. No bridging required.
          </p>

          {[
            { step: '1', label: 'Connect Wallet', detail: 'Hit "Connect" in the top nav. Select Arbitrum One. MetaMask, Coinbase, or any WalletConnect wallet works.', tag: null },
            { step: '2', label: 'Get PAXG', detail: 'Use the "Get PAXG" tab to swap ETH or USDC for PAXG on Arbitrum via Uniswap V3. Takes ~30 seconds.', tag: 'Get PAXG tab' },
            { step: '3', label: 'Approve & Mint', detail: 'Enter your PAXG amount in the Mint tab. Confirm 2 transactions: Approve PAXG, then Mint AXAU.', tag: 'Mint tab' },
            { step: '4', label: 'Redeem Anytime', detail: 'Want your gold back? Use the Redeem tab to burn AXAU and receive PAXG at Backing NAV.', tag: 'Redeem tab' },
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.navy, fontWeight: 600 }}>{item.label}</span>
                  {item.tag && (
                    <span style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: C.gold, letterSpacing: '0.12em', textTransform: 'uppercase', border: `1px solid ${C.gold}`, padding: '1px 6px', background: C.bgGold }}>
                      {item.tag}
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{item.detail}</p>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.borderAlt}` }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, lineHeight: 1.65 }}>
              Reserve: PAXG (Paxos Gold) on Arbitrum One.{' '}
              <a href="https://arbiscan.io/address/0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8" target="_blank" rel="noopener noreferrer" style={{ color: C.navy, textDecoration: 'none' }}>Gold Vault ↗</a>
              {' · '}
              <a href="https://arbiscan.io/address/0x036F05a3fB74d35439c074f25F691b36f5D37792" target="_blank" rel="noopener noreferrer" style={{ color: C.navy, textDecoration: 'none' }}>Controller ↗</a>
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
              { phase: 'Phase 1', name: 'Gold (XAU)', asset: 'PAXG — Paxos Gold', status: 'LIVE', active: true },
              { phase: 'Phase 2', name: 'Land (Real Estate)', asset: 'Appraised US real estate', status: 'CONFIGURED', active: false },
              { phase: 'Phase 3', name: 'Silver (XAG)', asset: 'Physical silver via LBMA', status: 'PLANNED', active: false },
              { phase: 'Phase 4+', name: 'Additional Commodities', asset: 'Governance-approved assets', status: 'FUTURE', active: false },
            ].map(layer => (
              <div key={layer.phase} style={{ border: `1px solid ${layer.active ? C.gold : C.border}`, background: layer.active ? C.bgGold : C.bg, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, flexShrink: 0, borderRadius: '50%',
                  background: layer.active ? 'radial-gradient(ellipse at 35% 30%, #FFE07A, #C9913A, #7A5010)' : C.bgAlt,
                  border: `1px solid ${layer.active ? C.gold : C.border}`,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 14, color: C.navy, fontWeight: 600 }}>{layer.name}</span>
                    <span style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: layer.active ? C.green : C.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{layer.status}</span>
                  </div>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted }}>{layer.asset}</span>
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
      q: 'What makes AXAU different from buying PAXG directly?',
      a: 'AXAU is a protocol-managed reserve unit that can hold multiple commodities over time. The 5% mint premium builds a reserve buffer — the protocol becomes more over-collateralized with every mint. It also enables deeper DeFi integration (lending markets, liquidity pools) that raw PAXG cannot access.',
    },
    {
      q: 'Is there any risk of losing my gold?',
      a: 'PAXG held in the Gold Vault is a smart contract on Arbitrum One. Smart contract risk exists, as with all on-chain protocols. The protocol enforces a ≥105% coverage ratio — if this falls, minting pauses automatically. Redemptions can always be processed as long as the vault holds enough PAXG.',
    },
    {
      q: 'How much does it cost to mint AXAU?',
      a: 'The only cost is the 5% mint premium built into the NAV price (you receive slightly less AXAU per dollar of PAXG, creating a reserve buffer). Gas fees on Arbitrum One are typically less than $0.05 per transaction.',
    },
    {
      q: 'Can I redeem AXAU for PAXG at any time?',
      a: 'Yes, as long as the redeem function is active and the vault holds sufficient PAXG. Redemptions occur at the Backing NAV price — the reserve value per AXAU at the moment of redemption.',
    },
    {
      q: 'Where are the smart contracts? Are they audited?',
      a: 'All 7 AXAU contracts are deployed and verified on Arbitrum One via Blockscout. An external audit is on the roadmap for the next protocol phase. Contract addresses are listed in the Live Reserve Dashboard above.',
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

// ─── Disclosures ─────────────────────────────────────────────────────────────

function Disclosures() {
  return (
    <section style={{ padding: '48px 0' }}>
      <div style={{ border: `1px solid ${C.border}`, background: C.bgAlt, padding: '24px' }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: C.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>Important Disclosures</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            'AXAU is not a security, investment contract, or regulated financial product. It is a protocol-managed reserve instrument.',
            'Smart contract risk exists. All contracts are unaudited at this stage. Use only funds you can afford to lose.',
            'PAXG prices fluctuate with the gold market. The value of AXAU in USD terms may increase or decrease.',
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
            ['MintRedeem Controller', '0x036F05a3fB74d35439c074f25F691b36f5D37792', 'https://arbitrum.blockscout.com/address/0x036F05a3fB74d35439c074f25F691b36f5D37792'],
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
      <Head>
        <title>AXAU — Axiom Gold Reserve Unit | Your Wealth, Anchored in Gold</title>
        <meta name="description" content="AXAU is a gold reserve unit backed by PAXG on Arbitrum One. Mint, hold, and redeem your gold position on-chain with full transparency." />
      </Head>

      <Hero />
      <ValueProps />
      <HowItWorks />
      <LiveDashboard />
      <MintTerminal />
      <ReserveArchitecture />
      <FAQ />
      <Disclosures />
    </DesignLawLayout>
  );
}
