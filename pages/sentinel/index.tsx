import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DesignLawLayout,
  PageShell,
  SectionHeading,
  DisclosureBlock,
} from '../../components/design-law';
import {
  CircuitBreakerBanner,
  RegimeLegend,
  ScoreInterpretation,
  PositionSizingDiagram,
  RiskMechanicsPanel,
  FAQAccordion,
  WalkthroughStepper,
  BehavioralFinancePanel,
  EnhancedSignalsTable,
  RegimeTimeline,
  DecisionsPanel,
} from '../../components/sentinel';

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
  plain_language?: string;
  created_at: string;
}

interface RegimeEntry {
  id: string;
  regime: string;
  confidence: string | number;
  created_at: string;
}

interface HealthData {
  operationalState: string;
  consecutiveFailures: number;
  lastHealthCheckAt: string | null;
}

const REGIME_COLORS: Record<string, string> = {
  TREND_UP: 'text-dl-forest',
  TREND_DOWN: 'text-dl-error',
  RANGE_LOW_VOL: 'text-dl-gray',
  HIGH_VOL_DISLOCATION: 'text-dl-gold',
};

const FOOTER_DISCLOSURE =
  'RISK DISCLOSURE: Sentinel is an automated risk authorization layer operating in advisory-only mode during proof-of-concept. ' +
  'All outputs are informational. No automated trades are executed. All decisions are algorithmically generated based on ' +
  'quantitative models. Past regime classifications and signal scores do not guarantee future accuracy. ' +
  'Axiom Protocol does not provide investment advice. Guard Rail #5: Advisory only until post-public governance vote.';

type TabId = 'dashboard' | 'education';

