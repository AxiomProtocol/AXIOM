/*
 * MIRDT DESIGN GATE CHECKLIST
 * ✓ Resembles a legal document or spreadsheet
 * ✓ Functions fully without animation
 * ✓ Explainable to a regulator without using prohibited terminology
 * ✓ Printable or screenshot-ready for audits
 * ✓ No prohibited terminology (see lexicon guard)
 * ✓ Serif headings, monospace data, institutional palette
 * ✓ Pagination (no infinite scroll)
 * ✓ Static values with timestamps (no live tickers)
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

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

function formatPrice(value: string | number | null | undefined, assetType: string): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  const decimals = assetType === 'crypto' ? (num < 1 ? 8 : num < 100 ? 4 : 2) : 2;
  return num.toFixed(decimals);
}

function formatAssetType(type: string): string {
  if (type === 'crypto') return 'Digital Assets';
  if (type === 'equity') return 'Equities';
  return type;
}

function statusColor(status: string): string {
  if (status === 'ACTIVE') return 'text-[#2d5016]';
  if (status === 'EXPIRED') return 'text-[#6b7280]';
  if (status === 'INVALIDATED') return 'text-red-700';
  return 'text-[#6b7280]';
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
  const [showDisclosure, setShowDisclosure] = useState(false);

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

  const startIdx = pagination ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const endIdx = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  return (
    <>
      <Head>
        <title>Market Intelligence Terminal | Axiom Protocol</title>
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10">

          <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-gray-300 pb-6 mb-6">
            <div>
              <h1 className="font-serif text-2xl text-[#1e3a5f]">
                Market Intelligence &amp; Risk Disclosure Terminal
              </h1>
              <p className="text-sm text-[#6b7280] mt-2 max-w-2xl">
                Probabilistic trend-following analysis with full audit trail. Past patterns do not guarantee future outcomes.
              </p>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <p className="text-xs text-[#6b7280]">Last scan:</p>
              <p className="font-mono text-xs text-[#6b7280]">{lastScan || '—'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-6 border-b border-gray-200 pb-4">
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border border-gray-300 bg-white text-sm px-3 py-1.5 font-mono"
              >
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="INVALIDATED">Invalidated</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Asset Class</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="border border-gray-300 bg-white text-sm px-3 py-1.5 font-mono"
              >
                <option value="">All</option>
                <option value="crypto">Digital Assets</option>
                <option value="equity">Equities</option>
              </select>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setShowDisclosure(!showDisclosure)}
                className="text-xs text-[#1e3a5f] underline"
              >
                Risk Disclosure
              </button>
            </div>
          </div>

          {showDisclosure && (
            <div className="border border-gray-200 bg-[#fafaf8] p-4 mb-6 text-xs text-[#6b7280] leading-relaxed">
              All analysis presented on this terminal is probabilistic and backward-looking. Setups represent
              statistical observations derived from historical market data and do not constitute investment
              recommendations, solicitations, or advice. Axiom Protocol does not provide investment advice.
              Market conditions change without notice. All capital deployment decisions carry inherent risk
              of partial or total loss. Users should consult qualified financial professionals before making
              any investment decisions.
            </div>
          )}

          {loading ? (
            <p className="text-sm text-[#6b7280] py-12 text-center">Loading data...</p>
          ) : error ? (
            <p className="text-sm text-red-700 py-12 text-center">{error}</p>
          ) : setups.length === 0 ? (
            <p className="text-sm text-[#6b7280] py-12 text-center">No setups found for the selected criteria.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-[#fafaf8]">
                      <th className="text-left px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Symbol</th>
                      <th className="text-left px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Asset Class</th>
                      <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Horizon (days)</th>
                      <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Entry Zone</th>
                      <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Invalidation</th>
                      <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Confidence</th>
                      <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Signal Z</th>
                      <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">P5 / P50 / P95</th>
                      <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Volatility</th>
                      <th className="text-left px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Status</th>
                      <th className="text-left px-3 py-2 border-b border-gray-300 text-xs font-medium text-[#6b7280]">Created (UTC)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setups.map((s, i) => (
                      <tr
                        key={s.id}
                        onClick={() => router.push(`/mirdt/${s.id}`)}
                        className={`cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafaf8]'}`}
                      >
                        <td className="px-3 py-2 border-b border-r border-gray-200 font-medium text-[#1e3a5f]">{s.symbol}</td>
                        <td className="px-3 py-2 border-b border-r border-gray-200 text-[#6b7280]">{formatAssetType(s.asset_type)}</td>
                        <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">{s.horizon_days}</td>
                        <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">
                          {formatPrice(s.entry_zone_low, s.asset_type)} — {formatPrice(s.entry_zone_high, s.asset_type)}
                        </td>
                        <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">{formatPrice(s.invalidation_price, s.asset_type)}</td>
                        <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">{s.confidence_score}%</td>
                        <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">{parseFloat(s.signal_z).toFixed(2)}</td>
                        <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right text-xs">
                          {formatPrice(s.expected_p5, s.asset_type)} / {formatPrice(s.expected_p50, s.asset_type)} / {formatPrice(s.expected_p95, s.asset_type)}
                        </td>
                        <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">
                          {(parseFloat(s.volatility_estimate) * 100).toFixed(1)}%
                        </td>
                        <td className={`px-3 py-2 border-b border-r border-gray-200 font-medium ${statusColor(s.status)}`}>{s.status}</td>
                        <td className="px-3 py-2 border-b border-gray-200 font-mono text-xs text-[#6b7280]">{formatUTC(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <p className="text-xs text-[#6b7280]">
                    Showing {startIdx}–{endIdx} of {pagination.total} setups
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className={`px-4 py-1.5 text-sm ${
                        page <= 1
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-[#1e3a5f] text-white'
                      }`}
                    >
                      Previous
                    </button>
                    <span className="text-sm font-mono text-[#6b7280]">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                      className={`px-4 py-1.5 text-sm ${
                        page >= pagination.totalPages
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-[#1e3a5f] text-white'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-12 pt-6 border-t border-gray-300">
            <p className="text-xs text-[#6b7280] leading-relaxed">
              RISK DISCLOSURE: All analysis is probabilistic and backward-looking. Setups represent statistical
              observations, not investment recommendations. Axiom Protocol does not provide investment advice.
              All capital deployment decisions carry risk of loss.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
