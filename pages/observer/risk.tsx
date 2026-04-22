import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { RiskData, ExposureMetric, ConcentrationEntry, RedFlag } from '../../server/services/observer/types';

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

function RiskGauge({ label, value, status }: { label: string; value: number; status: string }) {
  const colors = {
    safe: 'bg-dl-navy',
    warning: 'bg-dl-gold',
    critical: 'bg-dl-error'
  };

  const textColors = {
    safe: 'text-dl-forest',
    warning: 'text-dl-gold',
    critical: 'text-dl-error'
  };

  return (
    <div className="border border-dl-border p-4">
      <h3 className="text-sm font-dl-mono text-dl-gray uppercase tracking-wide">{label}</h3>
      <div className="mt-4">
        <div className="flex justify-between mb-1">
          <span className={`text-2xl font-dl-mono ${textColors[status as keyof typeof textColors] || textColors.safe}`}>{value}%</span>
          <span className={`px-2 py-1 text-xs font-dl-mono ${
            status === 'safe' ? 'bg-dl-bg-alt text-dl-forest' :
            status === 'warning' ? 'bg-dl-bg-alt text-dl-gold' :
            'bg-dl-bg-alt text-dl-error'
          }`}>
            {status.toUpperCase()}
          </span>
        </div>
        <div className="w-full bg-dl-bg-alt h-3">
          <div
            className={`h-3 ${colors[status as keyof typeof colors] || colors.safe}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default function ObserverRisk() {
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/observer/risk');
        const result = await response.json();
        if (result.success) setData(result.data);
      } catch (err) {
        console.error('Failed to fetch risk data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getUtilizationByName = (name: string): number => {
    const metric = data?.exposureMetrics?.find((m: ExposureMetric) => m.name.toLowerCase().includes(name.toLowerCase()));
    return metric?.utilization || 0;
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>Risk | Institutional Observer | Axiom Protocol</title>
        <meta name="description" content="Exposure limits, concentration analysis, and system alerts" />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy">Risk</h1>
      <p className="text-dl-gray mt-1 mb-6">Exposure limits, concentration analysis, and system alerts</p>

      <ObserverNav current="risk" />

      {loading ? (
        <p className="text-sm text-dl-gray font-dl-mono">Loading data...</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <RiskGauge
              label="Portfolio Utilization"
              value={getUtilizationByName('Total Exposure')}
              status={getUtilizationByName('Total Exposure') > 80 ? 'warning' : getUtilizationByName('Total Exposure') > 95 ? 'critical' : 'safe'}
            />
            <RiskGauge
              label="Capital Ratio"
              value={getUtilizationByName('Max LTV')}
              status={getUtilizationByName('Max LTV') < 20 ? 'warning' : getUtilizationByName('Max LTV') < 10 ? 'critical' : 'safe'}
            />
            <RiskGauge
              label="Concentration"
              value={getUtilizationByName('Max Single Loan')}
              status={getUtilizationByName('Max Single Loan') > 50 ? 'warning' : getUtilizationByName('Max Single Loan') > 75 ? 'critical' : 'safe'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="border border-dl-border p-6">
              <SectionHeading>Exposure Limits</SectionHeading>
              <div className="space-y-3">
                {(data.exposureMetrics || []).map((metric: ExposureMetric) => (
                  <div key={metric.name} className="border-b border-dl-border pb-3">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium">{metric.name}</p>
                      <p className={`font-dl-mono ${
                        metric.utilization > 80 ? 'text-dl-gold' : 'text-dl-forest'
                      }`}>
                        {metric.utilization.toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex justify-between text-sm text-dl-gray">
                      <span>Current: {metric.current}</span>
                      <span>Limit: {metric.limit}</span>
                    </div>
                    <div className="w-full bg-dl-bg-alt h-2 mt-2">
                      <div
                        className={`h-2 ${
                          metric.utilization > 80 ? 'bg-dl-gold' : 'bg-dl-navy'
                        }`}
                        style={{ width: `${Math.min(metric.utilization, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-dl-border p-6">
              <SectionHeading>Concentration Analysis</SectionHeading>
              <div className="space-y-3">
                {(data.concentration || []).map((item: ConcentrationEntry) => (
                  <div key={item.name} className="flex justify-between items-center border-b border-dl-border pb-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-dl-gray">{item.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-dl-mono text-dl-gold">{item.percentOfTotal}%</p>
                      <p className="text-sm text-dl-gray">{item.exposure}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Active Alerts</SectionHeading>
            {!data.redFlags || data.redFlags.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-dl-gray">
                <svg className="w-6 h-6 mr-2 text-dl-forest" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No active risk alerts
              </div>
            ) : (
              <div className="space-y-3">
                {(data.redFlags || []).map((flag: RedFlag, idx: number) => (
                  <div key={idx} className={`p-4 border ${
                    flag.status === 'critical' ? 'border-dl-error' :
                    flag.status === 'warning' ? 'border-dl-border' :
                    'border-dl-border'
                  }`}>
                    <div className="flex items-start">
                      <svg className={`w-5 h-5 mt-0.5 ${
                        flag.status === 'critical' ? 'text-dl-error' :
                        flag.status === 'warning' ? 'text-dl-gold' :
                        'text-dl-navy'
                      }`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3">
                        <p className="font-medium">{flag.type}</p>
                        <p className="text-sm text-dl-gray mt-1">{flag.message}</p>
                        <p className="text-xs text-dl-gray font-dl-mono mt-2">{flag.detectedAt || ''}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-dl-gray">Failed to load risk data</p>
      )}
    </DesignLawLayout>
  );
}
