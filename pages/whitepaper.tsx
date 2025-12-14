import { useState } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';
import Logo3D from '../components/Logo3D';

const VERSION = "1.1";
const LAST_UPDATED = "December 2025";

const CONTRACTS = {
  AXM_TOKEN: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
  IDENTITY: '0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED',
  TREASURY: '0x3fD63728288546AC41dAe3bf25ca383061c3A929',
  STAKING: '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885',
  CITIZEN_REGISTRY: '0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344',
  LAND_REGISTRY: '0xaB15907b124620E165aB6E464eE45b178d8a6591',
  LEASE_ENGINE: '0x26a20dEa57F951571AD6e518DFb3dC60634D5297',
  REALTOR: '0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412',
  CAPITAL_POOLS: '0xFcCdC1E353b24936f9A8D08D21aF684c620fa701',
  UTILITY: '0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d',
  TRANSPORT: '0x959c5dd99B170e2b14B1F9b5a228f323946F514e',
  DEPIN_SUITE: '0x16dC3884d88b767D99E0701Ba026a1ed39a250F1',
  DEPIN_SALES: '0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd',
  CROSSCHAIN: '0x28623Ee5806ab9609483F4B68cb1AE212A092e4d',
  DEX: '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D',
  REPUTATION: '0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643',
  IOT_ORACLE: '0xe38B3443E17A07953d10F7841D5568a27A73ec1a',
  MARKETS: '0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830',
  ORACLE_RELAY: '0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6',
  COMMUNITY: '0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49',
  ACADEMY: '0x30667931BEe54a58B76D387D086A975aB37206F4',
  GAMIFICATION: '0x7F455b4614E05820AAD52067Ef223f30b1936f93',
  SUSTAINABILITY: '0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046',
  SUSU_HUB: '0x6C69D730327930B49A7997B7b5fb0865F30c95A5'
};

const SUPPLY_DATA = {
  maxSupply: '15,000,000,000',
  currentMinted: '200,000',
  circulatingSupply: '200,000',
  decimals: 18,
  holders: 5
};

interface Section {
  id: string;
  title: string;
  subsections?: string[];
}

const TABLE_OF_CONTENTS: Section[] = [
  { id: 'executive-summary', title: '1. Executive Summary' },
  { id: 'introduction', title: '2. Introduction', subsections: ['2.1 Vision', '2.2 Mission', '2.3 Problem Statement'] },
  { id: 'market-opportunity', title: '3. Market Opportunity', subsections: ['3.1 Smart City Market', '3.2 Real Estate Tokenization', '3.3 DePIN Infrastructure'] },
  { id: 'solution', title: '4. The Axiom Solution', subsections: ['4.1 Platform Overview', '4.2 Key Innovations', '4.3 Competitive Advantages'] },
  { id: 'technology', title: '5. Technology Architecture', subsections: ['5.1 Blockchain Infrastructure', '5.2 Smart Contract Suite', '5.3 Security Framework'] },
  { id: 'tokenomics', title: '6. Tokenomics', subsections: ['6.1 AXM Token', '6.2 Supply Distribution', '6.3 Utility & Value Accrual'] },
  { id: 'ecosystem', title: '7. Ecosystem Components', subsections: ['7.1 KeyGrow Rent-to-Own', '7.2 DePIN Node Network', '7.3 Decentralized Exchange', '7.4 Governance System', '7.5 Axiom SUSU'] },
  { id: 'banking', title: '8. National Bank of Axiom', subsections: ['8.1 Personal Banking', '8.2 Business Banking', '8.3 Investment Services', '8.4 Credit Products'] },
  { id: 'wall-street', title: '9. Wall Street Integration', subsections: ['9.1 Tokenized Securities', '9.2 RWA Marketplace', '9.3 Future Development'] },
  { id: 'governance', title: '10. Governance & Compliance', subsections: ['10.1 DAO Structure', '10.2 ISO 20022 Compliance', '10.3 GENIUS Act Compliance', '10.4 KYC/AML', '10.5 PMA Trust Structure'] },
  { id: 'roadmap', title: '11. Development Roadmap' },
  { id: 'financials', title: '12. Financial Projections' },
  { id: 'risks', title: '13. Risk Factors & Mitigations' },
  { id: 'legal', title: '14. Legal Disclosures' },
];

