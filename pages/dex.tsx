import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SwapInterface, PoolList, LiquidityManager, DexStats, UserRewards } from '../components/dex';
import { DesignLawLayout, SectionHeading } from '../components/design-law';


const TradingViewChart = dynamic(() => import('../components/dex/TradingViewChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-dl-bg border border-dl-border h-[500px] flex items-center justify-center">
      <p className="text-sm text-dl-gray font-dl-mono">Loading chart...</p>
    </div>
  ),
});

const DEX_HEADER = {
  kicker: 'Layer 01.5 — Settlement Conversion + Peg Maintenance Layer',
  headline: 'Protocol Exchange',
  subheadline: 'Not a Generic DEX — the Settlement Infrastructure Between L01 and L02',
  desc: 'The Protocol Exchange is the Layer 01.5 settlement conversion and peg maintenance system. Camelot V2 powers AXM/AXUSD trading pairs. The PSM maintains AXUSD at $1.00 by absorbing arbitrage directly against the USDC reserve. All liquidity activity is identity-gated via ERC-3643 — no anonymous LP positions. This layer sits between the AXUSD settlement rail (L01) and the AXAU reserve (L02), ensuring peg integrity without reliance on a single mechanism.',
};

type Tab = 'swap' | 'pools' | 'liquidity' | 'eulerswap-lp' | 'rewards' | 'earn';

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-dl-mono text-xs">{children}</span>;
}

