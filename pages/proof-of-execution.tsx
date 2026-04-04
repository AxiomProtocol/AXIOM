import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../components/design-law';
import type { OnChainTx } from './api/activity/on-chain-feed';

interface OpsEntry {
  week: number;
  phase: number;
  category: string;
  title: string;
  description: string;
  status: string;
  tx_hash: string | null;
  amount: string | null;
  created_at: string;
  protocol_change: boolean;
}

interface SolvencySnap {
  id: string;
  asOfUtc: string;
  checksum: string;
}

interface HashChainEntry {
  event_id: string;
  event_type: string;
  entity_type: string;
  hash: string;
  prev_hash: string | null;
  created_at: string;
}

interface VerifiedOutcome {
  status: string;
  verification_timestamp: string | null;
  arbitrum_outcome_hash: string | null;
  arbitrum_proof_ref: string | null;
  interpretation: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

interface RealAssetDeal {
  id: string;
  deal_name: string;
  strategy: string;
  status: string;
  target_purchase_price: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface FieldInspection {
  id: string;
  session_name: string;
  status: string;
  property_type: string | null;
  sampling_confidence_score: string | null;
  total_units: number | null;
  units_walked: number | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface SynOffering {
  id: string;
  name: string;
  status: string;
  offering_type: string;
  target_raise: string | null;
  minimum_investment: string | null;
  projected_irr: string | null;
  projected_cap_rate: string | null;
  hold_period_years: number | null;
  open_date: string | null;
  close_date: string | null;
  created_at: string;
}

interface CapSnapshot {
  id: string;
  as_of: string;
  checksum: string;
  regime_band: string | null;
  policy_state: string | null;
  confidence: string | null;
  created_at: string;
}

interface POEData {
  rails: {
    opsLog: OpsEntry[];
    solvencySnapshots: SolvencySnap[];
    hashChain: HashChainEntry[];
    verifiedOutcomes: VerifiedOutcome[];
    realAssets: RealAssetDeal[];
    fieldInspections: FieldInspection[];
    syndication: SynOffering[];
    capitalSnapshots: CapSnapshot[];
  };
  summary: {
    totalOpsEntries: number;
    totalSolvencySnapshots: number;
    totalHashChainEntries: number;
    totalVerifiedOutcomes: number;
    totalDeals: number;
    totalInspections: number;
    totalOfferings: number;
    totalCapSnapshots: number;
    latestSnapshotId: string | null;
    latestSnapshotTime: string | null;
    latestTreasury: number | null;
    latestCR: number | null;
    latestPolicyMode: string | null;
    categoryBreakdown: Record<string, number>;
    dealsByStrategy: Record<string, number>;
    dealsByStatus: Record<string, number>;
    latestCapSnapshot: {
      id: string;
      asOf: string;
      checksum: string;
      regimeBand: string | null;
      policyState: string | null;
      confidence: string | null;
    } | null;
  };
  generatedAt: string;
}

type RailKey = 'ops' | 'solvency' | 'chain' | 'outcomes' | 'assets' | 'inspections' | 'syndication' | 'onchain';

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtUSD(v: string | number | null | undefined) {
  if (v == null) return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'text-dl-forest border-dl-forest bg-green-50',
    failed: 'text-red-700 border-red-300 bg-red-50',
    pending: 'text-dl-gold border-dl-gold bg-yellow-50',
    under_review: 'text-dl-navy border-dl-navy bg-blue-50',
    underwriting: 'text-dl-navy border-dl-border bg-dl-bg-alt',
    draft: 'text-dl-gray border-dl-border bg-dl-bg-alt',
    in_progress: 'text-dl-gold border-dl-gold bg-yellow-50',
    planned: 'text-dl-gray border-dl-border bg-dl-bg-alt',
    approved: 'text-dl-forest border-dl-forest bg-green-50',
    rejected: 'text-red-700 border-red-300 bg-red-50',
  };
  const key = status?.toLowerCase().replace(/[- ]/g, '_');
  return (
    <span className={`font-dl-mono text-xs px-1.5 py-0.5 border ${styles[key] ?? 'bg-dl-bg-alt text-dl-gray border-dl-border'}`}>
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

const STRATEGY_LABELS: Record<string, string> = {
  flip: 'Fix & Flip',
  hold: 'Buy & Hold',
  brrrr: 'BRRRR',
  note: 'Note / Seller Finance',
  wholesale: 'Wholesale',
};

const CATEGORY_LABELS: Record<string, string> = {
  'capital-intelligence': 'Capital Intelligence',
  'PSM Stress Test': 'Peg Stability',
  'fee_plumbing': 'Protocol Plumbing',
  'on-chain': 'On-Chain',
  'real-assets': 'Real Assets',
  'community': 'Community',
  'compliance': 'Compliance',
};

export default function ProofOfExecutionPage() {
  const [data, setData] = useState<POEData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeRail, setActiveRail] = useState<RailKey>('ops');

  const [onChainTxs, setOnChainTxs] = useState<OnChainTx[]>([]);
  const [onChainLoading, setOnChainLoading] = useState(false);
  const [onChainError, setOnChainError] = useState('');
  const [onChainTypeCounts, setOnChainTypeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/proof-of-execution')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load execution record'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeRail !== 'onchain') return;
    if (onChainTxs.length > 0) return;
    setOnChainLoading(true);
    setOnChainError('');
    fetch('/api/activity/on-chain-feed')
      .then(r => r.json())
      .then(d => {
        if (d.error) setOnChainError(d.error);
        else {
          setOnChainTxs(d.transactions ?? []);
          setOnChainTypeCounts(d.typeCounts ?? {});
        }
      })
      .catch(() => setOnChainError('Failed to fetch on-chain activity'))
      .finally(() => setOnChainLoading(false));
  }, [activeRail]);

