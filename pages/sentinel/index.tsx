import { useState, useEffect, useCallback, useRef } from 'react';
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

interface SubInfo {
  status: 'active' | 'past_due' | 'canceled' | 'none';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
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
type OpStatus = 'idle' | 'running' | 'success' | 'error';

interface OpState {
  status: OpStatus;
  message: string;
  lastRun: string;
}

const AUTO_REFRESH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 60, label: '1 min' },
  { value: 300, label: '5 min' },
  { value: 900, label: '15 min' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function SubscriptionPanel({
  walletAddress,
  sub,
  onSubChange,
}: {
  walletAddress: string | null;
  sub: SubInfo | null;
  onSubChange: () => void;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubscribe = async () => {
    if (!walletAddress) { setMsg('Connect your wallet first.'); return; }
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/sentinel/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, email: email || undefined }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else setMsg(data.error || 'Could not create checkout session.');
    } catch { setMsg('Network error. Please try again.'); }
    finally { setBusy(false); }
  };

  const handleCancel = async () => {
    if (!walletAddress) return;
    if (!confirm('Cancel your Sentinel Advisory subscription at period end?')) return;
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/sentinel/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });
      const data = await res.json();
      if (data.ok) { setMsg('Subscription will end at the current period close.'); onSubChange(); }
      else setMsg(data.error || 'Cancel failed.');
    } catch { setMsg('Network error.'); }
    finally { setBusy(false); }
  };

  const status = sub?.status ?? 'none';
  const isActive = status === 'active';
  const isPastDue = status === 'past_due';
  const isCanceling = isActive && sub?.cancelAtPeriodEnd;

  return (
    <div className="border border-dl-border mb-6">
      <div className="border-b border-dl-border px-5 py-3 bg-dl-bg-alt flex items-center justify-between">
        <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest">Sentinel Advisory — Subscription</p>
        <span className={`text-xs font-dl-mono px-2 py-0.5 border ${
          isActive ? 'border-dl-forest text-dl-forest' :
          isPastDue ? 'border-dl-gold text-dl-gold' :
          status === 'canceled' ? 'border-dl-gray text-dl-gray' :
          'border-dl-border text-dl-gray'
        }`}>
          {isActive && isCanceling ? 'CANCELING' :
           isActive ? 'ACTIVE' :
           isPastDue ? 'PAST DUE' :
           status === 'canceled' ? 'CANCELED' : 'INACTIVE'}
        </span>
      </div>

      <div className="px-5 py-5">
        {(isActive || isPastDue) ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wide mb-1">Current Period</p>
              <p className="font-dl-mono text-sm text-dl-navy">
                {formatDate(sub!.currentPeriodStart)} – {formatDate(sub!.currentPeriodEnd)}
              </p>
            </div>
            <div>
              <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wide mb-1">Plan</p>
              <p className="font-dl-mono text-sm text-dl-navy">Sentinel Advisory — Monthly</p>
            </div>
            <div>
              <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wide mb-1">Access</p>
              <p className="font-dl-mono text-sm text-dl-forest">Full Dashboard Unlocked</p>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <p className="font-dl-serif text-base text-dl-navy mb-1">Sentinel Advisory Access</p>
            <p className="text-sm text-dl-gray leading-relaxed mb-4">
              Subscribe to unlock the full Sentinel dashboard — regime history, qualified signals, capital
              authorization decisions, and export tools. All outputs are advisory intelligence only. No
              automated execution authority is implied or granted.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-md">
              <input
                type="email"
                placeholder="Email for receipt (optional)"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-dl-border bg-dl-bg font-dl-mono text-sm text-dl-navy"
              />
              <button
                onClick={handleSubscribe}
                disabled={busy}
                className="px-5 py-2 bg-dl-navy text-white font-dl-mono text-xs disabled:bg-dl-gray whitespace-nowrap"
              >
                {busy ? 'LOADING...' : 'SUBSCRIBE TO SENTINEL'}
              </button>
            </div>
          </div>
        )}

        {isActive && !isCanceling && (
          <button
            onClick={handleCancel}
            disabled={busy}
            className="text-xs font-dl-mono text-dl-gray underline disabled:no-underline"
          >
            {busy ? 'Processing...' : 'Cancel subscription at period end'}
          </button>
        )}

        {isCanceling && (
          <p className="text-xs font-dl-mono text-dl-gold">
            Access continues until {formatDate(sub!.currentPeriodEnd)}. No further charges.
          </p>
        )}

        {msg && (
          <p className="text-xs font-dl-mono text-dl-error mt-2">{msg}</p>
        )}
      </div>
    </div>
  );
}

