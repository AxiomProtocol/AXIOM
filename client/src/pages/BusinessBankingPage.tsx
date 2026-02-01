import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ALL_CONTRACTS } from '../shared/contracts';

const BusinessBankingPage: React.FC = () => {
  const { account, connectWallet } = useWallet();

  const businessProducts = [
    {
      id: 'business-checking',
      name: 'Business Checking Account',
      icon: '🏢',
      monthlyFee: '$15/month',
      minimumBalance: '1,000 AXM',
      features: [
        'Unlimited transactions',
        'No transaction fees',
        'Free online banking',
        'Mobile deposit capture',
        'Multi-user access',
        'Integration with QuickBooks',
        'Real-time blockchain settlement',
        'Automated accounting exports'
      ],
      benefits: 'Comprehensive business checking with unlimited transactions and professional tools',
      category: 'Deposit Accounts'
    },
    {
      id: 'business-savings',
      name: 'Business Savings Account',
      icon: '💼',
      apy: '4.5%',
      minimumBalance: '5,000 AXM',
      monthlyFee: '$0',
      features: [
        'Competitive 4.5% APY',
        'No monthly fees',
        'Daily compounding',
        'Sweep account options',
        '6 free withdrawals/month',
        'Reserve requirement flexibility',
        'Tiered interest rates',
        'FDIC-style reserve backing'
      ],
      benefits: 'Grow your business reserves with industry-leading rates',
      category: 'Deposit Accounts'
    },
    {
      id: 'small-business-loan',
      name: 'Small Business Loan',
      icon: '🚀',
      rate: '6.5% APR',
      loanAmount: 'Up to 500,000 AXM',
      term: '1-10 years',
      features: [
        'Competitive 6.5% APR',
        'Loans up to 500K AXM',
        'Flexible terms (1-10 years)',
        'Fast approval (2-5 days)',
        'No prepayment penalties',
        'Working capital or expansion',
        'Equipment financing available',
        'On-chain credit building'
      ],
      benefits: 'Fuel business growth with flexible financing and transparent terms',
      category: 'Lending'
    },
    {
      id: 'commercial-real-estate',
      name: 'Commercial Real Estate Loan',
      icon: '🏗️',
      rate: '5.5% APR',
      loanAmount: 'Up to 5M AXM',
      ltv: 'Up to 80% LTV',
      features: [
        'Purchase or refinance',
        'Up to 5M AXM financing',
        'Loan-to-value up to 80%',
        'Fixed and variable rates',
        'Terms up to 25 years',
        'Owner-occupied or investment',
        'Tokenized property options',
        'Blockchain title registry'
      ],
      benefits: 'Acquire commercial property with competitive rates and blockchain verification',
      category: 'Lending'
    },
    {
      id: 'merchant-services',
      name: 'Merchant Payment Processing',
      icon: '💳',
      processingRate: '1.5% + $0.10',
      monthlyFee: '$25/month',
      features: [
        'Accept all major cards',
        'Crypto payment gateway (BTC, ETH, AXM)',
        '1.5% + $0.10 per transaction',
        'Next-day settlement',
        'Virtual terminal',
        'Mobile card readers',
        'Fraud protection',
        'PCI compliance included'
      ],
      benefits: 'Accept payments anywhere with low fees and crypto integration',
      category: 'Payments'
    },
    {
      id: 'treasury-management',
      name: 'Treasury Management',
      icon: '🏦',
      minimumBalance: '100,000 AXM',
      pricing: 'Custom',
      features: [
        'Cash flow optimization',
        'Automated clearing house (ACH)',
        'Wire transfer services',
        'Positive pay protection',
        'Account reconciliation',
        'Multi-entity consolidation',
        'Real-time balance reporting',
        'Smart contract automation'
      ],
      benefits: 'Enterprise-grade cash management with blockchain automation',
      category: 'Treasury'
    },
    {
      id: 'merchant-cash-advance',
      name: 'Merchant Cash Advance',
      icon: '⚡',
      factorRate: '1.2 - 1.4',
      fundingSpeed: '24-48 hours',
      features: [
        'Fast funding (24-48 hours)',
        'Factor rate 1.2 - 1.4',
        'No fixed monthly payments',
        'Repay as you earn',
        'No collateral required',
        'Based on revenue history',
        'Flexible qualification',
        'Working capital boost'
      ],
      benefits: 'Quick access to capital based on your sales with flexible repayment',
      category: 'Lending'
    },
    {
      id: 'payroll-services',
      name: 'Payroll Services',
      icon: '👥',
      pricing: '$50/month + $5/employee',
      features: [
        'Automated payroll processing',
        'Direct deposit in AXM or USD',
        'Tax filing and compliance',
        'Employee self-service portal',
        'Time tracking integration',
        'Contractor payments',
        'Multi-state support',
        'Year-end W2/1099 generation'
      ],
      benefits: 'Streamline payroll with automated processing and compliance',
      category: 'Services'
    },
    {
      id: 'remote-deposit',
      name: 'Remote Deposit Capture',
      icon: '📸',
      monthlyFee: '$20/month',
      features: [
        'Deposit checks from anywhere',
        'Mobile and desktop apps',
        'Same-day credit available',
        'Automated fraud detection',
        'Check image storage',
        'Multi-location support',
        'Transaction limits customizable',
        'Real-time notifications'
      ],
      benefits: 'Deposit checks instantly from your office or anywhere with internet',
      category: 'Services'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-cyan-900 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="inline-block bg-yellow-500/20 border border-yellow-500/50 rounded-full px-4 py-2 mb-4">
            <span className="text-yellow-400 font-semibold">🏢 BUSINESS BANKING</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Business Banking
            </span>
            <span className="text-white"> Solutions</span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl">
            Power your business with blockchain-enabled commercial banking. 
            From checking accounts to enterprise treasury management, we provide 
            the tools you need to grow and scale with complete transparency.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-400">$5M</div>
              <div className="text-sm text-gray-300">Max Loan Amount</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-400">1.5%</div>
              <div className="text-sm text-gray-300">Payment Processing</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-400">24hrs</div>
              <div className="text-sm text-gray-300">Cash Advance</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-400">100%</div>
              <div className="text-sm text-gray-300">On-Chain</div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-8 text-center">
          Comprehensive Business Solutions
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businessProducts.map((product) => (
            <div
              key={product.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 hover:border-yellow-500/50 transition-all hover:scale-105"
            >
              <div className="text-5xl mb-4">{product.icon}</div>
              
              <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
              
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1 inline-block mb-4">
                <span className="text-blue-400 text-sm font-semibold">{product.category}</span>
              </div>

              {/* Pricing Info */}
              <div className="space-y-2 mb-4 border-b border-gray-700 pb-4">
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
                {product.monthlyFee && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Monthly Fee:</span>
                    <span className="text-white font-semibold">{product.monthlyFee}</span>
                  </div>
                )}
                {product.loanAmount && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Loan Amount:</span>
                    <span className="text-white font-semibold">{product.loanAmount}</span>
                  </div>
                )}
                {product.processingRate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Processing:</span>
                    <span className="text-white font-semibold">{product.processingRate}</span>
                  </div>
                )}
                {product.factorRate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Factor Rate:</span>
                    <span className="text-white font-semibold">{product.factorRate}</span>
                  </div>
                )}
                {product.pricing && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Pricing:</span>
                    <span className="text-white font-semibold">{product.pricing}</span>
                  </div>
                )}
              </div>

              {/* Features */}
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

        {/* Why Choose Axiom Business Banking */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border border-blue-600/30 rounded-xl p-6">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2">Fast Approvals</h3>
            <p className="text-gray-300">
              Get approved for business loans in 2-5 days, and access merchant cash advances in 24-48 hours.
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 border border-green-600/30 rounded-xl p-6">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-2">Secure & Transparent</h3>
            <p className="text-gray-300">
              All transactions recorded on Arbitrum One blockchain with full audit trails and smart contract security.
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border border-purple-600/30 rounded-xl p-6">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-bold mb-2">Dedicated Support</h3>
            <p className="text-gray-300">
              Work with experienced business banking specialists who understand blockchain and traditional finance.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Grow Your Business?
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Join businesses already banking with Axiom. From startups to enterprises, 
            we provide the financial infrastructure you need to succeed.
          </p>
          <button
            onClick={() => !account && connectWallet()}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 px-8 rounded-xl text-lg transition-all hover:scale-105"
          >
            {account ? '🏢 Explore Business Solutions' : '🔗 Connect Wallet to Start'}
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

export default BusinessBankingPage;
