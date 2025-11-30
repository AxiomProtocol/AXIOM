import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { ALL_CONTRACTS } from '../shared/contracts';

interface BankingProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  apy?: string;
  minimumBalance?: string;
  fees: string;
  features: string[];
  status: 'active' | 'coming-soon';
  icon: string;
  riskLevel: 'low' | 'medium' | 'high';
}

const AxiomBankingPage: React.FC = () => {
  const { isConnected, account } = useWallet();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const bankingProducts: BankingProduct[] = [
    // Deposit Accounts (6 products)
    {
      id: 'checking-standard',
      name: 'Standard Checking Account',
      category: 'deposit',
      description: 'Basic checking account with instant AXM transfers and no monthly fees',
      apy: '0.5%',
      minimumBalance: '100 AXM',
      fees: 'No monthly fees',
      features: ['Instant transfers', 'Mobile banking', 'Bill pay', 'Direct deposit'],
      status: 'active',
      icon: '💳',
      riskLevel: 'low'
    },
    {
      id: 'checking-premium',
      name: 'Premium Checking Account',
      category: 'deposit',
      description: 'High-yield checking with governance rewards and priority support',
      apy: '2.5%',
      minimumBalance: '5,000 AXM',
      fees: '$10/month (waived with balance)',
      features: ['Higher APY', 'Governance voting', 'Priority support', 'Fee rebates'],
      status: 'active',
      icon: '👑',
      riskLevel: 'low'
    },
    {
      id: 'savings-standard',
      name: 'High-Yield Savings Account',
      category: 'deposit',
      description: 'Earn competitive interest on AXM deposits with daily compounding',
      apy: '5.0%',
      minimumBalance: '500 AXM',
      fees: 'No fees',
      features: ['Daily compounding', 'Unlimited deposits', '6 withdrawals/month', 'FDIC-style insurance'],
      status: 'active',
      icon: '🏦',
      riskLevel: 'low'
    },
    {
      id: 'money-market',
      name: 'Money Market Account',
      category: 'deposit',
      description: 'Higher yields with check-writing privileges and debit card access',
      apy: '6.5%',
      minimumBalance: '10,000 AXM',
      fees: '$15/month (waived)',
      features: ['Premium APY', 'Check writing', 'Tiered interest rates', 'Debit card'],
      status: 'active',
      icon: '📊',
      riskLevel: 'low'
    },
    {
      id: 'cd-1year',
      name: '1-Year Certificate of Deposit',
      category: 'deposit',
      description: 'Lock in guaranteed returns for 12 months',
      apy: '7.5%',
      minimumBalance: '1,000 AXM',
      fees: 'Early withdrawal penalty',
      features: ['Guaranteed rate', 'Auto-renewal', 'Compound interest', 'Collateral eligible'],
      status: 'active',
      icon: '📜',
      riskLevel: 'low'
    },
    {
      id: 'cd-5year',
      name: '5-Year Certificate of Deposit',
      category: 'deposit',
      description: 'Maximum yields for long-term savers',
      apy: '10.0%',
      minimumBalance: '5,000 AXM',
      fees: 'Early withdrawal penalty',
      features: ['Highest APY', 'Rate ladder options', 'Quarterly compounding', 'Insurance backed'],
      status: 'active',
      icon: '🏅',
      riskLevel: 'low'
    },

    // Credit & Lending (8 products)
    {
      id: 'personal-loan',
      name: 'Personal Loan',
      category: 'lending',
      description: 'Unsecured personal loans up to 50,000 AXM for any purpose',
      apy: '8.5%',
      minimumBalance: 'N/A',
      fees: 'No origination fee',
      features: ['Up to 50K AXM', 'Fixed rates', 'No collateral', 'Instant approval'],
      status: 'active',
      icon: '💰',
      riskLevel: 'medium'
    },
    {
      id: 'credit-card',
      name: 'Axiom Rewards Credit Card',
      category: 'lending',
      description: 'Crypto-backed credit card earning 3% AXM cashback on all purchases',
      apy: '15.9% APR',
      minimumBalance: 'N/A',
      fees: 'No annual fee',
      features: ['3% AXM cashback', 'No foreign transaction fees', 'Crypto rewards', 'Virtual cards'],
      status: 'active',
      icon: '💎',
      riskLevel: 'medium'
    },
    {
      id: 'home-mortgage',
      name: 'Smart City Home Mortgage',
      category: 'lending',
      description: 'Tokenized mortgages for Axiom Smart City properties',
      apy: '4.5%',
      minimumBalance: 'N/A',
      fees: '1% origination',
      features: ['Tokenized title', 'Up to 30 years', 'Low rates', 'On-chain settlement'],
      status: 'active',
      icon: '🏠',
      riskLevel: 'low'
    },
    {
      id: 'business-loan',
      name: 'Small Business Loan',
      category: 'lending',
      description: 'Funding for Axiom-based businesses with blockchain verification',
      apy: '6.5%',
      minimumBalance: 'N/A',
      fees: '$250 processing',
      features: ['Up to 500K AXM', 'Revenue-based repayment', 'Quick approval', 'No collateral <25K'],
      status: 'active',
      icon: '🏢',
      riskLevel: 'medium'
    },
    {
      id: 'auto-loan',
      name: 'Vehicle Financing',
      category: 'lending',
      description: 'New and used vehicle loans with competitive rates',
      apy: '5.5%',
      minimumBalance: 'N/A',
      fees: 'No fees',
      features: ['Up to 100K AXM', 'Up to 7 years', 'Pre-approval', 'Refinance options'],
      status: 'active',
      icon: '🚗',
      riskLevel: 'low'
    },
    {
      id: 'heloc',
      name: 'Home Equity Line of Credit',
      category: 'lending',
      description: 'Revolving credit line secured by your tokenized property',
      apy: '6.0%',
      minimumBalance: 'N/A',
      fees: '$0 annual fee',
      features: ['Up to 85% LTV', 'Variable rate', 'Draw period', 'Smart contract secured'],
      status: 'active',
      icon: '🔑',
      riskLevel: 'medium'
    },
    {
      id: 'student-loan',
      name: 'Education Loan',
      category: 'lending',
      description: 'Student loans for Axiom Academy and external education',
      apy: '4.0%',
      minimumBalance: 'N/A',
      fees: 'No fees',
      features: ['Deferred repayment', 'Income-based plans', 'Axiom Academy credits', 'No cosigner needed'],
      status: 'active',
      icon: '🎓',
      riskLevel: 'low'
    },
    {
      id: 'crypto-backed-loan',
      name: 'Crypto-Backed Loan',
      category: 'lending',
      description: 'Instant liquidity using AXM, ETH, or BTC as collateral',
      apy: '3.5%',
      minimumBalance: 'N/A',
      fees: 'No fees',
      features: ['50-70% LTV', 'Keep crypto upside', 'Instant funding', 'Flexible terms'],
      status: 'active',
      icon: '🔐',
      riskLevel: 'high'
    },

    // Payment Services (5 products)
    {
      id: 'wire-transfer',
      name: 'Domestic Wire Transfer',
      category: 'payments',
      description: 'Same-day wire transfers to any US bank',
      fees: '$10 per transfer',
      features: ['Same-day', 'Up to $1M', 'Secure', 'Tracking'],
      status: 'active',
      icon: '💸',
      riskLevel: 'low'
    },
    {
      id: 'international-wire',
      name: 'International Wire Transfer',
      category: 'payments',
      description: 'Cross-border payments via blockchain settlement',
      fees: '$25 per transfer',
      features: ['1-2 day settlement', 'Low forex fees', 'Multi-currency', 'Compliance built-in'],
      status: 'active',
      icon: '🌍',
      riskLevel: 'low'
    },
    {
      id: 'ach-transfer',
      name: 'ACH Transfer',
      category: 'payments',
      description: 'Free ACH transfers between banks',
      fees: 'Free',
      features: ['2-3 business days', 'Unlimited', 'Recurring payments', 'Direct deposit'],
      status: 'active',
      icon: '🔄',
      riskLevel: 'low'
    },
    {
      id: 'instant-pay',
      name: 'Instant Pay (P2P)',
      category: 'payments',
      description: 'Send AXM instantly to anyone with a wallet address or phone number',
      fees: 'Free',
      features: ['Instant settlement', 'QR codes', 'Request money', 'Split bills'],
      status: 'active',
      icon: '⚡',
      riskLevel: 'low'
    },
    {
      id: 'merchant-services',
      name: 'Merchant Payment Processing',
      category: 'payments',
      description: 'Accept AXM and fiat payments at your business',
      fees: '1.5% + $0.10',
      features: ['POS integration', 'Online checkout', 'Instant settlement', 'Fraud protection'],
      status: 'active',
      icon: '🛒',
      riskLevel: 'low'
    },

    // Investment Products (6 products)
    {
      id: 'brokerage',
      name: 'Self-Directed Brokerage',
      category: 'investments',
      description: 'Trade tokenized stocks, bonds, and ETFs on-chain',
      fees: '$0 commissions',
      features: ['Zero commissions', 'Fractional shares', 'Extended hours', 'Research tools'],
      status: 'active',
      icon: '📈',
      riskLevel: 'high'
    },
    {
      id: 'robo-advisor',
      name: 'Automated Portfolio Management',
      category: 'investments',
      description: 'AI-driven portfolio management tailored to your risk profile',
      fees: '0.25% annually',
      features: ['Auto-rebalancing', 'Tax optimization', 'ESG options', 'Retirement planning'],
      status: 'active',
      icon: '🤖',
      riskLevel: 'medium'
    },
    {
      id: 'retirement-ira',
      name: 'Crypto IRA',
      category: 'investments',
      description: 'Tax-advantaged retirement accounts holding AXM and crypto',
      fees: '$50/year',
      features: ['Traditional & Roth', 'Self-custody', 'Tax benefits', 'Estate planning'],
      status: 'active',
      icon: '🏖️',
      riskLevel: 'medium'
    },
    {
      id: 'mutual-funds',
      name: 'Axiom Index Funds',
      category: 'investments',
      description: 'Low-cost index funds tracking smart city economy',
      apy: '8-12%',
      fees: '0.05% expense ratio',
      features: ['Diversified', 'Low fees', 'Auto-invest', 'Dividend reinvestment'],
      status: 'active',
      icon: '📊',
      riskLevel: 'medium'
    },
    {
      id: 'wealth-management',
      name: 'Private Wealth Management',
      category: 'investments',
      description: 'Dedicated advisor for accounts over $500K AXM',
      minimumBalance: '500,000 AXM',
      fees: '0.75% annually',
      features: ['Personal advisor', 'Custom strategies', 'Estate planning', 'Tax services'],
      status: 'active',
      icon: '💼',
      riskLevel: 'medium'
    },
    {
      id: 'trust-services',
      name: 'Trust & Estate Services',
      category: 'investments',
      description: 'Smart contract-based trusts for generational wealth',
      fees: 'Custom pricing',
      features: ['Revocable trusts', 'Living trusts', 'On-chain settlement', 'Multi-sig control'],
      status: 'active',
      icon: '🏛️',
      riskLevel: 'low'
    },

    // Tokenized Assets (4 products)
    {
      id: 'real-estate-tokens',
      name: 'Fractional Real Estate',
      category: 'tokenized',
      description: 'Own fractions of Axiom Smart City properties',
      apy: '6-9% rental yield',
      minimumBalance: '100 AXM',
      fees: '2% acquisition',
      features: ['Fractional ownership', 'Monthly dividends', 'Liquid market', 'Professional management'],
      status: 'active',
      icon: '🏘️',
      riskLevel: 'medium'
    },
    {
      id: 'business-equity',
      name: 'Tokenized Business Equity',
      category: 'tokenized',
      description: 'Invest in local Axiom businesses via equity tokens',
      apy: 'Variable',
      minimumBalance: '1,000 AXM',
      fees: '3% platform fee',
      features: ['Direct equity', 'Voting rights', 'Profit sharing', 'Secondary market'],
      status: 'active',
      icon: '🏪',
      riskLevel: 'high'
    },
    {
      id: 'infrastructure-bonds',
      name: 'Smart City Infrastructure Bonds',
      category: 'tokenized',
      description: 'Municipal bonds funding Axiom infrastructure projects',
      apy: '4.5%',
      minimumBalance: '5,000 AXM',
      fees: 'No fees',
      features: ['Tax-free income', 'Government backed', 'Fixed income', 'Transferable'],
      status: 'active',
      icon: '🌉',
      riskLevel: 'low'
    },
    {
      id: 'renewable-energy',
      name: 'Green Energy Credits',
      category: 'tokenized',
      description: 'Invest in solar panels and renewable infrastructure',
      apy: '5-7%',
      minimumBalance: '500 AXM',
      fees: '1% management',
      features: ['Sustainability rewards', 'Energy credits', 'Carbon offsets', 'ESG certified'],
      status: 'active',
      icon: '☀️',
      riskLevel: 'medium'
    },

    // Business Banking (3 products)
    {
      id: 'business-checking',
      name: 'Business Checking Account',
      category: 'business',
      description: 'Feature-rich business checking with unlimited transactions',
      fees: '$15/month',
      features: ['Unlimited transactions', 'Multi-user access', 'Payroll integration', 'Cash management'],
      status: 'active',
      icon: '🏦',
      riskLevel: 'low'
    },
    {
      id: 'merchant-cash-advance',
      name: 'Merchant Cash Advance',
      category: 'business',
      description: 'Fast working capital based on future revenue',
      fees: 'Factor rate 1.2-1.4',
      features: ['Quick funding', 'No collateral', 'Flexible repayment', 'Revenue-based'],
      status: 'active',
      icon: '💵',
      riskLevel: 'high'
    },
    {
      id: 'treasury-management',
      name: 'Treasury Management',
      category: 'business',
      description: 'Enterprise cash management and liquidity solutions',
      minimumBalance: '100,000 AXM',
      fees: 'Custom pricing',
      features: ['Cash pooling', 'Liquidity management', 'Yield optimization', 'Multi-currency'],
      status: 'active',
      icon: '💎',
      riskLevel: 'low'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Products', count: bankingProducts.length, icon: '🏛️', color: 'from-gray-600 to-gray-700' },
    { id: 'deposit', name: 'Deposit Accounts', count: 6, icon: '🏦', color: 'from-blue-600 to-blue-700' },
    { id: 'lending', name: 'Credit & Lending', count: 8, icon: '💰', color: 'from-green-600 to-green-700' },
    { id: 'payments', name: 'Payment Services', count: 5, icon: '💸', color: 'from-purple-600 to-purple-700' },
    { id: 'investments', name: 'Investment Products', count: 6, icon: '📈', color: 'from-yellow-600 to-yellow-700' },
    { id: 'tokenized', name: 'Tokenized Assets', count: 4, icon: '🏘️', color: 'from-pink-600 to-pink-700' },
    { id: 'business', name: 'Business Banking', count: 3, icon: '🏢', color: 'from-indigo-600 to-indigo-700' }
  ];

  const filteredProducts = bankingProducts.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getRiskBadgeColor = (risk: string) => {
    switch(risk) {
      case 'low': return 'bg-green-500/20 text-green-300';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300';
      case 'high': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-yellow-500/20 border border-yellow-400 rounded-full px-4 py-1 mb-4">
            <span className="text-yellow-400 text-sm font-semibold">🏦 AXIOM NATIONAL BANK</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
              National Bank
            </span>
            {' '}of Axiom
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            America's first fully on-chain sovereign banking system. Over 30 financial products 
            powered by blockchain technology and smart contracts.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
            <div className="text-4xl font-bold text-yellow-400">32</div>
            <div className="text-gray-300 mt-2">Banking Products</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
            <div className="text-4xl font-bold text-green-400">$0</div>
            <div className="text-gray-300 mt-2">Hidden Fees</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
            <div className="text-4xl font-bold text-blue-400">24/7</div>
            <div className="text-gray-300 mt-2">Blockchain Banking</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
            <div className="text-4xl font-bold text-purple-400">100%</div>
            <div className="text-gray-300 mt-2">Transparent</div>
          </div>
        </div>

        {/* Banking Navigation Menu */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Explore Banking Services
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Link
              to="/banking/personal"
              className="bg-gradient-to-br from-blue-600/30 to-blue-700/30 border border-blue-500/50 rounded-xl p-4 hover:scale-105 transition-all hover:border-blue-400 text-center group"
            >
              <div className="text-3xl mb-2">👤</div>
              <div className="text-sm font-semibold text-white group-hover:text-blue-300">Personal Banking</div>
            </Link>

            <Link
              to="/banking/business"
              className="bg-gradient-to-br from-indigo-600/30 to-indigo-700/30 border border-indigo-500/50 rounded-xl p-4 hover:scale-105 transition-all hover:border-indigo-400 text-center group"
            >
              <div className="text-3xl mb-2">🏢</div>
              <div className="text-sm font-semibold text-white group-hover:text-indigo-300">Business Banking</div>
            </Link>

            <Link
              to="/banking/mortgage"
              className="bg-gradient-to-br from-green-600/30 to-green-700/30 border border-green-500/50 rounded-xl p-4 hover:scale-105 transition-all hover:border-green-400 text-center group"
            >
              <div className="text-3xl mb-2">🏡</div>
              <div className="text-sm font-semibold text-white group-hover:text-green-300">Mortgages & Loans</div>
            </Link>

            <Link
              to="/banking/investments"
              className="bg-gradient-to-br from-purple-600/30 to-purple-700/30 border border-purple-500/50 rounded-xl p-4 hover:scale-105 transition-all hover:border-purple-400 text-center group"
            >
              <div className="text-3xl mb-2">💎</div>
              <div className="text-sm font-semibold text-white group-hover:text-purple-300">Investments</div>
            </Link>

            <Link
              to="/banking/rates"
              className="bg-gradient-to-br from-yellow-600/30 to-yellow-700/30 border border-yellow-500/50 rounded-xl p-4 hover:scale-105 transition-all hover:border-yellow-400 text-center group"
            >
              <div className="text-3xl mb-2">💵</div>
              <div className="text-sm font-semibold text-white group-hover:text-yellow-300">Rates & Fees</div>
            </Link>

            <Link
              to="/banking/about"
              className="bg-gradient-to-br from-orange-600/30 to-orange-700/30 border border-orange-500/50 rounded-xl p-4 hover:scale-105 transition-all hover:border-orange-400 text-center group"
            >
              <div className="text-3xl mb-2">🏛️</div>
              <div className="text-sm font-semibold text-white group-hover:text-orange-300">About Bank</div>
            </Link>

            <Link
              to="/banking/security"
              className="bg-gradient-to-br from-red-600/30 to-red-700/30 border border-red-500/50 rounded-xl p-4 hover:scale-105 transition-all hover:border-red-400 text-center group"
            >
              <div className="text-3xl mb-2">🔒</div>
              <div className="text-sm font-semibold text-white group-hover:text-red-300">Security</div>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="🔍 Search banking products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-6 py-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-all"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-3 rounded-xl font-semibold transition-all shadow-lg ${
                selectedCategory === cat.id
                  ? `bg-gradient-to-r ${cat.color} text-white scale-105`
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {cat.icon} {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-yellow-400/50 transition-all hover:scale-105">
              <div className="flex justify-between items-start mb-4">
                <div className="text-4xl">{product.icon}</div>
                <div className="flex flex-col gap-2">
                  {product.status === 'active' && (
                    <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                      Active
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskBadgeColor(product.riskLevel)}`}>
                    {product.riskLevel.toUpperCase()} RISK
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
              <p className="text-sm text-gray-300 mb-4">{product.description}</p>

              {product.apy && (
                <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3 mb-3">
                  <div className="text-xs text-yellow-300">APY / Rate</div>
                  <div className="text-2xl font-bold text-yellow-400">{product.apy}</div>
                </div>
              )}

              <div className="space-y-2 mb-4 text-sm">
                {product.minimumBalance && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Minimum Balance:</span>
                    <span className="text-white font-semibold">{product.minimumBalance}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Fees:</span>
                  <span className="text-white font-semibold">{product.fees}</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 mb-4">
                <div className="text-xs text-gray-400 mb-2">Key Features:</div>
                <ul className="space-y-1">
                  {product.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="text-xs text-gray-300 flex items-center">
                      <span className="text-green-400 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  isConnected
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!isConnected}
              >
                {isConnected ? 'Open Account →' : 'Connect Wallet to Continue'}
              </button>
            </div>
          ))}
        </div>

        {/* Banking Infrastructure */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6">🏛️ Banking Infrastructure</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-3">Smart Contract Architecture</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>✓ <span className="font-semibold">Treasury Hub:</span> {ALL_CONTRACTS.TREASURY_REVENUE.substring(0, 10)}...</li>
                <li>✓ <span className="font-semibold">Identity/Compliance:</span> KYC/AML verification on-chain</li>
                <li>✓ <span className="font-semibold">Reputation Oracle:</span> Blockchain-native credit scoring</li>
                <li>✓ <span className="font-semibold">Asset Registry:</span> Tokenized property management</li>
              </ul>
            </div>
            <div className="bg-black/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-3">Security & Compliance</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>✓ <span className="font-semibold">Multi-Sig Treasury:</span> Community-governed funds</li>
                <li>✓ <span className="font-semibold">FDIC-Style Insurance:</span> Reserve-backed deposits</li>
                <li>✓ <span className="font-semibold">KYC/AML Compliance:</span> Regulatory compliant</li>
                <li>✓ <span className="font-semibold">Smart Contract Audits:</span> OpenZeppelin verified</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Why Axiom Banking */}
        <div className="bg-gradient-to-r from-yellow-900/20 to-blue-900/20 border border-yellow-500/30 rounded-xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Why Bank with Axiom?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-lg font-bold text-yellow-400 mb-2">True Ownership</h3>
              <p className="text-sm text-gray-300">
                Your funds. Your keys. Your control. Non-custodial banking on blockchain.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-lg font-bold text-yellow-400 mb-2">100% Transparent</h3>
              <p className="text-sm text-gray-300">
                Every transaction, fee, and interest payment visible on-chain. No hidden costs.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="text-lg font-bold text-yellow-400 mb-2">Instant Settlement</h3>
              <p className="text-sm text-gray-300">
                24/7 banking with instant transfers and real-time balance updates.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {!isConnected && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-blue-500/20 border border-yellow-400 rounded-xl p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-gray-300 mb-6">
              Connect your MetaMask wallet to access all 32 banking products on Arbitrum One
            </p>
            <button className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 px-8 rounded-xl text-lg transition-all hover:scale-105">
              Connect Wallet to Start Banking
            </button>
          </div>
        )}

        {/* Risk Disclosure */}
        <div className="mt-8 bg-red-900/20 border border-red-600/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">⚠️ Important Risk Disclosure</h3>
          <p className="text-sm text-gray-300 mb-3">
            Banking products offered through Axiom National Bank are powered by smart contracts on Arbitrum One blockchain. 
            While our infrastructure is audited and secured, blockchain-based banking carries inherent risks:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
            <li>Smart contract vulnerabilities may result in loss of funds</li>
            <li>Cryptocurrency values are volatile and may fluctuate significantly</li>
            <li>Products marked as "High Risk" involve speculative investments</li>
            <li>FDIC-style insurance is reserve-backed, not federally guaranteed</li>
            <li>Always conduct your own research before investing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AxiomBankingPage;
