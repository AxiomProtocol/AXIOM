import { useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import StepProgressBanner from '../components/StepProgressBanner';

const BANKING_PRODUCTS = [
  { id: 'checking-standard', name: 'Standard Checking Account', category: 'deposit', description: 'Basic checking account with instant AXM transfers and no monthly fees', apy: '0.5%', minimumBalance: '100 AXM', fees: 'No monthly fees', features: ['Instant transfers', 'Mobile banking', 'Bill pay', 'Direct deposit'], icon: '💳', riskLevel: 'low' },
  { id: 'checking-premium', name: 'Premium Checking Account', category: 'deposit', description: 'High-yield checking with governance rewards and priority support', apy: '2.5%', minimumBalance: '5,000 AXM', fees: '$10/month (waived with balance)', features: ['Higher APY', 'Governance voting', 'Priority support', 'Fee rebates'], icon: '👑', riskLevel: 'low' },
  { id: 'savings-standard', name: 'High-Yield Savings Account', category: 'deposit', description: 'Earn competitive interest on AXM deposits with daily compounding', apy: '5.0%', minimumBalance: '500 AXM', fees: 'No fees', features: ['Daily compounding', 'Unlimited deposits', '6 withdrawals/month', 'FDIC-style insurance'], icon: '🏦', riskLevel: 'low' },
  { id: 'money-market', name: 'Money Market Account', category: 'deposit', description: 'Higher yields with check-writing privileges and debit card access', apy: '6.5%', minimumBalance: '10,000 AXM', fees: '$15/month (waived)', features: ['Premium APY', 'Check writing', 'Tiered interest rates', 'Debit card'], icon: '📊', riskLevel: 'low' },
  { id: 'cd-1year', name: '1-Year Certificate of Deposit', category: 'deposit', description: 'Lock in guaranteed returns for 12 months', apy: '7.5%', minimumBalance: '1,000 AXM', fees: 'Early withdrawal penalty', features: ['Guaranteed rate', 'Auto-renewal', 'Compound interest', 'Collateral eligible'], icon: '📜', riskLevel: 'low' },
  { id: 'cd-5year', name: '5-Year Certificate of Deposit', category: 'deposit', description: 'Maximum yields for long-term savers', apy: '10.0%', minimumBalance: '5,000 AXM', fees: 'Early withdrawal penalty', features: ['Highest APY', 'Rate ladder options', 'Quarterly compounding', 'Insurance backed'], icon: '🏅', riskLevel: 'low' },
  { id: 'personal-loan', name: 'Personal Loan', category: 'lending', description: 'Unsecured personal loans up to 50,000 AXM for any purpose', apy: '8.5%', fees: 'No origination fee', features: ['Up to 50K AXM', 'Fixed rates', 'No collateral', 'Instant approval'], icon: '💰', riskLevel: 'medium' },
  { id: 'credit-card', name: 'Axiom Rewards Credit Card', category: 'lending', description: 'Crypto-backed credit card earning 3% AXM cashback on all purchases', apy: '15.9% APR', fees: 'No annual fee', features: ['3% AXM cashback', 'No foreign fees', 'Crypto rewards', 'Virtual cards'], icon: '💎', riskLevel: 'medium' },
  { id: 'home-mortgage', name: 'Smart City Home Mortgage', category: 'lending', description: 'Tokenized mortgages for Axiom Smart City properties', apy: '4.5%', fees: '1% origination', features: ['Tokenized title', 'Up to 30 years', 'Low rates', 'On-chain settlement'], icon: '🏠', riskLevel: 'low' },
  { id: 'business-loan', name: 'Small Business Loan', category: 'lending', description: 'Funding for Axiom-based businesses with blockchain verification', apy: '6.5%', fees: '$250 processing', features: ['Up to 500K AXM', 'Revenue-based repayment', 'Quick approval', 'No collateral <25K'], icon: '🏢', riskLevel: 'medium' },
  { id: 'auto-loan', name: 'Vehicle Financing', category: 'lending', description: 'New and used vehicle loans with competitive rates', apy: '5.5%', fees: 'No fees', features: ['Up to 100K AXM', 'Up to 7 years', 'Pre-approval', 'Refinance options'], icon: '🚗', riskLevel: 'low' },
  { id: 'heloc', name: 'Home Equity Line of Credit', category: 'lending', description: 'Revolving credit line secured by your tokenized property', apy: '6.0%', fees: '$0 annual fee', features: ['Up to 85% LTV', 'Variable rate', 'Draw period', 'Smart contract secured'], icon: '🔑', riskLevel: 'medium' },
  { id: 'student-loan', name: 'Education Loan', category: 'lending', description: 'Student loans for Axiom Academy and external education', apy: '4.0%', fees: 'No fees', features: ['Deferred repayment', 'Income-based plans', 'Axiom Academy credits', 'No cosigner needed'], icon: '🎓', riskLevel: 'low' },
  { id: 'crypto-backed-loan', name: 'Crypto-Backed Loan', category: 'lending', description: 'Instant liquidity using AXM, ETH, or BTC as collateral', apy: '3.5%', fees: 'No fees', features: ['50-70% LTV', 'Keep crypto upside', 'Instant funding', 'Flexible terms'], icon: '🔐', riskLevel: 'high' },
  { id: 'wire-transfer', name: 'Domestic Wire Transfer', category: 'payments', description: 'Same-day wire transfers to any US bank', fees: '$10 per transfer', features: ['Same-day', 'Up to $1M', 'Secure', 'Tracking'], icon: '💸', riskLevel: 'low' },
  { id: 'international-wire', name: 'International Wire Transfer', category: 'payments', description: 'Cross-border payments via blockchain settlement', fees: '$25 per transfer', features: ['1-2 day settlement', 'Low forex fees', 'Multi-currency', 'Compliance built-in'], icon: '🌍', riskLevel: 'low' },
  { id: 'ach-transfer', name: 'ACH Transfer', category: 'payments', description: 'Free ACH transfers between banks', fees: 'Free', features: ['2-3 business days', 'Unlimited', 'Recurring payments', 'Direct deposit'], icon: '🔄', riskLevel: 'low' },
  { id: 'instant-pay', name: 'Instant Pay (P2P)', category: 'payments', description: 'Send AXM instantly to anyone with a wallet address or phone number', fees: 'Free', features: ['Instant settlement', 'QR codes', 'Request money', 'Split bills'], icon: '⚡', riskLevel: 'low' },
  { id: 'merchant-services', name: 'Merchant Payment Processing', category: 'payments', description: 'Accept AXM and fiat payments at your business', fees: '1.5% + $0.10', features: ['POS integration', 'Online checkout', 'Instant settlement', 'Fraud protection'], icon: '🛒', riskLevel: 'low' },
  { id: 'brokerage', name: 'Self-Directed Brokerage', category: 'investments', description: 'Trade tokenized stocks, bonds, and ETFs on-chain', fees: '$0 commissions', features: ['Zero commissions', 'Fractional shares', 'Extended hours', 'Research tools'], icon: '📈', riskLevel: 'high' },
  { id: 'robo-advisor', name: 'Automated Portfolio Management', category: 'investments', description: 'AI-driven portfolio management tailored to your risk profile', fees: '0.25% annually', features: ['Auto-rebalancing', 'Tax optimization', 'ESG options', 'Retirement planning'], icon: '🤖', riskLevel: 'medium' },
  { id: 'retirement-ira', name: 'Crypto IRA', category: 'investments', description: 'Tax-advantaged retirement accounts holding AXM and crypto', fees: '$50/year', features: ['Traditional & Roth', 'Self-custody', 'Tax benefits', 'Estate planning'], icon: '🏖️', riskLevel: 'medium' },
  { id: 'mutual-funds', name: 'Axiom Index Funds', category: 'investments', description: 'Low-cost index funds tracking smart city economy', apy: '8-12%', fees: '0.05% expense ratio', features: ['Diversified', 'Low fees', 'Auto-invest', 'Dividend reinvestment'], icon: '📊', riskLevel: 'medium' },
  { id: 'wealth-management', name: 'Private Wealth Management', category: 'investments', description: 'Dedicated advisor for accounts over $500K AXM', minimumBalance: '500,000 AXM', fees: '0.75% annually', features: ['Personal advisor', 'Custom strategies', 'Estate planning', 'Tax services'], icon: '💼', riskLevel: 'medium' },
  { id: 'trust-services', name: 'Trust & Estate Services', category: 'investments', description: 'Smart contract-based trusts for generational wealth', fees: 'Custom pricing', features: ['Revocable trusts', 'Living trusts', 'On-chain settlement', 'Multi-sig control'], icon: '🏛️', riskLevel: 'low' },
  { id: 'real-estate-tokens', name: 'Fractional Real Estate', category: 'tokenized', description: 'Own fractions of Axiom Smart City properties', apy: '6-9% rental yield', minimumBalance: '100 AXM', fees: '2% acquisition', features: ['Fractional ownership', 'Monthly dividends', 'Liquid market', 'Professional management'], icon: '🏘️', riskLevel: 'medium' },
  { id: 'business-equity', name: 'Tokenized Business Equity', category: 'tokenized', description: 'Invest in local Axiom businesses via equity tokens', apy: 'Variable', minimumBalance: '1,000 AXM', fees: '3% platform fee', features: ['Direct equity', 'Voting rights', 'Profit sharing', 'Secondary market'], icon: '🏪', riskLevel: 'high' },
  { id: 'infrastructure-bonds', name: 'Smart City Infrastructure Bonds', category: 'tokenized', description: 'Municipal bonds funding Axiom infrastructure projects', apy: '4.5%', minimumBalance: '5,000 AXM', fees: 'No fees', features: ['Tax-free income', 'Government backed', 'Fixed income', 'Transferable'], icon: '🌉', riskLevel: 'low' },
  { id: 'renewable-energy', name: 'Green Energy Credits', category: 'tokenized', description: 'Invest in solar panels and renewable infrastructure', apy: '5-7%', minimumBalance: '500 AXM', fees: '1% management', features: ['Sustainability rewards', 'Energy credits', 'Carbon offsets', 'ESG certified'], icon: '☀️', riskLevel: 'medium' },
  { id: 'business-checking', name: 'Business Checking Account', category: 'business', description: 'Feature-rich business checking with unlimited transactions', fees: '$15/month', features: ['Unlimited transactions', 'Multi-user access', 'Payroll integration', 'Cash management'], icon: '🏦', riskLevel: 'low' },
  { id: 'merchant-cash-advance', name: 'Merchant Cash Advance', category: 'business', description: 'Fast working capital based on future revenue', fees: 'Factor rate 1.2-1.4', features: ['Quick funding', 'No collateral', 'Flexible repayment', 'Revenue-based'], icon: '💵', riskLevel: 'high' },
  { id: 'treasury-management', name: 'Treasury Management', category: 'business', description: 'Enterprise cash management and liquidity solutions', minimumBalance: '100,000 AXM', fees: 'Custom pricing', features: ['Cash pooling', 'Liquidity management', 'Yield optimization', 'Multi-currency'], icon: '💎', riskLevel: 'low' },
];

const CATEGORIES = [
  { id: 'all', name: 'All Products', icon: '🏛️', color: 'gray' },
  { id: 'deposit', name: 'Deposit Accounts', icon: '🏦', color: 'blue' },
  { id: 'lending', name: 'Credit & Lending', icon: '💰', color: 'green' },
  { id: 'payments', name: 'Payment Services', icon: '💸', color: 'purple' },
  { id: 'investments', name: 'Investment Products', icon: '📈', color: 'amber' },
  { id: 'tokenized', name: 'Tokenized Assets', icon: '🏘️', color: 'pink' },
  { id: 'business', name: 'Business Banking', icon: '🏢', color: 'indigo' }
];

const CORE_VALUES = [
  { icon: '🌟', title: 'Transparency', description: '100% on-chain transactions with full audit trails' },
  { icon: '🤝', title: 'Community-First', description: 'Governed by AXM token holders, for the community' },
  { icon: '🔒', title: 'Security', description: 'Audited smart contracts and institutional-grade protection' },
  { icon: '🚀', title: 'Innovation', description: 'Building the future of community financial coordination' },
];

export default function BankPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = BANKING_PRODUCTS.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryCount = (categoryId) => {
    if (categoryId === 'all') return BANKING_PRODUCTS.length;
    return BANKING_PRODUCTS.filter(p => p.category === categoryId).length;
  };

  const getRiskBadgeColor = (risk) => {
    switch(risk) {
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Layout>
      <StepProgressBanner isAdvanced={true} />
      <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-block bg-amber-100 border border-amber-300 rounded-full px-6 py-2 mb-6">
            <span className="text-amber-700 font-semibold">🏛️ AXIOM NATIONAL BANK</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
              National Bank
            </span>
            <span className="text-gray-900"> of Axiom</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Community financial coordination tools powered by blockchain. Over 30 products 
            designed for transparency and accessibility on Arbitrum One.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="text-4xl font-bold text-amber-500">32</div>
              <div className="text-gray-600 text-sm mt-1">Banking Products</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="text-4xl font-bold text-green-500">$0</div>
              <div className="text-gray-600 text-sm mt-1">Hidden Fees</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="text-4xl font-bold text-blue-500">24/7</div>
              <div className="text-gray-600 text-sm mt-1">Blockchain Banking</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="text-4xl font-bold text-purple-500">100%</div>
              <div className="text-gray-600 text-sm mt-1">Transparent</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-8">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 leading-relaxed">
              To build transparent, community-governed financial coordination tools 
              that empower individuals, businesses, and communities. We provide accessible 
              financial services on blockchain so everyone can participate in building wealth.
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-8">
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
            <p className="text-gray-700 leading-relaxed">
              To demonstrate how blockchain technology can create community-governed 
              financial systems that prioritize transparency, accessibility, and 
              long-term wealth building for all members.
            </p>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Core Values</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {CORE_VALUES.map((value, i) => (
              <div key={i} className="text-center bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-5xl mb-4">{value.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Banking Services</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            <Link href="/bank/personal" className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center hover:shadow-md hover:border-blue-400 transition-all group">
              <div className="text-3xl mb-2">👤</div>
              <div className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Personal</div>
            </Link>
            <Link href="/bank/business" className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center hover:shadow-md hover:border-indigo-400 transition-all group">
              <div className="text-3xl mb-2">🏢</div>
              <div className="text-sm font-medium text-gray-700 group-hover:text-indigo-600">Business</div>
            </Link>
            <Link href="/bank/mortgage" className="bg-green-50 border border-green-200 rounded-xl p-4 text-center hover:shadow-md hover:border-green-400 transition-all group">
              <div className="text-3xl mb-2">🏡</div>
              <div className="text-sm font-medium text-gray-700 group-hover:text-green-600">Mortgages</div>
            </Link>
            <Link href="/bank/investments" className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center hover:shadow-md hover:border-purple-400 transition-all group">
              <div className="text-3xl mb-2">💎</div>
              <div className="text-sm font-medium text-gray-700 group-hover:text-purple-600">Investments</div>
            </Link>
            <Link href="/bank/rates" className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center hover:shadow-md hover:border-amber-400 transition-all group">
              <div className="text-3xl mb-2">💵</div>
              <div className="text-sm font-medium text-gray-700 group-hover:text-amber-600">Rates & Fees</div>
            </Link>
            <Link href="/bank/about" className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center hover:shadow-md hover:border-orange-400 transition-all group">
              <div className="text-3xl mb-2">🏛️</div>
              <div className="text-sm font-medium text-gray-700 group-hover:text-orange-600">About</div>
            </Link>
            <Link href="/security" className="bg-red-50 border border-red-200 rounded-xl p-4 text-center hover:shadow-md hover:border-red-400 transition-all group">
              <div className="text-3xl mb-2">🔒</div>
              <div className="text-sm font-medium text-gray-700 group-hover:text-red-600">Security</div>
            </Link>
          </div>

          <div className="mb-6">
            <input
              type="text"
              placeholder="Search banking products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                }`}
              >
                {cat.icon} {cat.name} ({getCategoryCount(cat.id)})
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg hover:border-amber-300 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-4xl">{product.icon}</div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskBadgeColor(product.riskLevel)}`}>
                    {product.riskLevel} risk
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                
                <div className="space-y-2 mb-4">
                  {product.apy && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">APY/APR</span>
                      <span className="font-semibold text-green-600">{product.apy}</span>
                    </div>
                  )}
                  {product.minimumBalance && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Minimum</span>
                      <span className="font-medium text-gray-900">{product.minimumBalance}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fees</span>
                    <span className="font-medium text-gray-900">{product.fees}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {product.features.slice(0, 3).map((feature, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {feature}
                    </span>
                  ))}
                  {product.features.length > 3 && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                      +{product.features.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Technology Infrastructure</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-4xl mb-4">⛓️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Blockchain Layer</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><strong>Current:</strong> Arbitrum One (L2)</li>
                <li><strong>Chain ID:</strong> 42161</li>
                <li><strong>Future:</strong> Universe Blockchain (L3)</li>
                <li><strong>Gas Token:</strong> AXM</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Security Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Multi-signature wallets</li>
                <li>Time-locked transactions</li>
                <li>Circuit breaker mechanisms</li>
                <li>Emergency pause functionality</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Contracts</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Treasury & Revenue Hub</li>
                <li>Identity & Compliance</li>
                <li>Asset Registry</li>
                <li>Staking & Governance</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Regulatory Framework</h2>
          
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-amber-600 mb-4">Legal Structure</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3">✓</span>
                    <span><strong>Axiom City DAO LLC</strong> - Delaware-registered limited liability company</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3">✓</span>
                    <span><strong>Community Governed</strong> - AXM token holders vote on major decisions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3">✓</span>
                    <span><strong>Decentralized Autonomous Organization</strong> - On-chain governance mechanisms</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold text-amber-600 mb-4">Compliance Standards</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3">✓</span>
                    <span><strong>KYC/AML</strong> - Know Your Customer and Anti-Money Laundering protocols</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3">✓</span>
                    <span><strong>Smart Contract Audits</strong> - Regular third-party security audits</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3">✓</span>
                    <span><strong>Reserve Requirements</strong> - FDIC-style reserve backing for deposits</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Bank with Axiom?</h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Experience the future of banking with transparent, on-chain financial services. 
            Connect your wallet to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/launchpad" 
              className="px-8 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors"
            >
              Join TGE Waitlist
            </Link>
            <Link 
              href="/tokenomics" 
              className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-gray-900 transition-colors"
            >
              Learn About AXM
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
