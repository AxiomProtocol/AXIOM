import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StepProgressBanner from '../components/StepProgressBanner';

export default function PlatformMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/metrics/platform?range=${timeRange}`);
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toLocaleString() || '0';
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return { icon: '↑', color: 'text-green-400' };
    if (trend < 0) return { icon: '↓', color: 'text-red-400' };
    return { icon: '→', color: 'text-gray-400' };
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-3 border-yellow-500 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <StepProgressBanner isAdvanced={true} />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Platform Metrics
                </span>
              </h1>
              <p className="text-gray-400">Real-time analytics and platform health</p>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              {['7d', '30d', '90d', 'all'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {range === 'all' ? 'All Time' : range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {metrics?.overview?.map((item, idx) => {
              const trend = getTrendIcon(item.trend);
              return (
                <div key={idx} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm text-gray-400">{item.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{formatNumber(item.value)}</div>
                  <div className={`text-sm ${trend.color} flex items-center gap-1 mt-1`}>
                    <span>{trend.icon}</span>
                    <span>{Math.abs(item.trend)}% vs last period</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>👥</span> User Engagement
              </h3>
              <div className="space-y-4">
                {metrics?.engagement?.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="text-white">{item.value}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-500 to-amber-500"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>💰</span> Financial Health
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {metrics?.financial?.map((item, idx) => (
                  <div key={idx} className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">{item.label}</div>
                    <div className="text-xl font-bold text-white">{item.value}</div>
                    {item.subtext && (
                      <div className="text-xs text-gray-500 mt-1">{item.subtext}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>🔄</span> SUSU Metrics
              </h3>
              <div className="space-y-3">
                {metrics?.susu?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>🎓</span> Graduation Stats
              </h3>
              <div className="space-y-3">
                {metrics?.graduation?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>📈</span> Investment Activity
              </h3>
              <div className="space-y-3">
                {metrics?.investments?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>⚡</span> System Health
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics?.systemHealth?.map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className={`text-3xl font-bold ${
                    item.status === 'healthy' ? 'text-green-400' :
                    item.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {item.value}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