  const summary = data?.summary;
  const rails = data?.rails;

  const RAILS: { key: RailKey; label: string; count?: number }[] = [
    { key: 'onchain',      label: 'On-Chain Activity',    count: onChainTxs.length || undefined },
    { key: 'ops',          label: 'Operations Log',       count: summary?.totalOpsEntries },
    { key: 'assets',       label: 'Real Asset Pipeline',  count: summary?.totalDeals },
    { key: 'inspections',  label: 'Field Inspections',    count: summary?.totalInspections },
    { key: 'syndication',  label: 'Syndication',          count: summary?.totalOfferings },
    { key: 'solvency',     label: 'Treasury Snapshots',   count: summary?.totalSolvencySnapshots },
    { key: 'chain',        label: 'Hash Chain',           count: summary?.totalHashChainEntries },
    { key: 'outcomes',     label: 'Verified Outcomes',    count: summary?.totalVerifiedOutcomes },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Proof of Execution — Axiom Protocol</title>
        <meta name="description" content="Auditable capital deployment record — timestamped, multi-layer operations log across on-chain, real asset, and community rails." />
      </Head>

      <div className="mb-6">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">Operations / Governance</p>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-2">Proof of Execution</h1>
        <p className="text-sm text-dl-gray max-w-2xl">
          Auditable capital deployment record — timestamped, multi-layer operations log across on-chain,
          real asset, community, and syndication rails. Every entry is time-stamped, categorized, and cryptographically
          linked into a tamper-evident hash chain. Credibility is supported by evidence, not presentation.
        </p>
      </div>

      <div className="border border-dl-border bg-dl-bg-alt px-5 py-3 mb-8">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Trust Anchor</p>
        <p className="font-dl-mono text-xs text-dl-gray leading-relaxed">
          This record is an operational audit log — not performance proof, trading proof, yield evidence, or a return guarantee.
          It establishes a pre-deployment governance record for allocator due diligence. On-chain transaction references are
          verifiable on Arbiscan (Chain ID: 42161).
        </p>
      </div>

      {loading && (
        <div className="border border-dl-border p-8 text-center">
          <p className="font-dl-mono text-sm text-dl-gray">Loading execution record…</p>
        </div>
      )}

      {error && (
        <div className="border border-red-300 bg-red-50 p-4 mb-6">
          <p className="text-sm text-red-700 font-dl-mono">{error}</p>
        </div>
      )}

      {data && summary && (
        <>
          {/* ── 8-metric summary grid ─────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-4">
            {[
              { label: 'Operations Logged', value: summary.totalOpsEntries, sub: 'founder ops log' },
              { label: 'Real Asset Deals', value: summary.totalDeals, sub: 'acquisition pipeline' },
              { label: 'Field Inspections', value: summary.totalInspections, sub: 'physical walkthroughs' },
              { label: 'Syndication Offerings', value: summary.totalOfferings, sub: 'capital formation' },
            ].map((m, i) => (
              <div key={m.label} className={`px-4 py-4 bg-dl-bg-alt ${i < 3 ? 'border-r border-dl-border' : ''} border-b border-dl-border`}>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">{m.label}</p>
                <p className="font-dl-mono text-2xl font-bold text-dl-navy">{m.value}</p>
                <p className="font-dl-mono text-xs text-dl-gray mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-l border-r border-b border-dl-border mb-8">
            {[
              { label: 'Treasury Snapshots', value: summary.totalSolvencySnapshots, sub: 'solvency record' },
              { label: 'Hash Chain Entries', value: summary.totalHashChainEntries, sub: 'audit integrity' },
              { label: 'Verified Outcomes', value: summary.totalVerifiedOutcomes, sub: 'reviewed results' },
              { label: 'Cap Accounting Snaps', value: summary.totalCapSnapshots, sub: 'capital ledger' },
            ].map((m, i) => (
              <div key={m.label} className={`px-4 py-4 bg-dl-bg ${i < 3 ? 'border-r border-dl-border' : ''}`}>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">{m.label}</p>
                <p className="font-dl-mono text-2xl font-bold text-dl-navy">{m.value}</p>
                <p className="font-dl-mono text-xs text-dl-gray mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Context panels ────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border mb-8">
            {/* Treasury context */}
            <div className="px-5 py-4 border-r border-dl-border">
              <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-3">Latest Treasury Snapshot</p>
              {summary.latestSnapshotTime ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-dl-mono text-xs text-dl-gray">Snapshot ID</span>
                    <span className="font-dl-mono text-xs text-dl-navy">{summary.latestSnapshotId?.slice(0, 8)}…</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-dl-mono text-xs text-dl-gray">As Of</span>
                    <span className="font-dl-mono text-xs text-dl-navy">{fmtDate(summary.latestSnapshotTime)}</span>
                  </div>
                  {summary.latestTreasury !== null && (
                    <div className="flex justify-between">
                      <span className="font-dl-mono text-xs text-dl-gray">Treasury</span>
                      <span className="font-dl-mono text-xs text-dl-navy">{fmtUSD(summary.latestTreasury)}</span>
                    </div>
                  )}
                  {summary.latestPolicyMode && (
                    <div className="flex justify-between">
                      <span className="font-dl-mono text-xs text-dl-gray">Policy Mode</span>
                      <span className="font-dl-mono text-xs text-dl-navy">{summary.latestPolicyMode}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-dl-border">
                    <Link href="/solvency" className="text-xs text-dl-navy underline font-dl-mono">
                      Full solvency disclosure →
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="font-dl-mono text-xs text-dl-gray">No snapshot recorded.</p>
              )}
            </div>

            {/* Deal strategy breakdown */}
            <div className="px-5 py-4 border-r border-dl-border">
              <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-3">Real Asset — Strategy Mix</p>
              {Object.keys(summary.dealsByStrategy).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(summary.dealsByStrategy)
                    .sort(([, a], [, b]) => b - a)
                    .map(([strat, count]) => (
                      <div key={strat} className="flex justify-between items-center">
                        <span className="font-dl-mono text-xs text-dl-gray">
                          {STRATEGY_LABELS[strat] ?? strat.toUpperCase()}
                        </span>
                        <span className="font-dl-mono text-xs font-bold text-dl-navy">{count}</span>
                      </div>
                    ))}
                  <div className="pt-2 border-t border-dl-border">
                    {Object.entries(summary.dealsByStatus).map(([stat, count]) => (
                      <span key={stat} className="font-dl-mono text-xs text-dl-gray mr-3">
                        {stat}: <span className="text-dl-navy">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="font-dl-mono text-xs text-dl-gray">No deals recorded.</p>
              )}
            </div>

            {/* Capital accounting snapshot */}
            <div className="px-5 py-4">
              <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-3">Capital Accounting Ledger</p>
              {summary.latestCapSnapshot ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-dl-mono text-xs text-dl-gray">Snapshot ID</span>
                    <span className="font-dl-mono text-xs text-dl-navy">{summary.latestCapSnapshot.id.slice(0, 8)}…</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-dl-mono text-xs text-dl-gray">As Of</span>
                    <span className="font-dl-mono text-xs text-dl-navy">{fmtDate(summary.latestCapSnapshot.asOf)}</span>
                  </div>
                  {summary.latestCapSnapshot.policyState && (
                    <div className="flex justify-between">
                      <span className="font-dl-mono text-xs text-dl-gray">Policy State</span>
                      <span className="font-dl-mono text-xs text-dl-navy">{summary.latestCapSnapshot.policyState}</span>
                    </div>
                  )}
                  {summary.latestCapSnapshot.confidence && (
                    <div className="flex justify-between">
                      <span className="font-dl-mono text-xs text-dl-gray">Confidence</span>
                      <span className="font-dl-mono text-xs text-dl-navy">{summary.latestCapSnapshot.confidence}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-dl-border">
                    <p className="font-dl-mono text-xs text-dl-gray break-all">{summary.latestCapSnapshot.checksum.slice(0, 20)}…</p>
                  </div>
                </div>
              ) : (
                <p className="font-dl-mono text-xs text-dl-gray">No capital accounting snapshot recorded.</p>
              )}
            </div>
          </div>

          {/* ── Operations category breakdown ─────────────────────── */}
          {Object.keys(summary.categoryBreakdown).length > 0 && (
            <div className="mb-8">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-3">Operations by Category</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.categoryBreakdown).map(([cat, count]) => (
                  <div key={cat} className="border border-dl-border px-3 py-2 bg-dl-bg-alt">
                    <p className="text-xs text-dl-gray font-dl-mono">{CATEGORY_LABELS[cat] ?? cat}</p>
                    <p className="font-dl-mono text-sm font-bold text-dl-navy">{count} {count === 1 ? 'entry' : 'entries'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Rail tabs ─────────────────────────────────────────── */}
          <div className="flex border-b border-dl-border mb-6 overflow-x-auto">
            {RAILS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveRail(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
                  activeRail === tab.key
                    ? 'border-dl-navy text-dl-navy'
                    : 'border-transparent text-dl-gray hover:text-dl-navy'
                }`}
              >
                {tab.label}
                {tab.count != null && (
                  <span className="ml-1.5 font-dl-mono text-xs text-dl-gray">({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {/* ── On-Chain Activity ─────────────────────────────────── */}
          {activeRail === 'onchain' && (
            <>
              <div className="border border-dl-border bg-dl-bg-alt px-4 py-3 mb-4">
                <p className="font-dl-mono text-xs text-dl-gray">
                  Live protocol activity on Arbitrum One (chainId: 42161) — PSM mints and redeems, Euler vault deposits,
                  EulerSwap liquidity events, and AXUSD token transfers involving canonical protocol contracts.
                  Sourced directly from chain; up to 50 most recent events across monitored addresses.
                </p>
              </div>

              {onChainLoading && (
                <div className="border border-dl-border p-8 text-center">
                  <p className="font-dl-mono text-sm text-dl-gray">Fetching on-chain activity…</p>
                </div>
              )}

              {onChainError && (
                <div className="border border-red-300 bg-red-50 p-4">
                  <p className="font-dl-mono text-xs text-red-700">{onChainError}</p>
                </div>
              )}

              {!onChainLoading && !onChainError && onChainTxs.length === 0 && (
                <p className="font-dl-mono text-sm text-dl-gray py-8 text-center">No on-chain activity found for monitored addresses.</p>
              )}

              {!onChainLoading && onChainTxs.length > 0 && (
                <>
                  {Object.keys(onChainTypeCounts).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {Object.entries(onChainTypeCounts)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div key={type} className="border border-dl-border px-3 py-1.5 bg-dl-bg-alt">
                            <span className="font-dl-mono text-xs text-dl-gray">{type}</span>
                            <span className="font-dl-mono text-xs font-bold text-dl-navy ml-2">{count}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="border border-dl-border">
                    <div className="hidden md:grid grid-cols-12 bg-dl-navy px-4 py-2">
                      <p className="col-span-3 text-xs text-white uppercase tracking-widest font-dl-mono">Type</p>
                      <p className="col-span-2 text-xs text-white uppercase tracking-widest font-dl-mono">Asset</p>
                      <p className="col-span-2 text-xs text-white uppercase tracking-widest font-dl-mono">Amount</p>
                      <p className="col-span-2 text-xs text-white uppercase tracking-widest font-dl-mono">From</p>
                      <p className="col-span-2 text-xs text-white uppercase tracking-widest font-dl-mono">To</p>
                      <p className="col-span-1 text-xs text-white uppercase tracking-widest font-dl-mono">Block</p>
                    </div>
                    {onChainTxs.map((tx, i) => (
                      <div
                        key={`${tx.hash}-${i}`}
                        className={`px-4 py-3 border-b border-dl-border last:border-b-0 ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                      >
                        <div className="md:hidden space-y-1 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-dl-mono text-xs font-bold text-dl-navy border border-dl-border px-1.5 py-0.5">
                              {tx.type}
                            </span>
                            <span className="font-dl-mono text-xs text-dl-gray">{tx.asset}</span>
                            <span className="font-dl-mono text-xs text-dl-navy font-semibold">{tx.value}</span>
                          </div>
                          {tx.timestamp && (
                            <p className="font-dl-mono text-xs text-dl-gray">{fmtDate(tx.timestamp)}</p>
                          )}
                          <div className="flex gap-3 text-xs font-dl-mono text-dl-gray">
                            <span>From: {tx.from.slice(0, 8)}…</span>
                            <span>To: {tx.to.slice(0, 8)}…</span>
                          </div>
                          <a
                            href={tx.arbiscanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-dl-mono text-xs text-dl-navy underline block"
                          >
                            {tx.hash.slice(0, 14)}… →
                          </a>
                        </div>

                        <div className="hidden md:grid grid-cols-12 items-center gap-1">
                          <div className="col-span-3">
                            <a
                              href={tx.arbiscanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-dl-mono text-xs text-dl-navy underline"
                            >
                              {tx.type}
                            </a>
                            {tx.timestamp && (
                              <p className="font-dl-mono text-xs text-dl-gray mt-0.5">
                                {fmtDate(tx.timestamp)}
                              </p>
                            )}
                          </div>
                          <p className="col-span-2 font-dl-mono text-xs text-dl-gray uppercase">{tx.asset}</p>
                          <p className="col-span-2 font-dl-mono text-xs text-dl-navy font-semibold">{tx.value}</p>
                          <p className="col-span-2 font-dl-mono text-xs text-dl-gray">
                            {tx.from.slice(0, 6)}…{tx.from.slice(-4)}
                          </p>
                          <p className="col-span-2 font-dl-mono text-xs text-dl-gray">
                            {tx.to ? `${tx.to.slice(0, 6)}…${tx.to.slice(-4)}` : '—'}
                          </p>
                          <p className="col-span-1 font-dl-mono text-xs text-dl-gray">{tx.blockNum}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-dl-mono text-xs text-dl-gray">
                      Showing {onChainTxs.length} most recent events. Addresses monitored: PSM, Euler vaults, EulerSwap pools.
                    </p>
                    <a
                      href="https://arbiscan.io/address/0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-dl-mono text-xs text-dl-navy underline"
                    >
                      AXUSD on Arbiscan →
                    </a>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Operations Log ────────────────────────────────────── */}
          {activeRail === 'ops' && rails && (
            rails.opsLog.length === 0 ? (
              <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">No operations entries recorded.</p>
            ) : (
              <div className="border border-dl-border">
                {rails.opsLog.map((entry, i) => (
                  <div key={i} className={`p-4 ${i < rails.opsLog.length - 1 ? 'border-b border-dl-border' : ''} ${entry.protocol_change ? 'bg-blue-50' : 'bg-dl-bg'}`}>
                    <div className="flex flex-wrap items-start gap-2 mb-1">
                      <StatusBadge status={entry.status} />
                      <span className="font-dl-mono text-xs text-dl-gray">{CATEGORY_LABELS[entry.category] ?? entry.category}</span>
                      {entry.protocol_change && (
                        <span className="font-dl-mono text-xs text-blue-700 border border-blue-300 px-1.5 py-0.5">PROTOCOL CHANGE</span>
                      )}
                      <span className="ml-auto font-dl-mono text-xs text-dl-gray">{fmtDate(entry.created_at)}</span>
                    </div>
                    <p className="font-dl-serif text-sm text-dl-navy mb-1">{entry.title}</p>
                    {entry.description && (
                      <p className="text-xs text-dl-gray mb-2">{entry.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs font-dl-mono text-dl-gray">
                      {entry.amount && <span>Amount: {entry.amount}</span>}
                      {entry.tx_hash && (
                        <a
                          href={`https://arbiscan.io/tx/${entry.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-dl-navy underline"
                        >
                          TX: {entry.tx_hash.slice(0, 14)}…
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Real Asset Pipeline ───────────────────────────────── */}
          {activeRail === 'assets' && rails && (
            rails.realAssets.length === 0 ? (
              <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">No real asset deal entries recorded.</p>
            ) : (
              <>
                <div className="border border-dl-border bg-dl-bg-alt px-4 py-3 mb-4">
                  <p className="font-dl-mono text-xs text-dl-gray">
                    Real estate acquisition pipeline — underwriting activity across {summary.totalDeals} deal{summary.totalDeals !== 1 ? 's' : ''}.
                    Each entry represents an independently modeled scenario with timestamped evidence of analytical work performed.
                    Strategies: {Object.entries(summary.dealsByStrategy).map(([s, c]) => `${STRATEGY_LABELS[s] ?? s} (${c})`).join(' · ')}.
                  </p>
                </div>
                <div className="border border-dl-border">
                  <div className="grid grid-cols-12 bg-dl-bg-alt border-b border-dl-border px-4 py-2">
                    <p className="col-span-5 text-xs text-dl-gray font-dl-mono uppercase">Property / Deal</p>
                    <p className="col-span-2 text-xs text-dl-gray font-dl-mono uppercase">Strategy</p>
                    <p className="col-span-2 text-xs text-dl-gray font-dl-mono uppercase">Status</p>
                    <p className="col-span-2 text-xs text-dl-gray font-dl-mono uppercase">Target Price</p>
                    <p className="col-span-1 text-xs text-dl-gray font-dl-mono uppercase">Date</p>
                  </div>
                  {rails.realAssets.map((deal, i) => (
                    <div
                      key={deal.id}
                      className={`grid grid-cols-12 px-4 py-3 items-start ${i < rails.realAssets.length - 1 ? 'border-b border-dl-border' : ''}`}
                    >
                      <p className="col-span-5 font-dl-mono text-xs text-dl-navy break-words pr-2">{deal.deal_name}</p>
                      <p className="col-span-2 font-dl-mono text-xs text-dl-gray uppercase">
                        {STRATEGY_LABELS[deal.strategy] ?? deal.strategy}
                      </p>
                      <div className="col-span-2">
                        <StatusBadge status={deal.status} />
                      </div>
                      <p className="col-span-2 font-dl-mono text-xs text-dl-gray">
                        {deal.target_purchase_price ? fmtUSD(deal.target_purchase_price) : '—'}
                      </p>
                      <p className="col-span-1 font-dl-mono text-xs text-dl-gray">
                        {new Date(deal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )
          )}

          {/* ── Field Inspections ─────────────────────────────────── */}
          {activeRail === 'inspections' && rails && (
            rails.fieldInspections.length === 0 ? (
              <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">No field inspection sessions recorded.</p>
            ) : (
              <>
                <div className="border border-dl-border bg-dl-bg-alt px-4 py-3 mb-4">
                  <p className="font-dl-mono text-xs text-dl-gray">
                    Physical property inspection sessions — Layer 5 Field Capture system.
                    Each session represents a real-world walkthrough with structured condition assessment and sampling methodology.
                  </p>
                </div>
                <div className="border border-dl-border">
                  {rails.fieldInspections.map((insp, i) => (
                    <div
                      key={insp.id}
                      className={`p-4 ${i < rails.fieldInspections.length - 1 ? 'border-b border-dl-border' : ''}`}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <StatusBadge status={insp.status} />
                        {insp.property_type && (
                          <span className="font-dl-mono text-xs text-dl-gray uppercase">{insp.property_type}</span>
                        )}
                        <span className="ml-auto font-dl-mono text-xs text-dl-gray">{fmtDate(insp.created_at)}</span>
                      </div>
                      <p className="font-dl-serif text-sm text-dl-navy mb-2">{insp.session_name}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-dl-mono">
                        {insp.total_units != null && (
                          <div>
                            <p className="text-dl-gray">Total Units</p>
                            <p className="text-dl-navy font-semibold">{insp.total_units}</p>
                          </div>
                        )}
                        {insp.units_walked != null && (
                          <div>
                            <p className="text-dl-gray">Units Walked</p>
                            <p className="text-dl-navy font-semibold">{insp.units_walked}</p>
                          </div>
                        )}
                        {insp.sampling_confidence_score != null && (
                          <div>
                            <p className="text-dl-gray">Sampling Confidence</p>
                            <p className="text-dl-navy font-semibold">{Number(insp.sampling_confidence_score).toFixed(2)}</p>
                          </div>
                        )}
                        {insp.submitted_at && (
                          <div>
                            <p className="text-dl-gray">Submitted</p>
                            <p className="text-dl-navy">{fmtDate(insp.submitted_at)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}

          {/* ── Syndication Activity ──────────────────────────────── */}
          {activeRail === 'syndication' && rails && (
            rails.syndication.length === 0 ? (
              <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">No syndication offerings recorded.</p>
            ) : (
              <>
                <div className="border border-dl-border bg-dl-bg-alt px-4 py-3 mb-4">
                  <p className="font-dl-mono text-xs text-dl-gray">
                    Syndication module — capital formation activity. Each offering represents a structured
                    private capital raise under the Axiom Secondary Network. These are configuration records, not active raises.
                    SEC Reg D 506(c) compliance framework applies to all offerings.
                  </p>
                </div>
                <div className="border border-dl-border">
                  {rails.syndication.map((off, i) => (
                    <div
                      key={off.id}
                      className={`p-4 ${i < rails.syndication.length - 1 ? 'border-b border-dl-border' : ''}`}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <StatusBadge status={off.status} />
                        <span className="font-dl-mono text-xs text-dl-gray uppercase">{off.offering_type}</span>
                        <span className="ml-auto font-dl-mono text-xs text-dl-gray">{fmtDate(off.created_at)}</span>
                      </div>
                      <p className="font-dl-serif text-sm text-dl-navy mb-2">{off.name}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-dl-mono">
                        {off.target_raise && (
                          <div>
                            <p className="text-dl-gray">Target Raise</p>
                            <p className="text-dl-navy font-semibold">{fmtUSD(off.target_raise)}</p>
                          </div>
                        )}
                        {off.minimum_investment && (
                          <div>
                            <p className="text-dl-gray">Min. Investment</p>
                            <p className="text-dl-navy font-semibold">{fmtUSD(off.minimum_investment)}</p>
                          </div>
                        )}
                        {off.projected_irr && (
                          <div>
                            <p className="text-dl-gray">Projected IRR</p>
                            <p className="text-dl-navy font-semibold">{off.projected_irr}%</p>
                          </div>
                        )}
                        {off.hold_period_years && (
                          <div>
                            <p className="text-dl-gray">Hold Period</p>
                            <p className="text-dl-navy font-semibold">{off.hold_period_years} yrs</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}

          {/* ── Treasury Snapshots ────────────────────────────────── */}
          {activeRail === 'solvency' && rails && (
            rails.solvencySnapshots.length === 0 ? (
              <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">No snapshots recorded.</p>
            ) : (
              <div className="border border-dl-border">
                <div className="grid grid-cols-3 bg-dl-bg-alt border-b border-dl-border px-4 py-2">
                  <p className="text-xs text-dl-gray font-dl-mono uppercase">Snapshot ID</p>
                  <p className="text-xs text-dl-gray font-dl-mono uppercase">As Of (UTC)</p>
                  <p className="text-xs text-dl-gray font-dl-mono uppercase">Checksum</p>
                </div>
                {rails.solvencySnapshots.map((snap, i) => (
                  <div key={snap.id} className={`grid grid-cols-3 px-4 py-3 ${i < rails.solvencySnapshots.length - 1 ? 'border-b border-dl-border' : ''}`}>
                    <p className="font-dl-mono text-xs text-dl-navy">{snap.id.slice(0, 12)}…</p>
                    <p className="font-dl-mono text-xs text-dl-gray">{fmtDate(snap.asOfUtc)}</p>
                    <p className="font-dl-mono text-xs text-dl-gray">{snap.checksum.slice(0, 16)}…</p>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Hash Chain ────────────────────────────────────────── */}
          {activeRail === 'chain' && rails && (
            rails.hashChain.length === 0 ? (
              <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">No hash chain entries recorded.</p>
            ) : (
              <div className="border border-dl-border">
                {rails.hashChain.map((entry, i) => (
                  <div key={entry.event_id} className={`p-4 ${i < rails.hashChain.length - 1 ? 'border-b border-dl-border' : ''}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-dl-mono text-xs text-dl-forest border border-dl-forest px-1.5 py-0.5">{entry.event_type}</span>
                      <span className="font-dl-mono text-xs text-dl-gray">{entry.entity_type}</span>
                      <span className="ml-auto font-dl-mono text-xs text-dl-gray">{fmtDate(entry.created_at)}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-dl-mono text-xs text-dl-gray break-all">
                        Hash: <span className="text-dl-navy">{entry.hash}</span>
                      </p>
                      {entry.prev_hash && (
                        <p className="font-dl-mono text-xs text-dl-gray break-all">
                          Prev: <span className="text-dl-navy">{entry.prev_hash}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Verified Outcomes ─────────────────────────────────── */}
          {activeRail === 'outcomes' && rails && (
            rails.verifiedOutcomes.length === 0 ? (
              <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">No verified outcomes recorded.</p>
            ) : (
              <div className="border border-dl-border">
                {rails.verifiedOutcomes.map((outcome, i) => (
                  <div key={i} className={`p-4 ${i < rails.verifiedOutcomes.length - 1 ? 'border-b border-dl-border' : ''}`}>
                    <div className="flex items-start gap-3 mb-2">
                      <StatusBadge status={outcome.status} />
                      <span className="ml-auto font-dl-mono text-xs text-dl-gray">Submitted: {fmtDate(outcome.submitted_at)}</span>
                    </div>
                    {outcome.interpretation && (
                      <p className="text-xs text-dl-gray mb-2">{outcome.interpretation}</p>
                    )}
                    <div className="space-y-1 font-dl-mono text-xs text-dl-gray">
                      {outcome.arbitrum_outcome_hash && (
                        <p>On-chain hash: <span className="text-dl-navy">{outcome.arbitrum_outcome_hash.slice(0, 20)}…</span></p>
                      )}
                      {outcome.arbitrum_proof_ref && (
                        <p>Proof ref: <span className="text-dl-navy">{outcome.arbitrum_proof_ref.slice(0, 20)}…</span></p>
                      )}
                      {outcome.verification_timestamp && (
                        <p>Verified: <span className="text-dl-navy">{fmtDate(outcome.verification_timestamp)}</span></p>
                      )}
                      {outcome.reviewed_at && (
                        <p>Reviewed: <span className="text-dl-navy">{fmtDate(outcome.reviewed_at)}</span></p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Footer ────────────────────────────────────────────── */}
          <div className="mt-8 pt-6 border-t border-dl-border">
            <p className="font-dl-mono text-xs text-dl-gray">
              Record generated: {fmtDate(data.generatedAt)} — Operational audit log, not a performance disclosure.
              On-chain references are verifiable on Arbitrum One (chainId: 42161).
            </p>
            <div className="flex flex-wrap gap-4 mt-2">
              <Link href="/solvency" className="text-xs text-dl-navy underline font-dl-mono">Solvency Console</Link>
              <Link href="/disclosure" className="text-xs text-dl-navy underline font-dl-mono">Institutional Disclosure</Link>
              <Link href="/founder-ops" className="text-xs text-dl-navy underline font-dl-mono">Founder Operations</Link>
              <Link href="/mirdt" className="text-xs text-dl-navy underline font-dl-mono">Capital Intelligence Terminal</Link>
              <Link href="/syndication" className="text-xs text-dl-navy underline font-dl-mono">Syndication Module</Link>
            </div>
          </div>
        </>
      )}
    </DesignLawLayout>
  );
}
