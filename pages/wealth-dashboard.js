import { useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import WealthAdvancement from '../components/WealthAdvancement';
import WealthTransparencyReport from '../components/WealthTransparencyReport';
import OrganizerTraining from '../components/OrganizerTraining';
import { useWallet } from '../components/WalletConnect/WalletContext';
import StepProgressBanner from '../components/StepProgressBanner';
import WealthPracticePathway from '../components/WealthPracticePathway';

export default function WealthDashboardPage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🏛️' },
    { id: 'opportunities', label: 'Opportunities', icon: '📈' },
    { id: 'training', label: 'Training', icon: '🎓' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'my-groups', label: 'My Groups', icon: '👥' },
  ];

  return (
    <Layout title="Wealth Dashboard | Axiom">
      <StepProgressBanner isAdvanced={true} />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                Wealth Dashboard
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Manage your savings circles, track advancement, and access opportunities.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <Link
                href="/learn-wealth-practice"
                className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm transition-colors"
              >
                <span>📚</span>
                Learn About Wealth Practice
              </Link>
              <Link
                href="/whitepaper#reputation"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Whitepaper
              </Link>
            </div>
            
            <div className="max-w-3xl mx-auto mt-6">
              <WealthPracticePathway compact={true} />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Link href="/organizer-dashboard" className="block bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-4 hover:border-purple-400 transition-all">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-bold text-purple-400">Organizer Dashboard</h3>
                  <p className="text-xs text-gray-400 mt-1">Manage your groups with AI insights</p>
                </Link>
                <Link href="/analytics-dashboard" className="block bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-4 hover:border-blue-400 transition-all">
                  <div className="text-2xl mb-2">📈</div>
                  <h3 className="font-bold text-blue-400">Analytics</h3>
                  <p className="text-xs text-gray-400 mt-1">Real-time platform metrics</p>
                </Link>
                <Link href="/notifications" className="block bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-xl p-4 hover:border-green-400 transition-all">
                  <div className="text-2xl mb-2">🔔</div>
                  <h3 className="font-bold text-green-400">Notifications</h3>
                  <p className="text-xs text-gray-400 mt-1">Customize your alerts</p>
                </Link>
                <Link href="/graduation-dashboard" className="block bg-gradient-to-br from-yellow-600/20 to-amber-800/20 border border-yellow-500/30 rounded-xl p-4 hover:border-yellow-400 transition-all">
                  <div className="text-2xl mb-2">🎓</div>
                  <h3 className="font-bold text-yellow-400">Graduation</h3>
                  <p className="text-xs text-gray-400 mt-1">Track group progress</p>
                </Link>
              </div>
              <WealthAdvancement wallet={address} />
            </div>
          )}

          {activeTab === 'opportunities' && (
            <div className="space-y-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Capital Mode Opportunities</h2>
                <p className="text-gray-400 mb-6">
                  When your SUSU group exceeds community thresholds ($1,000+ contributions or $10,000+ pot), 
                  you automatically enter Capital Mode with access to larger investment opportunities.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 border border-yellow-500/30 rounded-lg p-4">
                    <div className="text-3xl mb-3">🏘️</div>
                    <h3 className="font-bold text-yellow-400 mb-2">Real Estate Pools</h3>
                    <p className="text-sm text-gray-400">
                      Pool funds with other Capital Mode groups for property investments and development projects.
                    </p>
                  </div>
                  <div className="bg-gray-900/50 border border-blue-500/30 rounded-lg p-4">
                    <div className="text-3xl mb-3">🖥️</div>
                    <h3 className="font-bold text-blue-400 mb-2">DePIN Infrastructure</h3>
                    <p className="text-sm text-gray-400">
                      Invest in Axiom's decentralized infrastructure nodes and earn ongoing rewards.
                    </p>
                  </div>
                  <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-4">
                    <div className="text-3xl mb-3">🏛️</div>
                    <h3 className="font-bold text-purple-400 mb-2">Governance Power</h3>
                    <p className="text-sm text-gray-400">
                      Capital Mode members gain enhanced voting power in Axiom governance decisions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">🎯</div>
                  <div>
                    <h3 className="text-xl font-bold text-yellow-400">Ready to Graduate?</h3>
                    <p className="text-gray-400">Take your savings circle to the next level</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/susu" className="block bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg p-4 transition-all">
                    <div className="font-bold text-white mb-1">Join a SUSU Circle</div>
                    <div className="text-sm text-gray-400">Start with community savings</div>
                  </Link>
                  <Link href="/susu/create" className="block bg-yellow-500 hover:bg-yellow-400 rounded-lg p-4 transition-all">
                    <div className="font-bold text-black mb-1">Create a Circle</div>
                    <div className="text-sm text-black/70">Organize your own group</div>
                  </Link>
                  <Link href="/buy-axm" className="block bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg p-4 transition-all">
                    <div className="font-bold text-white mb-1">Buy AXM Tokens</div>
                    <div className="text-sm text-purple-200">Get AXM with card or DEX</div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'training' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">🎓</div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Organizer Training & Certification</h2>
                      <p className="text-gray-400">
                        Complete training modules to earn certifications and unlock advanced organizer capabilities.
                      </p>
                    </div>
                  </div>
                  <Link href="/organizer-dashboard" className="hidden md:flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all">
                    <span>📊</span>
                    Organizer Dashboard
                  </Link>
                </div>
              </div>
              <OrganizerTraining />
            </div>
          )}

          {activeTab === 'reports' && (
            <WealthTransparencyReport />
          )}

          {activeTab === 'my-groups' && (
            <div className="space-y-6">
              {!address ? (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                  <div className="text-4xl mb-4">🔗</div>
                  <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-400 mb-4">Connect your wallet to view your SUSU groups and advancement status.</p>
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-white mb-6">Your Groups & Status</h2>
                  <div className="text-center py-8">
                    <Link href="/susu" className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-amber-500 transition-all">
                      View My SUSU Groups
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