function LockedOverlay({ onSubscribe }: { onSubscribe: () => void }) {
  return (
    <div className="border border-dl-border p-8 text-center mb-8">
      <p className="font-dl-serif text-lg text-dl-navy mb-2">Sentinel Advisory Subscription Required</p>
      <p className="text-sm text-dl-gray leading-relaxed mb-4 max-w-lg mx-auto">
        Regime history, qualified signals, and capital authorization decisions are available to active
        Sentinel Advisory subscribers. All outputs are informational — advisory-only mode is active
        during proof-of-concept.
      </p>
      <button
        onClick={onSubscribe}
        className="px-6 py-2 bg-dl-navy text-white font-dl-mono text-xs"
      >
        SUBSCRIBE TO SENTINEL ADVISORY
      </button>
    </div>
  );
}

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefreshSec, setAutoRefreshSec] = useState(0);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const [signalsOp, setSignalsOp] = useState<OpState>({ status: 'idle', message: '', lastRun: '' });
  const [fullCycleOp, setFullCycleOp] = useState<OpState>({ status: 'idle', message: '', lastRun: '' });

  // Subscription state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const subscriptionPanelRef = useRef<HTMLDivElement>(null);

  // Detect connected wallet from window.ethereum
  useEffect(() => {
    const detect = async () => {
      try {
        const eth = (window as any).ethereum;
        if (!eth) return;
        const accounts: string[] = await eth.request({ method: 'eth_accounts' });
        if (accounts[0]) setWalletAddress(accounts[0]);
        eth.on('accountsChanged', (accs: string[]) => setWalletAddress(accs[0] ?? null));
      } catch {}
    };
    detect();
  }, []);

  const fetchSubStatus = useCallback(async (wallet: string) => {
    setSubLoading(true);
    try {
      const res = await fetch(`/api/sentinel/subscription/status?wallet=${encodeURIComponent(wallet)}`);
      if (res.ok) setSub(await res.json());
    } catch {}
    finally { setSubLoading(false); }
  }, []);

  useEffect(() => {
    if (walletAddress) fetchSubStatus(walletAddress);
    else setSub(null);
  }, [walletAddress, fetchSubStatus]);

  // Handle ?subscribed=1 return from Stripe Checkout
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === '1' && walletAddress) {
      fetchSubStatus(walletAddress);
      window.history.replaceState({}, '', '/sentinel');
    }
  }, [walletAddress, fetchSubStatus]);

  const isSubscribed = sub?.status === 'active' || sub?.status === 'past_due';

  const fetchData = useCallback(() => {
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
        if (overviewData.error) { setError(overviewData.error); return; }
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

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  useEffect(() => {
    if (autoRefreshRef.current) { clearInterval(autoRefreshRef.current); autoRefreshRef.current = null; }
    if (autoRefreshSec > 0) {
      autoRefreshRef.current = setInterval(() => setRefreshKey(k => k + 1), autoRefreshSec * 1000);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefreshSec]);

  const runOperation = async (
    endpoint: string,
    setter: React.Dispatch<React.SetStateAction<OpState>>,
    label: string,
    body?: Record<string, any>
  ) => {
    setter({ status: 'running', message: `Running ${label}...`, lastRun: '' });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        let details = 'Complete';
        if (label === 'Signal Generation') details = `Generated ${data.signalsGenerated || 0} signals`;
        else if (label === 'Full Cycle') {
          const results = data.results || [];
          details = results.map((r: any) => `${r.step}: ${r.success ? 'OK' : 'FAIL'}`).join(' | ');
        }
        setter({ status: 'success', message: details, lastRun: new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC') });
        setRefreshKey(k => k + 1);
      } else {
        setter({ status: 'error', message: data.error || `${label} failed`, lastRun: new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC') });
      }
    } catch (err: any) {
      setter({ status: 'error', message: err.message || 'Network error', lastRun: new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC') });
    }
  };

  const exportCSV = () => {
    if (!signals.length) return;
    const headers = ['Symbol', 'Asset Type', 'Direction', 'Entry Mid', 'Final Score', 'Regime', 'Qualified', 'Created'];
    const rows = signals.map((s) => [s.symbol, s.asset_type, s.direction, s.entry_mid, s.final_score != null ? String(s.final_score) : '', s.regime_state, s.qualified ? 'YES' : 'NO', s.created_at]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `sentinel-signals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const payload = { overview, signals, decisions, regimes, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `sentinel-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const scrollToSubscribe = () => {
    subscriptionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <DesignLawLayout>
      <PageShell
        title="Axiom Sentinel"
        subtitle="Capital Authorization Layer — the gate between intelligence and deployment. MIRDT reads the regime. Sentinel decides what moves."
        disclosure={FOOTER_DISCLOSURE}
      >
        {/* Architecture overview — always visible */}
        <div className="border border-dl-border mb-6">
          <div className="border-b border-dl-border px-5 py-3 bg-dl-bg-alt">
            <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest">Authorization Architecture — Intelligence → Authorization → Execution</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-dl-border">
            <div className="px-5 py-5">
              <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Input</p>
              <p className="font-dl-serif text-base text-dl-navy mb-2">MIRDT Regime Signal</p>
              <p className="text-sm text-dl-gray leading-relaxed">
                Sentinel receives the current capital posture from MIRDT — FAVORABLE, NEUTRAL, CAUTION, or RESTRICTED —
                along with individual dimension grades that define the regime environment.
              </p>
            </div>
            <div className="px-5 py-5">
              <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Authorization Gate</p>
              <p className="font-dl-serif text-base text-dl-navy mb-2">Sentinel Decides</p>
              <p className="text-sm text-dl-gray leading-relaxed">
                Each capital action — whether a loan origination, asset acquisition, or treasury movement — is submitted
                to Sentinel. The system evaluates the action against the current regime, position size limits, and risk
                parameters before returning an APPROVED or DENIED decision with a plain-language reason code.
              </p>
            </div>
            <div className="px-5 py-5">
              <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wide mb-1">Output</p>
              <p className="font-dl-serif text-base text-dl-navy mb-2">Execution Obeys</p>
              <p className="text-sm text-dl-gray leading-relaxed">
                Only Sentinel-approved actions may proceed to execution. Advisory-only mode is active during
                proof-of-concept — no automated transactions are triggered. All decisions are logged to an
                immutable audit trail verifiable on-chain.
              </p>
            </div>
          </div>
        </div>

        {/* Subscription panel */}
        <div ref={subscriptionPanelRef}>
          <SubscriptionPanel
            walletAddress={walletAddress}
            sub={sub}
            onSubChange={() => walletAddress && fetchSubStatus(walletAddress)}
          />
        </div>

        {/* Operations panel — only for subscribers */}
        {isSubscribed && (
          <div className="border border-dl-border bg-dl-bg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <SectionHeading>Operations</SectionHeading>
              <div className="flex items-center gap-2">
                <span className="text-xs font-dl-mono text-dl-gray">AUTO-REFRESH</span>
                <select
                  value={autoRefreshSec}
                  onChange={(e) => setAutoRefreshSec(Number(e.target.value))}
                  className="px-2 py-1 border border-dl-border bg-dl-bg text-dl-navy font-dl-mono text-xs"
                >
                  {AUTO_REFRESH_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {autoRefreshSec > 0 && <span className="text-xs font-dl-mono text-dl-forest">ACTIVE</span>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-dl-border p-3">
                <p className="text-xs font-dl-mono text-dl-gray mb-2">FULL CYCLE (SCAN + SIGNALS)</p>
                <button
                  onClick={() => runOperation('/api/ops/trigger', setFullCycleOp, 'Full Cycle', { operation: 'full-cycle' })}
                  disabled={fullCycleOp.status === 'running'}
                  className="w-full px-3 py-2 bg-dl-navy text-white font-dl-mono text-xs disabled:bg-dl-gray"
                >
                  {fullCycleOp.status === 'running' ? 'RUNNING...' : 'RUN FULL CYCLE'}
                </button>
                {fullCycleOp.message && (
                  <p className={`text-xs mt-1 font-dl-mono ${fullCycleOp.status === 'error' ? 'text-dl-error' : fullCycleOp.status === 'success' ? 'text-dl-forest' : 'text-dl-gray'}`}>
                    {fullCycleOp.message}
                  </p>
                )}
              </div>
              <div className="border border-dl-border p-3">
                <p className="text-xs font-dl-mono text-dl-gray mb-2">GENERATE SIGNALS</p>
                <button
                  onClick={() => runOperation('/api/ops/trigger', setSignalsOp, 'Signal Generation', { operation: 'run-signals' })}
                  disabled={signalsOp.status === 'running'}
                  className="w-full px-3 py-2 bg-dl-navy text-white font-dl-mono text-xs disabled:bg-dl-gray"
                >
                  {signalsOp.status === 'running' ? 'GENERATING...' : 'RUN SIGNALS'}
                </button>
                {signalsOp.message && (
                  <p className={`text-xs mt-1 font-dl-mono ${signalsOp.status === 'error' ? 'text-dl-error' : signalsOp.status === 'success' ? 'text-dl-forest' : 'text-dl-gray'}`}>
                    {signalsOp.message}
                  </p>
                )}
              </div>
              <div className="border border-dl-border p-3">
                <p className="text-xs font-dl-mono text-dl-gray mb-2">REFRESH DISPLAY</p>
                <button onClick={() => setRefreshKey(k => k + 1)} className="w-full px-3 py-2 bg-dl-navy text-white font-dl-mono text-xs">
                  REFRESH DATA
                </button>
                {lastUpdated && <p className="text-xs mt-1 font-dl-mono text-dl-gray">Last: {lastUpdated}</p>}
              </div>
            </div>
          </div>
        )}

        {health && health.operationalState !== 'NORMAL' && (
          <CircuitBreakerBanner state={health.operationalState} />
        )}

        {/* Public stat strip — always visible */}
        {!loading && !error && overview && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="border border-dl-border-light p-4">
              <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">MARKET REGIME</p>
              <p className={`font-dl-serif text-xl ${REGIME_COLORS[overview.regime] || 'text-dl-navy'}`}>{overview.regime}</p>
              <p className="font-dl-mono text-xs text-dl-gray mt-1">
                {overview.regime_confidence != null ? `${overview.regime_confidence.toFixed(0)}% confidence` : ''}
              </p>
            </div>
            <div className="border border-dl-border-light p-4">
              <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">SYSTEM STANCE</p>
              <p className="font-dl-serif text-xl text-dl-navy">{overview.stance}</p>
              <p className="font-dl-mono text-xs text-dl-gray mt-1">{health?.operationalState || 'NORMAL'}</p>
            </div>
            <div className="border border-dl-border-light p-4">
              <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">SIGNALS</p>
              {isSubscribed ? (
                <p className="font-dl-serif text-xl text-dl-navy">
                  {overview.qualified_signals} <span className="text-sm text-dl-gray">/ {overview.total_signals}</span>
                </p>
              ) : (
                <p className="font-dl-serif text-xl text-dl-gray">—</p>
              )}
              <p className="text-xs text-dl-gray mt-1">qualified / total</p>
            </div>
            <div className="border border-dl-border-light p-4">
              <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">DECISIONS</p>
              {isSubscribed ? (
                <p className="font-dl-serif text-xl text-dl-navy">
                  <span className="text-dl-forest">{overview.approved_count}</span>
                  {' / '}
                  <span className="text-dl-error">{overview.denied_count}</span>
                </p>
              ) : (
                <p className="font-dl-serif text-xl text-dl-gray">—</p>
              )}
              <p className="text-xs text-dl-gray mt-1">approved / denied</p>
            </div>
          </div>
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
                    activeTab === tab ? 'border-dl-navy text-dl-navy font-medium' : 'border-transparent text-dl-gray'
                  }`}
                >
                  {tab === 'dashboard' ? 'Dashboard' : 'Education & Risk'}
                </button>
              ))}
            </div>

            {activeTab === 'dashboard' && (
              <div id="panel-dashboard" role="tabpanel" aria-labelledby="dashboard">
                {!isSubscribed ? (
                  <LockedOverlay onSubscribe={scrollToSubscribe} />
                ) : (
                  <>
                    <div className="mb-8"><RegimeLegend /></div>

                    <div className="mb-8">
                      <SectionHeading>Regime History</SectionHeading>
                      <RegimeTimeline entries={regimes} />
                    </div>

                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-2">
                        <SectionHeading>Signals</SectionHeading>
                        <div className="flex gap-2">
                          <button onClick={exportCSV} className="px-3 py-1 border border-dl-border text-xs font-dl-mono text-dl-navy bg-dl-bg">Export CSV</button>
                          <button onClick={exportJSON} className="px-3 py-1 border border-dl-border text-xs font-dl-mono text-dl-navy bg-dl-bg">Export JSON</button>
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
                      {lastUpdated && <p className="font-dl-mono text-xs text-dl-gray">Last updated: {lastUpdated}</p>}
                    </div>
                  </>
                )}
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
