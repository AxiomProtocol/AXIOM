import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [trustData, setTrustData] = useState(null);
  const [graduationData, setGraduationData] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAllData();
  }, [timeRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [metricsRes, trustRes, gradRes] = await Promise.all([
        fetch('/api/metrics/platform'),
        fetch('/api/susu/trust-analytics'),
        fetch('/api/susu/graduation-overview')
      ]);

      const [metricsData, trustDataRes, gradDataRes] = await Promise.all([
        metricsRes.json(),
        trustRes.json(),
        gradRes.json()
      ]);

      if (metricsData.success) setMetrics(metricsData.metrics);
      if (trustDataRes.success) setTrustData(trustDataRes.analytics);
      setGraduationData(gradDataRes);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const ProgressBar = ({ value, max = 100, color = 'yellow' }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const colorClasses = {
      yellow: 'from-yellow-500 to-orange-500',
      green: 'from-green-500 to-emerald-500',
      purple: 'from-purple-500 to-pink-500',
      blue: 'from-blue-500 to-cyan-500'
    };
    
    return (
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div 
          className={`h-3 rounded-full bg-gradient-to-r ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  const MiniChart = ({ data, color = '#F59E0B' }) => {
    if (!data || data.length === 0) return null;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 120;
    const height = 40;
    
    const points = data.map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'engagement', label: 'Engagement', icon: '👥' },
    { id: 'financial', label: 'Financial', icon: '💰' },
    { id: 'graduation', label: 'Graduation', icon: '🎓' },
    { id: 'trust', label: 'Trust Scores', icon: '⭐' }
  ];

  if (loading) {
    return (
      <Layout showWallet={false}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showWallet={false}>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-yellow-500">Analytics Dashboard</h1>
              <p className="text-gray-400 mt-1">
                Real-time platform metrics
                <span className="ml-2 text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                  {metrics?.dataSource === 'database' ? 'Live Data' : 'Sample Data'}
                </span>
              </p>
            </div>
            
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              {['24h', '7d', '30d', '90d'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    timeRange === range
                      ? 'bg-yellow-500 text-black font-medium'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="flex overflow-x-auto space-x-1 mb-8 bg-gray-800 rounded-lg p-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 py-2 px-4 rounded-lg whitespace-nowrap transition-all ${
                  activeSection === section.id
                    ? 'bg-yellow-500 text-black font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>

          {activeSection === 'overview' && metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.overview?.map((stat, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{stat.icon}</span>
                      {stat.trend > 0 && (
                        <span className="text-green-400 text-sm flex items-center">
                          <span className="mr-1">↑</span>{stat.trend}%
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold">
                      {typeof stat.value === 'number' && stat.value > 10000 
                        ? `${(stat.value / 1000).toFixed(0)}K`
                        : stat.value.toLocaleString?.() || stat.value}
                    </p>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">SUSU Metrics</h3>
                  <div className="space-y-4">
                    {metrics.susu?.map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-gray-400">{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">System Health</h3>
                  <div className="space-y-4">
                    {metrics.systemHealth?.map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-gray-400">{item.label}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{item.value}</span>
                          <span className={`w-2 h-2 rounded-full ${
                            item.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                          }`}></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'engagement' && metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.engagement?.map((stat, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-6">
                    <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold">
                      {typeof stat.value === 'number' && stat.value <= 100 
                        ? `${stat.value}%`
                        : stat.value}
                    </p>
                    <div className="mt-3">
                      <ProgressBar 
                        value={typeof stat.value === 'number' ? stat.value : 75} 
                        color={['yellow', 'green', 'blue', 'purple'][i % 4]} 
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Engagement Trends</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Daily Active Users', data: [42, 55, 48, 62, 58, 70, 68], trend: '+12%' },
                    { label: 'Weekly Retention', data: [78, 80, 82, 81, 83, 84, 82], trend: '+4%' },
                    { label: 'Session Duration', data: [4.2, 4.5, 4.3, 4.8, 5.0, 4.9, 5.2], trend: '+8%' }
                  ].map((metric, i) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-gray-400 text-sm">{metric.label}</p>
                          <p className="text-green-400 text-sm mt-1">{metric.trend}</p>
                        </div>
                        <MiniChart data={metric.data} color={['#F59E0B', '#10B981', '#8B5CF6'][i]} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'financial' && metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.financial?.map((stat, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-6">
                    <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                    <p className="text-2xl font-bold text-yellow-500">{stat.value}</p>
                    <p className="text-gray-500 text-xs mt-1">{stat.subtext}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Investment Breakdown</h3>
                  <div className="space-y-4">
                    {metrics.investments?.map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-gray-400">{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Monthly Revenue Trend</h3>
                  <div className="flex items-end justify-between h-40">
                    {[65, 72, 58, 80, 75, 92, 88, 95, 89, 100, 94, 105].map((value, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div 
                          className="w-4 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t"
                          style={{ height: `${value}%` }}
                        />
                        <span className="text-xs text-gray-500 mt-1">
                          {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'graduation' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics?.graduation?.map((stat, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-6">
                    <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>

              {graduationData?.groups && (
                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Groups Ready for Graduation</h3>
                  <div className="space-y-4">
                    {graduationData.groups.filter(g => g.readyForGraduation).map((group, i) => (
                      <div key={i} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{group.name}</p>
                          <p className="text-gray-400 text-sm">{group.memberCount} members</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-purple-400 font-bold">{group.progress}%</p>
                            <p className="text-gray-500 text-xs">Progress</p>
                          </div>
                          <button className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            Graduate
                          </button>
                        </div>
                      </div>
                    ))}
                    {graduationData.groups.filter(g => g.readyForGraduation).length === 0 && (
                      <p className="text-gray-400 text-center py-4">No groups ready for graduation yet</p>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-500/30">
                <h3 className="text-lg font-bold mb-4">Graduation Pipeline</h3>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">1</div>
                      <span className="text-gray-400">Purpose Groups</span>
                    </div>
                    <ProgressBar value={graduationData?.summary?.totalGroups || 50} max={100} color="yellow" />
                    <p className="text-xs text-gray-500 mt-1">{graduationData?.summary?.totalGroups || 50} active</p>
                  </div>
                  <div className="mx-4 text-gray-600">→</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">2</div>
                      <span className="text-gray-400">SUSU Circles</span>
                    </div>
                    <ProgressBar value={30} max={100} color="purple" />
                    <p className="text-xs text-gray-500 mt-1">30 graduated</p>
                  </div>
                  <div className="mx-4 text-gray-600">→</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">3</div>
                      <span className="text-gray-400">Capital Mode</span>
                    </div>
                    <ProgressBar value={15} max={100} color="green" />
                    <p className="text-xs text-gray-500 mt-1">15 in capital</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'trust' && trustData && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold">Overall Trust Score</h3>
                    <p className="text-gray-400 text-sm">Platform-wide trust metrics</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-yellow-500">{trustData.overallScore}</p>
                    <p className={`text-sm ${
                      trustData.trend === 'up' ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {trustData.trend === 'up' ? '↑' : '→'} {trustData.trendValue}% this month
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {trustData.metrics?.map((metric, i) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div className="text-2xl mb-2">{metric.icon}</div>
                      <p className="text-2xl font-bold">{metric.score}</p>
                      <p className="text-gray-400 text-xs">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Trust Score History</h3>
                  <div className="flex items-end justify-between h-40">
                    {trustData.history?.map((item, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div 
                          className="w-8 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t"
                          style={{ height: `${item.score}%` }}
                        />
                        <span className="text-xs text-gray-500 mt-2">{item.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Insights</h3>
                  <div className="space-y-3">
                    {trustData.insights?.map((insight, i) => (
                      <div key={i} className={`flex items-start space-x-3 p-3 rounded-lg ${
                        insight.type === 'positive' ? 'bg-green-900/20' :
                        insight.type === 'warning' ? 'bg-yellow-900/20' :
                        'bg-blue-900/20'
                      }`}>
                        <span className="text-lg">
                          {insight.type === 'positive' ? '✓' : insight.type === 'warning' ? '⚠️' : 'ℹ️'}
                        </span>
                        <p className="text-sm text-gray-300">{insight.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-gray-500 text-sm">
            Last updated: {metrics?.lastUpdated ? new Date(metrics.lastUpdated).toLocaleString() : 'Just now'}
          </div>
        </div>
      </div>
    </Layout>
  );
}
