import React from 'react';

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

interface Layer {
  id: string;
  title: string;
  desc: string;
  status: 'LIVE' | 'CONFIGURED' | 'FORMATION' | 'PLANNED';
  tokens?: string;
  href?: string;
  flowLabel?: string;
}

const LAYERS: Layer[] = [
  {
    id: '00',
    title: 'Banking / Fiat Entry',
    desc: 'FDIC-insured fiat rails via Increase. Institutional crypto custody via BitGo. Primary dollar on-ramp and off-ramp.',
    status: 'LIVE',
    tokens: 'Increase · BitGo · ACH / Wire',
    href: '/banking',
    flowLabel: 'USD',
  },
  {
    id: '01',
    title: 'AXUSD Settlement Rail',
    desc: 'ERC-3643 USD-pegged settlement token. Issued via PSM at 1:1 against USDC. Identity-gated. On-chain reserve verification.',
    status: 'LIVE',
    tokens: 'AXUSD · PSM · ERC-3643',
    href: '/axusd',
    flowLabel: 'AXUSD',
  },
  {
    id: '01.5',
    title: 'Exchange + Peg Infrastructure',
    desc: 'Camelot V2 + EulerSwap. Primary conversion and peg maintenance venue. Concentrated liquidity for AXUSD ↔ USDC ↔ AXM.',
    status: 'LIVE',
    tokens: 'Camelot V2 · EulerSwap · PSM',
    href: '/dex',
    flowLabel: 'SWAP',
  },
  {
    id: '02',
    title: 'AXAU Reserve Layer',
    desc: 'PAXG-backed gold reserve unit. Governed by live coverage ratio. Chainlink XAU/USD oracle. ERC-3643 identity required for mint.',
    status: 'LIVE',
    tokens: 'AXAU · PAXG · GoldVault',
    href: '/axau',
    flowLabel: 'AXAU',
  },
  {
    id: '03',
    title: 'Capital Deployment',
    desc: 'Lending Fund (SEC Reg D 506(c)), SPV structures, on-chain fixed-term credit markets, and syndication programs.',
    status: 'FORMATION',
    tokens: 'Lending Fund · SPVs · Credit Market',
    href: '/lending-fund',
    flowLabel: 'CAPITAL',
  },
  {
    id: '04',
    title: 'Intelligence',
    desc: 'MIRDT nine-dimension capital intelligence. Sentinel risk authorization. Observer institutional dashboard. RE deal analysis.',
    status: 'LIVE',
    tokens: 'MIRDT · Sentinel · Observer',
    href: '/mirdt',
    flowLabel: 'SIGNAL',
  },
  {
    id: '05',
    title: 'Trust / Solvency / Compliance',
    desc: 'Three-mode solvency console. Proof of Execution log. Institutional disclosure. ERC-3643 identity layer. Agent governance.',
    status: 'LIVE',
    tokens: 'Solvency · Disclosure · ERC-3643',
    href: '/solvency',
    flowLabel: 'TRUST',
  },
];

function statusColor(s: Layer['status']): string {
  if (s === 'LIVE') return C.green;
  if (s === 'CONFIGURED') return C.gold;
  if (s === 'FORMATION') return C.gold;
  return C.gray;
}

function StatusBadge({ status }: { status: Layer['status'] }) {
  return (
    <span style={{
      fontFamily: MONO,
      fontSize: 9,
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const,
      color: statusColor(status),
      border: `1px solid ${statusColor(status)}`,
      padding: '2px 7px',
      background: C.bg,
      whiteSpace: 'nowrap' as const,
    }}>
      {status}
    </span>
  );
}

interface DiagramProps {
  compact?: boolean;
  showCapitalFlow?: boolean;
  className?: string;
}

export default function AxiomArchitectureDiagram({
  compact = false,
  showCapitalFlow = true,
  className,
}: DiagramProps) {
  if (compact) {
    return <CompactDiagram className={className} />;
  }
  return <FullDiagram showCapitalFlow={showCapitalFlow} className={className} />;
}