export default function WhitePaper() {
  const [activeSection, setActiveSection] = useState('executive-summary');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-amber-200 text-sm font-medium tracking-wider uppercase">Technical Whitepaper</p>
                <h1 className="text-4xl md:text-5xl font-bold mt-2">Axiom Protocol</h1>
                <p className="text-xl text-amber-100 mt-2">America's First On-Chain Sovereign Smart City Economy</p>
              </div>
              <div className="hidden md:block text-right">
                <Logo3D size={120} />
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-amber-200">Version:</span>
                <span className="ml-2 font-semibold">{VERSION}</span>
              </div>
              <div>
                <span className="text-amber-200">Last Updated:</span>
                <span className="ml-2 font-semibold">{LAST_UPDATED}</span>
              </div>
              <div>
                <span className="text-amber-200">Network:</span>
                <span className="ml-2 font-semibold">Arbitrum One (L2)</span>
              </div>
              <div>
                <span className="text-amber-200">Token:</span>
                <span className="ml-2 font-mono text-xs bg-amber-700/50 px-2 py-1 rounded">0x864F9c6f...2539D</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Sidebar Navigation */}
            <div className="lg:w-72 flex-shrink-0">
              <div className="sticky top-24 bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Table of Contents</h3>
                <nav className="space-y-1">
                  {TABLE_OF_CONTENTS.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeSection === section.id
                          ? 'bg-amber-100 text-amber-800 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <a
                    href="#"
                    className="flex items-center gap-2 text-amber-600 hover:text-amber-700 text-sm font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      window.print();
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                  </a>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 prose prose-lg max-w-none">
              {/* Executive Summary */}
              <section id="executive-summary" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">1. Executive Summary</h2>
                
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg mb-8">
                  <p className="text-gray-800 leading-relaxed m-0">
                    <strong>Axiom Protocol</strong> represents a paradigm shift in urban development: a fully integrated, blockchain-native smart city infrastructure designed to serve as a sovereign digital-physical economy. Built on Arbitrum One with plans to launch Universe Blockchain (L3), the protocol combines tokenized real estate, decentralized physical infrastructure (DePIN), comprehensive governance, and institutional-grade financial services into a unified ecosystem.
                  </p>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Key Highlights</h3>
                
                <div className="grid md:grid-cols-2 gap-6 not-prose">
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="text-3xl mb-3">🏙️</div>
                    <h4 className="font-bold text-gray-900 mb-2">1,000-Acre Smart City</h4>
                    <p className="text-gray-600 text-sm">First sovereign blockchain-native urban development in the United States, integrating physical infrastructure with on-chain governance.</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="text-3xl mb-3">🔗</div>
                    <h4 className="font-bold text-gray-900 mb-2">24 Verified Smart Contracts</h4>
                    <p className="text-gray-600 text-sm">Comprehensive contract suite covering identity, treasury, staking, real estate, DePIN, governance, and cross-chain operations.</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="text-3xl mb-3">🏠</div>
                    <h4 className="font-bold text-gray-900 mb-2">KeyGrow Rent-to-Own</h4>
                    <p className="text-gray-600 text-sm">First-of-its-kind tokenized rent-to-own program using ERC-1155 fractional shares, enabling tenants to build real equity.</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="text-3xl mb-3">💎</div>
                    <h4 className="font-bold text-gray-900 mb-2">15 Billion AXM Supply</h4>
                    <p className="text-gray-600 text-sm">Hard-capped governance and utility token with fee routing, staking rewards, and planned native gas functionality on L3.</p>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-10 mb-4">Investment Thesis</h3>
                <p className="text-gray-700 leading-relaxed">
                  The convergence of blockchain technology, smart city development, and real estate tokenization creates an unprecedented opportunity. Axiom Protocol is positioned at the intersection of three high-growth markets: the global smart city market (projected $2.5 trillion by 2030), the tokenized real-world assets market (projected $16 trillion by 2030), and the DePIN infrastructure market (projected $3.5 trillion by 2028). By creating integrated infrastructure that serves all three markets simultaneously, Axiom captures value across the entire smart city value chain.
                </p>
              </section>

              {/* Introduction */}
              <section id="introduction" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">2. Introduction</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2.1 Vision</h3>
                <p className="text-gray-700 leading-relaxed">
                  Axiom Protocol envisions a future where cities operate as sovereign digital economies—where property ownership, civic participation, utility consumption, transportation, and financial services are seamlessly integrated on-chain. Our vision extends beyond traditional smart city implementations that focus solely on IoT sensors and data collection. Instead, we are building a comprehensive economic layer that transforms how citizens interact with urban infrastructure.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  The Axiom Smart City will serve as a living prototype demonstrating that blockchain technology can deliver real utility at municipal scale. From paying utility bills with AXM tokens to voting on city development proposals, from earning rental income through tokenized property shares to operating DePIN nodes that power city services—every interaction creates value for participants and strengthens the network.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2.2 Mission</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our mission is to democratize access to real estate ownership, urban infrastructure investment, and civic governance through blockchain technology. We aim to:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Eliminate barriers to homeownership</strong> through the KeyGrow rent-to-own program, enabling tenants to accumulate equity with every rent payment</li>
                  <li><strong>Decentralize city infrastructure</strong> by enabling citizens to own and operate the nodes that power smart city services</li>
                  <li><strong>Provide institutional-grade financial services</strong> accessible to all citizens regardless of traditional credit history</li>
                  <li><strong>Create transparent governance</strong> where every stakeholder has voice proportional to their participation</li>
                  <li><strong>Generate sustainable yield</strong> through real economic activity rather than inflationary tokenomics</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2.3 Problem Statement</h3>
                
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-gray-900 mb-4">The Housing Crisis</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Homeownership rates have declined significantly over the past two decades, particularly among younger generations. Traditional rent payments build zero equity, leaving millions trapped in a cycle where housing costs consume income without creating wealth. The average renter in the United States pays over $1,500/month—more than many mortgage payments—yet accumulates nothing toward ownership.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-gray-900 mb-4">Infrastructure Investment Gap</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Smart city infrastructure requires massive capital investment, typically funded through municipal bonds or public-private partnerships that exclude ordinary citizens from participating in the value created. The benefits of modernized infrastructure accrue primarily to institutional investors and government entities, while residents bear the costs through taxes and fees.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-gray-900 mb-4">Fragmented City Services</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Modern cities operate through dozens of disconnected systems—separate providers for electricity, water, transportation, telecommunications, and waste management. Each maintains its own billing, customer service, and data silos. This fragmentation creates inefficiency, prevents optimization, and denies citizens a unified view of their urban footprint.
                  </p>
                </div>
              </section>

              {/* Market Opportunity */}
              <section id="market-opportunity" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">3. Market Opportunity</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3.1 Smart City Market</h3>
                <p className="text-gray-700 leading-relaxed">
                  The global smart city market is experiencing exponential growth driven by urbanization, sustainability mandates, and technological advancement. Key market statistics:
                </p>
                
                <div className="grid md:grid-cols-3 gap-6 my-8 not-prose">
                  <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
                    <div className="text-4xl font-bold text-amber-600">$2.5T</div>
                    <div className="text-sm text-gray-600 mt-2">Projected Market Size by 2030</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
                    <div className="text-4xl font-bold text-amber-600">14.8%</div>
                    <div className="text-sm text-gray-600 mt-2">Annual Growth Rate (CAGR)</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
                    <div className="text-4xl font-bold text-amber-600">1,000+</div>
                    <div className="text-sm text-gray-600 mt-2">Smart City Projects Globally</div>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3.2 Real Estate Tokenization</h3>
                <p className="text-gray-700 leading-relaxed">
                  Real estate represents the world's largest asset class ($326 trillion globally), yet remains one of the most illiquid and inaccessible. Tokenization promises to unlock this value:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>$16 trillion</strong> projected tokenized RWA market by 2030 (Boston Consulting Group)</li>
                  <li><strong>Fractional ownership</strong> enables participation with minimal capital requirements</li>
                  <li><strong>24/7 liquidity</strong> through DEX trading versus traditional 60-90 day closing periods</li>
                  <li><strong>Global accessibility</strong> removes geographic barriers to real estate investment</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3.3 DePIN Infrastructure</h3>
                <p className="text-gray-700 leading-relaxed">
                  Decentralized Physical Infrastructure Networks represent a new paradigm for building and operating real-world infrastructure through token incentives:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>$3.5 trillion</strong> projected DePIN market by 2028</li>
                  <li><strong>Cost reduction</strong> of 50-80% versus traditional infrastructure deployment</li>
                  <li><strong>Community ownership</strong> aligns incentives between operators and users</li>
                  <li><strong>Proven models</strong> including Helium (wireless), Filecoin (storage), and Render (compute)</li>
                </ul>
              </section>

              {/* The Axiom Solution */}
              <section id="solution" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">4. The Axiom Solution</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4.1 Platform Overview</h3>
                <p className="text-gray-700 leading-relaxed">
                  Axiom Protocol delivers an integrated platform that unifies all aspects of smart city living under a single token economy. Rather than building isolated solutions, we have created interconnected modules that share identity, payment rails, and governance:
                </p>

                <div className="overflow-x-auto my-8">
                  <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Module</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Function</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Identity & Compliance</td>
                        <td className="px-6 py-4 text-sm text-gray-600">KYC/AML verification, citizen credentials, reputation scoring</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Deployed</span></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Treasury & Revenue</td>
                        <td className="px-6 py-4 text-sm text-gray-600">Multi-sig treasury, fee distribution, vault management</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Deployed</span></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Real Estate (KeyGrow)</td>
                        <td className="px-6 py-4 text-sm text-gray-600">Tokenized properties, rent-to-own, fractional shares</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Deployed</span></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">DePIN Infrastructure</td>
                        <td className="px-6 py-4 text-sm text-gray-600">Node sales, staking, leasing, reward distribution</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Deployed</span></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Exchange (DEX)</td>
                        <td className="px-6 py-4 text-sm text-gray-600">Token swaps, liquidity pools, limit orders</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Deployed</span></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Utilities & Metering</td>
                        <td className="px-6 py-4 text-sm text-gray-600">Smart meter integration, utility payments, consumption tracking</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Deployed</span></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Transport & Logistics</td>
                        <td className="px-6 py-4 text-sm text-gray-600">Ride-sharing, deliveries, fleet management</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Deployed</span></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Governance</td>
                        <td className="px-6 py-4 text-sm text-gray-600">Proposal voting, delegation, council management</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Deployed</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4.2 Key Innovations</h3>
                
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-gray-900 mb-3">Tokenized Rent-to-Own (KeyGrow)</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    KeyGrow revolutionizes the path to homeownership by tokenizing properties into 100,000 ERC-1155 fractional shares (0.001% each). When tenants pay rent, 20% is converted to property tokens representing real equity. The $500 Option Consideration is staked in AXM at 8% APR, with rewards accumulating toward the down payment. This creates a verifiable, transparent path from renting to ownership.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-gray-900 mb-3">Unified City Operating System</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Unlike fragmented smart city implementations, Axiom provides a unified identity and payment layer across all services. One wallet handles property access, utility payments, transportation, voting, and investments. This creates network effects where each new service strengthens the entire ecosystem.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-gray-900 mb-3">Community-Owned Infrastructure</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Through the DePIN node marketplace, citizens can purchase and operate the infrastructure that powers city services. Node operators earn AXM rewards from transaction fees, creating aligned incentives between infrastructure providers and users. This model has proven successful in networks like Helium and we extend it to comprehensive urban infrastructure.
                  </p>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4.3 Competitive Advantages</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>First-mover advantage</strong> in blockchain-native smart city development in the United States</li>
                  <li><strong>Integrated ecosystem</strong> versus point solutions requiring multiple tokens and protocols</li>
                  <li><strong>Real utility</strong> driving token demand through actual economic activity, not speculation</li>
                  <li><strong>Institutional-grade security</strong> with 22 active security features and formal verification</li>
                  <li><strong>Regulatory-forward approach</strong> with built-in KYC/AML and compliance infrastructure</li>
                </ul>
              </section>

              {/* Technology Architecture */}
              <section id="technology" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">5. Technology Architecture</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5.1 Blockchain Infrastructure</h3>
                <p className="text-gray-700 leading-relaxed">
                  Axiom Protocol is deployed on Arbitrum One, a leading Ethereum Layer 2 solution providing:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Ethereum security</strong> - Inherits the security guarantees of Ethereum mainnet</li>
                  <li><strong>Low transaction costs</strong> - 10-50x cheaper than Ethereum L1</li>
                  <li><strong>Fast finality</strong> - Sub-second block times with ~250ms confirmation</li>
                  <li><strong>EVM compatibility</strong> - Full compatibility with Ethereum tooling and standards</li>
                </ul>

                <div className="bg-gray-900 text-gray-100 rounded-xl p-6 my-8 font-mono text-sm overflow-x-auto">
                  <div className="text-amber-400 mb-2">// Network Configuration</div>
                  <div><span className="text-blue-400">Network:</span> Arbitrum One (Chain ID: 42161)</div>
                  <div><span className="text-blue-400">RPC:</span> https://arb1.arbitrum.io/rpc</div>
                  <div><span className="text-blue-400">Explorer:</span> https://arbiscan.io</div>
                  <div><span className="text-blue-400">Token:</span> 0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D</div>
                </div>

                <h4 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Future: Universe Blockchain (L3)</h4>
                <p className="text-gray-700 leading-relaxed">
                  Post-TGE, Axiom will launch Universe Blockchain, a dedicated Layer 3 chain built on Arbitrum Orbit technology. This custom chain will use AXM as the native gas token, enabling:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Zero external gas costs for ecosystem transactions</li>
                  <li>Custom precompiles optimized for real estate and DePIN operations</li>
                  <li>Higher throughput for IoT sensor data and micropayments</li>
                  <li>Sovereign sequencer revenue flowing to the treasury</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5.2 Smart Contract Suite</h3>
                <p className="text-gray-700 leading-relaxed">
                  The Axiom Protocol comprises 23 verified smart contracts organized into functional modules:
                </p>

                <div className="grid md:grid-cols-2 gap-4 my-8 not-prose text-sm">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-bold text-gray-900 mb-2">Core Token</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• AxiomV2 (ERC20 + Votes + Permit)</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-bold text-gray-900 mb-2">Identity & Compliance</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• AxiomIdentityComplianceHub</li>
                      <li>• CitizenCredentialRegistry</li>
                      <li>• CitizenReputationOracle</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-bold text-gray-900 mb-2">Treasury & Finance</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• AxiomTreasuryAndRevenueHub</li>
                      <li>• AxiomStakingAndEmissionsHub</li>
                      <li>• CapitalPoolsAndFunds</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-bold text-gray-900 mb-2">Real Estate</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• AxiomLandAndAssetRegistry</li>
                      <li>• LeaseAndRentEngine</li>
                      <li>• RealtorModule</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-bold text-gray-900 mb-2">DePIN</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• DePINNodeSuite</li>
                      <li>• DePINNodeSales</li>
                      <li>• IoTOracleNetwork</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-bold text-gray-900 mb-2">Exchange & Markets</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• AxiomExchangeHub</li>
                      <li>• MarketsAndListingsHub</li>
                      <li>• OracleAndMetricsRelay</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-bold text-gray-900 mb-2">City Services</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• UtilityAndMeteringHub</li>
                      <li>• TransportAndLogisticsHub</li>
                      <li>• SustainabilityHub</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-bold text-gray-900 mb-2">Community</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• CommunitySocialHub</li>
                      <li>• AxiomAcademyHub</li>
                      <li>• GamificationHub</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5.3 Security Framework</h3>
                <p className="text-gray-700 leading-relaxed">
                  Security is paramount for a protocol managing real estate and financial services. Axiom implements 22 active security features across all 23 deployed contracts:
                </p>

                <div className="overflow-x-auto my-8">
                  <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Security Feature</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Implementation</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Verified Contracts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-3 font-medium">OpenZeppelin Contracts</td>
                        <td className="px-4 py-3 text-gray-600">AccessControl, Pausable, ReentrancyGuard, SafeERC20</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">All 24 contracts</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Role-Based Access Control</td>
                        <td className="px-4 py-3 text-gray-600">ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE, COMPLIANCE_ROLE, ORACLE_ROLE</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">0x864F...2539D (AXM)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Pausable Contracts</td>
                        <td className="px-4 py-3 text-gray-600">Emergency pause via onlyRole(ADMIN_ROLE)</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">All 24 contracts</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Reentrancy Guards</td>
                        <td className="px-4 py-3 text-gray-600">nonReentrant on payments, withdrawals, staking, swaps</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">0x3fD6...3A929 (Treasury)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Multi-Sig Treasury</td>
                        <td className="px-4 py-3 text-gray-600">Gnosis Safe treasurySafe/adminSafe integration</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">0x3fD6...3A929 (Treasury)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">SafeERC20 Transfers</td>
                        <td className="px-4 py-3 text-gray-600">safeTransfer, safeTransferFrom for all token operations</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">0x8769...Edbd (DePIN Sales)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Emergency Withdrawals</td>
                        <td className="px-4 py-3 text-gray-600">emergencyWithdrawETH(), emergencyWithdrawAXM()</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">0x8769...Edbd (DePIN Sales)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Anti-Whale Protection</td>
                        <td className="px-4 py-3 text-gray-600">maxTxEnabled with configurable maxTxAmount</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">0x864F...2539D (AXM)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Price Manipulation Protection</td>
                        <td className="px-4 py-3 text-gray-600">Price bounds, minimum liquidity checks, admin verification</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">0x8769...Edbd (DePIN Sales)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Rate Limiting & Cooldowns</td>
                        <td className="px-4 py-3 text-gray-600">1 min (IoT), 1 day (Reputation) cooldowns</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">0xe38B...ec1a (IoT Oracle)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Oracle Consensus</td>
                        <td className="px-4 py-3 text-gray-600">MIN_ORACLE_CONSENSUS (3+) confirmations required</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">0xe38B...ec1a (IoT Oracle)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">DOS Prevention Limits</td>
                        <td className="px-4 py-3 text-gray-600">MAX_QUESTS (50), MAX_ENROLLMENTS (100), MAX_ACHIEVEMENTS (500)</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">0x7F45...f93 (Gamification)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Investment Lock-up Periods</td>
                        <td className="px-4 py-3 text-gray-600">Configurable lock-up before withdrawals</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">0xFcCd...a701 (Capital Pools)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Formal Verification</td>
                        <td className="px-4 py-3 text-gray-600">SMTChecker proofs: assert, underflow, overflow, divByZero</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">0x864F...2539D (AXM)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">Static Analysis</td>
                        <td className="px-4 py-3 text-gray-600">Slither analysis: zero critical vulnerabilities</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">All 24 contracts</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-6 my-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🔒</span>
                    <h4 className="font-bold text-green-900">Security Rating: 8.7/10</h4>
                  </div>
                  <p className="text-green-800 text-sm">22 active security features implemented. 3 additional features planned post-TGE: external security audit, bug bounty program, and insurance fund.</p>
                </div>
              </section>

              {/* Tokenomics */}
              <section id="tokenomics" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">6. Tokenomics</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6.1 AXM Token</h3>
                <p className="text-gray-700 leading-relaxed">
                  The Axiom Protocol Token (AXM) is the native governance and utility token powering the entire ecosystem. Key specifications:
                </p>

                <div className="bg-gray-900 text-gray-100 rounded-xl p-6 my-6 font-mono text-sm">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><span className="text-amber-400">Token Name:</span> Axiom Protocol Token</div>
                    <div><span className="text-amber-400">Symbol:</span> AXM</div>
                    <div><span className="text-amber-400">Standard:</span> ERC-20 (+ Votes, Permit, Burnable)</div>
                    <div><span className="text-amber-400">Decimals:</span> 18</div>
                    <div><span className="text-amber-400">Max Supply:</span> 15,000,000,000 (15 Billion)</div>
                    <div><span className="text-amber-400">Network:</span> Arbitrum One (Chain ID: 42161)</div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 my-6">
                  <h4 className="font-bold text-blue-900 mb-4">On-Chain Supply Data (Live from Arbiscan)</h4>
                  <div className="grid md:grid-cols-3 gap-6 text-sm">
                    <div>
                      <p className="text-blue-600 font-medium">Max Supply (Hard Cap)</p>
                      <p className="text-2xl font-bold text-blue-900">{SUPPLY_DATA.maxSupply}</p>
                      <p className="text-blue-600 text-xs">Immutable in contract</p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">Current Minted Supply</p>
                      <p className="text-2xl font-bold text-blue-900">{SUPPLY_DATA.currentMinted}</p>
                      <p className="text-blue-600 text-xs">Initial liquidity allocation</p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">Current Holders</p>
                      <p className="text-2xl font-bold text-blue-900">{SUPPLY_DATA.holders}</p>
                      <p className="text-blue-600 text-xs">Verified on Arbiscan</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-xs text-blue-700">
                      <strong>Contract Address:</strong>{' '}
                      <a 
                        href={`https://arbiscan.io/token/${CONTRACTS.AXM_TOKEN}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-mono hover:underline"
                      >
                        {CONTRACTS.AXM_TOKEN}
                      </a>
                    </p>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6.2 Supply Distribution</h3>
                
                <div className="overflow-x-auto my-8">
                  <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Allocation</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Percentage</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Tokens</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Vesting</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Ecosystem & Rewards</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">25%</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">3,750,000,000</td>
                        <td className="px-6 py-4 text-sm text-gray-600">10% TGE, 36-month linear</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Treasury</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">20%</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">3,000,000,000</td>
                        <td className="px-6 py-4 text-sm text-gray-600">6-month cliff, 48-month linear</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Public Sale</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">15%</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">2,250,000,000</td>
                        <td className="px-6 py-4 text-sm text-gray-600">100% at TGE</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Team & Advisors</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">15%</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">2,250,000,000</td>
                        <td className="px-6 py-4 text-sm text-gray-600">12-month cliff, 36-month linear</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Liquidity</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">10%</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">1,500,000,000</td>
                        <td className="px-6 py-4 text-sm text-gray-600">100% at TGE for DEX pools</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Development</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">10%</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">1,500,000,000</td>
                        <td className="px-6 py-4 text-sm text-gray-600">5% TGE, 3-month cliff, 24-month linear</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Marketing</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">5%</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">750,000,000</td>
                        <td className="px-6 py-4 text-sm text-gray-600">20% TGE, 12-month linear</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-amber-100">
                      <tr>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">Total</td>
                        <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">100%</td>
                        <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">15,000,000,000</td>
                        <td className="px-6 py-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6.3 Utility & Value Accrual</h3>
                <p className="text-gray-700 leading-relaxed">
                  AXM token accrues value through multiple utility mechanisms:
                </p>

                <div className="grid md:grid-cols-2 gap-6 my-8 not-prose">
                  <div className="border border-gray-200 rounded-xl p-6">
                    <div className="text-2xl mb-3">🗳️</div>
                    <h4 className="font-bold text-gray-900 mb-2">Governance</h4>
                    <p className="text-gray-600 text-sm">Vote on protocol proposals, parameter changes, and treasury allocations. Voting power proportional to staked AXM.</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-6">
                    <div className="text-2xl mb-3">💰</div>
                    <h4 className="font-bold text-gray-900 mb-2">Staking Rewards</h4>
                    <p className="text-gray-600 text-sm">Stake AXM in tiered pools to earn yield from protocol fees and emissions. Higher tiers unlock premium features.</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-6">
                    <div className="text-2xl mb-3">⛽</div>
                    <h4 className="font-bold text-gray-900 mb-2">Fee Payment</h4>
                    <p className="text-gray-600 text-sm">Pay transaction fees on internal DEX, node purchases, utility bills, and platform services. Future: native gas on L3.</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-6">
                    <div className="text-2xl mb-3">🏠</div>
                    <h4 className="font-bold text-gray-900 mb-2">KeyGrow Staking</h4>
                    <p className="text-gray-600 text-sm">Option Consideration deposits staked in AXM at 8% APR, with rewards accumulating toward property down payments.</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-6">
                    <div className="text-2xl mb-3">🔌</div>
                    <h4 className="font-bold text-gray-900 mb-2">DePIN Node Purchase</h4>
                    <p className="text-gray-600 text-sm">Buy nodes with AXM at discounted rates. Node operators earn AXM rewards from transaction fees.</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-6">
                    <div className="text-2xl mb-3">🔥</div>
                    <h4 className="font-bold text-gray-900 mb-2">Deflationary Mechanics</h4>
                    <p className="text-gray-600 text-sm">Portion of transaction fees burned, reducing supply over time. Treasury buybacks provide additional burn pressure.</p>
                  </div>
                </div>
              </section>

              {/* Ecosystem Components */}
              <section id="ecosystem" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">7. Ecosystem Components</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7.1 KeyGrow Rent-to-Own</h3>
                <p className="text-gray-700 leading-relaxed">
                  KeyGrow is the flagship real estate product enabling tenants to build ownership equity through tokenized property shares.
                </p>

                <div className="bg-amber-50 rounded-xl p-6 my-6">
                  <h4 className="font-bold text-gray-900 mb-4">How KeyGrow Works</h4>
                  <ol className="list-decimal pl-6 text-gray-700 space-y-3 text-sm">
                    <li><strong>Property Tokenization:</strong> Each property is tokenized into 100,000 ERC-1155 shares (0.001% each)</li>
                    <li><strong>Option Consideration:</strong> Tenant pays $500 option fee, staked in AXM at 8% APR</li>
                    <li><strong>Monthly Rent:</strong> 20% of each rent payment converts to property tokens</li>
                    <li><strong>Equity Accumulation:</strong> Tokens accumulate in tenant's wallet, representing real ownership stake</li>
                    <li><strong>Purchase Option:</strong> At any time, tenant can exercise option to purchase at locked price</li>
                    <li><strong>Staking Rewards:</strong> Option Consideration staking rewards credited toward down payment</li>
                  </ol>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  KeyGrow properties are sourced through integration with ATTOM Data (property valuations) and RentCast (rental estimates), filtered to the affordable range ($50,000 - $375,000). Financial metrics including price-to-rent ratio, affordability index, and time-to-ownership estimates help tenants make informed decisions.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7.2 DePIN Node Network</h3>
                <p className="text-gray-700 leading-relaxed">
                  The Axiom DePIN network enables community ownership of smart city infrastructure through tiered node products:
                </p>

                <div className="overflow-x-auto my-6">
                  <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Node Tier</th>
                        <th className="px-4 py-3 text-right font-semibold">Price (ETH)</th>
                        <th className="px-4 py-3 text-right font-semibold">Monthly Rewards</th>
                        <th className="px-4 py-3 text-left font-semibold">Use Case</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr><td className="px-4 py-3 font-medium">Micro Node</td><td className="px-4 py-3 text-right">0.05</td><td className="px-4 py-3 text-right">$15-25</td><td className="px-4 py-3">Home IoT sensors, air quality</td></tr>
                      <tr><td className="px-4 py-3 font-medium">Lite Node</td><td className="px-4 py-3 text-right">0.15</td><td className="px-4 py-3 text-right">$45-75</td><td className="px-4 py-3">Traffic monitoring, parking</td></tr>
                      <tr><td className="px-4 py-3 font-medium">Standard Node</td><td className="px-4 py-3 text-right">0.5</td><td className="px-4 py-3 text-right">$150-250</td><td className="px-4 py-3">Energy metering, building automation</td></tr>
                      <tr><td className="px-4 py-3 font-medium">Pro Node</td><td className="px-4 py-3 text-right">1.0</td><td className="px-4 py-3 text-right">$300-500</td><td className="px-4 py-3">Industrial IoT, fleet management</td></tr>
                      <tr><td className="px-4 py-3 font-medium">Enterprise Node</td><td className="px-4 py-3 text-right">2.5</td><td className="px-4 py-3 text-right">$750-1,250</td><td className="px-4 py-3">Data centers, critical infrastructure</td></tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7.3 Decentralized Exchange</h3>
                <p className="text-gray-700 leading-relaxed">
                  The Axiom Exchange Hub provides internal DEX functionality for ecosystem tokens:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Token Swaps:</strong> Exchange AXM, property tokens, and wrapped assets</li>
                  <li><strong>Liquidity Pools:</strong> Provide liquidity to earn trading fees</li>
                  <li><strong>Limit Orders:</strong> Set price targets for automated execution</li>
                  <li><strong>Staking:</strong> Stake LP tokens for additional AXM rewards</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  External liquidity is provided through Camelot Exchange and Uniswap V3 on Arbitrum, ensuring price discovery and accessibility for the broader DeFi ecosystem.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7.4 Governance System</h3>
                <p className="text-gray-700 leading-relaxed">
                  Axiom implements comprehensive on-chain governance:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Proposal Creation:</strong> Token holders meeting threshold can submit proposals</li>
                  <li><strong>Voting:</strong> ERC20Votes enables delegation and snapshot voting</li>
                  <li><strong>Council:</strong> Elected council members for expedited decisions</li>
                  <li><strong>Treasury Grants:</strong> DAO-controlled grants for ecosystem development</li>
                  <li><strong>Parameter Changes:</strong> Community votes on fees, rates, and thresholds</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7.5 Axiom SUSU - Community Savings Pools</h3>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-gray-900 mb-3">On-Chain Rotating Savings (ROSCA)</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    SUSU is a time-tested community savings system brought on-chain. Members pool funds together, and each person takes turns receiving the full pot. This traditional practice used globally for generations is now transparent, secure, and automated through smart contracts.
                  </p>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  The AxiomSusuHub contract ({`{CONTRACTS.SUSU_HUB}`}) enables community-based rotating savings pools:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Flexible Pool Sizes:</strong> 2-50 members per pool with configurable contribution amounts</li>
                  <li><strong>Cycle Options:</strong> Weekly, monthly, or custom duration (1-90 days)</li>
                  <li><strong>Payout Order:</strong> Sequential or randomized rotation for fairness</li>
                  <li><strong>Grace Periods:</strong> Configurable grace periods with late payment penalties</li>
                  <li><strong>Multi-Token:</strong> Supports AXM and any ERC20 token</li>
                  <li><strong>Protocol Fees:</strong> 1% default fee routed to Axiom treasury</li>
                </ul>
                <div className="bg-gray-50 rounded-xl p-5 mt-6">
                  <h4 className="font-bold text-gray-900 mb-3">Example SUSU Pool</h4>
                  <p className="text-gray-600 text-sm">
                    10 members each contribute 100 AXM monthly. Each month, one member receives 990 AXM (after 1% protocol fee). After 10 months, every member has received the pot exactly once - creating a powerful community savings mechanism without traditional banking.
                  </p>
                </div>
              </section>

              {/* National Bank of Axiom */}
              <section id="banking" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">8. National Bank of Axiom</h2>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg mb-8">
                  <p className="text-gray-800 leading-relaxed m-0">
                    The <strong>National Bank of Axiom</strong> is a comprehensive on-chain banking infrastructure providing full-service digital banking products powered by the AXM token. Designed to serve all citizens of the Axiom Smart City ecosystem, it offers institutional-grade financial services accessible without traditional credit requirements.
                  </p>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8.1 Personal Banking</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Personal banking products designed for everyday financial needs with competitive on-chain yields:
                </p>
                <div className="grid md:grid-cols-2 gap-4 not-prose mb-6">
                  <div className="border border-gray-200 rounded-xl p-5 bg-white">
                    <h4 className="font-bold text-gray-900 mb-2">Deposit Accounts</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>Standard Checking (0.5% APY)</li>
                      <li>Premium Checking (2.5% APY)</li>
                      <li>High-Yield Savings (5.0% APY)</li>
                      <li>Money Market (6.5% APY)</li>
                      <li>1-Year CD (7.5% APY)</li>
                      <li>5-Year CD (10.0% APY)</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-5 bg-white">
                    <h4 className="font-bold text-gray-900 mb-2">Key Features</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>Zero monthly fees</li>
                      <li>Instant AXM transfers</li>
                      <li>Mobile banking app</li>
                      <li>Governance voting rights</li>
                      <li>FDIC-style insurance backing</li>
                      <li>24/7 digital access</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8.2 Business Banking</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Enterprise-grade business banking with global payment capabilities and instant settlements:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Business Checking:</strong> Unlimited transactions, multi-user access, payroll integration</li>
                  <li><strong>Business Savings:</strong> 4.5% APY with tiered interest rates</li>
                  <li><strong>Merchant Payment Processing:</strong> 1.5% + $0.10 per transaction with instant settlement</li>
                  <li><strong>Small Business Loans:</strong> Up to 500,000 AXM at 6.5% APR, revenue-based repayment</li>
                  <li><strong>Merchant Cash Advance:</strong> Fast working capital in 24 hours, factor rate 1.2-1.4</li>
                  <li><strong>Treasury Management:</strong> Enterprise-grade cash pooling and liquidity optimization</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8.3 Investment Services</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Complete investment platform with tokenized securities and on-chain wealth management:
                </p>
                <div className="overflow-x-auto my-6">
                  <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Product</th>
                        <th className="px-4 py-3 text-left font-semibold">Features</th>
                        <th className="px-4 py-3 text-right font-semibold">Minimum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr><td className="px-4 py-3 font-medium">Self-Directed Brokerage</td><td className="px-4 py-3">$0 commissions, fractional shares, extended hours</td><td className="px-4 py-3 text-right">$0</td></tr>
                      <tr><td className="px-4 py-3 font-medium">Robo-Advisor</td><td className="px-4 py-3">AI-powered allocation, auto-rebalancing, 0.25% annually</td><td className="px-4 py-3 text-right">100 AXM</td></tr>
                      <tr><td className="px-4 py-3 font-medium">Crypto IRA</td><td className="px-4 py-3">Tax-advantaged, Traditional & Roth options</td><td className="px-4 py-3 text-right">500 AXM</td></tr>
                      <tr><td className="px-4 py-3 font-medium">Fractional Real Estate</td><td className="px-4 py-3">6-9% rental yield, monthly dividends</td><td className="px-4 py-3 text-right">100 AXM</td></tr>
                      <tr><td className="px-4 py-3 font-medium">Infrastructure Bonds</td><td className="px-4 py-3">4.5% APY, tax-free income, government backed</td><td className="px-4 py-3 text-right">5,000 AXM</td></tr>
                      <tr><td className="px-4 py-3 font-medium">Private Wealth Management</td><td className="px-4 py-3">Personal advisor, custom strategies, 0.75% annually</td><td className="px-4 py-3 text-right">500,000 AXM</td></tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8.4 Credit Products</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Credit products accessible to all citizens, with crypto-native collateral options:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Axiom Rewards Credit Card:</strong> 3% AXM cashback, no annual fee, crypto rewards auto-deposited</li>
                  <li><strong>Personal Loans:</strong> Up to 50,000 AXM at 8.5% APR, no collateral required</li>
                  <li><strong>Crypto-Backed Loans:</strong> 3.5% APR, 50-70% LTV, keep your crypto upside</li>
                  <li><strong>Mortgage Products:</strong> First-time buyer programs, on-chain closing, integration with KeyGrow</li>
                </ul>
              </section>

              {/* Wall Street Integration */}
              <section id="wall-street" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">9. Wall Street Integration</h2>
                
                <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-lg mb-8">
                  <p className="text-gray-800 leading-relaxed m-0">
                    The <strong>MarketsAndListingsHub</strong> contract provides the foundation for Wall Street integration and Real World Asset (RWA) marketplace functionality. This enables tokenized securities, institutional-grade trading, and compliant investment products within the Axiom ecosystem.
                  </p>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9.1 Tokenized Securities</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  The platform supports multiple tokenized asset types:
                </p>
                <div className="grid md:grid-cols-4 gap-4 not-prose mb-6">
                  <div className="border border-gray-200 rounded-xl p-4 bg-white text-center">
                    <div className="text-2xl mb-2">📈</div>
                    <h4 className="font-bold text-gray-900 text-sm">Stocks</h4>
                    <p className="text-xs text-gray-500">Tokenized equities</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-4 bg-white text-center">
                    <div className="text-2xl mb-2">📜</div>
                    <h4 className="font-bold text-gray-900 text-sm">Bonds</h4>
                    <p className="text-xs text-gray-500">Government/Corporate</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-4 bg-white text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <h4 className="font-bold text-gray-900 text-sm">ETFs</h4>
                    <p className="text-xs text-gray-500">Index funds</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-4 bg-white text-center">
                    <div className="text-2xl mb-2">🏘️</div>
                    <h4 className="font-bold text-gray-900 text-sm">REITs</h4>
                    <p className="text-xs text-gray-500">Real estate trusts</p>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9.2 RWA Marketplace</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  The Real World Asset marketplace includes:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Order Book Trading:</strong> Secondary market with buy/sell orders and partial fills</li>
                  <li><strong>Investor Compliance:</strong> Built-in KYC/AML with accreditation verification</li>
                  <li><strong>Regulatory Hooks:</strong> Support for Reg D, Reg S, and Reg A+ securities offerings</li>
                  <li><strong>Settlement & Custody:</strong> USDC-based settlement with escrow management</li>
                  <li><strong>Dividend Distribution:</strong> Automated coupon and dividend payments to token holders</li>
                  <li><strong>Price Oracles:</strong> Fair market value integration for accurate pricing</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9.3 Future Development</h3>
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-gray-900 mb-4">Axiom Stock Exchange Roadmap</h4>
                  <ul className="text-gray-700 space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">○</span>
                      <span><strong>Phase 1:</strong> Tokenized mutual funds and index products (Q2 2026)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">○</span>
                      <span><strong>Phase 2:</strong> SEC-compliant security token offerings (Q3 2026)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">○</span>
                      <span><strong>Phase 3:</strong> Derivatives and options trading (Q4 2026)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">○</span>
                      <span><strong>Phase 4:</strong> Institutional trading desk and prime brokerage (2027)</span>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Governance & Compliance */}
              <section id="governance" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">10. Governance & Compliance</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10.1 DAO Structure</h3>
                <p className="text-gray-700 leading-relaxed">
                  Axiom operates as a Decentralized Autonomous Organization with progressive decentralization. Initially, core team retains certain admin keys for rapid iteration, with planned transition to full community control:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Phase 1 (Current):</strong> Core team controls admin functions, community votes on major decisions</li>
                  <li><strong>Phase 2 (Post-TGE):</strong> Multi-sig with community members, timelock on critical functions</li>
                  <li><strong>Phase 3 (Mature):</strong> Full DAO control, admin keys burned or transferred to governance</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10.2 ISO 20022 Compliance</h3>
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">✅</span>
                    <h4 className="font-bold text-green-900">Implemented</h4>
                  </div>
                  <p className="text-green-800 text-sm mb-3">
                    Axiom's financial messaging infrastructure is designed for ISO 20022 compatibility, the global standard for electronic data interchange between financial institutions:
                  </p>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>Structured payment messaging format support</li>
                    <li>Rich remittance information capabilities</li>
                    <li>Cross-border payment interoperability</li>
                    <li>Machine-readable transaction data</li>
                  </ul>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10.3 GENIUS Act Compliance</h3>
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">✅</span>
                    <h4 className="font-bold text-green-900">Implemented</h4>
                  </div>
                  <p className="text-green-800 text-sm mb-3">
                    The platform is designed with GENIUS Act (Guiding and Establishing National Innovation for U.S. Stablecoins) compliance considerations:
                  </p>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>Reserve requirements and proof-of-reserves infrastructure</li>
                    <li>Consumer protection mechanisms</li>
                    <li>Anti-money laundering (AML) compliance hooks</li>
                    <li>Regulatory reporting capabilities</li>
                  </ul>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10.4 KYC/AML Compliance</h3>
                <p className="text-gray-700 leading-relaxed">
                  The AxiomIdentityComplianceHub (0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED) provides built-in compliance infrastructure:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Identity Verification:</strong> KYC integration for regulated activities</li>
                  <li><strong>Sanctions Screening:</strong> OFAC and global sanctions list checking</li>
                  <li><strong>Transaction Monitoring:</strong> Suspicious activity detection and reporting</li>
                  <li><strong>Tiered Access:</strong> Different verification levels for different activities</li>
                  <li><strong>COMPLIANCE_ROLE:</strong> Role-based access control for compliance officers</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10.5 PMA Trust Structure</h3>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-gray-900 mb-3">Private Membership Association</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Axiom operates as a <strong>Private Membership Association (PMA) Trust</strong> - a private, unincorporated organization that operates outside of public commerce under constitutional rights of freedom of association and contract. This structure provides enhanced privacy and contractual flexibility for members.
                  </p>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Constitutional protections for PMA members include:
                </p>
                <div className="grid md:grid-cols-2 gap-4 not-prose mb-6">
                  <div className="border border-blue-200 bg-blue-50 rounded-xl p-4">
                    <div className="font-bold text-blue-800 mb-1">1st Amendment</div>
                    <p className="text-blue-700 text-sm">Freedom of Association & Assembly</p>
                  </div>
                  <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                    <div className="font-bold text-green-800 mb-1">4th Amendment</div>
                    <p className="text-green-700 text-sm">Right to Privacy</p>
                  </div>
                  <div className="border border-purple-200 bg-purple-50 rounded-xl p-4">
                    <div className="font-bold text-purple-800 mb-1">5th & 14th Amendment</div>
                    <p className="text-purple-700 text-sm">Due Process Rights</p>
                  </div>
                  <div className="border border-orange-200 bg-orange-50 rounded-xl p-4">
                    <div className="font-bold text-orange-800 mb-1">9th & 10th Amendment</div>
                    <p className="text-orange-700 text-sm">Unenumerated & Reserved Rights</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  The PMA Trust structure enables tokenized membership using whitelist-only ERC-1155/1400 tokens as membership certificates (not securities), with transfer restrictions and revocability clauses. Full documentation available at <Link href="/pma" className="text-amber-600 hover:underline">/pma</Link>.
                </p>
              </section>

              {/* Roadmap */}
              <section id="roadmap" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">11. Development Roadmap</h2>
                
                <div className="space-y-8 my-8">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-24 text-right">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">Q4 2025</span>
                    </div>
                    <div className="flex-1 border-l-2 border-green-500 pl-6 pb-6">
                      <h4 className="font-bold text-gray-900">Foundation Phase (Current)</h4>
                      <ul className="text-gray-600 text-sm mt-2 space-y-1">
                        <li>✓ Deploy 24 smart contracts on Arbitrum One</li>
                        <li>✓ Verify all contracts on Arbiscan & Blockscout</li>
                        <li>✓ Launch KeyGrow rent-to-own platform</li>
                        <li>✓ Establish liquidity on Camelot Exchange</li>
                        <li>✓ Establish liquidity on Uniswap V3 (Arbitrum)</li>
                        <li>✓ Complete formal verification with SMTChecker</li>
                        <li>✓ Apply for CoinGecko & CoinMarketCap listings</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-24 text-right">
                      <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded">Q1 2026</span>
                    </div>
                    <div className="flex-1 border-l-2 border-amber-500 pl-6 pb-6">
                      <h4 className="font-bold text-gray-900">Token Generation Event</h4>
                      <ul className="text-gray-600 text-sm mt-2 space-y-1">
                        <li>○ CoinGecko & CoinMarketCap live listings</li>
                        <li>○ Public token sale</li>
                        <li>○ Exchange listings (CEX partnerships)</li>
                        <li>○ TGE soft cap completion</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-24 text-right">
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded">Q2 2026</span>
                    </div>
                    <div className="flex-1 border-l-2 border-gray-300 pl-6 pb-6">
                      <h4 className="font-bold text-gray-900">Ecosystem Expansion</h4>
                      <ul className="text-gray-600 text-sm mt-2 space-y-1">
                        <li>○ External security audit (Post-TGE funding)</li>
                        <li>○ Bug bounty program launch</li>
                        <li>○ DePIN node hardware partnerships</li>
                        <li>○ First physical nodes deployed</li>
                        <li>○ Mobile app launch (iOS/Android)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-24 text-right">
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded">Q3-Q4 2026</span>
                    </div>
                    <div className="flex-1 border-l-2 border-gray-300 pl-6 pb-6">
                      <h4 className="font-bold text-gray-900">Layer 3 Launch</h4>
                      <ul className="text-gray-600 text-sm mt-2 space-y-1">
                        <li>○ Universe Blockchain (L3) testnet</li>
                        <li>○ AXM as native gas token</li>
                        <li>○ IoT data throughput optimization</li>
                        <li>○ Institutional partnerships</li>
                        <li>○ First KeyGrow property closings</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-24 text-right">
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded">2027+</span>
                    </div>
                    <div className="flex-1 border-l-2 border-gray-300 pl-6">
                      <h4 className="font-bold text-gray-900">Smart City Development</h4>
                      <ul className="text-gray-600 text-sm mt-2 space-y-1">
                        <li>○ Physical smart city groundbreaking</li>
                        <li>○ Municipal service integrations</li>
                        <li>○ Full DAO governance transition</li>
                        <li>○ Institutional RWA marketplace</li>
                        <li>○ Multi-city expansion planning</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Financial Projections */}
              <section id="financials" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">12. Financial Projections</h2>
                
                <p className="text-gray-700 leading-relaxed">
                  Revenue projections are based on conservative adoption assumptions across platform services:
                </p>

                <div className="overflow-x-auto my-8">
                  <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Revenue Stream</th>
                        <th className="px-4 py-3 text-right font-semibold">Year 1</th>
                        <th className="px-4 py-3 text-right font-semibold">Year 2</th>
                        <th className="px-4 py-3 text-right font-semibold">Year 3</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr><td className="px-4 py-3">DePIN Node Sales</td><td className="px-4 py-3 text-right">$2.5M</td><td className="px-4 py-3 text-right">$8M</td><td className="px-4 py-3 text-right">$20M</td></tr>
                      <tr><td className="px-4 py-3">KeyGrow Option Fees</td><td className="px-4 py-3 text-right">$500K</td><td className="px-4 py-3 text-right">$2M</td><td className="px-4 py-3 text-right">$5M</td></tr>
                      <tr><td className="px-4 py-3">DEX Trading Fees</td><td className="px-4 py-3 text-right">$200K</td><td className="px-4 py-3 text-right">$1M</td><td className="px-4 py-3 text-right">$3M</td></tr>
                      <tr><td className="px-4 py-3">Utility Payments</td><td className="px-4 py-3 text-right">$100K</td><td className="px-4 py-3 text-right">$500K</td><td className="px-4 py-3 text-right">$2M</td></tr>
                      <tr><td className="px-4 py-3">Staking Protocol Fees</td><td className="px-4 py-3 text-right">$150K</td><td className="px-4 py-3 text-right">$600K</td><td className="px-4 py-3 text-right">$1.5M</td></tr>
                    </tbody>
                    <tfoot className="bg-amber-50">
                      <tr>
                        <td className="px-4 py-3 font-bold">Total Revenue</td>
                        <td className="px-4 py-3 text-right font-bold">$3.45M</td>
                        <td className="px-4 py-3 text-right font-bold">$12.1M</td>
                        <td className="px-4 py-3 text-right font-bold">$31.5M</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="text-gray-600 text-sm italic">
                  Note: Projections are forward-looking estimates based on assumed market conditions and adoption rates. Actual results may vary significantly.
                </p>
              </section>

              {/* Risk Factors & Mitigations */}
              <section id="risks" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">13. Risk Factors & Mitigations</h2>
                
                <p className="text-gray-700 leading-relaxed mb-6">
                  Prospective participants should carefully consider the following risk factors. We have implemented significant mitigations for many of these risks:
                </p>

                {/* Mitigated Risks */}
                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Mitigated Risks</h3>
                <div className="space-y-4 mb-8">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <h4 className="font-bold text-green-800">Financial Messaging Standards</h4>
                    </div>
                    <p className="text-green-700 text-sm mt-1"><strong>Mitigation:</strong> ISO 20022 compliance implemented for structured financial messaging, cross-border interoperability, and machine-readable transaction data.</p>
                  </div>
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <h4 className="font-bold text-green-800">Stablecoin Regulatory Framework</h4>
                    </div>
                    <p className="text-green-700 text-sm mt-1"><strong>Mitigation:</strong> GENIUS Act compliance framework implemented with reserve requirements, consumer protections, and regulatory reporting capabilities.</p>
                  </div>
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <h4 className="font-bold text-green-800">Identity & Compliance</h4>
                    </div>
                    <p className="text-green-700 text-sm mt-1"><strong>Mitigation:</strong> AxiomIdentityComplianceHub deployed with KYC/AML integration, OFAC screening, transaction monitoring, and tiered access controls.</p>
                  </div>
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <h4 className="font-bold text-green-800">Smart Contract Security</h4>
                    </div>
                    <p className="text-green-700 text-sm mt-1"><strong>Mitigation:</strong> 22 active security features including formal verification (SMTChecker), static analysis (Slither), reentrancy guards, pausable contracts, and multi-sig controls.</p>
                  </div>
                </div>

                {/* Remaining Risks */}
                <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Remaining Risks</h3>
                <div className="space-y-4">
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                    <h4 className="font-bold text-amber-800">Evolving Regulatory Landscape</h4>
                    <p className="text-amber-700 text-sm mt-1">While compliance frameworks are in place, cryptocurrency and tokenized real estate regulations continue to evolve. Future changes could require platform modifications.</p>
                  </div>
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                    <h4 className="font-bold text-amber-800">External Audit Pending</h4>
                    <p className="text-amber-700 text-sm mt-1">While internal security measures are extensive, external third-party security audit is scheduled for Q2 2026 following TGE soft cap completion.</p>
                  </div>
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                    <h4 className="font-bold text-red-800">Market Volatility</h4>
                    <p className="text-red-700 text-sm mt-1">Token prices are highly volatile. Real estate markets are cyclical. Both markets could experience significant downturns.</p>
                  </div>
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                    <h4 className="font-bold text-red-800">Execution Risk</h4>
                    <p className="text-red-700 text-sm mt-1">Physical smart city development involves significant capital, timeline, and coordination risks that could delay or prevent completion.</p>
                  </div>
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                    <h4 className="font-bold text-red-800">Infrastructure Dependency</h4>
                    <p className="text-red-700 text-sm mt-1">Dependence on third-party infrastructure (Arbitrum, Ethereum) creates platform risk if underlying networks experience issues.</p>
                  </div>
                </div>
              </section>

              {/* Legal Disclosures */}
              <section id="legal" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">14. Legal Disclosures</h2>
                
                <div className="bg-gray-50 rounded-xl p-6 text-sm text-gray-600 space-y-4">
                  <p>
                    <strong>Not Financial Advice:</strong> This whitepaper is for informational purposes only and does not constitute financial, investment, legal, or tax advice. Consult with qualified professionals before making any investment decisions.
                  </p>
                  <p>
                    <strong>No Securities Offering:</strong> AXM tokens are utility tokens designed for use within the Axiom Protocol ecosystem. This document does not constitute an offer to sell or solicitation to buy securities in any jurisdiction.
                  </p>
                  <p>
                    <strong>Forward-Looking Statements:</strong> This document contains forward-looking statements regarding future plans, projections, and expectations. Actual results may differ materially from those expressed or implied.
                  </p>
                  <p>
                    <strong>No Guarantees:</strong> There is no guarantee of token value, platform functionality, or investment returns. Participants may lose some or all of their contribution.
                  </p>
                  <p>
                    <strong>Jurisdictional Restrictions:</strong> AXM tokens may not be available in all jurisdictions. It is the responsibility of participants to ensure compliance with local laws and regulations.
                  </p>
                </div>
              </section>

              {/* Appendix A: Verified Contracts */}
              <section id="appendix-contracts" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">Appendix A: Verified Contract Addresses</h2>
                
                <p className="text-gray-700 leading-relaxed mb-6">
                  All 24 smart contracts are deployed on Arbitrum One (Chain ID: 42161) and verified on both Arbiscan and Blockscout explorers. Click any address to view the verified source code.
                </p>

                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Contract</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Address</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-mono">
                      <tr className="bg-amber-50">
                        <td className="px-4 py-2 font-medium text-gray-900">AxiomV2 (AXM Token)</td>
                        <td className="px-4 py-2"><a href={`https://arbiscan.io/address/${CONTRACTS.AXM_TOKEN}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{CONTRACTS.AXM_TOKEN}</a></td>
                        <td className="px-4 py-2 text-gray-600 font-sans">ERC20 governance token</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-gray-900">AxiomIdentityComplianceHub</td>
                        <td className="px-4 py-2"><a href={`https://arbiscan.io/address/${CONTRACTS.IDENTITY}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{CONTRACTS.IDENTITY}</a></td>
                        <td className="px-4 py-2 text-gray-600 font-sans">KYC/AML compliance</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-gray-900">AxiomTreasuryAndRevenueHub</td>
                        <td className="px-4 py-2"><a href={`https://arbiscan.io/address/${CONTRACTS.TREASURY}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{CONTRACTS.TREASURY}</a></td>
                        <td className="px-4 py-2 text-gray-600 font-sans">Multi-sig treasury</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-gray-900">AxiomStakingAndEmissionsHub</td>
                        <td className="px-4 py-2"><a href={`https://arbiscan.io/address/${CONTRACTS.STAKING}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{CONTRACTS.STAKING}</a></td>
                        <td className="px-4 py-2 text-gray-600 font-sans">Tiered staking pools</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-gray-900">AxiomLandAndAssetRegistry</td>
                        <td className="px-4 py-2"><a href={`https://arbiscan.io/address/${CONTRACTS.LAND_REGISTRY}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{CONTRACTS.LAND_REGISTRY}</a></td>
                        <td className="px-4 py-2 text-gray-600 font-sans">Land/asset registration</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-gray-900">LeaseAndRentEngine</td>
                        <td className="px-4 py-2"><a href={`https://arbiscan.io/address/${CONTRACTS.LEASE_ENGINE}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{CONTRACTS.LEASE_ENGINE}</a></td>
                        <td className="px-4 py-2 text-gray-600 font-sans">KeyGrow rent-to-own</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-gray-900">DePINNodeSales</td>
                        <td className="px-4 py-2"><a href={`https://arbiscan.io/address/${CONTRACTS.DEPIN_SALES}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{CONTRACTS.DEPIN_SALES}</a></td>
                        <td className="px-4 py-2 text-gray-600 font-sans">Node marketplace</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-gray-900">DePINNodeSuite</td>
                        <td className="px-4 py-2"><a href={`https://arbiscan.io/address/${CONTRACTS.DEPIN_SUITE}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{CONTRACTS.DEPIN_SUITE}</a></td>
                        <td className="px-4 py-2 text-gray-600 font-sans">Node staking/leasing</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-gray-900">AxiomExchangeHub</td>
                        <td className="px-4 py-2"><a href={`https://arbiscan.io/address/${CONTRACTS.DEX}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{CONTRACTS.DEX}</a></td>
                        <td className="px-4 py-2 text-gray-600 font-sans">Internal DEX</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-gray-900">CrossChainAndLaunchModule</td>
                        <td className="px-4 py-2"><a href={`https://arbiscan.io/address/${CONTRACTS.CROSSCHAIN}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{CONTRACTS.CROSSCHAIN}</a></td>
                        <td className="px-4 py-2 text-gray-600 font-sans">Cross-chain/TGE</td>
                      </tr>
                      <tr className="bg-purple-50">
                        <td className="px-4 py-2 font-medium text-gray-900">AxiomSusuHub</td>
                        <td className="px-4 py-2"><a href={`https://arbiscan.io/address/${CONTRACTS.SUSU_HUB}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{CONTRACTS.SUSU_HUB}</a></td>
                        <td className="px-4 py-2 text-gray-600 font-sans">Community savings (ROSCA)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-gray-500 text-xs mt-4 italic">
                  Full list of all 24 contracts available on the <Link href="/transparency" className="text-amber-600 hover:underline">Transparency Report</Link> page.
                </p>
              </section>

              {/* Appendix B: Trading Links */}
              <section id="appendix-trading" className="mb-16">
                <h2 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-500 pb-4 mb-6">Appendix B: Trading & Liquidity</h2>
                
                <p className="text-gray-700 leading-relaxed mb-6">
                  AXM token is available for trading on the following decentralized exchanges on Arbitrum One:
                </p>

                <div className="grid md:grid-cols-2 gap-6 not-prose">
                  <div className="border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">🏰</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Camelot Exchange</h4>
                        <p className="text-sm text-gray-500">Arbitrum's Native DEX</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Pair:</span>
                        <span className="ml-2 font-medium">AXM/ETH</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Pool:</span>
                        <a href="https://app.camelot.exchange/pools/0xC8aeC9FF4f5D04441b551C258dBd5832b49f9f20" target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline font-mono text-xs">0xC8ae...f20</a>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">🦄</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Uniswap V3</h4>
                        <p className="text-sm text-gray-500">Arbitrum Deployment</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Pair:</span>
                        <span className="ml-2 font-medium">ETH/AXM</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Pool:</span>
                        <a href="https://info.uniswap.org/arbitrum/pools/0x234fA8521e614E7ad19C1348e4604e46c564F227" target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline font-mono text-xs">0x234f...227</a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 mt-6">
                  <h4 className="font-bold text-gray-900 mb-2">Block Explorers</h4>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <a href={`https://arbiscan.io/token/${CONTRACTS.AXM_TOKEN}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Arbiscan Token Page →
                    </a>
                    <a href={`https://arbitrum.blockscout.com/token/${CONTRACTS.AXM_TOKEN}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Blockscout Token Page →
                    </a>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="border-t border-gray-200 pt-8 mt-16">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">Axiom Protocol Whitepaper v{VERSION}</p>
                    <p className="text-gray-500 text-xs">Last updated: {LAST_UPDATED}</p>
                  </div>
                  <div className="flex gap-4">
                    <Link href="/transparency" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                      View Transparency Report →
                    </Link>
                    <Link href="/tokenomics" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                      Detailed Tokenomics →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
