import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { SwapInterface, PoolList, LiquidityManager, DexStats, UserRewards } from '../components/dex';
import EulerVaultCard from '../components/EulerVaultCard';
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
  desc: 'The Protocol Exchange is the Layer 01.5 settlement conversion and peg maintenance system. Camelot V2 powers AXM/AXUSD trading pairs. The PSM maintains AXUSD at $1.00 by absorbing arbitrage directly against the USDC reserve. EulerSwap LP vaults add capital efficiency for credentialed participants. All liquidity activity is identity-gated via ERC-3643 — no anonymous LP positions. This layer sits between the AXUSD settlement rail (L01) and the AXAU reserve (L02), ensuring peg integrity without reliance on a single mechanism.',
};

type Tab = 'swap' | 'pools' | 'liquidity' | 'eulerswap-lp' | 'rewards' | 'earn';

interface EulerSwapPool {
  id: string;
  label: string;
  address: string;
  status: string;
  tvlUsd: number;
  reserve0: number;
  reserve1: number;
  reserve0Label: string;
  reserve1Label: string;
  equilibriumReserve0: number;
  equilibriumReserve1: number;
  feeBps: number;
  swapFeeApyBps: number;
  lendingApyBps: number;
  blendedApyBps: number;
  blendedApyLabel: string;
  blendedApyPct: string;
  erc3643WhitelistRequired: boolean;
  note: string | null;
}

interface EulerSwapStats {
  deployed: boolean;
  totalTvlUsd: number;
  evkLendingApyBps: number;
  pools: EulerSwapPool[];
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-dl-mono text-xs">{children}</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'LIVE') return <span className="text-xs font-dl-mono text-dl-forest border border-dl-forest px-2 py-0.5">LIVE</span>;
  return <span className="text-xs font-dl-mono text-dl-gold border border-dl-gold px-2 py-0.5">PENDING DEPLOYMENT</span>;
}

