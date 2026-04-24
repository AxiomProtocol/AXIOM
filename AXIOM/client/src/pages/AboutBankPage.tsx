import React from 'react';
import { ALL_CONTRACTS } from '../shared/contracts';

const AboutBankPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-yellow-900 via-orange-900 to-red-900 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="inline-block bg-yellow-500/20 border border-yellow-500/50 rounded-full px-4 py-2 mb-4">
            <span className="text-yellow-400 font-semibold">🏛️ ABOUT THE BANK</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              About National Bank
            </span>
            <span className="text-white"> of Axiom</span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl">
            America's first fully on-chain sovereign banking system. Regulated, transparent, 
            and powered by blockchain technology to serve the Axiom Smart City economy.
          </p>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border border-blue-600/30 rounded-xl p-8">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              To establish the first sovereign digital-physical economy in America 
              through blockchain-powered banking infrastructure. We provide transparent, 
              accessible financial services that empower individuals, businesses, and 
              communities to participate in the future of finance.
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border border-purple-600/30 rounded-xl p-8">
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              To become the leading model for smart city banking worldwide, 
              demonstrating how blockchain technology can create sovereign, 
              community-governed financial systems that rival and surpass 
              traditional Wall Street institutions.
            </p>
          </div>
        </div>

        {/* Key Facts */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Bank Overview</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">2026</div>
              <div className="text-gray-300">Founding Year</div>
              <div className="text-sm text-gray-500 mt-2">January 1 TGE Launch</div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">32</div>
              <div className="text-gray-300">Banking Products</div>
              <div className="text-sm text-gray-500 mt-2">Full-Service Suite</div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">22</div>
              <div className="text-gray-300">Smart Contracts</div>
              <div className="text-sm text-gray-500 mt-2">Deployed on Arbitrum</div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">1,000</div>
              <div className="text-gray-300">Acres</div>
              <div className="text-sm text-gray-500 mt-2">Smart City Footprint</div>
            </div>
          </div>
        </div>

        {/* Regulatory Framework */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Regulatory Framework</h2>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4 text-yellow-400">Legal Structure</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-3">✓</span>
                    <span><strong>Axiom City DAO LLC</strong> - Delaware-registered limited liability company</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-3">✓</span>
                    <span><strong>Community Governed</strong> - AXM token holders vote on major decisions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-3">✓</span>
                    <span><strong>Decentralized Autonomous Organization</strong> - On-chain governance mechanisms</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 text-yellow-400">Compliance Standards</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-3">✓</span>
                    <span><strong>KYC/AML</strong> - Know Your Customer and Anti-Money Laundering protocols</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-3">✓</span>
                    <span><strong>Smart Contract Audits</strong> - Regular third-party security audits</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-3">✓</span>
                    <span><strong>Reserve Requirements</strong> - FDIC-style reserve backing for deposits</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Technology Infrastructure</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6">
              <div className="text-4xl mb-4">⛓️</div>
              <h3 className="text-xl font-bold mb-3 text-yellow-400">Blockchain Layer</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• <strong>Current:</strong> Arbitrum One (L2)</li>
                <li>• <strong>Chain ID:</strong> 42161</li>
                <li>• <strong>Future:</strong> Universe Blockchain (L3)</li>
                <li>• <strong>Gas Token:</strong> AXM</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-bold mb-3 text-yellow-400">Security Features</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Multi-signature wallets</li>
                <li>• Time-locked transactions</li>
                <li>• Circuit breaker mechanisms</li>
                <li>• Emergency pause functionality</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-3 text-yellow-400">Smart Contracts</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Treasury & Revenue Hub</li>
                <li>• Identity & Compliance</li>
                <li>• Asset Registry</li>
                <li>• Staking & Governance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Core Values</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-5xl mb-4">🌟</div>
              <h3 className="text-xl font-bold mb-2">Transparency</h3>
              <p className="text-gray-400 text-sm">
                100% on-chain transactions with full audit trails
              </p>
            </div>

            <div className="text-center">
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-xl font-bold mb-2">Community-First</h3>
              <p className="text-gray-400 text-sm">
                Governed by AXM token holders, for the community
              </p>
            </div>

            <div className="text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-xl font-bold mb-2">Security</h3>
              <p className="text-gray-400 text-sm">
                Audited smart contracts and institutional-grade protection
              </p>
            </div>

            <div className="text-center">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-xl font-bold mb-2">Innovation</h3>
              <p className="text-gray-400 text-sm">
                First sovereign on-chain banking system in America
              </p>
            </div>
          </div>
        </div>

        {/* Smart Contract Addresses */}
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-4">🔗 Core Smart Contract Addresses</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Treasury Hub:</span>
              <code className="ml-2 text-blue-400 break-all">{ALL_CONTRACTS.TREASURY_REVENUE}</code>
            </div>
            <div>
              <span className="text-gray-400">AXM Token:</span>
              <code className="ml-2 text-blue-400 break-all">{ALL_CONTRACTS.AXM_TOKEN}</code>
            </div>
            <div>
              <span className="text-gray-400">Identity Registry:</span>
              <code className="ml-2 text-blue-400 break-all">{ALL_CONTRACTS.IDENTITY_COMPLIANCE}</code>
            </div>
            <div>
              <span className="text-gray-400">Asset Registry:</span>
              <code className="ml-2 text-blue-400 break-all">{ALL_CONTRACTS.LAND_ASSET_REGISTRY}</code>
            </div>
            <div>
              <span className="text-gray-400">Network:</span>
              <span className="ml-2 text-green-400">Arbitrum One (Chain ID: 42161)</span>
            </div>
            <div>
              <span className="text-gray-400">Explorer:</span>
              <a href="https://arbiscan.io" target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-400 hover:underline">
                Arbiscan.io
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutBankPage;
