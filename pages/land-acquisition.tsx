import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { SiteLayout } from "../components/navigation";

interface LandOption {
  id: number;
  parcelId: string;
  location: string;
  acreage: string;
  purchasePrice: string;
  optionFee: string;
  status: string;
  totalShares: number;
  sharesSold: number;
  minInvestment: string;
  maxInvestment: string;
  regCFCompliant: boolean;
  description: string;
  featuredImage: string;
  propertyType: string;
  projectedReturns: string;
  riskLevel: string;
  percentFunded: string;
  raisedAmount: string;
}

interface Campaign {
  id: number;
  landOptionId: number;
  title: string;
  subtitle: string;
  description: string;
  targetAmount: string;
  raisedAmount: string;
  investorCount: number;
  status: string;
  percentFunded: string;
  daysRemaining: number | null;
  featuredImage: string;
  requiresAccreditation: boolean;
  minInvestment: string;
  landOption: {
    location: string;
    acreage: string;
    propertyType: string;
  };
}

interface Pool {
  id: number;
  name: string;
  description: string;
  targetAmount: string;
  monthlyContribution: string;
  memberLimit: number;
  memberCount: number;
  totalContributed: string;
  status: string;
  percentFunded: string;
  spotsRemaining: number;
  landOption: {
    location: string;
    acreage: string;
    purchasePrice: string;
  } | null;
}

interface Stats {
  landOptions: { total: number; active: number; totalValue: string };
  crowdfunding: { total: number; live: number; totalRaised: string; investors: number };
  pools: { total: number; active: number; totalPooled: string; members: number };
  regCF: { maxRaise: number; maxNonAccredited: number; complianceStatus: string };
}

