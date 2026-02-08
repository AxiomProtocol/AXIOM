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

interface PaperTrade {
  id: string;
  setup_id: string;
  opened_at: string;
  closed_at: string | null;
  entry_price: string;
  quantity: string;
  exit_price: string | null;
  pnl: string | null;
  pnl_pct: string | null;
  max_adverse_excursion: string | null;
  max_favorable_excursion: string | null;
  outcome: string | null;
  notes: string | null;
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

function formatUTC(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function statusColor(status: string): string {
  if (status === 'ACTIVE') return 'text-[#2d5016]';
  if (status === 'EXPIRED') return 'text-[#6b7280]';
  if (status === 'INVALIDATED') return 'text-red-700';
  return 'text-[#6b7280]';
}

function outcomeColor(outcome: string | null): string {
  if (outcome === 'WIN') return 'text-[#2d5016]';
  if (outcome === 'LOSS') return 'text-red-700';
  return 'text-[#6b7280]';
}

export default function MIRDTDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [setup, setSetup] = useState<Setup | null>(null);
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entryPrice, setEntryPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closeExitPrice, setCloseExitPrice] = useState('');
  const [closeStatus, setCloseStatus] = useState<string | null>(null);

  function fetchData() {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    setError(null);

    fetch(`/api/mirdt/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSetup(data.setup);
          setPaperTrades(data.paperTrades || []);
        }
      })
      .catch(() => setError('Failed to connect to server'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  async function handleRecordEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !entryPrice || !quantity) return;
    setSubmitStatus(null);

    try {
      const res = await fetch('/api/mirdt/paper-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupId: id,
          entryPrice: parseFloat(entryPrice),
          quantity: parseFloat(quantity),
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitStatus('Entry recorded successfully.');
        setEntryPrice('');
        setQuantity('');
        setNotes('');
        fetchData();
      } else {
        setSubmitStatus(`Error: ${data.error}`);
      }
    } catch {
      setSubmitStatus('Error: Failed to record entry.');
    }
  }

  async function handleClosePosition(tradeId: string) {
    if (!closeExitPrice) return;
    setCloseStatus(null);

    try {
      const res = await fetch('/api/mirdt/paper-trades', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tradeId,
          exitPrice: parseFloat(closeExitPrice),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCloseStatus('Position closed.');
        setClosingTradeId(null);
        setCloseExitPrice('');
        fetchData();
      } else {
        setCloseStatus(`Error: ${data.error}`);
      }
    } catch {
      setCloseStatus('Error: Failed to close position.');
    }
  }

  const assetType = setup?.asset_type || 'crypto';

  return (
    <>
      <Head>
        <title>{setup ? `Setup Detail — ${setup.symbol} | Axiom Protocol` : 'Setup Detail | Axiom Protocol'}</title>
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10">

          <a
            href="/mirdt"
            onClick={(e) => { e.preventDefault(); router.push('/mirdt'); }}
            className="text-sm text-[#1e3a5f] mb-6 inline-block"
          >
            ← Back to Terminal
          </a>

          {loading ? (
            <p className="text-sm text-[#6b7280] py-12 text-center">Loading data...</p>
          ) : error ? (
            <p className="text-sm text-red-700 py-12 text-center">{error}</p>
          ) : !setup ? (
            <p className="text-sm text-[#6b7280] py-12 text-center">Setup not found.</p>
          ) : (
            <>
              <div className="border border-gray-300 mb-8">
                <div className="grid grid-cols-2 md:grid-cols-4">
                  <div className="px-4 py-3 border-b border-r border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">Setup ID</p>
                    <p className="font-mono text-xs text-[#1e3a5f] break-all">{setup.id}</p>
                  </div>
                  <div className="px-4 py-3 border-b border-r border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">Created (UTC)</p>
                    <p className="font-mono text-xs">{formatUTC(setup.created_at)}</p>
                  </div>
                  <div className="px-4 py-3 border-b border-r border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">Model Version</p>
                    <p className="font-mono text-xs">{setup.model_version || '—'}</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">Data Snapshot Ref</p>
                    <p className="font-mono text-xs break-all">{setup.data_snapshot_ref || '—'}</p>
                  </div>
                  <div className="px-4 py-3 col-span-2 md:col-span-4">
                    <p className="text-xs text-[#6b7280] mb-1">Status</p>
                    <p className={`text-sm font-medium ${statusColor(setup.status)}`}>{setup.status}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-300 mb-8">
                <div className="border-r border-gray-300">
                  <div className="px-4 py-3 border-b border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">Symbol / Asset Class</p>
                    <p className="text-sm font-medium text-[#1e3a5f]">{setup.symbol} — {formatAssetType(setup.asset_type)}</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">Horizon</p>
                    <p className="text-sm font-mono">{setup.horizon_days} day{setup.horizon_days !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">Entry Zone</p>
                    <p className="text-sm font-mono">{formatPrice(setup.entry_zone_low, assetType)} — {formatPrice(setup.entry_zone_high, assetType)}</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">Invalidation Level</p>
                    <p className="text-sm font-mono">{formatPrice(setup.invalidation_price, assetType)}</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">Confidence Score</p>
                    <p className="text-sm font-mono">{setup.confidence_score}%</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-300 md:border-b-0">
                    <p className="text-xs text-[#6b7280] mb-1">Signal Strength (Z-Score)</p>
                    <p className="text-sm font-mono">{parseFloat(setup.signal_z).toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <div className="px-4 py-3 border-b border-gray-300">
                    <p className="text-xs text-[#6b7280] font-medium">Expected Outcomes</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">P5 (Adverse)</p>
                    <p className="text-sm font-mono">{formatPrice(setup.expected_p5, assetType)}</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">P50 (Median)</p>
                    <p className="text-sm font-mono">{formatPrice(setup.expected_p50, assetType)}</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">P95 (Favorable)</p>
                    <p className="text-sm font-mono">{formatPrice(setup.expected_p95, assetType)}</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-300">
                    <p className="text-xs text-[#6b7280] mb-1">Volatility Estimate</p>
                    <p className="text-sm font-mono">{(parseFloat(setup.volatility_estimate) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs text-[#6b7280] mb-1">Liquidity Notes</p>
                    <p className="text-sm text-[#6b7280]">{setup.liquidity_notes || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="font-serif text-xl text-[#1e3a5f] mb-4 border-b border-gray-300 pb-2">Analysis Summary</h2>
                <div className="border border-gray-300 p-4 bg-[#fafaf8] text-sm text-gray-800 leading-relaxed mb-6">
                  {setup.thesis_summary || 'No analysis summary available.'}
                </div>

                <h2 className="font-serif text-xl text-[#1e3a5f] mb-4 border-b border-gray-300 pb-2">Rationale Trace</h2>
                <pre className="border border-gray-300 bg-[#fafaf8] p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap text-gray-700">
                  {setup.rationale_trace_json
                    ? JSON.stringify(setup.rationale_trace_json, null, 2)
                    : 'No rationale trace available.'}
                </pre>
              </div>

              <div className="mb-8">
                <h2 className="font-serif text-xl text-[#1e3a5f] mb-4 border-b border-gray-300 pb-2">Paper Trade Ledger</h2>

                {setup.status === 'ACTIVE' && (
                  <form onSubmit={handleRecordEntry} className="border border-gray-300 p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs text-[#6b7280] mb-1">Entry Price</label>
                        <input
                          type="number"
                          step="any"
                          value={entryPrice}
                          onChange={(e) => setEntryPrice(e.target.value)}
                          required
                          className="w-full border border-gray-300 px-3 py-1.5 text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] mb-1">Quantity</label>
                        <input
                          type="number"
                          step="any"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          required
                          className="w-full border border-gray-300 px-3 py-1.5 text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] mb-1">Notes (optional)</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={1}
                          className="w-full border border-gray-300 px-3 py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="bg-[#1e3a5f] text-white px-6 py-1.5 text-sm"
                    >
                      Record Entry
                    </button>
                    {submitStatus && (
                      <p className={`text-xs mt-2 ${submitStatus.startsWith('Error') ? 'text-red-700' : 'text-[#2d5016]'}`}>
                        {submitStatus}
                      </p>
                    )}
                  </form>
                )}

                {closeStatus && (
                  <p className={`text-xs mb-4 ${closeStatus.startsWith('Error') ? 'text-red-700' : 'text-[#2d5016]'}`}>
                    {closeStatus}
                  </p>
                )}

                {paperTrades.length === 0 ? (
                  <p className="text-sm text-[#6b7280]">No paper trades recorded for this setup.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-[#fafaf8]">
                          <th className="text-left px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Opened (UTC)</th>
                          <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Entry</th>
                          <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Quantity</th>
                          <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Exit</th>
                          <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">P&amp;L</th>
                          <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">P&amp;L %</th>
                          <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">MAE</th>
                          <th className="text-right px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">MFE</th>
                          <th className="text-left px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Outcome</th>
                          <th className="text-left px-3 py-2 border-b border-r border-gray-300 text-xs font-medium text-[#6b7280]">Notes</th>
                          <th className="text-left px-3 py-2 border-b border-gray-300 text-xs font-medium text-[#6b7280]">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paperTrades.map((t, i) => (
                          <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#fafaf8]'}>
                            <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-xs">{formatUTC(t.opened_at)}</td>
                            <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">{formatPrice(t.entry_price, assetType)}</td>
                            <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">{parseFloat(t.quantity).toFixed(4)}</td>
                            <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">{t.exit_price ? formatPrice(t.exit_price, assetType) : '—'}</td>
                            <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">{t.pnl !== null ? parseFloat(t.pnl).toFixed(2) : '—'}</td>
                            <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">{t.pnl_pct !== null ? `${parseFloat(t.pnl_pct).toFixed(2)}%` : '—'}</td>
                            <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">{t.max_adverse_excursion !== null ? formatPrice(t.max_adverse_excursion, assetType) : '—'}</td>
                            <td className="px-3 py-2 border-b border-r border-gray-200 font-mono text-right">{t.max_favorable_excursion !== null ? formatPrice(t.max_favorable_excursion, assetType) : '—'}</td>
                            <td className={`px-3 py-2 border-b border-r border-gray-200 font-medium ${outcomeColor(t.outcome)}`}>{t.outcome || '—'}</td>
                            <td className="px-3 py-2 border-b border-r border-gray-200 text-xs text-[#6b7280] max-w-[150px] truncate">{t.notes || '—'}</td>
                            <td className="px-3 py-2 border-b border-gray-200">
                              {!t.exit_price && (
                                <>
                                  {closingTradeId === t.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        step="any"
                                        placeholder="Exit price"
                                        value={closeExitPrice}
                                        onChange={(e) => setCloseExitPrice(e.target.value)}
                                        className="w-24 border border-gray-300 px-2 py-1 text-xs font-mono"
                                      />
                                      <button
                                        onClick={() => handleClosePosition(t.id)}
                                        className="bg-[#1e3a5f] text-white px-3 py-1 text-xs"
                                      >
                                        Close
                                      </button>
                                      <button
                                        onClick={() => { setClosingTradeId(null); setCloseExitPrice(''); }}
                                        className="text-xs text-[#6b7280] underline"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => { setClosingTradeId(t.id); setCloseExitPrice(''); setCloseStatus(null); }}
                                      className="bg-[#1e3a5f] text-white px-3 py-1 text-xs"
                                    >
                                      Close Position
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-12 pt-6 border-t border-gray-300">
                <p className="text-xs text-[#6b7280] leading-relaxed">
                  RISK DISCLOSURE: All analysis is probabilistic and backward-looking. Setups represent statistical
                  observations, not investment recommendations. Axiom Protocol does not provide investment advice.
                  All capital deployment decisions carry risk of loss.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
