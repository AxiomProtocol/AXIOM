import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../components/design-law';

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  navy:   '#1B2A4A',
  forest: '#1D3D2A',
  gold:   '#B8973A',
  muted:  'rgba(27,42,74,0.50)',
  border: 'rgba(27,42,74,0.18)',
  surface: '#F8F6F0',
  bg:     '#ffffff',
  bgAlt:  '#F8F6F0',
};

const mono: React.CSSProperties = { fontFamily: 'monospace', fontSize: 11, color: C.muted, letterSpacing: '0.04em' };
const monoLabel: React.CSSProperties = { ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontSize: 10 };
const serif = (size = 16, color = C.navy): React.CSSProperties => ({ fontFamily: 'Georgia, serif', fontSize: size, color, fontWeight: 400 });

const DIFFERENTIATORS = [
  {
    label: 'Direct Reserve Issuance',
    desc: 'AXAU is minted directly on-chain via the GoldVault contract — no intermediary, no wrapped token. PAXG is deposited, coverage is validated, AXAU is issued in a single transaction.',
    status: 'LIVE',
  },
  {
    label: 'Settlement Layer',
    desc: 'AXUSD is not a wrapper. It is the protocol\'s identity-gated settlement unit — backed by a live PSM, governed by a coverage ratio, and required for capital movement across the stack.',
    status: 'LIVE',
  },
  {
    label: 'Banking Infrastructure',
    desc: 'Fiat capital enters through an FDIC-insured institutional account at First Internet Bank via Increase ACH/wire rails. BitGo institutional custody handles the crypto layer.',
    status: 'LIVE',
  },
  {
    label: 'Proof of Execution',
    desc: 'Every operational action is recorded with a hash-chained audit trail. Solvency snapshots, capital movements, and governance decisions are publicly verifiable — not attested, verified.',
    status: 'LIVE',
  },
  {
    label: 'Solvency Visibility',
    desc: 'The solvency console publishes coverage ratio, reserve ratio, and liability-backed reserve in real time. Derived from a canonical on-chain snapshot. Not a dashboard — a verification layer.',
    status: 'LIVE',
  },
  {
    label: 'Regime Intelligence',
    desc: 'MIRDT scores nine capital dimensions to produce a live advisory signal for capital deployment readiness. Sentinel gates authorization decisions. Observer provides institutional-grade read access.',
    status: 'LIVE',
  },
];

const LIVE_NOW = [
  { layer: '00', name: 'Banking Infrastructure', detail: 'Increase ACH/wire · FDIC-insured · BitGo custody', href: '/banking' },
  { layer: '01', name: 'AXUSD Settlement Rail', detail: 'ERC-3643 stablecoin · PSM active · Identity-gated', href: '/axusd-3643' },
  { layer: '01.5', name: 'Protocol Exchange', detail: 'Camelot V2 DEX · AXM/AXUSD pairs · PSM conversion', href: '/dex' },
  { layer: '02', name: 'AXAU Reserve', detail: 'PAXG-backed · Direct mint/redeem · Coverage enforced', href: '/axau' },
  { layer: '04', name: 'Regime Intelligence', detail: 'MIRDT nine-dimension scoring · Sentinel gate · Observer', href: '/mirdt' },
  { layer: '05', name: 'Solvency Console', detail: 'Three-mode live verification · On-chain snapshot · Public', href: '/solvency' },
];

const SYSTEM_FLOW = [
  { step: 'USD', label: 'Fiat Entry', sub: 'ACH / Wire via Increase', color: C.forest },
  { step: 'AXUSD', label: 'Settlement', sub: 'ERC-3643 · PSM-backed', color: C.navy },
  { step: 'DEX / PSM', label: 'Exchange', sub: 'Peg maintenance · Liquidity', color: C.gold },
  { step: 'AXAU', label: 'Reserve', sub: 'PAXG-backed · Identity-gated', color: C.gold },
  { step: 'Capital', label: 'Deployment', sub: 'Lending Fund · SPVs', color: C.forest },
];

