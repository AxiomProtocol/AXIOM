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
const serifBold = (size = 16, color = C.navy): React.CSSProperties => ({ ...serif(size, color), fontWeight: 700 });

const NOT_THIS = [
  { label: 'Not a token launch', detail: 'AXM is a governance token. There is no presale. No raise structured around token appreciation. Governance is the function.' },
  { label: 'Not a yield promise', detail: 'No guaranteed APY. No "estimated returns." Capital programs are Reg D private placements with disclosed risk profiles.' },
  { label: 'Not a narrative pitch', detail: 'Every system claim has a contract address on Arbiscan. Every solvency figure has an on-chain source. Verify before trusting.' },
  { label: 'Not custodial', detail: 'AXUSD, AXAU, and AXM stay in your wallet. The protocol uses automated control layers — not custodial accounts.' },
];

const DIFFERENTIATORS = [
  {
    label: 'Banking & Settlement Layer',
    badge: 'L00 · OFFLINE',
    desc: 'ACH/wire banking infrastructure is currently offline. BitGo institutional custody handles the on-chain layer. Fiat capital entry rails will be restored when the settlement layer is reconfigured.',
    href: '/banking',
  },
  {
    label: 'Identity-Gated Settlement Rail',
    badge: 'L01 · LIVE',
    desc: 'AXUSD is not a wrapped stablecoin. It is issued through a live PSM, requires an ERC-3643 on-chain identity credential, and is the exclusive unit of account for all capital movement across the protocol. No anonymous access.',
    href: '/axusd-3643',
  },
  {
    label: 'Settlement Conversion + Peg Layer',
    badge: 'L01.5 · LIVE',
    desc: 'The Protocol Exchange (Camelot V2) and PSM work together to maintain AXUSD\'s $1.00 peg. Not a generic DEX — a purpose-built settlement conversion and peg maintenance layer with identity-gated liquidity provision.',
    href: '/dex',
  },
  {
    label: 'Direct On-Chain Reserve Issuance',
    badge: 'L02 · LIVE',
    desc: 'AXAU is minted directly against PAXG via the GoldVault automated control layer. One transaction. No intermediary. Coverage ratio enforced on-chain by the NAVEngine contract before every mint — the system cannot over-issue by design.',
    href: '/axau',
  },
  {
    label: 'Proof of Execution — Not Attestation',
    badge: 'L05 · LIVE',
    desc: 'Every capital movement, solvency snapshot, and operational action is recorded with a hash-chained audit trail. Published live from a canonical on-chain snapshot. Publicly readable on Arbitrum One. The chain does not require trust — it requires reading.',
    href: '/proof-of-execution',
  },
  {
    label: 'Capital Regime Intelligence',
    badge: 'L04 · LIVE',
    desc: 'MIRDT scores nine dimensions of capital regime readiness to generate a live advisory signal. Sentinel gates authorization decisions. Observer provides institutional read access to treasury and risk data — no login required.',
    href: '/mirdt',
  },
];

