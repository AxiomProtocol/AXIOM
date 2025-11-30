/* Real-Time Error Monitoring Dashboard
   Advanced analytics, pattern detection, and intelligent insights
   Provides comprehensive error management for rapid resolution
*/

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ErrorEvent {
  id: number;
  errorId: string;
  errorType: string;
  errorMessage: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  subcategory: string;
  errorCount: number;
  affectedUsers: number;
  status: 'open' | 'investigating' | 'resolved' | 'ignored';
  firstOccurrence: string;
  lastOccurrence: string;
  impactLevel: 'blocking' | 'degraded' | 'minor';
  feature: string;
  url: string;
  userAgent: string;
  performanceImpact?: {
    lcp?: number;
    fid?: number;
    cls?: number;
  };
}

interface ErrorMetrics {
  totalErrors: number;
  criticalErrors: number;
  affectedUsers: number;
  averageResolutionTime: number;
  errorRate24h: number;
  topErrorTypes: Array<{
    errorType: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

interface ErrorPattern {
  patternHash: string;
  errorType: string;
  frequency: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  severity: string;
  suggestedFix: string;
}

const ErrorMonitoringDashboard: React.FC = () => {
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null);
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch error data
  const fetchErrorData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        timeRange: selectedTimeRange,
        severity: selectedSeverity,
        status: selectedStatus
      });

      const [errorsRes, metricsRes, patternsRes] = await Promise.all([
        fetch(`/api/errors/events?${params}`),
        fetch(`/api/errors/metrics?${params}`),
        fetch(`/api/errors/patterns?${params}`)
      ]);

      if (errorsRes.ok) {
        const errorsData = await errorsRes.json();
        setErrors(errorsData.errors || []);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (patternsRes.ok) {
        const patternsData = await patternsRes.json();
        setPatterns(patternsData.patterns || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching error monitoring data:', error);
      setLoading(false);
    }
  }, [selectedTimeRange, selectedSeverity, selectedStatus]);

  // Auto-refresh effect
  useEffect(() => {
    fetchErrorData();

    if (autoRefresh) {
      const interval = setInterval(fetchErrorData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchErrorData, autoRefresh]);

  // Update error status
  const updateErrorStatus = async (errorId: string, status: string) => {
    try {
      const response = await fetch(`/api/errors/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorId, status })
      });

      if (response.ok) {
        await fetchErrorData(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-red-600 bg-red-50';
      case 'investigating': return 'text-yellow-600 bg-yellow-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'ignored': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
      case 'increasing':
        return '📈';
      case 'down':
      case 'decreasing':
        return '📉';
      default:
        return '➡️';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Error Monitoring Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time error tracking and intelligent analysis</p>
        </div>
        
        <div className="flex space-x-4">
          {/* Auto-refresh toggle */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>

          {/* Time range selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Severity filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Errors</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalErrors.toLocaleString()}</p>
                </div>
                <div className="text-3xl">🚨</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical Errors</p>
                  <p className="text-2xl font-bold text-red-600">{metrics.criticalErrors}</p>
                </div>
                <div className="text-3xl">🔥</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Affected Users</p>
                  <p className="text-2xl font-bold text-orange-600">{metrics.affectedUsers}</p>
                </div>
                <div className="text-3xl">👥</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                  <p className="text-2xl font-bold text-blue-600">{metrics.averageResolutionTime}m</p>
                </div>
                <div className="text-3xl">⏱️</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Error Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{metrics.errorRate24h.toFixed(2)}%</p>
                </div>
                <div className="text-3xl">📊</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Errors */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {errors.length > 0 ? errors.map((error) => (
                  <div key={error.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(error.severity)}`}>
                            {error.severity.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(error.status)}`}>
                            {error.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {error.feature}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">{error.errorType}</h4>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{error.errorMessage}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Count: {error.errorCount}</span>
                          <span>Users: {error.affectedUsers}</span>
                          <span>Last: {new Date(error.lastOccurrence).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <select
                          value={error.status}
                          onChange={(e) => updateErrorStatus(error.errorId, e.target.value)}
                          className="text-xs border rounded px-2 py-1"
                        >
                          <option value="open">Open</option>
                          <option value="investigating">Investigating</option>
                          <option value="resolved">Resolved</option>
                          <option value="ignored">Ignored</option>
                        </select>
                      </div>
                    </div>
                    
                    {error.performanceImpact && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <strong>Performance Impact:</strong>
                        {error.performanceImpact.lcp && ` LCP: ${error.performanceImpact.lcp}ms`}
                        {error.performanceImpact.fid && ` FID: ${error.performanceImpact.fid}ms`}
                        {error.performanceImpact.cls && ` CLS: ${error.performanceImpact.cls}`}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">✅</div>
                    <p>No errors found for the selected criteria</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Patterns & Top Errors */}
        <div className="space-y-6">
          {/* Top Error Types */}
          {metrics && metrics.topErrorTypes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Error Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topErrorTypes.map((errorType, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {errorType.errorType}
                        </p>
                        <p className="text-xs text-gray-500">
                          {errorType.count} occurrences
                        </p>
                      </div>
                      <div className="ml-2 flex items-center">
                        <span className="text-lg">{getTrendIcon(errorType.trend)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Patterns */}
          {patterns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detected Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {patterns.map((pattern, index) => (
                    <div key={index} className="border rounded p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {pattern.errorType}
                        </span>
                        <span className="text-lg">{getTrendIcon(pattern.trend)}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        Frequency: {pattern.frequency}
                      </p>
                      {pattern.suggestedFix && (
                        <div className="text-xs p-2 bg-blue-50 border border-blue-200 rounded">
                          <strong>Suggested Fix:</strong> {pattern.suggestedFix}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMonitoringDashboard;
