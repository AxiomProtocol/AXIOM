import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';

function cleanAIContent(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`/g, '')
    .trim();
}

interface ErrorLog {
  id?: number;
  timestamp?: string;
  createdAt?: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  path?: string;
  method?: string;
  statusCode?: number;
  stack?: string;
  userAgent?: string;
  additionalInfo?: Record<string, any>;
  source?: string;
  resolved?: boolean;
}

export default function ErrorLogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [devMode, setDevMode] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [incidentReport, setIncidentReport] = useState<string | null>(null);
  const [fixSuggestion, setFixSuggestion] = useState<{ index: number; suggestion: string } | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('level', filter);
      params.set('source', 'both');
      params.set('limit', '100');
      
      const response = await fetch(`/api/admin/error-logs?${params}`);
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs?')) return;
    try {
      await fetch('/api/admin/error-logs', { method: 'DELETE' });
      setLogs([]);
      setAiAnalysis(null);
      setSummary(null);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const analyzeErrors = async () => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/admin/error-logs?action=analyze', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setAiAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const getSummary = async () => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/admin/error-logs?action=summary', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Summary failed:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const generateReport = async () => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/admin/error-logs?action=incident-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Error Incident Report', timeRange: 'Last 24 hours' })
      });
      const data = await response.json();
      if (data.success) {
        setIncidentReport(data.report);
      }
    } catch (error) {
      console.error('Report generation failed:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const suggestFix = async (log: ErrorLog, index: number) => {
    setFixSuggestion({ index, suggestion: 'Loading...' });
    try {
      const response = await fetch('/api/admin/error-logs?action=suggest-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: log.message, stack: log.stack })
      });
      const data = await response.json();
      if (data.success) {
        setFixSuggestion({ index, suggestion: data.suggestion });
      }
    } catch (error) {
      setFixSuggestion({ index, suggestion: 'Failed to generate suggestion' });
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh && devMode) {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, devMode, fetchLogs]);

  useEffect(() => {
    if (devMode && typeof window !== 'undefined') {
      const originalError = console.error;
      console.error = (...args) => {
        originalError.apply(console, args);
        const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        fetch('/api/admin/error-logs?action=log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'error',
            message: message.slice(0, 1000),
            source: 'console',
            userAgent: navigator.userAgent
          })
        }).catch(() => {});
      };

      window.onerror = (message, source, lineno, colno, error) => {
        fetch('/api/admin/error-logs?action=log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'error',
            message: String(message),
            path: source,
            stack: error?.stack,
            additionalInfo: { lineno, colno }
          })
        }).catch(() => {});
      };

      window.onunhandledrejection = (event) => {
        fetch('/api/admin/error-logs?action=log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'error',
            message: `Unhandled Promise Rejection: ${event.reason}`,
            stack: event.reason?.stack
          })
        }).catch(() => {});
      };

      return () => {
        console.error = originalError;
      };
    }
  }, [devMode]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warn': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'debug': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getLogTime = (log: ErrorLog) => {
    const time = log.createdAt || log.timestamp;
    return time ? new Date(time).toLocaleString() : 'Unknown';
  };

  return (
    <Layout showWallet={false}>
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-yellow-500">Error Logs</h1>
              <p className="text-gray-400 mt-1">AI-powered error monitoring and analysis</p>
            </div>
            <div className="flex gap-3">
              <Link 
                href="/admin/treasury"
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Back to Admin
              </Link>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={devMode}
                    onChange={(e) => setDevMode(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-gray-300 text-sm">Development Mode</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-gray-300 text-sm">Auto-refresh (5s)</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                {devMode && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Live Capture Active
                  </span>
                )}
                <span className="text-gray-400 text-sm">{logs.length} logs</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <button
              onClick={analyzeErrors}
              disabled={aiLoading || logs.length === 0}
              className="flex items-center justify-center gap-2 p-4 bg-purple-600/20 border border-purple-500/30 rounded-xl hover:bg-purple-600/30 transition-colors disabled:opacity-50"
            >
              <span className="text-2xl">🔍</span>
              <div className="text-left">
                <div className="text-white font-medium">AI Pattern Analysis</div>
                <div className="text-purple-300 text-xs">Detect error patterns</div>
              </div>
            </button>
            <button
              onClick={getSummary}
              disabled={aiLoading || logs.length === 0}
              className="flex items-center justify-center gap-2 p-4 bg-blue-600/20 border border-blue-500/30 rounded-xl hover:bg-blue-600/30 transition-colors disabled:opacity-50"
            >
              <span className="text-2xl">📊</span>
              <div className="text-left">
                <div className="text-white font-medium">Error Summary</div>
                <div className="text-blue-300 text-xs">Get quick overview</div>
              </div>
            </button>
            <button
              onClick={generateReport}
              disabled={aiLoading || logs.length === 0}
              className="flex items-center justify-center gap-2 p-4 bg-amber-600/20 border border-amber-500/30 rounded-xl hover:bg-amber-600/30 transition-colors disabled:opacity-50"
            >
              <span className="text-2xl">📋</span>
              <div className="text-left">
                <div className="text-white font-medium">Incident Report</div>
                <div className="text-amber-300 text-xs">Generate full report</div>
              </div>
            </button>
            <button
              onClick={fetchLogs}
              className="flex items-center justify-center gap-2 p-4 bg-green-600/20 border border-green-500/30 rounded-xl hover:bg-green-600/30 transition-colors"
            >
              <span className="text-2xl">🔄</span>
              <div className="text-left">
                <div className="text-white font-medium">Refresh Logs</div>
                <div className="text-green-300 text-xs">Fetch latest errors</div>
              </div>
            </button>
          </div>

          {aiLoading && (
            <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                <span className="text-purple-300">AI is analyzing your errors...</span>
              </div>
            </div>
          )}

          {aiAnalysis && (
            <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
                  <span>🔍</span> AI Pattern Analysis
                </h3>
                <button onClick={() => setAiAnalysis(null)} className="text-gray-400 hover:text-white">
                  ✕
                </button>
              </div>
              <div className="text-gray-300 whitespace-pre-wrap">{cleanAIContent(aiAnalysis)}</div>
            </div>
          )}

          {summary && (
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-300 flex items-center gap-2">
                  <span>📊</span> Error Summary
                </h3>
                <button onClick={() => setSummary(null)} className="text-gray-400 hover:text-white">
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{summary.totalErrors}</div>
                  <div className="text-gray-400 text-sm">Total Logs</div>
                </div>
                <div className="bg-red-900/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{summary.byLevel?.error || 0}</div>
                  <div className="text-gray-400 text-sm">Errors</div>
                </div>
                <div className="bg-yellow-900/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{summary.byLevel?.warn || 0}</div>
                  <div className="text-gray-400 text-sm">Warnings</div>
                </div>
                <div className="bg-blue-900/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{summary.recentTrend}</div>
                  <div className="text-gray-400 text-sm">Activity</div>
                </div>
              </div>
              <div className="text-gray-300">{cleanAIContent(summary.aiSummary)}</div>
            </div>
          )}

          {incidentReport && (
            <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
                  <span>📋</span> Incident Report
                </h3>
                <button onClick={() => setIncidentReport(null)} className="text-gray-400 hover:text-white">
                  ✕
                </button>
              </div>
              <div className="text-gray-300 whitespace-pre-wrap font-mono text-sm bg-gray-900/50 rounded-lg p-4">
                {cleanAIContent(incidentReport)}
              </div>
            </div>
          )}

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-2">
                {['all', 'error', 'warn', 'info'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setFilter(level)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      filter === level
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
              >
                Clear All
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400">
                <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                Loading logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-4xl mb-4">✓</div>
                <p>No logs found. Everything is running smoothly!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {logs.map((log, index) => (
                  <div key={index} className="p-4 hover:bg-gray-700/50 transition-colors">
                    <div 
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded border ${getLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-100 truncate">{log.message}</p>
                          <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                            {log.path && <span>Path: {log.path}</span>}
                            {log.method && <span>Method: {log.method}</span>}
                            {log.statusCode && <span>Status: {log.statusCode}</span>}
                            {log.source && <span className="text-purple-400">Source: {log.source}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 whitespace-nowrap ml-4">
                        {getLogTime(log)}
                      </div>
                    </div>
                    
                    {expandedIndex === index && (
                      <div className="mt-4 pl-12 space-y-3">
                        {log.level === 'error' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); suggestFix(log, index); }}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-500 transition-colors"
                          >
                            🤖 AI Suggest Fix
                          </button>
                        )}
                        
                        {fixSuggestion?.index === index && (
                          <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
                            <h4 className="text-purple-300 font-medium mb-2 flex items-center gap-2">
                              <span>🤖</span> AI Fix Suggestion
                            </h4>
                            <div className="text-gray-300 text-sm whitespace-pre-wrap">
                              {cleanAIContent(fixSuggestion.suggestion)}
                            </div>
                          </div>
                        )}
                        
                        {log.stack && (
                          <div>
                            <p className="text-sm font-medium text-gray-400 mb-1">Stack Trace:</p>
                            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                              {log.stack}
                            </pre>
                          </div>
                        )}
                        {log.userAgent && (
                          <div>
                            <p className="text-sm font-medium text-gray-400 mb-1">User Agent:</p>
                            <p className="text-sm text-gray-300">{log.userAgent}</p>
                          </div>
                        )}
                        {log.additionalInfo && (
                          <div>
                            <p className="text-sm font-medium text-gray-400 mb-1">Additional Info:</p>
                            <pre className="text-xs bg-gray-900 text-blue-400 p-3 rounded-lg overflow-x-auto">
                              {JSON.stringify(log.additionalInfo, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
