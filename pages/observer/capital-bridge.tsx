import React, { useState, useEffect } from 'react';
import { ObserverLayout, ObserverCard, ObserverLoading } from '../../components/observer/ObserverLayout';

interface CapitalBridgeData {
  success: boolean;
  timestamp: string;
  capitalBridge: {
    status: string;
    packets: { total: number; label: string };
    spvs: { total: number; label: string };
    authorizations: { total: number; label: string };
    settlements: { total: number; label: string };
  };
  readinessGate: {
    isReady: boolean;
    observationStartDate: string | null;
    daysElapsed: number;
    freezeWindowDays: number;
    attestation: {
      uptimeBps: number;
      incidentsCount: number;
      tvlUsd: number;
      auditHash: string;
      lastUpdated: string | null;
    };
  };
  securitization: {
    instruments: { total: number; label: string };
    pools: { total: number; label: string };
    servicingEvents: { total: number; label: string };
  };
  contracts: Record<string, string>;
  proofLinks: Array<{ label: string; url: string }>;
}

function MetricCard({ label, value, subtitle, color }: { label: string; value: string | number; subtitle?: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isReady = status === 'READY';
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${isReady ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>
      {status}
    </span>
  );
}

export default function CapitalBridgeObserver() {
  const [data, setData] = useState<CapitalBridgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/observer/capital-bridge');
        if (!res.ok) throw new Error('Failed to fetch data');
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <ObserverLayout title="Capital Bridge" description="SPV coordination and institutional capital deployment" currentTab="capital-bridge"><ObserverLoading /></ObserverLayout>;
  if (error) return <ObserverLayout title="Capital Bridge" description="SPV coordination and institutional capital deployment" currentTab="capital-bridge"><div className="text-red-600">Error: {error}</div></ObserverLayout>;
  if (!data) return null;

  return (
    <ObserverLayout 
      title="Capital Bridge" 
      description="SPV coordination, property packets, and institutional capital deployment"
      currentTab="capital-bridge"
    >
      <div className="space-y-6">
        <ObserverCard title="System Status">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Capital Readiness Gate</h3>
              <p className="text-sm text-gray-500">Observation window status</p>
            </div>
            <StatusBadge status={data.capitalBridge.status} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard 
              label="Uptime" 
              value={`${(data.readinessGate.attestation.uptimeBps / 100).toFixed(1)}%`}
              color="text-teal-600"
            />
            <MetricCard 
              label="Incidents" 
              value={data.readinessGate.attestation.incidentsCount}
              color={data.readinessGate.attestation.incidentsCount === 0 ? 'text-teal-600' : 'text-amber-600'}
            />
            <MetricCard 
              label="Days Elapsed" 
              value={data.readinessGate.daysElapsed}
              subtitle="Observation window"
              color="text-blue-600"
            />
            <MetricCard 
              label="TVL (USD)" 
              value={`$${data.readinessGate.attestation.tvlUsd.toLocaleString()}`}
              color="text-purple-600"
            />
          </div>

          {data.readinessGate.attestation.lastUpdated && (
            <p className="text-xs text-gray-500">
              Last attestation: {new Date(data.readinessGate.attestation.lastUpdated).toLocaleString()}
            </p>
          )}
        </ObserverCard>

        <ObserverCard title="Capital Bridge Operations">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              label={data.capitalBridge.packets.label}
              value={data.capitalBridge.packets.total}
              color="text-amber-600"
            />
            <MetricCard 
              label={data.capitalBridge.spvs.label}
              value={data.capitalBridge.spvs.total}
              color="text-blue-600"
            />
            <MetricCard 
              label={data.capitalBridge.authorizations.label}
              value={data.capitalBridge.authorizations.total}
              color="text-purple-600"
            />
            <MetricCard 
              label={data.capitalBridge.settlements.label}
              value={data.capitalBridge.settlements.total}
              color="text-teal-600"
            />
          </div>
        </ObserverCard>

        <ObserverCard title="Layer 5G Securitization">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard 
              label={data.securitization.instruments.label}
              value={data.securitization.instruments.total}
              subtitle="WholeLoan, Participation, Note, etc."
              color="text-amber-600"
            />
            <MetricCard 
              label={data.securitization.pools.label}
              value={data.securitization.pools.total}
              subtitle="Instrument groupings"
              color="text-blue-600"
            />
            <MetricCard 
              label={data.securitization.servicingEvents.label}
              value={data.securitization.servicingEvents.total}
              subtitle="Immutable audit trail"
              color="text-purple-600"
            />
          </div>
        </ObserverCard>

        <ObserverCard title="Verified Contracts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.proofLinks.map((link) => (
              <a 
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-900">{link.label}</span>
                <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
                  {data.contracts[link.label as keyof typeof data.contracts]?.slice(0, 10)}...
                </span>
              </a>
            ))}
          </div>
        </ObserverCard>
      </div>
    </ObserverLayout>
  );
}
