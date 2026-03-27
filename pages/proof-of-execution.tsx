import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

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

interface POEData {
  rails: {
    opsLog: OpsEntry[];
    solvencySnapshots: SolvencySnap[];
    hashChain: HashChainEntry[];
    verifiedOutcomes: VerifiedOutcome[];
  };
  summary: {
    totalOpsEntries: number;
    totalSolvencySnapshots: number;
    totalHashChainEntries: number;
    totalVerifiedOutcomes: number;
    latestSnapshotId: string | null;
    latestSnapshotTime: string | null;
    latestTreasury: number | null;
    latestCR: number | null;
    latestPolicyMode: string | null;
    categoryBreakdown: Record<string, number>;
  };
  generatedAt: string;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-50 text-green-800 border-green-300',
    failed: 'bg-red-50 text-red-800 border-red-300',
    pending: 'bg-yellow-50 text-yellow-800 border-yellow-300',
    under_review: 'bg-blue-50 text-blue-800 border-blue-300',
  };
  return (
    <span className={`font-dl-mono text-xs px-1.5 py-0.5 border ${styles[status] ?? 'bg-dl-bg-alt text-dl-gray border-dl-border'}`}>
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  'capital-intelligence': 'Capital Intelligence',
  'PSM Stress Test': 'Peg Stability',
  'fee_plumbing': 'Protocol Plumbing',
};