function EulerSwapLpTab() {
  const [stats, setStats] = useState<EulerSwapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<string>('axusd_usdc');

  useEffect(() => {
    fetch('/api/euler/eulerswap-pools')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => { setError('Failed to load EulerSwap pool data'); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-dl-bg-alt border border-dl-border p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-dl-bg-alt border border-dl-border p-6 text-center">
        <p className="text-dl-red font-dl-mono text-sm">{error || 'Failed to load pool data'}</p>
      </div>
    );
  }

  const selectedPoolData = stats.pools.find(p => p.id === selectedPool) ?? stats.pools[0];

  return (
    <div className="space-y-6">
      <div className="bg-dl-bg-alt border border-dl-border p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Primary Liquidity Venue</p>
            <h2 className="font-dl-serif text-xl text-dl-navy">EulerSwap AXUSD Pools</h2>
            <p className="text-dl-gray text-sm mt-1">
              LP capital earns dual yield — swap fees and lending income from the EVK AXUSD vault simultaneously.
            </p>
          </div>
          <StatusBadge status={stats.deployed ? 'LIVE' : 'PENDING_DEPLOYMENT'} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-dl-border pt-4">
          <div>
            <p className="font-dl-mono text-xs text-dl-gray uppercase">Total Pool TVL</p>
            <p className="font-dl-mono text-lg text-dl-navy">${stats.totalTvlUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="font-dl-mono text-xs text-dl-gray uppercase">EVK Lending Rate (Variable)</p>
            <p className="font-dl-mono text-lg text-dl-navy">{(stats.evkLendingApyBps / 100).toFixed(2)}%</p>
          </div>
          <div>
            <p className="font-dl-mono text-xs text-dl-gray uppercase">Pools</p>
            <p className="font-dl-mono text-lg text-dl-navy">{stats.pools.length}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {stats.pools.map(pool => (
          <button
            key={pool.id}
            onClick={() => setSelectedPool(pool.id)}
            className={`px-4 py-2 font-dl-mono text-sm border ${
              selectedPool === pool.id
                ? 'bg-dl-navy text-white border-dl-navy'
                : 'border-dl-border text-dl-gray'
            }`}
          >
            {pool.label}
          </button>
        ))}
      </div>

      {selectedPoolData && (
        <div className="border border-dl-border">
          <div className="bg-dl-bg-alt border-b border-dl-border p-4 flex items-center justify-between">
            <div>
              <h3 className="font-dl-serif text-lg text-dl-navy">{selectedPoolData.label}</h3>
              <Mono>{selectedPoolData.address === '0x0000000000000000000000000000000000000000' ? 'PENDING DEPLOYMENT' : `${selectedPoolData.address.slice(0, 8)}…${selectedPoolData.address.slice(-6)}`}</Mono>
            </div>
            <StatusBadge status={selectedPoolData.status} />
          </div>

          <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4 border-b border-dl-border">
            <div>
              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">TVL</p>
              <p className="font-dl-mono text-base text-dl-navy">${selectedPoolData.tvlUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Swap Fee</p>
              <p className="font-dl-mono text-base text-dl-navy">{selectedPoolData.feeBps.toFixed(3)} bps</p>
            </div>
            <div>
              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Swap Fee Yield (Variable)</p>
              <p className="font-dl-mono text-base text-dl-navy">{(selectedPoolData.swapFeeApyBps / 100).toFixed(2)}%</p>
            </div>
            <div>
              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Lending Yield (Variable)</p>
              <p className="font-dl-mono text-base text-dl-navy">{(selectedPoolData.lendingApyBps / 100).toFixed(2)}%</p>
            </div>
          </div>

          {selectedPoolData.status === 'LIVE' && (
            <div className="p-4 border-b border-dl-border bg-dl-bg">
              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-3">On-Chain Reserves</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-dl-mono text-xs text-dl-gray mb-1">{selectedPoolData.reserve0Label}</p>
                  <p className="font-dl-mono text-sm text-dl-navy">{selectedPoolData.reserve0.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="font-dl-mono text-xs text-dl-gray">Eq: {selectedPoolData.equilibriumReserve0.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="font-dl-mono text-xs text-dl-gray mb-1">{selectedPoolData.reserve1Label}</p>
                  <p className="font-dl-mono text-sm text-dl-navy">{selectedPoolData.reserve1.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="font-dl-mono text-xs text-dl-gray">Eq: {selectedPoolData.equilibriumReserve1.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-dl-bg-alt border-b border-dl-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Blended Yield Rate (Swap Fees + Lending — Variable)</p>
                <p className="font-dl-serif text-2xl text-dl-navy">{selectedPoolData.blendedApyPct}% <span className="text-sm text-dl-gray font-dl-mono">{selectedPoolData.blendedApyLabel}</span></p>
                <p className="text-dl-gray text-xs mt-1">= {(selectedPoolData.swapFeeApyBps / 100).toFixed(2)}% swap fees + {(selectedPoolData.lendingApyBps / 100).toFixed(2)}% lending — both are variable and not guaranteed.</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4">
              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-2">ERC-3643 Compliance</p>
              <p className="text-dl-gray text-sm">AXUSD is ERC-3643 compliant. Identity verification is required before adding liquidity. Pool addresses must be registered in the Lending Platform Module.</p>
            </div>

            {selectedPoolData.status === 'PENDING_DEPLOYMENT' ? (
              <div className="border border-dl-gold p-4">
                <p className="font-dl-mono text-xs text-dl-gold uppercase mb-1">Pending Deployment</p>
                <p className="text-dl-gray text-sm">This pool is pending on-chain deployment. Once live, identity-verified participants can add liquidity to earn dual yield.</p>
                <p className="text-dl-gray text-xs mt-2">Run <Mono>npx hardhat run scripts/deploy-eulerswap-pools.js --network arbitrumOne</Mono> after confirming the factory address.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-dl-mono text-xs text-dl-gray uppercase">Pool Verification</p>
                <a
                  href={`https://arbiscan.io/address/${selectedPoolData.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 border border-dl-navy text-dl-navy text-center font-dl-mono text-sm hover:bg-dl-navy hover:text-white transition-colors"
                >
                  Verify Pool on Arbiscan →
                </a>
                <div className="border border-dl-border p-3 bg-dl-bg">
                  <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Pool Address</p>
                  <p className="font-dl-mono text-xs text-dl-navy break-all">{selectedPoolData.address}</p>
                </div>
                <p className="text-dl-gray text-xs leading-relaxed">These are Axiom protocol-owned EulerSwap V2 pools deployed directly on Arbitrum One. They are not listed on Euler&apos;s public UI — use the Swap interface above to interact with them. Identity verification is required for AXUSD transfers.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-dl-bg-alt border border-dl-border p-5">
        <h3 className="text-dl-navy font-dl-serif mb-3">How EulerSwap Dual Yield Works</h3>
        <div className="space-y-3">
          {[
            ['Deposit AXUSD + USDC into the EulerSwap pool', 'Your LP position is backed by the EVK AXUSD lending vault'],
            ['Earn swap fees on every trade', `${selectedPoolData?.feeBps ?? 30} bps fee on each swap routed through the pool`],
            ['Earn lending yield on idle capital', 'Funds not needed for immediate swaps are deployed to the EVK vault and earn interest from borrowers'],
            ['Both income streams are variable', 'Rates depend on swap volume and vault utilization — labeled Variable, not guaranteed'],
          ].map(([title, detail], i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-dl-navy flex items-center justify-center text-white text-sm font-dl-mono shrink-0">{i + 1}</div>
              <div>
                <p className="text-dl-navy text-sm font-medium">{title}</p>
                <p className="text-dl-gray text-xs">{detail}</p>
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
    { id: 'eulerswap-lp', label: 'EulerSwap LP', primary: true },
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
          <span className="font-dl-mono text-xs text-dl-gold border border-dl-gold px-2 py-0.5">Camelot V2 + EulerSwap</span>
          <span className="font-dl-mono text-xs text-dl-forest border border-dl-forest px-2 py-0.5">LIVE</span>
        </div>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-2">Protocol Exchange — Settlement Conversion Layer</h1>
        <p className="text-dl-gray text-sm max-w-2xl leading-relaxed">
          The Axiom Protocol Exchange is not a generic DEX. It is Layer 01.5 of the financial operating system — the mandatory settlement conversion and peg maintenance layer for AXUSD. Camelot V2 infrastructure provides AXM/AXUSD liquidity; EulerSwap LP pools concentrate capital for dual swap-and-lending yield; and the PSM-backed conversion path enforces AXUSD peg integrity. All capital flows between layers route through this venue.
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
          { label: 'Primary Venue', value: 'Camelot V2 + EulerSwap' },
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
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#b8860b', margin: '0 0 4px' }}>Layer 01.5 · Settlement Conversion · EulerSwap Routing</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#374151', lineHeight: 1.55, margin: 0 }}>All swaps route through EulerSwap. Quotes reflect live on-chain pool reserves. Slippage is minimal within the AXUSD/USDC peg band.</p>
                </div>
              </div>
              <div className="bg-dl-bg-alt border border-dl-border p-3">
                <p className="font-dl-mono text-xs text-dl-gray">
                  Swap routing: <span className="text-dl-navy">EulerSwap</span>. Quotes reflect on-chain pool reserves.
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
              {/* EulerSwap LP visual accent */}
              <div style={{ position: 'relative', width: '100%', height: 'clamp(140px, 18vw, 220px)', overflow: 'hidden', background: '#0e1c37' }}>
                <img src="/visuals/dex-liquidity.png" alt="EulerSwap concentrated liquidity" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block', opacity: 0.82 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(14,28,55,0.96) 0%, rgba(14,28,55,0.80) 45%, rgba(14,28,55,0.30) 100%)' }} />
                <div style={{ position: 'absolute', bottom: 14, left: 20, padding: '8px 14px', background: 'rgba(14,28,55,0.5)' }}>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#e8c96a', margin: '0 0 4px', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>EulerSwap · Concentrated Liquidity · Dual Yield</p>
                  <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 20, fontWeight: 700, color: '#ffffff', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>Concentrated liquidity. Swap fees + lending APR.</p>
                </div>
              </div>
              <EulerSwapLpTab />
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
              {/* Earn tab visual accent */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', border: '1px solid #e5e0d8', background: '#faf9f7' }}>
                <img src="/visuals/dex-rewards.png" alt="Earn yield on AXUSD" style={{ width: 60, height: 60, objectFit: 'contain', flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#b8860b', margin: '0 0 4px' }}>Euler Finance · AXUSD Lending Market · Identity-Gated</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#374151', lineHeight: 1.55, margin: 0 }}>Deposit AXUSD to earn lending interest from collateralized borrowers. Interest accrues continuously — claim at any time. No lock-up required.</p>
                </div>
              </div>
              <div className="text-center mb-4">
                <h2 className="font-dl-serif text-xl text-dl-navy">Earn Yield on AXUSD</h2>
                <p className="text-dl-gray text-sm mt-1">Deposit AXUSD to earn interest from borrowers via Euler Finance</p>
              </div>
              <EulerVaultCard variant="full" showCollateral={true} />
              <div className="bg-dl-bg-alt p-5 border border-dl-border">
                <h3 className="text-dl-navy font-dl-serif mb-3">How It Works</h3>
                <div className="space-y-3">
                  {[
                    ['Deposit AXUSD into the Euler vault', 'Your AXUSD is pooled with other lenders'],
                    ['Borrowers use collateral to borrow AXUSD', 'Collateral: USDC, USDT, WETH, ARB vault shares'],
                    ['Earn interest from borrowers', 'Interest accrues automatically to your position'],
                  ].map(([title, detail], i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-dl-navy flex items-center justify-center text-white text-sm font-medium">{i + 1}</div>
                      <div>
                        <p className="text-dl-navy text-sm">{title}</p>
                        <p className="text-dl-gray text-xs">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <a href="/earn" className="flex-1 py-3 bg-dl-bg-alt text-dl-navy text-center font-medium border border-dl-border font-dl-mono text-sm">
                  View All Yield Opportunities
                </a>
                <a href="/borrow" className="flex-1 py-3 bg-dl-bg-alt text-dl-navy text-center font-medium border border-dl-border font-dl-mono text-sm">
                  Borrow AXUSD
                </a>
              </div>
            </div>
          )}
        </main>
      </div>
    </DesignLawLayout>
  );
}