const WHO_ITS_FOR = [
  {
    segment: 'Starting Participants',
    desc: 'No initial capital required. Enter through the community credit line, build a participation record, and progress into group economics and deal access.',
    path: 'Community Credit → Wealth Practice → Syndication',
    href: '/community-credit',
    cta: 'Apply for Entry Credit',
  },
  {
    segment: 'Capital Allocators',
    desc: 'Access Reg D 506(c) structured offerings, the bridge loan LP fund, and secondary market transfers with on-chain reporting and institutional disclosure.',
    path: 'Syndication → Lending Fund → Secondary',
    href: '/syndication',
    cta: 'View Capital Programs',
  },
  {
    segment: 'Reserve Participants',
    desc: 'Obtain an ERC-3643 identity credential. Mint AXAU (gold-backed) or AXUSD (settlement unit). Participate in on-chain governance. Direct on-chain access.',
    path: 'Identity Credential → AXAU / AXUSD Access',
    href: '/axau-early-access',
    cta: 'Apply for Reserve Access',
  },
  {
    segment: 'Operators and Builders',
    desc: 'Access deal intelligence, underwriting tools, cost estimation, regime scoring, and the full operations dashboard for active deal sourcing and deployment.',
    path: 'Deal Intelligence → MIRDT → Sentinel',
    href: '/deal-intelligence',
    cta: 'Access Intelligence Layer',
  },
];

const PROOF_LINKS = [
  { label: 'Proof of Execution', sub: 'Hash-chained audit trail of all operational actions', href: '/proof-of-execution' },
  { label: 'Solvency Console', sub: 'Coverage ratio, reserve ratio, and LBR — live from chain', href: '/solvency' },
  { label: 'Institutional Disclosure', sub: 'Contracts, policy mode, coverage formulas, and legal framework', href: '/disclosure' },
  { label: 'Observer Dashboard', sub: 'Treasury, governance, and risk — independent read access', href: '/observer' },
];

