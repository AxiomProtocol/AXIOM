import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { CheckCircle, XCircle, Circle } from 'lucide-react';

const ComparisonPage: React.FC = () => {
  const features = [
    {
      category: "Real-World Utility",
      axiom: { status: "full", text: "22+ deployed smart contracts powering real estate, logistics, energy, and municipal services" },
      bitcoin: { status: "none", text: "Limited to store of value and peer-to-peer payments" },
      ethereum: { status: "partial", text: "Smart contract platform but no built-in real-world revenue" },
      xrp: { status: "partial", text: "Focused on cross-border payments only" },
      others: { status: "partial", text: "Mostly speculative with limited real-world adoption" }
    },
    {
      category: "Revenue Generation",
      axiom: { status: "full", text: "8+ revenue streams: Rent, trucking, energy, parking, property tax, retail leases, IoT, reserve backing" },
      bitcoin: { status: "none", text: "No revenue generation - purely speculative value" },
      ethereum: { status: "partial", text: "Gas fees for validators only" },
      xrp: { status: "partial", text: "Transaction fees only" },
      others: { status: "none", text: "Most have no actual revenue model" }
    },
    {
      category: "Token Holder Benefits",
      axiom: { status: "full", text: "Staking rewards + dividend vault from real revenue + governance rights + fee exemptions" },
      bitcoin: { status: "none", text: "Price appreciation only - no passive income" },
      ethereum: { status: "partial", text: "Staking rewards only (4-5% APY)" },
      xrp: { status: "none", text: "No staking or dividends" },
      others: { status: "partial", text: "Limited staking, no real revenue sharing" }
    },
    {
      category: "Supply Economics",
      axiom: { status: "full", text: "15B hard cap + governance-controlled burns + demurrage = deflationary with scarcity" },
      bitcoin: { status: "partial", text: "21M hard cap but no burn mechanism - fixed supply" },
      ethereum: { status: "partial", text: "No hard cap, EIP-1559 burns but still inflationary" },
      xrp: { status: "partial", text: "100B pre-mined, centralized supply control" },
      others: { status: "none", text: "Most are inflationary with unlimited or unclear supply" }
    },
    {
      category: "Governance",
      axiom: { status: "full", text: "ERC20Votes with on-chain delegation, 7 specialized roles, community-controlled fee distribution" },
      bitcoin: { status: "none", text: "No on-chain governance - only miner/node consensus" },
      ethereum: { status: "partial", text: "Off-chain governance via EIPs, no token voting" },
      xrp: { status: "none", text: "Centralized - Ripple controls majority" },
      others: { status: "partial", text: "Limited governance, often centralized" }
    },
    {
      category: "Transaction Costs",
      axiom: { status: "full", text: "Built on Arbitrum One - $0.01-0.10 per transaction (L2 scaling)" },
      bitcoin: { status: "none", text: "$1-50+ per transaction depending on network congestion" },
      ethereum: { status: "none", text: "$5-100+ per transaction on L1" },
      xrp: { status: "full", text: "$0.0002 per transaction" },
      others: { status: "partial", text: "Varies widely - most L1s still expensive" }
    },
    {
      category: "Speed",
      axiom: { status: "full", text: "~2 second finality on Arbitrum One (250ms block time)" },
      bitcoin: { status: "none", text: "10+ minutes per confirmation, 60+ min for finality" },
      ethereum: { status: "partial", text: "12-15 seconds on L1, 12+ min finality" },
      xrp: { status: "full", text: "3-5 seconds" },
      others: { status: "partial", text: "Most L1s: 5-60 seconds" }
    },
    {
      category: "Regulatory Compliance",
      axiom: { status: "full", text: "Built-in KYC/AML hooks, IIdentityRegistry, IComplianceModule, configurable restrictions" },
      bitcoin: { status: "none", text: "No built-in compliance - relies on exchanges" },
      ethereum: { status: "none", text: "No native compliance features" },
      xrp: { status: "partial", text: "Some compliance tools but ongoing SEC litigation" },
      others: { status: "none", text: "Most lack compliance infrastructure" }
    },
    {
      category: "Smart City Integration",
      axiom: { status: "full", text: "Purpose-built for 1,000-acre smart city with DePIN, IoT, municipal services, banking suite" },
      bitcoin: { status: "none", text: "Not designed for smart city use cases" },
      ethereum: { status: "partial", text: "Platform capable but no built-in city infrastructure" },
      xrp: { status: "none", text: "Payment-focused only" },
      others: { status: "none", text: "None purpose-built for smart cities" }
    },
    {
      category: "Banking Integration",
      axiom: { status: "full", text: "Full banking suite: checking, savings, CDs, loans, credit cards, mortgages, investment products" },
      bitcoin: { status: "none", text: "No banking features" },
      ethereum: { status: "partial", text: "DeFi apps exist but fragmented, no unified banking" },
      xrp: { status: "none", text: "Payment rails only" },
      others: { status: "partial", text: "Some DeFi but no comprehensive banking" }
    },
    {
      category: "Decentralization",
      axiom: { status: "full", text: "Community-governed DAO with 7 role types, built on decentralized Arbitrum L2" },
      bitcoin: { status: "full", text: "Fully decentralized mining network" },
      ethereum: { status: "full", text: "Decentralized validator network post-Merge" },
      xrp: { status: "none", text: "Ripple controls majority of supply and validators" },
      others: { status: "partial", text: "Varies - many are partially centralized" }
    },
    {
      category: "Energy Efficiency",
      axiom: { status: "full", text: "Built on Ethereum L2 - minimal energy consumption, DePIN integrates renewable energy" },
      bitcoin: { status: "none", text: "Proof-of-Work consumes massive energy (est. 150 TWh/year)" },
      ethereum: { status: "full", text: "Proof-of-Stake reduced energy by 99.95%" },
      xrp: { status: "full", text: "Low energy consensus mechanism" },
      others: { status: "partial", text: "Most modern chains are PoS but varies" }
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'full':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'partial':
        return <Circle className="w-5 h-5 text-yellow-400" />;
      case 'none':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
        
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 bg-clip-text text-transparent">
            The Axiom Advantage
          </h1>
          <p className="text-2xl text-gray-300 max-w-4xl mx-auto">
            Why Axiom Is Built to Replace Traditional Cryptocurrencies as the #1 Digital Asset
          </p>
        </div>

        {/* Key Difference Statement */}
        <Card className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-2 border-yellow-500">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="text-5xl">⚡</div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-yellow-400">The Fundamental Difference</h2>
                <p className="text-lg text-gray-200 leading-relaxed">
                  While Bitcoin, Ethereum, and XRP were revolutionary for their time, <strong className="text-yellow-400">they solve yesterday's problems</strong>. 
                  Bitcoin is digital gold—a store of value with no real-world utility. Ethereum is a platform for developers but offers nothing 
                  to everyday people. XRP is a payment rail for banks, not individuals.
                </p>
                <p className="text-lg text-gray-200 leading-relaxed">
                  <strong className="text-yellow-400">Axiom is different.</strong> It's not just a cryptocurrency—it's the <strong>operating system 
                  for an entire sovereign economy</strong>. Every AXM token is backed by real revenue from real estate, logistics, energy, and 
                  municipal services. Token holders don't just speculate on price—they <strong>earn passive income from actual economic activity</strong>.
                </p>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                  <p className="text-yellow-300 font-semibold">
                    🎯 Bottom Line: Bitcoin is digital gold. Ethereum is a developer platform. XRP is bank infrastructure. 
                    <span className="text-yellow-400"> Axiom is a complete digital nation-state economy.</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Comparison Table */}
        <Card className="bg-gray-800/50 border-2 border-blue-500">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-center">Feature-by-Feature Comparison</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-600">
                    <th className="text-left p-4 text-yellow-400 font-bold">Feature</th>
                    <th className="text-center p-4 text-yellow-400 font-bold">Axiom (AXM)</th>
                    <th className="text-center p-4 text-gray-400 font-bold">Bitcoin (BTC)</th>
                    <th className="text-center p-4 text-gray-400 font-bold">Ethereum (ETH)</th>
                    <th className="text-center p-4 text-gray-400 font-bold">XRP</th>
                    <th className="text-center p-4 text-gray-400 font-bold">Others</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, idx) => (
                    <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                      <td className="p-4 font-semibold text-blue-300">{feature.category}</td>
                      
                      <td className="p-4">
                        <div className="flex flex-col items-center gap-2">
                          {getStatusIcon(feature.axiom.status)}
                          <span className="text-xs text-gray-300 text-center">{feature.axiom.text}</span>
                        </div>
                      </td>
                      
                      <td className="p-4 bg-gray-800/30">
                        <div className="flex flex-col items-center gap-2">
                          {getStatusIcon(feature.bitcoin.status)}
                          <span className="text-xs text-gray-400 text-center">{feature.bitcoin.text}</span>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex flex-col items-center gap-2">
                          {getStatusIcon(feature.ethereum.status)}
                          <span className="text-xs text-gray-400 text-center">{feature.ethereum.text}</span>
                        </div>
                      </td>
                      
                      <td className="p-4 bg-gray-800/30">
                        <div className="flex flex-col items-center gap-2">
                          {getStatusIcon(feature.xrp.status)}
                          <span className="text-xs text-gray-400 text-center">{feature.xrp.text}</span>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex flex-col items-center gap-2">
                          {getStatusIcon(feature.others.status)}
                          <span className="text-xs text-gray-400 text-center">{feature.others.text}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">Full Support</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-300">Partial Support</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-gray-300">No Support</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Why Axiom Will Be #1 */}
        <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-2 border-purple-500">
          <CardContent className="p-8">
            <h2 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Why Axiom Will Become the #1 Cryptocurrency
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-900/30 rounded-lg p-6 border border-purple-500/30">
                <h3 className="text-2xl font-bold text-purple-300 mb-4">🏆 1. Real Economic Value</h3>
                <p className="text-gray-300">
                  Bitcoin's value is purely speculative—it's worth what people believe it's worth. Axiom generates 
                  <strong className="text-purple-400"> actual revenue from 8+ real-world sources</strong>. When you hold AXM, 
                  you own a piece of rent payments, trucking income, energy sales, and municipal revenue. That's 
                  <strong className="text-purple-400"> real value, not speculation</strong>.
                </p>
              </div>

              <div className="bg-pink-900/30 rounded-lg p-6 border border-pink-500/30">
                <h3 className="text-2xl font-bold text-pink-300 mb-4">💰 2. Passive Income for Holders</h3>
                <p className="text-gray-300">
                  Bitcoin holders can only profit from price appreciation. <strong className="text-pink-400">Axiom token holders earn 
                  passive income</strong> through staking rewards (30% of fees), dividend vault distributions from real revenue, 
                  and governance rights. Your tokens <strong className="text-pink-400">work for you every day</strong>.
                </p>
              </div>

              <div className="bg-blue-900/30 rounded-lg p-6 border border-blue-500/30">
                <h3 className="text-2xl font-bold text-blue-300 mb-4">🌍 3. Solves Real Problems</h3>
                <p className="text-gray-300">
                  Traditional cryptos don't solve everyday problems for regular people. Axiom powers 
                  <strong className="text-blue-400"> banking, housing, energy, transportation, and governance</strong> for an entire 
                  smart city. It's the first crypto that <strong className="text-blue-400">people will use daily without knowing it's crypto</strong>.
                </p>
              </div>

              <div className="bg-green-900/30 rounded-lg p-6 border border-green-500/30">
                <h3 className="text-2xl font-bold text-green-300 mb-4">📈 4. Superior Economics</h3>
                <p className="text-gray-300">
                  Bitcoin's 21M cap makes it scarce but offers no income. Ethereum is inflationary with no cap. 
                  <strong className="text-green-400"> Axiom combines the best of both</strong>: 15B hard cap for scarcity, 
                  governance-controlled burns for deflation, and <strong className="text-green-400">revenue distribution for yield</strong>.
                </p>
              </div>

              <div className="bg-orange-900/30 rounded-lg p-6 border border-orange-500/30">
                <h3 className="text-2xl font-bold text-orange-300 mb-4">⚡ 5. Modern Technology</h3>
                <p className="text-gray-300">
                  Bitcoin is slow (10+ min) and expensive ($10-50/tx). Ethereum L1 is still costly ($5-100/tx). 
                  <strong className="text-orange-400"> Axiom runs on Arbitrum L2</strong> with 2-second finality and $0.01-0.10 fees. 
                  It's <strong className="text-orange-400">built for mass adoption, not speculation</strong>.
                </p>
              </div>

              <div className="bg-cyan-900/30 rounded-lg p-6 border border-cyan-500/30">
                <h3 className="text-2xl font-bold text-cyan-300 mb-4">🏛️ 6. Regulatory Compliance</h3>
                <p className="text-gray-300">
                  Bitcoin and Ethereum operate in regulatory gray zones. XRP faces ongoing SEC litigation. 
                  <strong className="text-cyan-400"> Axiom is built compliance-first</strong> with KYC/AML hooks, identity registry, 
                  and configurable compliance modules. It's <strong className="text-cyan-400">designed to work with regulators, not against them</strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Why Public Should Adopt */}
        <Card className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-2 border-green-500">
          <CardContent className="p-8">
            <h2 className="text-4xl font-bold mb-6 text-center text-green-400">
              Why the Public Should Adopt Axiom
            </h2>
            
            <div className="space-y-6">
              <div className="bg-green-900/30 rounded-lg p-6 border border-green-500/30">
                <h3 className="text-2xl font-bold text-green-300 mb-3">✅ For Everyday People</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• <strong>No crypto knowledge required</strong> - Use it like a normal bank account</li>
                  <li>• <strong>Earn while you hold</strong> - Staking and dividends provide passive income</li>
                  <li>• <strong>Lower costs</strong> - $0.01-0.10 transaction fees vs. $10-50+ for Bitcoin</li>
                  <li>• <strong>Faster transactions</strong> - 2 seconds vs. 10+ minutes for Bitcoin</li>
                  <li>• <strong>Real utility</strong> - Pay rent, utilities, parking, and more with AXM</li>
                </ul>
              </div>

              <div className="bg-emerald-900/30 rounded-lg p-6 border border-emerald-500/30">
                <h3 className="text-2xl font-bold text-emerald-300 mb-3">✅ For Investors</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• <strong>Real revenue backing</strong> - Not purely speculative like Bitcoin</li>
                  <li>• <strong>Multiple income streams</strong> - Earn from staking, dividends, and appreciation</li>
                  <li>• <strong>Deflationary pressure</strong> - Burns reduce supply over time</li>
                  <li>• <strong>Governance rights</strong> - Vote on fee distribution and protocol changes</li>
                  <li>• <strong>Early adopter advantage</strong> - TGE participants get best pricing</li>
                </ul>
              </div>

              <div className="bg-teal-900/30 rounded-lg p-6 border border-teal-500/30">
                <h3 className="text-2xl font-bold text-teal-300 mb-3">✅ For Businesses</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• <strong>Lower payment processing fees</strong> - No 2-3% credit card fees</li>
                  <li>• <strong>Instant settlement</strong> - 2 seconds vs. 2-3 days for bank transfers</li>
                  <li>• <strong>Global reach</strong> - Accept payments from anywhere, instantly</li>
                  <li>• <strong>Compliance built-in</strong> - KYC/AML hooks for regulatory peace of mind</li>
                  <li>• <strong>Revenue sharing</strong> - Businesses in Axiom ecosystem earn from protocol growth</li>
                </ul>
              </div>

              <div className="bg-blue-900/30 rounded-lg p-6 border border-blue-500/30">
                <h3 className="text-2xl font-bold text-blue-300 mb-3">✅ For Society</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• <strong>Energy efficient</strong> - 99.95% less energy than Bitcoin's proof-of-work</li>
                  <li>• <strong>Financial inclusion</strong> - Banking for the unbanked and underbanked</li>
                  <li>• <strong>Transparent governance</strong> - Community-controlled vs. corporate control</li>
                  <li>• <strong>Local economic sovereignty</strong> - Communities control their own economy</li>
                  <li>• <strong>Sustainable model</strong> - Real revenue sustains the ecosystem, not speculation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* The Bottom Line */}
        <Card className="bg-gradient-to-r from-yellow-900/50 via-orange-900/50 to-red-900/50 border-2 border-yellow-500">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-yellow-400">The Bottom Line</h2>
              <p className="text-2xl text-gray-200 max-w-4xl mx-auto leading-relaxed">
                Bitcoin was revolutionary in 2009. Ethereum advanced the space in 2015. But it's 2025—
                <strong className="text-yellow-400"> we need cryptocurrency that works for everyone, not just speculators and developers</strong>.
              </p>
              <p className="text-2xl text-gray-200 max-w-4xl mx-auto leading-relaxed">
                <strong className="text-yellow-400">Axiom is the first cryptocurrency built for actual adoption</strong>—
                banking, housing, energy, transportation, and governance all powered by one ecosystem. 
                It's not just digital money. It's <strong className="text-yellow-400">the operating system for sovereign wealth</strong>.
              </p>
              <div className="pt-6">
                <a 
                  href="/launchpad" 
                  className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold text-xl px-12 py-4 rounded-full hover:shadow-2xl hover:scale-105 transition-all"
                >
                  Join the TGE - Launch January 1, 2026
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default ComparisonPage;
