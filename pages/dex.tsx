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
            <p className="font-dl-mono text-xs text-dl-gray uppercase">EVK Lending APY</p>
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
              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Swap Fee APY</p>
              <p className="font-dl-mono text-base text-dl-navy">{(selectedPoolData.swapFeeApyBps / 100).toFixed(2)}% <span className="text-dl-gray text-xs">(variable)</span></p>
            </div>
            <div>
              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Lending Yield APY</p>
              <p className="font-dl-mono text-base text-dl-navy">{(selectedPoolData.lendingApyBps / 100).toFixed(2)}% <span className="text-dl-gray text-xs">(variable)</span></p>
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
                <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Blended APY (Swap Fees + Lending Yield)</p>
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
        <title>Axiom Exchange | AXUSD Liquidity</title>
        <meta name="description" content="Swap AXUSD, provide liquidity on EulerSwap for dual yield, and earn rewards on Axiom" />
      </Head>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-dl-serif text-3xl text-dl-navy">Axiom Exchange</h1>
          <span className="text-xs font-dl-mono border border-dl-forest text-dl-forest px-2 py-0.5">EulerSwap Primary</span>
        </div>
        <p className="text-dl-gray">AXUSD liquidity, swaps, and dual-yield LP on Arbitrum One</p>
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
          {activeTab === 'eulerswap-lp' && <EulerSwapLpTab />}
          {activeTab === 'pools' && <PoolList />}
          {activeTab === 'liquidity' && <LiquidityManager />}
          {activeTab === 'rewards' && <UserRewards />}
          {activeTab === 'earn' && (
            <div className="space-y-6">
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
