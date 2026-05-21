/**
 * pages/operator/reserve-registry.tsx
 *
 * Phase 2/3 — AXUSD Reserve Registry Operator Dashboard
 *
 * Phase 3 additions:
 *   - Oracle Health Panel (source status, isActive, lastChecked)
 *   - Phase 3 valuation metrics (stale, fallback, manual review buckets)
 *   - Per-asset confidence score and freshness state
 *   - Effective haircut expansion indicators
 *
 * All reserve separation invariants remain enforced by ReserveManager.
 */

import type { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { OperatorConsoleLayout } from '../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../lib/capinfra/operatorAuth';
import {
  getReserveManagerSummary,
  getAttestationStatusSummary,
} from '../../lib/reserves/phase2/reserveManager';
import { getOracleSourceRegistry } from '../../lib/reserves/phase3/oracleSourceRegistry';
import { getAllValuationPolicies } from '../../lib/reserves/phase3/assetValuationPolicy';
import type {
  AttestationStatusSummary,
  ApprovedReserveAsset,
  ReserveSleeveAggregate,
} from '../../lib/reserves/phase2/types';
import type { ReserveManagerSummaryPhase3 } from '../../lib/reserves/phase2/reserveManager';
import type { OracleSource, ValuationPolicy, ValuationResult } from '../../lib/reserves/phase3/types';

interface Props {
  summary: ReserveManagerSummaryPhase3;
  attestation: AttestationStatusSummary;
  oracleSources: OracleSource[];
  valuationPolicies: ValuationPolicy[];
  loadError: string | null;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  try {
    const [summary, attestation] = await Promise.all([
      getReserveManagerSummary(),
      getAttestationStatusSummary(),
    ]);
    const oracleSources    = getOracleSourceRegistry();
    const valuationPolicies = getAllValuationPolicies();
    return { props: { summary, attestation, oracleSources, valuationPolicies, loadError: null } };
  } catch (err) {
    return {
      props: {
        summary:           null as unknown as ReserveManagerSummaryPhase3,
        attestation:       null as unknown as AttestationStatusSummary,
        oracleSources:     [],
        valuationPolicies: [],
        loadError: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function usd(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function bps(n: number) {
  return `${n} bps (${(n / 100).toFixed(2)}%)`;
}

const td: React.CSSProperties = {
  padding: '8px',
  borderBottom: '1px solid #e5e7eb',
  verticalAlign: 'top',
};

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    LIVE:            'color: #2d6a4f; background: #d8f3dc; border: 1px solid #2d6a4f;',
    PLANNED:         'color: #6b4c1e; background: #fff3cd; border: 1px solid #b88a2f;',
    DISABLED:        'color: #7f1d1d; background: #fee2e2; border: 1px solid #991b1b;',
    DEPRECATED:      'color: #6b7280; background: #f3f4f6; border: 1px solid #6b7280;',
    INTERNAL_ONLY:   'color: #1e3a5f; background: #dbeafe; border: 1px solid #1e3a5f;',
    CURRENT:         'color: #2d6a4f; background: #d8f3dc; border: 1px solid #2d6a4f;',
    NONE:            'color: #6b7280; background: #f3f4f6; border: 1px solid #6b7280;',
    PENDING:         'color: #6b4c1e; background: #fff3cd; border: 1px solid #b88a2f;',
    STALE:           'color: #7f1d1d; background: #fee2e2; border: 1px solid #991b1b;',
    FAILED:          'color: #7f1d1d; background: #fee2e2; border: 1px solid #991b1b;',
    MANUAL_REVIEW:   'color: #6b4c1e; background: #fff3cd; border: 1px solid #b88a2f;',
    FRESH:           'color: #2d6a4f; background: #d8f3dc; border: 1px solid #2d6a4f;',
    APPROACHING_STALE: 'color: #6b4c1e; background: #fff3cd; border: 1px solid #b88a2f;',
    EXPIRED:         'color: #7f1d1d; background: #fee2e2; border: 1px solid #991b1b;',
    UNUSABLE:        'color: #7f1d1d; background: #fee2e2; border: 1px solid #991b1b;',
    PRIMARY_HEALTHY: 'color: #2d6a4f; background: #d8f3dc; border: 1px solid #2d6a4f;',
    USING_FALLBACK:  'color: #6b4c1e; background: #fff3cd; border: 1px solid #b88a2f;',
    BOTH_STALE:      'color: #7f1d1d; background: #fee2e2; border: 1px solid #991b1b;',
    BOTH_FAILED:     'color: #7f1d1d; background: #fee2e2; border: 1px solid #991b1b;',
  };
  const style = colors[status] ?? 'color: #374151; background: #f9fafb;';
  return (
    <span style={{
      ...Object.fromEntries(style.split(';').filter(Boolean).map(s => {
        const [k, v] = s.split(':');
        return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.trim()];
      })),
      fontFamily: 'monospace',
      fontSize: '10px',
      fontWeight: 700,
      padding: '2px 6px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    }}>
      {status}
    </span>
  );
}

function Flag({ active, label }: { active: boolean; label: string }) {
  return (
    <span style={{
      fontFamily: 'monospace',
      fontSize: '10px',
      color: active ? '#2d6a4f' : '#9ca3af',
      fontWeight: active ? 700 : 400,
    }}>
      {active ? '✓ ' : '✗ '}{label}
    </span>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#2d6a4f' : score >= 60 ? '#b88a2f' : '#991b1b';
  return (
    <span style={{
      fontFamily: 'monospace',
      fontSize: '10px',
      fontWeight: 700,
      color,
      border: `1px solid ${color}`,
      padding: '1px 4px',
    }}>
      {score}/100
    </span>
  );
}

// ── Oracle Health Panel ───────────────────────────────────────────────────────

function OracleHealthPanel({ sources }: { sources: OracleSource[] }) {
  return (
    <div style={{ border: '1px solid #1e3a5f', marginBottom: 32 }}>
      <div style={{
        background: '#1e3a5f',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
          Phase 3 Oracle Source Registry
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#93c5fd' }}>
          {sources.filter(s => s.isActive && !s.isDeprecated).length} active ·{' '}
          {sources.filter(s => !s.isActive && !s.isDeprecated).length} stub ·{' '}
          {sources.filter(s => s.isDeprecated).length} deprecated
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ background: '#f0f4ff' }}>
            {['Source', 'Type', 'Priority', 'Max Staleness', 'Primary', 'Fallback', 'Status', 'Notes'].map(h => (
              <th key={h} style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                padding: '5px 8px',
                textAlign: 'left',
                color: '#1e3a5f',
                fontWeight: 700,
                borderBottom: '1px solid #d1d5db',
                letterSpacing: '0.04em',
              }}>
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sources.map(src => {
            const isOk = src.isActive && !src.isDeprecated;
            const isStub = !src.isActive && !src.isDeprecated;
            return (
              <tr key={src.id} style={{ background: src.isDeprecated ? '#fafafa' : '#ffffff', opacity: src.isDeprecated ? 0.6 : 1 }}>
                <td style={td}>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>{src.name}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#6b7280' }}>{src.id}</div>
                </td>
                <td style={td}>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#1e3a5f' }}>{src.type}</span>
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>{src.priorityRank}</span>
                </td>
                <td style={td}>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>
                    {src.maxStalenessSeconds >= 315360000 ? 'Never' : `${src.maxStalenessSeconds}s`}
                  </span>
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <Flag active={src.isPrimary} label="" />
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <Flag active={src.isFallback} label="" />
                </td>
                <td style={td}>
                  <StatusPill status={
                    src.isDeprecated ? 'DEPRECATED' :
                    src.isActive ? 'LIVE' : 'PLANNED'
                  } />
                  {isStub && (
                    <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#b88a2f', marginTop: 2 }}>
                      Phase 3 stub
                    </div>
                  )}
                </td>
                <td style={{ ...td, maxWidth: 240 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280', lineHeight: 1.4 }}>
                    {src.notes}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Oracle Live Feed Panel ────────────────────────────────────────────────────

const PHASE4_ASSETS = [
  { assetId: 'paxg-tokenized-gold-planned',         symbol: 'PAXG',   name: 'Pax Gold' },
  { assetId: 'thbill-theo-market-planned',          symbol: 'thBILL', name: 'T-Bill Token' },
  { assetId: 'buidl-tokenized-treasury-planned',    symbol: 'BUIDL',  name: 'BlackRock USD Fund' },
  { assetId: 'ondo-usdy-tokenized-govmmf-planned',  symbol: 'USDY',   name: 'Ondo Gov MMF' },
];

interface OracleNavObs {
  assetId: string;
  symbol: string;
  grossNavPerToken: number | null;
  quoteCurrency: string;
  sourceType: string;
  sourceName: string;
  confidenceScore: number;
  freshnessState: string;
  liveAttestationStatus: string | null;
  isUsable: boolean;
  unusableReason: string | null;
  timestamp: string | null;
}

interface NavFeedData {
  fetchedAt: string;
  observations: OracleNavObs[];
  cache: { entries: number; fresh: number; stale: number };
  lastPoll: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
    successCount: number;
    failureCount: number;
  } | null;
}

function OracleLiveFeedPanel() {
  const [data, setData]               = useState<NavFeedData | null>(null);
  const [loading, setLoading]         = useState(false);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [refreshMsg, setRefreshMsg]   = useState<string | null>(null);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await fetch('/api/axusd/oracles/nav');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: NavFeedData = await res.json();
      setData(json);
    } catch (e) {
      setFetchError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    const id = setInterval(fetchFeed, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleRefreshNow = async () => {
    try {
      setRefreshing(true);
      setRefreshMsg(null);
      const res = await fetch('/api/operator/oracles/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        setRefreshMsg(`Error: ${json.error ?? 'Refresh failed'}`);
      } else {
        setRefreshMsg(
          `Refreshed — ${json.successCount} OK · ${json.failureCount} failed · ${json.durationMs}ms`
        );
        await fetchFeed();
      }
    } catch (e) {
      setRefreshMsg(`Error: ${(e as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const obsMap = new Map<string, OracleNavObs>();
  if (data?.observations) {
    for (const obs of data.observations) {
      obsMap.set(obs.assetId, obs);
    }
  }

  return (
    <div style={{ border: '1px solid #1e3a5f', marginBottom: 32 }}>
      {/* Header */}
      <div style={{
        background: '#1e3a5f',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
          Phase 4 — Live Oracle Feed
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {data && !loading && (
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#93c5fd' }}>
              Polled {new Date(data.fetchedAt).toLocaleTimeString()}
            </span>
          )}
          {loading && data && (
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#93c5fd' }}>Updating…</span>
          )}
          <button
            onClick={handleRefreshNow}
            disabled={refreshing || loading}
            style={{
              fontFamily: 'monospace',
              fontSize: '10px',
              fontWeight: 700,
              color: '#ffffff',
              background: 'transparent',
              border: '1px solid #93c5fd',
              padding: '2px 8px',
              cursor: refreshing || loading ? 'not-allowed' : 'pointer',
              opacity: refreshing || loading ? 0.6 : 1,
            }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh Now'}
          </button>
        </div>
      </div>

      {/* Loading / error / refresh status */}
      {loading && !data && (
        <div style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#6b7280' }}>
          Loading oracle feed…
        </div>
      )}
      {fetchError && (
        <div style={{ padding: '8px 12px', background: '#fee2e2', fontFamily: 'monospace', fontSize: '11px', color: '#991b1b' }}>
          ⚠ Failed to load oracle feed: {fetchError}
        </div>
      )}
      {refreshMsg && (
        <div style={{
          padding: '6px 12px',
          background: refreshMsg.startsWith('Error') ? '#fee2e2' : '#d8f3dc',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: refreshMsg.startsWith('Error') ? '#991b1b' : '#2d6a4f',
        }}>
          {refreshMsg}
        </div>
      )}

      {/* Asset table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ background: '#f0f4ff' }}>
            {['Asset', 'Price / NAV', 'Source', 'Freshness', 'Confidence', 'Attestation', 'Last Updated'].map(h => (
              <th key={h} style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                padding: '5px 8px',
                textAlign: 'left',
                color: '#1e3a5f',
                fontWeight: 700,
                borderBottom: '1px solid #d1d5db',
                letterSpacing: '0.04em',
              }}>
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PHASE4_ASSETS.map(({ assetId, symbol, name }) => {
            const obs = obsMap.get(assetId);
            const noData = !data;
            return (
              <tr key={assetId} style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>

                {/* Asset */}
                <td style={{ ...td, minWidth: 180 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>{symbol}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#6b7280' }}>{name}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '8px', color: '#d1d5db', marginTop: 1 }}>{assetId}</div>
                </td>

                {/* Price / NAV */}
                <td style={{ ...td, textAlign: 'right', minWidth: 110 }}>
                  {noData ? (
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af' }}>—</span>
                  ) : obs?.isUsable && obs.grossNavPerToken != null ? (
                    <div>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#1e3a5f' }}>
                        ${obs.grossNavPerToken.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#6b7280', marginLeft: 3 }}>
                        {obs.quoteCurrency}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#b88a2f' }}>
                      Unavailable
                    </span>
                  )}
                </td>

                {/* Source */}
                <td style={td}>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#374151' }}>
                    {noData ? '—' : (obs?.sourceType ?? 'UNUSABLE')}
                  </span>
                  {obs?.sourceName && (
                    <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#9ca3af', marginTop: 1 }}>
                      {obs.sourceName}
                    </div>
                  )}
                </td>

                {/* Freshness */}
                <td style={td}>
                  {noData ? (
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af' }}>—</span>
                  ) : (
                    <StatusPill status={obs?.freshnessState ?? 'EXPIRED'} />
                  )}
                  {obs?.unusableReason && (
                    <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#b88a2f', marginTop: 2, maxWidth: 180 }}>
                      {obs.unusableReason}
                    </div>
                  )}
                </td>

                {/* Confidence */}
                <td style={{ ...td, textAlign: 'center' }}>
                  {noData ? (
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af' }}>—</span>
                  ) : (
                    <ConfidenceBadge score={obs?.confidenceScore ?? 0} />
                  )}
                </td>

                {/* Attestation */}
                <td style={td}>
                  {noData || !obs?.liveAttestationStatus ? (
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af' }}>—</span>
                  ) : (
                    <StatusPill status={obs.liveAttestationStatus} />
                  )}
                </td>

                {/* Last Updated */}
                <td style={td}>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }}>
                    {noData
                      ? '—'
                      : obs?.timestamp
                        ? new Date(obs.timestamp).toLocaleString('en-US', {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : 'Never'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Cache stats strip */}
      {data && (
        <div style={{
          display: 'flex',
          gap: 16,
          padding: '6px 12px',
          background: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#1e3a5f', fontWeight: 700 }}>
            CACHE
          </span>
          {[
            { label: 'entries', value: String(data.cache.entries), color: '#374151' },
            { label: 'fresh',   value: String(data.cache.fresh),   color: '#2d6a4f' },
            { label: 'stale',   value: String(data.cache.stale),   color: data.cache.stale > 0 ? '#991b1b' : '#9ca3af' },
          ].map(s => (
            <span key={s.label} style={{ fontFamily: 'monospace', fontSize: '10px' }}>
              <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>{' '}
              <span style={{ color: '#9ca3af' }}>{s.label}</span>
            </span>
          ))}
          {data.lastPoll ? (
            <>
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#d1d5db' }}>·</span>
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }}>
                Last poll {new Date(data.lastPoll.completedAt).toLocaleTimeString()} ·{' '}
                {data.lastPoll.successCount}/{data.lastPoll.successCount + data.lastPoll.failureCount} OK ·{' '}
                {data.lastPoll.durationMs}ms
              </span>
            </>
          ) : (
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#b88a2f' }}>
              No poll has run yet — check Vercel cron or trigger Refresh Now
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Admission Log Panel ───────────────────────────────────────────────────────

interface AdmissionRecord {
  id: number;
  assetId: string;
  assetSymbol: string;
  sleeve: string;
  proposalTitle: string;
  proposalDescription: string;
  complianceResolution: string | null;
  dualCountingGuardAcknowledged: boolean;
  governanceSafeTxHash: string | null;
  status: string;
  registryChangeSummary: string | null;
  admittedAt: string | null;
  operatorNotes: string | null;
  createdAt: string;
}

const PAXG_ASSET_ID = 'paxg-tokenized-gold-planned';

const PAXG_DEFAULTS = {
  proposalTitle:
    'Phase 4 Governance Admission — PAXG TOKENIZED_GOLD Sleeve (PLANNED → LIVE)',
  proposalDescription:
    'PAXG (Pax Gold, tokenized gold on Arbitrum One) is admitted as an active AXUSD reserve ' +
    'asset effective this governance record. The Phase 4 oracle feed (Chainlink XAU/USD on ' +
    'Arbitrum One, 0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c) is live. BitGo CaaS on-chain ' +
    'ERC-20 balanceOf() attestation verifies actual PAXG token holdings. Haircut: 500 bps (5%) ' +
    'for intraday XAU/USD volatility. Max allocation: 20% of eligible reserve (maxAllocationBps=2000). ' +
    'This record constitutes operator sign-off on the registry change and dual-counting guard confirmation.',
  complianceResolution:
    'Phase 1 compliance gaps (LendingPlatformModule whitelist, CountryAllowModule country-0 pass-through, ' +
    'TransferLimitModule tier-3 assignment) apply exclusively to the TOKENIZED_TBILL sleeve and are NOT ' +
    'applicable to the TOKENIZED_GOLD sleeve. PAXG admission does not depend on resolution of these gaps. ' +
    'Confirmed by operator in approvedReserveAssetRegistry.ts comment block dated Phase 4.',
  registryChangeSummary:
    'lib/reserves/phase2/approvedReserveAssetRegistry.ts: paxg-tokenized-gold-planned status PLANNED → LIVE, ' +
    'isLive false → true, isPlanned true → false, admissionGateOpen set to true. ' +
    'lib/reserves/phase3/assetValuationPolicy.ts: manualReviewRequired cleared (false). ' +
    'Oracle live: lib/reserves/phase3/treasuryNAVOracle.ts + feeds/chainlinkXauUsd.ts + feeds/bitgoAttestationFetcher.ts.',
};

function AdmissionLogPanel() {
  const [records, setRecords]         = useState<AdmissionRecord[]>([]);
  const [loadErr, setLoadErr]         = useState<string | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitMsg, setSubmitMsg]     = useState<string | null>(null);

  // Mark Executed inline form state
  const [executingId, setExecutingId]   = useState<number | null>(null);
  const [execTxHash, setExecTxHash]     = useState('');
  const [execNotes, setExecNotes]       = useState('');
  const [execLoading, setExecLoading]   = useState(false);
  const [execMsg, setExecMsg]           = useState<string | null>(null);

  // Form fields
  const [proposalTitle, setProposalTitle]             = useState(PAXG_DEFAULTS.proposalTitle);
  const [proposalDescription, setProposalDescription] = useState(PAXG_DEFAULTS.proposalDescription);
  const [complianceResolution, setComplianceResolution] = useState(PAXG_DEFAULTS.complianceResolution);
  const [dualCountingGuardAck, setDualCountingGuardAck] = useState(false);
  const [govSafeTxHash, setGovSafeTxHash]             = useState('');
  const [admissionStatus, setAdmissionStatus]         = useState('APPROVED');
  const [admittedAt, setAdmittedAt]                   = useState('');
  const [operatorNotes, setOperatorNotes]             = useState('');

  const fetchRecords = async () => {
    try {
      setLoadErr(null);
      const res = await fetch(`/api/operator/reserve-admissions?assetId=${PAXG_ASSET_ID}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRecords(json.records ?? []);
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dualCountingGuardAck) {
      setSubmitMsg('Error: You must acknowledge the dual-counting guard before recording.');
      return;
    }
    try {
      setSubmitting(true);
      setSubmitMsg(null);
      const res = await fetch('/api/operator/reserve-admissions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: PAXG_ASSET_ID,
          assetSymbol: 'PAXG',
          sleeve: 'TOKENIZED_GOLD',
          proposalTitle,
          proposalDescription,
          complianceResolution: complianceResolution || null,
          dualCountingGuardAcknowledged: dualCountingGuardAck,
          governanceSafeTxHash: govSafeTxHash.trim() || null,
          status: admissionStatus,
          registryChangeSummary: PAXG_DEFAULTS.registryChangeSummary,
          admittedAt: admittedAt || null,
          operatorNotes: operatorNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitMsg(`Error: ${json.error ?? 'Submission failed'}`);
      } else {
        setSubmitMsg('Admission record created successfully.');
        setShowForm(false);
        await fetchRecords();
      }
    } catch (e) {
      setSubmitMsg(`Error: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkExecuted = async (id: number) => {
    setExecLoading(true);
    setExecMsg(null);
    try {
      const res = await fetch(`/api/operator/reserve-admissions/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'EXECUTED',
          governanceSafeTxHash: execTxHash.trim() || undefined,
          operatorNotes: execNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setExecMsg(`Error: ${json.error ?? 'Update failed'}`);
      } else {
        const v = json.arbiscanVerification;
        const verNote = v?.attempted
          ? (v.confirmed ? ' · Arbiscan: tx confirmed ✓' : ` · Arbiscan: ${v.error ?? 'unconfirmed'}`)
          : '';
        setExecMsg(`Record #${id} marked EXECUTED.${verNote}`);
        setExecutingId(null);
        setExecTxHash('');
        setExecNotes('');
        await fetchRecords();
      }
    } catch (e) {
      setExecMsg(`Error: ${(e as Error).message}`);
    } finally {
      setExecLoading(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'EXECUTED') return '#2d6a4f';
    if (s === 'APPROVED') return '#1e3a5f';
    if (s === 'PROPOSED') return '#b88a2f';
    return '#6b7280';
  };

  const hasApproved = records.some(r => r.status === 'APPROVED' || r.status === 'EXECUTED');

  return (
    <div style={{ border: '1px solid #1e3a5f', marginBottom: 32 }}>
      {/* Header */}
      <div style={{
        background: '#1e3a5f',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
          Phase 4 — Governance Admission Log
        </span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#93c5fd' }}>
            {records.length} record{records.length !== 1 ? 's' : ''} · PAXG TOKENIZED_GOLD
          </span>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              fontFamily: 'monospace',
              fontSize: '10px',
              fontWeight: 700,
              color: '#ffffff',
              background: 'transparent',
              border: '1px solid #93c5fd',
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            {showForm ? 'Cancel' : '+ Record Admission'}
          </button>
        </div>
      </div>

      {/* Error */}
      {loadErr && (
        <div style={{ padding: '8px 12px', background: '#fee2e2', fontFamily: 'monospace', fontSize: '11px', color: '#991b1b' }}>
          ⚠ Failed to load admission records: {loadErr}
        </div>
      )}

      {/* Submit message */}
      {submitMsg && (
        <div style={{
          padding: '6px 12px',
          background: submitMsg.startsWith('Error') ? '#fee2e2' : '#d8f3dc',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: submitMsg.startsWith('Error') ? '#991b1b' : '#2d6a4f',
        }}>
          {submitMsg}
        </div>
      )}

      {/* Record form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ padding: '16px 12px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '12px', fontWeight: 700, marginBottom: 12, color: '#1e3a5f' }}>
            Record PAXG Admission Decision
          </div>
          {[
            { label: 'Proposal Title', value: proposalTitle, set: setProposalTitle, rows: 2 },
            { label: 'Proposal Description', value: proposalDescription, set: setProposalDescription, rows: 4 },
            { label: 'Compliance Resolution (Phase 1 gap disposition)', value: complianceResolution, set: setComplianceResolution, rows: 3 },
          ].map(({ label, value, set, rows }) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '10px', color: '#374151', marginBottom: 3, fontWeight: 700 }}>
                {label.toUpperCase()}
              </label>
              <textarea
                value={value}
                onChange={e => set(e.target.value)}
                rows={rows}
                required
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  padding: '4px 6px',
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '10px', color: '#374151', marginBottom: 3, fontWeight: 700 }}>
                STATUS
              </label>
              <select
                value={admissionStatus}
                onChange={e => setAdmissionStatus(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '10px', padding: '4px 6px', border: '1px solid #d1d5db', width: '100%', background: '#ffffff' }}
              >
                {['PROPOSED', 'APPROVED', 'EXECUTED'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '10px', color: '#374151', marginBottom: 3, fontWeight: 700 }}>
                ADMITTED AT (ISO, optional)
              </label>
              <input
                type="text"
                value={admittedAt}
                onChange={e => setAdmittedAt(e.target.value)}
                placeholder="2026-04-30T00:00:00Z"
                style={{ fontFamily: 'monospace', fontSize: '10px', padding: '4px 6px', border: '1px solid #d1d5db', width: '100%', background: '#ffffff', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '10px', color: '#374151', marginBottom: 3, fontWeight: 700 }}>
              GOVERNANCE SAFE TX HASH (optional — on-chain vote tx)
            </label>
            <input
              type="text"
              value={govSafeTxHash}
              onChange={e => setGovSafeTxHash(e.target.value)}
              placeholder="0x…"
              style={{ fontFamily: 'monospace', fontSize: '10px', padding: '4px 6px', border: '1px solid #d1d5db', width: '100%', background: '#ffffff', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '10px', color: '#374151', marginBottom: 3, fontWeight: 700 }}>
              OPERATOR NOTES (optional)
            </label>
            <textarea
              value={operatorNotes}
              onChange={e => setOperatorNotes(e.target.value)}
              rows={2}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '10px', padding: '4px 6px', border: '1px solid #d1d5db', background: '#ffffff', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={dualCountingGuardAck}
                onChange={e => setDualCountingGuardAck(e.target.checked)}
                required
              />
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#1e3a5f', fontWeight: 700 }}>
                I confirm the dual-counting guard is enforced: the PAXG balance counted in this AXUSD reserve
                sleeve is NOT already included in the CanonicalReserveSnapshot hard-asset numerator.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || !dualCountingGuardAck}
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 700,
              color: '#ffffff',
              background: '#1e3a5f',
              border: 'none',
              padding: '6px 14px',
              cursor: submitting || !dualCountingGuardAck ? 'not-allowed' : 'pointer',
              opacity: submitting || !dualCountingGuardAck ? 0.6 : 1,
            }}
          >
            {submitting ? 'Recording…' : 'Record Admission'}
          </button>
        </form>
      )}

      {/* Records list */}
      {records.length === 0 && !loadErr ? (
        <div style={{ padding: '12px', fontFamily: 'monospace', fontSize: '11px', color: '#b88a2f' }}>
          ⚑ No admission record on file for PAXG. Click &ldquo;+ Record Admission&rdquo; to document the governance decision.
        </div>
      ) : (
        <div>
          {records.map(r => (
            <div key={r.id} style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: '10px', fontWeight: 700,
                  color: statusColor(r.status),
                  border: `1px solid ${statusColor(r.status)}`,
                  padding: '1px 5px',
                }}>
                  {r.status}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#1e3a5f' }}>
                  {r.proposalTitle}
                </span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#374151', lineHeight: 1.5, marginBottom: 4 }}>
                {r.proposalDescription}
              </div>
              {r.complianceResolution && (
                <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#2d6a4f', background: '#f0fdf4', padding: '4px 6px', marginBottom: 4, border: '1px solid #86efac' }}>
                  <strong>Compliance:</strong> {r.complianceResolution}
                </div>
              )}
              {r.registryChangeSummary && (
                <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#1e3a5f', background: '#f0f4ff', padding: '4px 6px', marginBottom: 4 }}>
                  <strong>Registry change:</strong> {r.registryChangeSummary}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                {[
                  { label: 'Dual-count guard', value: r.dualCountingGuardAcknowledged ? '✓ Acknowledged' : '✗ Not confirmed', color: r.dualCountingGuardAcknowledged ? '#2d6a4f' : '#991b1b' },
                  { label: 'Admitted at', value: r.admittedAt ? new Date(r.admittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—', color: '#374151' },
                  { label: 'Recorded', value: new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), color: '#374151' },
                ].map(m => (
                  <span key={m.label} style={{ fontFamily: 'monospace', fontSize: '10px' }}>
                    <span style={{ color: '#9ca3af' }}>{m.label}: </span>
                    <span style={{ color: m.color, fontWeight: 700 }}>{m.value}</span>
                  </span>
                ))}
                {r.governanceSafeTxHash && (
                  <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>
                    <span style={{ color: '#9ca3af' }}>Safe tx: </span>
                    <a
                      href={`https://arbiscan.io/tx/${r.governanceSafeTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1e3a5f', fontWeight: 700 }}
                    >
                      {r.governanceSafeTxHash.slice(0, 10)}…
                    </a>
                  </span>
                )}
              </div>
              {r.operatorNotes && (
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280', marginTop: 4 }}>
                  Notes: {r.operatorNotes}
                </div>
              )}

              {/* Mark Executed action — only on APPROVED / PROPOSED records */}
              {(r.status === 'APPROVED' || r.status === 'PROPOSED') && (
                <div style={{ marginTop: 8 }}>
                  {executingId === r.id ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 700, color: '#2d6a4f', marginBottom: 6 }}>
                        Mark Record #{r.id} as EXECUTED
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, marginBottom: 6 }}>
                        <input
                          type="text"
                          value={execTxHash}
                          onChange={e => setExecTxHash(e.target.value)}
                          placeholder="Governance Safe tx hash — 0x… (optional)"
                          style={{
                            fontFamily: 'monospace', fontSize: '10px',
                            padding: '4px 6px', border: '1px solid #86efac',
                            background: '#ffffff', width: '100%', boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => handleMarkExecuted(r.id)}
                            disabled={execLoading}
                            style={{
                              fontFamily: 'monospace', fontSize: '10px', fontWeight: 700,
                              color: '#ffffff', background: '#2d6a4f',
                              border: 'none', padding: '4px 10px',
                              cursor: execLoading ? 'not-allowed' : 'pointer',
                              opacity: execLoading ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {execLoading ? 'Saving…' : 'Confirm Executed'}
                          </button>
                          <button
                            onClick={() => { setExecutingId(null); setExecTxHash(''); setExecNotes(''); setExecMsg(null); }}
                            style={{
                              fontFamily: 'monospace', fontSize: '10px',
                              color: '#6b7280', background: 'transparent',
                              border: '1px solid #d1d5db', padding: '4px 8px', cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={execNotes}
                        onChange={e => setExecNotes(e.target.value)}
                        placeholder="Operator note (optional — appended to existing notes)"
                        style={{
                          fontFamily: 'monospace', fontSize: '10px',
                          padding: '4px 6px', border: '1px solid #86efac',
                          background: '#ffffff', width: '100%', boxSizing: 'border-box',
                        }}
                      />
                      {execMsg && (
                        <div style={{
                          marginTop: 6, fontFamily: 'monospace', fontSize: '9px',
                          color: execMsg.startsWith('Error') ? '#991b1b' : '#2d6a4f',
                        }}>
                          {execMsg}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => { setExecutingId(r.id); setExecMsg(null); }}
                      style={{
                        fontFamily: 'monospace', fontSize: '9px', fontWeight: 700,
                        color: '#2d6a4f', background: 'transparent',
                        border: '1px solid #2d6a4f', padding: '3px 8px',
                        cursor: 'pointer', letterSpacing: '0.06em',
                      }}
                    >
                      Mark Executed →
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PAXG admission gate status */}
      <div style={{ padding: '6px 12px', background: '#f0f4ff', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#1e3a5f', fontWeight: 700 }}>REGISTRY GATE</span>
        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#2d6a4f' }}>
          ✓ admissionGateOpen = true &nbsp;·&nbsp; status = LIVE &nbsp;·&nbsp; isLive = true
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af' }}>
          Phase 1 compliance gaps: N/A (TOKENIZED_GOLD sleeve) &nbsp;·&nbsp; Oracle: CHAINLINK XAU/USD + BitGo
        </span>
        {!hasApproved && (
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#b88a2f', fontWeight: 700 }}>
            ⚑ Registry is LIVE but no governance record on file — record the admission decision above.
          </span>
        )}
      </div>
    </div>
  );
}

// ── Valuation Result Row ──────────────────────────────────────────────────────

function ValuationResultPanel({ results }: { results: ValuationResult[] }) {
  if (!results || results.length === 0) return null;
  return (
    <div style={{ border: '1px solid #1e3a5f', marginBottom: 32 }}>
      <div style={{ background: '#1e3a5f', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
          Phase 3 Valuation Results — Per-Asset Oracle Analysis
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#93c5fd' }}>
          {results.filter(r => r.isEligible).length} eligible · {results.filter(r => !r.isEligible).length} excluded
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ background: '#f0f4ff' }}>
            {['Asset', 'Source', 'Freshness', 'Fallback State', 'Confidence', 'Base HC', 'Eff. HC', 'Gross Value', 'Eligible Value', 'Exclusion'].map(h => (
              <th key={h} style={{ fontFamily: 'monospace', fontSize: '10px', padding: '5px 8px', textAlign: 'left', color: '#1e3a5f', fontWeight: 700, borderBottom: '1px solid #d1d5db', letterSpacing: '0.04em' }}>
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map(r => (
            <tr key={r.assetId} style={{ background: r.isEligible ? '#ffffff' : '#fafafa', opacity: r.isEligible ? 1 : 0.8 }}>
              <td style={td}>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px' }}>{r.symbol}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#6b7280' }}>{r.assetId}</div>
              </td>
              <td style={td}><span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{r.source}</span></td>
              <td style={td}><StatusPill status={r.freshnessState} /></td>
              <td style={td}><StatusPill status={r.fallbackState} /></td>
              <td style={{ ...td, textAlign: 'center' }}><ConfidenceBadge score={r.confidenceScore} /></td>
              <td style={td}><span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{r.baseHaircutBps} bps</span></td>
              <td style={td}>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  fontWeight: r.effectiveHaircutBps > r.baseHaircutBps ? 700 : 400,
                  color: r.effectiveHaircutBps > r.baseHaircutBps ? '#991b1b' : '#374151',
                }}>
                  {r.effectiveHaircutBps} bps
                  {r.effectiveHaircutBps > r.baseHaircutBps && (
                    <span style={{ color: '#991b1b', marginLeft: 2 }}>▲</span>
                  )}
                </span>
              </td>
              <td style={{ ...td, textAlign: 'right' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{usd(r.grossValueUsd)}</span>
              </td>
              <td style={{ ...td, textAlign: 'right' }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: r.eligibleReserveValueUsd > 0 ? 700 : 400,
                  color: r.eligibleReserveValueUsd > 0 ? '#2d6a4f' : '#9ca3af',
                }}>
                  {usd(r.eligibleReserveValueUsd)}
                </span>
              </td>
              <td style={{ ...td, maxWidth: 160 }}>
                {r.exclusionReason ? (
                  <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#b88a2f' }}>
                    {r.exclusionReason}
                  </span>
                ) : (
                  <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#2d6a4f' }}>ELIGIBLE</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Asset Row ────────────────────────────────────────────────────────────────

function AssetRow({ asset }: { asset: ApprovedReserveAsset }) {
  const isExcluded = !asset.isLive;
  return (
    <tr style={{ background: isExcluded ? '#fafafa' : '#ffffff', opacity: isExcluded ? 0.75 : 1 }}>
      <td style={td}>
        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px' }}>{asset.assetSymbol}</div>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280', marginTop: 2 }}>{asset.id}</div>
      </td>
      <td style={td}><StatusPill status={asset.status} /></td>
      <td style={td}><div style={{ fontFamily: 'monospace', fontSize: '11px' }}>{asset.sleeve}</div></td>
      <td style={{ ...td, textAlign: 'right' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>{usd(asset.grossValueUsd)}</div>
      </td>
      <td style={{ ...td, textAlign: 'right' }}>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '12px',
          color: asset.eligibleReserveValueUsd > 0 ? '#2d6a4f' : '#9ca3af',
          fontWeight: asset.eligibleReserveValueUsd > 0 ? 700 : 400,
        }}>
          {usd(asset.eligibleReserveValueUsd)}
        </div>
      </td>
      <td style={td}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px' }}>{bps(asset.haircutPolicy.haircutBps)}</div>
        {asset.haircutPolicy.emergencyDisabled && (
          <div style={{ color: '#991b1b', fontSize: '10px', fontWeight: 700 }}>⚠ EMERGENCY DISABLED</div>
        )}
        {asset.haircutPolicy.manualReviewRequired && (
          <div style={{ color: '#b88a2f', fontSize: '10px' }}>⚑ MANUAL REVIEW</div>
        )}
      </td>
      <td style={td}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Flag active={asset.isLive} label="Live" />
          <Flag active={asset.isRedeemable} label="Redeemable" />
          <Flag active={asset.isMintEligible} label="Mint Eligible" />
        </div>
      </td>
      <td style={td}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#374151' }}>{asset.valuationSource}</div>
      </td>
      <td style={td}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px' }}>
          <StatusPill status={asset.custody.attestationStatus} />
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280', marginTop: 2 }}>
          {asset.custody.custodyVenue}
        </div>
      </td>
      <td style={{ ...td, maxWidth: 220 }}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280', lineHeight: 1.4 }}>
          {asset.adminNotes}
        </div>
      </td>
    </tr>
  );
}

// ── Sleeve Section ────────────────────────────────────────────────────────────

function SleeveSection({ sleeve }: { sleeve: ReserveSleeveAggregate }) {
  const isEligible = sleeve.isEligibleForAxusdBacking;
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #1e3a5f', paddingBottom: 6, marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: 700, margin: 0 }}>{sleeve.sleeveName}</h3>
        <StatusPill status={isEligible ? 'LIVE' : 'INTERNAL_ONLY'} />
        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }}>{sleeve.sleeve}</span>
        {!isEligible && (
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#991b1b', fontWeight: 700 }}>
            ⚠ EXCLUDED FROM AXUSD BACKING
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        {[
          { label: 'Gross Value (Live)', value: usd(sleeve.grossValueUsd) },
          { label: 'Eligible Reserve Value', value: usd(sleeve.eligibleReserveValueUsd), highlight: isEligible },
          { label: 'Live Assets', value: String(sleeve.liveAssetCount) },
          { label: 'Planned Assets', value: String(sleeve.plannedAssetCount) },
        ].map(m => (
          <div key={m.label} style={{ border: '1px solid #ccc', padding: '8px 12px', background: '#f9fafb' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: (m as any).highlight ? '#2d6a4f' : '#1e3a5f' }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
      {sleeve.disclosureCaution && (
        <div style={{ background: '#fffbeb', border: '1px solid #b88a2f', padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#6b4c1e', marginBottom: 12 }}>
          ⚑ {sleeve.disclosureCaution}
        </div>
      )}
      {sleeve.assets.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#1e3a5f' }}>
              {['Asset', 'Status', 'Sleeve', 'Gross Value', 'Eligible Value', 'Haircut', 'Flags', 'Valuation', 'Attestation', 'Notes'].map(h => (
                <th key={h} style={{ color: '#fff', fontFamily: 'monospace', fontSize: '10px', padding: '6px 8px', textAlign: 'left', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sleeve.assets.map(asset => <AssetRow key={asset.id} asset={asset} />)}
          </tbody>
        </table>
      ) : (
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#9ca3af', padding: '8px 0' }}>
          No assets registered in this sleeve.
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReserveRegistryPage({ summary, attestation, oracleSources, loadError }: Props) {
  if (loadError) {
    return (
      <OperatorConsoleLayout title="Reserve Registry — Error">
        <div style={{ background: '#fee2e2', border: '1px solid #991b1b', padding: 16, fontFamily: 'monospace' }}>
          <strong>Failed to load reserve registry:</strong> {loadError}
        </div>
      </OperatorConsoleLayout>
    );
  }

  const attSummary = attestation.summary;
  const valuationResults = summary.valuationResults ?? [];
  const staleValueUsd = (summary as any).staleValueUsd ?? 0;
  const manualReviewValueUsd = (summary as any).manualReviewValueUsd ?? 0;
  const fallbackValuedAmountUsd = (summary as any).fallbackValuedAmountUsd ?? 0;

  return (
    <OperatorConsoleLayout title="Reserve Registry">
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0 64px' }}>

        {/* Header */}
        <div style={{ borderBottom: '2px solid #1e3a5f', marginBottom: 24, paddingBottom: 12 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 700, margin: 0 }}>
            AXUSD Reserve and Collateral Registry
          </h1>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b7280', marginTop: 4 }}>
            Phase 2/3 — Reserve Asset Registry with Oracle and NAV Adapter Architecture · Operator View
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af', marginTop: 2 }}>
            Fetched: {summary.fetchedAt}
          </div>
        </div>

        {/* Warnings */}
        {summary.warnings.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #b88a2f', padding: '10px 14px', marginBottom: 24 }}>
            {summary.warnings.map((w, i) => (
              <div key={i} style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b4c1e' }}>⚑ {w}</div>
            ))}
          </div>
        )}

        {/* Canonical Source Separation Banner */}
        <div style={{ background: '#f0f4ff', border: '1px solid #1e3a5f', padding: '12px 16px', marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'CanonicalPSM', desc: 'Live USDC mint/redeem backing. Source of truth for AXUSD supply.', color: '#2d6a4f' },
            { label: 'ReserveManager (Phase 2/3)', desc: 'Reserve accounting + Phase 3 oracle valuation layer. Aggregates registry.', color: '#1e3a5f' },
            { label: 'AxiomTreasuryVault', desc: 'Internal operator capital management. EXCLUDED from AXUSD backing.', color: '#991b1b' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: s.color, fontWeight: 700, marginBottom: 2 }}>{s.label.toUpperCase()}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#374151' }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Phase 3 Valuation Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Eligible Reserve',            value: usd(summary.eligibleReserveValueUsd),  color: '#2d6a4f' },
            { label: 'Canonical PSM',                value: usd(summary.canonicalPsmReserveUsd),   color: '#2d6a4f' },
            { label: 'Haircut Adjusted',             value: usd((summary as any).haircutAdjustedReserveValueUsd), color: '#2d6a4f' },
            { label: 'Planned (Excluded)',            value: usd(summary.plannedGrossValueUsd),     color: '#b88a2f' },
            { label: 'Operator Treasury (Excl.)',     value: usd(summary.operatorTreasuryValueUsd), color: '#991b1b' },
            { label: 'Stale Valuation (Excl.)',       value: usd(staleValueUsd),                    color: '#991b1b' },
            { label: 'Manual Review (Excl.)',         value: usd(manualReviewValueUsd),             color: '#b88a2f' },
            { label: 'Fallback-Valued',               value: usd(fallbackValuedAmountUsd),          color: '#6b4c1e' },
            { label: 'Total Registered Assets',       value: String(summary.totalAssetCount),       color: '#1e3a5f' },
          ].map(m => (
            <div key={m.label} style={{ border: '1px solid #d1d5db', padding: '8px 10px', background: '#ffffff' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Attestation Summary */}
        <div style={{ border: '1px solid #d1d5db', padding: '12px 16px', marginBottom: 28, background: '#f9fafb' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: 700, marginBottom: 10 }}>Attestation Status Overview</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Current', value: attSummary.current, color: '#2d6a4f' },
              { label: 'Pending', value: attSummary.pending, color: '#b88a2f' },
              { label: 'Stale', value: attSummary.stale, color: '#991b1b' },
              { label: 'Failed', value: attSummary.failed, color: '#991b1b' },
              { label: 'Manual Review', value: attSummary.manualReview, color: '#b88a2f' },
              { label: 'None', value: attSummary.none, color: '#9ca3af' },
            ].map(s => (
              <div key={s.label} style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                <span style={{ color: s.color, fontWeight: 700 }}>{s.value}</span>{' '}
                <span style={{ color: '#6b7280' }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af', marginTop: 8 }}>
            Phase 3: attestation publisher stubs wired. All assets show NONE pending deployment of custodian proof sources.
          </div>
        </div>

        {/* Phase 4: Live Oracle Feed */}
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '16px', fontWeight: 700, marginBottom: 16, borderBottom: '1px solid #d1d5db', paddingBottom: 8 }}>
          Phase 4 — Oracle Health &amp; Live Price Feed
        </h2>
        <OracleLiveFeedPanel />

        {/* Phase 3: Oracle Source Registry */}
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '16px', fontWeight: 700, marginBottom: 16, borderBottom: '1px solid #d1d5db', paddingBottom: 8 }}>
          Phase 3 — Oracle and NAV Adapter Layer
        </h2>
        <OracleHealthPanel sources={oracleSources} />

        {/* Phase 3: Valuation Results */}
        {valuationResults.length > 0 && <ValuationResultPanel results={valuationResults} />}

        {/* Methodology */}
        <div style={{ background: '#f9fafb', border: '1px solid #d1d5db', padding: '10px 14px', marginBottom: 32, fontFamily: 'monospace', fontSize: '11px', color: '#374151', lineHeight: 1.6 }}>
          <strong>Methodology:</strong> {summary.methodology}
        </div>

        {/* Sleeve sections */}
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '16px', fontWeight: 700, marginBottom: 20, borderBottom: '1px solid #d1d5db', paddingBottom: 8 }}>
          Reserve Sleeves
        </h2>
        {summary.sleeves.map(sleeve => <SleeveSection key={sleeve.sleeve} sleeve={sleeve} />)}

        {/* Phase 4: Governance Admission Log */}
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '16px', fontWeight: 700, marginBottom: 16, borderBottom: '1px solid #d1d5db', paddingBottom: 8 }}>
          Phase 4 — Governance Admission Record
        </h2>
        <AdmissionLogPanel />

        {/* Compliance gaps */}
        <div style={{ border: '1px solid #b88a2f', background: '#fffbeb', padding: '14px 16px', marginTop: 32 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: 700, marginBottom: 10 }}>
            Phase 1 Compliance Gaps — Phase 3 Blockers for T-Bill Integration
          </div>
          {[
            { module: 'LendingPlatformModule', gap: 'Whitelist does not enforce platform restrictions. TOKENIZED_TBILL sleeve cannot rely on on-chain compliance gating alone.' },
            { module: 'CountryAllowModule', gap: 'Treats country code 0 as pass-through. Future T-Bill participants must be verified off-chain until this is fixed.' },
            { module: 'TransferLimitModule', gap: 'Defines institutional tier 3 but does not operationally assign it. Transfer limit controls are not fully operational for T-Bill holders.' },
          ].map(c => (
            <div key={c.module} style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#1e3a5f' }}>{c.module}</span>
              {' — '}
              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b4c1e' }}>{c.gap}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, borderTop: '1px solid #d1d5db', paddingTop: 12, fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af' }}>
          OPERATOR INTERNAL USE ONLY · Phase 2/3 Reserve Registry + Oracle Architecture · Not a public investment product ·
          Tokenized Treasury backing is planned infrastructure, not current AXUSD backing ·
          AxiomTreasuryVault AUM is excluded from AXUSD coverage per governance invariant
        </div>
      </div>
    </OperatorConsoleLayout>
  );
}
