import { useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { SwapInterface, PoolList, LiquidityManager, DexStats, UserRewards } from '../components/dex';
import WalletButton from '../components/web3/WalletButton';

const TradingViewChart = dynamic(() => import('../components/dex/TradingViewChart'), { 
  ssr: false,
  loading: () => (
    <div className="bg-gray-800 rounded-xl border border-gray-700 h-[500px] flex items-center justify-center">
      <div className="text-gray-400">Loading chart...</div>
    </div>
  )
});

type Tab = 'swap' | 'pools' | 'liquidity' | 'rewards';

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
    }
  ];

  return (
    <>
      <Head>
        <title>Axiom DEX | Decentralized Exchange</title>
        <meta name="description" content="Trade tokens, provide liquidity, and earn rewards on Axiom DEX" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                  <span className="text-gray-900 font-bold text-lg">A</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Axiom DEX</h1>
                  <p className="text-xs text-gray-400">Decentralized Exchange</p>
                </div>
              </div>
              <WalletButton />
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DexStats />

          <div className="mt-8 flex flex-col lg:flex-row gap-6">
            <nav className="lg:w-48 flex lg:flex-col gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
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
            </main>
          </div>
        </div>

        <footer className="mt-16 py-8 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full" />
                <span className="text-sm text-gray-400">Powered by Axiom Protocol</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <a href="https://arbiscan.io" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Arbitrum One
                </a>
                <a href="/docs" className="hover:text-white transition-colors">
                  Docs
                </a>
                <a href="/transparency" className="hover:text-white transition-colors">
                  Transparency
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
