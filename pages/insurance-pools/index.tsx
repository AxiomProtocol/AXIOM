import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import WalletButton from '../../components/web3/WalletButton';
import InsuranceModal from '../../components/web3/InsuranceModal';
import { useWallet } from '../../lib/web3/useWallet';

interface InsurancePool {
  id: string;
  name: string;
  coverageType: string;
  description: string;
  totalCoverage: string;
  availableCoverage: string;
  premiumRate: number;
  minCoverage: number;
  maxCoverage: number;
  activePolicies: number;
  totalPremiumsPaid: string;
  claimsPaid: string;
  reserves: string;
}

interface UserPolicy {
  id: string;
  poolId: string;
  coverageAmount: string;
  premiumPaid: string;
  expiryDate: string;
  status: string;
}

interface Stats {
  totalCoverage: string;
  totalReserves: string;
  totalPremiumsCollected: string;
  totalClaimsPaid: string;
  activePolicies: number;
  claimRatio: string;
  reserveRatio: string;
}

export default function InsurancePoolsPage() {
  const { address, isConnected } = useWallet();
  const [pools, setPools] = useState<InsurancePool[]>([]);
  const [userPolicies, setUserPolicies] = useState<UserPolicy[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<InsurancePool | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [address]);

  const fetchData = async () => {
    try {
      const url = address 
        ? `/api/phase3/insurance-pools?address=${address}`
        : '/api/phase3/insurance-pools';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setPools(data.pools);
        setUserPolicies(data.userPolicies);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch insurance pools:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPoolIcon = (type: string) => {
    switch (type) {
      case 'Technical Risk':
        return '🔐';
      case 'Peg Risk':
        return '⚖️';
      case 'Position Risk':
        return '📉';
      case 'Infrastructure Risk':
        return '🌐';
      default:
        return '🛡️';
    }
  };

  return (
    <>
      <Head>
        <title>Insurance Pools | Axiom Protocol</title>
        <meta name="description" content="Community-backed protection for protocol participants" />
      </Head>

      <div className="min-h-screen bg-gray-950">
        <div className="relative bg-gradient-to-b from-blue-900/30 to-gray-950 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-block bg-blue-500/20 text-blue-400 px-4 py-1 rounded-full text-sm mb-4">
              Phase 3 Product
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Insurance Pools</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Community-backed protection against protocol risks. Secure your positions with decentralized coverage.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="text-sm text-gray-400">Total Coverage Capacity</div>
                    <div className="text-2xl font-bold text-white">${(parseFloat(stats.totalCoverage) / 1000000).toFixed(1)}M</div>
                  </div>
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="text-sm text-gray-400">Total Reserves</div>
                    <div className="text-2xl font-bold text-green-400">${(parseFloat(stats.totalReserves) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="text-sm text-gray-400">Active Policies</div>
                    <div className="text-2xl font-bold text-white">{stats.activePolicies}</div>
                  </div>
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="text-sm text-gray-400">Claims Ratio</div>
                    <div className="text-2xl font-bold text-yellow-400">{stats.claimRatio}%</div>
                  </div>
                </div>
              )}

              {isConnected && userPolicies.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-white mb-6">Your Policies</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {userPolicies.map((policy) => {
                      const pool = pools.find(p => p.id === policy.poolId);
                      return (
                        <div key={policy.id} className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-white">{pool?.name || 'Policy'}</h3>
                              <span className="text-gray-400 text-sm">Expires: {policy.expiryDate}</span>
                            </div>
                            <span className="bg-green-900/50 text-green-400 px-3 py-1 rounded-full text-sm">
                              {policy.status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <div>
                              <div className="text-sm text-gray-400">Coverage</div>
                              <div className="text-xl font-bold text-white">${parseFloat(policy.coverageAmount).toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-400">Premium Paid</div>
                              <div className="text-xl font-bold text-yellow-400">${parseFloat(policy.premiumPaid).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <h2 className="text-2xl font-bold text-white mb-6">Available Coverage Options</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {pools.map((pool) => (
                  <div key={pool.id} className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-blue-500/50 transition">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-900/50 rounded-xl flex items-center justify-center text-2xl">
                        {getPoolIcon(pool.coverageType)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{pool.name}</h3>
                        <span className="text-blue-400 text-sm">{pool.coverageType}</span>
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm mb-4">{pool.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Premium Rate</div>
                        <div className="text-lg font-semibold text-yellow-400">{pool.premiumRate}%/year</div>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Available</div>
                        <div className="text-lg font-semibold text-white">${(parseFloat(pool.availableCoverage) / 1000000).toFixed(1)}M</div>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm text-gray-400 mb-4">
                      <span>{pool.activePolicies} active policies</span>
                      <span>Reserves: ${(parseFloat(pool.reserves) / 1000000).toFixed(2)}M</span>
                    </div>

                    <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(parseFloat(pool.availableCoverage) / parseFloat(pool.totalCoverage)) * 100}%` }}
                      ></div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPool(pool);
                        setIsModalOpen(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
                    >
                      Get Coverage
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-12 grid md:grid-cols-2 gap-8">
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
                  <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">1</div>
                      <div>
                        <h3 className="font-semibold text-white">Choose Coverage</h3>
                        <p className="text-gray-400 text-sm">Select the risk type you want to protect against.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">2</div>
                      <div>
                        <h3 className="font-semibold text-white">Pay Premium</h3>
                        <p className="text-gray-400 text-sm">Pay the annual premium in AXUSD to activate coverage.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">3</div>
                      <div>
                        <h3 className="font-semibold text-white">File Claims</h3>
                        <p className="text-gray-400 text-sm">If a covered event occurs, file a claim for review.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
                  <h2 className="text-2xl font-bold text-white mb-4">Underwriter Benefits</h2>
                  <p className="text-gray-400 mb-4">
                    Earn premium income by providing capital to insurance pools. Underwriters receive:
                  </p>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Pro-rata share of premiums collected
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Investment returns on reserve assets
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Governance rights on claims decisions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> AXM token incentives
                    </li>
                  </ul>
                  <button className="mt-6 w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition">
                    Become an Underwriter
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <InsuranceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchData();
        }}
        pool={selectedPool}
      />
    </>
  );
}
