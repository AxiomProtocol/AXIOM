import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface KYCStatsDashboardProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

interface KYCStats {
  summary: {
    totalSubmissions: number;
    pendingReview: number;
    underReview: number;
    approved: number;
    rejected: number;
    complianceScore: number;
    avgProcessingHours: number;
  };
  statusDistribution: Array<{
    verification_status: string;
    count: number;
  }>;
  riskDistribution: Array<{
    risk_level: string;
    count: number;
  }>;
  processingStats: {
    avg_hours: number;
    min_hours: number;
    max_hours: number;
    processed_count: number;
  };
  dailySubmissions: Array<{
    date: string;
    submissions: number;
  }>;
  reviewerPerformance: Array<{
    reviewer_id: number;
    first_name: string;
    last_name: string;
    reviews_completed: number;
    avg_processing_hours: number;
  }>;
  timeRange: string;
}

export const KYCStatsDashboard: React.FC<KYCStatsDashboardProps> = ({
  onRefresh,
  isLoading = false
}) => {
  const [stats, setStats] = useState<KYCStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/kyc/admin/stats?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch KYC statistics');
      }
      
      const data = await response.json();
      setStats(data.data);
      setLastUpdated(new Date());
      
      if (onRefresh) {
        onRefresh();
      }
      
    } catch (error) {
      console.error('Error fetching KYC stats:', error);
      setError('Failed to load statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'under_review': return 'bg-blue-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'expired': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const formatTimeRange = (range: string) => {
    switch (range) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      default: return 'Last 30 Days';
    }
  };

  const getChangeIcon = (value: number, target?: number) => {
    if (!target) return '➡️';
    if (value > target) return '📈';
    if (value < target) return '📉';
    return '➡️';
  };

  const getComplianceScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 85) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 75) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border-2 border-gray-300 animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-red-300">
        <CardContent className="py-12 text-center">
          <div className="text-red-600">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-lg font-medium mb-2">Error Loading Statistics</p>
            <p className="text-sm mb-4">{error}</p>
            <Button onClick={fetchStats} disabled={loading}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="border-2 border-gray-300">
        <CardContent className="py-12 text-center">
          <div className="text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-lg font-medium mb-2">No Statistics Available</p>
            <p className="text-sm">Click refresh to load KYC statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card className="border-2 border-blue-300">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-blue-800">
                KYC Statistics Dashboard
              </CardTitle>
              {lastUpdated && (
                <p className="text-sm text-gray-600 mt-1">
                  Last updated: {lastUpdated.toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500"
                disabled={loading}
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
              
              <Button
                onClick={fetchStats}
                disabled={loading}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-2 border-blue-300 bg-gradient-to-br from-white to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-800">Total Submissions</h3>
              <span className="text-2xl">📋</span>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {stats.summary.totalSubmissions.toLocaleString()}
            </div>
            <div className="text-sm text-blue-700">
              {formatTimeRange(timeRange)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-300 bg-gradient-to-br from-white to-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-yellow-800">Pending Review</h3>
              <span className="text-2xl">⏳</span>
            </div>
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {stats.summary.pendingReview}
            </div>
            <div className="text-sm text-yellow-700">
              Requires immediate attention
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-300 bg-gradient-to-br from-white to-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-800">Compliance Score</h3>
              <span className="text-2xl">🛡️</span>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {(Number(stats.summary.complianceScore) || 0).toFixed(1)}%
            </div>
            <div className={`text-sm px-2 py-1 rounded border ${getComplianceScoreColor(stats.summary.complianceScore)}`}>
              {stats.summary.complianceScore >= 95 ? 'Excellent' :
               stats.summary.complianceScore >= 85 ? 'Good' :
               stats.summary.complianceScore >= 75 ? 'Acceptable' : 'Needs Improvement'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-300 bg-gradient-to-br from-white to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-800">Avg Processing</h3>
              <span className="text-2xl">⏱️</span>
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {(Number(stats.summary.avgProcessingHours) || 0).toFixed(1)}h
            </div>
            <div className="text-sm text-purple-700 flex items-center">
              Target: &lt;24h {getChangeIcon(stats.summary.avgProcessingHours, 24)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-800">
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.statusDistribution.map((item) => {
                const percentage = stats.summary.totalSubmissions > 0 
                  ? (item.count / stats.summary.totalSubmissions) * 100 
                  : 0;
                return (
                  <div key={item.verification_status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded ${getStatusColor(item.verification_status)}`}></div>
                      <span className="capitalize text-gray-800">
                        {item.verification_status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold text-gray-900">{item.count}</span>
                      <span className="text-sm text-gray-600">({(Number(percentage) || 0).toFixed(1)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-800">
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.riskDistribution.map((item) => {
                const total = stats.riskDistribution.reduce((sum, risk) => sum + risk.count, 0);
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.risk_level} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded ${getRiskColor(item.risk_level)}`}></div>
                      <span className="capitalize text-gray-800">
                        {item.risk_level} Risk
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold text-gray-900">{item.count}</span>
                      <span className="text-sm text-gray-600">({(Number(percentage) || 0).toFixed(1)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Statistics */}
      <Card className="border-2 border-blue-300">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-blue-800">
            Processing Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(Number(stats.processingStats.avg_hours) || 0).toFixed(1)}h
              </div>
              <div className="text-sm text-gray-600">Average Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(Number(stats.processingStats.min_hours) || 0).toFixed(1)}h
              </div>
              <div className="text-sm text-gray-600">Fastest Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {(Number(stats.processingStats.max_hours) || 0).toFixed(1)}h
              </div>
              <div className="text-sm text-gray-600">Slowest Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.processingStats.processed_count || 0}
              </div>
              <div className="text-sm text-gray-600">Total Processed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviewer Performance */}
      {stats.reviewerPerformance.length > 0 && (
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-800">
              Reviewer Performance ({formatTimeRange(timeRange)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-blue-300">
                    <th className="py-3 px-4 font-semibold text-blue-800">Reviewer</th>
                    <th className="py-3 px-4 font-semibold text-blue-800">Reviews Completed</th>
                    <th className="py-3 px-4 font-semibold text-blue-800">Avg Processing Time</th>
                    <th className="py-3 px-4 font-semibold text-blue-800">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.reviewerPerformance.map((reviewer, index) => (
                    <tr key={reviewer.reviewer_id} className="border-b border-blue-200">
                      <td className="py-3 px-4 text-gray-800">
                        <div className="font-medium">
                          {reviewer.first_name} {reviewer.last_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          ID: {reviewer.reviewer_id}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-800">
                        <span className="text-lg font-semibold">{reviewer.reviews_completed}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-800">
                        {(Number(reviewer.avg_processing_hours) || 0).toFixed(1)}h
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {index === 0 && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded border">
                              🏆 Top Performer
                            </span>
                          )}
                          {reviewer.avg_processing_hours < 12 && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded border">
                              ⚡ Fast
                            </span>
                          )}
                          {reviewer.reviews_completed > 10 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border">
                              📈 High Volume
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Submissions Chart */}
      {stats.dailySubmissions.length > 0 && (
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-800">
              Daily Submissions Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.dailySubmissions.reverse().map((day) => {
                const maxSubmissions = Math.max(...stats.dailySubmissions.map(d => d.submissions));
                const percentage = maxSubmissions > 0 ? (day.submissions / maxSubmissions) * 100 : 0;
                
                return (
                  <div key={day.date} className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 w-24">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-gray-200 rounded-full h-4 relative">
                        <div
                          className="bg-blue-500 h-4 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-800 w-12 text-right">
                      {day.submissions}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