export default function LandAcquisitionPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'crowdfunding' | 'pools' | 'how-it-works'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, campaignsRes, poolsRes] = await Promise.all([
          fetch('/api/land-acquisition/stats'),
          fetch('/api/land-acquisition/campaigns'),
          fetch('/api/land-acquisition/pools')
        ]);

        const statsJson = await statsRes.json();
        const campaignsJson = await campaignsRes.json();
        const poolsJson = await poolsRes.json();

        if (statsJson.success) setStats(statsJson.data);
        if (campaignsJson.success) setCampaigns(campaignsJson.data);
        if (poolsJson.success) setPools(poolsJson.data);
      } catch (error) {
        console.error('Failed to fetch land acquisition data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatCurrency = (value: string | number) => {
    const num = parseFloat(String(value));
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
    <SiteLayout>
      <Head>
        <title>Land Acquisition | Axiom Protocol</title>
        <meta name="description" content="Community-powered land acquisition through Reg CF crowdfunding and SUSU-style pooling. Invest in tokenized land options with as little as $100." />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <section className="relative py-16 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-green-500/5"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>

          <div className="relative z-10 max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-block bg-amber-500/20 border border-amber-400 rounded-full px-6 py-2 mb-6 backdrop-blur-sm">
                <span className="text-amber-400 font-semibold">REG CF COMPLIANT</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-green-500">
                  Land Acquisition
                </span>
                <br />
                <span className="text-white text-3xl md:text-4xl">
                  Community-Powered Real Estate
                </span>
              </h1>

              <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                Invest in <span className="text-amber-400 font-semibold">tokenized land options</span> through 
                SEC-compliant Reg CF crowdfunding. Pool resources with your community to acquire and develop 
                real property - starting with as little as $100.
              </p>

              <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  <span>Up to $5M Reg CF Raises</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  <span>$100 Minimum Investment</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  <span>ERC-1155 Tokenized Shares</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  <span>SEED Governance Rights</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {(['overview', 'crowdfunding', 'pools', 'how-it-works'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === tab
                      ? 'bg-amber-500 text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {tab === 'overview' && 'Overview'}
                  {tab === 'crowdfunding' && 'Crowdfunding'}
                  {tab === 'pools' && 'Acquisition Pools'}
                  {tab === 'how-it-works' && 'How It Works'}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/30 rounded-xl p-6">
                    <h3 className="text-amber-400 font-bold mb-2">Land Options</h3>
                    <div className="text-3xl font-bold text-white">
                      {loading ? '...' : stats?.landOptions.active || 0}
                    </div>
                    <p className="text-gray-400 text-sm">Active Opportunities</p>
                    <p className="text-amber-400 text-sm mt-2">
                      {loading ? '...' : formatCurrency(stats?.landOptions.totalValue || '0')} Total Value
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 rounded-xl p-6">
                    <h3 className="text-green-400 font-bold mb-2">Crowdfunding</h3>
                    <div className="text-3xl font-bold text-white">
                      {loading ? '...' : formatCurrency(stats?.crowdfunding.totalRaised || '0')}
                    </div>
                    <p className="text-gray-400 text-sm">Total Raised</p>
                    <p className="text-green-400 text-sm mt-2">
                      {loading ? '...' : stats?.crowdfunding.investors || 0} Investors
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500/30 rounded-xl p-6">
                    <h3 className="text-blue-400 font-bold mb-2">Acquisition Pools</h3>
                    <div className="text-3xl font-bold text-white">
                      {loading ? '...' : stats?.pools.active || 0}
                    </div>
                    <p className="text-gray-400 text-sm">Active Pools</p>
                    <p className="text-blue-400 text-sm mt-2">
                      {loading ? '...' : stats?.pools.members || 0} Pool Members
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-purple-500/30 rounded-xl p-6">
                    <h3 className="text-purple-400 font-bold mb-2">Reg CF Compliance</h3>
                    <div className="text-3xl font-bold text-white">$5M</div>
                    <p className="text-gray-400 text-sm">Max Per Raise</p>
                    <p className="text-purple-400 text-sm mt-2">SEC Compliant</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-xl p-8">
                  <h3 className="text-yellow-400 font-bold mb-6 text-xl">The Axiom Land Acquisition Flywheel</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-bold text-amber-400">1</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Scout & Option</h4>
                      <p className="text-gray-400 text-sm">Steward Corps identifies land and negotiates purchase options with landowners</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-bold text-green-400">2</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Tokenize & Fund</h4>
                      <p className="text-gray-400 text-sm">Land shares tokenized as ERC-1155. Community invests via Reg CF crowdfunding</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-bold text-blue-400">3</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Pool & Contribute</h4>
                      <p className="text-gray-400 text-sm">SUSU-style monthly contributions build collective purchasing power</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-bold text-purple-400">4</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Acquire & Develop</h4>
                      <p className="text-gray-400 text-sm">Exercise option, transfer deed. Revenue flows to SEED holders (50%)</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-6">
                    <h4 className="text-amber-400 font-bold mb-4">For Investors</h4>
                    <ul className="space-y-2 text-gray-300 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>Fractional ownership in real property</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>$100 minimum investment</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>SEED governance voting rights</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>Revenue share from development</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-6">
                    <h4 className="text-green-400 font-bold mb-4">For Landowners</h4>
                    <ul className="space-y-2 text-gray-300 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>Immediate cash flow via option fees</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>Guaranteed buyer at agreed price</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>AXUSD payments (swap to USDC anytime)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>No carrying costs during option period</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-6">
                    <h4 className="text-blue-400 font-bold mb-4">For the Protocol</h4>
                    <ul className="space-y-2 text-gray-300 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>2.5% platform fee on transactions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>Land-backed AXUSD stability</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>30% revenue to treasury</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>Real asset backing for ecosystem</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'crowdfunding' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white">Active Campaigns</h2>
                  <div className="bg-amber-500/20 border border-amber-400 rounded-lg px-4 py-2">
                    <span className="text-amber-400 text-sm font-semibold">Reg CF: Up to $5M per raise</span>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading campaigns...</p>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-12 text-center">
                    <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Active Campaigns Yet</h3>
                    <p className="text-gray-400 mb-6">Be the first to invest in community land acquisition.</p>
                    <p className="text-gray-500 text-sm">Steward Corps is actively scouting land opportunities.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl overflow-hidden hover:border-amber-500/50 transition-all">
                        <div className="h-48 bg-gradient-to-br from-amber-500/20 to-green-500/20 flex items-center justify-center">
                          {campaign.featuredImage ? (
                            <img src={campaign.featuredImage} alt={campaign.title} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-16 h-16 text-amber-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="p-6">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              campaign.status === 'live' ? 'bg-green-500/20 text-green-400' :
                              campaign.status === 'funded' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {campaign.status?.toUpperCase()}
                            </span>
                            {campaign.requiresAccreditation && (
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-500/20 text-purple-400">
                                ACCREDITED
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-white mb-1">{campaign.title}</h3>
                          <p className="text-gray-400 text-sm mb-4">{campaign.landOption?.location}</p>
                          
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">Raised</span>
                              <span className="text-white font-semibold">{campaign.percentFunded}%</span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, parseFloat(campaign.percentFunded || '0'))}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-amber-400">{formatCurrency(campaign.raisedAmount || '0')}</span>
                              <span className="text-gray-400">of {formatCurrency(campaign.targetAmount)}</span>
                            </div>
                          </div>

                          <div className="flex justify-between text-sm text-gray-400 mb-4">
                            <span>{campaign.investorCount} investors</span>
                            <span>{campaign.daysRemaining ? `${campaign.daysRemaining} days left` : 'TBD'}</span>
                          </div>

                          <button className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-all">
                            Invest Now - Min {formatCurrency(campaign.minInvestment || '100')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pools' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white">Acquisition Pools</h2>
                  <div className="bg-blue-500/20 border border-blue-400 rounded-lg px-4 py-2">
                    <span className="text-blue-400 text-sm font-semibold">SUSU-Style Community Pooling</span>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading pools...</p>
                  </div>
                ) : pools.length === 0 ? (
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-12 text-center">
                    <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Active Pools Yet</h3>
                    <p className="text-gray-400 mb-6">Join a community pool to collectively acquire land.</p>
                    <p className="text-gray-500 text-sm">Pools will be created once land options are secured.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pools.map((pool) => (
                      <div key={pool.id} className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-white">{pool.name}</h3>
                            <p className="text-gray-400 text-sm">{pool.landOption?.location || 'General Acquisition'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            pool.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            pool.status === 'forming' ? 'bg-yellow-500/20 text-yellow-400' :
                            pool.status === 'funded' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {pool.status?.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-gray-400 text-xs">Monthly</p>
                            <p className="text-white font-semibold">{formatCurrency(pool.monthlyContribution)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Target</p>
                            <p className="text-white font-semibold">{formatCurrency(pool.targetAmount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Members</p>
                            <p className="text-white font-semibold">{pool.memberCount}/{pool.memberLimit}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Spots Left</p>
                            <p className="text-blue-400 font-semibold">{pool.spotsRemaining}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                              style={{ width: `${Math.min(100, parseFloat(pool.percentFunded || '0'))}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-blue-400">{formatCurrency(pool.totalContributed || '0')} pooled</span>
                            <span className="text-gray-400">{pool.percentFunded}% funded</span>
                          </div>
                        </div>

                        <button className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all">
                          Join Pool - {formatCurrency(pool.monthlyContribution)}/month
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'how-it-works' && (
              <div className="space-y-8">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/30 rounded-xl p-8">
                  <h2 className="text-2xl font-bold text-amber-400 mb-6">Regulation Crowdfunding (Reg CF)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">What is Reg CF?</h3>
                      <p className="text-gray-300 mb-4">
                        Regulation Crowdfunding (Reg CF) is an SEC exemption that allows companies to raise 
                        up to $5 million from both accredited and non-accredited investors through 
                        registered funding portals.
                      </p>
                      <ul className="space-y-2 text-gray-400 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">+</span>
                          <span>Open to all U.S. investors (18+)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">+</span>
                          <span>Investment limits based on income/net worth</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">+</span>
                          <span>Required disclosures for investor protection</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Investment Limits</h3>
                      <div className="space-y-4">
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <p className="text-amber-400 font-semibold">Income/Net Worth under $124K</p>
                          <p className="text-white text-2xl font-bold">$2,500</p>
                          <p className="text-gray-400 text-sm">Maximum annual investment</p>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <p className="text-green-400 font-semibold">Income/Net Worth $124K+</p>
                          <p className="text-white text-2xl font-bold">10%</p>
                          <p className="text-gray-400 text-sm">Of annual income or net worth (greater of)</p>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <p className="text-purple-400 font-semibold">Accredited Investors</p>
                          <p className="text-white text-2xl font-bold">Unlimited</p>
                          <p className="text-gray-400 text-sm">No investment cap applies</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500/30 rounded-xl p-8">
                  <h2 className="text-2xl font-bold text-blue-400 mb-6">Acquisition Pool Mechanics</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">1</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Join a Pool</h4>
                      <p className="text-gray-400 text-sm">
                        Choose a land acquisition pool aligned with your goals. 
                        Initial contribution reserves your spot.
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">2</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Monthly Contributions</h4>
                      <p className="text-gray-400 text-sm">
                        Like a SUSU circle, members contribute monthly in AXUSD. 
                        Funds accumulate toward the target purchase price.
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">3</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Collective Purchase</h4>
                      <p className="text-gray-400 text-sm">
                        When fully funded, the pool exercises the land option. 
                        Members receive tokenized shares proportional to contributions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 rounded-xl p-8">
                  <h2 className="text-2xl font-bold text-green-400 mb-6">Smart Contract Architecture</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h4 className="text-amber-400 font-semibold mb-2">LandOptionRegistry</h4>
                      <p className="text-gray-400 text-sm">ERC-1155 tokenized land options with KYC/accreditation gating</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h4 className="text-green-400 font-semibold mb-2">RegCFCrowdfunding</h4>
                      <p className="text-gray-400 text-sm">SEC-compliant investment tracking with annual limits</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h4 className="text-blue-400 font-semibold mb-2">LandAcquisitionPool</h4>
                      <p className="text-gray-400 text-sm">SUSU-style monthly pooling with cycle management</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
