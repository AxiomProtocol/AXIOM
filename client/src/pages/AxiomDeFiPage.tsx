import React from 'react';
import { InvestmentOpportunities } from '../components/wealth/InvestmentOpportunities';

export default function AxiomDeFiPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="inline-block bg-yellow-500/20 border border-yellow-400 rounded-full px-6 py-2 mb-6">
            <span className="text-yellow-400 text-sm font-semibold">🚀 ARBITRUM ONE NETWORK</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 mb-4">
            DeFi Investment Opportunities
          </h1>
          <p className="text-xl text-gray-300 mb-2 max-w-4xl mx-auto leading-relaxed">
            Earn real yield with <span className="text-yellow-400 font-semibold">Arbitrum-native DeFi protocols</span>
          </p>
          <p className="text-gray-400 max-w-3xl mx-auto">
            All opportunities verified on Arbitrum One (Chain ID: 42161) - Low gas fees, high returns, real revenue.
          </p>
        </div>

        {/* Network Info Banner */}
        <div className="mb-8 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-lg p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Powered by Arbitrum One</h3>
                <p className="text-sm text-gray-400">Layer 2 scaling solution for Ethereum - Fast & affordable</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">Network Live</span>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-sm font-semibold text-yellow-400 mb-1">Low Gas Fees</div>
            <div className="text-xs text-gray-400">$0.10 avg transaction</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">🔒</div>
            <div className="text-sm font-semibold text-green-400 mb-1">Ethereum Security</div>
            <div className="text-xs text-gray-400">L2 inherits L1 security</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-sm font-semibold text-blue-400 mb-1">Real Yield</div>
            <div className="text-xs text-gray-400">Protocol revenue-based</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">🌐</div>
            <div className="text-sm font-semibold text-purple-400 mb-1">DeFi Native</div>
            <div className="text-xs text-gray-400">Integrated ecosystem</div>
          </div>
        </div>

        {/* Investment Opportunities Component */}
        <InvestmentOpportunities 
          wealthData={{}}
          contractData={{}}
          onRefresh={() => {}}
        />

        {/* Risk Disclosure */}
        <div className="mt-12 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-3">⚠️ Important Risk Disclosure</h3>
          <div className="text-sm text-gray-300 space-y-2">
            <p>
              • <strong>Smart Contract Risk:</strong> All DeFi protocols carry inherent smart contract risks. Audited contracts reduce but don't eliminate risk.
            </p>
            <p>
              • <strong>Market Volatility:</strong> Cryptocurrency markets are highly volatile. APY rates shown are estimates and can fluctuate.
            </p>
            <p>
              • <strong>Impermanent Loss:</strong> Liquidity provision may result in impermanent loss compared to holding assets.
            </p>
            <p>
              • <strong>Network Risk:</strong> Ensure you're connected to Arbitrum One (Chain ID: 42161) before transacting.
            </p>
            <p>
              • <strong>Not Financial Advice:</strong> This information is for educational purposes only. Do your own research and never invest more than you can afford to lose.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-yellow-400 mb-4">Ready to Start Earning?</h3>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Connect your wallet to Arbitrum One and start exploring real yield opportunities with America's first on-chain smart city economy.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors"
            >
              Browse Opportunities Above
            </button>
            <a
              href="/axiom-dashboard"
              className="px-8 py-3 bg-transparent border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 font-semibold rounded-lg transition-colors"
            >
              View Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
