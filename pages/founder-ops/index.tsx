import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  DesignLawLayout,
  PageShell,
  SectionHeading,
  DataTable,
  StatusBadge,
  SolidButton,
} from '../../components/design-law';
import type { Column } from '../../components/design-law';

interface SentinelData {
  regime: string;
  regimeConfidence: number;
  systemStance: string;
  totalSignals: number;
  qualifiedSignals: number;
  approvedDecisions: number;
  deniedDecisions: number;
}

interface EulerData {
  deposited: string;
  utilization: string;
  supplyAPY: string;
  borrowAPY: string;
  feeRecipientConfigured: boolean;
  revenueRouterSet: boolean;
  feeRoutingStatus: string;
  interestFeePercent: string;
}

interface FeePlumbing {
  eulerFeeRecipientSet: boolean;
  revenueRouterConnected: boolean;
  feeRoutingStatus: string;
  status: string;
}

interface OverviewData {
  timestamp: string;
  sentinel: SentinelData;
  euler: EulerData;
  axusd: { totalSupply: string };
  lendingFund: { tvl: string; sharePrice: string; activeLoans: number };
  dex: { tvl: string; volume24h: string };
  treasury: { total: string; currentExposure: string };
  nodes: { total: number; active: number };
  feePlumbing: FeePlumbing;
  contracts: Record<string, string>;
}

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

function formatUTC(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function truncateAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr || '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const ALLOCATION_TABLE = [
  { bucket: 'AXUSD (via PSM)', amount: '$40', purpose: 'Euler Vault + Lending Vault deposits' },
  { bucket: 'AXM (via Camelot)', amount: '$25', purpose: 'SEED lock — governance + revenue share' },
  { bucket: 'USDC Buffer', amount: '$20', purpose: 'Gas costs + operating reserve' },
  { bucket: 'Node/Infrastructure', amount: '$15', purpose: 'DePIN node rewards accumulation' },
];

const CHECKPOINTS = [
  { week: 4, gate: 'PSM and vault deposits must complete full cycle without contract errors' },
  { week: 8, gate: 'All Phase 1 products must complete full lifecycle before Phase 2' },
  { week: 12, gate: 'Revenue Router must have distributed at least once' },
  { week: 20, gate: 'Expansion gate must return actionable pass/fail result' },
  { week: 28, gate: 'Land acquisition and crowdfunding must complete full test cycles' },
  { week: 36, gate: 'Governance timelock must be proven with at least 3 queued actions' },
  { week: 40, gate: 'Full treasury audit before any real property commitment' },
  { week: 44, gate: 'HARD PAUSE: If no qualifying property found, Phase 4 pauses — capital compounds' },
  { week: 52, gate: 'Complete documentation review before any public release' },
];

const FOOTER_DISCLOSURE =
  'INTERNAL USE ONLY: This dashboard is for founder operational validation. All data reflects ' +
  'real on-chain state on Arbitrum One. Self-borrow tests are tagged as non-representative. ' +
  'Sentinel is advisory only until post-public governance vote. No investment advice provided.';

