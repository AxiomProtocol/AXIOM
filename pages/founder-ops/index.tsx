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
  authorityMode?: string;
  guardRail5?: { status: string; rule: string };
}

interface GuardRailStatus {
  id: number;
  title: string;
  status: 'PASS' | 'ENFORCED' | 'WARNING' | 'UNKNOWN' | 'LOADING';
  detail: string;
  source: string;
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
  const [guardRails, setGuardRails] = useState<GuardRailStatus[]>([
    { id: 1, title: 'Fee Recipient Assumption Check', status: 'LOADING', detail: 'Checking...', source: '/api/founder-ops/fee-plumbing-preflight' },
    { id: 2, title: 'Revenue Router Accounting Visibility', status: 'LOADING', detail: 'Checking...', source: '/api/founder-ops/overview' },
    { id: 3, title: 'ERC4626 Share Math Edge Case', status: 'LOADING', detail: 'Checking...', source: '/api/euler/vault-stats' },
    { id: 4, title: 'Self-Borrow Risk Contamination', status: 'ENFORCED', detail: 'POST /api/founder-ops/log rejects untagged self-borrow entries', source: 'Code enforcement' },
    { id: 5, title: 'Sentinel Authority Boundary', status: 'LOADING', detail: 'Checking...', source: '/api/sentinel/overview' },
    { id: 6, title: 'Property Phase Timing Risk', status: 'ENFORCED', detail: 'POST /api/founder-ops/log blocks Week 44+ property ops without qualifying property or HARD PAUSE', source: 'Code enforcement' },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'allocation' | 'checkpoints' | 'log' | 'outcomes'>('overview');
  const [pendingOutcomes, setPendingOutcomes] = useState<any[]>([]);
  const [outcomesLoading, setOutcomesLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/founder-ops/overview').then(r => r.json()),
      fetch('/api/founder-ops/log').then(r => r.json()),
      fetch('/api/founder-ops/fee-plumbing-preflight').then(r => r.json()).catch(() => null),
      fetch('/api/euler/vault-stats').then(r => r.json()).catch(() => null),
      fetch('/api/sentinel/overview').then(r => r.json()).catch(() => null),
      fetch('/api/founder-ops/pending-outcomes').then(r => r.ok ? r.json() : { outcomes: [], count: 0 }).catch(() => ({ outcomes: [], count: 0 })),
    ])
      .then(([overviewRes, logRes, preflightRes, vaultRes, sentinelRes, pendingRes]) => {
        if (overviewRes.success) setData(overviewRes.data);
        else setError(overviewRes.error || 'Failed to load overview');
        if (logRes.success) setLogs(logRes.entries || []);
        setPendingOutcomes(pendingRes.outcomes || []);

        setGuardRails(prev => {
          const updated = [...prev];

          if (preflightRes?.data?.guardRails) {
            const gr1 = preflightRes.data.guardRails.find((g: any) => g.name?.includes('Fee Recipient') || g.name?.includes('GR1'));
            const gr2 = preflightRes.data.guardRails.find((g: any) => g.name?.includes('Revenue Router') || g.name?.includes('GR2'));
            if (gr1) {
              updated[0] = { ...updated[0], status: gr1.status === 'PASS' ? 'PASS' : 'WARNING', detail: gr1.details?.finding || gr1.status };
            }
            if (gr2) {
              updated[1] = { ...updated[1], status: gr2.status === 'PASS' ? 'PASS' : 'WARNING', detail: gr2.details?.finding || gr2.status };
            }
          } else {
            if (overviewRes.data?.feePlumbing) {
              const fp = overviewRes.data.feePlumbing;
              updated[0] = { ...updated[0], status: fp.eulerFeeRecipientSet ? 'PASS' : 'WARNING', detail: fp.eulerFeeRecipientSet ? 'Fee recipient configured' : 'Fee recipient NOT set' };
              updated[1] = { ...updated[1], status: fp.revenueRouterConnected ? 'PASS' : 'WARNING', detail: fp.revenueRouterConnected ? 'Revenue router connected' : 'Revenue router NOT connected' };
            }
          }

          if (vaultRes?.guardRail3) {
            const gr3 = vaultRes.guardRail3;
            const gr3Status = gr3.status === 'PASS' ? 'PASS' : gr3.status === 'WARNING' ? 'WARNING' : gr3.status === 'NO_DEPOSITS' ? 'PASS' : 'UNKNOWN';
            updated[2] = { ...updated[2], status: gr3Status as GuardRailStatus['status'], detail: gr3.detail || `Share price: ${gr3.sharePrice}` };
          }

          if (sentinelRes?.guardRail5) {
            const gr5 = sentinelRes.guardRail5;
            const gr5Status = gr5.status === 'ENFORCED' ? 'ENFORCED' : gr5.status === 'PASS' ? 'PASS' : 'WARNING';
            updated[4] = { ...updated[4], status: gr5Status as GuardRailStatus['status'], detail: gr5.rule || `Authority mode: ${sentinelRes.authorityMode}` };
          } else if (sentinelRes?.authorityMode === 'ADVISORY') {
            updated[4] = { ...updated[4], status: 'ENFORCED', detail: 'Sentinel is ADVISORY ONLY until post-public governance vote' };
          }

          return updated;
        });
      })
      .catch(() => setError('Failed to connect to server'))
      .finally(() => setLoading(false));
  }, []);

  const loadPendingOutcomes = async () => {
    setOutcomesLoading(true);
    try {
      const res = await fetch('/api/founder-ops/pending-outcomes');
      if (res.ok) {
        const json = await res.json();
        setPendingOutcomes(json.outcomes || []);
      }
    } catch {
    } finally {
      setOutcomesLoading(false);
    }
  };

  const handleReview = async (id: string, decision: 'approved' | 'rejected') => {
    setReviewingId(id);
    try {
      await fetch(`/api/verified-outcomes/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: reviewNotes[id] || '' }),
      });
      await loadPendingOutcomes();
    } catch {
    } finally {
      setReviewingId(null);
    }
  };

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
    { id: 'outcomes' as const, label: `Outcomes${pendingOutcomes.length > 0 ? ` (${pendingOutcomes.length})` : ''}` },
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
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'outcomes') loadPendingOutcomes();
                  }}
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
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Designed to align with GENIUS Act</p>
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
                    {guardRails.map((gr) => {
                      const statusColor =
                        gr.status === 'PASS' ? 'text-dl-forest' :
                        gr.status === 'ENFORCED' ? 'text-dl-forest' :
                        gr.status === 'WARNING' ? 'text-dl-gold' :
                        gr.status === 'LOADING' ? 'text-dl-gray' :
                        'text-dl-error';
                      const statusBg =
                        gr.status === 'PASS' || gr.status === 'ENFORCED' ? 'border-l-2 border-l-[#2D5F2D]' :
                        gr.status === 'WARNING' ? 'border-l-2 border-l-[#8B7355]' :
                        gr.status === 'LOADING' ? 'border-l-2 border-l-gray-300' :
                        'border-l-2 border-l-[#8B2500]';
                      return (
                        <div key={gr.id} className={`border border-dl-border p-3 ${statusBg}`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs uppercase tracking-wider text-dl-navy">GR #{gr.id} — {gr.title}</p>
                            <span className={`text-xs font-dl-mono font-bold ${statusColor}`}>{gr.status}</span>
                          </div>
                          <p className="text-xs text-dl-gray">{gr.detail}</p>
                          <p className="text-[10px] font-dl-mono text-dl-gray mt-1">Source: {gr.source}</p>
                        </div>
                      );
                    })}
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

            {activeTab === 'outcomes' && (
              <>
                <SectionHeading>Outcome Verification Queue</SectionHeading>
                <p className="text-sm text-dl-gray mb-6">
                  Deal outcomes submitted for verification review. Approve to confirm the record and mark rewards eligible. Reject to return for correction.
                </p>
                {outcomesLoading ? (
                  <p className="font-dl-mono text-sm text-dl-gray text-center py-8">Loading pending outcomes...</p>
                ) : pendingOutcomes.length === 0 ? (
                  <div className="border border-dl-border p-8 text-center">
                    <p className="font-dl-mono text-sm text-dl-muted">No outcomes pending review.</p>
                    <p className="font-dl-mono text-xs text-dl-muted mt-1">
                      Outcomes appear here after operators submit and request verification from the deal workspace.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingOutcomes.map((outcome: any) => (
                      <div key={outcome.id} className="border border-dl-border p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="font-dl-serif text-base text-dl-navy">{outcome.deal_name || 'Deal'}</p>
                            <p className="font-dl-mono text-xs text-dl-muted mt-0.5">
                              ID: {outcome.id.slice(0, 8)}… · Submitted: {new Date(outcome.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          <span className="font-dl-mono text-xs text-dl-navy border border-dl-navy px-2 py-0.5">UNDER REVIEW</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div>
                            <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-0.5">Rehab Cost</p>
                            <p className="font-dl-mono text-sm text-dl-navy">
                              ${Number(outcome.actual_rehab_cost).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-0.5">Timeline</p>
                            <p className="font-dl-mono text-sm text-dl-navy">{outcome.actual_timeline_days} days</p>
                          </div>
                          {outcome.actual_sale_price && (
                            <div>
                              <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-0.5">Sale Price</p>
                              <p className="font-dl-mono text-sm text-dl-navy">
                                ${Number(outcome.actual_sale_price).toLocaleString()}
                              </p>
                            </div>
                          )}
                          {outcome.actual_monthly_cash_flow && (
                            <div>
                              <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-0.5">Cash Flow/mo</p>
                              <p className="font-dl-mono text-sm text-dl-navy">
                                ${Number(outcome.actual_monthly_cash_flow).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {outcome.variances && outcome.variances.length > 0 && (
                          <div className="border border-dl-border mb-4 overflow-x-auto">
                            <table className="w-full font-dl-mono text-xs">
                              <thead>
                                <tr className="border-b border-dl-border">
                                  <th className="text-left p-2 text-dl-muted uppercase">Metric</th>
                                  <th className="text-right p-2 text-dl-muted uppercase">Predicted</th>
                                  <th className="text-right p-2 text-dl-muted uppercase">Actual</th>
                                  <th className="text-right p-2 text-dl-muted uppercase">Var %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {outcome.variances.slice(0, 4).map((v: any) => (
                                  <tr key={v.metric_key} className="border-b border-dl-border last:border-0">
                                    <td className="p-2 text-dl-navy capitalize">{v.metric_key.replace(/_/g, ' ')}</td>
                                    <td className="p-2 text-right text-dl-muted">{Number(v.predicted_value).toFixed(2)}</td>
                                    <td className="p-2 text-right text-dl-navy">{Number(v.actual_value).toFixed(2)}</td>
                                    <td className={`p-2 text-right font-bold ${Number(v.variance_pct) > 10 ? 'text-dl-error' : Number(v.variance_pct) < -10 ? 'text-dl-forest' : 'text-dl-navy'}`}>
                                      {Number(v.variance_pct) > 0 ? '+' : ''}{Number(v.variance_pct).toFixed(2)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="mb-3">
                          <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Review Notes</label>
                          <input
                            type="text"
                            value={reviewNotes[outcome.id] || ''}
                            onChange={e => setReviewNotes(prev => ({ ...prev, [outcome.id]: e.target.value }))}
                            placeholder="Optional notes for the record..."
                            className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm text-dl-text bg-white focus:outline-none"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReview(outcome.id, 'approved')}
                            disabled={reviewingId === outcome.id}
                            className="bg-dl-forest text-white px-5 py-2 font-dl-mono text-sm disabled:opacity-50"
                          >
                            {reviewingId === outcome.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReview(outcome.id, 'rejected')}
                            disabled={reviewingId === outcome.id}
                            className="border border-dl-error text-dl-error px-5 py-2 font-dl-mono text-sm disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </PageShell>
    </DesignLawLayout>
  );
}