export default function ProofOfExecutionPage() {
  const [data, setData] = useState<POEData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeRail, setActiveRail] = useState<'ops' | 'solvency' | 'chain' | 'outcomes'>('ops');

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

  const summary = data?.summary;
  const rails = data?.rails;

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
          Auditable capital deployment record — timestamped, multi-layer operations log across on-chain, real asset, and community rails.
          Credibility supported by evidence, not presentation.
        </p>
        <p className="font-dl-mono text-xs text-dl-gray mt-2 border-t border-dl-border pt-2">
          Not performance proof, trading proof, yield evidence, or a return guarantee.
        </p>
      </div>

      {loading && (
        <div className="border border-dl-border p-8 text-center">
          <p className="font-dl-mono text-sm text-dl-gray">Loading execution record...</p>
        </div>
      )}

      {error && (
        <div className="border border-red-300 bg-red-50 p-4 mb-6">
          <p className="text-sm text-red-700 font-dl-mono">{error}</p>
        </div>
      )}

      {data && summary && (
        <>
          {/* Summary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-8">
            {[
              { label: 'Operations Logged', value: summary.totalOpsEntries },
              { label: 'Treasury Snapshots', value: summary.totalSolvencySnapshots },
              { label: 'Hash Chain Entries', value: summary.totalHashChainEntries },
              { label: 'Verified Outcomes', value: summary.totalVerifiedOutcomes },
            ].map((m, i) => (
              <div key={m.label} className={`px-4 py-4 bg-dl-bg ${i < 3 ? 'border-r border-dl-border' : ''}`}>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">{m.label}</p>
                <p className="font-dl-mono text-2xl font-bold text-dl-navy">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Latest solvency context */}
          {summary.latestSnapshotTime && (
            <div className="border border-dl-border mb-8 p-4 bg-dl-bg">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-3">Latest Treasury Snapshot</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-dl-gray mb-1">Snapshot ID</p>
                  <p className="font-dl-mono text-xs text-dl-navy">{summary.latestSnapshotId?.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-xs text-dl-gray mb-1">As Of</p>
                  <p className="font-dl-mono text-xs text-dl-navy">{fmtDate(summary.latestSnapshotTime)}</p>
                </div>
                {summary.latestTreasury !== null && (
                  <div>
                    <p className="text-xs text-dl-gray mb-1">Treasury</p>
                    <p className="font-dl-mono text-xs text-dl-navy">${summary.latestTreasury.toLocaleString()}</p>
                  </div>
                )}
                {summary.latestPolicyMode && (
                  <div>
                    <p className="text-xs text-dl-gray mb-1">Policy Mode</p>
                    <p className="font-dl-mono text-xs text-dl-navy">{summary.latestPolicyMode}</p>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-dl-border">
                <Link href="/solvency" className="text-xs text-dl-navy underline font-dl-mono">
                  View full solvency disclosure →
                </Link>
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {Object.keys(summary.categoryBreakdown).length > 0 && (
            <div className="mb-8">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-3">Operations by Category</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.categoryBreakdown).map(([cat, count]) => (
                  <div key={cat} className="border border-dl-border px-3 py-2 bg-dl-bg-alt">
                    <p className="text-xs text-dl-gray font-dl-mono">{CATEGORY_LABELS[cat] ?? cat}</p>
                    <p className="font-dl-mono text-sm font-bold text-dl-navy">{count} entries</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rail tabs */}
          <div className="flex border-b border-dl-border mb-6 overflow-x-auto">
            {([
              { key: 'ops', label: 'Operations Log' },
              { key: 'solvency', label: 'Treasury Snapshots' },
              { key: 'chain', label: 'Hash Chain' },
              { key: 'outcomes', label: 'Verified Outcomes' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveRail(tab.key)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
                  activeRail === tab.key
                    ? 'border-dl-navy text-dl-navy'
                    : 'border-transparent text-dl-gray hover:text-dl-navy'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Operations Log */}
          {activeRail === 'ops' && rails && (
            rails.opsLog.length === 0 ? (
              <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">No operations entries recorded.</p>
            ) : (
              <div className="space-y-0 border border-dl-border">
                {rails.opsLog.map((entry, i) => (
                  <div key={i} className={`p-4 ${i < rails.opsLog.length - 1 ? 'border-b border-dl-border' : ''} ${entry.protocol_change ? 'bg-blue-50' : 'bg-dl-bg'}`}>
                    <div className="flex flex-wrap items-start gap-3 mb-1">
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
                          {entry.tx_hash.slice(0, 14)}...
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Treasury Snapshots */}
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
                    <p className="font-dl-mono text-xs text-dl-navy">{snap.id.slice(0, 12)}...</p>
                    <p className="font-dl-mono text-xs text-dl-gray">{fmtDate(snap.asOfUtc)}</p>
                    <p className="font-dl-mono text-xs text-dl-gray">{snap.checksum.slice(0, 16)}...</p>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Hash Chain */}
          {activeRail === 'chain' && rails && (
            rails.hashChain.length === 0 ? (
              <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">No hash chain entries recorded.</p>
            ) : (
              <div className="border border-dl-border space-y-0">
                {rails.hashChain.map((entry, i) => (
                  <div key={entry.event_id} className={`p-4 ${i < rails.hashChain.length - 1 ? 'border-b border-dl-border' : ''}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-dl-mono text-xs text-dl-forest bg-green-50 border border-green-300 px-1.5 py-0.5">{entry.event_type}</span>
                      <span className="font-dl-mono text-xs text-dl-gray">{entry.entity_type}</span>
                      <span className="ml-auto font-dl-mono text-xs text-dl-gray">{fmtDate(entry.created_at)}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-dl-mono text-xs text-dl-gray">
                        Hash: <span className="text-dl-navy">{entry.hash}</span>
                      </p>
                      {entry.prev_hash && (
                        <p className="font-dl-mono text-xs text-dl-gray">
                          Prev: <span className="text-dl-navy">{entry.prev_hash}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Verified Outcomes */}
          {activeRail === 'outcomes' && rails && (
            rails.verifiedOutcomes.length === 0 ? (
              <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">No verified outcomes recorded.</p>
            ) : (
              <div className="border border-dl-border space-y-0">
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
                        <p>On-chain hash: <span className="text-dl-navy">{outcome.arbitrum_outcome_hash.slice(0, 20)}...</span></p>
                      )}
                      {outcome.arbitrum_proof_ref && (
                        <p>Proof ref: <span className="text-dl-navy">{outcome.arbitrum_proof_ref.slice(0, 20)}...</span></p>
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

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-dl-border">
            <p className="font-dl-mono text-xs text-dl-gray">
              Record generated: {fmtDate(data.generatedAt)} — This is an operational audit log, not a performance disclosure.
              All on-chain references are verifiable on Arbitrum One (chainId: 42161).
            </p>
            <div className="flex gap-4 mt-2">
              <Link href="/solvency" className="text-xs text-dl-navy underline font-dl-mono">Solvency Console</Link>
              <Link href="/disclosure" className="text-xs text-dl-navy underline font-dl-mono">Institutional Disclosure</Link>
              <Link href="/founder-ops" className="text-xs text-dl-navy underline font-dl-mono">Founder Operations</Link>
            </div>
          </div>
        </>
      )}
    </DesignLawLayout>
  );
}
