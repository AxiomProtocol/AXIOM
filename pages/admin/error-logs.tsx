import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';

interface ErrorLog {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  path?: string;
  method?: string;
  statusCode?: number;
  stack?: string;
  userAgent?: string;
  additionalInfo?: Record<string, any>;
}

export default function ErrorLogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const levelParam = filter !== 'all' ? `?level=${filter}` : '';
      const response = await fetch(`/api/admin/error-logs${levelParam}`);
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs?')) return;
    try {
      await fetch('/api/admin/error-logs', { method: 'DELETE' });
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warn': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Error Logs</h1>
              <p className="text-gray-600 mt-1">Monitor application errors and warnings</p>
            </div>
            <div className="flex gap-4">
              <Link 
                href="/admin/treasury"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Back to Admin
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex gap-2">
                {['all', 'error', 'warn', 'info'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setFilter(level)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      filter === level
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchLogs}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={clearLogs}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">✓</div>
                <p>No logs found. Everything is running smoothly!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {logs.map((log, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                    <div 
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded border ${getLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{log.message}</p>
                          <div className="flex gap-4 mt-1 text-sm text-gray-500">
                            {log.path && <span>Path: {log.path}</span>}
                            {log.method && <span>Method: {log.method}</span>}
                            {log.statusCode && <span>Status: {log.statusCode}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 whitespace-nowrap ml-4">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    
                    {expandedIndex === index && (
                      <div className="mt-4 pl-12 space-y-3">
                        {log.stack && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Stack Trace:</p>
                            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                              {log.stack}
                            </pre>
                          </div>
                        )}
                        {log.userAgent && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">User Agent:</p>
                            <p className="text-sm text-gray-600">{log.userAgent}</p>
                          </div>
                        )}
                        {log.additionalInfo && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Additional Info:</p>
                            <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto">
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
