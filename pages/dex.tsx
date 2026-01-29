import { useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { SwapInterface, PoolList, LiquidityManager, DexStats, UserRewards } from '../components/dex';
import EulerVaultCard from '../components/EulerVaultCard';

const TradingViewChart = dynamic(() => import('../components/dex/TradingViewChart'), { 
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-xl border border-gray-200 h-[500px] flex items-center justify-center">
      <div className="text-gray-500">Loading chart...</div>
    </div>
  )
});

type Tab = 'swap' | 'pools' | 'liquidity' | 'rewards' | 'earn';

export default function DexPage() {
  const [activeTab, setActiveTab] = useState<Tab>('swap');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'swap',
      label: 'Swap',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    },
    {
      id: 'pools',
      label: 'Pools',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'liquidity',
      label: 'Liquidity',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      id: 'rewards',
      label: 'Rewards',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'earn',
      label: 'Earn',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    }
  ];

  return (
    <>
      <Head>
        <title>Axiom DEX | Decentralized Exchange</title>
        <meta name="description" content="Trade tokens, provide liquidity, and earn rewards on Axiom DEX" />
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Axiom DEX</h1>
            <p className="text-gray-600 mt-1">Decentralized Exchange on Arbitrum</p>
          </div>
          <DexStats />

          <div className="mt-8 flex flex-col lg:flex-row gap-6">
            <nav className="lg:w-48 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <main className="flex-1">
              {activeTab === 'swap' && (
                <div className="space-y-6">
                  <TradingViewChart />
                  <div className="flex justify-center">
                    <SwapInterface />
                  </div>
                </div>
              )}
              {activeTab === 'pools' && <PoolList />}
              {activeTab === 'liquidity' && <LiquidityManager />}
              {activeTab === 'rewards' && <UserRewards />}
              {activeTab === 'earn' && (
                <div className="space-y-6">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Earn Yield on AXUSD</h2>
                    <p className="text-gray-600 text-sm mt-1">Deposit AXUSD to earn interest from borrowers via Euler Finance</p>
                  </div>
                  <EulerVaultCard variant="full" showCollateral={true} />
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h3 className="text-gray-900 font-semibold mb-3">How It Works</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-sm font-bold">1</div>
                        <div>
                          <p className="text-gray-900 text-sm">Deposit AXUSD into the Euler vault</p>
                          <p className="text-gray-500 text-xs">Your AXUSD is pooled with other lenders</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-sm font-bold">2</div>
                        <div>
                          <p className="text-gray-900 text-sm">Borrowers use collateral to borrow AXUSD</p>
                          <p className="text-gray-500 text-xs">Collateral: USDC, USDT, WETH, ARB vault shares</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-sm font-bold">3</div>
                        <div>
                          <p className="text-gray-900 text-sm">Earn interest from borrowers</p>
                          <p className="text-gray-500 text-xs">Interest accrues automatically to your position</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <a href="/earn" className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 text-center rounded-xl font-medium transition-colors">
                      View All Yield Opportunities
                    </a>
                    <a href="/borrow" className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 text-center rounded-xl font-medium transition-colors">
                      Borrow AXUSD
                    </a>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>

      </div>
    </>
  );
}
