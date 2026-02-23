import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  DesignLawLayout,
  PageShell,
  SectionHeading,
  StatusBadge,
} from '../../components/design-law';

interface DailyAggregate {
  date: string;
  trades: number;
  wins: number;
  losses: number;
  flats: number;
  dailyPnl: number;
  cumulativePnl: number;
}

interface PlaybookMetrics {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  flats: number;
  winRate: number;
  totalPnl: number;
  avgPnlPerTrade: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  bestTrade: number;
  worstTrade: number;
  avgTradeDurationMinutes: number;
  sharpeEstimate: number;
  targetUsd: number;
  targetDays: number;
  daysElapsed: number;
  progressPct: number;
  projectedDaysToTarget: number | null;
  onTrack: boolean;
  startDate: string;
  endDate: string;
}

interface AuditEntry {
  tradeId: string;
  setupId: string;
  decisionId: string;
  symbol: string;
  assetType: string;
  direction: string;
  grade: string;
  entryTrigger: string;
  policyMode: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPct: number;
  outcome: string;
  exitReason: string;
  openedAt: string;
  closedAt: string;
  confidenceScore: number | null;
  signalZ: number | null;
  regimeTier: string;
  riskBudget: number | null;
  stopPrice: number | null;
  takeProfitP50: number | null;
  takeProfitP95: number | null;
}

interface OpenTrade {
  tradeId: string;
  setupId: string;
  decisionId: string;
  symbol: string;
  assetType: string;
  direction: string;
  grade: string;
  entryPrice: number;
  quantity: number;
  openedAt: string;
  stopPrice: number | null;
  takeProfitP50: number | null;
  confidenceScore: number | null;
  regimeTier: string;
  policyMode: string;
}

interface GEFQualification {
  userId: string;
  wallet: string;
  currentTier: string;
  policyMode: string;
  eqs: number;
  paperTradeCount: number;
  paperWinRate: number;
  paperMaxDrawdown: number;
  paperSharpe: number | null;
  paperPnlAxusd: number;
  liveEnabled: boolean;
  axmBalance: number;
  axusdReserve: number;
  paperStartDate: string;
  openGefTrades: number;
  closedGefTrades: number;
  latestBqe: {
    rbar: number;
    dsi: number;
    psc: number;
    vrs: number;
    eds: number;
    rcs: number;
    eqs: number;
    tierResult: string;
    computedAt: string;
  } | null;
}

interface PlaybookData {
  metrics: PlaybookMetrics;
  dailyAggregates: DailyAggregate[];
  auditTrail: AuditEntry[];
  openTradeDetails: OpenTrade[];
  portfolioConfig: any;
  recentRuns: any[];
  gefQualification: GEFQualification | null;
  generatedAt: string;
}

