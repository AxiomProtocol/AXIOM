import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../components/design-law';

const C = {
  navy:   '#1e3a5f',
  forest: '#2d6a4f',
  gold:   '#b8860b',
  muted:  '#6b7280',
  border: '#d1d5db',
  bg:     '#ffffff',
  bgAlt:  '#fafaf8',
  bgGold: '#fdf8ee',
};

const mono: React.CSSProperties = { fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted, letterSpacing: '0.04em' };
const monoLabel: React.CSSProperties = { ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.10em', fontSize: 10 };
const serif = (size = 16, color = C.navy): React.CSSProperties => ({ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: size, color, fontWeight: 400 });

const DIFFERENTIATORS = [
  {
    label: 'FDIC-Insured Banking Layer',
    badge: 'L00 · LIVE',
    icon: '/visuals/icon-banking.png',
    desc: 'Fiat capital enters through a real institutional bank account — First Internet Bank via Increase ACH/wire rails. No crypto-only on-ramp. BitGo institutional custody handles the on-chain layer.',
  },
  {
    label: 'Identity-Gated Settlement Rail',
    badge: 'L01 · LIVE',
    icon: '/visuals/icon-settlement.png',
    desc: 'AXUSD is not a wrapped stablecoin. It is issued through a live PSM, requires an ERC-3643 identity credential, and functions as the exclusive unit of account for capital movement across the entire protocol.',
  },
  {
    label: 'Direct On-Chain Reserve Issuance',
    badge: 'L02 · LIVE',
    icon: '/visuals/icon-reserve.png',
    desc: 'AXAU is minted directly against PAXG via the GoldVault automated control layer. One transaction. No intermediary. Coverage ratio is enforced on-chain before every mint. Identity credential required.',
  },
  {
    label: 'Proof of Execution — Not Attestation',
    badge: 'L05 · LIVE',
    icon: '/visuals/icon-trust.png',
    desc: 'Every capital movement, solvency snapshot, and operational action is recorded with a hash-chained audit trail. The chain does not require trust — it requires reading. Anyone can verify independently.',
  },
  {
    label: 'Three-Mode Solvency Console',
    badge: 'L05 · LIVE',
    icon: '/visuals/icon-trust.png',
    desc: 'Coverage ratio, reserve ratio, and liability-backed reserve are published live from a canonical on-chain snapshot. Derived from verifiable data. Not a dashboard — a verification layer with public access.',
  },
  {
    label: 'Capital Regime Intelligence',
    badge: 'L04 · LIVE',
    icon: '/visuals/icon-intelligence.png',
    desc: 'MIRDT scores nine dimensions of capital regime readiness to generate a live advisory signal. Sentinel gates authorization decisions. Observer provides institutional read access to treasury and risk data.',
  },
];

const LIVE_NOW = [
  { layer: '00', name: 'Banking Infrastructure', detail: 'Increase ACH/wire · FDIC-insured (First Internet Bank) · BitGo institutional custody active', href: '/banking', status: 'LIVE' },
  { layer: '01', name: 'AXUSD Settlement Rail', detail: 'ERC-3643 stablecoin · PSM active · Identity-gated · Peg maintained via Camelot V2', href: '/axusd-3643', status: 'LIVE' },
  { layer: '01.5', name: 'Protocol Exchange (DEX)', detail: 'Camelot V2 · AXM/AXUSD trading pairs · PSM-backed peg maintenance', href: '/dex', status: 'LIVE' },
  { layer: '02', name: 'AXAU Reserve', detail: 'PAXG-backed · Direct on-chain mint/redeem · GoldVault contract · Coverage ratio enforced', href: '/axau', status: 'LIVE' },
  { layer: '03', name: 'Capital Program (Reg D)', detail: 'SPV-structured · 506(c) · Accredited investors · Formation stage', href: '/pilot', status: 'FORMATION' },
  { layer: '03', name: 'Lending Fund (Reg D)', detail: 'Bridge loan mandate · LP fund · 506(c) · Accepting expressions of interest', href: '/lending-fund', status: 'FORMATION' },
  { layer: '04', name: 'Regime Intelligence (MIRDT)', detail: 'Nine-dimension capital regime scoring · Sentinel authorization gate · Observer read access', href: '/mirdt', status: 'LIVE' },
  { layer: '05', name: 'Solvency Console', detail: 'Three-mode live verification · CR / RR / LBR · Canonical on-chain snapshot · Publicly accessible', href: '/solvency', status: 'LIVE' },
  { layer: '05', name: 'Proof of Execution', detail: 'Hash-chained audit trail · All operational actions · Independently verifiable', href: '/proof-of-execution', status: 'LIVE' },
  { layer: '05', name: 'Institutional Disclosure', detail: 'Contract addresses · Coverage formulas · Policy mode · Legal framework', href: '/disclosure', status: 'LIVE' },
];

const CAPITAL_FLOW = [
  { step: 'USD', label: 'Fiat Entry', sub: 'Banking Layer — ACH / Wire via Increase · FDIC-insured', color: C.forest, layer: 'L00' },
  { step: 'AXUSD', label: 'Settlement Rail', sub: 'Identity-gated ERC-3643 · PSM-backed peg · Unit of account', color: C.navy, layer: 'L01' },
  { step: 'DEX / PSM', label: 'Exchange + Peg', sub: 'Camelot V2 · Peg maintenance · AXM liquidity', color: C.gold, layer: 'L01.5' },
  { step: 'AXAU', label: 'Reserve Layer', sub: 'PAXG-backed gold unit · Direct on-chain · Coverage enforced', color: C.gold, layer: 'L02' },
  { step: 'Capital', label: 'Deployment', sub: 'Lending Fund · Capital Program SPVs · Reg D 506(c)', color: C.forest, layer: 'L03' },
];

const WHO_ITS_FOR = [
  {
    segment: 'No Capital — Income-Backed Entry',
    path: 'Community Credit → Wealth Practice → Syndication',
    desc: 'An income-backed credit line covers your first contribution. No crypto, no savings buffer required. Build a verifiable participation record and progress into group economics and structured deal access.',
    href: '/community-credit',
    cta: 'Apply for Entry Credit',
    borderColor: C.forest,
  },
  {
    segment: 'Capital Allocators and Accredited Investors',
    path: 'Syndication → Lending Fund → Secondary Market',
    desc: 'Access Reg D 506(c) structured offerings, the bridge loan LP fund, and secondary market transfers — with on-chain reporting, institutional-grade solvency disclosure, and independently verifiable data.',
    href: '/syndication',
    cta: 'View Capital Programs',
    borderColor: C.navy,
  },
  {
    segment: 'Reserve and Settlement Participants',
    path: 'Identity Credential → AXAU / AXUSD Access',
    desc: 'Obtain an ERC-3643 identity credential. Mint AXAU (gold-backed reserve unit) directly on-chain, or acquire AXUSD through the PSM. Governance participation rights are included with credential.',
    href: '/axau-early-access',
    cta: 'Apply for Reserve Access',
    borderColor: C.gold,
  },
  {
    segment: 'Operators, Builders, and Deal Sourcers',
    path: 'Deal Intelligence → MIRDT Regime Score → Sentinel',
    desc: 'Access deal intelligence, underwriting tools, craftsman cost estimation, regime scoring, and the full operations dashboard. Purpose-built for active deal sourcing, due diligence, and capital deployment.',
    href: '/deal-intelligence',
    cta: 'Access Intelligence Layer',
    borderColor: C.muted,
  },
];

const PROOF_LINKS = [
  { label: 'Proof of Execution', sub: 'Hash-chained audit trail of all operational actions. Publicly verifiable. No account required.', href: '/proof-of-execution', badge: 'LIVE' },
  { label: 'Solvency Console', sub: 'Coverage ratio, reserve ratio, and LBR — live from a canonical on-chain snapshot.', href: '/solvency', badge: 'LIVE' },
  { label: 'Institutional Disclosure', sub: 'Contract addresses, policy mode, coverage formulas, and complete legal framework.', href: '/disclosure', badge: 'LIVE' },
  { label: 'Observer Dashboard', sub: 'Treasury, governance, and risk data — independent read access. No login.', href: '/observer', badge: 'LIVE' },
];

function StatusBadge({ status }: { status: string }) {
  const isLive = status === 'LIVE';
  return (
    <span style={{
      fontFamily: '"Courier New", monospace', fontSize: 9,
      padding: '2px 8px',
      border: `1px solid ${isLive ? C.forest : C.gold}`,
      color: isLive ? C.forest : C.gold,
      letterSpacing: '0.10em', textTransform: 'uppercase' as const,
      display: 'inline-block',
    }}>
      {status}
    </span>
  );
}

export default function InfrastructurePage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>Axiom Protocol | Verify the Infrastructure — Banking, Settlement, Reserve, Capital</title>
        <meta name="description" content="Axiom Protocol is a vertically integrated financial operating system: FDIC-insured banking, identity-gated settlement, gold-backed reserve issuance, and capital deployment — all on Arbitrum One. Not a narrative. Verify it." />
      </Head>

      {/* PAGE BREADCRUMB */}
      <div style={{ marginBottom: 10 }}>
        <p style={monoLabel}>Axiom Protocol / Infrastructure / System Overview</p>
      </div>

      {/* ── SECTION 1: HERO ───────────────────────────────────────────────────── */}
      <div style={{ borderTop: `4px solid ${C.gold}`, marginBottom: 56 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,420px)',
          gap: 0,
          borderBottom: `1px solid ${C.border}`,
          alignItems: 'stretch',
        }}>
          {/* Left: text */}
          <div style={{ padding: '52px 48px 48px 0' }}>
            <p style={{ ...monoLabel, color: C.forest, marginBottom: 16, fontSize: 11 }}>
              Most &ldquo;RWA&rdquo; platforms are marketing decks. This is verifiable infrastructure.
            </p>
            <h1 style={{ ...serif(44), fontWeight: 700, lineHeight: 1.08, marginBottom: 22, maxWidth: 700 }}>
              Sovereign Financial Infrastructure.<br />
              <span style={{ color: C.gold }}>Banking. Settlement. Reserve. Capital.</span>
            </h1>
            <p style={{ ...serif(16), color: C.muted, maxWidth: 600, lineHeight: 1.80, marginBottom: 14 }}>
              Axiom Protocol is a vertically integrated financial operating system — FDIC-insured banking, identity-gated settlement rail, gold-backed reserve issuance, capital deployment programs, and regime intelligence — built on Arbitrum One with full on-chain transparency.
            </p>
            <p style={{ ...mono, fontSize: 12, color: C.muted, marginBottom: 32, fontStyle: 'italic' }}>
              Seven layers. All independently verifiable. Not a promise — a contract address.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/solvency" style={{ display: 'inline-block', background: C.navy, color: '#fff', padding: '12px 28px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>
                Verify Solvency →
              </Link>
              <Link href="/axau" style={{ display: 'inline-block', border: `1px solid ${C.gold}`, color: C.gold, padding: '12px 28px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none' }}>
                Access the Reserve
              </Link>
              <Link href="/disclosure" style={{ display: 'inline-block', border: `1px solid ${C.border}`, color: C.navy, padding: '12px 28px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none' }}>
                Read Disclosure
              </Link>
            </div>
          </div>
          {/* Right: cinematic hero image */}
          <div style={{
            position: 'relative',
            overflow: 'hidden',
            borderLeft: `1px solid ${C.border}`,
            minHeight: 380,
          }}>
            <img
              src="/visuals/infra-hero.png"
              alt="Axiom Protocol sovereign financial infrastructure"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                display: 'block',
              }}
            />
            {/* Subtle gold overlay stripe at bottom */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.88)',
              borderTop: `1px solid ${C.gold}`,
            }}>
              <p style={{ ...monoLabel, color: C.gold, margin: 0 }}>Arbitrum One · Chain ID 42161 · Mainnet Live</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: WHAT MAKES THIS DIFFERENT ───────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 02 — Infrastructure Differentiators</p>
          <h2 style={{ ...serif(30), fontWeight: 700, marginTop: 6, marginBottom: 8 }}>
            Why This Is Infrastructure — Not a Token Project
          </h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, maxWidth: 580 }}>
            Six properties that distinguish Axiom from a wrapped asset or generic DeFi protocol. Each is verifiable without trusting the team.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
          {DIFFERENTIATORS.map((item, i) => (
            <div
              key={item.label}
              style={{
                padding: '28px 22px 24px',
                borderBottom: i < DIFFERENTIATORS.length - 2 ? `1px solid ${C.border}` : 'none',
                borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.bg : C.bgAlt,
                borderLeft: `3px solid ${C.forest}`,
              }}
            >
              {/* 3D Icon + header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ flex: 1, paddingRight: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ ...serif(14), fontWeight: 700, color: C.navy }}>{item.label}</p>
                    <span style={{ ...monoLabel, color: C.forest, border: `1px solid ${C.forest}`, padding: '2px 7px', flexShrink: 0, marginLeft: 8 }}>{item.badge}</span>
                  </div>
                  <p style={{ ...mono, fontSize: 12, lineHeight: 1.75, color: '#4b5563' }}>{item.desc}</p>
                </div>
                <div style={{
                  width: 72,
                  height: 72,
                  flexShrink: 0,
                  overflow: 'hidden',
                  border: `1px solid ${C.border}`,
                  background: C.bg,
                }}>
                  <img
                    src={item.icon}
                    alt={item.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CINEMATIC DIVIDER: Institutional Stock ───────────────────────────── */}
      <div style={{ marginBottom: 56, position: 'relative', overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <img
          src="/visuals/stock-investor.jpg"
          alt="Institutional capital infrastructure"
          style={{ width: '100%', height: 220, objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(255,255,255,0.96) 38%, rgba(255,255,255,0.55) 70%, rgba(255,255,255,0.1) 100%)',
          display: 'flex', alignItems: 'center', padding: '0 40px',
        }}>
          <div>
            <p style={{ ...monoLabel, color: C.forest, marginBottom: 8 }}>Live on Arbitrum One Mainnet</p>
            <p style={{ ...serif(26), fontWeight: 700, lineHeight: 1.2, marginBottom: 0 }}>
              Not a testnet. Not a pilot.<br />
              <span style={{ color: C.gold }}>Production infrastructure.</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: LIVE NOW ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 03 — Current Operational State</p>
          <h2 style={{ ...serif(30), fontWeight: 700, marginTop: 6, marginBottom: 8 }}>Live Now on Arbitrum One</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7 }}>
            These components are active on mainnet. Not demos. Not testnets. All independently verifiable on Arbiscan.
          </p>
        </div>
        <div style={{ border: `1px solid ${C.border}` }}>
          {LIVE_NOW.map((item, i) => (
            <Link
              key={`${item.layer}-${item.name}`}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', textDecoration: 'none',
                borderBottom: i < LIVE_NOW.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.bg : C.bgAlt,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ ...monoLabel, color: C.muted, minWidth: 36 }}>{item.layer}</span>
                <div>
                  <p style={{ ...serif(14), color: C.navy, fontWeight: 700, marginBottom: 3 }}>{item.name}</p>
                  <p style={{ ...mono, fontSize: 11, lineHeight: 1.5 }}>{item.detail}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
                <StatusBadge status={item.status} />
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderTop: 'none', padding: '10px 20px', background: C.bgAlt, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ ...monoLabel, color: C.muted }}>Formation: Wealth Practice Groups · Land Pipeline · Community Credit expansion</p>
          <Link href="/solvency" style={{ ...monoLabel, color: C.navy, textDecoration: 'underline' }}>Live solvency →</Link>
        </div>
      </div>

      {/* ── SECTION 4: CAPITAL FLOW ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 04 — Capital Architecture</p>
          <h2 style={{ ...serif(30), fontWeight: 700, marginTop: 6, marginBottom: 8 }}>How Capital Moves Through the System</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, maxWidth: 560 }}>
            Fiat enters at the banking layer, converts to the settlement unit, and routes to the reserve or capital deployment layer. Every step is on-chain and independently verifiable.
          </p>
        </div>
        <div style={{ border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {CAPITAL_FLOW.map((node, i) => (
              <div key={node.step} style={{ borderRight: i < CAPITAL_FLOW.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ padding: '24px 18px', background: i % 2 === 0 ? C.bg : C.bgAlt }}>
                  <p style={{ ...monoLabel, color: C.muted, marginBottom: 6 }}>{node.layer}</p>
                  <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 22, fontWeight: 700, color: node.color, marginBottom: 4 }}>{node.step}</p>
                  <p style={{ ...serif(13), fontWeight: 700, color: C.navy, marginBottom: 5 }}>{node.label}</p>
                  <p style={{ ...mono, fontSize: 10, lineHeight: 1.6 }}>{node.sub}</p>
                </div>
                <div style={{ height: 3, background: node.color }} />
                {i < CAPITAL_FLOW.length - 1 && (
                  <div style={{ textAlign: 'center', padding: '6px 0', background: i % 2 === 0 ? C.bg : C.bgAlt }}>
                    <span style={{ ...mono, color: C.muted }}>→</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 20px', background: C.bgAlt, borderTop: `1px solid ${C.border}` }}>
            <p style={{ ...mono, fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
              Direct path: PAXG → AXAU via GoldVault automated control layer (one transaction, identity required).
              Assisted path: USD → Banking → AXUSD (PSM) → Ops-mediated AXAU fulfillment. Both paths require ERC-3643 credential.
            </p>
          </div>
        </div>

        {/* Gold Reserve cinematic accent */}
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ overflow: 'hidden' }}>
            <img
              src="/visuals/gold-reserve.png"
              alt="AXAU gold reserve vault"
              style={{ width: '100%', height: 260, objectFit: 'cover', objectPosition: 'center', display: 'block' }}
            />
          </div>
          <div style={{ padding: '32px 28px', background: C.bgGold, borderLeft: `1px solid ${C.gold}`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ ...monoLabel, color: C.gold, marginBottom: 10 }}>Reserve Layer · L02 · LIVE</p>
            <h3 style={{ ...serif(22), fontWeight: 700, marginBottom: 12 }}>AXAU: The Hard-Asset Anchor</h3>
            <p style={{ ...mono, fontSize: 11, lineHeight: 1.75, color: '#4b5563', marginBottom: 18 }}>
              AXAU is minted directly against PAXG (Paxos Gold) via the GoldVault automated control layer. Coverage ratio enforced on-chain before every mint. Chainlink XAU/USD oracle verifies pricing. Not a promise — a live contract.
            </p>
            <Link
              href="/axau"
              style={{ display: 'inline-block', border: `1px solid ${C.gold}`, color: C.gold, padding: '8px 20px', fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.09em', textTransform: 'uppercase', textDecoration: 'none', alignSelf: 'flex-start' }}
            >
              Access the Reserve →
            </Link>
          </div>
        </div>
      </div>

      {/* ── SECTION 5: WHO IT IS FOR ────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        {/* Land cinematic banner */}
        <div style={{ marginBottom: 24, position: 'relative', overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <img
            src="/visuals/stock-land.jpg"
            alt="Real estate land acquisition pipeline"
            style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, rgba(255,255,255,0.95) 42%, rgba(255,255,255,0.6) 70%, rgba(255,255,255,0.1) 100%)',
            display: 'flex', alignItems: 'center', padding: '0 40px',
          }}>
            <div>
              <p style={monoLabel}>Section 05 — Access Paths</p>
              <h2 style={{ ...serif(28), fontWeight: 700, marginTop: 6, marginBottom: 0 }}>Who This Is Built For</h2>
            </div>
          </div>
        </div>

        <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, marginBottom: 20 }}>
          Four distinct access paths. Each layer of the protocol is designed for a specific participant type and capital position.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
          {WHO_ITS_FOR.map((profile, i) => (
            <div
              key={profile.segment}
              style={{
                padding: '26px 22px',
                borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none',
                borderBottom: i < 2 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.bg : C.bgAlt,
                borderLeft: `3px solid ${profile.borderColor}`,
              }}
            >
              <p style={{ ...monoLabel, color: C.gold, marginBottom: 10 }}>{profile.path}</p>
              <p style={{ ...serif(17), fontWeight: 700, color: C.navy, marginBottom: 10 }}>{profile.segment}</p>
              <p style={{ ...mono, fontSize: 12, lineHeight: 1.75, marginBottom: 18, color: '#4b5563' }}>{profile.desc}</p>
              <Link
                href={profile.href}
                style={{ display: 'inline-block', border: `1px solid ${C.navy}`, color: C.navy, padding: '8px 18px', fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.09em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}
              >
                {profile.cta} →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 6: PROOF / VERIFICATION ─────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 06 — Verification Layer</p>
          <h2 style={{ ...serif(30), fontWeight: 700, marginTop: 6, marginBottom: 8 }}>Verify. Don&apos;t Trust.</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, maxWidth: 560 }}>
            Four independent access points for verification. All live. No account required. No email required. No narrative required — just read the chain.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
          {PROOF_LINKS.map((link, i) => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                display: 'block', textDecoration: 'none',
                padding: '24px 22px',
                borderRight: i < PROOF_LINKS.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.bg : C.bgAlt,
                borderTop: `3px solid ${C.forest}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ ...serif(14), fontWeight: 700, color: C.navy }}>{link.label}</p>
                <span style={{ ...monoLabel, color: C.forest, border: `1px solid ${C.forest}`, padding: '2px 6px' }}>{link.badge}</span>
              </div>
              <p style={{ ...mono, fontSize: 11, lineHeight: 1.7, marginBottom: 16, color: '#4b5563' }}>{link.sub}</p>
              <p style={{ ...monoLabel, color: C.navy }}>Verify →</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── SECTION 7: FINAL CTA ────────────────────────────────────────────── */}
      {/* Capital deploy cinematic image above CTA */}
      <div style={{ marginBottom: 0, position: 'relative', overflow: 'hidden', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
        <img
          src="/visuals/capital-deploy.png"
          alt="Institutional capital deployment team"
          style={{ width: '100%', height: 300, objectFit: 'cover', objectPosition: 'center 20%', display: 'block' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.75) 70%, rgba(255,255,255,1) 100%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0 40px 24px',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <p style={{ ...monoLabel, color: C.forest, marginBottom: 4 }}>Institutional Capital Access</p>
            <p style={{ ...serif(20), fontWeight: 700, lineHeight: 1.2 }}>
              Reg D 506(c) · Lending Fund · SPV Programs
            </p>
          </div>
          <Link
            href="/lending-fund"
            style={{ display: 'inline-block', background: C.navy, color: '#fff', padding: '10px 22px', fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700, flexShrink: 0 }}
          >
            View Capital Programs →
          </Link>
        </div>
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderTop: `4px solid ${C.navy}`, padding: '56px 40px', background: C.bgAlt, textAlign: 'center', marginBottom: 24 }}>
        <p style={{ ...monoLabel, color: C.forest, marginBottom: 16 }}>The Axiom Protocol — Arbitrum One — Chain ID 42161</p>
        <h2 style={{ ...serif(38), fontWeight: 700, lineHeight: 1.12, maxWidth: 560, margin: '0 auto 18px' }}>
          Stop buying narratives.<br />Enter the infrastructure layer.
        </h2>
        <p style={{ ...mono, fontSize: 13, lineHeight: 1.85, maxWidth: 500, margin: '0 auto 34px', color: '#4b5563' }}>
          The contracts are on-chain. The solvency data is public. The proof-of-execution logs are hash-chained.
          Every claim on this platform has a corresponding on-chain record. Verify before engaging capital.
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/proof-of-execution" style={{ display: 'inline-block', background: C.navy, color: '#fff', padding: '13px 32px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>
            Verify the System →
          </Link>
          <Link href="/axau" style={{ display: 'inline-block', border: `1px solid ${C.gold}`, color: C.gold, padding: '13px 32px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Access the Reserve
          </Link>
          <Link href="/axau-early-access" style={{ display: 'inline-block', border: `1px solid ${C.border}`, color: C.navy, padding: '13px 32px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Apply for Access
          </Link>
        </div>
      </div>

      {/* LEGAL DISCLOSURE */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
        <p style={{ ...mono, fontSize: 10, lineHeight: 1.9, color: C.muted }}>
          Axiom Protocol infrastructure is built on Arbitrum One (Chain ID 42161). All on-chain data referenced on this page is independently verifiable via Arbiscan or the relevant contract address. Capital programs (Lending Fund, SPV Capital Program) are offered under SEC Reg D 506(c) and are available to accredited investors only. AXAU and AXUSD require an active ERC-3643 identity credential. This page does not constitute a public offering, financial advice, or investment recommendation. System statuses reflect current operational state — formation-stage components are not yet in production. Coverage ratios and reserve data are derived from live on-chain snapshots and may lag real-time state by up to one hour.
        </p>
      </div>
    </DesignLawLayout>
  );
}
