import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export default function HomePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [monthlyInvestment, setMonthlyInvestment] = useState(100);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with email service
    console.log('Email submitted:', email);
    setEmailSubmitted(true);
    setTimeout(() => {
      navigate('/axiom-staking');
    }, 2000);
  };

  const calculateProjection = (monthly: number, years: number, apy: number) => {
    const months = years * 12;
    const monthlyRate = apy / 12 / 100;
    const futureValue = monthly * (((1 + monthlyRate) ** months - 1) / monthlyRate);
    return Math.round(futureValue);
  };

  return (
    <main className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen text-white">
      
      {/* Hero Section - Above The Fold */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-yellow-500/5"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-75"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Pre-Headline (credibility) */}
          <div className="inline-block bg-yellow-500/20 border border-yellow-400 rounded-full px-6 py-2 mb-6 backdrop-blur-sm">
            <span className="text-yellow-400 font-semibold">🏛️ Governance-First Wealth Infrastructure</span>
          </div>
          
          {/* Main Headline - Problem & Solution */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500">
              Transparent Infrastructure
            </span>
            <br />
            <span className="text-white">
              For Coordinated Capital Formation
            </span>
          </h1>
          
          {/* Sub-Headline */}
          <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-8 leading-relaxed">
            Explore a <span className="text-yellow-400 font-semibold">disclosure-first capital framework</span> designed to 
            <span className="text-yellow-400 font-semibold"> bridge digital capital and real assets</span>. 
            Structured participation. On-chain transparency. Community coordination.
            <span className="block mt-2 text-green-400 font-bold">All auditable. All on-chain. All governed.</span>
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 mb-10 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              <span>40 Smart Contracts Deployed</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              <span>Arbitrum One Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              <span>Full Transparency Portal</span>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <Button 
              onClick={() => navigate('/axiom-staking')}
              className="text-xl px-10 py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold rounded-xl shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105"
            >
              🚀 View Live Staking Pools
            </Button>
            <Button 
              onClick={() => navigate('/axiom-dashboard')}
              variant="outline"
              className="text-xl px-10 py-6 border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 font-semibold rounded-xl shadow-xl transition-all duration-300"
            >
              📊 Explore Dashboard
            </Button>
          </div>

          <p className="text-sm text-gray-500">⚡ Connect wallet in 60 seconds • No KYC required for viewing</p>
        </div>
      </section>

      {/* Banking Services Banner - NEW */}
      <section className="py-12 px-4 bg-gradient-to-r from-yellow-900/30 via-green-900/30 to-yellow-900/30 border-y-2 border-yellow-500/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-block bg-yellow-500/20 border border-yellow-400 rounded-full px-4 py-1 mb-3">
                <span className="text-yellow-400 text-sm font-semibold">🏦 AXIOM NATIONAL BANK</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                32 Banking Products - All On-Chain
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl">
                From <span className="text-yellow-400 font-semibold">checking accounts to mortgages</span>, 
                credit cards to tokenized real estate. America's first fully sovereign blockchain banking system.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button 
                onClick={() => navigate('/axiom-banking')}
                className="text-xl px-8 py-6 bg-gradient-to-r from-yellow-500 to-green-500 hover:from-yellow-600 hover:to-green-600 text-black font-bold rounded-xl shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105"
              >
                🏛️ Explore National Bank
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* DePIN Infrastructure Banner - NEW */}
      <section className="py-16 px-4 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/50 rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-block bg-yellow-500/20 border border-yellow-400 rounded-full px-6 py-2 mb-4">
                <span className="text-yellow-400 font-semibold">📡 AXIOM DePIN INFRASTRUCTURE</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Own Real-World Infrastructure
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                  Earn Real-World Income
                </span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-6">
                From smartphones to data centers - start with what you have and scale up. 
                Power the smart city's physical infrastructure and earn from <span className="text-green-400 font-bold">14 income streams</span>.
              </p>
            </div>

            {/* Tier Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-black/40 border border-green-500/30 rounded-xl p-6 text-center hover:border-green-500 transition-all">
                <div className="text-4xl mb-3">📱</div>
                <div className="text-green-400 font-bold text-lg mb-2">Mobile Tier</div>
                <div className="text-gray-400 text-sm mb-2">Start with $0</div>
                <div className="text-white font-semibold">$15-35/mo</div>
              </div>
              <div className="bg-black/40 border border-blue-500/30 rounded-xl p-6 text-center hover:border-blue-500 transition-all">
                <div className="text-4xl mb-3">💻</div>
                <div className="text-blue-400 font-bold text-lg mb-2">Desktop Tier</div>
                <div className="text-gray-400 text-sm mb-2">$100-220 setup</div>
                <div className="text-white font-semibold">$50-160/mo</div>
              </div>
              <div className="bg-black/40 border border-purple-500/30 rounded-xl p-6 text-center hover:border-purple-500 transition-all">
                <div className="text-4xl mb-3">🖥️</div>
                <div className="text-purple-400 font-bold text-lg mb-2">Pro Tier</div>
                <div className="text-gray-400 text-sm mb-2">$300-450 setup</div>
                <div className="text-white font-semibold">$200-380/mo</div>
              </div>
              <div className="bg-black/40 border border-yellow-500/30 rounded-xl p-6 text-center hover:border-yellow-500 transition-all">
                <div className="text-4xl mb-3">🗄️</div>
                <div className="text-yellow-400 font-bold text-lg mb-2">Enterprise</div>
                <div className="text-gray-400 text-sm mb-2">$500-750 setup</div>
                <div className="text-white font-semibold">$1,050-1,950/mo</div>
              </div>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">✅</div>
                <div>
                  <div className="text-white font-semibold mb-1">Physical Asset Pipeline</div>
                  <div className="text-gray-400 text-sm">Targeted land acquisition roadmap with tokenized asset onboarding</div>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="text-3xl">💰</div>
                <div>
                  <div className="text-white font-semibold mb-1">14 Income Streams</div>
                  <div className="text-gray-400 text-sm">Storage, utilities, trucking, Wall Street feeds, IoT gateway</div>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="text-3xl">🚀</div>
                <div>
                  <div className="text-white font-semibold mb-1">Interactive Wizard</div>
                  <div className="text-gray-400 text-sm">Match your resources to the perfect node tier</div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Button 
                onClick={() => navigate('/axiom-depin-nodes')}
                className="text-xl px-10 py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold rounded-xl shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105"
              >
                🚀 Start DePIN Setup Wizard
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                ⚡ Takes 2 minutes • Smartphone to Enterprise • 5 hardware tiers
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AXUSD Stablecoin Banner - NEW */}
      <section className="py-12 px-4 bg-gradient-to-r from-green-900/30 via-emerald-900/30 to-teal-900/30 border-y-2 border-green-500/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-block bg-green-500/20 border border-green-400 rounded-full px-4 py-1 mb-3">
                <span className="text-green-400 text-sm font-semibold">$ AXUSD STABLECOIN</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                The Settlement Layer of Axiom
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl">
                Mint <span className="text-green-400 font-semibold">AXUSD</span> against crypto collateral, 
                swap 1:1 via PSM, and earn <span className="text-green-400 font-semibold">50% protocol revenue</span> through SEED.
                11 verified contracts on Arbitrum One.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button 
                onClick={() => navigate('/axusd')}
                className="text-xl px-8 py-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-black font-bold rounded-xl shadow-2xl hover:shadow-green-500/50 transition-all duration-300 hover:scale-105"
              >
                $ Explore AXUSD
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* DeFi Opportunities Banner */}
      <section className="py-12 px-4 bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-blue-900/30 border-y-2 border-blue-500/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-block bg-blue-500/20 border border-blue-400 rounded-full px-4 py-1 mb-3">
                <span className="text-blue-400 text-sm font-semibold">ARBITRUM ONE NETWORK</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Earn Real Yield with Arbitrum DeFi
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl">
                Explore <span className="text-yellow-400 font-semibold">4 Arbitrum-native DeFi opportunities</span>: 
                AXM-ETH LP Staking, Uniswap V3, GMX Lending & AXM Staking. Real returns, low gas fees.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button 
                onClick={() => navigate('/axiom-defi')}
                className="text-xl px-8 py-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105"
              >
                View DeFi Opportunities
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Banner */}
      <section className="py-12 px-4 bg-gradient-to-r from-purple-900/30 via-pink-900/30 to-orange-900/30 border-y-2 border-yellow-500/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-block bg-yellow-500/20 border border-yellow-400 rounded-full px-4 py-1 mb-3">
                <span className="text-yellow-400 text-sm font-semibold">🆕 JUST RELEASED</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Why Axiom Will Replace Bitcoin as #1
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl">
                See the side-by-side comparison: Axiom vs Bitcoin, Ethereum, XRP & others. 
                Discover why <span className="text-yellow-400 font-semibold">real revenue beats speculation</span> every time.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button 
                onClick={() => navigate('/comparison')}
                className="text-xl px-8 py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
              >
                📊 View Full Comparison
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Agitation Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-red-900/20 to-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              While Everyone Else is Talking...
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                We're Building
              </span>
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 mx-auto mb-8 rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-red-500/30 rounded-xl p-8">
              <div className="text-4xl mb-4">❌</div>
              <h3 className="text-xl font-bold text-red-400 mb-3">Traditional Real Estate</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>• High entry barriers ($50K+ down payments)</li>
                <li>• Illiquid (months to sell)</li>
                <li>• Hidden fees eating profits</li>
                <li>• Zero transparency</li>
                <li>• Controlled by gatekeepers</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-red-500/30 rounded-xl p-8">
              <div className="text-4xl mb-4">❌</div>
              <h3 className="text-xl font-bold text-red-400 mb-3">Empty Crypto Promises</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>• No real-world backing</li>
                <li>• Pure speculation</li>
                <li>• Anonymous teams</li>
                <li>• No actual utility</li>
                <li>• Pump and dump schemes</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-900/30 to-gray-800/50 backdrop-blur-sm border-2 border-green-400 rounded-xl p-8 shadow-xl shadow-green-500/20">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-green-400 mb-3">Axiom Smart City</h3>
              <ul className="space-y-2 text-green-300 text-sm font-semibold">
                <li>✓ Physical asset pipeline</li>
                <li>✓ Fully transparent blockchain</li>
                <li>✓ Start with any amount</li>
                <li>✓ Instant liquidity via DEX</li>
                <li>✓ Participate with structure</li>
              </ul>
            </div>
          </div>

          <div className="text-center bg-yellow-500/10 border-2 border-yellow-400 rounded-2xl p-8 backdrop-blur-sm">
            <p className="text-2xl text-yellow-400 font-bold mb-2">The Difference</p>
            <p className="text-xl text-white">
              Axiom is coordination infrastructure for <span className="text-yellow-400 font-bold">structured, transparent participation</span> 
              in <span className="text-green-400">real asset pipelines, governance, and capital formation</span> — all on-chain.
            </p>
          </div>
        </div>
      </section>

      {/* Value Stack Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              What You Get as an AXM Stakeholder
            </h2>
            <p className="text-xl text-gray-400">Structured participation across the Axiom coordination layer.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Value Card 1 */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 hover:border-yellow-500 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🏦</div>
                  <div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-3">Full-Service Digital Banking</h3>
                    <p className="text-gray-300 mb-4">30+ banking product modules: checking, savings, CDs, credit cards, loans, mortgages — all on-chain. Rates are variable and subject to protocol policy.</p>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>✓ On-chain settlement</li>
                      <li>✓ Transparent fee structure</li>
                      <li>✓ No hidden fees</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Value Card 2 */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 hover:border-yellow-500 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🏘️</div>
                  <div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-3">Tokenized Real Estate</h3>
                    <p className="text-gray-300 mb-4">Own fractions of commercial properties, residential units, and land parcels—starting at $100.</p>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>✓ Fractional ownership</li>
                      <li>✓ Rental income distribution</li>
                      <li>✓ Trade 24/7 on internal DEX</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Value Card 3 */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 hover:border-yellow-500 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">⚡</div>
                  <div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-3">DePIN Infrastructure</h3>
                    <p className="text-gray-300 mb-4">Participate in structured utility infrastructure: energy grids, water systems, internet, IoT networks — all tokenized with on-chain reporting.</p>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>✓ Infrastructure participation instruments</li>
                      <li>✓ Usage-based fee distribution</li>
                      <li>✓ Smart city IoT integration</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Value Card 4 */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 hover:border-yellow-500 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🗳️</div>
                  <div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-3">Governance Rights</h3>
                    <p className="text-gray-300 mb-4">Vote on city developments, treasury allocation, new partnerships, and protocol upgrades. Your stake = your voice.</p>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>✓ Proposal creation & voting</li>
                      <li>✓ Treasury oversight</li>
                      <li>✓ Community-driven decisions</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Value Card 5 */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 hover:border-yellow-500 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">💹</div>
                  <div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-3">Wall Street Integration</h3>
                    <p className="text-gray-300 mb-4">Trade tokenized stocks, bonds, commodities, and RWAs on our internal DEX—no middlemen, no broker fees.</p>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>✓ Tokenized traditional assets</li>
                      <li>✓ 24/7 trading</li>
                      <li>✓ Instant settlement</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Value Card 6 */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 hover:border-yellow-500 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">💰</div>
                  <div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-3">Participation Lockup</h3>
                    <p className="text-gray-300 mb-4">Lock AXM to participate in protocol fee routing, governance, and ecosystem coordination. Rates are variable and not guaranteed.</p>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>✓ Configurable lockup terms</li>
                      <li>✓ Compound automatically</li>
                      <li>✓ Claim anytime</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Total Value Callout */}
          <div className="mt-12 bg-gradient-to-r from-green-900/30 to-blue-900/30 border-2 border-green-400 rounded-2xl p-10 text-center backdrop-blur-sm">
            <p className="text-3xl font-bold text-white mb-4">
              Explore the Full Axiom Coordination Layer
            </p>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-yellow-400 mb-2">
              Participation starts at $100
            </p>
            <p className="text-gray-400 text-lg">Transparent access to the entire ecosystem. No hidden gatekeepers. Subject to protocol terms.</p>
          </div>
        </div>
      </section>

      {/* Wealth Calculator / ROI Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-900/20 to-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Hypothetical Projection Model
            </h2>
            <p className="text-xl text-gray-400">Illustrative scenarios only. Not a forecast, guarantee, or promise of any outcome.</p>
          </div>

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500">
            <CardContent className="p-10">
              {/* Slider */}
              <div className="mb-10">
                <label className="block text-2xl font-bold text-yellow-400 mb-4">
                  Monthly Investment: ${monthlyInvestment}
                </label>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={monthlyInvestment}
                  onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
                  className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>$100/mo</span>
                  <span>$5,000/mo</span>
                </div>
              </div>

              {/* Projections */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-900/30 to-gray-800 border-2 border-green-400 rounded-xl p-6 text-center">
                  <div className="text-green-400 font-semibold mb-2">1 Year</div>
                  <div className="text-4xl font-bold text-white mb-2">
                    ${calculateProjection(monthlyInvestment, 1, 15).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Hypothetical Value</div>
                  <div className="text-xs text-green-400 mt-2">+${(calculateProjection(monthlyInvestment, 1, 15) - (monthlyInvestment * 12)).toLocaleString()} hypothetical gain</div>
                </div>

                <div className="bg-gradient-to-br from-blue-900/30 to-gray-800 border-2 border-blue-400 rounded-xl p-6 text-center">
                  <div className="text-blue-400 font-semibold mb-2">3 Years</div>
                  <div className="text-4xl font-bold text-white mb-2">
                    ${calculateProjection(monthlyInvestment, 3, 15).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Hypothetical Value</div>
                  <div className="text-xs text-blue-400 mt-2">+${(calculateProjection(monthlyInvestment, 3, 15) - (monthlyInvestment * 36)).toLocaleString()} hypothetical gain</div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/30 to-gray-800 border-2 border-purple-400 rounded-xl p-6 text-center">
                  <div className="text-purple-400 font-semibold mb-2">5 Years</div>
                  <div className="text-4xl font-bold text-white mb-2">
                    ${calculateProjection(monthlyInvestment, 5, 15).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Hypothetical Value</div>
                  <div className="text-xs text-purple-400 mt-2">+${(calculateProjection(monthlyInvestment, 5, 15) - (monthlyInvestment * 60)).toLocaleString()} hypothetical gain</div>
                </div>
              </div>

              <p className="text-center text-gray-500 text-sm mt-8">
                Projections are hypothetical illustrations using an assumed 15% annual rate. They do not represent actual or expected results. Past performance does not indicate future outcomes. All participation carries material risk including total loss of capital.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Social Proof / Traction */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Infrastructure Progress
            </h2>
            <p className="text-xl text-gray-400">Deployed contracts and coordination milestones.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-xl p-8 text-center">
              <div className="text-5xl font-bold text-yellow-400 mb-2">22</div>
              <div className="text-gray-400">Smart Contracts<br />Deployed</div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-xl p-8 text-center">
              <div className="text-5xl font-bold text-green-400 mb-2">100%</div>
              <div className="text-gray-400">Transparency<br />On-Chain</div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-xl p-8 text-center">
              <div className="text-5xl font-bold text-blue-400 mb-2">Planned</div>
              <div className="text-gray-400">Land Acquisition<br />Pipeline</div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-xl p-8 text-center">
              <div className="text-5xl font-bold text-purple-400 mb-2">Target</div>
              <div className="text-gray-400">Economy<br />Scale</div>
            </div>
          </div>

          {/* Live Contracts Proof */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-green-400 rounded-2xl p-8 backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-green-400 mb-6 text-center">✅ Verified On-Chain Infrastructure</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-gray-300">AXM Governance Token</span>
                  <span className="text-green-400 font-mono text-xs">✓ Deployed</span>
                </div>
                <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-gray-300">Staking Hub</span>
                  <span className="text-green-400 font-mono text-xs">✓ Deployed</span>
                </div>
                <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-gray-300">Treasury Management</span>
                  <span className="text-green-400 font-mono text-xs">✓ Deployed</span>
                </div>
                <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-gray-300">Land Registry</span>
                  <span className="text-green-400 font-mono text-xs">✓ Deployed</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-gray-300">Internal DEX</span>
                  <span className="text-green-400 font-mono text-xs">✓ Deployed</span>
                </div>
                <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-gray-300">Utility Services</span>
                  <span className="text-green-400 font-mono text-xs">✓ Deployed</span>
                </div>
                <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-gray-300">Identity & Reputation</span>
                  <span className="text-green-400 font-mono text-xs">✓ Deployed</span>
                </div>
                <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-gray-300">+ 14 More Modules</span>
                  <span className="text-green-400 font-mono text-xs">✓ Live</span>
                </div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <Button 
                onClick={() => navigate('/transparency-reports')}
                variant="outline"
                className="border-green-400 text-green-400 hover:bg-green-400/10"
              >
                🔍 View Full Transparency Portal
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Urgency / Scarcity Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-red-900/20 via-gray-900 to-orange-900/20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-bold py-2 px-6 rounded-full inline-block mb-6">
            PROTOCOL DEVELOPMENT ROADMAP
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Planned Development Milestones
          </h2>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-yellow-500 rounded-2xl p-10 mb-8">
            <p className="text-2xl text-yellow-400 font-bold mb-6">Development Roadmap:</p>
            
            <div className="space-y-6 text-left max-w-2xl mx-auto">
              <div className="flex gap-4">
                <div className="bg-yellow-500 text-black font-bold rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">1</div>
                <div>
                  <p className="font-bold text-white mb-1">Q1 2025: Participation Lockup Pools</p>
                  <p className="text-gray-400 text-sm">Initial lockup pools planned for launch. Rates are variable and subject to protocol governance.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="bg-yellow-500 text-black font-bold rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">2</div>
                <div>
                  <p className="font-bold text-white mb-1">Q2 2025: Real Estate Tokenization</p>
                  <p className="text-gray-400 text-sm">Initial asset onboarding targets. Participation subject to eligibility and governance approval.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="bg-yellow-500 text-black font-bold rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">3</div>
                <div>
                  <p className="font-bold text-white mb-1">Q3 2025: Utility Infrastructure Goes Live</p>
                  <p className="text-gray-400 text-sm">Infrastructure operational targets. Fee distribution subject to protocol policy and governance.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="bg-yellow-500 text-black font-bold rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">4</div>
                <div>
                  <p className="font-bold text-white mb-1">Q4 2025: Main DEX Launch</p>
                  <p className="text-gray-400 text-sm">Trade RWAs, real estate tokens, and traditional assets 24/7</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 text-white mb-8">
            <p className="text-xl font-bold mb-3">Development milestones are subject to change based on governance decisions and market conditions.</p>
            <p className="text-lg">
              Explore the dashboard, review disclosures, and connect your account to monitor protocol progress.
              <span className="block mt-2 text-yellow-300 font-bold">All timelines are targets, not commitments.</span>
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center">
            Questions? We've Got Answers.
          </h2>

          <div className="space-y-4">
            <details className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer group">
              <summary className="font-bold text-xl text-white group-hover:text-yellow-400 transition">
                Is this actually backed by real assets?
              </summary>
              <p className="mt-4 text-gray-400 pl-4">
                Axiom includes a physical asset pipeline designed to bridge digital capital and real assets. This includes a targeted land acquisition roadmap 
                with real infrastructure planning. All contracts are verified on Arbitrum One 
                and designed for full on-chain transparency. Asset acquisition targets are subject to governance approval and market conditions.
              </p>
            </details>

            <details className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer group">
              <summary className="font-bold text-xl text-white group-hover:text-yellow-400 transition">
                How is this different from other crypto projects?
              </summary>
              <p className="mt-4 text-gray-400 pl-4">
                Most crypto projects lack real-world coordination infrastructure. Axiom is building a governance-first coordination layer with 
                real asset pipelines, structured participation, and on-chain transparency. Participation is structured around coordination and governance, 
                not speculation.
              </p>
            </details>

            <details className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer group">
              <summary className="font-bold text-xl text-white group-hover:text-yellow-400 transition">
                What's the minimum investment?
              </summary>
              <p className="mt-4 text-gray-400 pl-4">
                There is no mandatory minimum. You can explore the dashboard and transparency portal without commitment. When participation lockup pools 
                launch, you can participate with any amount you are comfortable with. Subject to protocol terms.
              </p>
            </details>

            <details className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer group">
              <summary className="font-bold text-xl text-white group-hover:text-yellow-400 transition">
                Can I withdraw my money anytime?
              </summary>
              <p className="mt-4 text-gray-400 pl-4">
                Withdrawal terms depend on the specific participation mechanism. Review the applicable terms and lockup conditions before participating. 
                Liquidity on the internal DEX is subject to market conditions.
              </p>
            </details>

            <details className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer group">
              <summary className="font-bold text-xl text-white group-hover:text-yellow-400 transition">
                Is this legal and compliant?
              </summary>
              <p className="mt-4 text-gray-400 pl-4">
                Axiom City DAO LLC is a legally registered entity. The protocol is designed to align with applicable U.S. regulations. 
                Governance and financial operations are recorded on-chain for transparency. Regulatory alignment is ongoing and subject to change as frameworks evolve.
              </p>
            </details>

            <details className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer group">
              <summary className="font-bold text-xl text-white group-hover:text-yellow-400 transition">
                What are the risks?
              </summary>
              <p className="mt-4 text-gray-400 pl-4">
                All participation carries material risk including: smart contract vulnerabilities, market volatility, regulatory changes, and project 
                execution risk. Risk mitigation measures include audited contracts, transparent governance, and structured controls, but these do not eliminate risk. 
                Never participate with more than you can afford to lose.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-yellow-900/20 via-gray-900 to-yellow-900/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Explore the Axiom Ecosystem
          </h2>
          
          <p className="text-2xl text-gray-300 mb-10 leading-relaxed">
            Review disclosures, explore coordination infrastructure, and connect your account. 
            <span className="block mt-3 text-yellow-400 font-bold">
              Structure, transparency, and governance-first design.
            </span>
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-6 mb-8">
            <Button 
              onClick={() => navigate('/axiom-staking')}
              className="text-2xl px-12 py-8 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold rounded-xl shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105"
            >
              🔍 Explore Participation
            </Button>
            <Button 
              onClick={() => navigate('/axiom-dashboard')}
              variant="outline"
              className="text-2xl px-12 py-8 border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 font-semibold rounded-xl shadow-xl transition-all duration-300"
            >
              📊 View Dashboard
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              <span>Connect wallet in 60 seconds</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              <span>100% transparent on-chain</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-8 px-4 bg-gray-950 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-600 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9zm1-5a1 1 0 100 2 1 1 0 000-2z"/></svg>
              <span>Deployed on Arbitrum One</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              <span>Smart Contracts Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 4h2v7H9V4zm0 8h2v2H9v-2z"/></svg>
              <span>Axiom City DAO LLC</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
              <span>Full Transparency Portal</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
