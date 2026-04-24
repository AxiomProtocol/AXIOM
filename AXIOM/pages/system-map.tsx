import Head from 'next/head';
import { DesignLawLayout } from '../components/design-law/DesignLawLayout';
import AxiomArchitectureDiagram from '../components/design-law/AxiomArchitectureDiagram';

const C = {
  navy: '#1e3a5f',
  gold: '#b8860b',
  green: '#2d6a4f',
  muted: '#6b5f4e',
  border: '#d8cfc0',
  bg: '#fafaf8',
  bgAlt: '#f2ede6',
  white: '#ffffff',
  gray: '#9ca3af',
};

const MONO = '"Courier New", Courier, monospace';
const SERIF = '"Cormorant Garamond", Georgia, "Times New Roman", serif';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: C.muted }}>
      {children}
    </span>
  );
}

function SectionRule({ n, title }: { n: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', color: C.gold }}>SECTION {n}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase' as const }}>{title}</span>
    </div>
  );
}

type Status = 'LIVE' | 'CONFIGURED' | 'FORMATION' | 'PLANNED';

function statusColor(s: Status): string {
  if (s === 'LIVE') return C.green;
  if (s === 'CONFIGURED') return C.gold;
  if (s === 'FORMATION') return C.gold;
  return C.gray;
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span style={{
      fontFamily: MONO,
      fontSize: 9,
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const,
      color: statusColor(status),
      border: `1px solid ${statusColor(status)}`,
      padding: '2px 7px',
      whiteSpace: 'nowrap' as const,
    }}>
      {status}
    </span>
  );
}

const CAPITAL_FLOW = [
  {
    step: 'USD',
    layer: '00',
    title: 'Banking Entry',
    why: 'Dollar capital enters the protocol through FDIC-insured fiat rails (Increase) or institutional crypto custody (BitGo). This is the only fiat on-ramp. KYC/AML compliance is enforced at this layer.',
    href: '/banking',
  },
  {
    step: 'AXUSD',
    layer: '01',
    title: 'Settlement Issuance',
    why: 'USDC deposited in the Peg Stability Module mints AXUSD at 1:1. AXUSD is the protocol\'s native unit of account — ERC-3643 identity-gated, reserve-verified, and PSM-backed.',
    href: '/axusd',
  },
  {
    step: 'EXCHANGE',
    layer: '01.5',
    title: 'Conversion + Peg',
    why: 'Camelot V2 + EulerSwap concentrated liquidity maintain AXUSD peg stability. All reserve conversions and settlement flows route through this layer. PSM is the arbitrage close mechanism.',
    href: '/dex',
  },
  {
    step: 'AXAU',
    layer: '02',
    title: 'Reserve Backing',
    why: 'AXUSD participants can access AXAU — a PAXG-backed gold reserve unit. The treasury maintains AXAU coverage positions to provide hard-asset depth behind the protocol\'s reserve pool.',
    href: '/axau',
  },
  {
    step: 'CAPITAL',
    layer: '03',
    title: 'Deployment Programs',
    why: 'Settled capital flows into structured deployment programs: Lending Fund (SEC Reg D 506(c)), on-chain credit markets, SPV structures, and syndication programs. Capital at work, not at rest.',
    href: '/lending-fund',
  },
];

