import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  DesignLawLayout,
  PageShell,
  SectionHeading,
  DataTable,
} from '../../components/design-law';
import type { Column } from '../../components/design-law';

function formatUTC(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

const REGIME_COLORS: Record<string, string> = {
  TREND_UP: 'text-dl-forest',
  TREND_DOWN: 'text-dl-error',
  RANGE_LOW_VOL: 'text-dl-gray',
  HIGH_VOL_DISLOCATION: 'text-dl-gold',
};

const STANCE_COLORS: Record<string, string> = {
  RISK_ON: 'text-dl-forest',
  DEFENSIVE: 'text-dl-gold',
  HALTED: 'text-dl-error',
  NEUTRAL: 'text-dl-navy',
};

interface LogEntry {
  id: string;
  created_at: string;
  week: number;
  phase: number;
  category: string;
  title: string;
  description: string;
  tx_hash: string | null;
  product: string | null;
  amount: string | null;
  status: string;
  failure_reason: string | null;
  fix_applied: string | null;
  protocol_change: string | null;
}

interface SentinelData {
  regime: string;
  regimeConfidence: number;
  systemStance: string;
  totalSignals: number;
  qualifiedSignals: number;
  approvedDecisions: number;
  deniedDecisions: number;
}

interface OverviewData {
  timestamp: string;
  sentinel: SentinelData;
  euler: {
    deposited: string;
    utilization: string;
    supplyAPY: string;
    feeRoutingStatus: string;
    interestFeePercent: string;
  };
  axusd: { totalSupply: string };
  lendingFund: { tvl: string; sharePrice: string; activeLoans: number };
  dex: { tvl: string; volume24h: string };
  treasury: { total: string; currentExposure: string };
  nodes: { total: number; active: number };
  feePlumbing: { eulerFeeRecipientSet: boolean; revenueRouterConnected: boolean; status: string };
}

interface EarnStats {
  deployed: boolean;
  status: string;
  tvlUsd: number;
  blendedApyPct: string;
  ameRegime: string | null;
  ameConfidence: number | null;
}

interface PoolData {
  id: string;
  address: string;
  reserve0Label: string;
  reserve1Label: string;
  reserve0: number;
  reserve1: number;
  tvlUsd: number;
  status: string;
  feeBps: number;
}

interface GuardRailStatus {
  id: number;
  title: string;
  status: 'PASS' | 'ENFORCED' | 'WARNING' | 'UNKNOWN' | 'LOADING';
  detail: string;
  source: string;
}

type TabId =
  | 'framework'
  | 'onchain'
  | 'realassets'
  | 'community'
  | 'log'
  | 'system';

const FRAMEWORK_PRINCIPLE = `This is not a personal budget. This is a disciplined capital deployment system designed to build a machine-verifiable operating record across Axiom's live rails. The objective is not to maximize short-term return. The objective is to systematically produce proof that Axiom's infrastructure is active, capitalized, measurable, and compounding across on-chain liquidity, real asset intelligence, and community coordination.`;

const MONTH_PROGRESSION = [
  {
    month: 1,
    label: 'Month 1',
    notes: 'Initial liquidity visible. First vault deposits recorded. First reports generated. First community cycle seeded.',
  },
  {
    month: 3,
    label: 'Month 3',
    notes: 'Meaningful pool depth established. Vault history begins to form. Multiple properties underwritten. Recurring execution pattern becomes visible.',
  },
  {
    month: 6,
    label: 'Month 6',
    notes: 'Consistent capital behavior is documented. On-chain and off-chain activity reinforce each other. Axiom no longer appears conceptual. Allocator-readable track record begins.',
  },
  {
    month: 12,
    label: 'Month 12',
    notes: 'Longitudinal proof-of-execution record across all rails. The protocol has visible operational history across digital, physical, and community layers. Credibility supported by evidence, not presentation.',
  },
];

const OUTCOME_ROWS = [
  { layer: 'On-Chain Pool Depth', m6: '~$1,000 USDC', m12: '~$1,900 USDC' },
  { layer: 'earnAXUSD Vault', m6: '~300 AXUSD + yield', m12: '~600 AXUSD + yield' },
  { layer: 'AXM Held', m6: '~$150 worth', m12: '~$300 worth' },
  { layer: 'Properties Analyzed', m6: '12–18 reports', m12: '24–36 reports' },
  { layer: 'Land Pipeline Capital', m6: '~$600 deployed', m12: '~$1,200 deployed' },
  { layer: 'Wealth Practice Cycles', m6: '2–3 groups active', m12: '4–6 groups active' },
];

const LAYERS = [
  {
    id: 'onchain',
    label: '1. On-Chain Liquidity Layer',
    monthly: '$225 / month',
    buckets: [
      { label: 'EulerSwap Pool Depth', amount: '$150', proof: 'Live TVL growth. Visible pool support. Timestamped liquidity deployment. Public execution record.', route: '/dex', routeLabel: 'Open Exchange' },
      { label: 'earnAXUSD Vault', amount: '$50', proof: 'Vault asset growth over time. Live yield accrual. Recurring capital deployment into protocol-native products.', route: '/axusd-3643', routeLabel: 'Open Unified AXUSD' },
      { label: 'AXM Accumulation', amount: '$25', proof: 'Documented holding history. Governance alignment. Recurring protocol commitment.', route: '/dex', routeLabel: 'Open Exchange' },
    ],
  },
  {
    id: 'realassets',
    label: '2. Real Asset Intelligence Layer',
    monthly: '$175 / month',
    buckets: [
      { label: 'Land Acquisition Pipeline', amount: '$100', proof: 'Documented deal advancement. Capital attached to real asset pipeline activity. Timestamped movement from digital treasury to physical opportunity.', route: '/land', routeLabel: 'Open Land Console' },
      { label: 'Property Analysis Reports', amount: '$50', proof: 'Recurring underwriting activity. Live report generation. Real property evaluation history. Growing intelligence dataset.', route: '/property', routeLabel: 'Open Property Analysis' },
      { label: 'Deal Origination Inputs', amount: '$25', proof: 'Continuous pipeline formation. Evidence of acquisition activity. Real market signal capture.', route: '/distressed-feed', routeLabel: 'Open Deal Flow' },
    ],
  },
  {
    id: 'community',
    label: '3. Community Coordination Layer',
    monthly: '$100 / month',
    buckets: [
      { label: 'Wealth Practice', amount: '$75', proof: 'Live contribution cycles. Recurring community participation. Timestamped group mechanics. Real user coordination history.', route: '/wealth-practice', routeLabel: 'Open Wealth Practice' },
      { label: 'Infrastructure Continuity', amount: '$25', proof: 'Continuity of core infrastructure. Evidence that the system remains operational. Support for persistent network activity.', route: '/depin/denet', routeLabel: 'Open DePIN Console' },
    ],
  },
];

export default function FounderOpsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('framework');

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [guardRails, setGuardRails] = useState<GuardRailStatus[]>([
    { id: 1, title: 'Capital Preservation', status: 'LOADING', detail: 'Loading...', source: 'sentinel' },
    { id: 2, title: 'AXUSD Peg Stability', status: 'LOADING', detail: 'Loading...', source: 'psm' },
    { id: 3, title: 'Treasury Coverage', status: 'LOADING', detail: 'Loading...', source: 'solvency' },
    { id: 4, title: 'Lending Health', status: 'LOADING', detail: 'Loading...', source: 'lending' },
    { id: 5, title: 'Regulatory Compliance', status: 'LOADING', detail: 'Loading...', source: 'disclosure' },
  ]);

  const [earnStats, setEarnStats] = useState<EarnStats | null>(null);
  const [earnLoading, setEarnLoading] = useState(false);

  const [pools, setPools] = useState<PoolData[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(false);

  const [reportCount, setReportCount] = useState<number | null>(null);
  const [dealCount, setDealCount] = useState<number | null>(null);
  const [groupCount, setGroupCount] = useState<number | null>(null);

  const [variances, setVariances] = useState<any[]>([]);
  const [varianceLoading, setVarianceLoading] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState<any | null>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  const [pendingOutcomes, setPendingOutcomes] = useState<any[]>([]);
  const [outcomesLoading, setOutcomesLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/founder-ops/overview').then(r => r.json()).catch(() => null),
      fetch('/api/founder-ops/log').then(r => r.json()).catch(() => ({ logs: [] })),
    ]).then(([ov, lg]) => {
      // API returns { success: true, data: { sentinel, euler, axusd, ... } }
      const ovData = ov?.data ?? ov;
      if (ovData && !ovData.error) setData(ovData);
      else if (ov?.error) setError(ov.error);
      setLogs(lg.logs || []);
      setLoading(false);
    }).catch(e => {
      setError(String(e));
      setLoading(false);
    });

    fetch('/api/euler/earn-stats').then(r => r.json()).then(d => {
      if (d && d.tvlUsd != null) setEarnStats(d);
    }).catch(() => {});
    fetch('/api/euler/eulerswap-pools').then(r => r.json()).then(d => {
      if (d.pools) setPools(d.pools);
    }).catch(() => {});

    Promise.all([
      fetch('/api/land/candidates').then(r => r.json()).catch(() => null),
      fetch('/api/wealth-practice/groups').then(r => r.json()).catch(() => null),
    ]).then(([candidates, groups]) => {
      // Land candidates: { success, candidates: [], stats: { total, byStage } }
      const landTotal = candidates?.stats?.total ?? candidates?.candidates?.length ?? null;
      if (landTotal != null) setDealCount(landTotal);
      // Wealth practice groups: { groups: [], total }
      if (groups?.total != null) setGroupCount(groups.total);
      else if (Array.isArray(groups?.groups)) setGroupCount(groups.groups.length);
    });

    fetch('/api/sentinel/guard-rails').then(r => r.json()).then(d => {
      if (d.guardRails) setGuardRails(d.guardRails);
    }).catch(() => {});
  }, []);

  const loadVariances = async () => {
    setVarianceLoading(true);
    try {
      const res = await fetch('/api/founder-ops/variances').then(r => r.json()).catch(() => ({ variances: [] }));
      setVariances(res.variances || []);
    } finally {
      setVarianceLoading(false);
    }
  };

  const loadOutcomes = async () => {
    setOutcomesLoading(true);
    try {
      const res = await fetch('/api/founder-ops/pending-outcomes').then(r => r.json()).catch(() => ({ outcomes: [] }));
      setPendingOutcomes(res.outcomes || []);
    } finally {
      setOutcomesLoading(false);
    }
  };

  const runCalibration = async (dryRun: boolean) => {
    setCalibrating(true);
    setCalibrationResult(null);
    setCalibrationError(null);
    try {
      const res = await fetch('/api/cost-intelligence/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const json = await res.json();
      if (!res.ok) setCalibrationError(json.error || 'Calibration failed');
      else { setCalibrationResult(json); if (!dryRun) loadVariances(); }
    } catch (err: any) {
      setCalibrationError(err.message);
    } finally {
      setCalibrating(false);
    }
  };

  const logColumns: Column<LogEntry>[] = [
    { key: 'created_at', header: 'Date', render: r => <span className="font-dl-mono text-xs">{formatUTC(r.created_at)}</span> },
    { key: 'category', header: 'Layer', render: r => <span className="font-dl-mono text-xs uppercase text-dl-navy">{r.category}</span> },
    { key: 'title', header: 'Action', render: r => (
      <div>
        <p className="text-xs font-medium text-dl-navy">{r.title}</p>
        <p className="text-xs text-dl-gray mt-0.5">{r.description}</p>
      </div>
    )},
    { key: 'amount', header: 'Amount', render: r => <span className="font-dl-mono text-xs">{r.amount || '—'}</span> },
    { key: 'status', header: 'Status', render: r => (
      <span className={`font-dl-mono text-xs uppercase ${r.status === 'SUCCESS' ? 'text-dl-forest' : r.status === 'FAILURE' ? 'text-dl-error' : 'text-dl-gold'}`}>
        {r.status}
      </span>
    )},
    { key: 'tx_hash', header: 'TX', render: r => r.tx_hash ? (
      <a href={`https://arbiscan.io/tx/${r.tx_hash}`} target="_blank" rel="noopener noreferrer"
        className="font-dl-mono text-xs text-dl-navy underline">
        {r.tx_hash.slice(0, 6)}…{r.tx_hash.slice(-4)}
      </a>
    ) : <span className="text-dl-gray text-xs">—</span> },
  ];

  const TABS: { id: TabId; label: string }[] = [
    { id: 'framework', label: 'Proof of Execution' },
    { id: 'onchain', label: 'On-Chain Layer' },
    { id: 'realassets', label: 'Real Assets' },
    { id: 'community', label: 'Community' },
    { id: 'log', label: `Log${logs.length > 0 ? ` (${logs.length})` : ''}` },
    { id: 'system', label: 'System Status' },
  ];

  const primaryPool = pools.find(p => p.reserve0Label && p.reserve1Label) || pools[0] || null;
  const poolTvl = primaryPool?.tvlUsd != null ? Number(primaryPool.tvlUsd) : null;

  return (
    <DesignLawLayout>
      <Head>
        <title>Founder Operations | Axiom Protocol</title>
        <meta name="description" content="Axiom Protocol Proof-of-Execution Framework — systematic capital deployment across on-chain liquidity, real asset intelligence, and community coordination." />
      </Head>

      <PageShell
        title="Founder Operations"
        subtitle="Proof-of-Execution Framework — $500/month systematic deployment across on-chain, real asset, and community rails."
        disclosure="Internal operations dashboard. All on-chain data is live from Arbitrum One. Off-chain metrics reflect database state."
      >
        <>
            <div className="flex flex-wrap gap-0 border-b border-dl-border mb-8">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'system') { loadOutcomes(); loadVariances(); }
                  }}
                  className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-dl-navy text-dl-navy font-medium'
                      : 'border-transparent text-dl-gray hover:text-dl-navy'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB: PROOF OF EXECUTION ─────────────────────────────── */}
            {activeTab === 'framework' && (
              <>
                <div className="border border-dl-border mb-8 bg-dl-bg-alt">
                  <div className="px-6 py-5 border-b border-dl-border">
                    <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-3">Core Principle</p>
                    <p className="text-sm text-dl-navy leading-relaxed max-w-3xl">{FRAMEWORK_PRINCIPLE}</p>
                  </div>
                  <div className="px-6 py-4">
                    <p className="font-dl-mono text-xs text-dl-gray leading-relaxed">
                      The asset is not the only thing that matters. <strong className="text-dl-navy">The record matters.</strong>{' '}
                      Any founder can make claims. Very few can produce a timestamped, multi-layer, machine-verifiable operating history
                      that shows capital deployed, rails used, assets analyzed, groups coordinated, and infrastructure kept live over time.
                      That is what this framework builds.
                    </p>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Monthly Deployment — $500 / Month</SectionHeading>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-dl-border">
                    {LAYERS.map((layer, li) => (
                      <div key={layer.id} className={`${li < 2 ? 'border-b lg:border-b-0 lg:border-r' : ''} border-dl-border`}>
                        <div className="px-4 py-3 border-b border-dl-border bg-dl-bg-alt">
                          <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase tracking-wider">{layer.label}</p>
                          <p className="font-dl-mono text-xs text-dl-gold mt-0.5">{layer.monthly}</p>
                        </div>
                        {layer.buckets.map((b, bi) => (
                          <div key={b.label} className={`px-4 py-3 ${bi < layer.buckets.length - 1 ? 'border-b border-dl-border' : ''}`}>
                            <div className="flex items-baseline justify-between mb-1">
                              <p className="text-xs font-medium text-dl-navy">{b.label}</p>
                              <span className="font-dl-mono text-xs font-bold text-dl-navy ml-2 flex-shrink-0">{b.amount}</span>
                            </div>
                            <p className="text-xs text-dl-gray leading-relaxed mb-2">Proof: {b.proof}</p>
                            {b.route && (
                              <a href={b.route} className="font-dl-mono text-xs text-dl-navy underline hover:text-dl-forest">
                                {b.routeLabel} →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Live Layer Status</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-0 border border-dl-border">
                    <div className="px-4 py-4 border-b border-r border-dl-border">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">EulerSwap Pool TVL</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {poolsLoading ? '...' : poolTvl != null ? `$${poolTvl.toLocaleString()}` : '—'}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">
                        {primaryPool ? `${primaryPool.reserve0Label ?? 'USDC'}/${primaryPool.reserve1Label ?? 'AXUSD'} · ${primaryPool.status}` : 'On-chain liquidity layer'}
                      </p>
                    </div>
                    <div className="px-4 py-4 border-b border-r border-dl-border">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">earnAXUSD Vault</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {earnStats ? `$${earnStats.tvlUsd.toLocaleString()}` : '—'}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">
                        {earnStats ? `${earnStats.blendedApyPct}% APY · ${earnStats.status}` : 'Yield aggregation layer'}
                      </p>
                    </div>
                    <div className="px-4 py-4 border-b border-dl-border">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">AXUSD In Circulation</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {data ? parseFloat(data.axusd.totalSupply).toLocaleString() : '—'}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Protocol stablecoin supply</p>
                    </div>
                    <div className="px-4 py-4 border-r border-dl-border">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">Properties Analyzed</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {reportCount != null ? reportCount : '—'}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Total underwriting reports</p>
                    </div>
                    <div className="px-4 py-4 border-r border-dl-border">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">Active Deals</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {dealCount != null ? dealCount : '—'}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Land acquisition pipeline</p>
                    </div>
                    <div className="px-4 py-4">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">Wealth Practice Groups</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {groupCount != null ? groupCount : '—'}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Active coordination cycles</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Month-by-Month Progression</SectionHeading>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 border border-dl-border mb-6">
                    {MONTH_PROGRESSION.map((m, i) => (
                      <div key={m.month} className={`px-4 py-4 ${i < 3 ? 'border-b lg:border-b-0 lg:border-r' : ''} border-dl-border`}>
                        <p className="font-dl-mono text-xs font-semibold text-dl-gold uppercase tracking-wider mb-2">{m.label}</p>
                        <p className="text-xs text-dl-gray leading-relaxed">{m.notes}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border border-dl-border">
                    <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
                      <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase tracking-wider">Illustrative 12-Month Outcome</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dl-border">
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Layer</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">6 Months</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">12 Months</th>
                          </tr>
                        </thead>
                        <tbody>
                          {OUTCOME_ROWS.map((row, i) => (
                            <tr key={i} className={`border-b border-dl-border last:border-0 ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                              <td className="p-3 text-xs text-dl-navy">{row.layer}</td>
                              <td className="p-3 text-right font-dl-mono text-xs text-dl-gray">{row.m6}</td>
                              <td className="p-3 text-right font-dl-mono text-xs text-dl-navy font-medium">{row.m12}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── TAB: ON-CHAIN LAYER ─────────────────────────────────── */}
            {activeTab === 'onchain' && (
              <>
                <div className="mb-8">
                  <SectionHeading>EulerSwap Pool Depth — $150 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Deploy $150/month into the USDC side of the live pool. This creates visible, verifiable on-chain
                    liquidity that any allocator, partner, or observer can inspect directly from the contract.
                  </p>
                  {pools.length === 0 ? (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">Loading pool data...</p>
                    </div>
                  ) : (
                    <div className="border border-dl-border">
                      <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
                        <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase">EulerSwap AXUSD / USDC Pool</p>
                      </div>
                      {pools.map((pool, i) => (
                        <div key={pool.id || pool.address} className={`${i < pools.length - 1 ? 'border-b border-dl-border' : ''}`}>
                          <div className="grid grid-cols-2 lg:grid-cols-5 gap-0">
                            <div className="px-4 py-3 border-r border-dl-border">
                              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Status</p>
                              <p className={`font-dl-mono text-sm font-bold ${pool.status === 'LIVE' ? 'text-dl-forest' : 'text-dl-gold'}`}>{pool.status}</p>
                            </div>
                            <div className="px-4 py-3 border-r border-dl-border">
                              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">TVL</p>
                              <p className="font-dl-mono text-sm font-bold text-dl-navy">${Number(pool.tvlUsd || 0).toLocaleString()}</p>
                            </div>
                            <div className="px-4 py-3 border-r border-dl-border">
                              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">{pool.reserve0Label || 'Token 0'} Reserve</p>
                              <p className="font-dl-mono text-sm font-bold text-dl-navy">{Number(pool.reserve0 || 0).toFixed(2)}</p>
                            </div>
                            <div className="px-4 py-3 border-r border-dl-border">
                              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">{pool.reserve1Label || 'Token 1'} Reserve</p>
                              <p className="font-dl-mono text-sm font-bold text-dl-navy">{Number(pool.reserve1 || 0).toFixed(2)}</p>
                            </div>
                            <div className="px-4 py-3">
                              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Fee</p>
                              <p className="font-dl-mono text-sm font-bold text-dl-navy">{pool.feeBps != null ? `${Number(pool.feeBps).toFixed(4)} bps` : '—'}</p>
                            </div>
                          </div>
                          <div className="px-4 py-2 border-t border-dl-border bg-dl-bg-alt">
                            <a href={`https://arbiscan.io/address/${pool.address}`} target="_blank" rel="noopener noreferrer"
                              className="font-dl-mono text-xs text-dl-gray underline">{pool.address}</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 border border-dl-border bg-dl-bg-alt px-4 py-3 flex items-center justify-between gap-4">
                    <p className="font-dl-mono text-xs text-dl-gray">
                      To add liquidity: <span className="text-dl-navy">USDC_AMOUNT=150 node scripts/add-pool-liquidity.js</span> — deposits USDC into EUSDC vault and reconfigures pool equilibrium.
                    </p>
                    <a href="/dex" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 whitespace-nowrap hover:bg-dl-navy hover:text-white flex-shrink-0">
                      Open Exchange →
                    </a>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>earnAXUSD Vault — $50 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Mint 50 AXUSD and deposit into the earnAXUSD vault each month. Creates a live yield history and
                    demonstrates that Axiom's yield-bearing rails are not theoretical.
                  </p>
                  {earnStats ? (
                    <div className="border border-dl-border">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
                        <div className="px-4 py-3 border-r border-dl-border">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Status</p>
                          <p className={`font-dl-mono text-sm font-bold ${earnStats.deployed ? 'text-dl-forest' : 'text-dl-gold'}`}>{earnStats.status}</p>
                        </div>
                        <div className="px-4 py-3 border-r border-dl-border">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">TVL</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">${earnStats.tvlUsd.toLocaleString()} AXUSD</p>
                        </div>
                        <div className="px-4 py-3 border-r border-dl-border">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Blended APY</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-forest">{earnStats.blendedApyPct}%</p>
                        </div>
                        <div className="px-4 py-3">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">AME Regime</p>
                          <p className={`font-dl-mono text-sm font-bold ${REGIME_COLORS[earnStats.ameRegime ?? ''] ?? 'text-dl-navy'}`}>
                            {earnStats.ameRegime ?? '—'}
                          </p>
                        </div>
                      </div>
                      <div className="px-4 py-2 border-t border-dl-border bg-dl-bg-alt flex items-center justify-between gap-4">
                        <a href="https://arbiscan.io/address/0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B" target="_blank" rel="noopener noreferrer"
                          className="font-dl-mono text-xs text-dl-gray underline">0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B</a>
                        <a href="/axusd-3643" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-1.5 whitespace-nowrap hover:bg-dl-navy hover:text-white flex-shrink-0">
                          Open Unified AXUSD →
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">Loading vault data...</p>
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <SectionHeading>AXM Accumulation — $25 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Accumulate AXM on a recurring basis. Demonstrates aligned governance exposure and long-term participation.
                    Each buy is timestamped on-chain. Over 12 months this builds a documented holding history.
                  </p>
                  <div className="border border-dl-border">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
                      <div className="px-4 py-3 border-b lg:border-b-0 border-r border-dl-border">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Proof Created</p>
                        <p className="text-xs text-dl-navy leading-relaxed">Documented holding history, governance alignment, recurring protocol commitment</p>
                      </div>
                      <div className="px-4 py-3 border-b lg:border-b-0 border-r border-dl-border">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">AXM Token</p>
                        <a href="https://arbiscan.io/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D" target="_blank" rel="noopener noreferrer"
                          className="font-dl-mono text-xs text-dl-navy underline">0x864F9c6f5…2539D</a>
                      </div>
                      <div className="px-4 py-3 border-b lg:border-b-0 border-r border-dl-border">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">6-Month Target</p>
                        <p className="font-dl-mono text-sm font-bold text-dl-navy">~$150 held</p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Execute</p>
                        <a href="/dex" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 inline-block hover:bg-dl-navy hover:text-white">
                          Open Exchange →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {data && (
                  <div className="mb-8">
                    <SectionHeading>Supporting Infrastructure</SectionHeading>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-dl-border">
                      <div className="px-4 py-3 border-r border-dl-border">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">EVK Vault (eAXUSD-6)</p>
                        <p className="font-dl-mono text-sm font-bold text-dl-navy">${data.euler.deposited}</p>
                        <p className="font-dl-mono text-xs text-dl-gray mt-1">{data.euler.utilization}% utilization</p>
                      </div>
                      <div className="px-4 py-3 border-r border-dl-border">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Supply APY</p>
                        <p className="font-dl-mono text-sm font-bold text-dl-forest">{data.euler.supplyAPY}%</p>
                      </div>
                      <div className="px-4 py-3 border-r border-dl-border">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Fee Routing</p>
                        <p className={`font-dl-mono text-sm font-bold ${data.euler.feeRoutingStatus === 'OPERATIONAL' ? 'text-dl-forest' : 'text-dl-gold'}`}>
                          {data.euler.feeRoutingStatus}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Interest Fee</p>
                        <p className="font-dl-mono text-sm font-bold text-dl-navy">{data.euler.interestFeePercent}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── TAB: REAL ASSETS ────────────────────────────────────── */}
            {activeTab === 'realassets' && (
              <>
                <div className="border border-dl-border mb-8 bg-dl-bg-alt px-5 py-4">
                  <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">Layer Objective — $175 / month</p>
                  <p className="text-sm text-dl-navy leading-relaxed max-w-2xl">
                    Link Axiom's digital rails to real-world asset progression. Each month produces documented deal advancement,
                    live report generation, and evidence of active acquisition activity — not placeholder activity.
                  </p>
                </div>

                <div className="mb-8">
                  <SectionHeading>Land Acquisition Pipeline — $100 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Deploy toward live deal progression: title work, survey costs, earnest money reserves, or parcel targeting.
                    Every dollar here has a timestamped deal record in the system.
                  </p>
                  <div className="border border-dl-border">
                    <div className="px-4 py-3 border-b border-dl-border bg-dl-bg-alt flex items-center justify-between">
                      <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase">Active Pipeline</p>
                      {dealCount != null && (
                        <span className="font-dl-mono text-xs text-dl-forest">{dealCount} deals in system</span>
                      )}
                    </div>
                    <div className="px-4 py-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Proof Created</p>
                          <p className="text-xs text-dl-navy leading-relaxed">Documented deal advancement, capital attached to real asset pipeline activity, timestamped movement from digital treasury to physical opportunity.</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">6-Month Target</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">~$600 deployed</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">12-Month Target</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">~$1,200 deployed</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <a href="/land" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 inline-block hover:bg-dl-navy hover:text-white">
                          Open Land Acquisition Console →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Property Analysis Reports — $50 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Run 1–2 live property analyses per month through the Property Analysis tool. Proves that
                    the intelligence layer is actively underwriting real opportunities, not sitting dormant.
                  </p>
                  <div className="border border-dl-border">
                    <div className="px-4 py-3 border-b border-dl-border bg-dl-bg-alt flex items-center justify-between">
                      <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase">Underwriting History</p>
                      {reportCount != null && (
                        <span className="font-dl-mono text-xs text-dl-forest">{reportCount} total reports</span>
                      )}
                    </div>
                    <div className="px-4 py-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Proof Created</p>
                          <p className="text-xs text-dl-navy leading-relaxed">Recurring underwriting activity, live report generation, real property evaluation history, growing intelligence dataset.</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">6-Month Target</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">12–18 reports</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">12-Month Target</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">24–36 reports</p>
                        </div>
                      </div>
                      <a href="/property" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 inline-block hover:bg-dl-navy hover:text-white">
                        Open Property Analysis →
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Deal Origination Inputs — $25 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Sourcing submissions, comps data, distressed lead inputs, or other live origination signals.
                    Supports the intake side of the real asset pipeline and keeps deal flow active.
                  </p>
                  <div className="border border-dl-border px-4 py-4 bg-dl-bg-alt">
                    <p className="font-dl-mono text-xs text-dl-gray mb-2">Proof Created</p>
                    <p className="text-xs text-dl-navy leading-relaxed">Continuous pipeline formation. Evidence of acquisition activity. Real market signal capture.</p>
                    <div className="mt-3">
                      <a href="/distressed-feed" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 inline-block hover:bg-dl-navy hover:text-white">
                        Open Deal Flow →
                      </a>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── TAB: COMMUNITY ──────────────────────────────────────── */}
            {activeTab === 'community' && (
              <>
                <div className="border border-dl-border mb-8 bg-dl-bg-alt px-5 py-4">
                  <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">Layer Objective — $100 / month</p>
                  <p className="text-sm text-dl-navy leading-relaxed max-w-2xl">
                    Prove that Axiom can coordinate recurring participant behavior, not just passive capital.
                    The community layer is the only layer that cannot be faked at scale — real participants, real cycles, real coordination.
                  </p>
                </div>

                <div className="mb-8">
                  <SectionHeading>Wealth Practice — $75 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Seed or contribute to an active group cycle. Proves that Axiom can coordinate recurring participant
                    behavior, not just passive capital.
                  </p>
                  <div className="border border-dl-border">
                    <div className="px-4 py-3 border-b border-dl-border bg-dl-bg-alt flex items-center justify-between">
                      <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase">Active Group Cycles</p>
                      {groupCount != null && (
                        <span className="font-dl-mono text-xs text-dl-forest">{groupCount} groups in system</span>
                      )}
                    </div>
                    <div className="px-4 py-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Proof Created</p>
                          <p className="text-xs text-dl-navy leading-relaxed">Live contribution cycles. Recurring community participation. Timestamped group mechanics. Real user coordination history.</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">6-Month Target</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">2–3 active groups</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">12-Month Target</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">4–6 active groups</p>
                        </div>
                      </div>
                      <a href="/wealth-practice" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 inline-block hover:bg-dl-navy hover:text-white">
                        Open Wealth Practice →
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Infrastructure Continuity — $25 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Allocate toward DePIN node costs, storage, or related operational continuity that keeps
                    the infrastructure layer active and observable.
                  </p>
                  <div className="border border-dl-border">
                    <div className="px-4 py-3 border-b border-dl-border bg-dl-bg-alt flex items-center justify-between">
                      <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase">DePIN Node Status</p>
                      {data && (
                        <span className="font-dl-mono text-xs text-dl-forest">{data.nodes.active} active / {data.nodes.total} total</span>
                      )}
                    </div>
                    <div className="px-4 py-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Proof Created</p>
                          <p className="text-xs text-dl-navy leading-relaxed">Continuity of core infrastructure. Evidence the system remains operational. Support for persistent network activity.</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Active Nodes</p>
                          <p className="font-dl-mono text-xl font-bold text-dl-navy">{data?.nodes.active ?? '—'}</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Total Nodes</p>
                          <p className="font-dl-mono text-xl font-bold text-dl-navy">{data?.nodes.total ?? '—'}</p>
                        </div>
                      </div>
                      <a href="/depin/denet" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 inline-block hover:bg-dl-navy hover:text-white">
                        Open DePIN Console →
                      </a>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── TAB: OPERATIONS LOG ─────────────────────────────────── */}
            {activeTab === 'log' && (
              <>
                <SectionHeading>Operations Log</SectionHeading>
                <p className="text-sm text-dl-gray mb-6 max-w-2xl">
                  Every action, failure, and fix documented with on-chain evidence where applicable.
                  This log is the timestamped execution record. Failures increase credibility when documented.
                </p>
                <DataTable
                  columns={logColumns}
                  data={logs}
                  keyExtractor={(e) => e.id}
                  emptyMessage="No operations logged yet. Log your first action via POST /api/founder-ops/log"
                />
              </>
            )}

            {/* ── TAB: SYSTEM STATUS ──────────────────────────────────── */}
            {activeTab === 'system' && data && (
              <>
                <div className="mb-8">
                  <SectionHeading>Sentinel Intelligence</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-dl-border">
                    <div className="px-4 py-4 border-r border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Market Regime</p>
                      <p className={`font-dl-heading text-lg ${REGIME_COLORS[data.sentinel.regime] || 'text-dl-navy'}`}>{data.sentinel.regime}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">{data.sentinel.regimeConfidence}% confidence</p>
                    </div>
                    <div className="px-4 py-4 border-r border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">System Stance</p>
                      <p className={`font-dl-heading text-lg ${STANCE_COLORS[data.sentinel.systemStance] || 'text-dl-navy'}`}>{data.sentinel.systemStance}</p>
                    </div>
                    <div className="px-4 py-4 border-r border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Signals</p>
                      <p className="font-dl-heading text-lg text-dl-navy">
                        {data.sentinel.qualifiedSignals} <span className="text-sm text-dl-gray">/ {data.sentinel.totalSignals}</span>
                      </p>
                    </div>
                    <div className="px-4 py-4">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Decisions</p>
                      <p className="font-dl-heading text-lg">
                        <span className="text-dl-forest">{data.sentinel.approvedDecisions}</span>
                        {' / '}
                        <span className="text-dl-error">{data.sentinel.deniedDecisions}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Treasury + Vault Positions</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-dl-border">
                    <div className="px-4 py-3 border-r border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Euler Vault</p>
                      <p className="font-dl-heading text-lg text-dl-navy">${data.euler.deposited}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">{data.euler.utilization}% util · {data.euler.supplyAPY}% APY</p>
                    </div>
                    <div className="px-4 py-3 border-r border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Lending Fund</p>
                      <p className="font-dl-heading text-lg text-dl-navy">${data.lendingFund.tvl}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Share: ${data.lendingFund.sharePrice} · {data.lendingFund.activeLoans} loans</p>
                    </div>
                    <div className="px-4 py-3 border-r border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">AXUSD Supply</p>
                      <p className="font-dl-heading text-lg text-dl-navy">{parseFloat(data.axusd.totalSupply).toLocaleString()}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Treasury</p>
                      <p className="font-dl-heading text-lg text-dl-navy">{data.treasury.total}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Exposure: {data.treasury.currentExposure}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Mandatory Guard Rails</SectionHeading>
                  <div className="space-y-2">
                    {guardRails.map((gr) => {
                      const color = gr.status === 'PASS' || gr.status === 'ENFORCED' ? 'text-dl-forest' :
                        gr.status === 'WARNING' ? 'text-dl-gold' :
                        gr.status === 'LOADING' ? 'text-dl-gray' : 'text-dl-error';
                      const border = gr.status === 'PASS' || gr.status === 'ENFORCED' ? 'border-l-2 border-l-[#2D5F2D]' :
                        gr.status === 'WARNING' ? 'border-l-2 border-l-[#8B7355]' :
                        gr.status === 'LOADING' ? 'border-l-2 border-l-gray-300' : 'border-l-2 border-l-[#8B2500]';
                      return (
                        <div key={gr.id} className={`border border-dl-border p-3 ${border}`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs uppercase tracking-wider text-dl-navy">GR #{gr.id} — {gr.title}</p>
                            <span className={`text-xs font-dl-mono font-bold ${color}`}>{gr.status}</span>
                          </div>
                          <p className="text-xs text-dl-gray">{gr.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Fee Plumbing</SectionHeading>
                  <div className="border border-dl-border px-4 py-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Fee Recipient</p>
                        <p className={`font-dl-mono text-sm ${data.feePlumbing.eulerFeeRecipientSet ? 'text-dl-forest' : 'text-dl-error'}`}>
                          {data.feePlumbing.eulerFeeRecipientSet ? 'CONFIGURED' : 'NOT SET'}
                        </p>
                      </div>
                      <div>
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Revenue Router</p>
                        <p className={`font-dl-mono text-sm ${data.feePlumbing.revenueRouterConnected ? 'text-dl-forest' : 'text-dl-error'}`}>
                          {data.feePlumbing.revenueRouterConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                        </p>
                      </div>
                      <div>
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Overall</p>
                        <p className={`font-dl-mono text-sm ${data.feePlumbing.status === 'OPERATIONAL' ? 'text-dl-forest' : 'text-dl-gold'}`}>
                          {data.feePlumbing.status}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {pendingOutcomes.length > 0 && (
                  <div className="mb-8">
                    <SectionHeading>Pending Outcome Verification</SectionHeading>
                    <div className="border border-dl-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dl-border">
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Deal</th>
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Type</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingOutcomes.map((o: any) => (
                            <tr key={o.id} className="border-b border-dl-border last:border-0">
                              <td className="p-3 font-dl-mono text-xs text-dl-navy">{o.deal_name || o.deal_id?.slice(0, 8) + '…'}</td>
                              <td className="p-3 font-dl-mono text-xs text-dl-gray capitalize">{o.outcome_type || '—'}</td>
                              <td className="p-3 text-right font-dl-mono text-xs text-dl-gray">{formatUTC(o.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="mb-8">
                  <SectionHeading>Variance Tracking</SectionHeading>
                  <div className="flex gap-3 mb-4">
                    <button onClick={() => runCalibration(true)} disabled={calibrating}
                      className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-xs disabled:opacity-50">
                      {calibrating ? 'Running...' : 'Preview Calibration'}
                    </button>
                    <button onClick={() => runCalibration(false)} disabled={calibrating}
                      className="bg-dl-navy text-white px-4 py-2 font-dl-mono text-xs disabled:opacity-50">
                      {calibrating ? 'Applying...' : 'Apply Calibration'}
                    </button>
                  </div>
                  {calibrationError && <p className="font-dl-mono text-xs text-dl-error mb-4">{calibrationError}</p>}
                  {varianceLoading ? (
                    <p className="font-dl-mono text-sm text-dl-gray py-4">Loading variance data...</p>
                  ) : variances.length === 0 ? (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">No variance records yet.</p>
                      <p className="font-dl-mono text-xs text-dl-muted mt-1">Created when project outcomes are submitted with Cost Intelligence estimates on record.</p>
                    </div>
                  ) : (
                    <div className="border border-dl-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dl-border">
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Deal</th>
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Metric</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Predicted</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Actual</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Var %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variances.map((v: any) => (
                            <tr key={v.id} className="border-b border-dl-border last:border-0">
                              <td className="p-3 font-dl-mono text-xs text-dl-navy">{v.deal_name || v.deal_id?.slice(0, 8) + '…'}</td>
                              <td className="p-3 font-dl-mono text-xs text-dl-gray capitalize">{v.metric_key?.replace(/_/g, ' ')}</td>
                              <td className="p-3 text-right font-dl-mono text-xs">{Number(v.predicted_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-dl-mono text-xs text-dl-navy">{Number(v.actual_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                              <td className={`p-3 text-right font-dl-mono text-xs font-bold ${Number(v.variance_pct) > 15 ? 'text-dl-error' : Number(v.variance_pct) < -15 ? 'text-dl-forest' : 'text-dl-navy'}`}>
                                {Number(v.variance_pct) > 0 ? '+' : ''}{Number(v.variance_pct).toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
      </PageShell>
    </DesignLawLayout>
  );
}
