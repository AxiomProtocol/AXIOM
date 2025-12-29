import { useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';

const PERSONAL_PRODUCTS = [
  {
    id: 'self-custody-wallet',
    name: 'Self-Custody Wallet',
    description: 'Your AXM tokens in your own wallet. You control your keys and your funds. Connect any Web3 wallet.',
    minimumBalance: 'None',
    fees: 'Network gas only',
    features: ['Full control', 'No intermediary', 'Instant transfers', 'Connect any wallet', 'Multi-chain support', 'Hardware wallet compatible'],
    icon: '🔐',
    highlight: 'Self-Custody'
  },
  {
    id: 'savings-circle',
    name: 'SUSU Savings Circle',
    description: 'Join a community rotating savings group. Pool funds with other members and take turns receiving payouts. Fully transparent on-chain.',
    minimumBalance: 'Varies by circle',
    fees: 'Protocol fee: 0.5%',
    features: ['Community-based savings', '2-50 members per circle', 'Configurable cycles', 'On-chain transparency', 'Smart contract custody', 'Automatic payouts'],
    icon: '🤝',
    highlight: 'Community'
  },
  {
    id: 'yield-vault',
    name: 'Yield Vault',
    description: 'Deposit AXM into smart contract vaults to earn protocol rewards. Withdraw anytime. Variable returns based on protocol activity.',
    minimumBalance: '100 AXM',
    fees: 'No deposit fees',
    features: ['Smart contract custody', 'Variable protocol rewards', 'Withdraw anytime', 'Auto-compound option', 'Transparent on-chain', 'Risk disclosure provided'],
    icon: '🏦',
    highlight: 'Yield'
  },
  {
    id: 'staking-pool',
    name: 'AXM Staking Pool',
    description: 'Stake AXM tokens to earn protocol rewards and participate in governance voting. Flexible unstaking available.',
    minimumBalance: '50 AXM',
    fees: 'No staking fees',
    features: ['Governance voting power', 'Protocol rewards', 'Flexible unstaking', 'Tiered rewards', 'Wealth Engine integration', 'On-chain transparency'],
    icon: '🏆',
    highlight: 'Governance'
  },
  {
    id: 'wealth-engine',
    name: 'Wealth Engine Lock',
    description: 'Lock AXM for 1-4 years to maximize voting power and protocol rewards. Longer locks earn higher multipliers.',
    minimumBalance: '100 AXM',
    fees: 'No lock fees',
    features: ['Boosted voting power', 'Enhanced protocol rewards', '1-4 year lock options', 'veAXM tokens', 'Fee share rewards', 'Governance influence'],
    icon: '💎',
    highlight: 'Max Rewards'
  }
];

const COLLATERAL_PRODUCTS = [
  {
    id: 'axm-collateral-vault',
    name: 'AXM Collateral Vault',
    description: 'Deposit AXM as collateral to access liquidity without selling. Variable rates based on protocol utilization.',
    rate: 'Variable',
    ltv: '50-70%',
    features: ['Keep AXM upside', 'Variable protocol rates', 'On-chain collateral', 'Liquidation protection', 'Transparent terms', 'No credit check'],
    icon: '💰'
  },
  {
    id: 'multi-asset-vault',
    name: 'Multi-Asset Collateral',
    description: 'Use AXM, ETH, or other supported tokens as collateral. Variable rates determined by protocol.',
    rate: 'Variable',
    ltv: '50-75%',
    features: ['Multiple collateral types', 'Variable rates', 'Smart contract custody', 'Liquidation warnings', 'On-chain settlement', 'Self-custody'],
    icon: '🔐',
    highlight: 'Flexible'
  }
];

export default function PersonalVaultsPage() {
  const [activeTab, setActiveTab] = useState('vaults');

  return (
    <Layout>
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/bank" className="text-amber-600 hover:text-amber-700 text-sm">Treasury</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">Personal Vaults</span>
          </div>
          
          <div className="text-center">
            <div className="inline-block bg-blue-100 border border-blue-300 rounded-full px-6 py-2 mb-6">
              <span className="text-blue-700 font-semibold">👤 PERSONAL VAULTS</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Personal DeFi Vaults
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Self-custody and DeFi tools for individuals. From savings circles to yield vaults, 
              all powered by transparent smart contracts. Not a bank.
            </p>

            <div className="flex justify-center gap-4 mb-8">
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">Variable</div>
                <div className="text-sm text-gray-500">Protocol Rewards</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-green-600">Self</div>
                <div className="text-sm text-gray-500">Custody First</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-purple-600">24/7</div>
                <div className="text-sm text-gray-500">On-Chain Access</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('vaults')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'vaults' 
                ? 'text-amber-600 border-b-2 border-amber-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Vaults & Savings
          </button>
          <button
            onClick={() => setActiveTab('collateral')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'collateral' 
                ? 'text-amber-600 border-b-2 border-amber-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Collateral Positions
          </button>
        </div>

        {activeTab === 'vaults' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Vaults & Savings Products</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {PERSONAL_PRODUCTS.map(product => (
                <div key={product.id} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-4xl">{product.icon}</div>
                    {product.highlight && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                        {product.highlight}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 mb-4">{product.description}</p>
                  
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{product.minimumBalance}</div>
                        <div className="text-xs text-gray-500">Minimum</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{product.fees}</div>
                        <div className="text-xs text-gray-500">Fees</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Features</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {product.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-green-500">✓</span>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    Learn More
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'collateral' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Collateral Positions</h2>
            <p className="text-gray-600 mb-6">Access liquidity by depositing crypto as collateral. All rates are variable and determined by protocol utilization. This is not a loan product.</p>
            <div className="grid md:grid-cols-2 gap-6">
              {COLLATERAL_PRODUCTS.map(product => (
                <div key={product.id} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg hover:border-green-300 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-4xl">{product.icon}</div>
                    {product.highlight && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        {product.highlight}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 mb-4">{product.description}</p>
                  
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between">
                      <div>
                        <div className="text-xl font-bold text-amber-600">{product.rate}</div>
                        <div className="text-xs text-gray-500">Protocol Rate</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{product.ltv}</div>
                        <div className="text-xs text-gray-500">LTV Ratio</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Features</h4>
                    <ul className="space-y-1">
                      {product.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-green-500">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <button className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                    Learn More
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Connect your wallet to explore DeFi vaults and savings options. 
            Self-custody by default. Not a bank.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-colors">
              Connect Wallet
            </button>
            <Link href="/bank" className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors">
              View All Products
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
