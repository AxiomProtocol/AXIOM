/**
 * MIRDT DESIGN GATE CHECKLIST
 * ────────────────────────────
 * [x] Light mode only — no dark theme
 * [x] Data-grid first — DataTable is primary element
 * [x] Pagination required — PaginationControls present
 * [x] No infinite scroll
 * [x] No toast notifications for normal operations
 * [x] No shimmer/skeleton loaders
 * [x] No animated counters
 * [x] No gradients
 * [x] All outputs probabilistic with explicit invalidation triggers
 * [x] Risk disclosure visible on page
 * [x] No prohibited vocabulary (lexicon guard enforced)
 * [x] Setup records link to immutable-style audit artifacts (data_snapshot_ref)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  DesignLawLayout,
  PageShell,
  DataTable,
  StatusBadge,
  PaginationControls,
  DisclosureBlock,
  DLSelect,
  FormField,
  SectionHeading,
} from '../../components/design-law';
import type { Column } from '../../components/design-law';

interface Setup {
  id: string;
  created_at: string;
  asset_type: string;
  symbol: string;
  venue: string;
  horizon_days: number;
  entry_zone_low: string;
  entry_zone_high: string;
  invalidation_price: string;
  thesis_summary: string;
  confidence_score: number;
  signal_z: string;
  expected_p5: string;
  expected_p50: string;
  expected_p95: string;
  volatility_estimate: string;
  liquidity_notes: string;
  model_version: string;
  data_snapshot_ref: string;
  rationale_trace_json: any;
  status: string;
  expires_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const RISK_DISCLOSURE =
  'All analysis presented on this terminal is probabilistic and backward-looking. Setups represent ' +
  'statistical observations derived from historical market data and do not constitute investment ' +
  'recommendations, solicitations, or advice. Axiom Protocol does not provide investment advice. ' +
  'Market conditions change without notice. All capital deployment decisions carry inherent risk ' +
  'of partial or total loss. Users should consult qualified financial professionals before making ' +
  'any investment decisions.';

const FOOTER_DISCLOSURE =
  'RISK DISCLOSURE: All analysis is probabilistic and backward-looking. Setups represent statistical ' +
  'observations, not investment recommendations. Axiom Protocol does not provide investment advice. ' +
  'All capital deployment decisions carry risk of loss.';

function formatPrice(value: string | number | null | undefined, assetType: string): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  const decimals = assetType === 'CRYPTO' ? (num < 1 ? 8 : num < 100 ? 4 : 2) : 2;
  return num.toFixed(decimals);
}

function formatAssetType(type: string): string {
  if (type === 'CRYPTO') return 'Digital Assets';
  if (type === 'EQUITY') return 'Equities';
  return type;
}

function formatUTC(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

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

export default function MIRDTIndex() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ACTIVE');
  const [assetType, setAssetType] = useState('');
  const [setups, setSetups] = useState<Setup[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefreshSec, setAutoRefreshSec] = useState(0);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const [scanOp, setScanOp] = useState<OpState>({ status: 'idle', message: '', lastRun: '' });
  const [invalidationOp, setInvalidationOp] = useState<OpState>({ status: 'idle', message: '', lastRun: '' });
  const [expireOp, setExpireOp] = useState<OpState>({ status: 'idle', message: '', lastRun: '' });
  const [fullCycleOp, setFullCycleOp] = useState<OpState>({ status: 'idle', message: '', lastRun: '' });

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (status) params.set('status', status);
    if (assetType) params.set('assetType', assetType);

    fetch(`/api/mirdt/setups?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSetups(data.setups || []);
          setPagination(data.pagination || null);
          if (data.setups && data.setups.length > 0) {
            setLastScan(formatUTC(data.setups[0].created_at));
          }
        }
      })
      .catch(() => setError('Failed to connect to server'))
      .finally(() => setLoading(false));
  }, [page, status, assetType]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [status, assetType]);

  useEffect(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
    if (autoRefreshSec > 0) {
      autoRefreshRef.current = setInterval(() => {
        setRefreshKey(k => k + 1);
      }, autoRefreshSec * 1000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
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
        const details = formatOpResult(label, data);
        setter({
          status: 'success',
          message: details,
          lastRun: new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'),
        });
        setRefreshKey(k => k + 1);
      } else {
        setter({
          status: 'error',
          message: data.error || `${label} failed`,
          lastRun: new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'),
        });
      }
    } catch (err: any) {
      setter({
        status: 'error',
        message: err.message || 'Network error',
        lastRun: new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'),
      });
    }
  };

  const formatOpResult = (label: string, data: any): string => {
    if (label === 'Market Scan') {
      return `Scanned ${data.assetsScanned || 0} assets, generated ${data.setupsGenerated || 0} setups`;
    }
    if (label === 'Invalidation Check') {
      return `Checked ${data.checkedCount || 0} setups, ${data.invalidatedCount || 0} invalidated`;
    }
    if (label === 'Expiration Sweep') {
      return `${data.expiredCount || 0} setups marked expired`;
    }
    if (label === 'Full Cycle') {
      const results = data.results || [];
      return results.map((r: any) => `${r.step}: ${r.success ? 'OK' : 'FAIL'}`).join(' | ');
    }
    return 'Complete';
  };

  const columns: Column<Setup>[] = [
    {
      key: 'symbol',
      header: 'Symbol',
      render: (s) => <span className="font-medium text-dl-navy">{s.symbol}</span>,
    },
    {
      key: 'asset_type',
      header: 'Asset Class',
      render: (s) => <span className="text-dl-gray">{formatAssetType(s.asset_type)}</span>,
    },
    {
      key: 'horizon',
      header: 'Horizon (days)',
      align: 'right',
      render: (s) => <span className="font-dl-mono">{s.horizon_days}</span>,
    },
    {
      key: 'entry_zone',
      header: 'Entry Zone',
      align: 'right',
      render: (s) => (
        <span className="font-dl-mono">
          {formatPrice(s.entry_zone_low, s.asset_type)} — {formatPrice(s.entry_zone_high, s.asset_type)}
        </span>
      ),
    },
    {
      key: 'invalidation',
      header: 'Invalidation',
      align: 'right',
      render: (s) => <span className="font-dl-mono">{formatPrice(s.invalidation_price, s.asset_type)}</span>,
    },
    {
      key: 'confidence',
      header: 'Confidence',
      align: 'right',
      render: (s) => <span className="font-dl-mono">{s.confidence_score}%</span>,
    },
    {
      key: 'signal_z',
      header: 'Signal Z',
      align: 'right',
      render: (s) => <span className="font-dl-mono">{parseFloat(s.signal_z).toFixed(2)}</span>,
    },
    {
      key: 'expected',
      header: 'P5 / P50 / P95',
      align: 'right',
      render: (s) => (
        <span className="font-dl-mono text-xs">
          {formatPrice(s.expected_p5, s.asset_type)} / {formatPrice(s.expected_p50, s.asset_type)} / {formatPrice(s.expected_p95, s.asset_type)}
        </span>
      ),
    },
    {
      key: 'volatility',
      header: 'Volatility',
      align: 'right',
      render: (s) => <span className="font-dl-mono">{(parseFloat(s.volatility_estimate) * 100).toFixed(1)}%</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'created_at',
      header: 'Created (UTC)',
      render: (s) => <span className="font-dl-mono text-xs text-dl-gray">{formatUTC(s.created_at)}</span>,
    },
  ];

  return (
    <DesignLawLayout>
    <PageShell
      title="Market Intelligence &amp; Risk Disclosure Terminal"
      subtitle="Probabilistic trend-following analysis with full audit trail. Past patterns do not guarantee future outcomes."
      timestamp={lastScan || undefined}
      timestampLabel="Last scan"
      disclosure={FOOTER_DISCLOSURE}
    >
      <div className="border border-dl-border bg-dl-bg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <SectionHeading>Operations</SectionHeading>
            <Link href="/mirdt/execution" className="px-3 py-1 bg-dl-forest text-white font-dl-mono text-xs">
              EXECUTION CONSOLE
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-dl-mono text-dl-gray">AUTO-REFRESH</span>
            <select
              value={autoRefreshSec}
              onChange={(e) => setAutoRefreshSec(Number(e.target.value))}
              className="px-2 py-1 border border-dl-border bg-white text-dl-navy font-dl-mono text-xs"
            >
              {AUTO_REFRESH_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {autoRefreshSec > 0 && (
              <span className="text-xs font-dl-mono text-dl-forest">ACTIVE</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="border border-dl-border p-3">
            <p className="text-xs font-dl-mono text-dl-gray mb-2">FULL CYCLE</p>
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
            <p className="text-xs font-dl-mono text-dl-gray mb-2">MARKET SCAN</p>
            <button
              onClick={() => runOperation('/api/ops/trigger', setScanOp, 'Market Scan', { operation: 'run-scan' })}
              disabled={scanOp.status === 'running'}
              className="w-full px-3 py-2 bg-dl-navy text-white font-dl-mono text-xs disabled:bg-dl-gray"
            >
              {scanOp.status === 'running' ? 'SCANNING...' : 'RUN SCAN'}
            </button>
            {scanOp.message && (
              <p className={`text-xs mt-1 font-dl-mono ${scanOp.status === 'error' ? 'text-dl-error' : scanOp.status === 'success' ? 'text-dl-forest' : 'text-dl-gray'}`}>
                {scanOp.message}
              </p>
            )}
          </div>

          <div className="border border-dl-border p-3">
            <p className="text-xs font-dl-mono text-dl-gray mb-2">CHECK INVALIDATIONS</p>
            <button
              onClick={() => runOperation('/api/ops/trigger', setInvalidationOp, 'Invalidation Check', { operation: 'check-invalidations' })}
              disabled={invalidationOp.status === 'running'}
              className="w-full px-3 py-2 bg-dl-navy text-white font-dl-mono text-xs disabled:bg-dl-gray"
            >
              {invalidationOp.status === 'running' ? 'CHECKING...' : 'CHECK NOW'}
            </button>
            {invalidationOp.message && (
              <p className={`text-xs mt-1 font-dl-mono ${invalidationOp.status === 'error' ? 'text-dl-error' : invalidationOp.status === 'success' ? 'text-dl-forest' : 'text-dl-gray'}`}>
                {invalidationOp.message}
              </p>
            )}
          </div>

          <div className="border border-dl-border p-3">
            <p className="text-xs font-dl-mono text-dl-gray mb-2">EXPIRE STALE SETUPS</p>
            <button
              onClick={() => runOperation('/api/ops/trigger', setExpireOp, 'Expiration Sweep', { operation: 'mark-expired' })}
              disabled={expireOp.status === 'running'}
              className="w-full px-3 py-2 bg-dl-navy text-white font-dl-mono text-xs disabled:bg-dl-gray"
            >
              {expireOp.status === 'running' ? 'SWEEPING...' : 'MARK EXPIRED'}
            </button>
            {expireOp.message && (
              <p className={`text-xs mt-1 font-dl-mono ${expireOp.status === 'error' ? 'text-dl-error' : expireOp.status === 'success' ? 'text-dl-forest' : 'text-dl-gray'}`}>
                {expireOp.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6 border-b border-dl-border-light pb-4">
        <FormField label="Status">
          <DLSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="INVALIDATED">Invalidated</option>
          </DLSelect>
        </FormField>
        <FormField label="Asset Class">
          <DLSelect value={assetType} onChange={(e) => setAssetType(e.target.value)}>
            <option value="">All</option>
            <option value="CRYPTO">Digital Assets</option>
            <option value="EQUITY">Equities</option>
          </DLSelect>
        </FormField>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="px-3 py-2 border border-dl-border bg-white text-dl-navy font-dl-mono text-xs"
        >
          REFRESH DATA
        </button>
        <div className="ml-auto">
          <DisclosureBlock text={RISK_DISCLOSURE} />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-dl-gray py-12 text-center">Loading data...</p>
      ) : error ? (
        <p className="text-sm text-dl-error py-12 text-center">{error}</p>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={setups}
            keyExtractor={(s) => s.id}
            onRowClick={(s) => router.push(`/mirdt/${s.id}`)}
            emptyMessage="No setups found for the selected criteria."
          />

          {pagination && (
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
              itemLabel="setups"
            />
          )}
        </>
      )}
    </PageShell>
    </DesignLawLayout>
  );
}
