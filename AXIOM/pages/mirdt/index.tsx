import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law';
import {
  Activity,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  Globe,
  Layers,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

type Grade = 'A' | 'B' | 'C' | 'WATCH' | 'ALERT';
type PRSGrade = 'FAVORABLE' | 'NEUTRAL' | 'CAUTION' | 'RESTRICTED';

interface Dimension {
  id: string;
  label: string;
  grade: Grade;
  score: number;
  keyMetric: string;
  trend: 'up' | 'up-slightly' | 'flat' | 'down-slightly' | 'down';
  thesis: string;
  weight: number;
}

interface PRSData {
  prs: number;
  grade: PRSGrade;
  dimensions: Dimension[];
  computedAt: string;
}

interface LogEntry {
  id: string;
  dimension: string;
  grade: Grade;
  thesis: string;
  loggedAt: string;
  checksum: string;
}

const DIMENSION_ICONS: Record<string, React.ReactNode> = {
  'digital-commodity': <Zap className="w-4 h-4" />,
  'protocol-health': <Shield className="w-4 h-4" />,
  'real-asset-market': <Building2 className="w-4 h-4" />,
  'construction-cost': <Layers className="w-4 h-4" />,
  'deal-flow': <Activity className="w-4 h-4" />,
  'credit-portfolio': <BarChart3 className="w-4 h-4" />,
  'community-coordination': <Users className="w-4 h-4" />,
  'model-accuracy': <Cpu className="w-4 h-4" />,
  'growth-velocity': <Globe className="w-4 h-4" />,
};

const DIMENSION_DATA_SOURCE: Record<string, string> = {
  'digital-commodity': 'Coinbase Advanced Trade — BTC / ETH / LINK / AXM (on-chain)',
  'protocol-health': 'Solvency Snapshot + On-Chain — CR / AXUSD Supply / earnAXUSD TVL',
  'real-asset-market': 'Alpha Vantage — VNQ (REIT) + XHB (Homebuilder)',
  'construction-cost': 'Market Cost Signals — Craftsman NCE Benchmarks',
  'deal-flow': 'Deal Pipeline — re_deals (underwriting) + dp_listings (distressed)',
  'credit-portfolio': 'Income Credit Lines — Originated / Overdue / Repaid',
  'community-coordination': 'Wealth Practice Groups — Active Cycle Status',
  'model-accuracy': 'IVCEE — Prediction vs. Actual Variance',
  'growth-velocity': 'Platform Registry — User + Lead + Application Volume',
};

function GradeBadge({ grade }: { grade: Grade }) {
  const styles: Record<Grade, string> = {
    A: 'bg-dl-forest text-white border-dl-forest',
    B: 'bg-dl-navy text-white border-dl-navy',
    C: 'text-dl-navy border-dl-border',
    WATCH: 'text-dl-gold border-dl-gold',
    ALERT: 'text-red-700 border-red-500',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-dl-mono font-semibold border ${styles[grade]}`}>
      {grade}
    </span>
  );
}

function PRSGradeBadge({ grade }: { grade: PRSGrade }) {
  const styles: Record<PRSGrade, string> = {
    FAVORABLE: 'bg-dl-forest text-white',
    NEUTRAL: 'bg-dl-navy text-white',
    CAUTION: 'text-dl-gold border border-dl-gold',
    RESTRICTED: 'text-red-700 border border-red-500',
  };
  return (
    <span className={`inline-block px-3 py-1 text-sm font-dl-mono font-semibold ${styles[grade]}`}>
      {grade}
    </span>
  );
}

function TrendArrow({ trend }: { trend: Dimension['trend'] }) {
  const icons: Record<string, React.ReactNode> = {
    up: <TrendingUp className="w-4 h-4 text-dl-forest" />,
    'up-slightly': <TrendingUp className="w-4 h-4 text-dl-navy" />,
    flat: <span className="text-dl-gray font-dl-mono text-sm">—</span>,
    'down-slightly': <TrendingDown className="w-4 h-4 text-dl-gold" />,
    down: <TrendingDown className="w-4 h-4 text-red-600" />,
  };
  return <span>{icons[trend]}</span>;
}

function DimensionCard({
  dim,
  onLogBrief,
}: {
  dim: Dimension;
  onLogBrief: (d: Dimension) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canLog = dim.grade === 'A' || dim.grade === 'B';

  return (
    <div className="border border-dl-border">
      <button
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-dl-bg-alt transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-dl-navy flex-shrink-0">{DIMENSION_ICONS[dim.id]}</span>
          <span className="text-sm font-semibold text-dl-navy truncate">{dim.label}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <TrendArrow trend={dim.trend} />
          <GradeBadge grade={dim.grade} />
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-dl-gray" />
          ) : (
            <ChevronRight className="w-4 h-4 text-dl-gray" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-dl-border">
          <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
            <p className="text-xs text-dl-gray mb-1">Key Metric</p>
            <p className="text-sm font-dl-mono text-dl-navy">{dim.keyMetric}</p>
          </div>
          <div className="px-4 py-3 border-b border-dl-border">
            <p className="text-xs text-dl-gray mb-1">Signal Thesis</p>
            <p className="text-sm text-dl-navy leading-relaxed">{dim.thesis}</p>
          </div>
          <div className="px-4 py-3 border-b border-dl-border">
            <p className="text-xs text-dl-gray mb-1">Data Source</p>
            <p className="text-xs font-dl-mono text-dl-gray">{DIMENSION_DATA_SOURCE[dim.id]}</p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-dl-gray">Signal Contribution:</span>
              <span className="text-xs font-dl-mono text-dl-navy">{dim.score.toFixed(1)}/10 × {(dim.weight * 100).toFixed(0)}%</span>
            </div>
            {canLog && (
              <button
                onClick={() => onLogBrief(dim)}
                className="text-xs font-dl-mono text-dl-navy border border-dl-border px-3 py-1 hover:bg-dl-navy hover:text-white transition-colors"
              >
                Log to Operations →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SignalIntegrityLog({ log }: { log: LogEntry[] }) {
  if (log.length === 0) {
    return (
      <div className="border border-dl-border px-6 py-8 text-center">
        <p className="text-sm text-dl-gray">No signals logged yet. Generate intelligence briefs from Grade A or B dimensions to populate the audit log.</p>
      </div>
    );
  }
  return (
    <div className="border border-dl-border divide-y divide-dl-border">
      {log.map((entry) => (
        <div key={entry.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <GradeBadge grade={entry.grade} />
              <span className="text-sm font-semibold text-dl-navy">{entry.dimension}</span>
            </div>
            <span className="text-xs font-dl-mono text-dl-gray flex-shrink-0">
              {new Date(entry.loggedAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-dl-navy mb-1">{entry.thesis}</p>
          <p className="text-xs font-dl-mono text-dl-gray truncate">SHA-256: {entry.checksum}</p>
        </div>
      ))}
    </div>
  );
}

export default function MIRDTPage() {
  const [data, setData] = useState<PRSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'intelligence' | 'log'>('intelligence');
  const [serverLog, setServerLog] = useState<LogEntry[]>([]);

  const fetchPRS = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/mirdt/protocol-readiness');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load intelligence data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServerLog = useCallback(async () => {
    try {
      const res = await fetch('/api/mirdt/signal-log');
      if (!res.ok) return;
      const json = await res.json();
      const events: LogEntry[] = (json.events ?? []).map((e: {
        id: string;
        dimension?: string | null;
        grade: string;
        thesis?: string | null;
        loggedAt: string;
        checksum: string;
      }) => ({
        id: e.id,
        dimension: e.dimension ?? 'PRS Computation',
        grade: e.grade as Grade,
        thesis: e.thesis ?? '',
        loggedAt: e.loggedAt,
        checksum: e.checksum,
      }));
      setServerLog(events);
    } catch {
      // silent — server log is best-effort
    }
  }, []);

  useEffect(() => {
    fetchPRS();
    fetchServerLog();
  }, [fetchPRS, fetchServerLog]);

  const [briefStatus, setBriefStatus] = useState<string | null>(null);

  const handleLogBrief = useCallback(async (dim: Dimension) => {
    try {
      setBriefStatus(`Logging ${dim.label}…`);
      const res = await fetch('/api/mirdt/log-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimension: dim.label,
          grade: dim.grade,
          keyMetric: dim.keyMetric,
          thesis: dim.thesis,
          prsScore: data?.prs ?? null,
        }),
      });
      if (res.ok) {
        setBriefStatus(`Capital Intelligence Brief logged: ${dim.label}`);
        await fetchServerLog();
        setActiveTab('log');
      } else if (res.status === 401) {
        setBriefStatus('Connect wallet and sign in to log briefs to Operations');
      } else {
        setBriefStatus('Unable to log brief — check operations access');
      }
    } catch {
      setBriefStatus('Brief log failed');
    }
    setTimeout(() => setBriefStatus(null), 4000);
  }, [data?.prs, fetchServerLog]);

  const gradeBg: Record<PRSGrade, string> = {
    FAVORABLE: 'bg-dl-forest',
    NEUTRAL: 'bg-dl-navy',
    CAUTION: 'border border-dl-gold',
    RESTRICTED: 'border border-red-500',
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>Capital Intelligence Terminal | Axiom Protocol</title>
      </Head>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
            <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest mb-2">
              Intelligence Layer — Capital Regime Intelligence Engine
            </p>
            <h1 className="text-3xl font-dl-serif font-bold text-dl-navy mb-2">
              MIRDT Capital Intelligence Terminal
            </h1>
            <p className="text-sm text-dl-gray max-w-2xl">
              Nine-dimension advisory signal engine that translates market conditions into a structured capital posture.
              Regime conditions are read across digital commodities, protocol health, real asset markets, construction costs,
              deal flow, credit portfolio, community coordination, model accuracy, and growth velocity.
              All signals are informational. No automated capital deployment is permitted.
            </p>
          </div>

          <div className="border border-dl-border mb-8">
            <div className="border-b border-dl-border px-5 py-3 bg-dl-bg-alt">
              <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest">How It Works — Regime → Posture → Decision</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-dl-border">
              <div className="px-5 py-5">
                <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Step 1 — Regime</p>
                <p className="font-dl-serif text-base text-dl-navy mb-2">Read the Environment</p>
                <p className="text-sm text-dl-gray leading-relaxed">
                  MIRDT reads nine dimensions of market and protocol data to classify the current capital regime.
                  Each dimension receives a grade (A–ALERT) based on live signals from on-chain data,
                  market feeds, and internal operational metrics.
                </p>
              </div>
              <div className="px-5 py-5">
                <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Step 2 — Posture</p>
                <p className="font-dl-serif text-base text-dl-navy mb-2">Compute Protocol Readiness</p>
                <p className="text-sm text-dl-gray leading-relaxed">
                  Dimension grades are weighted and aggregated into a Protocol Readiness Score (PRS).
                  The PRS resolves to an overall signal — FAVORABLE, NEUTRAL, CAUTION, or RESTRICTED —
                  which defines the system's capital posture for the period.
                </p>
              </div>
              <div className="px-5 py-5">
                <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Step 3 — Decision</p>
                <p className="font-dl-serif text-base text-dl-navy mb-2">Route to Sentinel</p>
                <p className="text-sm text-dl-gray leading-relaxed">
                  The capital posture is forwarded to Axiom Sentinel — the authorization layer — which gates
                  all capital actions against the current regime. Sentinel approves, denies, or flags capital
                  deployment requests based on MIRDT output and additional risk parameters.
                </p>
              </div>
            </div>
          </div>

          {loading && (
            <div className="border border-dl-border px-6 py-12 text-center mb-8">
              <RefreshCw className="w-5 h-5 text-dl-gray animate-spin mx-auto mb-3" />
              <p className="text-sm text-dl-gray font-dl-mono">Computing protocol readiness across nine dimensions...</p>
            </div>
          )}

          {error && (
            <div className="border border-red-300 bg-red-50 px-6 py-4 mb-8">
              <p className="text-sm text-red-700">Intelligence data unavailable: {error}</p>
              <button onClick={fetchPRS} className="text-xs text-dl-navy underline mt-2">Retry</button>
            </div>
          )}

          {data && !loading && (
            <>
              <div className="border border-dl-border mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-dl-border">
                  <div className="px-6 py-6">
                    <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest mb-2">Protocol Readiness Score</p>
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-dl-mono font-bold text-dl-navy">{data.prs.toFixed(1)}</span>
                      <span className="text-lg text-dl-gray mb-1">/10</span>
                    </div>
                  </div>
                  <div className="px-6 py-6">
                    <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest mb-2">Overall Signal</p>
                    <PRSGradeBadge grade={data.grade} />
                    <p className="text-xs text-dl-gray mt-2">
                      {data.grade === 'FAVORABLE' && 'Conditions support capital deployment across multiple dimensions.'}
                      {data.grade === 'NEUTRAL' && 'Mixed signals — selective deployment with elevated discipline.'}
                      {data.grade === 'CAUTION' && 'Multiple dimensions under pressure — hold current positions.'}
                      {data.grade === 'RESTRICTED' && 'Protocol stress conditions — no new capital deployment.'}
                    </p>
                  </div>
                  <div className="px-6 py-6">
                    <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest mb-2">Grade Distribution</p>
                    <div className="flex flex-wrap gap-2">
                      {(['A', 'B', 'C', 'WATCH', 'ALERT'] as Grade[]).map((g) => {
                        const count = data.dimensions.filter((d) => d.grade === g).length;
                        if (count === 0) return null;
                        return (
                          <div key={g} className="flex items-center gap-1">
                            <GradeBadge grade={g} />
                            <span className="text-xs font-dl-mono text-dl-gray">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-dl-gray mt-3">
                      Computed: {new Date(data.computedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="border-t border-dl-border px-6 py-3 bg-dl-bg-alt">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 w-full max-w-sm">
                      {data.dimensions.map((d) => (
                        <div
                          key={d.id}
                          className="flex-1 h-2"
                          style={{
                            backgroundColor:
                              d.grade === 'A' ? '#1D3D2A' :
                              d.grade === 'B' ? '#1B2A4A' :
                              d.grade === 'C' ? '#B8973A' :
                              d.grade === 'WATCH' ? '#B8973A' :
                              '#DC2626',
                            opacity: d.grade === 'C' ? 0.5 : 1,
                          }}
                          title={`${d.label}: ${d.grade}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={fetchPRS}
                      className="flex items-center gap-1 text-xs font-dl-mono text-dl-gray hover:text-dl-navy ml-4"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              {briefStatus && (
                <div className="border border-dl-forest bg-dl-bg-alt px-4 py-2 mb-4 flex items-center gap-2">
                  <span className="text-xs font-dl-mono text-dl-forest">{briefStatus}</span>
                </div>
              )}

              <div className="flex gap-0 border-b border-dl-border mb-6">
                <button
                  className={`px-4 py-2 text-sm font-dl-mono border-b-2 -mb-px transition-colors ${
                    activeTab === 'intelligence'
                      ? 'border-dl-navy text-dl-navy'
                      : 'border-transparent text-dl-gray hover:text-dl-navy'
                  }`}
                  onClick={() => setActiveTab('intelligence')}
                >
                  Intelligence Dimensions
                </button>
                <button
                  className={`px-4 py-2 text-sm font-dl-mono border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                    activeTab === 'log'
                      ? 'border-dl-navy text-dl-navy'
                      : 'border-transparent text-dl-gray hover:text-dl-navy'
                  }`}
                  onClick={() => setActiveTab('log')}
                >
                  Signal Integrity Log
                  {serverLog.length > 0 && (
                    <span className="bg-dl-navy text-white text-xs font-dl-mono px-1.5 py-0.5">
                      {serverLog.length}
                    </span>
                  )}
                </button>
              </div>

              {activeTab === 'intelligence' && (
                <div className="space-y-2">
                  {data.dimensions.map((dim) => (
                    <DimensionCard key={dim.id} dim={dim} onLogBrief={handleLogBrief} />
                  ))}

                  <div className="border border-dl-border px-4 py-3 mt-4 bg-dl-bg-alt">
                    <p className="text-xs text-dl-gray leading-relaxed">
                      <span className="font-semibold text-dl-navy">Advisory mode only.</span>{' '}
                      All signals are informational. No automated capital deployment is permitted.
                      Grade A and B signals may be logged to the Operations Record for audit purposes.
                      Signal generation events are recorded with SHA-256 checksums in the Signal Integrity Log.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'log' && (
                <div>
                  <div className="mb-4">
                    <p className="text-xs text-dl-gray leading-relaxed">
                      Durable cryptographic audit record of signal generation and capital intelligence events.
                      Each entry carries a SHA-256 checksum chained to the prior event, proving signals were generated
                      deterministically before any capital action was taken. Stored server-side in the signal audit database.
                    </p>
                  </div>
                  <SignalIntegrityLog log={serverLog} />

                  {serverLog.length > 0 && (
                    <div className="mt-4 border border-dl-border px-4 py-3 bg-dl-bg-alt">
                      <p className="text-xs font-dl-mono text-dl-gray">
                        {serverLog.length} signal event{serverLog.length !== 1 ? 's' : ''} in the durable audit log.
                        Full operations history:{' '}
                        <Link href="/founder-ops" className="text-dl-navy underline">Founder Operations →</Link>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-10 border-t border-dl-border pt-6">
            <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest mb-4">Intelligence Network</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Sentinel', href: '/sentinel', desc: 'Capital decision layer' },
                { label: 'Observer', href: '/observer', desc: 'Institutional dashboard' },
                { label: 'Deal Intelligence', href: '/deal-intelligence', desc: 'Property underwriting' },
                { label: 'Solvency', href: '/solvency', desc: 'Reserve transparency' },
                { label: 'Founder Ops', href: '/founder-ops', desc: 'Operations log' },
                { label: 'Distressed Feed', href: '/distressed-feed', desc: 'Acquisition pipeline' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border border-dl-border px-3 py-3 hover:bg-dl-bg-alt block"
                >
                  <p className="text-xs font-semibold text-dl-navy">{link.label}</p>
                  <p className="text-xs text-dl-gray">{link.desc}</p>
                </Link>
              ))}
            </div>
          </div>
      </div>
    </DesignLawLayout>
  );
}

