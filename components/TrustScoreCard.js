import { useState, useEffect } from 'react';

export default function TrustScoreCard({ groupId, compact = false, className = '' }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [groupId]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/susu/trust-analytics${groupId ? `?groupId=${groupId}` : ''}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching trust analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score) => {
    if (score >= 90) return 'from-green-500 to-emerald-500';
    if (score >= 75) return 'from-yellow-500 to-amber-500';
    if (score >= 50) return 'from-orange-500 to-amber-500';
    return 'from-red-500 to-orange-500';
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3" />
          <div className="h-20 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`bg-gray-800 rounded-xl p-6 text-center text-gray-400 ${className}`}>
        Unable to load trust analytics
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`bg-gray-800 border border-gray-700 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Trust Score</div>
            <div className={`text-2xl font-bold ${getScoreColor(analytics.overallScore)}`}>
              {analytics.overallScore}/100
            </div>
          </div>
          <div className="w-16 h-16 relative">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#374151" strokeWidth="6" />
              <circle 
                cx="32" cy="32" r="28" fill="none" 
                className={`stroke-current ${getScoreColor(analytics.overallScore)}`}
                strokeWidth="6"
                strokeDasharray={`${analytics.overallScore * 1.76} 176`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden ${className}`}>
      <div className={`bg-gradient-to-r ${getScoreGradient(analytics.overallScore)} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg">Trust Score Analytics</h3>
            <p className="text-white/70 text-sm">Group reliability metrics</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-white">{analytics.overallScore}</div>
            <div className="text-white/70 text-sm">out of 100</div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="space-y-3">
          {analytics.metrics.map((metric, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400 flex items-center gap-2">
                  <span>{metric.icon}</span>
                  {metric.label}
                </span>
                <span className={getScoreColor(metric.score)}>{metric.score}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getScoreGradient(metric.score)}`}
                  style={{ width: `${metric.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-white mb-3">Key Insights</h4>
          <div className="space-y-2">
            {analytics.insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <span className={insight.type === 'positive' ? 'text-green-400' : insight.type === 'warning' ? 'text-yellow-400' : 'text-gray-400'}>
                  {insight.type === 'positive' ? '✓' : insight.type === 'warning' ? '!' : '•'}
                </span>
                <span className="text-gray-300">{insight.message}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Next milestone:</span>
            <span className="text-yellow-400 font-medium">{analytics.nextMilestone}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
