import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface InvestorPosition {
  fundSeries: string;
  committedAmount: number;
  deployedAmount: number;
  shares: number;
  currentValue: number;
  unrealizedGain: number;
  earnedYield: number;
  pendingDistribution: number;
  nextDistributionDate: string;
}

interface Distribution {
  id: string;
  date: string;
  fundSeries: string;
  grossAmount: number;
  fees: number;
  netAmount: number;
  type: 'interest' | 'principal' | 'special';
  status: 'paid' | 'pending' | 'scheduled';
  txHash?: string;
}

interface Statement {
  id: string;
  period: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'k1';
  generatedDate: string;
  downloadUrl: string;
}

export default function InvestorReports() {
  const [positions, setPositions] = useState<InvestorPosition[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'distributions' | 'statements' | 'tax'>('overview');
  const [dateRange, setDateRange] = useState<'ytd' | '1y' | 'all'>('ytd');

  useEffect(() => {
    fetchInvestorData();
  }, []);

  async function fetchInvestorData() {
    try {
      const response = await fetch('/api/dscr/investor/reports');
      if (response.ok) {
        const data = await response.json();
        setPositions(data.positions || []);
        setDistributions(data.distributions || []);
        setStatements(data.statements || []);
      }
    } catch (error) {
      console.error('Failed to fetch investor data:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const totalCommitted = positions.reduce((sum, p) => sum + p.committedAmount, 0);
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalYield = positions.reduce((sum, p) => sum + p.earnedYield, 0);
  const totalGain = positions.reduce((sum, p) => sum + p.unrealizedGain, 0);
  const overallReturn = totalCommitted > 0 ? ((totalValue - totalCommitted) / totalCommitted) * 100 : 0;

  const handleExportReport = (format: 'pdf' | 'csv' = 'pdf') => {
    window.open(`/api/dscr/investor/reports/export?format=${format}`, '_blank');
  };

  return (
    <>
      <Head>
        <title>Investor Reports | Axiom Nexus</title>
        <meta name="description" content="View your investment positions, distributions, and tax documents" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Investor Reports</h1>
              <p className="text-gray-400">Track your positions, yields, and download statements</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <button 
                onClick={() => handleExportReport('csv')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Export CSV
              </button>
              <button 
                onClick={() => handleExportReport('pdf')}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Download PDF
              </button>
              <Link
                href="/dscr/investor/dashboard"
                className="px-4 py-2 bg-[#00D4AA] text-black font-medium rounded-lg hover:bg-[#00B894] transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00D4AA]" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <SummaryCard
                  title="Total Invested"
                  value={formatCurrency(totalCommitted)}
                  icon="💰"
                  color="blue"
                />
                <SummaryCard
                  title="Current Value"
                  value={formatCurrency(totalValue)}
                  subtitle={formatPercent(overallReturn)}
                  icon="📈"
                  color="green"
                />
                <SummaryCard
                  title="Yield Earned"
                  value={formatCurrency(totalYield)}
                  subtitle="Year to date"
                  icon="💵"
                  color="purple"
                />
                <SummaryCard
                  title="Unrealized Gain"
                  value={formatCurrency(totalGain)}
                  icon="📊"
                  color="yellow"
                />
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 mb-8">
                <div className="border-b border-gray-700">
                  <nav className="flex -mb-px">
                    {[
                      { id: 'overview', label: 'Overview', icon: '📋' },
                      { id: 'distributions', label: 'Distributions', icon: '💸' },
                      { id: 'statements', label: 'Statements', icon: '📄' },
                      { id: 'tax', label: 'Tax Documents', icon: '📑' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? 'border-[#00D4AA] text-[#00D4AA]'
                            : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                      >
                        <span>{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-white">Position Summary</h3>
                      
                      {positions.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                                <th className="pb-3 font-medium">Fund Series</th>
                                <th className="pb-3 font-medium">Committed</th>
                                <th className="pb-3 font-medium">Deployed</th>
                                <th className="pb-3 font-medium">Current Value</th>
                                <th className="pb-3 font-medium">Yield Earned</th>
                                <th className="pb-3 font-medium">Next Distribution</th>
                              </tr>
                            </thead>
                            <tbody className="text-white">
                              {positions.map((position, idx) => (
                                <tr key={idx} className="border-b border-gray-700/50">
                                  <td className="py-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      position.fundSeries === 'Series A' 
                                        ? 'bg-purple-500/20 text-purple-400' 
                                        : 'bg-green-500/20 text-green-400'
                                    }`}>
                                      {position.fundSeries}
                                    </span>
                                  </td>
                                  <td className="py-4">{formatCurrency(position.committedAmount)}</td>
                                  <td className="py-4">{formatCurrency(position.deployedAmount)}</td>
                                  <td className="py-4">
                                    <span className="text-green-400">{formatCurrency(position.currentValue)}</span>
                                  </td>
                                  <td className="py-4">{formatCurrency(position.earnedYield)}</td>
                                  <td className="py-4 text-gray-400">{position.nextDistributionDate}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          <p className="text-4xl mb-4">📊</p>
                          <p>No positions yet. Start investing to see your portfolio.</p>
                          <Link href="/dscr/invest/commit" className="text-[#00D4AA] hover:underline mt-2 inline-block">
                            Make Your First Investment →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'distributions' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Distribution History</h3>
                        <select 
                          value={dateRange}
                          onChange={(e) => setDateRange(e.target.value as any)}
                          className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="ytd">Year to Date</option>
                          <option value="1y">Last 12 Months</option>
                          <option value="all">All Time</option>
                        </select>
                      </div>

                      {distributions.length > 0 ? (
                        <div className="space-y-3">
                          {distributions.map((dist) => (
                            <div key={dist.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  dist.type === 'interest' ? 'bg-green-500/20' :
                                  dist.type === 'principal' ? 'bg-blue-500/20' : 'bg-yellow-500/20'
                                }`}>
                                  {dist.type === 'interest' ? '💵' : dist.type === 'principal' ? '🏦' : '⭐'}
                                </div>
                                <div>
                                  <p className="text-white font-medium">{dist.fundSeries} - {dist.type.charAt(0).toUpperCase() + dist.type.slice(1)}</p>
                                  <p className="text-gray-400 text-sm">{new Date(dist.date).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-green-400 font-bold">{formatCurrency(dist.netAmount)}</p>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  dist.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                  dist.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {dist.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          <p className="text-4xl mb-4">💸</p>
                          <p>No distributions yet. Distributions are paid quarterly.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'statements' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-white">Account Statements</h3>
                      
                      {statements.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {statements.filter(s => s.type !== 'k1').map((statement) => (
                            <div key={statement.id} className="p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-colors">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">📄</span>
                                <div>
                                  <p className="text-white font-medium">{statement.period}</p>
                                  <p className="text-gray-400 text-sm capitalize">{statement.type} Statement</p>
                                </div>
                              </div>
                              <button className="w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm">
                                Download PDF
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          <p className="text-4xl mb-4">📄</p>
                          <p>No statements available yet. Statements are generated monthly.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'tax' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-white">Tax Documents</h3>
                      
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">⚠️</span>
                          <div>
                            <p className="text-yellow-400 font-medium">K-1 Schedule Availability</p>
                            <p className="text-gray-400 text-sm mt-1">
                              K-1 schedules are typically available by March 15th each year for the prior tax year. 
                              You will receive an email notification when your K-1 is ready.
                            </p>
                          </div>
                        </div>
                      </div>

                      {statements.filter(s => s.type === 'k1').length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {statements.filter(s => s.type === 'k1').map((doc) => (
                            <div key={doc.id} className="p-4 bg-gray-700/30 rounded-xl">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">📑</span>
                                <div>
                                  <p className="text-white font-medium">Schedule K-1 - {doc.period}</p>
                                  <p className="text-gray-400 text-sm">Generated {new Date(doc.generatedDate).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <button className="w-full py-2 bg-[#00D4AA] text-black font-medium rounded-lg hover:bg-[#00B894] transition-colors text-sm">
                                Download K-1
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <p className="text-4xl mb-4">📑</p>
                          <p>No K-1 documents available yet.</p>
                        </div>
                      )}

                      <div className="mt-6 p-4 bg-gray-700/30 rounded-xl">
                        <h4 className="text-white font-medium mb-2">Tax Information Summary (Estimated)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Ordinary Income</p>
                            <p className="text-white font-medium">{formatCurrency(totalYield * 0.8)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Capital Gains</p>
                            <p className="text-white font-medium">{formatCurrency(totalYield * 0.2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Depreciation</p>
                            <p className="text-white font-medium">{formatCurrency(totalCommitted * 0.02)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Est. Tax Liability</p>
                            <p className="text-white font-medium">{formatCurrency(totalYield * 0.25)}</p>
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs mt-4">
                          * These are estimates only. Please consult your tax advisor for actual tax implications.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function SummaryCard({ title, value, subtitle, icon, color }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    yellow: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm rounded-2xl border p-6`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-gray-400 text-sm mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && (
        <p className={`text-sm mt-1 ${subtitle.startsWith('+') ? 'text-green-400' : subtitle.startsWith('-') ? 'text-red-400' : 'text-gray-400'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
