import { useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';

const PERSONAL_PRODUCTS = [
  {
    id: 'checking-standard',
    name: 'Standard Checking Account',
    description: 'Your everyday banking solution with instant AXM transfers, mobile banking, and zero monthly fees. Perfect for daily transactions and bill payments.',
    apy: '0.5%',
    minimumBalance: '100 AXM',
    fees: 'No monthly fees',
    features: ['Instant AXM transfers', 'Mobile banking app', 'Bill pay integration', 'Direct deposit', 'Free debit card', 'ATM access worldwide'],
    icon: '💳',
    highlight: 'Most Popular'
  },
  {
    id: 'checking-premium',
    name: 'Premium Checking Account',
    description: 'Elevated banking experience with higher yields, governance voting rights, and priority customer support. Ideal for active AXM participants.',
    apy: '2.5%',
    minimumBalance: '5,000 AXM',
    fees: '$10/month (waived with 5K+ balance)',
    features: ['Higher APY on balances', 'Governance voting rights', 'Priority 24/7 support', 'Fee rebates on transfers', 'Premium debit card', 'Exclusive offers'],
    icon: '👑',
    highlight: 'Best Value'
  },
  {
    id: 'savings-standard',
    name: 'High-Yield Savings Account',
    description: 'Grow your savings with competitive interest rates and daily compounding. Your funds are protected with FDIC-style insurance backing.',
    apy: '5.0%',
    minimumBalance: '500 AXM',
    fees: 'No fees',
    features: ['Daily compounding interest', 'Unlimited deposits', '6 withdrawals per month', 'FDIC-style insurance', 'Auto-save features', 'Goal tracking'],
    icon: '🏦',
    highlight: 'High Yield'
  },
  {
    id: 'money-market',
    name: 'Money Market Account',
    description: 'Premium savings with check-writing privileges and debit card access. Enjoy tiered interest rates that grow with your balance.',
    apy: '6.5%',
    minimumBalance: '10,000 AXM',
    fees: '$15/month (waived with 10K+ balance)',
    features: ['Premium tiered APY', 'Check writing privileges', 'Debit card included', 'Unlimited deposits', 'Online bill pay', 'Mobile check deposit'],
    icon: '📊',
    highlight: 'Premium Tier'
  },
  {
    id: 'cd-1year',
    name: '1-Year Certificate of Deposit',
    description: 'Lock in guaranteed returns for 12 months with our competitive CD rates. Perfect for short-term savings goals with predictable growth.',
    apy: '7.5%',
    minimumBalance: '1,000 AXM',
    fees: 'Early withdrawal penalty applies',
    features: ['Guaranteed fixed rate', 'Auto-renewal option', 'Compound interest', 'Collateral eligible', 'Rate lock protection', 'Flexible terms'],
    icon: '📜'
  },
  {
    id: 'cd-5year',
    name: '5-Year Certificate of Deposit',
    description: 'Maximize your returns with our highest-yield CD. Ideal for long-term savers looking to lock in premium rates for extended periods.',
    apy: '10.0%',
    minimumBalance: '5,000 AXM',
    fees: 'Early withdrawal penalty applies',
    features: ['Highest APY available', 'Rate ladder options', 'Quarterly compounding', 'Insurance backed', 'Bump-up option', 'Legacy planning'],
    icon: '🏅',
    highlight: 'Best Rate'
  }
];

const CREDIT_PRODUCTS = [
  {
    id: 'credit-card',
    name: 'Axiom Rewards Credit Card',
    description: 'Earn 3% AXM cashback on every purchase with no annual fee. Your crypto rewards grow automatically in your connected wallet.',
    apr: '15.9% APR',
    fees: 'No annual fee',
    features: ['3% AXM cashback on all purchases', 'No foreign transaction fees', 'Crypto rewards auto-deposited', 'Virtual card numbers', 'Purchase protection', 'Travel insurance'],
    icon: '💎',
    highlight: 'Rewards'
  },
  {
    id: 'personal-loan',
    name: 'Personal Loan',
    description: 'Flexible unsecured loans up to 50,000 AXM for any purpose. No collateral required with instant approval for qualified borrowers.',
    apr: '8.5% APR',
    fees: 'No origination fee',
    features: ['Up to 50,000 AXM', 'Fixed interest rates', 'No collateral required', 'Instant approval', 'Flexible terms 1-5 years', 'No prepayment penalty'],
    icon: '💰'
  },
  {
    id: 'crypto-backed-loan',
    name: 'Crypto-Backed Loan',
    description: 'Get instant liquidity without selling your crypto. Use AXM, ETH, or BTC as collateral and keep your upside potential.',
    apr: '3.5% APR',
    fees: 'No fees',
    features: ['50-70% loan-to-value', 'Keep crypto upside', 'Instant funding', 'Flexible repayment', 'No credit check', 'Multiple collateral types'],
    icon: '🔐',
    highlight: 'Low Rate'
  }
];

export default function PersonalBankingPage() {
  const [activeTab, setActiveTab] = useState('accounts');

  return (
    <Layout>
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/bank" className="text-amber-600 hover:text-amber-700 text-sm">Bank</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">Personal Banking</span>
          </div>
          
          <div className="text-center">
            <div className="inline-block bg-blue-100 border border-blue-300 rounded-full px-6 py-2 mb-6">
              <span className="text-blue-700 font-semibold">👤 PERSONAL BANKING</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Personal Banking Solutions
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Banking designed for your life. From everyday checking to high-yield savings, 
              we offer the complete suite of personal financial products on-chain.
            </p>

            <div className="flex justify-center gap-4 mb-8">
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">Up to 10%</div>
                <div className="text-sm text-gray-500">APY on Savings</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-green-600">$0</div>
                <div className="text-sm text-gray-500">Monthly Fees</div>
              </div>
              <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-purple-600">24/7</div>
                <div className="text-sm text-gray-500">Digital Access</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'accounts' 
                ? 'text-amber-600 border-b-2 border-amber-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Deposit Accounts
          </button>
          <button
            onClick={() => setActiveTab('credit')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'credit' 
                ? 'text-amber-600 border-b-2 border-amber-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Credit & Loans
          </button>
        </div>

        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Deposit Accounts</h2>
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
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">{product.apy}</div>
                        <div className="text-xs text-gray-500">APY</div>
                      </div>
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
                    Open Account
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'credit' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Credit & Loans</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {CREDIT_PRODUCTS.map(product => (
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
                        <div className="text-xl font-bold text-amber-600">{product.apr}</div>
                        <div className="text-xs text-gray-500">Interest Rate</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{product.fees}</div>
                        <div className="text-xs text-gray-500">Fees</div>
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
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Open your first Axiom account in minutes. Connect your wallet and experience 
            the future of personal banking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-colors">
              Open an Account
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