const LIVE_NOW = [
  { layer: '00', name: 'Banking Infrastructure', detail: 'ACH/wire settlement rail offline · BitGo institutional custody active', href: '/banking', status: 'OFFLINE' },
  { layer: '01', name: 'AXUSD Settlement Rail', detail: 'ERC-3643 stablecoin · PSM active · Identity-gated · Peg maintained via Camelot V2', href: '/axusd-3643', status: 'LIVE' },
  { layer: '01.5', name: 'Protocol Exchange (DEX)', detail: 'Camelot V2 · AXM/AXUSD trading pairs · PSM-backed peg maintenance · EulerSwap LP withdrawn', href: '/dex', status: 'LIVE' },
  { layer: '02', name: 'AXAU Reserve', detail: 'PAXG-backed positions · Direct on-chain mint/redeem · GoldVault contract · Coverage ratio enforced', href: '/axau', status: 'LIVE' },
  { layer: '03', name: 'Lending Fund (Reg D)', detail: 'Bridge loan mandate · LP fund · 506(c) · Accepting expressions of interest', href: '/lending-fund', status: 'FORMATION' },
  { layer: '03', name: 'Capital Program (SPVs)', detail: 'SPV-structured · 506(c) · Accredited investors · Formation stage', href: '/pilot', status: 'FORMATION' },
  { layer: '04', name: 'Regime Intelligence (MIRDT)', detail: 'Nine-dimension capital regime scoring · Sentinel authorization gate · Observer read access', href: '/mirdt', status: 'LIVE' },
  { layer: '05', name: 'Solvency Console', detail: 'Three-mode live verification · CR / RR / LBR · Canonical on-chain snapshot · Public', href: '/solvency', status: 'LIVE' },
  { layer: '05', name: 'Proof of Execution', detail: 'Hash-chained audit trail · All operational actions · Independently verifiable on Arbitrum One', href: '/proof-of-execution', status: 'LIVE' },
  { layer: '05', name: 'Institutional Disclosure', detail: 'Contract addresses · Coverage formulas · Policy mode · Legal framework · No login required', href: '/disclosure', status: 'LIVE' },
];

const CAPITAL_FLOW = [
  { step: 'USD', label: 'Fiat Entry', sub: 'Banking rail offline · ACH/wire entry pending restoration', color: C.forest, layer: 'L00' },
  { step: 'AXUSD', label: 'Settlement Rail', sub: 'ERC-3643 · PSM-backed peg · Exclusive unit of account', color: C.navy, layer: 'L01', href: '/axusd-3643' },
  { step: 'DEX / PSM', label: 'Conversion + Peg', sub: 'Camelot V2 · Peg maintenance · AXM liquidity', color: C.gold, layer: 'L01.5', href: '/dex' },
  { step: 'AXAU', label: 'Reserve Layer', sub: 'PAXG-backed positions · Direct on-chain mint · Coverage enforced', color: C.gold, layer: 'L02', href: '/axau' },
  { step: 'Capital', label: 'Deployment', sub: 'Lending Fund · SPV programs · Reg D 506(c)', color: C.forest, layer: 'L03', href: '/pilot' },
];

const WHO_ITS_FOR = [
  {
    segment: 'No Starting Capital — Income-Backed Entry',
    path: 'Community Credit → Wealth Practice → Syndication',
    desc: 'An income-backed credit position covers your first contribution. No crypto, no savings buffer, no collateral required. Build a verifiable on-chain participation record and progress into group economics and structured deal access.',
    href: '/community-credit',
    cta: 'Apply for Entry Credit',
    borderColor: C.forest,
  },
  {
    segment: 'Capital Allocators and Accredited Investors',
    path: 'Syndication → Lending Fund → Secondary Market',
    desc: 'Access Reg D 506(c) structured offerings, the bridge loan LP fund, and the permissioned secondary transfer network — with on-chain settlement, institutional-grade solvency disclosure, and independently verifiable reporting.',
    href: '/syndication',
    cta: 'View Capital Programs',
    borderColor: C.navy,
  },
  {
    segment: 'Reserve and Settlement Participants',
    path: 'ERC-3643 Credential → AXAU / AXUSD Access',
    desc: 'Obtain an ERC-3643 on-chain identity credential once. Then mint AXAU (structured around PAXG-backed reserve positions) directly in one transaction, or acquire AXUSD through the PSM. Self-custody throughout.',
    href: '/axau-early-access',
    cta: 'Apply for Reserve Access',
    borderColor: C.gold,
  },
  {
    segment: 'Operators, Deal Sourcers, and Builders',
    path: 'Deal Intelligence → MIRDT → Sentinel Authorization',
    desc: 'Access deal intelligence, underwriting tools, craftsman cost estimation, regime scoring, and the full operations dashboard. Purpose-built for active deal sourcing, due diligence, and capital deployment workflows.',
    href: '/deal-intelligence',
    cta: 'Access Intelligence Layer',
    borderColor: C.muted,
  },
];

