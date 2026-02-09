import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

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

const OBSERVER_TABS = [
  { id: 'overview', label: 'Overview', href: '/observer' },
  { id: 'treasury', label: 'Treasury', href: '/observer/treasury' },
  { id: 'governance', label: 'Governance', href: '/observer/governance' },
  { id: 'risk', label: 'Risk', href: '/observer/risk' },
  { id: 'assets', label: 'Assets', href: '/observer/assets' },
  { id: 'controls', label: 'Controls', href: '/observer/controls' },
  { id: 'reports', label: 'Reports', href: '/observer/reports' },
  { id: 'capital-bridge', label: 'Capital Bridge', href: '/observer/capital-bridge' },
  { id: 'node-economy', label: 'Node Economy', href: '/observer/node-economy' },
];

function ObserverNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-0 border-b border-dl-border mb-8">
      {OBSERVER_TABS.map(tab => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`px-4 py-2 text-sm ${tab.id === current ? 'border-b-2 border-dl-navy text-dl-navy font-medium' : 'text-dl-gray'}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function MetricCard({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string; color?: string }) {
  return (
    <div className="border border-dl-border p-4">
      <div className="text-sm text-dl-gray mb-1">{label}</div>
      <div className="text-2xl font-dl-mono text-dl-navy">{value}</div>
      {subtitle && <div className="text-xs text-dl-gray mt-1">{subtitle}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isReady = status === 'READY';
  return (
    <span className={`px-3 py-1 text-sm font-dl-mono ${isReady ? 'bg-dl-bg-alt text-dl-forest' : 'bg-dl-bg-alt text-dl-gold'}`}>
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

  return (
    <DesignLawLayout>
      <Head>
        <title>Capital Bridge | Institutional Observer | Axiom Protocol</title>
        <meta name="description" content="SPV coordination and institutional capital deployment" />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy">Capital Bridge</h1>
      <p className="text-dl-gray mt-1 mb-6">SPV coordination, property packets, and institutional capital deployment</p>

      <ObserverNav current="capital-bridge" />

      {loading ? (
        <p className="text-sm text-dl-gray font-dl-mono">Loading data...</p>
      ) : error ? (
        <div className="border border-dl-error p-4">
          <p className="text-sm text-dl-error">Error: {error}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="border border-dl-border p-6">
            <SectionHeading>System Status</SectionHeading>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-dl-serif text-lg text-dl-navy">Capital Readiness Gate</h3>
                <p className="text-sm text-dl-gray">Observation window status</p>
              </div>
              <StatusBadge status={data.capitalBridge.status} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard
                label="Uptime"
                value={`${(data.readinessGate.attestation.uptimeBps / 100).toFixed(1)}%`}
              />
              <MetricCard
                label="Incidents"
                value={data.readinessGate.attestation.incidentsCount}
              />
              <MetricCard
                label="Days Elapsed"
                value={data.readinessGate.daysElapsed}
                subtitle="Observation window"
              />
              <MetricCard
                label="TVL (USD)"
                value={`$${data.readinessGate.attestation.tvlUsd.toLocaleString()}`}
              />
            </div>

            {data.readinessGate.attestation.lastUpdated && (
              <p className="text-xs text-dl-gray font-dl-mono">
                Last attestation: {new Date(data.readinessGate.attestation.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Capital Bridge Operations</SectionHeading>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label={data.capitalBridge.packets.label}
                value={data.capitalBridge.packets.total}
              />
              <MetricCard
                label={data.capitalBridge.spvs.label}
                value={data.capitalBridge.spvs.total}
              />
              <MetricCard
                label={data.capitalBridge.authorizations.label}
                value={data.capitalBridge.authorizations.total}
              />
              <MetricCard
                label={data.capitalBridge.settlements.label}
                value={data.capitalBridge.settlements.total}
              />
            </div>
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Layer 5G Securitization</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                label={data.securitization.instruments.label}
                value={data.securitization.instruments.total}
                subtitle="WholeLoan, Participation, Note, etc."
              />
              <MetricCard
                label={data.securitization.pools.label}
                value={data.securitization.pools.total}
                subtitle="Instrument groupings"
              />
              <MetricCard
                label={data.securitization.servicingEvents.label}
                value={data.securitization.servicingEvents.total}
                subtitle="Immutable audit trail"
              />
            </div>
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Verified Contracts</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.proofLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-dl-bg-alt text-dl-navy"
                >
                  <span className="font-medium">{link.label}</span>
                  <span className="text-xs text-dl-gray font-dl-mono truncate max-w-[200px]">
                    {data.contracts[link.label as keyof typeof data.contracts]?.slice(0, 10)}...
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </DesignLawLayout>
  );
}