export default function FounderOpsPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'allocation' | 'checkpoints' | 'log'>('overview');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/founder-ops/overview').then(r => r.json()),
      fetch('/api/founder-ops/log').then(r => r.json()),
    ])
      .then(([overviewRes, logRes]) => {
        if (overviewRes.success) setData(overviewRes.data);
        else setError(overviewRes.error || 'Failed to load overview');
        if (logRes.success) setLogs(logRes.entries || []);
      })
      .catch(() => setError('Failed to connect to server'))
      .finally(() => setLoading(false));
  }, []);

  const logColumns: Column<LogEntry>[] = [
    {
      key: 'week',
      header: 'Wk',
      render: (e) => <span className="font-dl-mono text-dl-navy">{e.week}</span>,
    },
    {
      key: 'phase',
      header: 'Ph',
      render: (e) => <span className="font-dl-mono text-dl-gray">{e.phase}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (e) => {
        const color = e.category === 'failure' ? 'text-dl-error' : e.category === 'fix' ? 'text-dl-forest' : 'text-dl-navy';
        return <span className={`text-xs uppercase tracking-wider ${color}`}>{e.category}</span>;
      },
    },
    {
      key: 'title',
      header: 'Title',
      render: (e) => <span className="font-medium text-dl-navy">{e.title}</span>,
    },
    {
      key: 'product',
      header: 'Product',
      render: (e) => <span className="text-dl-gray text-xs">{e.product || '—'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right' as const,
      render: (e) => <span className="font-dl-mono">{e.amount ? `$${parseFloat(e.amount).toFixed(2)}` : '—'}</span>,
    },
    {
      key: 'tx_hash',
      header: 'Tx',
      render: (e) => e.tx_hash ? (
        <a href={`https://arbitrum.blockscout.com/tx/${e.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline font-dl-mono text-xs">
          {truncateAddr(e.tx_hash)}
        </a>
      ) : <span className="text-dl-gray">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <StatusBadge status={e.status === 'completed' ? 'ACTIVE' : e.status === 'failure' ? 'EXPIRED' : 'PENDING'} />,
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (e) => <span className="font-dl-mono text-xs text-dl-gray">{formatUTC(e.created_at)}</span>,
    },
  ];

  const tabs = [
    { id: 'overview' as const, label: 'System Overview' },
    { id: 'allocation' as const, label: 'Capital Allocation' },
    { id: 'checkpoints' as const, label: 'Risk Checkpoints' },
    { id: 'log' as const, label: 'Operations Log' },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Founder Operations | Axiom Protocol</title>
        <meta name="description" content="Internal founder operations dashboard for Axiom Protocol proof-of-concept validation" />
      </Head>

      <PageShell
        title="Founder Operations Dashboard"
        subtitle="Internal proof-of-concept validation. $100/week operational playbook. All data is live on-chain state."
        disclosure={FOOTER_DISCLOSURE}
      >
        <div className="mb-6">
          <a href="/founder-ops/playbook" className="inline-block font-dl-mono text-sm text-dl-navy border border-dl-border px-4 py-2 hover:underline">
            View Operational Playbook v2.1
          </a>
        </div>
        {loading ? (
          <p className="text-sm text-dl-gray py-12 text-center">Loading operational data...</p>
        ) : error ? (
          <p className="text-sm text-dl-error py-12 text-center">{error}</p>
        ) : (
          <>
            <div className="flex gap-0 border-b border-dl-border mb-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm border-b-2 -mb-px transition-none ${
                    activeTab === tab.id
                      ? 'border-dl-navy text-dl-navy font-medium'
                      : 'border-transparent text-dl-gray hover:text-dl-navy'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && data && (
              <>
                <div className="mb-8">
                  <SectionHeading>Sentinel Intelligence</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">MARKET REGIME</p>
                      <p className={`font-dl-heading text-xl ${REGIME_COLORS[data.sentinel.regime] || 'text-dl-navy'}`}>
                        {data.sentinel.regime}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">{data.sentinel.regimeConfidence}% confidence</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">SYSTEM STANCE</p>
                      <p className={`font-dl-heading text-xl ${STANCE_COLORS[data.sentinel.systemStance] || 'text-dl-navy'}`}>
                        {data.sentinel.systemStance}
                      </p>
                      <p className="text-xs text-dl-gray mt-1">Advisory only — no auto-execution</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">SIGNALS</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {data.sentinel.qualifiedSignals} <span className="text-sm text-dl-gray">/ {data.sentinel.totalSignals}</span>
                      </p>
                      <p className="text-xs text-dl-gray mt-1">qualified / total</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">DECISIONS</p>
                      <p className="font-dl-heading text-xl">
                        <span className="text-dl-forest">{data.sentinel.approvedDecisions}</span>
                        {' / '}
                        <span className="text-dl-error">{data.sentinel.deniedDecisions}</span>
                      </p>
                      <p className="text-xs text-dl-gray mt-1">approved / denied</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Treasury + Vault Positions</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">EULER VAULT</p>
                      <p className="font-dl-heading text-xl text-dl-navy">${data.euler.deposited}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">
                        {data.euler.utilization}% util | {data.euler.supplyAPY}% APY
                      </p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">LENDING FUND</p>
                      <p className="font-dl-heading text-xl text-dl-navy">${data.lendingFund.tvl}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">
                        Share: ${data.lendingFund.sharePrice} | Loans: {data.lendingFund.activeLoans}
                      </p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">AXUSD SUPPLY</p>
                      <p className="font-dl-heading text-xl text-dl-navy">{parseFloat(data.axusd.totalSupply).toLocaleString()}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">GENIUS Act compliant</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">TREASURY</p>
                      <p className="font-dl-heading text-xl text-dl-navy">{data.treasury.total}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Exposure: {data.treasury.currentExposure}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Market Infrastructure</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">DEX (CAMELOT)</p>
                      <p className="font-dl-heading text-lg text-dl-navy">TVL: ${data.dex.tvl}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">24h Vol: ${data.dex.volume24h}</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">DePIN NODES</p>
                      <p className="font-dl-heading text-lg text-dl-navy">{data.nodes.total} total</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">{data.nodes.active} active</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">EULER FEE CONFIG</p>
                      <p className="font-dl-heading text-lg text-dl-navy">{data.euler.interestFeePercent}%</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">interest fee rate</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Fee Plumbing Status</SectionHeading>
                  <div className="border border-dl-border p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">FEE RECIPIENT</p>
                        <p className={`font-dl-mono text-sm ${data.feePlumbing.eulerFeeRecipientSet ? 'text-dl-forest' : 'text-dl-error'}`}>
                          {data.feePlumbing.eulerFeeRecipientSet ? 'CONFIGURED' : 'NOT SET'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">REVENUE ROUTER</p>
                        <p className={`font-dl-mono text-sm ${data.feePlumbing.revenueRouterConnected ? 'text-dl-forest' : 'text-dl-error'}`}>
                          {data.feePlumbing.revenueRouterConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">OVERALL STATUS</p>
                        <p className={`font-dl-mono text-sm ${data.feePlumbing.status === 'OPERATIONAL' ? 'text-dl-forest' : 'text-dl-error'}`}>
                          {data.feePlumbing.status}
                        </p>
                      </div>
                    </div>
                    {data.feePlumbing.status !== 'OPERATIONAL' && (
                      <div className="mt-4 border-t border-dl-border pt-3">
                        <p className="text-xs text-dl-error">
                          ACTION REQUIRED: Fee plumbing is not fully wired. Before calling setFeeReceiver(), verify that vault fees are non-zero
                          and borrow interest exists. If fees are zero, you will falsely validate the plumbing. Check vault fee params and
                          historical interest accrual first.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Mandatory Guard Rails</SectionHeading>
                  <div className="space-y-3">
                    <div className="border border-dl-border p-3">
                      <p className="text-xs uppercase tracking-wider text-dl-error mb-1">FIX #1 — FEE RECIPIENT ASSUMPTION</p>
                      <p className="text-xs text-dl-gray">Before setFeeReceiver(): confirm fees non-zero, borrow interest exists, vault fee config enabled. Zero fees = false validation.</p>
                    </div>
                    <div className="border border-dl-border p-3">
                      <p className="text-xs uppercase tracking-wider text-dl-error mb-1">FIX #2 — REVENUE ROUTER VISIBILITY</p>
                      <p className="text-xs text-dl-gray">Router must emit events on receipt. Verify explicit balance read method. Distribution math must be deterministic. Silent balances = lost audit clarity.</p>
                    </div>
                    <div className="border border-dl-border p-3">
                      <p className="text-xs uppercase tracking-wider text-dl-error mb-1">FIX #3 — ERC4626 SHARE MATH</p>
                      <p className="text-xs text-dl-gray">Assert minSharesOut &gt; 0 on first deposit. Guard against first-depositor rounding, dust minting, fee-on-transfer assumptions.</p>
                    </div>
                    <div className="border border-dl-border p-3">
                      <p className="text-xs uppercase tracking-wider text-dl-error mb-1">FIX #4 — SELF-BORROW CONTAMINATION</p>
                      <p className="text-xs text-dl-gray">All self-borrow tests tagged: &quot;Founder Loopback Test — Non-Representative Yield.&quot; Never mix with public metrics.</p>
                    </div>
                    <div className="border border-dl-border p-3">
                      <p className="text-xs uppercase tracking-wider text-dl-error mb-1">FIX #5 — SENTINEL AUTHORITY BOUNDARY</p>
                      <p className="text-xs text-dl-gray">Sentinel is ADVISORY ONLY until post-public governance vote. Must never auto-execute capital movement in this phase.</p>
                    </div>
                    <div className="border border-dl-border p-3">
                      <p className="text-xs uppercase tracking-wider text-dl-error mb-1">FIX #6 — PROPERTY PHASE TIMING</p>
                      <p className="text-xs text-dl-gray">Hard rule: If no qualifying property by Week 44, Phase 4 pauses. Capital continues compounding. No forced deals.</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'allocation' && (
              <>
                <SectionHeading>Weekly $100 Capital Allocation</SectionHeading>
                <div className="border border-dl-border mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dl-border">
                        <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Bucket</th>
                        <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Amount</th>
                        <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ALLOCATION_TABLE.map((row, i) => (
                        <tr key={i} className="border-b border-dl-border last:border-0">
                          <td className="p-3 font-medium text-dl-navy">{row.bucket}</td>
                          <td className="p-3 text-right font-dl-mono text-dl-navy">{row.amount}</td>
                          <td className="p-3 text-dl-gray">{row.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <SectionHeading>Sentinel Regime Adjustments</SectionHeading>
                <div className="border border-dl-border mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dl-border">
                        <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Regime</th>
                        <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">AXM</th>
                        <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Buffer</th>
                        <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-dl-border">
                        <td className="p-3 text-dl-forest font-medium">RISK_ON</td>
                        <td className="p-3 text-right font-dl-mono">$35</td>
                        <td className="p-3 text-right font-dl-mono">$10</td>
                        <td className="p-3 text-dl-gray">Increase AXM accumulation during favorable regime</td>
                      </tr>
                      <tr className="border-b border-dl-border">
                        <td className="p-3 text-dl-navy font-medium">NEUTRAL / DEFENSIVE</td>
                        <td className="p-3 text-right font-dl-mono">$25</td>
                        <td className="p-3 text-right font-dl-mono">$20</td>
                        <td className="p-3 text-dl-gray">Standard allocation</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-dl-error font-medium">HALTED</td>
                        <td className="p-3 text-right font-dl-mono">$15</td>
                        <td className="p-3 text-right font-dl-mono">$30</td>
                        <td className="p-3 text-dl-gray">Reduce exposure, increase cash buffer</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {data && (
                  <div className="border border-dl-border p-4">
                    <p className="text-xs uppercase tracking-wider text-dl-gray mb-2">CURRENT RECOMMENDED ALLOCATION</p>
                    <p className={`font-dl-heading text-lg ${STANCE_COLORS[data.sentinel.systemStance] || 'text-dl-navy'}`}>
                      Sentinel Stance: {data.sentinel.systemStance}
                    </p>
                    <p className="text-sm text-dl-gray mt-1">
                      {data.sentinel.systemStance === 'HALTED'
                        ? 'Reduce AXM to $15/week. Increase USDC buffer to $30/week. Capital preservation mode.'
                        : data.sentinel.systemStance === 'RISK_ON'
                        ? 'Increase AXM to $35/week. Reduce buffer to $10/week. Accumulation mode.'
                        : 'Standard allocation: $25 AXM, $20 buffer. Steady execution.'}
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'checkpoints' && (
              <>
                <SectionHeading>Risk Checkpoints</SectionHeading>
                <p className="text-sm text-dl-gray mb-6">
                  If any checkpoint fails, do not proceed to next phase. Fix, re-test, document the fix.
                </p>
                <div className="border border-dl-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dl-border">
                        <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray w-20">Week</th>
                        <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Gate Requirement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CHECKPOINTS.map((cp, i) => (
                        <tr key={i} className={`border-b border-dl-border last:border-0 ${cp.week === 44 ? 'bg-red-50' : ''}`}>
                          <td className={`p-3 font-dl-mono font-medium ${cp.week === 44 ? 'text-dl-error' : 'text-dl-navy'}`}>
                            Wk {cp.week}
                          </td>
                          <td className={`p-3 ${cp.week === 44 ? 'text-dl-error' : 'text-dl-gray'}`}>
                            {cp.gate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8">
                  <SectionHeading>52-Week Financial Projection</SectionHeading>
                  <div className="border border-dl-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-dl-border">
                          <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Week</th>
                          <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Invested</th>
                          <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Revenue (est)</th>
                          <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Total Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { week: 8, invested: '$800', revenue: '$10', total: '$810' },
                          { week: 16, invested: '$1,600', revenue: '$40', total: '$1,640' },
                          { week: 24, invested: '$2,400', revenue: '$100', total: '$2,500' },
                          { week: 32, invested: '$3,200', revenue: '$200', total: '$3,400' },
                          { week: 40, invested: '$4,000', revenue: '$350', total: '$4,350' },
                          { week: 48, invested: '$4,800', revenue: '$550', total: '$5,350' },
                          { week: 52, invested: '$5,200', revenue: '$700', total: '$5,900' },
                        ].map((row, i) => (
                          <tr key={i} className="border-b border-dl-border last:border-0">
                            <td className="p-3 font-dl-mono text-dl-navy">{row.week}</td>
                            <td className="p-3 text-right font-dl-mono text-dl-navy">{row.invested}</td>
                            <td className="p-3 text-right font-dl-mono text-dl-forest">{row.revenue}</td>
                            <td className="p-3 text-right font-dl-mono font-medium text-dl-navy">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'log' && (
              <>
                <SectionHeading>Operations Log</SectionHeading>
                <p className="text-sm text-dl-gray mb-4">
                  Every action, failure, and fix documented with on-chain evidence. Failures increase credibility when documented.
                </p>
                <DataTable
                  columns={logColumns}
                  data={logs}
                  keyExtractor={(e) => e.id}
                  emptyMessage="No operations logged yet. Log your first action via POST /api/founder-ops/log"
                />
              </>
            )}
          </>
        )}
      </PageShell>
    </DesignLawLayout>
  );
}