const LAYERS = [
  {
    id: '00',
    title: 'Banking / Fiat Entry',
    status: 'LIVE' as Status,
    icon: '/visuals/icon-banking.png',
    what: 'The primary dollar on-ramp and off-ramp. FDIC-insured fiat rails via Increase (ACH, wire, account infrastructure). Institutional crypto custody via BitGo CaaS on Arbitrum One.',
    components: ['Increase (FDIC-insured)', 'BitGo CaaS (crypto custody)', 'ACH / Wire rails', 'KYC/AML compliance layer'],
    href: '/banking',
    cta: 'View Banking Infrastructure',
  },
  {
    id: '01',
    title: 'AXUSD Settlement Rail',
    status: 'LIVE' as Status,
    icon: '/visuals/icon-settlement.png',
    what: 'ERC-3643 compliant USD-pegged settlement token. Issued through the Peg Stability Module at 1:1 against USDC. Identity-gated via on-chain credential. On-chain reserve ratio monitored continuously.',
    components: ['AXUSD (ERC-3643)', 'Peg Stability Module (PSM)', 'USDC reserve pool', 'Chainlink price oracle'],
    href: '/axusd',
    cta: 'View Settlement Layer',
  },
  {
    id: '01.5',
    title: 'Exchange + Peg Infrastructure',
    status: 'LIVE' as Status,
    icon: '/visuals/icon-exchange.png',
    what: 'The primary conversion and peg maintenance venue. Camelot V2 provides deep AXUSD/USDC/AXM liquidity. EulerSwap concentrates LP capital for dual swap and lending yield. The PSM-backed conversion path closes peg deviations automatically.',
    components: ['Camelot V2 DEX', 'EulerSwap concentrated pools', 'PSM arbitrage path', 'Market Operations wallet'],
    href: '/dex',
    cta: 'View Exchange Layer',
  },
  {
    id: '02',
    title: 'AXAU Reserve Layer',
    status: 'LIVE' as Status,
    icon: '/visuals/icon-reserve.png',
    what: 'PAXG-backed gold reserve unit. Issued via direct on-chain mint (ERC-3643 identity required) or ops-assisted AXUSD fulfillment. Governed by a live coverage ratio. Chainlink XAU/USD oracle verifies pricing.',
    components: ['AXAU token (ERC-3643)', 'GoldVault contract', 'PAXG backing (Paxos)', 'Chainlink XAU/USD oracle', 'LandNAVOracle'],
    href: '/axau',
    cta: 'View Reserve Layer',
  },
  {
    id: '03',
    title: 'Capital Deployment',
    status: 'FORMATION' as Status,
    icon: '/visuals/icon-capital.png',
    what: 'Settled capital is channeled into structured deployment programs. Lending Fund is a private placement fund under SEC Reg D 506(c). On-chain fixed-term credit markets are deployed. Syndication and SPV structures are operational.',
    components: ['Lending Fund (Reg D 506(c))', 'On-chain credit markets', 'SPV structures', 'Syndication programs', 'LP Investor Portal'],
    href: '/lending-fund',
    cta: 'View Capital Programs',
  },
  {
    id: '04',
    title: 'Intelligence',
    status: 'LIVE' as Status,
    icon: '/visuals/icon-intelligence.png',
    what: 'Advisory and risk intelligence layer. MIRDT is a nine-dimension capital intelligence terminal. Sentinel is the unified risk authorization layer. Observer is an institutional-grade dashboard. RE Intelligence covers deal-level property analysis.',
    components: ['MIRDT Capital Intelligence', 'Axiom Sentinel', 'Observer Dashboard', 'RE Intelligence', 'Deal Intelligence', 'Property Analysis Tool'],
    href: '/mirdt',
    cta: 'View Intelligence Layer',
  },
  {
    id: '05',
    title: 'Trust / Solvency / Compliance',
    status: 'LIVE' as Status,
    icon: '/visuals/icon-trust.png',
    what: 'The protocol\'s trust and verification infrastructure. Three-mode solvency console. Proof of Execution log. Institutional disclosure document. ERC-3643 identity and compliance layer. Agent governance policy engine.',
    components: ['Solvency Console (3-mode)', 'Proof of Execution', 'Institutional Disclosure', 'ERC-3643 identity gating', 'Agent governance system'],
    href: '/solvency',
    cta: 'View Trust Layer',
  },
];

const PATH_DATA = [
  {
    type: 'Direct On-Chain',
    color: C.green,
    description: 'Wallet-connected flows where the user signs transactions directly. No operational intermediary. Fully non-custodial.',
    examples: [
      'PSM mint/redeem: USDC ↔ AXUSD at 1:1',
      'DEX swap: AXUSD ↔ USDC ↔ AXM via Camelot/EulerSwap',
      'AXAU direct mint: identity-gated, wallet signs on-chain',
    ],
    gating: 'ERC-3643 identity credential required for AXUSD and AXAU. Wallet must hold valid on-chain credential.',
  },
  {
    type: 'Ops-Assisted',
    color: C.gold,
    description: 'Flows where an operations team mediates part of the process. Used for higher-touch or off-chain settlement requirements.',
    examples: [
      'AXAU purchase via AXUSD fulfillment: user submits request, ops team acquires PAXG, deposits to vault, mints AXAU',
      'Banking wire/ACH: routed through Increase with ops oversight',
      'Capital program enrollment: Lending Fund and SPV programs require KYC documentation and manual review',
    ],
    gating: 'Ops-assisted flows are explicitly labeled throughout the platform. Settlement timelines and processes are disclosed at point of entry.',
  },
];