const PROOF_LINKS = [
  { label: 'Proof of Execution', sub: 'Hash-chained audit trail of all operational actions. Publicly verifiable. No account required.', href: '/proof-of-execution', badge: 'LIVE' },
  { label: 'Solvency Console', sub: 'Coverage ratio, reserve ratio, and LBR — live from a canonical on-chain snapshot. Three-mode verification.', href: '/solvency', badge: 'LIVE' },
  { label: 'Institutional Disclosure', sub: 'Contract addresses, policy mode, coverage formulas, and complete legal framework. No login.', href: '/disclosure', badge: 'LIVE' },
  { label: 'Observer Dashboard', sub: 'Treasury, governance, and risk data — independent read access for allocators. No account.', href: '/observer', badge: 'LIVE' },
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
        <meta name="description" content="Axiom Protocol is a seven-layer financial operating system on Arbitrum One. FDIC-insured banking, identity-gated AXUSD settlement, PAXG-backed AXAU reserve, Reg D capital deployment, and a live solvency console. Not a narrative. A verifiable system." />
      </Head>

      <div style={{ marginBottom: 10 }}>
        <p style={monoLabel}>Axiom Protocol / Infrastructure Overview</p>
      </div>

      {/* ── SECTION 1: HARD-HOOK HERO ────────────────────────────────────────── */}
      <div style={{ borderTop: `4px solid ${C.gold}`, marginBottom: 56 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,380px)',
          gap: 0,
          borderBottom: `1px solid ${C.border}`,
          alignItems: 'stretch',
        }}>
          <div style={{ padding: '52px 48px 48px 0' }}>
            <p style={{ ...monoLabel, color: C.forest, marginBottom: 16, fontSize: 11 }}>
              Most &ldquo;RWA&rdquo; platforms are a pitch deck attached to a token. This is a contract address, a live banking account, a solvency console, and a coverage ratio. Read the chain.
            </p>
            <h1 style={{ ...serifBold(44), lineHeight: 1.08, marginBottom: 22, maxWidth: 700 }}>
              The Financial Operating System<br />
              for the On-Chain Economy.<br />
              <span style={{ color: C.gold }}>Seven Layers. All Verifiable. Live.</span>
            </h1>
            <p style={{ ...serif(16, C.muted), maxWidth: 600, lineHeight: 1.80, marginBottom: 14 }}>
              Axiom Protocol is a vertically integrated financial operating system — FDIC-insured banking, identity-gated AXUSD settlement, PAXG-backed AXAU reserve issuance, Reg D capital deployment, nine-dimension regime intelligence, and a three-mode public solvency console — all on Arbitrum One. Every layer has a contract address. Every claim has an on-chain record.
            </p>
            <p style={{ ...mono, fontSize: 12, color: C.muted, marginBottom: 32, fontStyle: 'italic' }}>
              Not a narrative. A verifiable system. Read Arbiscan. Then decide.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/solvency" style={{ display: 'inline-block', background: C.navy, color: '#fff', padding: '12px 28px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>
                Live Solvency Console →
              </Link>
              <Link href="/axau-early-access" style={{ display: 'inline-block', border: `1px solid ${C.gold}`, color: C.gold, padding: '12px 28px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none' }}>
                Apply for Reserve Access
              </Link>
              <Link href="/disclosure" style={{ display: 'inline-block', border: `1px solid ${C.border}`, color: C.navy, padding: '12px 28px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none' }}>
                Read Disclosure
              </Link>
            </div>
          </div>
          <div style={{ position: 'relative', overflow: 'hidden', borderLeft: `1px solid ${C.border}`, minHeight: 380 }}>
            <img
              src="/visuals/infra-hero.png"
              alt="Axiom Protocol sovereign financial infrastructure"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'rgba(255,255,255,0.90)', borderTop: `1px solid ${C.gold}` }}>
              <p style={{ ...monoLabel, color: C.gold, margin: 0 }}>Arbitrum One · Chain ID 42161 · All Contracts Live</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: WHAT THIS IS NOT ─────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 16 }}>
          <p style={monoLabel}>Section 01 — Positioning</p>
          <h2 style={{ ...serifBold(28), marginTop: 6, marginBottom: 8 }}>What Axiom Is Not</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, maxWidth: 560, color: C.muted }}>
            Clarity before engagement. Four things this platform is not — and why the distinction matters.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
          {NOT_THIS.map((item, i) => (
            <div key={item.label} style={{
              padding: '24px 20px',
              borderBottom: i < NOT_THIS.length - 2 ? `1px solid ${C.border}` : 'none',
              borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none',
              background: i % 2 === 0 ? C.bg : C.bgAlt,
              borderLeft: `3px solid ${C.navy}`,
            }}>
              <p style={{ ...mono, color: C.navy, fontWeight: 700, marginBottom: 8, fontSize: 12, letterSpacing: '0.08em' }}>{item.label}</p>
              <p style={{ ...mono, fontSize: 11, lineHeight: 1.75, color: C.muted }}>{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: WHAT MAKES THIS DIFFERENT ────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 02 — Infrastructure Differentiators</p>
          <h2 style={{ ...serifBold(30), marginTop: 6, marginBottom: 8 }}>
            Six Properties That Make This Infrastructure
          </h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, maxWidth: 580, color: C.muted }}>
            Each is verifiable without trusting the team. Contract addresses are on Arbiscan. Solvency data is on-chain.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
          {DIFFERENTIATORS.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                padding: '28px 22px 24px',
                borderBottom: i < DIFFERENTIATORS.length - 2 ? `1px solid ${C.border}` : 'none',
                borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.bg : C.bgAlt,
                borderLeft: `3px solid ${C.forest}`,
                height: '100%',
                boxSizing: 'border-box' as const,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ ...serif(14), fontWeight: 700, color: C.navy }}>{item.label}</p>
                  <span style={{ ...monoLabel, color: C.forest, border: `1px solid ${C.forest}`, padding: '2px 7px', flexShrink: 0, marginLeft: 8 }}>{item.badge}</span>
                </div>
                <p style={{ ...mono, fontSize: 12, lineHeight: 1.75, color: '#4b5563' }}>{item.desc}</p>
                <p style={{ ...monoLabel, color: C.navy, marginTop: 14 }}>Verify →</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── CINEMATIC DIVIDER ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 56, position: 'relative', overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <img
          src="/visuals/stock-investor.jpg"
          alt="Institutional capital infrastructure"
          style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(30,58,95,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '0 24px' }}>
            <p style={{ ...serifBold(28, '#ffffff'), marginBottom: 8, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
              Every claim on this platform has a corresponding contract address.
            </p>
            <p style={{ ...mono, color: '#f0d98a', fontSize: 12 }}>
              Verify on Arbiscan · Read the solvency console · Check the proof-of-execution logs
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: LIVE NOW ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 03 — Operational Status</p>
          <h2 style={{ ...serifBold(30), marginTop: 6, marginBottom: 8 }}>What Is Live Now</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, maxWidth: 560, color: C.muted }}>
            Current operational state of each protocol component. All on-chain data independently verifiable.
          </p>
        </div>
        <div style={{ border: `1px solid ${C.border}` }}>
          {LIVE_NOW.map((row, i) => (
            <Link key={row.name} href={row.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: i < LIVE_NOW.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.bg : C.bgAlt,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                  <span style={{ ...monoLabel, color: C.muted, width: 32, flexShrink: 0 }}>L{row.layer}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...mono, color: C.navy, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{row.name}</p>
                    <p style={{ ...mono, fontSize: 10, color: C.muted }}>{row.detail}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
                  <StatusBadge status={row.status} />
                  <span style={{ ...mono, color: C.muted }}>→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderTop: 'none', padding: '12px 20px', background: C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ ...mono, fontSize: 11 }}>LIVE = active on Arbitrum One mainnet. FORMATION = capital programs accepting qualified expressions of interest.</p>
          <Link href="/solvency" style={{ ...monoLabel, color: C.navy, textDecoration: 'underline' }}>Live Solvency Console →</Link>
        </div>
      </div>

      {/* ── SECTION 5: CAPITAL FLOW ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 04 — Capital Flow</p>
          <h2 style={{ ...serifBold(30), marginTop: 6, marginBottom: 8 }}>How Capital Moves Through the System</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, maxWidth: 560, color: C.muted }}>
            Fiat enters through FDIC-insured banking rails. Converts to the settlement unit. Moves into the reserve layer or capital programs. Every step is on-chain and verifiable.
          </p>
        </div>
        <div style={{ border: `1px solid ${C.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0 }}>
            {CAPITAL_FLOW.map((node, i) => {
              const inner = (
                <>
                  <div style={{
                    padding: '24px 18px 20px',
                    borderRight: i < CAPITAL_FLOW.length - 1 ? `1px solid ${C.border}` : 'none',
                    background: i % 2 === 0 ? C.bg : C.bgAlt,
                    height: '100%', boxSizing: 'border-box' as const,
                  }}>
                    <p style={{ ...monoLabel, color: C.muted, marginBottom: 6 }}>{node.layer}</p>
                    <p style={{ ...serifBold(22, C.navy), marginBottom: 4 }}>{node.step}</p>
                    <p style={{ ...mono, color: node.color, fontWeight: 700, marginBottom: 8, fontSize: 11 }}>{node.label}</p>
                    <p style={{ ...mono, fontSize: 10, lineHeight: 1.65, color: C.muted }}>{node.sub}</p>
                    {i < CAPITAL_FLOW.length - 1 && (
                      <p style={{ ...mono, color: C.muted, marginTop: 12, textAlign: 'right' }}>→</p>
                    )}
                  </div>
                  <div style={{ height: 3, background: node.color }} />
                </>
              );
              return node.href ? (
                <Link key={node.step} href={node.href} style={{ textDecoration: 'none' }}>{inner}</Link>
              ) : (
                <div key={node.step}>{inner}</div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SECTION 6: WHO IT'S FOR ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 05 — Participation Paths</p>
          <h2 style={{ ...serifBold(30), marginTop: 6, marginBottom: 8 }}>Who This Is Built For</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, maxWidth: 560, color: C.muted }}>
            Four participation paths — each designed for a specific capital position and intent. Choose the layer that matches where you are.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
          {WHO_ITS_FOR.map((segment, i) => (
            <div key={segment.segment} style={{
              padding: '28px 22px 24px',
              borderBottom: i < WHO_ITS_FOR.length - 2 ? `1px solid ${C.border}` : 'none',
              borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none',
              background: i % 2 === 0 ? C.bg : C.bgAlt,
              borderLeft: `3px solid ${segment.borderColor}`,
            }}>
              <p style={{ ...mono, color: segment.borderColor, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 8 }}>{segment.path}</p>
              <h3 style={{ ...serifBold(17), marginBottom: 10 }}>{segment.segment}</h3>
              <p style={{ ...mono, fontSize: 12, lineHeight: 1.75, color: C.muted, marginBottom: 20 }}>{segment.desc}</p>
              <Link href={segment.href} style={{
                display: 'inline-block',
                border: `1px solid ${segment.borderColor}`,
                color: segment.borderColor,
                padding: '10px 20px',
                fontFamily: '"Courier New", monospace', fontSize: 10,
                letterSpacing: '0.10em', textTransform: 'uppercase' as const,
                textDecoration: 'none', fontWeight: 700,
              }}>
                {segment.cta} →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 7: PROOF / VERIFICATION ─────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 06 — Verification Infrastructure</p>
          <h2 style={{ ...serifBold(30), marginTop: 6, marginBottom: 8 }}>Read the Chain — No Trust Required</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, maxWidth: 560, color: C.muted }}>
            Four publicly accessible verification layers. No account. No email. No login required.
          </p>
        </div>

        {/* Principle callout */}
        <div style={{ border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.forest}`, padding: '20px 24px', background: C.bgAlt, marginBottom: 24 }}>
          <p style={{ ...monoLabel, color: C.forest, marginBottom: 8 }}>Verification Principle</p>
          <p style={{ ...serif(20, C.navy), fontWeight: 700, marginBottom: 8 }}>
            The chain does not require trust — it requires reading.
          </p>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, color: C.muted, maxWidth: 580 }}>
            Every contract address is public. Every solvency figure derives from a canonical on-chain snapshot. Every operational action is in a hash-chained audit trail. Anyone can verify without engaging the team.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0, border: `1px solid ${C.border}`, marginBottom: 24 }}>
          {PROOF_LINKS.map((link, i) => (
            <Link key={link.label} href={link.href} style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '24px 20px',
                borderRight: i < PROOF_LINKS.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.bg : C.bgAlt,
                borderTop: `4px solid ${C.forest}`,
                height: '100%', boxSizing: 'border-box' as const,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ ...serifBold(15) }}>{link.label}</p>
                  <StatusBadge status={link.badge} />
                </div>
                <p style={{ ...mono, fontSize: 11, lineHeight: 1.70, color: C.muted, marginBottom: 14 }}>{link.sub}</p>
                <p style={{ ...monoLabel, color: C.navy }}>Verify →</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── SECTION 8: FINAL CTA ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 14, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.navy}` }}>
        <div style={{ padding: '56px 40px', background: C.bgAlt, textAlign: 'center' }}>
          <p style={{ ...monoLabel, color: C.gold, marginBottom: 20, letterSpacing: '0.14em' }}>
            Axiom Protocol · Seven Layers · Arbitrum One Mainnet · All Systems Active
          </p>
          <h2 style={{ ...serifBold(38), lineHeight: 1.15, marginBottom: 18, maxWidth: 680, margin: '0 auto 18px' }}>
            The solvency console is public.<br />
            The contract addresses are on Arbiscan.<br />
            <span style={{ color: C.gold }}>Verify it first. Then engage.</span>
          </h2>
          <p style={{ ...mono, fontSize: 13, lineHeight: 1.8, color: C.muted, maxWidth: 560, margin: '0 auto 36px' }}>
            No narrative required. The solvency console, proof-of-execution audit trail, institutional disclosure, and Observer dashboard are all public. Start there. No account. No email. No pitch.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
            <Link href="/solvency" style={{ display: 'inline-block', background: C.navy, color: '#fff', padding: '14px 32px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>
              Live Solvency Console →
            </Link>
            <Link href="/axau-early-access" style={{ display: 'inline-block', border: `1px solid ${C.gold}`, color: C.gold, padding: '14px 32px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Apply for Reserve Access
            </Link>
            <Link href="/disclosure" style={{ display: 'inline-block', border: `1px solid ${C.border}`, color: C.navy, padding: '14px 32px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Institutional Disclosure
            </Link>
            <Link href="/contact" style={{ display: 'inline-block', border: `1px solid ${C.border}`, color: C.navy, padding: '14px 32px', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Contact the Team
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            <Link href="/proof-of-execution" style={{ ...monoLabel, color: C.navy, textDecoration: 'underline' }}>Proof of Execution →</Link>
            <Link href="/observer" style={{ ...monoLabel, color: C.navy, textDecoration: 'underline' }}>Observer Dashboard →</Link>
            <Link href="/banking" style={{ ...monoLabel, color: C.navy, textDecoration: 'underline' }}>Banking Infrastructure →</Link>
          </div>
          <p style={{ ...monoLabel, color: C.muted, marginTop: 24 }}>
            L00 Banking · L01 Settlement · L01.5 Exchange · L02 Reserve · L03 Capital · L04 Intelligence · L05 Trust
          </p>
        </div>
      </div>
    </DesignLawLayout>
  );
}
