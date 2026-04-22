import { useMemo } from 'react';

export default function GroupHealthGauge({ 
  paymentRate = 0, 
  engagementScore = 0, 
  trustScore = 0,
  className = '' 
}) {
  const healthScore = useMemo(() => {
    const weighted = (paymentRate * 0.4) + (engagementScore * 0.3) + (trustScore * 0.3);
    return Math.round(weighted);
  }, [paymentRate, engagementScore, trustScore]);

  const getHealthStatus = (score) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-400', bg: 'from-green-500 to-emerald-500' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-400', bg: 'from-blue-500 to-cyan-500' };
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-400', bg: 'from-yellow-500 to-amber-500' };
    return { label: 'Needs Attention', color: 'text-red-400', bg: 'from-red-500 to-orange-500' };
  };

  const status = getHealthStatus(healthScore);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
    <div className={`bg-gray-800 rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span>💚</span> Group Health Score
      </h3>
      
      <div className="flex items-center justify-between">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              className="text-gray-700"
            />
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="url(#healthGradient)"
              strokeWidth="10"
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={healthScore >= 60 ? '#22c55e' : healthScore >= 40 ? '#eab308' : '#ef4444'} />
                <stop offset="100%" stopColor={healthScore >= 60 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#f97316'} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{healthScore}</span>
            <span className={`text-xs ${status.color}`}>{status.label}</span>
          </div>
        </div>

        <div className="flex-1 ml-6 space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Payment Rate</span>
              <span className="text-white">{paymentRate}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${paymentRate}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Engagement</span>
              <span className="text-white">{engagementScore}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${engagementScore}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Trust Score</span>
              <span className="text-white">{trustScore}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-400 transition-all duration-500"
                style={{ width: `${trustScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Health Factors:</span>
          <span className="text-gray-500">Payment 40% | Engagement 30% | Trust 30%</span>
        </div>
      </div>
    </div>
  );
}
