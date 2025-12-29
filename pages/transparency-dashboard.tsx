import Head from 'next/head';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ProtocolHealthScore from '../components/ProtocolHealthScore';
import SUSUInsuranceProgress from '../components/SUSUInsuranceProgress';
import InsuranceClaimsHistory from '../components/InsuranceClaimsHistory';

interface Metrics {
  tvl: {
    total: string;
    susu: string;
    staking: string;
    veAxm: string;
  };
  feeBurner: {
    totalFeesCollected: string;
    totalAxmBurned: string;
    totalBuybacks: number;
    pendingFees: string;
    canExecuteBuyback: boolean;
  };
  veAxm: {
    totalLocked: string;
    totalVotingPower: string;
    totalLockers: number;
    currentEpoch: number;
    totalRewardsDistributed: string;
  };
  insurance: {
    balance: string;
    totalDiverted: string;
    totalClaimsPaid: string;
    pendingClaims: number;
    coverageRatio: number;
  };
  susu: {
    totalPools: number;
    tvl: string;
  };
  depin: {
    totalNodes: number;
    rewardsDistributed: string;
  };
}

function MetricCard({ title, value, subtitle, icon, color = 'gold' }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color?: string;
}) {
  const colorClasses = {
    gold: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.gold} border rounded-xl p-6`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-gray-400 text-sm">{title}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtitle && <div className="text-sm text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

export default function TransparencyDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/transparency/v2-metrics');
      const data = await res.json();
      if (data.success && data.metrics) {
        setMetrics(data.metrics);
        setLastUpdated(new Date());
      } else {
        console.error('API returned error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (value: string | number, decimals = 2) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  return (
    <Layout showWallet={false}>
      <Head>
        <title>Protocol Transparency | Axiom</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Protocol Transparency Dashboard
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Real-time metrics from the Axiom DeFi Treasury System. All data is pulled directly from on-chain contracts. Not a bank.
          </p>
          {lastUpdated && (
            <p className="text-gray-500 text-sm mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : metrics ? (
          <div className="space-y-12">
            <section>
              <SectionHeader 
                title="Total Value Locked" 
                subtitle="Combined value across all protocol products"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  icon="💰"
                  title="Total TVL"
                  value={`$${formatNumber(metrics.tvl.total)}`}
                  subtitle="All protocol products"
                  color="gold"
                />
                <MetricCard
                  icon="🔒"
                  title="veAXM Locked"
                  value={`${formatNumber(metrics.veAxm.totalLocked)} AXM`}
                  subtitle={`${metrics.veAxm.totalLockers} lockers`}
                  color="purple"
                />
                <MetricCard
                  icon="🤝"
                  title="SUSU TVL"
                  value={`$${formatNumber(metrics.tvl.susu)}`}
                  subtitle={`${metrics.susu.totalPools} active circles`}
                  color="blue"
                />
                <MetricCard
                  icon="📡"
                  title="DePIN Nodes"
                  value={metrics.depin.totalNodes.toString()}
                  subtitle={`${formatNumber(metrics.depin.rewardsDistributed)} AXM distributed`}
                  color="green"
                />
              </div>
            </section>

            <section>
              <SectionHeader 
                title="Fee Burner & Buyback" 
                subtitle="0.5% fee switch with automatic AXM buyback and burn"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  icon="🔥"
                  title="Total AXM Burned"
                  value={`${formatNumber(metrics.feeBurner.totalAxmBurned)} AXM`}
                  subtitle="Permanently removed from supply"
                  color="red"
                />
                <MetricCard
                  icon="💵"
                  title="Fees Collected"
                  value={`$${formatNumber(metrics.feeBurner.totalFeesCollected)}`}
                  subtitle={`${metrics.feeBurner.totalBuybacks} buybacks executed`}
                  color="green"
                />
                <MetricCard
                  icon="⏳"
                  title="Pending Fees"
                  value={`$${formatNumber(metrics.feeBurner.pendingFees)}`}
                  subtitle={metrics.feeBurner.canExecuteBuyback ? 'Ready for buyback' : 'Accumulating'}
                  color="gold"
                />
                <MetricCard
                  icon="🗳️"
                  title="veAXM Rewards"
                  value={`${formatNumber(metrics.veAxm.totalRewardsDistributed)} AXM`}
                  subtitle={`Epoch ${metrics.veAxm.currentEpoch}`}
                  color="purple"
                />
              </div>
            </section>

            <section>
              <SectionHeader 
                title="Insurance Fund" 
                subtitle="5% of DePIN rewards diverted to protect SUSU circles"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  icon="🛡️"
                  title="Fund Balance"
                  value={`$${formatNumber(metrics.insurance.balance)}`}
                  subtitle="Available for claims"
                  color="blue"
                />
                <MetricCard
                  icon="📥"
                  title="Total Diverted"
                  value={`$${formatNumber(metrics.insurance.totalDiverted)}`}
                  subtitle="From DePIN rewards"
                  color="green"
                />
                <MetricCard
                  icon="📤"
                  title="Claims Paid"
                  value={`$${formatNumber(metrics.insurance.totalClaimsPaid)}`}
                  subtitle={`${metrics.insurance.pendingClaims} pending`}
                  color="gold"
                />
                <MetricCard
                  icon="📊"
                  title="Coverage Ratio"
                  value={`${metrics.insurance.coverageRatio.toFixed(1)}%`}
                  subtitle="Of active SUSU pools"
                  color="purple"
                />
              </div>
            </section>

            <section>
              <SectionHeader 
                title="veAXM Governance" 
                subtitle="Vote-escrowed AXM for governance power and real yield"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  icon="🗳️"
                  title="Total Voting Power"
                  value={`${formatNumber(metrics.veAxm.totalVotingPower)}`}
                  subtitle="Active governance power"
                  color="purple"
                />
                <MetricCard
                  icon="🔒"
                  title="AXM Locked"
                  value={`${formatNumber(metrics.veAxm.totalLocked)} AXM`}
                  subtitle="In vote-escrow contracts"
                  color="gold"
                />
                <MetricCard
                  icon="👥"
                  title="Total Lockers"
                  value={metrics.veAxm.totalLockers.toString()}
                  subtitle="Unique veAXM holders"
                  color="blue"
                />
                <MetricCard
                  icon="🎁"
                  title="Rewards Distributed"
                  value={`${formatNumber(metrics.veAxm.totalRewardsDistributed)} AXM`}
                  subtitle="To veAXM holders"
                  color="green"
                />
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProtocolHealthScore metrics={metrics} />
              <SUSUInsuranceProgress 
                stats={{
                  balance: parseFloat(metrics.insurance.balance) || 0,
                  totalCoverage: parseFloat(metrics.tvl.susu) * 0.1 || 0,
                  activeCircles: metrics.susu.totalPools || 0,
                  totalPooled: parseFloat(metrics.tvl.susu) || 0,
                  claimsPaid: parseFloat(metrics.insurance.totalClaimsPaid) || 0,
                  pendingClaims: metrics.insurance.pendingClaims || 0
                }}
              />
            </section>

            <section>
              <InsuranceClaimsHistory limit={10} />
            </section>

            <section className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Contract Addresses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">veAXM</span>
                  <a href="https://arbitrum.blockscout.com/address/0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046" 
                     target="_blank" rel="noopener noreferrer"
                     className="text-yellow-500 hover:text-yellow-400 font-mono text-xs">
                    0xdfcd...c35046
                  </a>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Fee Burner</span>
                  <a href="https://arbitrum.blockscout.com/address/0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94" 
                     target="_blank" rel="noopener noreferrer"
                     className="text-yellow-500 hover:text-yellow-400 font-mono text-xs">
                    0xF5d5...8Cb94
                  </a>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Insurance Fund</span>
                  <a href="https://arbitrum.blockscout.com/address/0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F" 
                     target="_blank" rel="noopener noreferrer"
                     className="text-yellow-500 hover:text-yellow-400 font-mono text-xs">
                    0x7B69...1271F
                  </a>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Credit Score SBT</span>
                  <a href="https://arbitrum.blockscout.com/address/0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008" 
                     target="_blank" rel="noopener noreferrer"
                     className="text-yellow-500 hover:text-yellow-400 font-mono text-xs">
                    0x8Ae0...6B008
                  </a>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400">Unable to load metrics. Please try again.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