export default function SentinelIndex() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [regimes, setRegimes] = useState<RegimeEntry[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/sentinel/overview').then((r) => r.json()),
      fetch('/api/sentinel/signals?limit=50').then((r) => r.json()),
      fetch('/api/sentinel/decisions?limit=20').then((r) => r.json()),
      fetch('/api/sentinel/regimes?limit=30').then((r) => r.json()),
      fetch('/api/sentinel/health').then((r) => r.json()),
    ])
      .then(([overviewData, signalsData, decisionsData, regimesData, healthData]) => {
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
        setRegimes(regimesData.regimes || []);
        setHealth(healthData || null);
        setLastUpdated(new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'));
      })
      .catch(() => setError('Failed to connect to server'))
      .finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    if (!signals.length) return;
    const headers = ['Symbol', 'Asset Type', 'Direction', 'Entry Mid', 'Final Score', 'Regime', 'Qualified', 'Created'];
    const rows = signals.map((s) => [
      s.symbol, s.asset_type, s.direction, s.entry_mid,
      s.final_score != null ? String(s.final_score) : '',
      s.regime_state, s.qualified ? 'YES' : 'NO', s.created_at,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-signals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const payload = { overview, signals, decisions, regimes, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DesignLawLayout>
      <PageShell
        title="Axiom Sentinel"
        subtitle="Unified Capital Decision & Risk Authorization Layer. Strategy proposes. Sentinel decides. Execution obeys."
        disclosure={FOOTER_DISCLOSURE}
      >
        {health && health.operationalState !== 'NORMAL' && (
          <CircuitBreakerBanner state={health.operationalState} />
        )}

        {loading ? (
          <p className="text-sm text-dl-gray py-12 text-center">Loading data...</p>
        ) : error ? (
          <p className="text-sm text-dl-error py-12 text-center">{error}</p>
        ) : (
          <>
            <div className="flex border-b border-dl-border mb-6" role="tablist" aria-label="Sentinel views">
              {(['dashboard', 'education'] as TabId[]).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`panel-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-dl-mono uppercase tracking-wider border-b-2 ${
                    activeTab === tab
                      ? 'border-dl-navy text-dl-navy font-medium'
                      : 'border-transparent text-dl-gray'
                  }`}
                >
                  {tab === 'dashboard' ? 'Dashboard' : 'Education & Risk'}
                </button>
              ))}
            </div>

            {activeTab === 'dashboard' && (
              <div id="panel-dashboard" role="tabpanel" aria-labelledby="dashboard">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="border border-dl-border-light p-4">
                    <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">MARKET REGIME</p>
                    <p className={`font-dl-serif text-xl ${REGIME_COLORS[overview?.regime || ''] || 'text-dl-navy'}`}>
                      {overview?.regime || '—'}
                    </p>
                    <p className="font-dl-mono text-xs text-dl-gray mt-1">
                      {overview?.regime_confidence != null ? `${overview.regime_confidence.toFixed(0)}% confidence` : ''}
                    </p>
                  </div>
                  <div className="border border-dl-border-light p-4">
                    <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">SYSTEM STANCE</p>
                    <p className="font-dl-serif text-xl text-dl-navy">{overview?.stance || '—'}</p>
                    <p className="font-dl-mono text-xs text-dl-gray mt-1">
                      {health?.operationalState || 'NORMAL'}
                    </p>
                  </div>
                  <div className="border border-dl-border-light p-4">
                    <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">SIGNALS</p>
                    <p className="font-dl-serif text-xl text-dl-navy">
                      {overview?.qualified_signals ?? '—'} <span className="text-sm text-dl-gray">/ {overview?.total_signals ?? '—'}</span>
                    </p>
                    <p className="text-xs text-dl-gray mt-1">qualified / total</p>
                  </div>
                  <div className="border border-dl-border-light p-4">
                    <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">DECISIONS</p>
                    <p className="font-dl-serif text-xl text-dl-navy">
                      <span className="text-dl-forest">{overview?.approved_count ?? 0}</span>
                      {' / '}
                      <span className="text-dl-error">{overview?.denied_count ?? 0}</span>
                    </p>
                    <p className="text-xs text-dl-gray mt-1">approved / denied</p>
                  </div>
                </div>

                <div className="mb-8">
                  <RegimeLegend />
                </div>

                <div className="mb-8">
                  <SectionHeading>Regime History</SectionHeading>
                  <RegimeTimeline entries={regimes} />
                </div>

                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <SectionHeading>Signals</SectionHeading>
                    <div className="flex gap-2">
                      <button
                        onClick={exportCSV}
                        className="px-3 py-1 border border-dl-border text-xs font-dl-mono text-dl-navy bg-dl-bg"
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={exportJSON}
                        className="px-3 py-1 border border-dl-border text-xs font-dl-mono text-dl-navy bg-dl-bg"
                      >
                        Export JSON
                      </button>
                    </div>
                  </div>
                  <EnhancedSignalsTable signals={signals} />
                </div>

                <div className="mb-8">
                  <SectionHeading>Recent Decisions</SectionHeading>
                  <DecisionsPanel decisions={decisions} />
                </div>

                <div className="flex items-center justify-between border-t border-dl-border pt-4">
                  <Link href="/sentinel/audit" className="text-sm text-dl-navy underline">
                    View Full Audit Trail →
                  </Link>
                  {lastUpdated && (
                    <p className="font-dl-mono text-xs text-dl-gray">
                      Last updated: {lastUpdated}
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'education' && (
              <div id="panel-education" role="tabpanel" aria-labelledby="education" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <SectionHeading>How Sentinel Works</SectionHeading>
                  <WalkthroughStepper />
                  <ScoreInterpretation />
                  <PositionSizingDiagram />
                </div>
                <div className="space-y-6">
                  <SectionHeading>Risk Framework</SectionHeading>
                  <BehavioralFinancePanel />
                  <RiskMechanicsPanel />
                  <FAQAccordion />
                </div>
              </div>
            )}
          </>
        )}
      </PageShell>
    </DesignLawLayout>
  );
}
