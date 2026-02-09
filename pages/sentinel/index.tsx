import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PageShell,
  DataTable,
  StatusBadge,
  SectionHeading,
} from '../../components/design-law';
import type { Column } from '../../components/design-law';

interface RegimeData {
  regime: string;
  confidence: string;
}

interface OverviewRaw {
  regime: RegimeData | null;
  signalCounts: { total: number; qualified: number };
  decisionCounts: { approved: number; denied: number };
  systemStance: string;
  lastUpdated: string;
}

interface Overview {
  regime: string;
  regime_confidence: number;
  stance: string;
  total_signals: number;
  qualified_signals: number;
  approved_count: number;
  denied_count: number;
}

interface Signal {
  id: string;
  symbol: string;
  asset_type: string;
  direction: string;
  entry_mid: string;
  final_score: string | number | null;
  regime_state: string;
  qualified: boolean;
  created_at: string;
}

interface Decision {
  id: string;
  scope: string;
  action_type: string;
  subject: string;
  max_notional: string;
  decision: string;
  reason_code: string;
  created_at: string;
}

const REGIME_COLORS: Record<string, string> = {
  TREND_UP: 'text-dl-forest',
  TREND_DOWN: 'text-dl-error',
  RANGE_LOW_VOL: 'text-dl-gray',
  HIGH_VOL_DISLOCATION: 'text-dl-gold',
};

const FOOTER_DISCLOSURE =
  'RISK DISCLOSURE: Sentinel is an automated risk authorization layer. All decisions are algorithmically ' +
  'generated based on quantitative models. Past regime classifications and signal scores do not guarantee ' +
  'future accuracy. Axiom Protocol does not provide investment advice.';