export default function InfrastructurePage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>Axiom Protocol | Live Financial Infrastructure — Verify the System</title>
        <meta name="description" content="Axiom Protocol is a vertically integrated financial operating system: banking, settlement, reserve, capital deployment, and intelligence — all on Arbitrum One. Verify the infrastructure, not the narrative." />
      </Head>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: 8 }}>
        <p style={monoLabel}>Axiom Protocol / Infrastructure Overview</p>
      </div>

      {/* ── SECTION 1: HERO ─────────────────────────────────────────────────── */}
      <div style={{ borderTop: `4px solid ${C.gold}`, marginBottom: 48 }}>
        <div style={{ padding: '56px 0 48px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ ...monoLabel, color: C.forest, marginBottom: 16 }}>
            Most &quot;RWA&quot; projects are token wrappers. This is infrastructure.
          </p>
          <h1 style={{ ...serif(42), fontWeight: 700, lineHeight: 1.1, marginBottom: 20, maxWidth: 640 }}>
            Reserve. Settlement. Capital Deployment.<br />
            <span style={{ color: C.gold }}>One Connected System.</span>
          </h1>
          <p style={{ ...serif(16), color: C.muted, maxWidth: 580, lineHeight: 1.75, marginBottom: 32 }}>
            Axiom Protocol is a vertically integrated financial operating system — banking layer, settlement rail, reserve issuance, capital deployment, and regime intelligence — built on Arbitrum One with full on-chain transparency.
          </p>
          <p style={{ ...monoLabel, color: C.muted, marginBottom: 28 }}>
            Not a narrative. Verify it.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/solvency" style={{ display: 'inline-block', background: C.navy, color: '#fff', padding: '12px 28px', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>
              View Live Infrastructure →
            </Link>
            <Link href="/axau" style={{ display: 'inline-block', border: `1px solid ${C.gold}`, color: C.gold, padding: '12px 28px', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Access the Reserve
            </Link>
            <Link href="/disclosure" style={{ display: 'inline-block', border: `1px solid ${C.border}`, color: C.navy, padding: '12px 28px', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Read Disclosure
            </Link>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: WHAT MAKES THIS DIFFERENT ───────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 02 — The Infrastructure Moat</p>
          <h2 style={{ ...serif(28), fontWeight: 600, marginTop: 6, marginBottom: 8 }}>What Makes This Different</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, maxWidth: 560 }}>
            Six infrastructure properties that distinguish Axiom from a token project or a generic DeFi wrapper. Each is verifiable independently.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
          {DIFFERENTIATORS.map((item, i) => (
            <div
              key={item.label}
              style={{
                padding: '24px 22px',
                borderBottom: `1px solid ${C.border}`,
                borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.bg : C.bgAlt,
                borderLeft: `3px solid ${C.forest}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ ...serif(14), fontWeight: 600, color: C.navy }}>{item.label}</p>
                <span style={{ fontFamily: 'monospace', fontSize: 9, padding: '2px 7px', border: `1px solid ${C.forest}`, color: C.forest, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.status}</span>
              </div>
              <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, color: 'rgba(27,42,74,0.70)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: LIVE NOW ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 03 — Current Operational State</p>
          <h2 style={{ ...serif(28), fontWeight: 600, marginTop: 6, marginBottom: 8 }}>Live Now</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7 }}>
            These components are active on Arbitrum One mainnet. Not demos. Not testnets.
          </p>
        </div>
        <div style={{ border: `1px solid ${C.border}` }}>
          {LIVE_NOW.map((item, i) => (
            <Link
              key={item.layer}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', textDecoration: 'none',
                borderBottom: i < LIVE_NOW.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.bg : C.bgAlt,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ ...monoLabel, color: C.muted, minWidth: 32 }}>{item.layer}</span>
                <div>
                  <p style={{ ...serif(14), color: C.navy, fontWeight: 600, marginBottom: 2 }}>{item.name}</p>
                  <p style={{ ...mono, fontSize: 11 }}>{item.detail}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, padding: '2px 8px', border: `1px solid ${C.forest}`, color: C.forest, letterSpacing: '0.1em', textTransform: 'uppercase' }}>LIVE</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ borderTop: 'none', border: `1px solid ${C.border}`, padding: '10px 20px', background: C.bgAlt, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ ...monoLabel, color: C.muted }}>Formation: Capital Program · Wealth Practice Groups · Land Pipeline</p>
          <Link href="/solvency" style={{ ...monoLabel, color: C.navy, textDecoration: 'underline' }}>Live solvency →</Link>
        </div>
      </div>

      {/* ── SECTION 4: CAPITAL FLOW ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 04 — Capital Architecture</p>
          <h2 style={{ ...serif(28), fontWeight: 600, marginTop: 6, marginBottom: 8 }}>How the System Flows</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, maxWidth: 520 }}>
            Capital enters at the banking layer and flows through the settlement rail to the reserve or capital deployment layer. Each step is on-chain and independently verifiable.
          </p>
        </div>
        <div style={{ border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {SYSTEM_FLOW.map((node, i) => (
              <div key={node.step} style={{ borderRight: i < SYSTEM_FLOW.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ padding: '24px 18px', background: i % 2 === 0 ? C.bg : C.bgAlt }}>
                  <p style={{ ...monoLabel, color: C.muted, marginBottom: 8 }}>{String(i + 1).padStart(2, '0')}</p>
                  <p style={{ ...serif(20), fontWeight: 700, color: node.color, marginBottom: 4 }}>{node.step}</p>
                  <p style={{ ...serif(13), fontWeight: 600, color: C.navy, marginBottom: 4 }}>{node.label}</p>
                  <p style={{ ...mono, fontSize: 10, lineHeight: 1.5 }}>{node.sub}</p>
                </div>
                <div style={{ height: 3, background: node.color }} />
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 20px', background: C.bgAlt, borderTop: `1px solid ${C.border}` }}>
            <p style={{ ...mono, fontSize: 11, color: C.muted }}>
              Direct on-chain path: PAXG → AXAU via GoldVault. Assisted path: USD → Banking → AXUSD → Ops-mediated AXAU fulfillment. Both paths require ERC-3643 identity credential.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 5: WHO IT IS FOR ────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={monoLabel}>Section 05 — Access Paths</p>
          <h2 style={{ ...serif(28), fontWeight: 600, marginTop: 6, marginBottom: 8 }}>Who This Is Built For</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7 }}>Four entry paths. Each layer of the protocol is accessible — at the level that matches your position.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
          {WHO_ITS_FOR.map((profile, i) => (
            <div
              key={profile.segment}
              style={{
                padding: '24px 20px',
                borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none',
                borderBottom: i < 2 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.bg : C.bgAlt,
                borderLeft: `3px solid ${C.navy}`,
              }}
            >
              <p style={{ ...monoLabel, color: C.gold, marginBottom: 10 }}>{profile.path}</p>
              <p style={{ ...serif(16), fontWeight: 700, color: C.navy, marginBottom: 8 }}>{profile.segment}</p>
              <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>{profile.desc}</p>
              <Link
                href={profile.href}
                style={{ display: 'inline-block', border: `1px solid ${C.navy}`, color: C.navy, padding: '8px 18px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}
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
          <h2 style={{ ...serif(28), fontWeight: 600, marginTop: 6, marginBottom: 8 }}>Verify. Don&apos;t Trust.</h2>
          <p style={{ ...mono, fontSize: 12, lineHeight: 1.7, maxWidth: 520 }}>
            Four independent access points for verification. Each is live. No account required. No email required.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
          {PROOF_LINKS.map((link, i) => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                display: 'block', textDecoration: 'none',
                padding: '22px 20px',
                borderRight: i < PROOF_LINKS.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.bg : C.bgAlt,
                borderTop: `3px solid ${C.forest}`,
              }}
            >
              <p style={{ ...serif(14), fontWeight: 700, color: C.navy, marginBottom: 6 }}>{link.label}</p>
              <p style={{ ...mono, fontSize: 11, lineHeight: 1.6, marginBottom: 14 }}>{link.sub}</p>
              <p style={{ ...monoLabel, color: C.navy }}>Verify →</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── SECTION 7: FINAL CTA ────────────────────────────────────────────── */}
      <div style={{ border: `1px solid ${C.border}`, borderTop: `4px solid ${C.navy}`, padding: '52px 40px', background: C.bgAlt, textAlign: 'center', marginBottom: 20 }}>
        <p style={{ ...monoLabel, color: C.forest, marginBottom: 16 }}>The Axiom Protocol — Arbitrum One</p>
        <h2 style={{ ...serif(36), fontWeight: 700, lineHeight: 1.15, marginBottom: 16, maxWidth: 520, margin: '0 auto 16px' }}>
          Stop buying narratives.<br />Enter the infrastructure layer.
        </h2>
        <p style={{ ...mono, fontSize: 13, lineHeight: 1.8, maxWidth: 480, margin: '0 auto 32px' }}>
          The contracts are on-chain. The solvency data is public. The proof-of-execution logs are hash-chained. Every claim on this platform has a corresponding on-chain record.
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/proof-of-execution" style={{ display: 'inline-block', background: C.navy, color: '#fff', padding: '13px 32px', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>
            Verify the System →
          </Link>
          <Link href="/axau" style={{ display: 'inline-block', border: `1px solid ${C.gold}`, color: C.gold, padding: '13px 32px', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Access the Reserve
          </Link>
          <Link href="/axau-early-access" style={{ display: 'inline-block', border: `1px solid ${C.border}`, color: C.navy, padding: '13px 32px', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Apply for Access
          </Link>
        </div>
      </div>

      {/* DISCLOSURE */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
        <p style={{ ...mono, fontSize: 10, lineHeight: 1.8, color: C.muted }}>
          Axiom Protocol infrastructure is built on Arbitrum One. All on-chain data referenced on this page is independently verifiable via Arbiscan or the relevant on-chain contract. Capital programs (Lending Fund, SPV Capital Program) are offered under SEC Reg D 506(c) and are available to accredited investors only. AXAU and AXUSD require an active ERC-3643 identity credential. This page does not constitute a public offering or financial advice. System statuses reflect current operational state as of the date rendered — formation-stage components are not yet in production deployment. Contract addresses and coverage formulas are published in the Institutional Disclosure.
        </p>
      </div>
    </DesignLawLayout>
  );
}
