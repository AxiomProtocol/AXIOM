import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ALL_CONTRACTS } from '../shared/contracts';

const MortgageLendingPage: React.FC = () => {
  const { account, connectWallet } = useWallet();
  const [loanType, setLoanType] = useState<'purchase' | 'refinance'>('purchase');

  const mortgageProducts = [
    {
      id: 'smart-city-mortgage',
      name: 'Smart City Home Mortgage',
      icon: '🏡',
      rate: '4.5% APR',
      loanAmount: 'Up to 2M AXM',
      ltv: '95% LTV',
      features: [
        'Purchase or refinance',
        'Tokenized property ownership',
        'Up to 95% LTV available',
        'Fixed and adjustable rates',
        '15 or 30-year terms',
        'No PMI with 20% down',
        'Blockchain title registry',
        'Smart escrow automation'
      ],
      benefits: 'Traditional mortgage with blockchain verification and tokenized property rights',
      category: 'Residential'
    },
    {
      id: 'unique-properties',
      name: 'Unique Properties Financing',
      icon: '🏰',
      rate: '5.0% APR',
      loanAmount: 'Up to 5M AXM',
      features: [
        'Geodesic domes',
        'Converted commercial buildings',
        'Multi-family compounds',
        'Off-grid properties',
        'Historic buildings',
        'Agricultural estates',
        'Mixed-use developments',
        'Custom underwriting'
      ],
      benefits: 'Specialized financing for unconventional and unique properties',
      category: 'Specialty'
    },
    {
      id: 'land-loan',
      name: 'Land & Lot Financing',
      icon: '🌄',
      rate: '6.0% APR',
      loanAmount: 'Up to 1M AXM',
      ltv: '75% LTV',
      features: [
        'Raw land purchases',
        'Improved lots',
        'Agricultural land',
        'Recreational property',
        'Future development sites',
        'Up to 75% LTV',
        '10-20 year terms',
        'Interest-only options'
      ],
      benefits: 'Acquire land for development, farming, or investment',
      category: 'Land'
    },
    {
      id: 'investment-property',
      name: 'Investment Property Loan',
      icon: '🏢',
      rate: '5.5% APR',
      loanAmount: 'Up to 3M AXM',
      ltv: '80% LTV',
      features: [
        'Single or multi-family rentals',
        'Up to 80% LTV',
        'DSCR (Debt Service Coverage Ratio)',
        'No personal income verification',
        'Portfolio lending available',
        'Cash-out refinance options',
        'Tokenized rental income',
        'Automated rent collection'
      ],
      benefits: 'Build wealth through real estate investment with blockchain-verified income',
      category: 'Investment'
    },
    {
      id: 'heloc',
      name: 'Home Equity Line of Credit (HELOC)',
      icon: '💳',
      rate: '6.0% APR',
      loanAmount: 'Up to 500K AXM',
      ltv: '85% CLTV',
      features: [
        'Tap into home equity',
        'Up to 85% combined LTV',
        'Draw period: 10 years',
        'Repayment period: 20 years',
        'Interest-only draws available',
        'No closing costs',
        'Instant liquidity access',
        'Smart contract automation'
      ],
      benefits: 'Access your home equity for renovations, debt consolidation, or investments',
      category: 'Equity'
    },
    {
      id: 'refinance',
      name: 'Cash-Out Refinance',
      icon: '💰',
      rate: '4.75% APR',
      loanAmount: 'Up to 2M AXM',
      ltv: '80% LTV',
      features: [
        'Lower your interest rate',
        'Cash out up to 80% LTV',
        'Consolidate high-interest debt',
        'Fund home improvements',
        '15 or 30-year terms',
        'Streamlined approval',
        'Tokenize property equity',
        'No prepayment penalties'
      ],
      benefits: 'Refinance your mortgage and access cash for any purpose',
      category: 'Refinance'
    }
  ];

  const specialtyPrograms = [
    {
      id: 'self-employed',
      name: 'Self-Employed Mortgage',
      icon: '💼',
      description: 'Alternative income verification using bank statements, 1099s, or crypto earnings',
      features: ['12-24 month bank statements', 'Crypto income accepted', 'No tax returns required']
    },
    {
      id: 'non-qm',
      name: 'Non-QM Loans',
      icon: '🔓',
      description: 'Flexible qualification for borrowers who don\'t fit traditional lending criteria',
      features: ['Credit-challenged borrowers', 'Foreign nationals', 'Asset depletion programs']
    },
    {
      id: 'crypto-backed',
      name: 'Crypto-Backed Mortgage',
      icon: '₿',
      description: 'Use cryptocurrency holdings as collateral without selling your assets',
      features: ['BTC, ETH, AXM accepted', 'Up to 50% LTV on crypto', 'Keep crypto exposure']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-900 via-emerald-900 to-teal-900 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="inline-block bg-yellow-500/20 border border-yellow-500/50 rounded-full px-4 py-2 mb-4">
            <span className="text-yellow-400 font-semibold">🏡 MORTGAGE & LENDING</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Home Financing
            </span>
            <span className="text-white"> Made Simple</span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl">
            Purchase your dream home, refinance for better rates, or invest in real estate 
            with blockchain-verified mortgages. From traditional homes to unique properties, 
            we have flexible financing solutions.
          </p>

          {/* Toggle: Purchase vs Refinance */}
          <div className="inline-flex bg-gray-800/50 rounded-lg p-1 mb-8">
            <button
              onClick={() => setLoanType('purchase')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                loanType === 'purchase'
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Purchase a Home
            </button>
            <button
              onClick={() => setLoanType('refinance')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                loanType === 'refinance'
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Refinance
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-400">4.5%</div>
              <div className="text-sm text-gray-300">Starting Rate</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-400">95%</div>
              <div className="text-sm text-gray-300">Max LTV</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-400">$5M</div>
              <div className="text-sm text-gray-300">Max Loan</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-400">48hrs</div>
              <div className="text-sm text-gray-300">Pre-Approval</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mortgage Products */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-8 text-center">
          Mortgage Products & Solutions
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {mortgageProducts.map((product) => (
            <div
              key={product.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 hover:border-yellow-500/50 transition-all hover:scale-105"
            >
              <div className="text-5xl mb-4">{product.icon}</div>
              
              <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
              
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1 inline-block mb-4">
                <span className="text-green-400 text-sm font-semibold">{product.category}</span>
              </div>

              <div className="space-y-2 mb-4 border-b border-gray-700 pb-4">
                {product.rate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Rate:</span>
                    <span className="text-green-400 font-bold text-lg">{product.rate}</span>
                  </div>
                )}
                {product.loanAmount && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Loan Amount:</span>
                    <span className="text-white font-semibold">{product.loanAmount}</span>
                  </div>
                )}
                {product.ltv && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Max LTV:</span>
                    <span className="text-blue-400 font-semibold">{product.ltv}</span>
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
                {account ? 'Apply Now' : 'Connect Wallet'}
              </button>
            </div>
          ))}
        </div>

        {/* Specialty Programs */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Specialty Mortgage Programs
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {specialtyPrograms.map((program) => (
              <div
                key={program.id}
                className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border border-blue-600/30 rounded-xl p-6"
              >
                <div className="text-4xl mb-4">{program.icon}</div>
                <h3 className="text-xl font-bold mb-2">{program.name}</h3>
                <p className="text-gray-300 text-sm mb-4">{program.description}</p>
                <ul className="space-y-2">
                  {program.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-400 flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose Axiom Mortgages */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-8 mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Why Choose Axiom for Your Mortgage?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">🔒</div>
              <div>
                <h3 className="text-lg font-bold mb-2">Blockchain-Verified Ownership</h3>
                <p className="text-gray-300 text-sm">
                  Your property title is recorded on Arbitrum One blockchain, providing 
                  immutable proof of ownership and transparent transaction history.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="text-3xl">⚡</div>
              <div>
                <h3 className="text-lg font-bold mb-2">Fast Approvals</h3>
                <p className="text-gray-300 text-sm">
                  Get pre-approved in 48 hours with our streamlined process. Close in as 
                  little as 21 days with automated smart contract escrow.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="text-3xl">🌟</div>
              <div>
                <h3 className="text-lg font-bold mb-2">Flexible Qualification</h3>
                <p className="text-gray-300 text-sm">
                  Self-employed? Crypto income? Non-traditional credit? We have specialty 
                  programs for borrowers who don't fit the traditional mold.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="text-3xl">💰</div>
              <div>
                <h3 className="text-lg font-bold mb-2">Competitive Rates</h3>
                <p className="text-gray-300 text-sm">
                  Starting at 4.5% APR with transparent pricing. No hidden fees, no surprises, 
                  just honest lending backed by smart contracts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Buy or Refinance Your Home?
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Get pre-approved in minutes. Our mortgage specialists are standing by to help 
            you find the perfect financing solution.
          </p>
          <button
            onClick={() => !account && connectWallet()}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 px-8 rounded-xl text-lg transition-all hover:scale-105"
          >
            {account ? '🏡 Start Application' : '🔗 Connect Wallet to Apply'}
          </button>
        </div>

        {/* Smart Contract Info */}
        <div className="mt-8 bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">🔗 Powered by Smart Contracts</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Asset Registry:</span>
              <code className="ml-2 text-blue-400">{ALL_CONTRACTS.LAND_ASSET_REGISTRY.slice(0, 10)}...</code>
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

export default MortgageLendingPage;
