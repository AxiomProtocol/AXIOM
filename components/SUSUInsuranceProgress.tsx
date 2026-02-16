import { useMemo } from 'react';

interface InsuranceStats {
  balance: number;
  totalCoverage: number;
  activeCircles: number;
  totalPooled: number;
  claimsPaid: number;
  pendingClaims: number;
}

interface Props {
  stats?: InsuranceStats;
  circleAmount?: number;
  compact?: boolean;
}

const DEFAULT_STATS: InsuranceStats = {
  balance: 12500,
  totalCoverage: 250000,
  activeCircles: 15,
  totalPooled: 125000,
  claimsPaid: 2500,
  pendingClaims: 0
};

export default function SUSUInsuranceProgress({ 
  stats = DEFAULT_STATS, 
  circleAmount = 0,
  compact = false 
}: Props) {
  const metrics = useMemo(() => {
    const coverageRatio = (stats.balance / stats.totalPooled) * 100;
    const coveragePerCircle = stats.balance / stats.activeCircles;
    const yourCoverage = circleAmount > 0 
      ? Math.min(circleAmount, coveragePerCircle) 
      : 0;
    const yourCoveragePercent = circleAmount > 0 
      ? (yourCoverage / circleAmount) * 100 
      : 0;
    
    return {
      coverageRatio: Math.min(100, coverageRatio),
      coveragePerCircle,
      yourCoverage,
      yourCoveragePercent,
      healthStatus: coverageRatio >= 10 ? 'Healthy' : coverageRatio >= 5 ? 'Moderate' : 'Low'
    };
  }, [stats, circleAmount]);

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'Healthy': return 'text-green-400';
      case 'Moderate': return 'text-yellow-400';
      default: return 'text-red-400';
    }
  };

  const getHealthBg = (status: string) => {
    switch (status) {
      case 'Healthy': return 'from-green-500 to-green-600';
      case 'Moderate': return 'from-yellow-500 to-yellow-600';
      default: return 'from-red-500 to-red-600';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-4 py-2">
        <span className="text-xl">🛡️</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Insurance Coverage</span>
            <span className={`text-sm font-semibold ${getHealthColor(metrics.healthStatus)}`}>
              {metrics.coverageRatio.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${getHealthBg(metrics.healthStatus)}`}
              style={{ width: `${Math.min(100, metrics.coverageRatio)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-blue-500/30 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🛡️</span>
        Wealth Practice Insurance Fund
      </h3>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Fund Status</span>
            <span className={`text-sm font-semibold ${getHealthColor(metrics.healthStatus)}`}>
              {metrics.healthStatus}
            </span>
          </div>
          
          <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden mb-4">
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${getHealthBg(metrics.healthStatus)} transition-all duration-500`}
              style={{ width: `${Math.min(100, metrics.coverageRatio)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-semibold">
              {metrics.coverageRatio.toFixed(1)}% Coverage
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400">Fund Balance</div>
              <div className="text-lg font-bold text-green-400">${stats.balance.toLocaleString()}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400">Total Pooled</div>
              <div className="text-lg font-bold text-blue-400">${stats.totalPooled.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span className="text-sm text-gray-400">Active Circles</span>
              </div>
              <span className="text-white font-semibold">{stats.activeCircles}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>💰</span>
                <span className="text-sm text-gray-400">Coverage Per Circle</span>
              </div>
              <span className="text-green-400 font-semibold">${metrics.coveragePerCircle.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span className="text-sm text-gray-400">Claims Paid</span>
              </div>
              <span className="text-yellow-400 font-semibold">${stats.claimsPaid.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⏳</span>
                <span className="text-sm text-gray-400">Pending Claims</span>
              </div>
              <span className="text-gray-300 font-semibold">{stats.pendingClaims}</span>
            </div>
          </div>
        </div>
      </div>

      {circleAmount > 0 && (
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Your Circle Protection</span>
            <span className="text-blue-400 font-semibold">{metrics.yourCoveragePercent.toFixed(0)}% covered</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
              style={{ width: `${metrics.yourCoveragePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Your contribution: ${circleAmount.toLocaleString()}</span>
            <span>Protected: ${metrics.yourCoverage.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-blue-400">ℹ️</span>
          <div className="text-sm text-gray-300">
            The Insurance Fund is built from 5% of DePIN node rewards and protects Wealth Practice circles 
            against defaults. Higher coverage = safer circles.
          </div>
        </div>
      </div>
    </div>
  );
}
