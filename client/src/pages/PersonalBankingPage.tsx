import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ALL_CONTRACTS } from '../shared/contracts';

const PersonalBankingPage: React.FC = () => {
  const { account, connectWallet } = useWallet();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const depositProducts = [
    {
      id: 'checking-standard',
      name: 'Standard Checking Account',
      category: 'Deposit Accounts',
      apy: '0.5%',
      minimumDeposit: '100 AXM',
      monthlyFee: '$0',
      features: [
        'No monthly maintenance fees',
        'Free online & mobile banking',
        'Unlimited transactions',
        'Debit card with AXM rewards',
        'Direct deposit available'
      ],
      benefits: 'Perfect for everyday banking needs with full blockchain transparency',
      icon: '🏦'
    },
    {
      id: 'checking-premium',
      name: 'Premium Checking Account',
      category: 'Deposit Accounts',
      apy: '2.5%',
      minimumDeposit: '5,000 AXM',
      monthlyFee: '$0',
      features: [
        'Higher APY on balances',
        'Governance voting rights',
        'Priority customer support',
        'Enhanced rewards program',
        'Free wire transfers (2/month)'
      ],
      benefits: 'Earn while you spend, with governance participation and premium perks',
      icon: '💎'
    },
    {
      id: 'savings-high-yield',
      name: 'High-Yield Savings Account',
      category: 'Deposit Accounts',
      apy: '5.0%',
      minimumDeposit: '500 AXM',
      monthlyFee: '$0',
      features: [
        'Industry-leading 5% APY',
        'Compounded daily, paid monthly',
        'No balance caps',
        'Instant liquidity',
        '6 free withdrawals/month'
      ],
      benefits: 'Maximize your savings with competitive rates and full flexibility',
      icon: '💰'
    },
    {
      id: 'money-market',
      name: 'Money Market Account',
      category: 'Deposit Accounts',
      apy: '6.5%',
      minimumDeposit: '10,000 AXM',
      monthlyFee: '$0',
      features: [
        'Premium 6.5% APY',
        'Check writing privileges',
        'Tiered interest rates',
        'FDIC-style reserve backing',
        'Unlimited deposits'
      ],
      benefits: 'Higher yields for larger balances with checking account flexibility',
      icon: '📈'
    },
    {
      id: 'cd-1-year',
      name: '1-Year Certificate of Deposit',
      category: 'Deposit Accounts',
      apy: '7.5%',
      minimumDeposit: '1,000 AXM',
      monthlyFee: '$0',
      features: [
        'Guaranteed 7.5% APY',
        'Fixed rate for 12 months',
        'Early withdrawal penalty: 90 days interest',
        'Automatic renewal options',
        'Add funds during first 10 days'
      ],
      benefits: 'Secure your savings with guaranteed returns and predictable growth',
      icon: '🔒'
    },
    {
      id: 'cd-5-year',
      name: '5-Year Certificate of Deposit',
      category: 'Deposit Accounts',
      apy: '10.0%',
      minimumDeposit: '5,000 AXM',
      monthlyFee: '$0',
      features: [
        'Maximum 10% APY',
        'Locked rate for 5 years',
        'Compound interest options',
        'Ladder strategy compatible',
        'Early withdrawal: 180 days interest'
      ],
      benefits: 'Long-term savings with industry-leading rates for maximum wealth building',
      icon: '🏆'
    }
  ];

  const lendingProducts = [
    {
      id: 'personal-loan',
      name: 'Personal Loan',
      category: 'Credit & Lending',
      rate: '8.5% APR',
      loanAmount: 'Up to 50,000 AXM',
      term: '1-7 years',
      features: [
        'Unsecured personal loans',
        'Fixed interest rates',
        'No prepayment penalties',
        'Fast approval (24-48 hours)',
        'Flexible repayment terms'
      ],
      benefits: 'Fund any project with competitive rates and transparent terms',
      icon: '💳'
    },
    {
      id: 'credit-card',
      name: 'Axiom Rewards Credit Card',
      category: 'Credit & Lending',
      rate: '15.9% APR',
      loanAmount: 'Up to 25,000 AXM limit',
      rewards: '3% AXM cashback',
      features: [
        '3% cashback in AXM tokens',
        'No annual fee',
        '0% intro APR for 12 months',
        'Fraud protection',
        'Virtual card numbers'
      ],
      benefits: 'Earn AXM on every purchase while building credit on-chain',
      icon: '💎'
    },
    {
      id: 'education-loan',
      name: 'Education Loan',
      category: 'Credit & Lending',
      rate: '4.0% APR',
      loanAmount: 'Up to 100,000 AXM',
      term: '10-20 years',
      features: [
        'Lowest rates for education',
        'Deferred repayment options',
        'Grace period after graduation',
        'Covers tuition, housing, books',
        'Co-signer release available'
      ],
      benefits: 'Invest in your future with affordable student financing',
      icon: '🎓'
    },
    {
      id: 'crypto-backed-loan',
      name: 'Crypto-Backed Loan',
      category: 'Credit & Lending',
      rate: '3.5% APR',
      loanAmount: 'Up to 1M AXM',
      ltv: 'Up to 50% LTV',
      features: [
        'Instant liquidity on crypto holdings',
        'Keep your crypto exposure',
        'No credit check required',
        'Flexible collateral (BTC, ETH, AXM)',
        'Loan-to-value up to 50%'
      ],
      benefits: 'Unlock cash without selling your crypto assets',
      icon: '🔐'
    }
  ];

  const iraProducts = [
    {
      id: 'traditional-ira',
      name: 'Traditional IRA',
      category: 'Retirement Accounts',
      apy: '5.5%',
      contributionLimit: '$7,000/year',
      features: [
        'Tax-deductible contributions',
        'Tax-deferred growth',
        'Wide investment options',
        'No age limit for contributions',
        'Required Minimum Distributions at 73'
      ],
      benefits: 'Build retirement savings with immediate tax advantages',
      icon: '🏦'
    },
    {
      id: 'roth-ira',
      name: 'Roth IRA',
      category: 'Retirement Accounts',
      apy: '5.5%',
      contributionLimit: '$7,000/year',
      features: [
        'Tax-free withdrawals in retirement',
        'After-tax contributions',
        'No RMDs during lifetime',
        'Crypto and stock investments',
        'Early withdrawal flexibility'
      ],
      benefits: 'Tax-free growth and retirement withdrawals for long-term wealth',
      icon: '💰'
    },
    {
      id: 'crypto-ira',
      name: 'Crypto IRA',
      category: 'Retirement Accounts',
      apy: 'Variable',
      annualFee: '$50/year',
      features: [
        'Self-directed crypto investments',
        'Hold BTC, ETH, AXM, and 50+ coins',
        'Tax-advantaged crypto growth',
        'Secure cold storage',
        'Traditional or Roth options'
      ],
      benefits: 'Invest in cryptocurrency within a tax-advantaged retirement account',
      icon: '₿'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Products', count: depositProducts.length + lendingProducts.length + iraProducts.length },
    { id: 'deposits', name: 'Deposit Accounts', count: depositProducts.length },
    { id: 'lending', name: 'Credit & Lending', count: lendingProducts.length },
    { id: 'iras', name: 'Retirement Accounts', count: iraProducts.length }
  ];

  const getFilteredProducts = () => {
    let products: any[] = [];
    if (selectedCategory === 'all') {
      products = [...depositProducts, ...lendingProducts, ...iraProducts];
    } else if (selectedCategory === 'deposits') {
      products = depositProducts;
    } else if (selectedCategory === 'lending') {
      products = lendingProducts;
    } else if (selectedCategory === 'iras') {
      products = iraProducts;
    }
    return products;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="inline-block bg-yellow-500/20 border border-yellow-500/50 rounded-full px-4 py-2 mb-4">
            <span className="text-yellow-400 font-semibold">🏦 PERSONAL BANKING</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Personal Banking
            </span>
            <span className="text-white"> Solutions</span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl">
            Take control of your finances with blockchain-powered banking. 
            Earn industry-leading rates, build credit on-chain, and access 
            your money 24/7 with complete transparency.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-400">10%</div>
              <div className="text-sm text-gray-300">Max APY on CDs</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-400">$0</div>
              <div className="text-sm text-gray-300">Monthly Fees</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-400">24/7</div>
              <div className="text-sm text-gray-300">Banking Access</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-400">100%</div>
              <div className="text-sm text-gray-300">Transparent</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getFilteredProducts().map((product) => (
            <div
              key={product.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 hover:border-yellow-500/50 transition-all hover:scale-105"
            >
              <div className="text-4xl mb-4">{product.icon}</div>
              
              <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1 inline-block mb-4">
                <span className="text-yellow-400 text-sm font-semibold">{product.category}</span>
              </div>

              <div className="space-y-2 mb-4">
                {product.apy && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">APY:</span>
                    <span className="text-green-400 font-bold text-lg">{product.apy}</span>
                  </div>
                )}
                {product.rate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Rate:</span>
                    <span className="text-blue-400 font-bold text-lg">{product.rate}</span>
                  </div>
                )}
                {product.minimumDeposit && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Minimum:</span>
                    <span className="text-white font-semibold">{product.minimumDeposit}</span>
                  </div>
                )}
                {product.loanAmount && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Loan Amount:</span>
                    <span className="text-white font-semibold">{product.loanAmount}</span>
                  </div>
                )}
                {product.contributionLimit && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Annual Limit:</span>
                    <span className="text-white font-semibold">{product.contributionLimit}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Key Features:</h4>
                <ul className="space-y-1">
                  {product.features.slice(0, 3).map((feature: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-400 flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-sm text-gray-400 mb-4 italic">{product.benefits}</p>

              <button
                onClick={() => !account && connectWallet()}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-4 rounded-lg transition-all"
              >
                {account ? 'Open Account' : 'Connect Wallet'}
              </button>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Open your account in minutes. No paperwork, no waiting. 
            Connect your wallet and start earning with blockchain-powered banking.
          </p>
          <button
            onClick={() => !account && connectWallet()}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 px-8 rounded-xl text-lg transition-all hover:scale-105"
          >
            {account ? '🏦 View All Banking Products' : '🔗 Connect Wallet to Start'}
          </button>
        </div>

        {/* Smart Contract Info */}
        <div className="mt-8 bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">🔗 Powered by Smart Contracts</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Treasury Hub:</span>
              <code className="ml-2 text-blue-400">{ALL_CONTRACTS.TREASURY_REVENUE.slice(0, 10)}...</code>
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

export default PersonalBankingPage;