function formatUTC(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function formatNotional(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SentinelIndex() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/sentinel/overview').then((r) => r.json()),
      fetch('/api/sentinel/signals?limit=10').then((r) => r.json()),
      fetch('/api/sentinel/decisions?limit=10').then((r) => r.json()),
    ])
      .then(([overviewData, signalsData, decisionsData]) => {
        if (overviewData.error) {
          setError(overviewData.error);
          return;
        }
        const raw = overviewData as OverviewRaw;
        setOverview({
          regime: raw.regime?.regime || '—',
          regime_confidence: raw.regime ? parseFloat(raw.regime.confidence) * 100 : 0,
          stance: raw.systemStance || '—',
          total_signals: raw.signalCounts?.total || 0,
          qualified_signals: raw.signalCounts?.qualified || 0,
          approved_count: raw.decisionCounts?.approved || 0,
          denied_count: raw.decisionCounts?.denied || 0,
        });
        setSignals(signalsData.signals || []);
        setDecisions(decisionsData.decisions || []);
      })
      .catch(() => setError('Failed to connect to server'))
      .finally(() => setLoading(false));
  }, []);

  const signalColumns: Column<Signal>[] = [
    {
      key: 'symbol',
      header: 'Symbol',
      render: (s) => <span className="font-medium text-dl-navy">{s.symbol}</span>,
    },
    {
      key: 'asset_type',
      header: 'Asset Type',
      render: (s) => <span className="text-dl-gray">{s.asset_type}</span>,
    },
    {
      key: 'direction',
      header: 'Direction',
      render: (s) => (
        <span className={s.direction === 'LONG' ? 'text-dl-forest' : 'text-dl-error'}>
          {s.direction}
        </span>
      ),
    },
    {
      key: 'entry_mid',
      header: 'Entry Mid',
      align: 'right',
      render: (s) => <span className="font-dl-mono">{formatNotional(s.entry_mid)}</span>,
    },
    {
      key: 'final_score',
      header: 'Final Score',
      align: 'right',
      render: (s) => <span className="font-dl-mono">{s.final_score != null ? parseFloat(String(s.final_score)).toFixed(4) : '—'}</span>,
    },
    {
      key: 'regime_state',
      header: 'Regime',
      render: (s) => (
        <span className={REGIME_COLORS[s.regime_state] || 'text-dl-gray'}>
          {s.regime_state}
        </span>
      ),
    },
    {
      key: 'qualified',
      header: 'Qualified',
      render: (s) => (
        <span className={s.qualified ? 'text-dl-forest' : 'text-dl-gray'}>
          {s.qualified ? 'YES' : 'NO'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created (UTC)',
      render: (s) => <span className="font-dl-mono text-xs text-dl-gray">{formatUTC(s.created_at)}</span>,
    },
  ];

  const decisionColumns: Column<Decision>[] = [
    {
      key: 'scope',
      header: 'Scope',
      render: (d) => <span className="text-dl-navy">{d.scope}</span>,
    },
    {
      key: 'action_type',
      header: 'Action',
      render: (d) => <span className="text-dl-gray">{d.action_type}</span>,
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (d) => <span className="font-medium text-dl-navy">{d.subject}</span>,
    },
    {
      key: 'max_notional',
      header: 'Max Notional',
      align: 'right',
      render: (d) => <span className="font-dl-mono">{formatNotional(d.max_notional)}</span>,
    },
    {
      key: 'decision',
      header: 'Decision',
      render: (d) => (
        <StatusBadge status={d.decision === 'APPROVED' ? 'ACTIVE' : 'EXPIRED'} className={d.decision === 'APPROVED' ? '' : ''} />
      ),
    },
    {
      key: 'reason_code',
      header: 'Reason',
      render: (d) => <span className="font-dl-mono text-xs text-dl-gray">{d.reason_code}</span>,
    },
    {
      key: 'created_at',
      header: 'Created (UTC)',
      render: (d) => <span className="font-dl-mono text-xs text-dl-gray">{formatUTC(d.created_at)}</span>,
    },
  ];

  return (
    <PageShell
      title="Axiom Sentinel"
      subtitle="Unified Capital Decision & Risk Authorization Layer. Strategy proposes. Sentinel decides. Execution obeys."
      disclosure={FOOTER_DISCLOSURE}
    >
      {loading ? (
        <p className="text-sm text-dl-gray py-12 text-center">Loading data...</p>
      ) : error ? (
        <p className="text-sm text-dl-error py-12 text-center">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="border border-dl-border-light p-4">
              <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">MARKET REGIME</p>
              <p className={`font-dl-heading text-xl ${REGIME_COLORS[overview?.regime || ''] || 'text-dl-navy'}`}>
                {overview?.regime || '—'}
              </p>
              <p className="font-dl-mono text-xs text-dl-gray mt-1">
                {overview?.regime_confidence != null ? `${overview.regime_confidence}% confidence` : ''}
              </p>
            </div>
            <div className="border border-dl-border-light p-4">
              <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">SYSTEM STANCE</p>
              <p className="font-dl-heading text-xl text-dl-navy">{overview?.stance || '—'}</p>
            </div>
            <div className="border border-dl-border-light p-4">
              <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">SIGNALS</p>
              <p className="font-dl-heading text-xl text-dl-navy">
                {overview?.qualified_signals ?? '—'} <span className="text-sm text-dl-gray">/ {overview?.total_signals ?? '—'}</span>
              </p>
              <p className="text-xs text-dl-gray mt-1">qualified / total</p>
            </div>
            <div className="border border-dl-border-light p-4">
              <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">RECENT DECISIONS</p>
              <p className="font-dl-heading text-xl text-dl-navy">
                <span className="text-dl-forest">{overview?.approved_count ?? 0}</span>
                {' / '}
                <span className="text-dl-error">{overview?.denied_count ?? 0}</span>
              </p>
              <p className="text-xs text-dl-gray mt-1">approved / denied</p>
            </div>
          </div>

          <div className="mb-8">
            <SectionHeading>Latest Signals</SectionHeading>
            <DataTable
              columns={signalColumns}
              data={signals}
              keyExtractor={(s) => s.id}
              emptyMessage="No signals recorded."
            />
          </div>

          <div className="mb-8">
            <SectionHeading>Recent Decisions</SectionHeading>
            <DataTable
              columns={decisionColumns}
              data={decisions}
              keyExtractor={(d) => d.id}
              emptyMessage="No decisions recorded."
            />
          </div>

          <div className="border-t border-dl-border pt-4">
            <Link href="/sentinel/audit" className="text-sm text-dl-navy underline">
              View Full Audit Trail →
            </Link>
          </div>
        </>
      )}
    </PageShell>
  );
}
