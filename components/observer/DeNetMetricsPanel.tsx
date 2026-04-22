import React, { useState, useEffect } from 'react';

interface DeNetMetrics {
  success: boolean;
  configured: boolean;
  metrics: {
    totalFiles: number;
    totalStorageBytes: number;
    totalStorageFormatted: string;
    uploadCount24h: number;
    verificationRate: number;
    averageLatencyMs: number;
    replicationHealth: number;
    failedUploads24h: number;
    successfulVerifications24h: number;
  };
  nodeHealth: {
    status: 'healthy' | 'degraded' | 'offline';
    uptime: number;
    peerCount: number;
    lastSync: string;
  };
  storageDistribution: {
    propertyResearch: number;
    dueDiligence: number;
    attestations: number;
    underwriting: number;
    legal: number;
    other: number;
  };
  timestamp: string;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

export default function DeNetMetricsPanel() {
  const [metrics, setMetrics] = useState<DeNetMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchMetrics() {
    try {
      const res = await fetch('/api/denet/metrics');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data = await res.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">DeNet Storage</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">DeNet Storage</h2>
        <div className="text-red-500 text-sm">{error || 'Failed to load metrics'}</div>
      </div>
    );
  }

  const statusColor = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    offline: 'bg-red-500',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">DeNet Decentralized Storage</h2>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor[metrics.nodeHealth.status]}`}></span>
          <span className="text-sm text-gray-600 capitalize">{metrics.nodeHealth.status}</span>
        </div>
      </div>

      {!metrics.configured ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">DeNet is not configured. Add DENET_NODE_KEY to enable decentralized storage.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{metrics.metrics.totalFiles.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Files</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{metrics.metrics.totalStorageFormatted}</div>
              <div className="text-sm text-gray-500">Storage Used</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{metrics.metrics.verificationRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Verification Rate</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-teal-600">{metrics.metrics.replicationHealth.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Replication Health</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Node Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Uptime</span>
                  <span className="font-medium">{formatUptime(metrics.nodeHealth.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Peers Connected</span>
                  <span className="font-medium">{metrics.nodeHealth.peerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Latency</span>
                  <span className="font-medium">{metrics.metrics.averageLatencyMs}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Sync</span>
                  <span className="font-medium">{new Date(metrics.nodeHealth.lastSync).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">24h Activity</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Uploads</span>
                  <span className="font-medium text-green-600">+{metrics.metrics.uploadCount24h}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Verifications</span>
                  <span className="font-medium">{metrics.metrics.successfulVerifications24h}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Failed Uploads</span>
                  <span className={`font-medium ${metrics.metrics.failedUploads24h > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {metrics.metrics.failedUploads24h}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Storage Distribution</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {Object.entries(metrics.storageDistribution).map(([key, value]) => (
                <div key={key} className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-lg font-semibold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
        Last updated: {new Date(metrics.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
