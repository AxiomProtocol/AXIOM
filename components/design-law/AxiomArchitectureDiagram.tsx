import React from 'react';

const C = {
  navy: '#1e3a5f',
  navyDeep: '#162d4a',
  gold: '#b8860b',
  goldLight: '#d4a853',
  goldFaint: '#f5edd8',
  green: '#2d6a4f',
  greenFaint: '#eaf3ee',
  muted: '#6b5f4e',
  border: '#d8cfc0',
  borderDark: '#c4b89a',
  bg: '#fafaf8',
  bgAlt: '#f2ede6',
  white: '#ffffff',
  gray: '#9ca3af',
  axauAccent: '#7a5c1e',
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
  isAnchor?: boolean;
}

const LAYERS: Layer[] = [
  {
    id: '00',
    title: 'Banking / Fiat Entry',
    desc: 'FDIC-insured fiat rails via Increase. Institutional crypto custody via BitGo. Primary dollar on-ramp and off-ramp for the stack.',
    status: 'LIVE',
    tokens: 'Increase · BitGo · ACH / Wire',
    href: '/banking',
    flowLabel: 'USD IN',
  },
  {
    id: '01',
    title: 'AXUSD Settlement Rail',
    desc: 'ERC-3643 USD-pegged settlement token. Issued via PSM at 1:1 against USDC. Identity-gated. On-chain reserve verification.',
    status: 'LIVE',
    tokens: 'AXUSD · PSM · ERC-3643',
    href: '/axusd',
    flowLabel: 'SETTLE',
  },
  {
    id: '01.5',
    title: 'Exchange + Peg Infrastructure',
    desc: 'Camelot V2 + EulerSwap concentrated pools. Primary peg maintenance and conversion venue. All reserve conversions route here.',
    status: 'LIVE',
    tokens: 'Camelot V2 · EulerSwap · PSM',
    href: '/dex',
    flowLabel: 'CONVERT',
  },
  {
    id: '02',
    title: 'AXAU Reserve Layer',
    desc: 'PAXG-backed gold reserve unit — the hard-asset anchor of the entire protocol. Live coverage ratio enforced on-chain. Chainlink XAU/USD oracle.',
    status: 'LIVE',
    tokens: 'AXAU · PAXG · GoldVault · Chainlink',
    href: '/axau',
    flowLabel: 'ANCHOR',
    isAnchor: true,
  },
  {
    id: '03',
    title: 'Capital Deployment',
    desc: 'Lending Fund (SEC Reg D 506(c)), SPV structures, on-chain fixed-term credit markets, and syndication programs.',
    status: 'FORMATION',
    tokens: 'Lending Fund · SPVs · Credit Market',
    href: '/lending-fund',
    flowLabel: 'DEPLOY',
  },
  {
    id: '04',
    title: 'Intelligence',
    desc: 'MIRDT nine-dimension capital intelligence. Sentinel risk authorization layer. Observer institutional dashboard. RE deal analysis.',
    status: 'LIVE',
    tokens: 'MIRDT · Sentinel · Observer',
    href: '/mirdt',
    flowLabel: 'SIGNAL',
  },
  {
    id: '05',
    title: 'Trust / Solvency / Compliance',
    desc: 'Three-mode solvency console. Proof of Execution log. Institutional disclosure. ERC-3643 identity layer. Agent governance policy engine.',
    status: 'LIVE',
    tokens: 'Solvency · Disclosure · ERC-3643',
    href: '/solvency',
    flowLabel: 'VERIFY',
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
      fontSize: 8,
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const,
      color: statusColor(status),
      border: `1px solid ${statusColor(status)}`,
      padding: '2px 6px',
      background: status === 'LIVE' ? C.greenFaint : C.bg,
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
    <div className={className} style={{ fontFamily: SERIF, background: C.bg, border: `1px solid ${C.borderDark}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

      {/* Institutional header — navy background */}
      <div style={{
        padding: '16px 24px',
        background: C.navyDeep,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap' as const,
      }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: C.goldLight, marginBottom: 4 }}>
            AXIOM PROTOCOL · ARBITRUM ONE · CHAIN ID 42161
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: C.white, letterSpacing: '0.01em' }}>
            Financial Operating System — Layer Architecture
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 5 }}>
          <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.goldLight, border: `1px solid ${C.goldLight}`, padding: '2px 10px' }}>
            7 LAYERS
          </span>
          <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.green, border: `1px solid ${C.green}`, padding: '2px 10px', background: C.greenFaint }}>
            LIVE ON MAINNET
          </span>
        </div>
      </div>

      {/* Capital flow strip — more prominent */}
      {showCapitalFlow && (
        <div style={{
          padding: '12px 24px',
          borderBottom: `2px solid ${C.border}`,
          background: C.bgAlt,
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflowX: 'auto' as const,
        }}>
          <span style={{
            fontFamily: MONO,
            fontSize: 8,
            letterSpacing: '0.2em',
            textTransform: 'uppercase' as const,
            color: C.muted,
            marginRight: 20,
            whiteSpace: 'nowrap' as const,
            borderRight: `1px solid ${C.border}`,
            paddingRight: 20,
          }}>
            CAPITAL FLOW
          </span>
          {[
            { label: 'USD', sub: 'L00' },
            { label: 'Banking', sub: 'L00' },
            { label: 'AXUSD', sub: 'L01' },
            { label: 'Exchange', sub: 'L01.5' },
            { label: 'AXAU', sub: 'L02', anchor: true },
            { label: 'Capital', sub: 'L03' },
          ].map((step, i, arr) => (
            <React.Fragment key={step.label}>
              <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 1 }}>
                <span style={{
                  fontFamily: MONO,
                  fontSize: step.anchor ? 12 : 11,
                  fontWeight: 700,
                  color: step.anchor ? C.axauAccent : C.navy,
                  whiteSpace: 'nowrap' as const,
                  letterSpacing: step.anchor ? '0.04em' : '0',
                }}>
                  {step.label}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 7, color: C.muted, letterSpacing: '0.1em' }}>{step.sub}</span>
              </div>
              {i < arr.length - 1 && (
                <span style={{ fontFamily: MONO, fontSize: 14, color: C.gold, margin: '0 10px', lineHeight: 1 }}>→</span>
              )}
            </React.Fragment>
          ))}
          <span style={{
            marginLeft: 20,
            fontFamily: MONO,
            fontSize: 8,
            letterSpacing: '0.13em',
            color: C.muted,
            whiteSpace: 'nowrap' as const,
            borderLeft: `1px solid ${C.border}`,
            paddingLeft: 20,
          }}>
            RESERVE ANCHOR: AXAU / PAXG
          </span>
        </div>
      )}

      {/* Layer rows */}
      <div>
        {LAYERS.map((layer, i) => {
          const isAnchor = layer.isAnchor;
          const rowBg = isAnchor ? '#fdf6e8' : (i % 2 === 0 ? C.bg : C.bgAlt);
          const idBg = isAnchor ? '#f0e4c4' : C.bgAlt;

          return (
            <div key={layer.id} style={{
              display: 'grid',
              gridTemplateColumns: '72px 8px 1fr 110px',
              borderBottom: i < LAYERS.length - 1 ? `1px solid ${C.border}` : 'none',
              borderLeft: isAnchor ? `4px solid ${C.gold}` : '4px solid transparent',
              minHeight: 80,
              position: 'relative' as const,
            }}>
              {/* Layer ID column */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: `1px solid ${C.border}`,
                background: idBg,
                padding: '12px 8px',
              }}>
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.12em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 2 }}>LAYER</div>
                  <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: isAnchor ? C.axauAccent : C.navy, lineHeight: 1 }}>{layer.id}</div>
                </div>
              </div>

              {/* Flow connector column */}
              <div style={{
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                justifyContent: 'center',
                background: rowBg,
                position: 'relative' as const,
              }}>
                {/* Vertical line */}
                <div style={{
                  position: 'absolute' as const,
                  top: 0,
                  bottom: i < LAYERS.length - 1 ? 0 : '50%',
                  left: '50%',
                  width: 1,
                  background: C.border,
                  transform: 'translateX(-50%)',
                }} />
                {/* Arrow dot */}
                {i < LAYERS.length - 1 && (
                  <div style={{
                    position: 'absolute' as const,
                    bottom: -5,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 6,
                    height: 6,
                    background: C.gold,
                    clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)',
                    zIndex: 1,
                  }} />
                )}
              </div>

              {/* Content column */}
              <div style={{ padding: '16px 20px 14px', background: rowBg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, marginBottom: 6 }}>
                  <span style={{
                    fontFamily: SERIF,
                    fontSize: 16,
                    fontWeight: 700,
                    color: isAnchor ? C.axauAccent : C.navy,
                    letterSpacing: '0.01em',
                  }}>
                    {layer.title}
                  </span>
                  <StatusBadge status={layer.status} />
                  {isAnchor && (
                    <span style={{
                      fontFamily: MONO,
                      fontSize: 7,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase' as const,
                      color: C.axauAccent,
                      border: `1px solid ${C.gold}`,
                      padding: '1px 6px',
                      background: C.goldFaint,
                    }}>
                      RESERVE ANCHOR
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, lineHeight: 1.7, margin: 0, marginBottom: 7 }}>
                  {layer.desc}
                </p>
                {layer.tokens && (
                  <span style={{ fontFamily: MONO, fontSize: 9, color: isAnchor ? C.axauAccent : C.gold, letterSpacing: '0.11em' }}>
                    {layer.tokens}
                  </span>
                )}
              </div>

              {/* Right column — flow signal + link */}
              <div style={{
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'flex-end',
                justifyContent: 'center',
                padding: '12px 18px',
                gap: 8,
                borderLeft: `1px solid ${C.border}`,
                background: isAnchor ? '#fdf0d0' : (i % 2 === 0 ? C.bg : C.bgAlt),
              }}>
                {layer.flowLabel && (
                  <span style={{
                    fontFamily: MONO,
                    fontSize: 8,
                    letterSpacing: '0.18em',
                    color: isAnchor ? C.axauAccent : C.gold,
                    textTransform: 'uppercase' as const,
                    fontWeight: isAnchor ? 700 : 400,
                    borderBottom: isAnchor ? `1px solid ${C.gold}` : 'none',
                    paddingBottom: isAnchor ? 2 : 0,
                  }}>
                    {layer.flowLabel}
                  </span>
                )}
                {layer.href && (
                  <a
                    href={layer.href}
                    style={{
                      fontFamily: MONO,
                      fontSize: 8,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase' as const,
                      color: C.navy,
                      textDecoration: 'none',
                      border: `1px solid ${isAnchor ? C.gold : C.border}`,
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
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 24px',
        borderTop: `1px solid ${C.border}`,
        background: C.navyDeep,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap' as const,
        gap: 8,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const }}>
          All contracts deployed · Arbiscan verified · axiomprotocol.io/disclosure
        </span>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.13em', color: C.goldLight }}>
          axiomprotocol.io
        </span>
      </div>
    </div>
  );
}

function CompactDiagram({ className }: { className?: string }) {
  return (
    <div className={className} style={{ fontFamily: MONO, background: C.bg, border: `1px solid ${C.borderDark}` }}>
      {/* Header strip */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${C.border}`,
        background: C.navyDeep,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: C.white }}>
          AXIOM PROTOCOL · SYSTEM LAYERS
        </span>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.13em', color: C.goldLight }}>
          ARBITRUM ONE
        </span>
      </div>

      {/* Compact layer rows */}
      {LAYERS.map((layer, i) => {
        const isAnchor = layer.isAnchor;
        return (
          <div key={layer.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            borderBottom: i < LAYERS.length - 1 ? `1px solid ${C.border}` : 'none',
            borderLeft: isAnchor ? `3px solid ${C.gold}` : '3px solid transparent',
            minHeight: 40,
            background: isAnchor ? '#fdf6e8' : C.bg,
          }}>
            {/* ID */}
            <div style={{
              width: 52,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: `1px solid ${C.border}`,
              alignSelf: 'stretch' as const,
              background: isAnchor ? '#f0e4c4' : C.bgAlt,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: isAnchor ? C.axauAccent : C.navy }}>{layer.id}</span>
            </div>
            {/* Title */}
            <div style={{ flex: 1, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 700, color: isAnchor ? C.axauAccent : C.navy }}>{layer.title}</span>
              {isAnchor && (
                <span style={{ fontFamily: MONO, fontSize: 7, color: C.axauAccent, border: `1px solid ${C.goldLight}`, padding: '1px 5px', background: C.goldFaint, letterSpacing: '0.12em' }}>
                  ANCHOR
                </span>
              )}
            </div>
            {/* Flow + Status */}
            <div style={{ padding: '8px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {layer.flowLabel && (
                <span style={{ fontFamily: MONO, fontSize: 8, color: C.gold, letterSpacing: '0.12em' }}>{layer.flowLabel}</span>
              )}
              <StatusBadge status={layer.status} />
            </div>
          </div>
        );
      })}

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
        <span style={{ fontSize: 8, letterSpacing: '0.16em', color: C.muted, marginRight: 8, whiteSpace: 'nowrap' as const }}>FLOW:</span>
        {['USD', 'Banking', 'AXUSD', 'Exchange', 'AXAU ⬡', 'Capital'].map((step, i, arr) => (
          <React.Fragment key={step}>
            <span style={{
              fontSize: 9,
              fontWeight: step.includes('AXAU') ? 700 : 400,
              color: step.includes('AXAU') ? C.axauAccent : C.navy,
              whiteSpace: 'nowrap' as const,
            }}>
              {step}
            </span>
            {i < arr.length - 1 && <span style={{ fontSize: 9, color: C.gold }}>→</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
