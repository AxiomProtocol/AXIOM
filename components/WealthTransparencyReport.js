import { useState, useEffect } from 'react';

export default function WealthTransparencyReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await fetch('/api/wealth/transparency-report');
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
      }
    } catch (error) {
      console.error('Error fetching transparency report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
          <span className="text-gray-400">Generating transparency report...</span>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center text-gray-400">
        Unable to load transparency report
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/10 border border-purple-500/30 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📊</div>
            <div>
              <h3 className="text-xl font-bold text-white">Wealth Practice Transparency Report</h3>
              <p className="text-gray-400 text-sm">Real-time data from the Axiom ecosystem</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-400">
            Generated: {formatDate(report.generatedAt)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Graduated Groups</div>
          <div className="text-3xl font-bold text-purple-400">{report.summary.totalGroupsGraduated}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Active Groups</div>
          <div className="text-3xl font-bold text-green-400">{report.summary.totalActiveGroups}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Capital Graduated</div>
          <div className="text-3xl font-bold text-yellow-400">{formatCurrency(report.summary.totalCapitalGraduated)}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Capital Active</div>
          <div className="text-3xl font-bold text-blue-400">{formatCurrency(report.summary.totalCapitalActive)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h4 className="text-lg font-semibold text-white mb-4">Mode Distribution</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-300">Community Mode</span>
              </div>
              <span className="text-white font-medium">{report.summary.communityModeCount} groups</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-gray-300">Capital Mode</span>
              </div>
              <span className="text-white font-medium">{report.summary.capitalModeCount} groups</span>
            </div>
          </div>
          {report.summary.totalGroupsGraduated > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden flex">
                <div 
                  className="bg-green-500 h-full"
                  style={{ width: `${(report.summary.communityModeCount / report.summary.totalGroupsGraduated) * 100}%` }}
                />
                <div 
                  className="bg-yellow-500 h-full"
                  style={{ width: `${(report.summary.capitalModeCount / report.summary.totalGroupsGraduated) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h4 className="text-lg font-semibold text-white mb-4">On-Chain Stats</h4>
          <div className="space-y-4">
            <div>
              <div className="text-gray-400 text-sm">Total Value Locked (TVL)</div>
              <div className="text-2xl font-bold text-white">
                {parseFloat(report.onChain.totalValueLocked).toLocaleString()} AXM
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Investment Pools</div>
              <div className="text-2xl font-bold text-white">{report.onChain.poolCount}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Avg Members at Graduation</div>
              <div className="text-2xl font-bold text-white">
                {report.summary.avgMembersAtGraduation.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {report.categoryBreakdown && report.categoryBreakdown.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h4 className="text-lg font-semibold text-white mb-4">Category Performance</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-right">Total Groups</th>
                  <th className="pb-3 text-right">Graduated</th>
                  <th className="pb-3 text-right">Graduation Rate</th>
                  <th className="pb-3 text-right">Capital</th>
                </tr>
              </thead>
              <tbody>
                {report.categoryBreakdown.map((cat, idx) => (
                  <tr key={idx} className="border-b border-gray-700/50">
                    <td className="py-3 text-white">{cat.category}</td>
                    <td className="py-3 text-right text-gray-300">{cat.totalGroups}</td>
                    <td className="py-3 text-right text-gray-300">{cat.graduatedGroups}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        cat.graduationRate >= 50 ? 'bg-green-500/20 text-green-400' :
                        cat.graduationRate >= 25 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {cat.graduationRate}%
                      </span>
                    </td>
                    <td className="py-3 text-right text-white font-medium">{formatCurrency(cat.totalCapital)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report.graduatedGroups && report.graduatedGroups.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h4 className="text-lg font-semibold text-white mb-4">Recently Graduated Groups</h4>
          <div className="space-y-3">
            {report.graduatedGroups.map((group) => (
              <div key={group.id} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      group.mode === 'capital' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {group.mode === 'capital' ? '📈' : '🤝'}
                    </div>
                    <div>
                      <div className="text-white font-medium">{group.name}</div>
                      <div className="text-sm text-gray-400">
                        {group.category} • {group.hub || 'Global'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">{formatCurrency(group.totalCapital)}</div>
                    <div className="text-sm text-gray-400">
                      {group.memberCount} members • {formatDate(group.graduatedAt)}
                    </div>
                  </div>
                </div>
                {group.txHash && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <a 
                      href={`https://arbitrum.blockscout.com/tx/${group.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-yellow-400 hover:text-yellow-300"
                    >
                      View on Blockscout →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {report.monthlyTrends && report.monthlyTrends.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h4 className="text-lg font-semibold text-white mb-4">Monthly Trends (Last 12 Months)</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3">Month</th>
                  <th className="pb-3 text-right">Groups Created</th>
                  <th className="pb-3 text-right">Groups Graduated</th>
                  <th className="pb-3 text-right">Capital Committed</th>
                </tr>
              </thead>
              <tbody>
                {report.monthlyTrends.slice(0, 6).map((month, idx) => (
                  <tr key={idx} className="border-b border-gray-700/50">
                    <td className="py-3 text-white">
                      {new Date(month.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-3 text-right text-gray-300">{month.groupsCreated}</td>
                    <td className="py-3 text-right text-green-400">{month.groupsGraduated}</td>
                    <td className="py-3 text-right text-white font-medium">{formatCurrency(month.capitalCommitted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
        <a 
          href={`https://arbitrum.blockscout.com/address/${report.contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-yellow-400 transition-colors"
        >
          View CapitalPoolsAndFunds Contract on Blockscout →
        </a>
      </div>
    </div>
  );
}
