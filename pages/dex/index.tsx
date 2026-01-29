import Head from 'next/head';
import { useState } from 'react';
import Layout from '../../components/Layout';
import EulerVaultCard from '../../components/EulerVaultCard';

type TabType = 'swap' | 'pools' | 'earn';

export default function DexPage() {
  const [activeTab, setActiveTab] = useState<TabType>('swap');

  const tabs = [
    { id: 'swap' as TabType, label: 'Swap', icon: '🔄' },
    { id: 'pools' as TabType, label: 'Pools', icon: '💧' },
    { id: 'earn' as TabType, label: 'Earn', icon: '💰' }
  ];

  return (
    <Layout>
      <Head>
        <title>Axiom DEX | Trade & Earn</title>
        <meta name="description" content="Swap tokens, provide liquidity, and earn yield on Axiom DEX." />
      </Head>

      <div className="min-h-screen bg-black py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Axiom DEX</h1>
            <p className="text-gray-400">Trade, provide liquidity, and earn yield</p>
          </div>

          <div className="flex justify-center gap-2 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'swap' && (
            <div className="bg-gray-900 rounded-2xl p-6 max-w-md mx-auto">
              <h2 className="text-white text-xl font-semibold mb-6">Swap Tokens</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-xl p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400 text-sm">From</span>
                    <span className="text-gray-400 text-sm">Balance: 0.00</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder="0.0"
                      className="flex-1 bg-transparent text-white text-2xl outline-none"
                    />
                    <button className="px-4 py-2 bg-gray-700 rounded-lg text-white font-medium">
                      AXUSD
                    </button>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-700">
                    ↓
                  </button>
                </div>

                <div className="bg-gray-800 rounded-xl p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400 text-sm">To</span>
                    <span className="text-gray-400 text-sm">Balance: 0.00</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder="0.0"
                      className="flex-1 bg-transparent text-white text-2xl outline-none"
                      disabled
                    />
                    <button className="px-4 py-2 bg-gray-700 rounded-lg text-white font-medium">
                      USDC
                    </button>
                  </div>
                </div>

                <button className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-semibold transition-colors">
                  Connect Wallet
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pools' && (
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-white text-xl font-semibold mb-6">Liquidity Pools</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold">AX</div>
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">US</div>
                    </div>
                    <div>
                      <p className="text-white font-medium">AXUSD / USDC</p>
                      <p className="text-gray-400 text-sm">0.05% fee tier</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">5.2% APR</p>
                    <p className="text-gray-400 text-sm">TVL: $0</p>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold">AX</div>
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold">ET</div>
                    </div>
                    <div>
                      <p className="text-white font-medium">AXM / ETH</p>
                      <p className="text-gray-400 text-sm">0.3% fee tier</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">12.4% APR</p>
                    <p className="text-gray-400 text-sm">TVL: $0</p>
                  </div>
                </div>
              </div>

              <button className="w-full mt-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors">
                + Add Liquidity
              </button>
            </div>
          )}

          {activeTab === 'earn' && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-white text-xl font-semibold">Earn Yield on AXUSD</h2>
                <p className="text-gray-400 text-sm mt-1">Deposit AXUSD to earn interest from borrowers</p>
              </div>

              <EulerVaultCard variant="full" showCollateral={true} />

              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <h3 className="text-white font-semibold mb-3">How It Works</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-sm font-bold">1</div>
                    <div>
                      <p className="text-white text-sm">Deposit AXUSD into the Euler vault</p>
                      <p className="text-gray-400 text-xs">Your AXUSD is pooled with other lenders</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-sm font-bold">2</div>
                    <div>
                      <p className="text-white text-sm">Borrowers use collateral to borrow AXUSD</p>
                      <p className="text-gray-400 text-xs">Collateral: USDC, USDT, WETH, ARB vault shares</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-sm font-bold">3</div>
                    <div>
                      <p className="text-white text-sm">Earn interest from borrowers</p>
                      <p className="text-gray-400 text-xs">Interest accrues automatically to your position</p>
                    </div>
                  </div>
                </div>
              </div>

              <a 
                href="/earn"
                className="block w-full py-3 bg-gray-800 hover:bg-gray-700 text-white text-center rounded-xl font-medium transition-colors"
              >
                View All Yield Opportunities
              </a>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
