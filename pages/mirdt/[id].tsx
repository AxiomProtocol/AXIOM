import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  PageShell,
  DataTable,
  StatusBadge,
  AuditHeader,
  DetailGrid,
  SectionHeading,
  SolidButton,
  FormField,
  DLInput,
  DLTextarea,
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

function formatUTC(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
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

  const assetType = setup?.asset_type || 'CRYPTO';

  const tradeColumns: Column<PaperTrade>[] = [
    {
      key: 'opened_at',
      header: 'Opened (UTC)',
      render: (t) => <span className="font-dl-mono text-xs">{formatUTC(t.opened_at)}</span>,
    },
    {
      key: 'entry_price',
      header: 'Entry',
      align: 'right',
      render: (t) => <span className="font-dl-mono">{formatPrice(t.entry_price, assetType)}</span>,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      render: (t) => <span className="font-dl-mono">{parseFloat(t.quantity).toFixed(4)}</span>,
    },
    {
      key: 'exit_price',
      header: 'Exit',
      align: 'right',
      render: (t) => <span className="font-dl-mono">{t.exit_price ? formatPrice(t.exit_price, assetType) : '—'}</span>,
    },
    {
      key: 'pnl',
      header: 'P&L',
      align: 'right',
      render: (t) => <span className="font-dl-mono">{t.pnl !== null ? parseFloat(t.pnl).toFixed(2) : '—'}</span>,
    },
    {
      key: 'pnl_pct',
      header: 'P&L %',
      align: 'right',
      render: (t) => <span className="font-dl-mono">{t.pnl_pct !== null ? `${parseFloat(t.pnl_pct).toFixed(2)}%` : '—'}</span>,
    },
    {
      key: 'mae',
      header: 'MAE',
      align: 'right',
      render: (t) => <span className="font-dl-mono">{t.max_adverse_excursion !== null ? formatPrice(t.max_adverse_excursion, assetType) : '—'}</span>,
    },
    {
      key: 'mfe',
      header: 'MFE',
      align: 'right',
      render: (t) => <span className="font-dl-mono">{t.max_favorable_excursion !== null ? formatPrice(t.max_favorable_excursion, assetType) : '—'}</span>,
    },
    {
      key: 'outcome',
      header: 'Outcome',
      render: (t) => <StatusBadge status={t.outcome} />,
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (t) => <span className="text-xs text-dl-gray max-w-[150px] truncate block">{t.notes || '—'}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (t) => {
        if (t.exit_price) return null;
        if (closingTradeId === t.id) {
          return (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                placeholder="Exit price"
                value={closeExitPrice}
                onChange={(e) => setCloseExitPrice(e.target.value)}
                className="w-24 border border-dl-border px-2 py-1 text-xs font-dl-mono"
              />
              <SolidButton size="sm" onClick={() => handleClosePosition(t.id)}>
                Close
              </SolidButton>
              <button
                onClick={() => { setClosingTradeId(null); setCloseExitPrice(''); }}
                className="text-xs text-dl-gray underline"
              >
                Cancel
              </button>
            </div>
          );
        }
        return (
          <SolidButton
            size="sm"
            onClick={() => { setClosingTradeId(t.id); setCloseExitPrice(''); setCloseStatus(null); }}
          >
            Close Position
          </SolidButton>
        );
      },
    },
  ];

  return (
    <PageShell
      title={setup ? `Setup Detail — ${setup.symbol}` : 'Setup Detail'}
      disclosure={FOOTER_DISCLOSURE}
    >
      <a
        href="/mirdt"
        onClick={(e) => { e.preventDefault(); router.push('/mirdt'); }}
        className="text-sm text-dl-navy mb-6 inline-block"
      >
        ← Back to Terminal
      </a>

      {loading ? (
        <p className="text-sm text-dl-gray py-12 text-center">Loading data...</p>
      ) : error ? (
        <p className="text-sm text-dl-error py-12 text-center">{error}</p>
      ) : !setup ? (
        <p className="text-sm text-dl-gray py-12 text-center">Setup not found.</p>
      ) : (
        <>
          <AuditHeader
            fields={[
              { label: 'Setup ID', value: setup.id, breakAll: true },
              { label: 'Created (UTC)', value: formatUTC(setup.created_at) },
              { label: 'Model Version', value: setup.model_version || '—' },
              { label: 'Data Snapshot Ref', value: setup.data_snapshot_ref || '—', breakAll: true },
            ]}
            status={{ label: 'Status', value: setup.status }}
          />

          <DetailGrid
            left={[
              { label: 'Symbol / Asset Class', value: `${setup.symbol} — ${formatAssetType(setup.asset_type)}`, mono: false },
              { label: 'Horizon', value: `${setup.horizon_days} day${setup.horizon_days !== 1 ? 's' : ''}` },
              { label: 'Entry Zone', value: `${formatPrice(setup.entry_zone_low, assetType)} — ${formatPrice(setup.entry_zone_high, assetType)}` },
              { label: 'Invalidation Level', value: formatPrice(setup.invalidation_price, assetType) },
              { label: 'Confidence Score', value: `${setup.confidence_score}%` },
              { label: 'Signal Strength (Z-Score)', value: parseFloat(setup.signal_z).toFixed(2) },
            ]}
            right={[
              { label: 'Expected Outcomes', value: '', mono: false },
              { label: 'P5 (Adverse)', value: formatPrice(setup.expected_p5, assetType) },
              { label: 'P50 (Median)', value: formatPrice(setup.expected_p50, assetType) },
              { label: 'P95 (Favorable)', value: formatPrice(setup.expected_p95, assetType) },
              { label: 'Volatility Estimate', value: `${(parseFloat(setup.volatility_estimate) * 100).toFixed(1)}%` },
              { label: 'Liquidity Notes', value: setup.liquidity_notes || '—', mono: false },
            ]}
          />

          <div className="mb-8">
            <SectionHeading>Analysis Summary</SectionHeading>
            <div className="border border-dl-border p-4 bg-dl-bg-alt text-sm text-gray-800 leading-relaxed mb-6">
              {setup.thesis_summary || 'No analysis summary available.'}
            </div>

            <SectionHeading>Rationale Trace</SectionHeading>
            <pre className="border border-dl-border bg-dl-bg-alt p-4 text-xs font-dl-mono overflow-x-auto whitespace-pre-wrap text-gray-700">
              {setup.rationale_trace_json
                ? JSON.stringify(setup.rationale_trace_json, null, 2)
                : 'No rationale trace available.'}
            </pre>
          </div>

          <div className="mb-8">
            <SectionHeading>Paper Trade Ledger</SectionHeading>

            {setup.status === 'ACTIVE' && (
              <form onSubmit={handleRecordEntry} className="border border-dl-border p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <FormField label="Entry Price">
                    <DLInput
                      type="number"
                      step="any"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField label="Quantity">
                    <DLInput
                      type="number"
                      step="any"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField label="Notes (optional)">
                    <DLTextarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={1}
                    />
                  </FormField>
                </div>
                <SolidButton type="submit">Record Entry</SolidButton>
                {submitStatus && (
                  <p className={`text-xs mt-2 ${submitStatus.startsWith('Error') ? 'text-dl-error' : 'text-dl-forest'}`}>
                    {submitStatus}
                  </p>
                )}
              </form>
            )}

            {closeStatus && (
              <p className={`text-xs mb-4 ${closeStatus.startsWith('Error') ? 'text-dl-error' : 'text-dl-forest'}`}>
                {closeStatus}
              </p>
            )}

            <DataTable
              columns={tradeColumns}
              data={paperTrades}
              keyExtractor={(t) => t.id}
              emptyMessage="No paper trades recorded for this setup."
            />
          </div>
        </>
      )}
    </PageShell>
  );
}