export default function ProofOfExecutionPage() {
  const [data, setData] = useState<PlaybookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<{ type: 'idle' | 'running' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const [activeSection, setActiveSection] = useState<'summary' | 'positions' | 'qualification' | 'daily' | 'audit' | 'runs'>('summary');
  const [adminKey, setAdminKey] = useState('');

  const fetchPlaybook = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mirdt/execution/playbook?target=100&days=30');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlaybook(); }, [fetchPlaybook]);

  const triggerExecutionRun = async () => {
    setRunStatus({ type: 'running', message: 'Pipeline executing...' });
    try {
      if (!adminKey) {
        setRunStatus({ type: 'error', message: 'Admin key required to run execution cycle' });
        return;
      }
      const res = await fetch('/api/mirdt/execution/playbook-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const msg = json.setupsEvaluated !== undefined
        ? `Run complete — ${json.setupsEvaluated} setups evaluated, ${json.decisionsCreated ?? 0} decisions, ${json.errors ?? 0} errors`
        : `Run complete — ${json.processed ?? 0} processed`;
      setRunStatus({ type: 'success', message: msg });
      await fetchPlaybook();
    } catch (err: any) {
      setRunStatus({ type: 'error', message: err.message });
    }
  };

  const fmtUsd = (v: number) => `$${v.toFixed(2)}`;
  const fmtPct = (v: number) => `${v.toFixed(1)}%`;
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtDateTime = (s: string) => new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const tabs = [
    { key: 'summary', label: 'Target Progress' },
    { key: 'positions', label: 'Open Positions' },
    { key: 'qualification', label: 'GEF Qualification' },
    { key: 'daily', label: 'Daily P&L' },
    { key: 'audit', label: 'Audit Trail' },
    { key: 'runs', label: 'Execution Runs' },
  ] as const;

  return (
    <DesignLawLayout>
      <Head><title>Proof of Execution — AXIOM</title></Head>
      <PageShell title="Proof of Execution Playbook" subtitle="Internal source of truth — demonstrating MIRDT/Sentinel execution capability toward $100 target in 30 days">

        {loading && !data && (
          <div className="border border-dl-border p-8 text-center">
            <p className="font-mono text-sm text-dl-muted">Loading playbook data...</p>
          </div>
        )}

        {error && (
          <div className="border border-red-300 bg-red-50 p-4 mb-6">
            <p className="font-mono text-sm text-red-700">Error: {error}</p>
          </div>
        )}

        {data && (
          <>
            <div className="border border-dl-border mb-6">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl text-dl-navy">Target: {fmtUsd(data.metrics.targetUsd)} in {data.metrics.targetDays} Days</h2>
                  <StatusBadge
                    status={data.metrics.progressPct >= 100 ? 'TARGET MET' : data.metrics.onTrack ? 'ON TRACK' : 'BEHIND PACE'}
                  />
                </div>

                <div className="w-full bg-gray-200 h-6 mb-4">
                  <div
                    className="h-6 bg-dl-forest transition-all duration-500"
                    style={{ width: `${Math.min(100, data.metrics.progressPct)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="Cumulative P&L" value={fmtUsd(data.metrics.totalPnl)} highlight={data.metrics.totalPnl > 0} />
                  <MetricCard label="Progress" value={fmtPct(data.metrics.progressPct)} />
                  <MetricCard label="Days Elapsed" value={`${data.metrics.daysElapsed} / ${data.metrics.targetDays}`} />
                  <MetricCard
                    label="Projected Days to Target"
                    value={data.metrics.projectedDaysToTarget !== null ? `${data.metrics.projectedDaysToTarget}` : 'N/A'}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              <MetricCard label="Total Trades" value={`${data.metrics.totalTrades}`} />
              <MetricCard label="Closed" value={`${data.metrics.closedTrades}`} />
              <MetricCard label="Win Rate" value={fmtPct(data.metrics.winRate)} highlight={data.metrics.winRate >= 50} />
              <MetricCard label="Avg Win" value={fmtUsd(data.metrics.avgWin)} />
              <MetricCard label="Avg Loss" value={fmtUsd(data.metrics.avgLoss)} />
              <MetricCard label="Profit Factor" value={data.metrics.profitFactor >= 999 ? 'INF (no losses)' : `${data.metrics.profitFactor}`} />
              <MetricCard label="Max Drawdown" value={fmtUsd(data.metrics.maxDrawdown)} />
              <MetricCard label="Best Trade" value={fmtUsd(data.metrics.bestTrade)} />
              <MetricCard label="Worst Trade" value={fmtUsd(data.metrics.worstTrade)} />
              <MetricCard label="Sharpe Est." value={`${data.metrics.sharpeEstimate}`} />
              <MetricCard label="Avg Duration" value={`${data.metrics.avgTradeDurationMinutes}m`} />
              <MetricCard label="Open Trades" value={`${data.metrics.openTrades}`} />
            </div>

            {data.portfolioConfig && (
              <div className="border border-dl-border mb-6 p-4">
                <h3 className="font-serif text-lg text-dl-navy mb-3">Portfolio Configuration</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ConfigItem label="Capital" value={`$${parseFloat(data.portfolioConfig.portfolio_capital_usd).toFixed(2)}`} />
                  <ConfigItem label="Risk Fraction" value={`${data.portfolioConfig.risk_fraction_bps} bps`} />
                  <ConfigItem label="Max Concurrent" value={data.portfolioConfig.max_concurrent_trades} />
                  <ConfigItem label="Policy Mode" value={data.portfolioConfig.policy_mode} />
                  <ConfigItem label="Drawdown Brake" value={`${data.portfolioConfig.drawdown_brake_bps} bps`} />
                  <ConfigItem label="Size Multiplier" value={`${data.portfolioConfig.global_size_multiplier}x`} />
                  <ConfigItem label="Vol Tier" value={data.portfolioConfig.system_volatility_tier} />
                  <ConfigItem label="Max Per-Asset" value={`${data.portfolioConfig.max_per_asset_exposure_bps} bps`} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mb-6">
              <input
                type="password"
                placeholder="Admin Key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="border border-dl-border px-3 py-2 font-mono text-sm w-40 bg-white"
              />
              <button
                onClick={triggerExecutionRun}
                disabled={runStatus.type === 'running' || !adminKey}
                className="border border-dl-navy bg-dl-navy text-white px-4 py-2 font-mono text-sm hover:bg-dl-navy/90 disabled:opacity-50"
              >
                {runStatus.type === 'running' ? 'EXECUTING...' : 'RUN EXECUTION CYCLE'}
              </button>
              <button
                onClick={fetchPlaybook}
                disabled={loading}
                className="border border-dl-border px-4 py-2 font-mono text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                REFRESH DATA
              </button>
              {runStatus.message && (
                <span className={`font-mono text-xs ${runStatus.type === 'error' ? 'text-red-600' : runStatus.type === 'success' ? 'text-dl-forest' : 'text-dl-muted'}`}>
                  {runStatus.message}
                </span>
              )}
            </div>

            <div className="flex border-b border-dl-border mb-6">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key)}
                  className={`px-4 py-2 font-mono text-sm border-b-2 -mb-px ${
                    activeSection === tab.key
                      ? 'border-dl-navy text-dl-navy'
                      : 'border-transparent text-dl-muted hover:text-dl-navy'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeSection === 'summary' && (
              <div className="border border-dl-border">
                <div className="p-4 border-b border-dl-border bg-gray-50">
                  <h3 className="font-serif text-lg text-dl-navy">Execution Summary</h3>
                </div>
                <div className="p-4">
                  <table className="w-full font-mono text-sm">
                    <tbody>
                      <SummaryRow label="Challenge Period" value={`${fmtDate(data.metrics.startDate)} — ${fmtDate(data.metrics.endDate)}`} />
                      <SummaryRow label="Target" value={fmtUsd(data.metrics.targetUsd)} />
                      <SummaryRow label="Current P&L" value={fmtUsd(data.metrics.totalPnl)} highlight={data.metrics.totalPnl > 0} />
                      <SummaryRow label="Progress" value={fmtPct(data.metrics.progressPct)} />
                      <SummaryRow label="Days Elapsed" value={`${data.metrics.daysElapsed}`} />
                      <SummaryRow label="Daily Rate Required" value={fmtUsd(data.metrics.targetUsd / data.metrics.targetDays)} />
                      <SummaryRow label="Actual Daily Rate" value={fmtUsd(data.metrics.totalPnl / data.metrics.daysElapsed)} highlight={data.metrics.onTrack} />
                      <SummaryRow label="Win / Loss / Flat" value={`${data.metrics.wins} / ${data.metrics.losses} / ${data.metrics.flats}`} />
                      <SummaryRow label="Win Rate" value={fmtPct(data.metrics.winRate)} />
                      <SummaryRow label="Profit Factor" value={data.metrics.profitFactor >= 999 ? 'INF (no losses)' : `${data.metrics.profitFactor}`} />
                      <SummaryRow label="Sharpe Estimate (annualized)" value={`${data.metrics.sharpeEstimate}`} />
                      <SummaryRow label="Max Drawdown" value={`${fmtUsd(data.metrics.maxDrawdown)} (${fmtPct(data.metrics.maxDrawdownPct)})`} />
                      <SummaryRow label="Execution Runs" value={`${data.recentRuns.length}`} />
                      <SummaryRow label="Report Generated" value={fmtDateTime(data.generatedAt)} />
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === 'positions' && (
              <div className="border border-dl-border">
                <div className="p-4 border-b border-dl-border bg-gray-50">
                  <h3 className="font-serif text-lg text-dl-navy">Open Positions</h3>
                  <p className="font-mono text-xs text-dl-muted mt-1">
                    Active paper trades — bridged to GEF for qualification tracking
                  </p>
                </div>
                {(!data.openTradeDetails || data.openTradeDetails.length === 0) ? (
                  <div className="p-8 text-center">
                    <p className="font-mono text-sm text-dl-muted">No open positions — run an execution cycle to open trades from active setups</p>
                  </div>
                ) : (
                  <div className="divide-y divide-dl-border/50">
                    {data.openTradeDetails.map((trade) => (
                      <div key={trade.tradeId} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-semibold text-dl-navy">{trade.symbol}</span>
                            <span className={`font-mono text-xs px-2 py-0.5 border ${trade.direction === 'LONG' ? 'border-dl-forest text-dl-forest' : 'border-red-400 text-red-600'}`}>
                              {trade.direction}
                            </span>
                            <span className="font-mono text-xs text-dl-muted">{trade.assetType}</span>
                            {trade.grade && (
                              <span className="font-mono text-xs px-2 py-0.5 border border-dl-border">{trade.grade}</span>
                            )}
                          </div>
                          <StatusBadge status="OPEN" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs text-dl-muted">
                          <span>Entry: ${trade.entryPrice.toFixed(4)}</span>
                          <span>Qty: {trade.quantity.toFixed(6)}</span>
                          {trade.stopPrice && <span>Stop: ${trade.stopPrice.toFixed(4)}</span>}
                          {trade.takeProfitP50 && <span>TP50: ${trade.takeProfitP50.toFixed(4)}</span>}
                          {trade.confidenceScore !== null && <span>Confidence: {trade.confidenceScore.toFixed(1)}</span>}
                          {trade.regimeTier && <span>Regime: {trade.regimeTier}</span>}
                          <span>Policy: {trade.policyMode}</span>
                        </div>
                        <div className="mt-2 font-mono text-xs text-dl-muted/70">
                          <span>Opened: {fmtDateTime(trade.openedAt)}</span>
                          <span className="mx-2">|</span>
                          <span>Trade: {trade.tradeId.slice(0, 8)}...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'qualification' && (
              <div className="border border-dl-border">
                <div className="p-4 border-b border-dl-border bg-gray-50">
                  <h3 className="font-serif text-lg text-dl-navy">GEF Qualification Status</h3>
                  <p className="font-mono text-xs text-dl-muted mt-1">
                    Graduated Execution Framework — behavior-based tier progression from paper to live execution
                  </p>
                </div>
                {!data.gefQualification ? (
                  <div className="p-8 text-center">
                    <p className="font-mono text-sm text-dl-muted">GEF qualification data not available</p>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="border border-dl-border p-3">
                        <p className="font-mono text-xs text-dl-muted mb-1">Current Tier</p>
                        <p className="font-mono text-lg text-dl-navy">{data.gefQualification.currentTier}</p>
                      </div>
                      <div className="border border-dl-border p-3">
                        <p className="font-mono text-xs text-dl-muted mb-1">EQS</p>
                        <p className="font-mono text-lg text-dl-navy">{data.gefQualification.eqs.toFixed(3)}</p>
                      </div>
                      <div className="border border-dl-border p-3">
                        <p className="font-mono text-xs text-dl-muted mb-1">Policy Mode</p>
                        <p className="font-mono text-lg text-dl-navy">{data.gefQualification.policyMode}</p>
                      </div>
                      <div className="border border-dl-border p-3">
                        <p className="font-mono text-xs text-dl-muted mb-1">Live Enabled</p>
                        <p className={`font-mono text-lg ${data.gefQualification.liveEnabled ? 'text-dl-forest' : 'text-dl-muted'}`}>
                          {data.gefQualification.liveEnabled ? 'YES' : 'NO'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                      <MetricCard label="GEF Paper Trades" value={`${data.gefQualification.closedGefTrades}`} />
                      <MetricCard label="GEF Open Trades" value={`${data.gefQualification.openGefTrades}`} />
                      <MetricCard label="Paper Win Rate" value={fmtPct(data.gefQualification.paperWinRate * 100)} />
                      <MetricCard label="Paper P&L (AXUSD)" value={fmtUsd(data.gefQualification.paperPnlAxusd)} highlight={data.gefQualification.paperPnlAxusd > 0} />
                      <MetricCard label="Max Drawdown" value={fmtPct(data.gefQualification.paperMaxDrawdown * 100)} />
                      <MetricCard label="AXM Balance" value={`${data.gefQualification.axmBalance}`} />
                    </div>

                    {data.gefQualification.latestBqe && (
                      <div className="border border-dl-border p-4">
                        <h4 className="font-serif text-base text-dl-navy mb-3">BQE Score Breakdown</h4>
                        <p className="font-mono text-xs text-dl-muted mb-3">
                          Computed: {fmtDateTime(data.gefQualification.latestBqe.computedAt)} | Tier Result: {data.gefQualification.latestBqe.tierResult}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <BQEBar label="RBAR" sublabel="Risk Budget Adherence" value={data.gefQualification.latestBqe.rbar} weight={25} />
                          <BQEBar label="DSI" sublabel="Drawdown Stability" value={data.gefQualification.latestBqe.dsi} weight={25} />
                          <BQEBar label="PSC" sublabel="Position Size Consistency" value={data.gefQualification.latestBqe.psc} weight={15} />
                          <BQEBar label="VRS" sublabel="Volatility Response Stability" value={data.gefQualification.latestBqe.vrs} weight={15} />
                          <BQEBar label="EDS" sublabel="Exit Discipline" value={data.gefQualification.latestBqe.eds} weight={10} />
                          <BQEBar label="RCS" sublabel="Rule Compliance" value={data.gefQualification.latestBqe.rcs} weight={10} />
                          <div className="col-span-2 border border-dl-navy p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-sm font-semibold text-dl-navy">EQS (Composite)</span>
                              <span className="font-mono text-lg font-semibold text-dl-navy">{data.gefQualification.latestBqe.eqs.toFixed(3)}</span>
                            </div>
                            <div className="w-full bg-gray-200 h-3">
                              <div className="h-3 bg-dl-navy" style={{ width: `${Math.min(100, data.gefQualification.latestBqe.eqs * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!data.gefQualification.latestBqe && (
                      <div className="border border-dl-border p-4">
                        <p className="font-mono text-sm text-dl-muted">
                          No BQE computation available yet — close some paper trades, then run qualification to generate scores
                        </p>
                      </div>
                    )}

                    <div className="mt-4 border border-dl-border p-4">
                      <h4 className="font-serif text-base text-dl-navy mb-2">Tier Progression</h4>
                      <div className="flex items-center gap-2">
                        {['PAPER', 'TIER_1', 'TIER_2', 'TIER_3'].map((tier) => (
                          <div key={tier} className={`flex-1 border p-2 text-center font-mono text-xs ${
                            data.gefQualification!.currentTier === tier
                              ? 'border-dl-navy bg-dl-navy text-white'
                              : 'border-dl-border text-dl-muted'
                          }`}>
                            {tier.replace('_', ' ')}
                          </div>
                        ))}
                      </div>
                      <p className="font-mono text-xs text-dl-muted mt-2">
                        Paper start: {fmtDate(data.gefQualification.paperStartDate)} | Paper trades needed for TIER 1: 20 min
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'daily' && (
              <div className="border border-dl-border">
                <div className="p-4 border-b border-dl-border bg-gray-50">
                  <h3 className="font-serif text-lg text-dl-navy">Daily P&L Progression</h3>
                </div>
                {data.dailyAggregates.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="font-mono text-sm text-dl-muted">No closed trades yet — run execution cycles to generate data</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm">
                      <thead>
                        <tr className="border-b border-dl-border bg-gray-50">
                          <th className="text-left p-3">Date</th>
                          <th className="text-right p-3">Trades</th>
                          <th className="text-right p-3">W/L/F</th>
                          <th className="text-right p-3">Daily P&L</th>
                          <th className="text-right p-3">Cumulative</th>
                          <th className="text-right p-3">vs Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.dailyAggregates.map((day, i) => (
                          <tr key={day.date} className="border-b border-dl-border/50 hover:bg-gray-50">
                            <td className="p-3">{fmtDate(day.date)}</td>
                            <td className="text-right p-3">{day.trades}</td>
                            <td className="text-right p-3">{day.wins}/{day.losses}/{day.flats}</td>
                            <td className={`text-right p-3 ${day.dailyPnl > 0 ? 'text-dl-forest' : day.dailyPnl < 0 ? 'text-red-600' : ''}`}>
                              {fmtUsd(day.dailyPnl)}
                            </td>
                            <td className={`text-right p-3 font-semibold ${day.cumulativePnl > 0 ? 'text-dl-forest' : day.cumulativePnl < 0 ? 'text-red-600' : ''}`}>
                              {fmtUsd(day.cumulativePnl)}
                            </td>
                            <td className="text-right p-3 text-dl-muted">
                              {fmtPct((day.cumulativePnl / data.metrics.targetUsd) * 100)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'audit' && (
              <div className="border border-dl-border">
                <div className="p-4 border-b border-dl-border bg-gray-50">
                  <h3 className="font-serif text-lg text-dl-navy">Full Audit Trail</h3>
                  <p className="font-mono text-xs text-dl-muted mt-1">
                    Setup → Decision → Trade → P&L — every trade with full provenance
                  </p>
                </div>
                {data.auditTrail.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="font-mono text-sm text-dl-muted">No closed trades in audit trail</p>
                  </div>
                ) : (
                  <div className="divide-y divide-dl-border/50">
                    {data.auditTrail.map((entry) => (
                      <div key={entry.tradeId} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-semibold text-dl-navy">{entry.symbol}</span>
                            <span className={`font-mono text-xs px-2 py-0.5 border ${entry.direction === 'LONG' ? 'border-dl-forest text-dl-forest' : 'border-red-400 text-red-600'}`}>
                              {entry.direction}
                            </span>
                            <span className="font-mono text-xs text-dl-muted">{entry.assetType}</span>
                            {entry.grade && (
                              <span className="font-mono text-xs px-2 py-0.5 border border-dl-border">{entry.grade}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-mono text-sm font-semibold ${entry.pnl > 0 ? 'text-dl-forest' : entry.pnl < 0 ? 'text-red-600' : 'text-dl-muted'}`}>
                              {fmtUsd(entry.pnl)} ({entry.pnlPct.toFixed(2)}%)
                            </span>
                            <StatusBadge status={entry.outcome} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs text-dl-muted">
                          <span>Entry: ${entry.entryPrice.toFixed(4)}</span>
                          <span>Exit: ${entry.exitPrice.toFixed(4)}</span>
                          <span>Qty: {entry.quantity.toFixed(4)}</span>
                          <span>Exit: {entry.exitReason}</span>
                          {entry.stopPrice && <span>Stop: ${entry.stopPrice.toFixed(4)}</span>}
                          {entry.takeProfitP50 && <span>TP50: ${entry.takeProfitP50.toFixed(4)}</span>}
                          {entry.confidenceScore !== null && <span>Confidence: {entry.confidenceScore.toFixed(1)}</span>}
                          {entry.regimeTier && <span>Regime: {entry.regimeTier}</span>}
                        </div>
                        <div className="mt-2 font-mono text-xs text-dl-muted/70">
                          <span>Opened: {fmtDateTime(entry.openedAt)}</span>
                          <span className="mx-2">|</span>
                          <span>Closed: {fmtDateTime(entry.closedAt)}</span>
                          <span className="mx-2">|</span>
                          <span>Trade: {entry.tradeId.slice(0, 8)}...</span>
                          <span className="mx-2">|</span>
                          <span>Decision: {entry.decisionId?.slice(0, 8) || 'N/A'}...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'runs' && (
              <div className="border border-dl-border">
                <div className="p-4 border-b border-dl-border bg-gray-50">
                  <h3 className="font-serif text-lg text-dl-navy">Recent Execution Runs</h3>
                </div>
                {data.recentRuns.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="font-mono text-sm text-dl-muted">No execution runs recorded</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm">
                      <thead>
                        <tr className="border-b border-dl-border bg-gray-50">
                          <th className="text-left p-3">Run ID</th>
                          <th className="text-left p-3">Type</th>
                          <th className="text-left p-3">Started</th>
                          <th className="text-right p-3">Processed</th>
                          <th className="text-right p-3">Eligible</th>
                          <th className="text-right p-3">Authorized</th>
                          <th className="text-right p-3">Opened</th>
                          <th className="text-right p-3">Failed</th>
                          <th className="text-left p-3">Checksum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentRuns.map((run: any) => (
                          <tr key={run.id} className="border-b border-dl-border/50 hover:bg-gray-50">
                            <td className="p-3">{run.id.slice(0, 8)}...</td>
                            <td className="p-3">{run.run_type}</td>
                            <td className="p-3">{fmtDateTime(run.started_at)}</td>
                            <td className="text-right p-3">{run.processed_count}</td>
                            <td className="text-right p-3">{run.eligible_count}</td>
                            <td className="text-right p-3">{run.authorized_count}</td>
                            <td className="text-right p-3">{run.opened_count}</td>
                            <td className={`text-right p-3 ${run.failed_count > 0 ? 'text-red-600' : ''}`}>{run.failed_count}</td>
                            <td className="p-3 text-dl-muted">{run.checksum?.slice(0, 12)}...</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 border-t border-dl-border pt-4">
              <p className="font-mono text-xs text-dl-muted">
                Proof of Execution Playbook — Generated {fmtDateTime(data.generatedAt)} — AXIOM Protocol Internal Use Only
              </p>
            </div>
          </>
        )}
      </PageShell>
    </DesignLawLayout>
  );
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="border border-dl-border p-3">
      <p className="font-mono text-xs text-dl-muted mb-1">{label}</p>
      <p className={`font-mono text-lg ${highlight ? 'text-dl-forest' : 'text-dl-navy'}`}>{value}</p>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-mono text-xs text-dl-muted">{label}</p>
      <p className="font-mono text-sm text-dl-navy">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <tr className="border-b border-dl-border/30">
      <td className="py-2 pr-4 text-dl-muted">{label}</td>
      <td className={`py-2 text-right ${highlight ? 'text-dl-forest font-semibold' : ''}`}>{value}</td>
    </tr>
  );
}

function BQEBar({ label, sublabel, value, weight }: { label: string; sublabel: string; value: number; weight: number }) {
  const pct = Math.min(100, value * 100);
  const color = pct >= 70 ? 'bg-dl-forest' : pct >= 40 ? 'bg-yellow-600' : 'bg-red-500';
  return (
    <div className="border border-dl-border p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs font-semibold text-dl-navy">{label}</span>
        <span className="font-mono text-xs text-dl-muted">{weight}%</span>
      </div>
      <p className="font-mono text-[10px] text-dl-muted mb-1">{sublabel}</p>
      <div className="w-full bg-gray-200 h-2 mb-1">
        <div className={`h-2 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="font-mono text-xs text-right text-dl-navy">{value.toFixed(3)}</p>
    </div>
  );
}
