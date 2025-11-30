import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ALL_CONTRACTS } from '../shared/contracts';

const InvestmentServicesPage: React.FC = () => {
  const { account, connectWallet } = useWallet();

  const investmentProducts = [
    {
      id: 'self-directed-brokerage',
      name: 'Self-Directed Brokerage',
      icon: '📊',
      commission: '$0 commissions',
      minimumDeposit: '100 AXM',
      features: [
        'Zero-commission trading',
        'Tokenized stocks & ETFs',
        'Fractional shares available',
        'Real-time market data',
        'Advanced charting tools',
        'Mobile trading app',
        'Crypto & traditional assets',
        'Blockchain settlement'
      ],
      benefits: 'Trade stocks, ETFs, and crypto with zero fees and instant settlement',
      category: 'Brokerage'
    },
    {
      id: 'robo-advisor',
      name: 'Automated Portfolio Management',
      icon: '🤖',
      managementFee: '0.25% annually',
      minimumDeposit: '500 AXM',
      expectedReturn: '8-12% APY',
      features: [
        'AI-driven portfolio allocation',
        'Automatic rebalancing',
        'Tax-loss harvesting',
        'Goal-based investing',
        'Risk tolerance assessment',
        'Diversified asset mix',
        '0.25% management fee',
        'Smart contract execution'
      ],
      benefits: 'Let AI manage your portfolio with automated strategies and optimization',
      category: 'Managed'
    },
    {
      id: 'crypto-ira',
      name: 'Crypto IRA',
      icon: '₿',
      annualFee: '$50/year',
      contributionLimit: '$7,000/year',
      features: [
        'Tax-advantaged crypto investing',
        'Traditional or Roth options',
        'Hold 50+ cryptocurrencies',
        'BTC, ETH, AXM, and more',
        'Secure cold storage',
        'No trading fees',
        'Self-directed investing',
        'Annual contribution limit: $7K'
      ],
      benefits: 'Build retirement wealth with cryptocurrency in a tax-advantaged account',
      category: 'Retirement'
    },
    {
      id: 'index-funds',
      name: 'Axiom Index Funds',
      icon: '📈',
      expenseRatio: '0.05%',
      expectedReturn: '8-12% APY',
      features: [
        'Ultra-low 0.05% expense ratio',
        'Diversified market exposure',
        'AXM-denominated funds',
        'Rebalanced quarterly',
        'S&P 500 equivalent',
        'Global equity fund',
        'Bond index fund',
        'Passive income generation'
      ],
      benefits: 'Low-cost index investing with market-matching returns and minimal fees',
      category: 'Funds'
    },
    {
      id: 'wealth-management',
      name: 'Private Wealth Management',
      icon: '💎',
      managementFee: '0.75% annually',
      minimumInvestment: '500,000 AXM',
      features: [
        'Dedicated wealth advisor',
        'Custom portfolio strategy',
        'Tax planning & optimization',
        'Estate planning services',
        'Alternative investments',
        'Concierge banking services',
        'Quarterly portfolio reviews',
        'Family office capabilities'
      ],
      benefits: 'White-glove service for high-net-worth individuals with personalized strategies',
      category: 'Premium'
    },
    {
      id: 'trust-services',
      name: 'Trust & Estate Services',
      icon: '🏛️',
      setupFee: '$500 + 0.5% annually',
      features: [
        'Smart contract-based trusts',
        'Automated distribution rules',
        'Multi-generational planning',
        'Revocable and irrevocable trusts',
        'Asset protection strategies',
        'Charitable giving trusts',
        'Blockchain audit trail',
        'Legal compliance guaranteed'
      ],
      benefits: 'Protect and transfer wealth with programmable trusts and estate planning',
      category: 'Estate'
    }
  ];

  const tokenizedAssets = [
    {
      id: 'real-estate-tokens',
      name: 'Fractional Real Estate',
      icon: '🏠',
      rentalYield: '6-9%',
      minimumInvestment: '100 AXM',
      features: [
        'Own fractions of properties',
        'Rental income distributions',
        '6-9% annual yield',
        'Monthly dividend payments',
        'Liquid secondary market',
        'No property management hassle',
        'Diversify across properties',
        'Blockchain-verified ownership'
      ],
      benefits: 'Invest in real estate with just 100 AXM and earn passive rental income',
      category: 'Real Estate'
    },
    {
      id: 'business-equity',
      name: 'Tokenized Business Equity',
      icon: '🚀',
      returns: 'Variable',
      minimumInvestment: '1,000 AXM',
      features: [
        'Direct equity in local businesses',
        'Startup and growth-stage companies',
        'Profit-sharing agreements',
        'Voting rights in some offerings',
        'Secondary market trading',
        'Quarterly financial reports',
        'Smart contract dividends',
        'Due diligence transparency'
      ],
      benefits: 'Invest directly in Axiom Smart City businesses and share in their growth',
      category: 'Equity'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="inline-block bg-yellow-500/20 border border-yellow-500/50 rounded-full px-4 py-2 mb-4">
            <span className="text-yellow-400 font-semibold">💎 INVESTMENT SERVICES</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Wealth Management
            </span>
            <span className="text-white"> & Investments</span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl">
            Build and preserve wealth with blockchain-powered investment services. 
            From self-directed trading to private wealth management, we offer 
            comprehensive solutions for every investor.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-400">$0</div>
              <div className="text-sm text-gray-300">Trading Commissions</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-400">0.05%</div>
              <div className="text-sm text-gray-300">Index Fund Fee</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-400">8-12%</div>
              <div className="text-sm text-gray-300">Expected Returns</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-400">24/7</div>
              <div className="text-sm text-gray-300">Market Access</div>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Products */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-8 text-center">
          Investment Products & Services
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {investmentProducts.map((product) => (
            <div
              key={product.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 hover:border-yellow-500/50 transition-all hover:scale-105"
            >
              <div className="text-5xl mb-4">{product.icon}</div>
              
              <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
              
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-1 inline-block mb-4">
                <span className="text-purple-400 text-sm font-semibold">{product.category}</span>
              </div>

              <div className="space-y-2 mb-4 border-b border-gray-700 pb-4">
                {product.commission && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Commissions:</span>
                    <span className="text-green-400 font-bold">{product.commission}</span>
                  </div>
                )}
                {product.managementFee && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Management Fee:</span>
                    <span className="text-blue-400 font-bold">{product.managementFee}</span>
                  </div>
                )}
                {product.expenseRatio && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Expense Ratio:</span>
                    <span className="text-green-400 font-bold">{product.expenseRatio}</span>
                  </div>
                )}
                {product.annualFee && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Annual Fee:</span>
                    <span className="text-white font-semibold">{product.annualFee}</span>
                  </div>
                )}
                {product.expectedReturn && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Expected Return:</span>
                    <span className="text-yellow-400 font-bold">{product.expectedReturn}</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Key Features:</h4>
                <ul className="space-y-1">
                  {product.features.slice(0, 4).map((feature: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-400 flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-sm text-gray-400 mb-4 italic border-t border-gray-700 pt-4">
                {product.benefits}
              </p>

              <button
                onClick={() => !account && connectWallet()}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-4 rounded-lg transition-all"
              >
                {account ? 'Get Started' : 'Connect Wallet'}
              </button>
            </div>
          ))}
        </div>

        {/* Tokenized Assets */}
        <h2 className="text-3xl font-bold mb-8 text-center">
          Tokenized Asset Investments
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {tokenizedAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 hover:border-yellow-500/50 transition-all"
            >
              <div className="text-5xl mb-4">{asset.icon}</div>
              
              <h3 className="text-2xl font-bold text-white mb-2">{asset.name}</h3>
              
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1 inline-block mb-4">
                <span className="text-blue-400 text-sm font-semibold">{asset.category}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 border-b border-gray-700 pb-4">
                {asset.rentalYield && (
                  <div>
                    <span className="text-gray-400 text-sm">Rental Yield:</span>
                    <div className="text-green-400 font-bold text-lg">{asset.rentalYield}</div>
                  </div>
                )}
                {asset.returns && (
                  <div>
                    <span className="text-gray-400 text-sm">Returns:</span>
                    <div className="text-yellow-400 font-bold text-lg">{asset.returns}</div>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 text-sm">Minimum:</span>
                  <div className="text-white font-bold text-lg">{asset.minimumInvestment}</div>
                </div>
              </div>

              <ul className="space-y-2 mb-4">
                {asset.features.map((feature: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-400 flex items-start">
                    <span className="text-blue-400 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <p className="text-sm text-gray-300 mb-4 italic border-t border-gray-700 pt-4">
                {asset.benefits}
              </p>

              <button
                onClick={() => !account && connectWallet()}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-4 rounded-lg transition-all"
              >
                {account ? 'View Offerings' : 'Connect Wallet'}
              </button>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Start Building Wealth Today
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Whether you're a beginner or experienced investor, we have the tools 
            and services to help you achieve your financial goals.
          </p>
          <button
            onClick={() => !account && connectWallet()}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 px-8 rounded-xl text-lg transition-all hover:scale-105"
          >
            {account ? '💎 Explore Investments' : '🔗 Connect Wallet to Invest'}
          </button>
        </div>

        {/* Smart Contract Info */}
        <div className="mt-8 bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">🔗 Powered by Smart Contracts</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Markets Hub:</span>
              <code className="ml-2 text-blue-400">{ALL_CONTRACTS.MARKETS_RWA_HUB.slice(0, 10)}...</code>
            </div>
            <div>
              <span className="text-gray-400">Network:</span>
              <span className="ml-2 text-green-400">Arbitrum One (Chain ID: 42161)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentServicesPage;