function FullDiagram({ showCapitalFlow, className }: { showCapitalFlow?: boolean; className?: string }) {
  return (
    <div className={className} style={{ fontFamily: SERIF, background: C.bg, border: `1px solid ${C.border}` }}>
      {/* Header */}
      <div style={{
        padding: '18px 24px 14px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap' as const,
      }}>
        <div>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: C.muted }}>
            AXIOM PROTOCOL · ARBITRUM ONE
          </span>
          <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: C.navy, marginTop: 3 }}>
            Financial Operating System — Layer Architecture
          </div>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.gold, border: `1px solid ${C.gold}`, padding: '3px 10px' }}>
          7 LAYERS · LIVE ON MAINNET
        </span>
      </div>

      {/* Capital flow strip */}
      {showCapitalFlow && (
        <div style={{
          padding: '10px 24px',
          borderBottom: `1px solid ${C.border}`,
          background: C.bgAlt,
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflowX: 'auto' as const,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: C.muted, marginRight: 16, whiteSpace: 'nowrap' as const }}>CAPITAL FLOW</span>
          {['USD', 'Banking', 'AXUSD', 'Exchange', 'AXAU', 'Capital'].map((step, i, arr) => (
            <React.Fragment key={step}>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.navy, whiteSpace: 'nowrap' as const }}>{step}</span>
              {i < arr.length - 1 && (
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.gold, margin: '0 8px' }}>→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Layer rows */}
      <div>
        {LAYERS.map((layer, i) => (
          <div key={layer.id} style={{
            display: 'grid',
            gridTemplateColumns: '64px 1fr auto',
            borderBottom: i < LAYERS.length - 1 ? `1px solid ${C.border}` : 'none',
            minHeight: 72,
          }}>
            {/* Layer number column */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: `1px solid ${C.border}`,
              background: i % 2 === 0 ? C.bg : C.bgAlt,
              padding: '12px 8px',
            }}>
              <div style={{ textAlign: 'center' as const }}>
                <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: C.muted, textTransform: 'uppercase' as const }}>LAYER</div>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.navy, lineHeight: 1.1 }}>{layer.id}</div>
              </div>
            </div>

            {/* Content column */}
            <div style={{ padding: '14px 20px 12px', background: i % 2 === 0 ? C.bg : C.bgAlt }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, marginBottom: 5 }}>
                <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: C.navy }}>{layer.title}</span>
                <StatusBadge status={layer.status} />
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, lineHeight: 1.65, margin: 0, marginBottom: 6 }}>
                {layer.desc}
              </p>
              {layer.tokens && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.gold, letterSpacing: '0.12em' }}>
                  {layer.tokens}
                </span>
              )}
            </div>

            {/* Right column — link + flow label */}
            <div style={{
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'flex-end',
              justifyContent: 'center',
              padding: '12px 20px',
              gap: 8,
              borderLeft: `1px solid ${C.border}`,
              background: i % 2 === 0 ? C.bg : C.bgAlt,
              minWidth: 100,
            }}>
              {layer.flowLabel && (
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.15em', color: C.gold, textTransform: 'uppercase' as const }}>
                  {layer.flowLabel}
                </span>
              )}
              {layer.href && (
                <a
                  href={layer.href}
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase' as const,
                    color: C.navy,
                    textDecoration: 'none',
                    border: `1px solid ${C.border}`,
                    padding: '3px 8px',
                    background: C.white,
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  VIEW →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 24px',
        borderTop: `1px solid ${C.border}`,
        background: C.bgAlt,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap' as const,
        gap: 8,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.13em', color: C.muted, textTransform: 'uppercase' as const }}>
          Arbitrum One · Chain ID 42161 · On-chain verification available
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.13em', color: C.muted }}>
          axiomprotocol.io
        </span>
      </div>
    </div>
  );
}

function CompactDiagram({ className }: { className?: string }) {
  return (
    <div className={className} style={{ fontFamily: MONO, background: C.bg, border: `1px solid ${C.border}` }}>
      {/* Header strip */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${C.border}`,
        background: C.navy,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: C.white }}>
          AXIOM PROTOCOL · SYSTEM LAYERS
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.13em', color: C.gold }}>
          ARBITRUM ONE
        </span>
      </div>

      {/* Compact layer rows */}
      {LAYERS.map((layer, i) => (
        <div key={layer.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          borderBottom: i < LAYERS.length - 1 ? `1px solid ${C.border}` : 'none',
          minHeight: 40,
        }}>
          {/* ID */}
          <div style={{
            width: 48,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: `1px solid ${C.border}`,
            alignSelf: 'stretch' as const,
            background: C.bgAlt,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.navy }}>{layer.id}</span>
          </div>
          {/* Title */}
          <div style={{ flex: 1, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 700, color: C.navy }}>{layer.title}</span>
          </div>
          {/* Status */}
          <div style={{ padding: '8px 14px', flexShrink: 0 }}>
            <StatusBadge status={layer.status} />
          </div>
        </div>
      ))}

      {/* Capital flow footer */}
      <div style={{
        padding: '8px 16px',
        borderTop: `1px solid ${C.border}`,
        background: C.bgAlt,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        overflowX: 'auto' as const,
      }}>
        <span style={{ fontSize: 9, letterSpacing: '0.14em', color: C.muted, marginRight: 8, whiteSpace: 'nowrap' as const }}>FLOW:</span>
        {['USD', 'Banking', 'AXUSD', 'Exchange', 'AXAU', 'Capital'].map((step, i, arr) => (
          <React.Fragment key={step}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.navy, whiteSpace: 'nowrap' as const }}>{step}</span>
            {i < arr.length - 1 && <span style={{ fontSize: 9, color: C.gold }}>→</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
