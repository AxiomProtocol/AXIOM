import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import WealthAdvancement from '../components/WealthAdvancement';
import WealthTransparencyReport from '../components/WealthTransparencyReport';
import OrganizerTraining from '../components/OrganizerTraining';
import { useWallet } from '../components/WalletConnect/WalletContext';
import StepProgressBanner from '../components/StepProgressBanner';

export default function WealthPracticePage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🏛️' },
    { id: 'opportunities', label: 'Opportunities', icon: '📈' },
    { id: 'training', label: 'Training', icon: '🎓' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'my-groups', label: 'My Groups', icon: '👥' },
    { id: 'learn', label: 'Learn', icon: '📚' }
  ];

  return (
    <Layout title="Wealth Practice | Axiom">
      <StepProgressBanner isAdvanced={true} />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                The Wealth Practice
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Graduate from community savings to larger financial opportunities. 
              Build wealth together through SUSU circles and investment pools.
            </p>
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
            <WealthAdvancement wallet={address} />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/susu" className="block bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg p-4 transition-all">
                    <div className="font-bold text-white mb-1">Join a SUSU Circle</div>
                    <div className="text-sm text-gray-400">Start with community savings</div>
                  </Link>
                  <Link href="/susu/create" className="block bg-yellow-500 hover:bg-yellow-400 rounded-lg p-4 transition-all">
                    <div className="font-bold text-black mb-1">Create a Circle</div>
                    <div className="text-sm text-black/70">Organize your own group</div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'training' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🎓</div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Organizer Training & Certification</h2>
                    <p className="text-gray-400">
                      Complete training modules to earn certifications and unlock advanced organizer capabilities.
                    </p>
                  </div>
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

          {activeTab === 'learn' && (
            <div className="space-y-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Understanding The Wealth Practice</h2>
                
                <div className="space-y-6">
                  <div className="border-b border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-yellow-400 mb-3">What is SUSU?</h3>
                    <p className="text-gray-400">
                      SUSU (also known as ROSCA - Rotating Savings and Credit Association) is a traditional savings 
                      practice where a group of people contribute money regularly and take turns receiving the pot. 
                      Axiom brings this practice on-chain with added security and transparency.
                    </p>
                  </div>

                  <div className="border-b border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-yellow-400 mb-3">Community Mode vs Capital Mode</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <h4 className="font-bold text-green-400 mb-2">Community Mode</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• Up to $1,000 per contribution</li>
                          <li>• Up to $10,000 total pot</li>
                          <li>• Up to 20 members</li>
                          <li>• Standard rotating payouts</li>
                        </ul>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <h4 className="font-bold text-yellow-400 mb-2">Capital Mode</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• $1,000+ per contribution</li>
                          <li>• $10,000+ total pot</li>
                          <li>• Unlimited members</li>
                          <li>• Access to investment pools</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-yellow-400 mb-3">Graduation Process</h3>
                    <ol className="text-gray-400 space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-black flex items-center justify-center text-sm font-bold">1</span>
                        <span>Meet minimum member requirements (typically 3+ members)</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-black flex items-center justify-center text-sm font-bold">2</span>
                        <span>Group organizer initiates graduation through the Health tab</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-black flex items-center justify-center text-sm font-bold">3</span>
                        <span>Mode is automatically detected based on contribution thresholds</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-black flex items-center justify-center text-sm font-bold">4</span>
                        <span>Charter is created on-chain with your group's terms</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-black flex items-center justify-center text-sm font-bold">5</span>
                        <span>Capital Mode groups gain access to larger investment opportunities</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
