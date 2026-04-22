import { useState, useEffect } from 'react';

interface InsuranceFundStats {
  balance: string;
  totalDiverted: string;
  totalPaid: string;
  pendingClaims: number;
  coverageRatioPercent: number;
  coverageCapacity: string;
}

export default function InsuranceFundMonitor() {
  const [stats, setStats] = useState<InsuranceFundStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setError(null);
    try {
      const res = await fetch('/api/v2/insurance-fund-stats');
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setStats(data);
      } else {
        setError(data.error || 'Failed to load');
      }
    } catch (err: any) {
      setError(err.message);
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

  const getCoverageColor = (ratio: number) => {
    if (ratio >= 150) return 'text-emerald-400';
    if (ratio >= 100) return 'text-green-400';
    if (ratio >= 75) return 'text-yellow-400';
    if (ratio >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-red-500/30 rounded-xl p-6">
        <div className="text-center">
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={fetchStats} className="ml-2 text-yellow-500 hover:text-yellow-400 text-sm">Retry</button>
        </div>
      </div>
    );
  }

  const coverageRatio = stats?.coverageRatioPercent || 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">🛡️</span> Insurance Fund
        </h3>
        <span className={`px-2 py-1 ${coverageRatio >= 100 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'} text-xs rounded-full`}>
          {coverageRatio >= 100 ? 'Fully Covered' : 'Building'}
        </span>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Coverage Ratio</span>
          <span className={`text-2xl font-bold ${getCoverageColor(coverageRatio)}`}>
            {coverageRatio.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              coverageRatio >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 
              coverageRatio >= 75 ? 'bg-gradient-to-r from-yellow-500 to-green-400' :
              'bg-gradient-to-r from-orange-500 to-yellow-400'
            }`}
            style={{ width: `${Math.min(coverageRatio, 150)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Fund Balance</p>
          <p className="text-xl font-bold text-white">{formatNumber(stats?.balance || '0')}</p>
          <p className="text-xs text-gray-500">AXM</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Total Diverted</p>
          <p className="text-xl font-bold text-blue-400">{formatNumber(stats?.totalDiverted || '0')}</p>
          <p className="text-xs text-gray-500">From node rewards</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">{formatNumber(stats?.totalPaid || '0')}</p>
          <p className="text-xs text-gray-400">Claims Paid</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-400">{stats?.pendingClaims || 0}</p>
          <p className="text-xs text-gray-400">Pending</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-400">{formatNumber(stats?.coverageCapacity || '0')}</p>
          <p className="text-xs text-gray-400">Capacity</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-2">Protection Details</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• 5% of all DePIN node rewards diverted</li>
          <li>• Covers defaults in The Wealth Practice circles</li>
          <li>• Claims reviewed within 48 hours</li>
          <li>• Maximum payout per claim: 80% of loss</li>
        </ul>
      </div>
    </div>
  );
}
