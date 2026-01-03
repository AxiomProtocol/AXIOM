import { useMemo } from 'react';

interface Metrics {
  tvl: { total: string };
  feeBurner: { totalAxmBurned: string; totalFeesCollected: string };
  seed: { totalLocked: string; totalLockers: number };
  insurance: { balance: string; coverageRatio: number };
  susu: { totalPools: number; tvl: string };
  depin: { totalNodes: number };
}

interface Props {
  metrics: Metrics | null;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreGradient(score: number): string {
  if (score >= 80) return 'from-green-500 to-green-600';
  if (score >= 60) return 'from-yellow-500 to-yellow-600';
  if (score >= 40) return 'from-orange-500 to-orange-600';
  return 'from-red-500 to-red-600';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Moderate';
  if (score >= 50) return 'Fair';
  return 'Developing';
}

export default function ProtocolHealthScore({ metrics }: Props) {
  const healthMetrics = useMemo(() => {
    if (!metrics) return null;

    const tvl = parseFloat(metrics.tvl.total) || 0;
    const burned = parseFloat(metrics.feeBurner.totalAxmBurned) || 0;
    const seedLocked = parseFloat(metrics.seed.totalLocked) || 0;
    const lockers = metrics.seed.totalLockers || 0;
    const insuranceBalance = parseFloat(metrics.insurance.balance) || 0;
    const coverageRatio = metrics.insurance.coverageRatio || 0;
    const susuPools = metrics.susu.totalPools || 0;
    const nodes = metrics.depin.totalNodes || 0;

    const tvlScore = Math.min(100, (tvl / 5000000) * 100);
    const burnScore = Math.min(100, (burned / 100000) * 100);
    const lockScore = Math.min(100, (lockers / 100) * 100);
    const insuranceScore = Math.min(100, coverageRatio);
    const communityScore = Math.min(100, ((susuPools + nodes) / 50) * 100);
    const seedParticipation = Math.min(100, (seedLocked / 1000000) * 100);

    const overallScore = (
      tvlScore * 0.25 +
      burnScore * 0.15 +
      lockScore * 0.20 +
      insuranceScore * 0.15 +
      communityScore * 0.15 +
      seedParticipation * 0.10
    );

    return {
      overall: Math.round(overallScore),
      breakdown: [
        { name: 'Total Value Locked', score: Math.round(tvlScore), weight: 25, icon: '💰' },
        { name: 'Token Burns', score: Math.round(burnScore), weight: 15, icon: '🔥' },
        { name: 'Governance Participation', score: Math.round(lockScore), weight: 20, icon: '🗳️' },
        { name: 'Insurance Coverage', score: Math.round(insuranceScore), weight: 15, icon: '🛡️' },
        { name: 'Community Activity', score: Math.round(communityScore), weight: 15, icon: '👥' },
        { name: 'SEED Locked', score: Math.round(seedParticipation), weight: 10, icon: '🌱' },
      ]
    };
  }, [metrics]);

  if (!healthMetrics) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-700 h-24 w-24"></div>
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-yellow-500/30 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">📈</span>
        Protocol Health Score
      </h3>

      <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-700"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(healthMetrics.overall / 100) * 352} 352`}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={`${getScoreGradient(healthMetrics.overall).split(' ')[0].replace('from-', 'stop-')}`} stopColor={healthMetrics.overall >= 60 ? '#22c55e' : '#f59e0b'} />
                <stop offset="100%" className={`${getScoreGradient(healthMetrics.overall).split(' ')[1].replace('to-', 'stop-')}`} stopColor={healthMetrics.overall >= 60 ? '#16a34a' : '#d97706'} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${getScoreColor(healthMetrics.overall)}`}>
              {healthMetrics.overall}
            </span>
            <span className="text-xs text-gray-400">/ 100</span>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className={`text-2xl font-bold ${getScoreColor(healthMetrics.overall)}`}>
            {getScoreLabel(healthMetrics.overall)}
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Protocol health based on TVL, burns, governance, and community activity
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {healthMetrics.breakdown.map((metric) => (
          <div key={metric.name} className="flex items-center gap-3">
            <span className="text-lg w-8">{metric.icon}</span>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{metric.name}</span>
                <span className={getScoreColor(metric.score)}>{metric.score}/100</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(metric.score)}`}
                  style={{ width: `${metric.score}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-500 w-10">{metric.weight}%</span>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-yellow-400">💡</span>
          <div className="text-sm text-gray-300">
            <strong className="text-yellow-400">How to improve:</strong> Lock AXM as veAXM for governance, 
            join SUSU circles, or run DePIN nodes to boost protocol health and earn rewards.
          </div>
        </div>
      </div>
    </div>
  );
}