export default function SystemMapPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>System Map — Axiom Protocol Financial Operating System</title>
        <meta name="description" content="The complete Axiom Protocol system map. Banking, settlement, exchange, reserve, capital deployment, intelligence, and trust — seven layers, one connected financial operating system on Arbitrum One." />
      </Head>

      {/* HERO — split layout with cinematic image */}
      <div style={{ borderBottom: `1px solid ${C.border}`, marginBottom: 48 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,400px)',
          gap: 0,
          alignItems: 'stretch',
        }}>
          {/* Left: existing hero text */}
          <div style={{ paddingBottom: 40, paddingRight: 48 }}>
            <Label>Axiom Protocol / System Map</Label>
            <div style={{ height: 1, background: C.gold, marginTop: 6, marginBottom: 20, maxWidth: 64 }} />
            <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 700, color: C.navy, lineHeight: 1.1, marginBottom: 20, maxWidth: 780 }}>
              Financial Infrastructure,<br />Layer by Layer.
            </h1>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, maxWidth: 640, lineHeight: 1.8, marginBottom: 32 }}>
              Axiom Protocol is a vertically integrated financial operating system on Arbitrum One. Seven layers — from FDIC-insured fiat entry to on-chain gold reserves, settlement rails, exchange infrastructure, capital deployment, regime intelligence, and institutional trust verification — built as a connected system, not a collection of products.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
              <a href="/axau" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: C.white, background: C.navy, padding: '10px 20px', textDecoration: 'none', border: `1px solid ${C.navy}` }}>
                ACCESS THE RESERVE →
              </a>
              <a href="/axusd" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: C.navy, background: 'transparent', padding: '10px 20px', textDecoration: 'none', border: `1px solid ${C.navy}` }}>
                VIEW SETTLEMENT LAYER
              </a>
              <a href="/disclosure" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: C.muted, background: 'transparent', padding: '10px 20px', textDecoration: 'none', border: `1px solid ${C.border}` }}>
                READ DISCLOSURE
              </a>
            </div>
          </div>
          {/* Right: cinematic system map hero */}
          <div style={{ position: 'relative', overflow: 'hidden', borderLeft: `1px solid ${C.border}`, minHeight: 360 }}>
            <img
              src="/visuals/sysmap-hero.png"
              alt="Axiom Protocol seven-layer financial system architecture"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              padding: '10px 16px',
              background: 'rgba(255,255,255,0.90)',
              borderTop: `1px solid ${C.gold}`,
            }}>
              <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.gold, margin: 0 }}>
                Seven Layers · One System · Arbitrum One
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1 — ARCHITECTURE DIAGRAM */}
      <div style={{ marginBottom: 64 }}>
        <SectionRule n="01" title="Architecture Diagram" />
        <AxiomArchitectureDiagram showCapitalFlow={true} />
      </div>

      {/* SECTION 2 — CAPITAL FLOW */}
      <div style={{ marginBottom: 64 }}>
        <SectionRule n="02" title="Capital Flow" />
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: C.navy, marginBottom: 12 }}>
          How Capital Moves Through the Stack
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, maxWidth: 620, lineHeight: 1.75, marginBottom: 36 }}>
          Every dollar that enters the Axiom Protocol follows a traceable path through multiple purpose-built layers. From fiat entry to reserve backing to capital deployment — each step has a distinct function and verifiable on-chain state.
        </p>

        {/* Flow visualization */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40, overflowX: 'auto' as const, padding: '16px 0' }}>
          {CAPITAL_FLOW.map((step, i) => (
            <div key={step.step} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                background: C.navy,
                padding: '8px 16px',
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                gap: 2,
                minWidth: 90,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 8, color: C.gold, letterSpacing: '0.12em' }}>L{step.layer}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.white, letterSpacing: '0.1em' }}>{step.step}</span>
              </div>
              {i < CAPITAL_FLOW.length - 1 && (
                <div style={{ width: 32, height: 1, background: C.gold, position: 'relative' as const, flexShrink: 0 }}>
                  <span style={{ position: 'absolute' as const, right: -4, top: -6, color: C.gold, fontSize: 12 }}>›</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Step-by-step detail */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 1, background: C.border }}>
          {CAPITAL_FLOW.map((step) => (
            <div key={step.step} style={{ background: C.bg, padding: '24px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.gold, border: `1px solid ${C.gold}`, padding: '2px 7px' }}>L{step.layer}</span>
                <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: C.navy }}>{step.title}</span>
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 14 }}>
                {step.why}
              </p>
              {step.href && (
                <a href={step.href} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.navy, textDecoration: 'none', borderBottom: `1px solid ${C.border}`, paddingBottom: 1 }}>
                  EXPLORE LAYER →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* WHY THIS ARCHITECTURE MATTERS */}
      <div style={{ marginBottom: 64 }}>
        <SectionRule n="03" title="Why This Architecture Matters" />
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: C.navy, marginBottom: 12 }}>
          Most Systems Move Value.<br />Axiom Governs the Architecture Around It.
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, maxWidth: 640, lineHeight: 1.8, marginBottom: 40 }}>
          Most protocols pick one problem. A payment rail. A stablecoin. A lending market. Axiom integrates all of them — reserve backing, settlement issuance, exchange liquidity, capital deployment, intelligence, and solvency verification — into a single operating system where each layer depends on and reinforces the others.
        </p>

        {/* Cinematic gold reserve visual */}
        <div style={{ marginBottom: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ overflow: 'hidden' }}>
            <img
              src="/visuals/gold-reserve.png"
              alt="AXAU gold reserve — PAXG-backed on-chain"
              style={{ width: '100%', height: 260, objectFit: 'cover', objectPosition: 'center', display: 'block' }}
            />
          </div>
          <div style={{ padding: '32px 28px', background: '#fdf6e8', borderLeft: `1px solid ${C.gold}`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: C.gold, textTransform: 'uppercase', marginBottom: 8 }}>Reserve-Backed Depth · L02</p>
            <h3 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 12 }}>Hard-Asset Depth Behind Every Settlement</h3>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.78, marginBottom: 0 }}>
              AXUSD settlement is anchored by AXAU, which is backed by on-chain PAXG (Paxos Gold). Hard-asset depth sits behind the settlement layer — not as a marketing claim, but as a live coverage ratio verifiable on-chain. Most stablecoins have no hard-asset backing. This one has a gold vault.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, background: C.border, marginBottom: 40 }}>
          {[
            {
              n: '02',
              title: 'Integrated, Not Bolt-On',
              body: 'Each layer was designed to interoperate with the others. Banking feeds settlement. Settlement feeds the exchange. The exchange maintains the peg and routes reserve conversions. Capital deployment draws from settled AXUSD. Intelligence informs every capital decision. Removing any layer degrades the rest.',
              anchor: false,
            },
            {
              n: '03',
              title: 'Verifiable, Not Asserted',
              body: 'Trust in most financial systems is asserted: trust us, we\'ve been audited. In Axiom, it is verifiable: every contract is on-chain, every reserve ratio is computed from live data, and every operational claim is logged in the Proof of Execution. You do not have to take our word for it.',
              anchor: false,
            },
            {
              n: '04',
              title: 'Sovereignty Through Architecture',
              body: 'A sovereign financial system cannot depend on a single point of failure. The Axiom stack is designed for institutional-grade resilience: FDIC-insured fiat entry, non-custodial on-chain settlement, gold reserve backing, and a trust layer that operates independently of any single counterparty.',
              anchor: false,
            },
          ].map((card) => (
            <div key={card.n} style={{
              background: C.bg,
              padding: '26px 22px',
              borderLeft: card.anchor ? `3px solid ${C.gold}` : '3px solid transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 8, color: C.gold, border: `1px solid ${C.gold}`, padding: '2px 7px', letterSpacing: '0.12em' }}>{card.n}</span>
                <h3 style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: C.navy, margin: 0 }}>{card.title}</h3>
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.78, margin: 0 }}>
                {card.body}
              </p>
            </div>
          ))}
        </div>

        {/* Reserve anchor callout */}
        <div style={{
          border: `1px solid ${C.gold}`,
          background: '#fdf6e8',
          padding: '22px 26px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 20,
          flexWrap: 'wrap' as const,
        }}>
          {/* 3D icon */}
          <div style={{
            width: 80,
            height: 80,
            flexShrink: 0,
            overflow: 'hidden',
            border: `1px solid ${C.gold}`,
          }}>
            <img
              src="/visuals/icon-reserve.png"
              alt="AXAU gold reserve icon"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em', color: C.gold, textTransform: 'uppercase' as const, marginBottom: 4 }}>LAYER 02 · RESERVE ANCHOR</div>
            <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: '#7a5c1e', lineHeight: 1 }}>AXAU</div>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.78, margin: 0 }}>
              AXAU is the reserve anchor of the entire Axiom stack. Backed by on-chain PAXG (Paxos Gold), governed by a live coverage ratio enforced by the GoldVault contract, and priced via Chainlink XAU/USD oracle. The treasury maintains AXAU coverage positions to provide hard-asset depth behind the protocol&apos;s broader reserve pool. AXUSD settlement is ultimately backed by this layer.
            </p>
          </div>
          <a href="/axau" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase' as const, color: '#7a5c1e', border: `1px solid ${C.gold}`, padding: '8px 16px', textDecoration: 'none', background: C.white, flexShrink: 0, alignSelf: 'flex-start' as const }}>
            VIEW RESERVE →
          </a>
        </div>
      </div>

      {/* SECTION 4 — LAYER BREAKDOWN */}
      <div style={{ marginBottom: 64 }}>
        <SectionRule n="04" title="Layer-by-Layer Breakdown" />
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: C.navy, marginBottom: 12 }}>
          Every Layer. Every Status.
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, maxWidth: 620, lineHeight: 1.75, marginBottom: 36 }}>
          Each layer in the Axiom stack has a discrete function, a live operational status, and a dedicated page where you can verify its current state.
        </p>

        <div style={{ border: `1px solid ${C.border}` }}>
          {LAYERS.map((layer, i) => (
            <div key={layer.id} style={{
              borderBottom: i < LAYERS.length - 1 ? `1px solid ${C.border}` : 'none',
              display: 'grid',
              gridTemplateColumns: '96px 1fr',
            }}>
              {/* Layer ID + 3D icon column */}
              <div style={{
                borderRight: `1px solid ${C.border}`,
                background: C.bgAlt,
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: '20px 8px 16px',
                gap: 8,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 7, color: C.muted, letterSpacing: '0.1em' }}>LAYER</span>
                <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.navy }}>{layer.id}</span>
                {/* 3D Layer Icon */}
                <div style={{
                  width: 60,
                  height: 60,
                  overflow: 'hidden',
                  border: `1px solid ${C.border}`,
                  background: C.white,
                  marginTop: 4,
                }}>
                  <img
                    src={layer.icon}
                    alt={`${layer.title} icon`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '24px 24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const, marginBottom: 10 }}>
                  <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>{layer.title}</h3>
                  <StatusBadge status={layer.status} />
                </div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.75, marginBottom: 14, maxWidth: 640 }}>
                  {layer.what}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 16 }}>
                  {layer.components.map(c => (
                    <span key={c} style={{ fontFamily: MONO, fontSize: 9, color: C.muted, border: `1px solid ${C.border}`, padding: '2px 8px', background: C.bg }}>
                      {c}
                    </span>
                  ))}
                </div>
                <a href={layer.href} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.navy, textDecoration: 'none', border: `1px solid ${C.navy}`, padding: '5px 12px', background: 'transparent' }}>
                  {layer.cta} →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5 — DIRECT VS ASSISTED */}
      <div style={{ marginBottom: 64 }}>
        <SectionRule n="05" title="Direct vs Assisted Paths" />
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: C.navy, marginBottom: 12 }}>
          On-Chain and Ops-Mediated Flows
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, maxWidth: 620, lineHeight: 1.75, marginBottom: 36 }}>
          Axiom Protocol distinguishes clearly between fully on-chain flows and flows that involve operational support. This distinction is material for participants evaluating custody, settlement timing, and counterparty exposure.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 1, background: C.border }}>
          {PATH_DATA.map((path) => (
            <div key={path.type} style={{ background: C.bg, padding: '28px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, background: path.color, flexShrink: 0 }} />
                <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: C.navy }}>{path.type}</span>
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.75, marginBottom: 16 }}>
                {path.description}
              </p>
              <div style={{ marginBottom: 16 }}>
                <Label>Examples</Label>
                <ul style={{ marginTop: 8, paddingLeft: 0, listStyle: 'none' }}>
                  {path.examples.map((ex, i) => (
                    <li key={i} style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, lineHeight: 1.65, marginBottom: 6, paddingLeft: 12, borderLeft: `2px solid ${path.color}` }}>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: C.bgAlt, padding: '10px 14px', borderLeft: `3px solid ${C.gold}` }}>
                <Label>Identity / Gating</Label>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, margin: '4px 0 0', lineHeight: 1.65 }}>
                  {path.gating}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6 — TRUST AND VERIFICATION */}
      <div style={{ marginBottom: 64 }}>
        <SectionRule n="06" title="Trust and Verification" />
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: C.navy, marginBottom: 12 }}>
          Every Claim Has a Source.
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, maxWidth: 620, lineHeight: 1.75, marginBottom: 36 }}>
          Protocol trust is not asserted. It is verifiable. Below are the primary verification touchpoints — all live, all accessible.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1, background: C.border }}>
          {[
            {
              title: 'Solvency Console',
              desc: 'Three-mode institutional solvency dashboard. Pulls from a canonical reserve snapshot. Coverage ratio, reserve ratio, and liability depth — all derived from live data.',
              href: '/solvency',
              cta: 'View Solvency Console',
            },
            {
              title: 'Institutional Disclosure',
              desc: 'Comprehensive institutional disclosure document. Contract addresses, operational status taxonomy, GENIUS Act alignment notes, reserve verification methodology.',
              href: '/disclosure',
              cta: 'Read Disclosure',
            },
            {
              title: 'Proof of Execution',
              desc: 'Timestamped execution log. Records protocol milestones, system deployments, and operational actions. The historical record of what was built and when.',
              href: '/proof-of-execution',
              cta: 'View Proof of Execution',
            },
            {
              title: 'On-Chain Contracts',
              desc: 'All core contracts are deployed on Arbitrum One and verifiable via Arbiscan. AXUSD, PSM, GoldVault, AXAU — live addresses listed in the disclosure document.',
              href: '/disclosure',
              cta: 'View Contract Addresses',
            },
          ].map((item) => (
            <div key={item.title} style={{ background: C.bg, padding: '24px 22px' }}>
              <h3 style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 8 }}>{item.title}</h3>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 14 }}>
                {item.desc}
              </p>
              <a href={item.href} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.navy, textDecoration: 'none', borderBottom: `1px solid ${C.border}`, paddingBottom: 1 }}>
                {item.cta} →
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* FINAL CTA */}
      <div style={{
        background: C.navy,
        padding: 'clamp(32px, 6vw, 56px) clamp(24px, 6vw, 56px)',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        textAlign: 'center' as const,
        gap: 20,
      }}>
        <Label><span style={{ color: '#b8a070' }}>AXIOM PROTOCOL · ARBITRUM ONE · MAINNET</span></Label>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, color: C.white, maxWidth: 560, lineHeight: 1.15, margin: 0 }}>
          Stop auditing narratives.<br />Verify the infrastructure.
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#b8a070', maxWidth: 480, lineHeight: 1.75, margin: 0 }}>
          Every layer in this system is live, on-chain, and verifiable. Banking, settlement, reserve, capital, intelligence, trust — one connected protocol with full institutional-grade disclosure.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
          <a href="/axau" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: C.navy, background: C.white, padding: '11px 22px', textDecoration: 'none', border: '1px solid transparent' }}>
            ACCESS THE RESERVE →
          </a>
          <a href="/disclosure" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: C.white, background: 'transparent', padding: '11px 22px', textDecoration: 'none', border: `1px solid rgba(255,255,255,0.3)` }}>
            READ DISCLOSURE
          </a>
          <a href="/solvency" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#b8a070', background: 'transparent', padding: '11px 22px', textDecoration: 'none', border: `1px solid rgba(184,160,112,0.4)` }}>
            VERIFY SOLVENCY
          </a>
        </div>
      </div>
    </DesignLawLayout>
  );
}
