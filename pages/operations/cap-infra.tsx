/**
 * /operations/cap-infra — Capital Infrastructure operator console.
 *
 * Wraps the existing Cap-Infra read endpoints in a single
 * Design-Law-styled page so compliance and treasury operators do not
 * have to use curl. Sections:
 *   1. Asset registry summary (GET /api/capinfra/operator/assets/summary)
 *   2. Audit-event search          (GET /api/capinfra/operator/audit)
 *   3. Eligibility inspect probe   (POST /api/capinfra/operator/eligibility/inspect)
 *
 * Auth: re-uses the operator cookie set by /operator/login. The cookie
 * value IS the admin key, so server-side props read it, validate via
 * `requireOperatorCookie`, and forward it to the client where it is
 * sent back as `x-admin-key` on every API call. Same pattern as
 * /admin/oracle-fallbacks.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { DesignLawLayout, CollateralClassBadge } from '../../components/design-law';
import {
  readOperatorCookie,
  isValidOperatorKey,
} from '../../lib/capinfra/operatorAuth';
import {
  ASSET_CSV_HEADER,
  buildAssetCsvRow,
  escapeCsvCell,
  fmtTs,
} from '../../lib/capinfra/assetCsv';

interface PageProps {
  operatorKey: string;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const cookieKey = readOperatorCookie(ctx.req);
  if (!isValidOperatorKey(cookieKey)) {
    return {
      redirect: {
        destination: `/operator/login?next=${encodeURIComponent(ctx.resolvedUrl)}`,
        permanent: false,
      },
    };
  }
  if (ctx.res) ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  return { props: { operatorKey: cookieKey as string } };
};

// ─── Types mirroring the API responses ─────────────────────────────

interface Asset {
  id: string;
  symbol: string;
  displayName: string;
  assetType: string;
  assetSubtype?: string | null;
  custodyModel: string;
  settlementType: string;
  status: string;
  exposureClass?: string | null;
  collateralClass?: 'GREEN' | 'YELLOW' | 'RED' | null;
  collateralClassificationRationale?: string | null;
  chain?: string | null;
  contractAddress?: string | null;
  issuer?: string | null;
}

interface LatestSpot {
  price: string;
  source: string;
  observedAt: string;
  isStale?: boolean;
}

interface ReserveSnapshot {
  id: string;
  assetId: string;
  observedAt: string;
  totalReserveQty?: string | null;
  totalLiabilityQty?: string | null;
}

interface AssetSummaryRow {
  asset: Asset;
  latestSpot: LatestSpot | null;
  latestReserve: ReserveSnapshot | null;
  auditEventCount: number;
}

interface AssetSummaryResponse {
  items: AssetSummaryRow[];
}

interface AuditEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  actor: string;
  userId?: string | null;
  legalName?: string | null;
  assetId?: string | null;
  instructionId?: string | null;
  payloadJson?: Record<string, unknown> | null;
  occurredAt: string;
}

interface AuditListResponse {
  items: AuditEvent[];
  nextCursor: string | null;
}

interface PolicyDecision {
  allowed: boolean;
  reasonCode: string;
  policyVersion: string;
  evaluatedAt?: string;
  detailsJson?: Record<string, unknown> | null;
}

interface ClaimPosture {
  capClaims: Array<{
    claimType: string;
    status: string;
    issuer: string;
    issuedAt?: string | null;
    expiresAt?: string | null;
  }>;
  legacyKyc: unknown;
  legacyComplianceClaims: unknown;
}

interface EligibilityResponse {
  decision: PolicyDecision;
  claimPosture: ClaimPosture;
}

// ─── Helpers ───────────────────────────────────────────────────────

const ACTION_TYPES = [
  'MINT',
  'REDEEM',
  'TRANSFER',
  'BUY',
  'SELL',
  'STAKE',
  'UNSTAKE',
  'CUSTODY_MOVE',
  'BORROW',
];

async function callApi<T>(
  path: string,
  operatorKey: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'x-admin-key': operatorKey,
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.body && !headers['content-type']) headers['content-type'] = 'application/json';
  const r = await fetch(path, { ...init, headers });
  const text = await r.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!r.ok) {
    const msg =
      (body && typeof body === 'object' && 'message' in (body as object)
        ? String((body as { message?: unknown }).message ?? '')
        : '') ||
      (body && typeof body === 'object' && 'error' in (body as object)
        ? String((body as { error?: unknown }).error ?? '')
        : '') ||
      `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return body as T;
}

// ─── TypeAheadPicker ───────────────────────────────────────────────

interface Suggestion {
  label: string;
  value: string;
}

interface TypeAheadPickerProps {
  value: string;
  onChange: (v: string) => void;
  fetchSuggestions: (q: string) => Promise<Suggestion[]>;
  label: string;
  required?: boolean;
  placeholder?: string;
}

function TypeAheadPicker({
  value,
  onChange,
  fetchSuggestions,
  label,
  required,
  placeholder,
}: TypeAheadPickerProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [noResults, setNoResults] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleChange(raw: string) {
    onChange(raw);
    setHighlighted(-1);
    setFetchError(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (raw.trim().length < 2) {
      seqRef.current++;
      setSuggestions([]);
      setOpen(false);
      setNoResults(false);
      return;
    }
    const seq = ++seqRef.current;
    setNoResults(false);
    debounceRef.current = setTimeout(async () => {
      try {
        const s = await fetchSuggestions(raw.trim());
        if (seq !== seqRef.current) return;
        setSuggestions(s);
        setNoResults(s.length === 0);
        setFetchError(false);
        setOpen(true);
      } catch {
        if (seq !== seqRef.current) return;
        setSuggestions([]);
        setNoResults(false);
        setFetchError(true);
        setOpen(true);
      }
    }, 250);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function pick(s: Suggestion) {
    onChange(s.value);
    setSuggestions([]);
    setOpen(false);
    setHighlighted(-1);
    setNoResults(false);
    setFetchError(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      pick(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="block relative">
      <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">
        {label}
      </span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full border border-dl-border bg-dl-bg px-2 py-1.5 font-dl-mono text-xs text-dl-navy"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-px border border-dl-border bg-white shadow-md max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={s.value}
              onMouseDown={() => pick(s)}
              className={`px-2 py-1.5 font-dl-mono text-xs cursor-pointer ${
                i === highlighted
                  ? 'bg-dl-navy text-white'
                  : 'text-dl-navy hover:bg-dl-bg-alt'
              }`}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
      {open && suggestions.length === 0 && noResults && !fetchError && (
        <div
          role="status"
          className="absolute z-50 left-0 right-0 top-full mt-px border border-dl-border bg-white shadow-md px-2 py-1.5 font-dl-mono text-xs text-dl-gray"
        >
          No results
        </div>
      )}
      {open && fetchError && (
        <div
          role="alert"
          className="absolute z-50 left-0 right-0 top-full mt-px border border-dl-border bg-white shadow-md px-2 py-1.5 font-dl-mono text-xs text-red-700"
        >
          Lookup unavailable
        </div>
      )}
    </div>
  );
}

// ─── Section: Asset summary ────────────────────────────────────────

const ASSET_TYPE_OPTIONS = [
  'STABLE_ASSET',
  'PHYSICAL_METAL',
  'REAL_ESTATE',
  'CREDIT',
  'CARBON',
  'EQUITY',
  'TREASURY_BILL',
  'OTHER',
];

const ASSET_STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED', 'PENDING'];

export function AssetSummarySection({ operatorKey }: { operatorKey: string }) {
  const [rows, setRows] = useState<AssetSummaryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [csvLoading, setCsvLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState<
    | { kind: 'success'; rowCount: number; filename: string }
    | { kind: 'empty'; hasFilters: boolean }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [disableState, setDisableState] = useState<{
    asset: Asset;
    primaryActor: string;
    secondaryActor: string;
    reason: string;
    busy: boolean;
    error: string | null;
  } | null>(null);

  const onGuardianDisable = useCallback((asset: Asset) => {
    setDisableState({
      asset,
      primaryActor: '',
      secondaryActor: '',
      reason: '',
      busy: false,
      error: null,
    });
  }, []);

  const submitDisable = useCallback(async () => {
    if (!disableState) return;
    setDisableState((s) => (s ? { ...s, busy: true, error: null } : s));
    try {
      const r = await fetch('/api/capinfra/risk/collateral/disable', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-admin-key': operatorKey },
        body: JSON.stringify({
          assetId: disableState.asset.id,
          reason: disableState.reason,
          primaryActor: disableState.primaryActor,
          secondaryActor: disableState.secondaryActor,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      setDisableState(null);
      // Reload summary to reflect new RED state.
      window.dispatchEvent(new CustomEvent('capinfra:reload-assets'));
    } catch (e) {
      setDisableState((s) =>
        s ? { ...s, busy: false, error: e instanceof Error ? e.message : String(e) } : s,
      );
    }
  }, [disableState, operatorKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      const trimmedSymbol = filterSymbol.trim();
      if (trimmedSymbol) params.set('symbol', trimmedSymbol);
      const qs = params.toString();
      const data = await callApi<AssetSummaryResponse>(
        `/api/capinfra/operator/assets/summary${qs ? `?${qs}` : ''}`,
        operatorKey,
      );
      setRows(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [operatorKey, filterType, filterStatus, filterSymbol]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onReload = () => { void load(); };
    window.addEventListener('capinfra:reload-assets', onReload);
    return () => window.removeEventListener('capinfra:reload-assets', onReload);
  }, [load]);

  const filteredRows = rows;

  const hasFilters = filterType !== '' || filterStatus !== '' || filterSymbol.trim() !== '';

  const downloadAssetCsv = useCallback(() => {
    setCsvLoading(true);
    setExportStatus(null);
    try {
      const rowsToExport = filteredRows ?? [];
      if (rowsToExport.length === 0) {
        setExportStatus({ kind: 'empty', hasFilters });
        return;
      }
      const csv = [ASSET_CSV_HEADER, ...rowsToExport.map(buildAssetCsvRow)].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      const parts = ['asset-registry'];
      if (filterStatus) parts.push(filterStatus);
      if (filterType) parts.push(filterType);
      parts.push(date);
      const filename = `${parts.join('-')}.csv`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus({ kind: 'success', rowCount: rowsToExport.length, filename });
    } finally {
      setCsvLoading(false);
    }
  }, [filteredRows, filterStatus, filterType, hasFilters]);

  return (
    <section className="mb-12">
      {disableState && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Guardian disable"
        >
          <div className="bg-white border border-dl-border w-full max-w-lg p-6">
            <h3 className="font-dl-serif text-lg text-dl-navy mb-2">
              Guardian Disable: {disableState.asset.symbol}
            </h3>
            <p className="text-xs text-dl-gray mb-4">
              Forces this asset to RED collateral immediately and emits a dual-actor admin
              action. Re-admission requires the audited policy publication flow — there is
              no inverse endpoint.
            </p>
            <label className="block mb-3">
              <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">
                Primary actor (you)
              </span>
              <input
                value={disableState.primaryActor}
                onChange={(e) =>
                  setDisableState((s) => (s ? { ...s, primaryActor: e.target.value } : s))
                }
                placeholder="ops.alice@axiom"
                className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs"
              />
            </label>
            <label className="block mb-3">
              <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">
                Secondary actor (witness, must be distinct)
              </span>
              <input
                value={disableState.secondaryActor}
                onChange={(e) =>
                  setDisableState((s) => (s ? { ...s, secondaryActor: e.target.value } : s))
                }
                placeholder="risk.bob@axiom"
                className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs"
              />
            </label>
            <label className="block mb-4">
              <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">
                Reason (≥ 8 chars)
              </span>
              <textarea
                value={disableState.reason}
                onChange={(e) =>
                  setDisableState((s) => (s ? { ...s, reason: e.target.value } : s))
                }
                rows={3}
                placeholder="Oracle divergence > 200bps observed at 14:02 UTC"
                className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs"
              />
            </label>
            {disableState.error && (
              <p className="font-dl-mono text-xs text-red-700 mb-3">
                Error: {disableState.error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDisableState(null)}
                disabled={disableState.busy}
                className="font-dl-mono text-xs uppercase tracking-wider border border-dl-border px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDisable}
                disabled={
                  disableState.busy ||
                  !disableState.primaryActor.trim() ||
                  !disableState.secondaryActor.trim() ||
                  disableState.reason.trim().length < 8
                }
                className="font-dl-mono text-xs uppercase tracking-wider bg-red-700 text-white px-3 py-1.5 disabled:opacity-50"
              >
                {disableState.busy ? 'Disabling…' : 'Disable → RED'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dl-serif text-xl text-dl-navy">Asset Registry</h2>
        <div className="flex items-center gap-2">
          {filteredRows && (
            <button
              onClick={downloadAssetCsv}
              disabled={csvLoading || loading}
              className="font-dl-mono text-xs uppercase tracking-wider border border-dl-border px-3 py-1.5 hover:bg-dl-bg-alt disabled:opacity-50"
            >
              {csvLoading ? 'Exporting…' : 'Download CSV'}
            </button>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="font-dl-mono text-xs uppercase tracking-wider border border-dl-border px-3 py-1.5 hover:bg-dl-bg-alt disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {rows && (
        <div className="flex items-end gap-3 mb-4 flex-wrap">
          <div>
            <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">
              Symbol
            </span>
            <input
              type="search"
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
              placeholder="Search symbol…"
              className="border border-dl-border bg-dl-bg px-2 py-1.5 font-dl-mono text-xs text-dl-navy"
            />
          </div>
          <div>
            <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">
              Type
            </span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-dl-border bg-dl-bg px-2 py-1.5 font-dl-mono text-xs text-dl-navy"
            >
              <option value="">All types</option>
              {ASSET_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">
              Status
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-dl-border bg-dl-bg px-2 py-1.5 font-dl-mono text-xs text-dl-navy"
            >
              <option value="">All statuses</option>
              {ASSET_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={() => { setFilterType(''); setFilterStatus(''); setFilterSymbol(''); }}
              className="font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray hover:text-dl-navy pb-1.5"
            >
              Clear
            </button>
          )}
          {filteredRows && rows && filteredRows.length !== rows.length && (
            <span className="font-dl-mono text-[10px] text-dl-gray pb-1.5">
              {filteredRows.length} of {rows.length} shown
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 border-l-4 border-l-red-500 border border-dl-border bg-red-50 p-3">
          <p className="font-dl-mono text-xs text-red-700">Error: {error}</p>
        </div>
      )}

      {exportStatus?.kind === 'success' && (
        <div
          role="status"
          className="mb-4 border-l-4 border-l-emerald-500 border border-emerald-200 bg-emerald-50 p-3"
        >
          <p className="font-dl-mono text-xs text-emerald-800">
            Exported {exportStatus.rowCount.toLocaleString('en-US')} asset
            {exportStatus.rowCount === 1 ? '' : 's'} to {exportStatus.filename}.
          </p>
        </div>
      )}
      {exportStatus?.kind === 'empty' && (
        <div
          role="status"
          className="mb-4 border-l-4 border-l-amber-500 border border-amber-200 bg-amber-50 p-3"
        >
          <p className="font-dl-mono text-xs text-amber-800">
            {exportStatus.hasFilters
              ? 'No assets match the current filters — nothing was exported. Adjust the filters and try again.'
              : 'No assets to export — the asset registry is empty.'}
          </p>
        </div>
      )}

      {!error && filteredRows && filteredRows.length === 0 && (
        <div className="border border-dl-border bg-dl-bg-alt p-6 text-sm text-dl-gray font-dl-mono text-center">
          {hasFilters ? 'No assets match the current filters.' : 'No active assets registered.'}
        </div>
      )}

      {filteredRows && filteredRows.length > 0 && (
        <div className="border border-dl-border overflow-x-auto">
          <table className="w-full font-dl-mono text-xs">
            <thead className="bg-dl-bg-alt border-b border-dl-border">
              <tr>
                <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Symbol</th>
                <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Name</th>
                <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Type</th>
                <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Custody</th>
                <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Settlement</th>
                <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Status</th>
                <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Collateral</th>
                <th className="px-3 py-2 text-right uppercase tracking-wider text-dl-gray">Spot</th>
                <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Spot Source</th>
                <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Spot As-Of</th>
                <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Last Reserve</th>
                <th className="px-3 py-2 text-right uppercase tracking-wider text-dl-gray">Audit Events</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={row.asset.id} className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
                  <td className="px-3 py-2 text-dl-navy font-bold">{row.asset.symbol}</td>
                  <td className="px-3 py-2 text-dl-navy">{row.asset.displayName}</td>
                  <td className="px-3 py-2 text-dl-gray">{row.asset.assetType}</td>
                  <td className="px-3 py-2 text-dl-gray">{row.asset.custodyModel}</td>
                  <td className="px-3 py-2 text-dl-gray">{row.asset.settlementType}</td>
                  <td className="px-3 py-2 text-dl-gray">{row.asset.status}</td>
                  <td className="px-3 py-2">
                    <CollateralClassBadge value={row.asset.collateralClass ?? 'RED'} />
                    {row.asset.collateralClass !== 'RED' && (
                      <button
                        type="button"
                        onClick={() => onGuardianDisable(row.asset)}
                        className="ml-2 font-dl-mono text-[10px] uppercase tracking-wider text-red-700 underline hover:no-underline"
                        title="Guardian disable: forces this asset to RED collateral immediately. Dual-actor required."
                      >
                        Disable
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-dl-navy">
                    {row.latestSpot ? row.latestSpot.price : <span className="text-dl-border">—</span>}
                  </td>
                  <td className="px-3 py-2 text-dl-gray">
                    {row.latestSpot ? row.latestSpot.source : <span className="text-dl-border">—</span>}
                  </td>
                  <td className="px-3 py-2 text-dl-gray whitespace-nowrap">
                    {row.latestSpot ? (
                      <span>
                        {fmtTs(row.latestSpot.observedAt)}
                        {row.latestSpot.isStale && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 border border-amber-400 bg-amber-50 text-amber-800 text-[10px] uppercase">
                            stale
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-dl-border">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-dl-gray whitespace-nowrap">
                    {row.latestReserve ? fmtTs(row.latestReserve.observedAt) : <span className="text-dl-border">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-dl-navy font-bold">{row.auditEventCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Section: Audit search ─────────────────────────────────────────

interface AuditFilters {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  userId: string;
  assetId: string;
  instructionId: string;
  from: string;
  to: string;
  limit: string;
}

const EMPTY_AUDIT: AuditFilters = {
  aggregateType: '',
  aggregateId: '',
  eventType: '',
  userId: '',
  assetId: '',
  instructionId: '',
  from: '',
  to: '',
  limit: '50',
};

function makeAssetFetcher(operatorKey: string) {
  return async (q: string): Promise<Suggestion[]> => {
    const params = new URLSearchParams({ symbol: q });
    const data = await callApi<{ items: Array<{ id: string; symbol: string; displayName: string }> }>(
      `/api/capinfra/assets?${params}`,
      operatorKey,
    );
    return (data.items ?? []).map((a) => ({
      label: `${a.symbol} — ${a.displayName} (${a.id})`,
      value: a.id,
    }));
  };
}

function makeUserFetcher(operatorKey: string) {
  return async (q: string): Promise<Suggestion[]> => {
    const params = new URLSearchParams({ q });
    const data = await callApi<{
      items: Array<{ id: string; primaryEmail: string | null; externalId: string | null; legalName: string | null }>;
    }>(`/api/capinfra/operator/users/search?${params}`, operatorKey);
    return (data.items ?? []).map((u) => {
      const namePart = u.legalName ? `${u.legalName} ` : '';
      const emailPart = u.primaryEmail ? `<${u.primaryEmail}> ` : u.externalId ? `ext:${u.externalId} ` : '';
      return {
        label: `${namePart}${emailPart}(${u.id})`,
        value: u.id,
      };
    });
  };
}

function buildCsvRow(ev: AuditEvent): string {
  return [
    fmtTs(ev.occurredAt),
    `${ev.aggregateType} ${ev.aggregateId}`,
    ev.eventType,
    ev.actor,
    ev.userId ?? '',
    ev.legalName ?? '',
    ev.assetId ?? '',
    ev.payloadJson != null ? JSON.stringify(ev.payloadJson) : '',
  ]
    .map(escapeCsvCell)
    .join(',');
}

const CSV_HEADER = 'When (UTC),Aggregate,Event,Actor,User,Legal Name,Asset,Payload';

function AuditSearchSection({ operatorKey }: { operatorKey: string }) {
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_AUDIT);
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState<
    | { kind: 'success'; rowCount: number; filename: string }
    | { kind: 'empty'; hasFilters: boolean }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function buildQuery(cursor?: string | null): string {
    const params = new URLSearchParams();
    (Object.keys(filters) as Array<keyof AuditFilters>).forEach((k) => {
      const v = filters[k].trim();
      if (!v) return;
      if (k === 'from' || k === 'to') {
        // datetime-local → ISO
        const d = new Date(v);
        if (!Number.isNaN(d.getTime())) params.set(k, d.toISOString());
        return;
      }
      params.set(k, v);
    });
    if (cursor) params.set('cursor', cursor);
    return params.toString();
  }

  const fetchAssets = useCallback(makeAssetFetcher(operatorKey), [operatorKey]);
  const fetchUsers = useCallback(makeUserFetcher(operatorKey), [operatorKey]);

  const search = useCallback(
    async (cursor: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const qs = buildQuery(cursor);
        const data = await callApi<AuditListResponse>(
          `/api/capinfra/operator/audit${qs ? `?${qs}` : ''}`,
          operatorKey,
        );
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setNextCursor(data.nextCursor ?? null);
        setHasSearched(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [operatorKey, filters],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setItems([]);
    setNextCursor(null);
    setExpanded({});
    setExportStatus(null);
    search(null);
  }

  function reset() {
    setFilters(EMPTY_AUDIT);
    setItems([]);
    setNextCursor(null);
    setError(null);
    setHasSearched(false);
    setExpanded({});
    setExportStatus(null);
  }

  const downloadCsv = useCallback(async () => {
    setCsvLoading(true);
    setError(null);
    setExportStatus(null);
    const hasFilters = (Object.keys(filters) as Array<keyof AuditFilters>).some(
      (k) => k !== 'limit' && filters[k].trim() !== '',
    );
    try {
      const rows: AuditEvent[] = [];
      let cursor: string | null = null;
      do {
        const qs = buildQuery(cursor);
        const data = await callApi<AuditListResponse>(
          `/api/capinfra/operator/audit${qs ? `?${qs}` : ''}`,
          operatorKey,
        );
        rows.push(...data.items);
        cursor = data.nextCursor ?? null;
      } while (cursor);

      if (rows.length === 0) {
        setExportStatus({ kind: 'empty', hasFilters });
        return;
      }

      const csv = [CSV_HEADER, ...rows.map(buildCsvRow)].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `audit-export-${ts}.csv`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus({ kind: 'success', rowCount: rows.length, filename });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCsvLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorKey, filters]);

  function update<K extends keyof AuditFilters>(k: K, v: string) {
    setFilters((f) => ({ ...f, [k]: v }));
  }

  return (
    <section className="mb-12">
      <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Audit Search</h2>
      <form
        onSubmit={onSubmit}
        className="border border-dl-border bg-dl-bg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4"
      >
        {([
          ['aggregateType', 'Aggregate Type'],
          ['aggregateId', 'Aggregate ID'],
          ['eventType', 'Event Type'],
          ['instructionId', 'Instruction ID'],
        ] as Array<[keyof AuditFilters, string]>).map(([k, label]) => (
          <label key={k} className="block">
            <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">
              {label}
            </span>
            <input
              type="text"
              value={filters[k]}
              onChange={(e) => update(k, e.target.value)}
              className="w-full border border-dl-border bg-dl-bg px-2 py-1.5 font-dl-mono text-xs text-dl-navy"
            />
          </label>
        ))}
        <TypeAheadPicker
          label="User ID"
          value={filters.userId}
          onChange={(v) => update('userId', v)}
          fetchSuggestions={fetchUsers}
          placeholder="email, wallet, or user ID"
        />
        <TypeAheadPicker
          label="Asset ID"
          value={filters.assetId}
          onChange={(v) => update('assetId', v)}
          fetchSuggestions={fetchAssets}
          placeholder="symbol or asset ID"
        />
        <label className="block">
          <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">
            From (UTC)
          </span>
          <input
            type="datetime-local"
            value={filters.from}
            onChange={(e) => update('from', e.target.value)}
            className="w-full border border-dl-border bg-dl-bg px-2 py-1.5 font-dl-mono text-xs text-dl-navy"
          />
        </label>
        <label className="block">
          <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">
            To (UTC)
          </span>
          <input
            type="datetime-local"
            value={filters.to}
            onChange={(e) => update('to', e.target.value)}
            className="w-full border border-dl-border bg-dl-bg px-2 py-1.5 font-dl-mono text-xs text-dl-navy"
          />
        </label>
        <label className="block">
          <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">
            Limit
          </span>
          <input
            type="number"
            min={1}
            max={500}
            value={filters.limit}
            onChange={(e) => update('limit', e.target.value)}
            className="w-full border border-dl-border bg-dl-bg px-2 py-1.5 font-dl-mono text-xs text-dl-navy"
          />
        </label>

        <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2 flex-wrap">
          <button
            type="submit"
            disabled={loading || csvLoading}
            className="font-dl-mono text-xs uppercase tracking-wider border border-dl-border bg-dl-navy text-white px-4 py-2 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={loading || csvLoading}
            className="font-dl-mono text-xs uppercase tracking-wider border border-dl-border px-4 py-2 hover:bg-dl-bg-alt disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={loading || csvLoading}
            className="font-dl-mono text-xs uppercase tracking-wider border border-dl-border px-4 py-2 hover:bg-dl-bg-alt disabled:opacity-50"
          >
            {csvLoading ? 'Exporting…' : 'Download CSV'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 border-l-4 border-l-red-500 border border-dl-border bg-red-50 p-3">
          <p className="font-dl-mono text-xs text-red-700">Error: {error}</p>
        </div>
      )}

      {exportStatus?.kind === 'success' && (
        <div
          role="status"
          className="mb-4 border-l-4 border-l-emerald-500 border border-emerald-200 bg-emerald-50 p-3"
        >
          <p className="font-dl-mono text-xs text-emerald-800">
            Exported {exportStatus.rowCount.toLocaleString('en-US')} audit event
            {exportStatus.rowCount === 1 ? '' : 's'} to {exportStatus.filename}.
          </p>
        </div>
      )}
      {exportStatus?.kind === 'empty' && (
        <div
          role="status"
          className="mb-4 border-l-4 border-l-amber-500 border border-amber-200 bg-amber-50 p-3"
        >
          <p className="font-dl-mono text-xs text-amber-800">
            {exportStatus.hasFilters
              ? 'No audit events match the current filters — nothing was exported. Adjust the filters and try again.'
              : 'No audit events to export — the audit log is empty.'}
          </p>
        </div>
      )}

      {hasSearched && !error && items.length === 0 && !loading && (
        <div className="border border-dl-border bg-dl-bg-alt p-6 text-sm text-dl-gray font-dl-mono text-center">
          No audit events match the filters.
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="border border-dl-border overflow-x-auto">
            <table className="w-full font-dl-mono text-xs">
              <thead className="bg-dl-bg-alt border-b border-dl-border">
                <tr>
                  <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">When (UTC)</th>
                  <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Aggregate</th>
                  <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Event</th>
                  <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Actor</th>
                  <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">User</th>
                  <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Asset</th>
                  <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Payload</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ev, i) => (
                  <Fragment key={ev.id}>
                    <tr className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
                      <td className="px-3 py-2 text-dl-navy whitespace-nowrap">{fmtTs(ev.occurredAt)}</td>
                      <td className="px-3 py-2 text-dl-gray">
                        <div className="text-dl-navy">{ev.aggregateType}</div>
                        <div className="text-[10px] text-dl-gray break-all">{ev.aggregateId}</div>
                      </td>
                      <td className="px-3 py-2 text-dl-navy">{ev.eventType}</td>
                      <td className="px-3 py-2 text-dl-gray">{ev.actor}</td>
                      <td className="px-3 py-2 text-dl-gray">
                        {ev.userId ? (
                          <div>
                            <div className="break-all">{ev.userId}</div>
                            {ev.legalName && (
                              <div className="text-[10px] text-dl-navy font-medium mt-0.5">{ev.legalName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-dl-border">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-dl-gray">{ev.assetId ?? <span className="text-dl-border">—</span>}</td>
                      <td className="px-3 py-2">
                        {ev.payloadJson ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((m) => ({ ...m, [ev.id]: !m[ev.id] }))
                            }
                            className="text-dl-navy underline text-[11px]"
                          >
                            {expanded[ev.id] ? 'Hide' : 'View'}
                          </button>
                        ) : (
                          <span className="text-dl-border">—</span>
                        )}
                      </td>
                    </tr>
                    {expanded[ev.id] && ev.payloadJson && (
                      <tr className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
                        <td colSpan={7} className="px-3 py-2 border-t border-dl-border">
                          <pre className="text-[11px] text-dl-navy whitespace-pre-wrap break-all">
                            {JSON.stringify(ev.payloadJson, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="font-dl-mono text-xs text-dl-gray">
              {items.length} event{items.length === 1 ? '' : 's'} loaded
            </span>
            {nextCursor ? (
              <button
                onClick={() => search(nextCursor)}
                disabled={loading}
                className="font-dl-mono text-xs uppercase tracking-wider border border-dl-border px-4 py-2 hover:bg-dl-bg-alt disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Load more →'}
              </button>
            ) : (
              <span className="font-dl-mono text-xs text-dl-gray">End of results</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}

// ─── Section: Eligibility inspect ──────────────────────────────────

interface EligibilityForm {
  userId: string;
  assetId: string;
  actionType: string;
  amount: string;
  jurisdiction: string;
}

const EMPTY_ELIG: EligibilityForm = {
  userId: '',
  assetId: '',
  actionType: 'BUY',
  amount: '',
  jurisdiction: '',
};

function EligibilityInspectSection({ operatorKey }: { operatorKey: string }) {
  const [form, setForm] = useState<EligibilityForm>(EMPTY_ELIG);
  const [result, setResult] = useState<EligibilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(makeAssetFetcher(operatorKey), [operatorKey]);
  const fetchUsers = useCallback(makeUserFetcher(operatorKey), [operatorKey]);

  function update<K extends keyof EligibilityForm>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, string> = {
        userId: form.userId.trim(),
        assetId: form.assetId.trim(),
        actionType: form.actionType,
      };
      if (form.amount.trim()) body.amount = form.amount.trim();
      if (form.jurisdiction.trim()) body.jurisdiction = form.jurisdiction.trim().toUpperCase();
      const data = await callApi<EligibilityResponse>(
        '/api/capinfra/operator/eligibility/inspect',
        operatorKey,
        { method: 'POST', body: JSON.stringify(body) },
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-12">
      <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Eligibility Inspect</h2>
      <p className="text-sm text-dl-gray mb-4">
        Probe runs against live policy with <code className="font-dl-mono">productContext=operator-inspector</code>{' '}
        and is recorded in the audit log.
      </p>
      <form
        onSubmit={onSubmit}
        className="border border-dl-border bg-dl-bg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4"
      >
        <TypeAheadPicker
          label="User ID *"
          required
          value={form.userId}
          onChange={(v) => update('userId', v)}
          fetchSuggestions={fetchUsers}
          placeholder="email, wallet, or user ID"
        />
        <TypeAheadPicker
          label="Asset ID *"
          required
          value={form.assetId}
          onChange={(v) => update('assetId', v)}
          fetchSuggestions={fetchAssets}
          placeholder="symbol or asset ID"
        />
        <label className="block">
          <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">Action *</span>
          <select
            value={form.actionType}
            onChange={(e) => update('actionType', e.target.value)}
            className="w-full border border-dl-border bg-dl-bg px-2 py-1.5 font-dl-mono text-xs text-dl-navy"
          >
            {ACTION_TYPES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">Amount</span>
          <input
            type="text"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => update('amount', e.target.value)}
            placeholder="optional"
            className="w-full border border-dl-border bg-dl-bg px-2 py-1.5 font-dl-mono text-xs text-dl-navy"
          />
        </label>
        <label className="block">
          <span className="block font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">Jurisdiction</span>
          <input
            type="text"
            maxLength={8}
            value={form.jurisdiction}
            onChange={(e) => update('jurisdiction', e.target.value)}
            placeholder="ISO-3166 (optional)"
            className="w-full border border-dl-border bg-dl-bg px-2 py-1.5 font-dl-mono text-xs text-dl-navy uppercase"
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="font-dl-mono text-xs uppercase tracking-wider border border-dl-border bg-dl-navy text-white px-4 py-2 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Evaluating…' : 'Evaluate'}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY_ELIG);
              setResult(null);
              setError(null);
            }}
            className="font-dl-mono text-xs uppercase tracking-wider border border-dl-border px-4 py-2 hover:bg-dl-bg-alt"
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 border-l-4 border-l-red-500 border border-dl-border bg-red-50 p-3">
          <p className="font-dl-mono text-xs text-red-700">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div
            className={`border-l-4 border border-dl-border p-4 ${
              result.decision.allowed ? 'border-l-green-600 bg-green-50' : 'border-l-red-600 bg-red-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-dl-serif text-lg text-dl-navy">
                {result.decision.allowed ? 'ALLOWED' : 'DENIED'}
              </span>
              <span className="font-dl-mono text-xs text-dl-gray">
                policy {result.decision.policyVersion}
              </span>
            </div>
            <div className="font-dl-mono text-xs text-dl-navy mb-1">
              Reason: <span className="font-bold">{result.decision.reasonCode}</span>
            </div>
            {result.decision.detailsJson && (
              <details className="mt-2">
                <summary className="font-dl-mono text-[11px] text-dl-gray cursor-pointer">Details JSON</summary>
                <pre className="text-[11px] text-dl-navy whitespace-pre-wrap break-all mt-2">
                  {JSON.stringify(result.decision.detailsJson, null, 2)}
                </pre>
              </details>
            )}
          </div>

          <div className="border border-dl-border bg-dl-bg p-4">
            <h3 className="font-dl-serif text-base text-dl-navy mb-3">Cap-Infra Claims</h3>
            {result.claimPosture.capClaims.length === 0 ? (
              <p className="font-dl-mono text-xs text-dl-gray">No claims on file.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-dl-mono text-xs">
                  <thead className="bg-dl-bg-alt border-b border-dl-border">
                    <tr>
                      <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Type</th>
                      <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Status</th>
                      <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Issuer</th>
                      <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Issued</th>
                      <th className="px-3 py-2 text-left uppercase tracking-wider text-dl-gray">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.claimPosture.capClaims.map((c, i) => (
                      <tr key={`${c.claimType}-${i}`} className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
                        <td className="px-3 py-2 text-dl-navy">{c.claimType}</td>
                        <td className="px-3 py-2 text-dl-navy">{c.status}</td>
                        <td className="px-3 py-2 text-dl-gray">{c.issuer}</td>
                        <td className="px-3 py-2 text-dl-gray whitespace-nowrap">{fmtTs(c.issuedAt ?? null)}</td>
                        <td className="px-3 py-2 text-dl-gray whitespace-nowrap">{fmtTs(c.expiresAt ?? null)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <details className="mt-3">
              <summary className="font-dl-mono text-[11px] text-dl-gray cursor-pointer">Legacy posture JSON</summary>
              <pre className="text-[11px] text-dl-navy whitespace-pre-wrap break-all mt-2">
                {JSON.stringify(
                  {
                    legacyKyc: result.claimPosture.legacyKyc,
                    legacyComplianceClaims: result.claimPosture.legacyComplianceClaims,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default function CapInfraOperatorConsole({ operatorKey }: PageProps) {
  return (
    <>
      <Head>
        <title>Cap-Infra Console — Operations</title>
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-widest mb-2">
            Operations · Capital Infrastructure
          </p>
          <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy mb-2">
            Cap-Infra Operator Console
          </h1>
          <p className="text-sm text-dl-gray">
            Asset registry, audit search, and eligibility inspection — backed by the live{' '}
            <code className="font-dl-mono">/api/capinfra/operator/*</code> read surface.
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <Link href="/operator" className="text-dl-navy underline">
              ← Operator dashboard
            </Link>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await fetch('/api/capinfra/operator/auth/logout', { method: 'POST' });
                window.location.href = '/operator/login';
              }}
            >
              <button
                type="submit"
                className="font-dl-mono uppercase tracking-wider border border-dl-border px-3 py-1 hover:bg-dl-bg-alt"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <AssetSummarySection operatorKey={operatorKey} />
        <AuditSearchSection operatorKey={operatorKey} />
        <EligibilityInspectSection operatorKey={operatorKey} />
      </DesignLawLayout>
    </>
  );
}
