import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

const FeeBurnerDashboard = dynamic(() => import('../components/FeeBurnerDashboard'), { ssr: false });
const InsuranceFundMonitor = dynamic(() => import('../components/InsuranceFundMonitor'), { ssr: false });
const VeAXMRewardsClaim = dynamic(() => import('../components/VeAXMRewardsClaim'), { ssr: false });
const CreditScoreCard = dynamic(() => import('../components/CreditScoreCard'), { ssr: false });
const CreditScoreHistory = dynamic(() => import('../components/CreditScoreHistory'), { ssr: false });
const GovernanceVoting = dynamic(() => import('../components/GovernanceVoting'), { ssr: false });
const TokenomicsExplainer = dynamic(() => import('../components/TokenomicsExplainer'), { ssr: false });

interface ProtocolStats {
  totalValueLocked: string;
  totalBurned: string;
  totalLockers: number;
  insuranceCoverage: string;
}

export default function V2AnalyticsPage() {
  const { walletState } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'credit' | 'governance'>('overview');
  const [protocolStats, setProtocolStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProtocolStats();
  }, []);

  const fetchProtocolStats = async () => {
    try {
      const [veRes, feeRes, insRes] = await Promise.all([
        fetch('/api/v2/veaxm-stats').then(r => r.json()),
        fetch('/api/v2/fee-burner-stats').then(r => r.json()),
        fetch('/api/v2/insurance-fund-stats').then(r => r.json())
      ]);

      setProtocolStats({
        totalValueLocked: veRes.globalStats?.totalLocked || '0',
        totalBurned: feeRes.totalAxmBurned || '0',
        totalLockers: veRes.globalStats?.totalLockers || 0,
        insuranceCoverage: `${insRes.coverageRatioPercent?.toFixed(1) || '0'}%`
      });
    } catch (err) {
      console.error('Error fetching protocol stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (val: string) => {
    const num = parseFloat(val);
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const tabs = [
    { id: 'overview', label: 'Protocol Overview', icon: '📊' },
    { id: 'credit', label: 'Credit & Scoring', icon: '📈' },
    { id: 'governance', label: 'Governance', icon: '🗳️' }
  ];

  return (
    <>
      <Head>
        <title>V2 Analytics | Axiom DeFi Treasury</title>
        <meta name="description" content="Real-time analytics for Axiom's DeFi Treasury System V2 contracts" />
      </Head>

      <Layout showWallet={true}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                DeFi Treasury Analytics
              </h1>
              <p className="text-gray-400">Real-time metrics from the Wealth Engine</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800/50 border border-purple-500/30 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-xs mb-1">Total Value Locked</p>
                <p className="text-2xl font-bold text-purple-400">
                  {loading ? '...' : formatNumber(protocolStats?.totalValueLocked || '0')} AXM
                </p>
              </div>
              <div className="bg-gray-800/50 border border-orange-500/30 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-xs mb-1">AXM Burned</p>
                <p className="text-2xl font-bold text-orange-400">
                  {loading ? '...' : formatNumber(protocolStats?.totalBurned || '0')}
                </p>
              </div>
              <div className="bg-gray-800/50 border border-blue-500/30 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-xs mb-1">veAXM Lockers</p>
                <p className="text-2xl font-bold text-blue-400">
                  {loading ? '...' : protocolStats?.totalLockers || 0}
                </p>
              </div>
              <div className="bg-gray-800/50 border border-green-500/30 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-xs mb-1">Insurance Coverage</p>
                <p className="text-2xl font-bold text-green-400">
                  {loading ? '...' : protocolStats?.insuranceCoverage}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <FeeBurnerDashboard />
                <InsuranceFundMonitor />
                <div className="lg:col-span-2">
                  <VeAXMRewardsClaim />
                </div>
              </div>
            )}

            {activeTab === 'credit' && (
              <div className="grid lg:grid-cols-2 gap-6">
                {walletState.address ? (
                  <>
                    <CreditScoreCard walletAddress={walletState.address} />
                    <CreditScoreHistory walletAddress={walletState.address} />
                  </>
                ) : (
                  <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
                    <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">🔐</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Connect Wallet</h3>
                    <p className="text-gray-400">Connect your wallet to view your on-chain credit score and history</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'governance' && (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <GovernanceVoting />
                </div>
                <div>
                  <TokenomicsExplainer />
                </div>
              </div>
            )}

            <div className="mt-12 bg-gradient-to-r from-purple-900/30 via-gray-800 to-orange-900/30 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">V2 Contract Addresses</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between items-center bg-gray-900/50 rounded-lg p-3">
                  <span className="text-gray-400">AxiomScoreSBT</span>
                  <code className="text-purple-400 text-xs">0x8Ae0...B008</code>
                </div>
                <div className="flex justify-between items-center bg-gray-900/50 rounded-lg p-3">
                  <span className="text-gray-400">SusuInsuranceFund</span>
                  <code className="text-blue-400 text-xs">0x7B69...271F</code>
                </div>
                <div className="flex justify-between items-center bg-gray-900/50 rounded-lg p-3">
                  <span className="text-gray-400">veAXM</span>
                  <code className="text-green-400 text-xs">0xdfcd...5046</code>
                </div>
                <div className="flex justify-between items-center bg-gray-900/50 rounded-lg p-3">
                  <span className="text-gray-400">AxiomFeeBurner</span>
                  <code className="text-orange-400 text-xs">0xF5d5...Cb94</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