function LegacyLpTab() {
  return (
    <div className="space-y-6">
      <div className="border border-dl-border bg-dl-bg-alt p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-dl-mono text-xs border border-red-400 text-red-600 px-2 py-0.5 uppercase tracking-widest">Withdrawn</span>
          <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">Integration Decommissioned</span>
        </div>
        <h2 className="font-dl-serif text-xl text-dl-navy mb-3">EulerSwap LP — Legacy Integration</h2>
        <p className="text-sm text-dl-gray leading-relaxed mb-4">
          The EulerSwap LP integration — which provided concentrated AXUSD/USDC liquidity with dual swap-and-lending yield via
          the Euler V2 EVK AXUSD vault — has been withdrawn from the Axiom Protocol stack. All protocol-controlled positions
          associated with this integration have been exited. No dual yield is currently available through this venue.
        </p>
        <div className="border border-dl-border bg-dl-bg p-4 mb-4">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">Integration Status</p>
          <div className="space-y-1.5 font-dl-mono text-xs">
            <div className="flex justify-between">
              <span className="text-dl-gray">EulerSwap pools API</span>
              <span className="text-red-600">HTTP 410 — Decommissioned</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dl-gray">EVK AXUSD vault API</span>
              <span className="text-red-600">HTTP 410 — Decommissioned</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dl-gray">Protocol LP positions</span>
              <span className="text-dl-navy">Exited — no active position</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dl-gray">User capital at risk</span>
              <span className="text-dl-forest">None — no public deposits were open</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-dl-gray leading-relaxed">
          The Euler V2 architecture was withdrawn as part of Task #510. Axiom-native liquidity infrastructure
          is in the formation phase. See the{' '}
          <Link href="/liquidity" className="text-dl-navy underline">Liquidity Venues</Link>
          {' '}page for current venue status, or{' '}
          <Link href="/disclosure" className="text-dl-navy underline">Institutional Disclosure</Link>
          {' '}for the full transition documentation.
        </p>
      </div>

      <div className="border border-dl-border p-5">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-3">Active Liquidity Venues</p>
        <div className="space-y-3">
          {[
            { label: 'Camelot V2 — AXM/AXUSD', status: 'Active', href: '/dex' },
            { label: 'PSM — AXUSD/USDC (1:1 peg mechanism)', status: 'Active', href: '/dex' },
            { label: 'Axiom-Native Earn Vault', status: 'Configured — In Formation', href: '/earn/axusd' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between border border-dl-border px-4 py-3 bg-dl-bg">
              <span className="font-dl-serif text-sm text-dl-navy">{item.label}</span>
              <div className="flex items-center gap-3">
                <span className={`font-dl-mono text-xs border px-2 py-0.5 ${item.status === 'Active' ? 'border-dl-forest text-dl-forest' : 'border-dl-navy text-dl-navy'}`}>
                  {item.status}
                </span>
                <Link href={item.href} className="font-dl-mono text-xs text-dl-gray underline">View →</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface CoinbaseSpotPrice {
  productId: string;
  price: number;
  priceChangePct24h: number;
}

interface CoinbasePricesResult {
  prices: Record<string, CoinbaseSpotPrice>;
  isLive: boolean;
}

function PriceTicker() {
  const [data, setData] = useState<CoinbasePricesResult | null>(null);

  useEffect(() => {
    fetch('/api/market/coinbase-prices?pairs=ETH-USD,BTC-USD,USDC-USD')
      .then(r => r.json() as Promise<CoinbasePricesResult>)
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data || !data.isLive) return null;

  const pairs = Object.values(data.prices);

  return (
    <div className="border border-dl-border bg-dl-bg-alt px-4 py-3 mb-6 flex flex-wrap gap-6 items-center">
      <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Market</span>
      {pairs.map(p => {
        const positive = p.priceChangePct24h >= 0;
        return (
          <div key={p.productId} className="flex items-baseline gap-2">
            <span className="font-dl-mono text-xs text-dl-gray">{p.productId}</span>
            <span className="font-dl-mono text-sm text-dl-navy font-bold">
              ${p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`font-dl-mono text-xs ${positive ? 'text-dl-forest' : 'text-red-600'}`}>
              {positive ? '+' : ''}{p.priceChangePct24h.toFixed(2)}%
            </span>
          </div>
        );
      })}
      <span className="font-dl-mono text-xs text-dl-gray ml-auto">via Coinbase</span>
    </div>
  );
}

export default function DexPage() {
  const [activeTab, setActiveTab] = useState<Tab>('swap');

  const tabs: { id: Tab; label: string; primary?: boolean }[] = [
    { id: 'swap',         label: 'Swap' },
    { id: 'eulerswap-lp', label: 'Legacy LP' },
    { id: 'pools',        label: 'Pools' },
    { id: 'liquidity',    label: 'Liquidity' },
    { id: 'rewards',      label: 'Rewards' },
    { id: 'earn',         label: 'Earn' },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Axiom Protocol Exchange — Layer 01.5 Exchange + Peg | AXUSD on Arbitrum One</title>
        <meta name="description" content="The Axiom Protocol's Layer 01.5 exchange and peg layer. Swap AXUSD, provide liquidity via EulerSwap for dual swap and lending yield, and support PSM-backed peg maintenance on Arbitrum One." />
      </Head>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-dl-mono text-xs text-dl-gray border border-dl-border px-2 py-0.5">Layer 01.5 Exchange + Peg</span>
          <span className="font-dl-mono text-xs text-dl-gold border border-dl-gold px-2 py-0.5">Camelot V2 + PSM</span>
          <span className="font-dl-mono text-xs text-dl-forest border border-dl-forest px-2 py-0.5">LIVE</span>
        </div>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-2">Protocol Exchange — Settlement Conversion Layer</h1>
        <p className="text-dl-gray text-sm max-w-2xl leading-relaxed">
          The Axiom Protocol Exchange is not a generic DEX. It is Layer 01.5 of the financial operating system — the mandatory settlement conversion and peg maintenance layer for AXUSD. Camelot V2 infrastructure provides AXM/AXUSD liquidity; the PSM-backed conversion path enforces AXUSD peg integrity at $1.00. All capital flows between layers route through this venue. The EulerSwap LP integration has been withdrawn — see the Legacy LP tab for details.
        </p>
      </div>

      {/* DEX cinematic hero banner */}
      <div style={{ position: 'relative', width: '100%', height: 'clamp(180px, 28vw, 320px)', overflow: 'hidden', marginBottom: 24, background: '#0e1c37' }}>
        <img src="/visuals/dex-hero.png" alt="Protocol Exchange settlement layer" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block', opacity: 0.85 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(14,28,55,0.96) 0%, rgba(14,28,55,0.85) 45%, rgba(14,28,55,0.35) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 16, left: 24, padding: '10px 16px', background: 'rgba(14,28,55,0.55)', backdropFilter: 'blur(2px)' }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#e8c96a', margin: '0 0 6px', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>Layer 01.5 · Protocol Exchange · Arbitrum One</p>
          <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>Settlement Conversion. Peg Maintenance. Liquidity Depth.</p>
        </div>
      </div>

      {/* Architecture callout */}
      <div className="border border-dl-border bg-dl-bg-alt p-4 mb-6 flex flex-wrap gap-6">
        {[
          { label: 'Exchange Layer', value: 'Layer 01.5 / Peg + Liquidity' },
          { label: 'Primary Venue', value: 'Camelot V2 + PSM' },
          { label: 'Settlement Layer', value: 'Layer 01 / AXUSD' },
          { label: 'Reserve Layer', value: 'Layer 02 / AXAU' },
          { label: 'Network', value: 'Arbitrum One' },
        ].map(item => (
          <div key={item.label}>
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="font-dl-mono text-sm text-dl-navy font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <PriceTicker />

      {/* Acquire AXUSD callout */}
      <div className="border border-dl-border p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-dl-mono text-[10px] text-dl-gray uppercase tracking-widest mb-1">Need AXUSD to Trade or Provide Liquidity?</p>
          <p className="text-sm text-dl-gray leading-relaxed">
            Buy USDC with a debit or credit card via Coinbase Pay, then convert 1:1 to AXUSD through the Peg Stability Module — or pay directly by card and receive AXUSD minted to your wallet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href="/onramp"
            className="px-4 py-2 bg-dl-ink text-dl-surface font-dl-mono text-xs uppercase tracking-wide hover:opacity-90"
          >
            Card → AXUSD
          </Link>
          <Link
            href="/banking"
            className="px-4 py-2 border border-dl-border text-dl-gray font-dl-mono text-xs uppercase tracking-wide hover:text-dl-navy"
          >
            All Funding Paths
          </Link>
        </div>
      </div>

      {/* Peg stability mechanism block */}
      <div className="border border-dl-border bg-dl-bg p-5 mb-6">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-3">AXUSD Peg Stability — How DEX Liquidity Supports the Peg</p>
        <div className="grid gap-0" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            {
              title: 'Concentrated Liquidity Depth',
              desc: 'EulerSwap concentrates LP capital within a narrow band around $1.0000. High depth at the peg means large AXUSD ↔ USDC flows incur minimal slippage, reducing arbitrage opportunity and making sustained deviation harder to execute.',
            },
            {
              title: 'Arbitrage Closure Loop',
              desc: 'When AXUSD deviates from $1.00 on the DEX, arbitrageurs can close the gap by using the PSM — swapping USDC to mint AXUSD (if AXUSD > $1) or redeeming AXUSD for USDC (if AXUSD < $1). DEX price and PSM rate converge automatically.',
            },
            {
              title: 'Reserve Conversion Path',
              desc: 'All protocol reserve conversions — including AXUSD ↔ AXAU swap routes — route through the DEX settlement venue. This ensures reserve operations do not bypass the peg constraint and that every large trade is subject to pool depth conditions.',
            },
            {
              title: 'Peg Defense Threshold',
              desc: 'If the AXUSD DEX price moves materially outside the $0.990–$1.010 band, the protocol\'s Market Operations wallet may place stabilizing liquidity or trigger PSM intervention, subject to governance authorization and operational conditions. The Rate Limiter is designed to constrain large single-block outflows.',
            },
          ].map(item => (
            <div key={item.title} className="border-r border-dl-border last:border-r-0 p-4">
              <p className="font-dl-serif text-sm font-bold text-dl-navy mb-2">{item.title}</p>
              <p className="text-dl-gray" style={{ fontFamily: 'Georgia, serif', fontSize: 12, lineHeight: 1.65 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <DexStats />

      <div className="mt-8 flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-52 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-between px-4 py-3 font-dl-mono text-sm whitespace-nowrap border-b-2 lg:border-b-0 lg:border-l-2 ${
                activeTab === tab.id
                  ? 'border-dl-navy text-dl-navy bg-dl-bg-alt'
                  : 'border-transparent text-dl-gray'
              }`}
            >
              <span>{tab.label}</span>
              {tab.primary && (
                <span className="hidden lg:inline text-xs border border-dl-forest text-dl-forest px-1 ml-2">Primary</span>
              )}
            </button>
          ))}
        </nav>

        <main className="flex-1 min-w-0">
          {activeTab === 'swap' && (
            <div className="space-y-6">
              {/* Swap tab visual accent */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', border: '1px solid #e5e0d8', background: '#faf9f7' }}>
                <img src="/visuals/icon-exchange.png" alt="Exchange layer" style={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#b8860b', margin: '0 0 4px' }}>Layer 01.5 · Settlement Conversion · Camelot V2 + PSM</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#374151', lineHeight: 1.55, margin: 0 }}>Swaps route through Camelot V2 and the Peg Stability Module. Quotes reflect live on-chain pool reserves. Slippage is minimal within the AXUSD/USDC peg band.</p>
                </div>
              </div>
              <div className="bg-dl-bg-alt border border-dl-border p-3">
                <p className="font-dl-mono text-xs text-dl-gray">
                  Swap routing: <span className="text-dl-navy">Camelot V2 + PSM</span>. Quotes reflect on-chain pool reserves.
                </p>
              </div>
              <TradingViewChart />
              <div className="flex justify-center">
                <SwapInterface />
              </div>
            </div>
          )}
          {activeTab === 'eulerswap-lp' && (
            <div className="space-y-6">
              <div className="border-l-4 border-red-400 pl-4 py-1">
                <p className="font-dl-mono text-xs text-red-600 uppercase tracking-widest mb-1">Integration Withdrawn</p>
                <p className="text-sm text-dl-gray">The EulerSwap LP integration has been decommissioned. This tab shows the legacy integration record for reference.</p>
              </div>
              <LegacyLpTab />
            </div>
          )}
          {activeTab === 'pools' && (
            <div className="space-y-4">
              {/* Pools tab visual accent */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', border: '1px solid #e5e0d8', background: '#faf9f7' }}>
                <img src="/visuals/icon-exchange.png" alt="Liquidity pools" style={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#b8860b', margin: '0 0 4px' }}>Camelot V2 · Protocol Liquidity Pools · Arbitrum One</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#374151', lineHeight: 1.55, margin: 0 }}>Active liquidity pools providing depth for the AXM/AXUSD settlement pair. All pool activity is on-chain and independently verifiable.</p>
                </div>
              </div>
              <PoolList />
            </div>
          )}
          {activeTab === 'liquidity' && (
            <div className="space-y-4">
              {/* Liquidity tab visual accent */}
              <div style={{ position: 'relative', width: '100%', height: 'clamp(120px, 16vw, 180px)', overflow: 'hidden', background: '#0e1c37' }}>
                <img src="/visuals/dex-liquidity.png" alt="Liquidity management" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%', display: 'block', opacity: 0.8 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(14,28,55,0.97) 0%, rgba(14,28,55,0.82) 42%, rgba(14,28,55,0.28) 100%)' }} />
                <div style={{ position: 'absolute', bottom: 12, left: 20, padding: '8px 14px', background: 'rgba(14,28,55,0.5)' }}>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#e8c96a', margin: '0 0 3px', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>Liquidity Management · Protocol Positions · On-Chain</p>
                  <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 18, fontWeight: 700, color: '#ffffff', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>Add or remove liquidity to support the settlement layer.</p>
                </div>
              </div>
              <LiquidityManager />
            </div>
          )}
          {activeTab === 'rewards' && (
            <div className="space-y-4">
              {/* Rewards tab visual accent */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', border: '1px solid #e5e0d8', background: '#faf9f7' }}>
                <img src="/visuals/dex-rewards.png" alt="Protocol rewards" style={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#b8860b', margin: '0 0 4px' }}>AXM Rewards · Liquidity Incentives · Protocol-Governed</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#374151', lineHeight: 1.55, margin: 0 }}>Claim accrued AXM rewards from protocol liquidity incentive programs. Reward rate is governance-controlled and subject to change.</p>
                </div>
              </div>
              <UserRewards />
            </div>
          )}
          {activeTab === 'earn' && (
            <div className="space-y-6">
              <div className="border-l-4 border-red-400 pl-4 py-1">
                <p className="font-dl-mono text-xs text-red-600 uppercase tracking-widest mb-1">Integration Withdrawn</p>
                <p className="text-sm text-dl-gray">The Euler Finance AXUSD lending market integration has been decommissioned. This tab shows the withdrawal record and Axiom-native replacement posture.</p>
              </div>
              <div className="border border-red-400 bg-dl-bg-alt p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-dl-mono text-xs border border-red-400 text-red-600 px-2 py-0.5 uppercase tracking-widest">Withdrawn</span>
                  <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">Euler AXUSD Lending Market — Decommissioned</span>
                </div>
                <h2 className="font-dl-serif text-xl text-dl-navy mb-3">Euler Earn AXUSD — Legacy Integration</h2>
                <p className="text-sm text-dl-gray leading-relaxed mb-4">
                  The Euler Finance V2 AXUSD lending market — which enabled collateralized lending yield via the EVK AXUSD vault — has been
                  withdrawn from the Axiom Protocol stack. No deposits were open to the public at time of withdrawal. No user capital was at risk.
                  All Euler-dependent API endpoints return HTTP 410. Axiom-native earn infrastructure is in the formation phase.
                </p>
                <div className="border border-dl-border bg-dl-bg p-4 mb-4">
                  <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">Integration Status</p>
                  <div className="space-y-1.5 font-dl-mono text-xs">
                    {[
                      ['Euler Earn strategy', 'Withdrawn — strategy cap zeroed', 'text-red-600'],
                      ['EVK AXUSD vault API', 'HTTP 410 — Decommissioned', 'text-red-600'],
                      ['Active yield', 'None — integration withdrawn', 'text-red-600'],
                      ['User capital at risk', 'None — no public deposits were open', 'text-dl-forest'],
                      ['Axiom-native replacement', 'In formation — not yet open', 'text-dl-navy'],
                    ].map(([label, value, cls]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-dl-gray">{label}</span>
                        <span className={cls}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-dl-gray leading-relaxed">
                  See{' '}
                  <Link href="/earn/axusd" className="text-dl-navy underline">Axiom AXUSD Earn Vault</Link>
                  {' '}for the current configured-state posture and Axiom-native replacement path, or{' '}
                  <Link href="/disclosure" className="text-dl-navy underline">Institutional Disclosure</Link>
                  {' '}for the full transition record.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </DesignLawLayout>
  );
}
