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
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  PageShell,
  DataTable,
  StatusBadge,
  PaginationControls,
  DisclosureBlock,
  DLSelect,
  FormField,
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

export default function MIRDTIndex() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [assetType, setAssetType] = useState('');
  const [setups, setSetups] = useState<Setup[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string>('');

  useEffect(() => {
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
    setPage(1);
  }, [status, assetType]);

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
    <PageShell
      title="Market Intelligence &amp; Risk Disclosure Terminal"
      subtitle="Probabilistic trend-following analysis with full audit trail. Past patterns do not guarantee future outcomes."
      timestamp={lastScan || undefined}
      timestampLabel="Last scan"
      disclosure={FOOTER_DISCLOSURE}
    >
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
  );
}
