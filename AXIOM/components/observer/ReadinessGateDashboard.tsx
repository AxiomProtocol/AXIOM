import React, { useState, useEffect, useCallback } from 'react';

interface ReadinessAttestation {
  uptimeBps: number;
  uptimePercent: number;
  incidentsCount: number;
  tvlUsd: string;
  lastUpdated: string | null;
  observationStartTimestamp: string | null;
  auditHash: string;
}

interface ReadinessConfig {
  requiredAuditHash: string;
  minimumUptimeBps: number;
  minimumUptimePercent: number;
  minimumObservationDaysElapsed: number;
  maxIncidentsAllowed: number;
  minimumTVLUsd: string;
  freezeWindowSeconds: number;
}

interface ReadinessStatus {
  isReady: boolean;
  failureReason: string;
  observationDaysElapsed: number;
  attestation: ReadinessAttestation | null;
  config: ReadinessConfig | null;
  freezeStatus: {
    inFreeze: boolean;
    unfreezeAt: string | null;
  };
  attestationFreshness: number;
  maxStaleness: number;
  paused: boolean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatUsd(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0';
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

export default function ReadinessGateDashboard() {
  const [data, setData] = useState<ReadinessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/operator/readiness');
      if (!response.ok) throw new Error('Failed to fetch readiness data');
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-3 text-gray-600">Loading readiness status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-600">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const readinessChecks = [
    {
      name: 'Observation Period',
      status: data.observationDaysElapsed >= (data.config?.minimumObservationDaysElapsed || 0),
      current: `${data.observationDaysElapsed} days`,
      required: `${data.config?.minimumObservationDaysElapsed || 0} days`,
      icon: '📊'
    },
    {
      name: 'System Uptime',
      status: (data.attestation?.uptimeBps || 0) >= (data.config?.minimumUptimeBps || 0),
      current: `${(data.attestation?.uptimePercent || 0).toFixed(2)}%`,
      required: `${(data.config?.minimumUptimePercent || 0).toFixed(2)}%`,
      icon: '⚡'
    },
    {
      name: 'Incident Count',
      status: (data.attestation?.incidentsCount || 0) <= (data.config?.maxIncidentsAllowed || 0),
      current: `${data.attestation?.incidentsCount || 0}`,
      required: `≤ ${data.config?.maxIncidentsAllowed || 0}`,
      icon: '🛡️'
    },
    {
      name: 'TVL Threshold',
      status: parseFloat(data.attestation?.tvlUsd || '0') >= parseFloat(data.config?.minimumTVLUsd || '0'),
      current: formatUsd(data.attestation?.tvlUsd || '0'),
      required: formatUsd(data.config?.minimumTVLUsd || '0'),
      icon: '💰'
    }
  ];

  const passedChecks = readinessChecks.filter(c => c.status).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Capital Readiness Gate</h2>
          <p className="text-sm text-gray-500">On-chain verification of protocol readiness for capital deployment</p>
        </div>
        <div className="flex items-center space-x-3">
          {data.paused && (
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
              Paused
            </span>
          )}
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            data.isReady 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {data.isReady ? 'Ready' : 'Not Ready'}
          </span>
        </div>
      </div>

      {!data.isReady && data.failureReason && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-amber-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-amber-800">Readiness Check Failed</p>
              <p className="text-sm text-amber-700 mt-1">{data.failureReason}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Readiness Progress</span>
          <span className="text-sm text-gray-500">{passedChecks}/{readinessChecks.length} checks passed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full transition-all duration-500 ${
              passedChecks === readinessChecks.length ? 'bg-green-500' : 'bg-teal-500'
            }`}
            style={{ width: `${(passedChecks / readinessChecks.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {readinessChecks.map((check, i) => (
          <div key={i} className={`p-4 rounded-lg border ${
            check.status 
              ? 'bg-green-50 border-green-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-xl mr-2">{check.icon}</span>
                <span className="font-medium text-gray-900">{check.name}</span>
              </div>
              {check.status ? (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Current: <span className="font-medium">{check.current}</span></span>
              <span className="text-gray-500">Required: {check.required}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Observation Started</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatDate(data.attestation?.observationStartTimestamp || null)}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Attestation</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatDate(data.attestation?.lastUpdated || null)}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Attestation Freshness</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatDuration(data.attestationFreshness)}
          </p>
          <p className="text-xs text-gray-500">of {formatDuration(data.maxStaleness)} max</p>
        </div>
      </div>

      {data.freezeStatus.inFreeze && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-blue-800">Freeze Window Active</p>
              <p className="text-sm text-blue-700">
                Capital operations paused until {formatDate(data.freezeStatus.unfreezeAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Contract: <a 
            href="https://arbitrum.blockscout.com/address/0xc3f798066e1401aa30Da8703A4c0588A1076ff39"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline font-mono"
          >
            0xc3f7...ff39
          </a>
        </div>
        <div className="text-xs text-gray-500">
          {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
        </div>
      </div>
    </div>
  );
}
