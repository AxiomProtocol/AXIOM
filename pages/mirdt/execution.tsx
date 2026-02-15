import { useState, useEffect, useCallback } from 'react';
import {
  DesignLawLayout,
  PageShell,
  DataTable,
  PaginationControls,
  SectionHeading,
} from '../../components/design-law';
import type { Column } from '../../components/design-law';

interface PortfolioState {
  portfolioCapitalUsd: number;
  riskFractionBps: number;
  maxConcurrentTrades: number;
  drawdownBrakeBps: number;
  globalSizeMultiplier: number;
  policyMode: string;
}

interface Decision {
  id: string;
  symbol: string;
  asset_type: string;
  grade: string;
  eligibility_status: string;
  entry_trigger: string;
  direction: string;
  entry_zone_low: string;
  entry_zone_high: string;
  current_price: string;
  stop_price: string;
  position_size_qty: string;
  position_notional_usd: string;
  risk_budget_usd: string;
  policy_mode: string;
  entry_allowed: boolean;
  created_at: string;
}

interface PaperTrade {
  id: string;
  symbol: string;
  asset_type: string;
  grade: string;
  direction: string;
  entry_price: string;
  quantity: string;
  exit_price: string | null;
  pnl: string | null;
  pnl_pct: string | null;
  outcome: string | null;
  status: string;
  exit_reason: string | null;
  stop_price: string;
  take_profit_p50: string;
  take_profit_p95: string;
  opened_at: string;
  closed_at: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type OpStatus = 'idle' | 'running' | 'success' | 'error';

interface OpState {
  status: OpStatus;
  message: string;
}

const DEFAULT_PORTFOLIO: PortfolioState = {
  portfolioCapitalUsd: 100000,
  riskFractionBps: 50,
  maxConcurrentTrades: 5,
  drawdownBrakeBps: 500,
  globalSizeMultiplier: 1.0,
  policyMode: 'BOOTSTRAP',
};

const POLICY_MODES = ['BOOTSTRAP', 'NORMAL', 'CAUTION', 'RESTRICTED', 'EMERGENCY'];

const FOOTER_DISCLOSURE =
  'MIRDT Execution Console operates in paper-trade mode only. No live orders are placed. ' +
  'All decisions are deterministic and auditable. Human confirmation is required before any ' +
  'position is opened. Past patterns do not guarantee future outcomes.';

function formatUsd(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQty(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function formatUTC(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-dl-forest';
    case 'B': return 'text-dl-navy';
    case 'C': return 'text-dl-gold';
    case 'REJECT': return 'text-dl-error';
    default: return 'text-dl-gray';
  }
}

export default function ExecutionConsole() {
  const [portfolioState, setPortfolioState] = useState<PortfolioState | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<PortfolioState>(DEFAULT_PORTFOLIO);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [noPortfolio, setNoPortfolio] = useState(false);

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [decisionsLoading, setDecisionsLoading] = useState(true);
  const [decisionsError, setDecisionsError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'decisions' | 'trades'>('decisions');

  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [tradesPagination, setTradesPagination] = useState<Pagination | null>(null);
  const [tradesPage, setTradesPage] = useState(1);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tradesError, setTradesError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ id: string; type: 'success' | 'error'; msg: string } | null>(null);

  const [batchOp, setBatchOp] = useState<OpState>({ status: 'idle', message: '' });
  const [invalidationOp, setInvalidationOp] = useState<OpState>({ status: 'idle', message: '' });
  const [expireOp, setExpireOp] = useState<OpState>({ status: 'idle', message: '' });
  const [emergencyOp, setEmergencyOp] = useState<OpState>({ status: 'idle', message: '' });

  const fetchPortfolio = useCallback(() => {
    setPortfolioLoading(true);
    setPortfolioError(null);
    fetch('/api/mirdt/execution/portfolio')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          if (data.error === 'No portfolio state found' || data.notFound) {
            setNoPortfolio(true);
            setPortfolioState(null);
            setEditForm(DEFAULT_PORTFOLIO);
            setEditMode(true);
          } else {
            setPortfolioError(data.error);
          }
        } else if (data.portfolio) {
          setPortfolioState(data.portfolio);
          setEditForm(data.portfolio);
          setNoPortfolio(false);
        } else {
          setNoPortfolio(true);
          setPortfolioState(null);
          setEditForm(DEFAULT_PORTFOLIO);
          setEditMode(true);
        }
      })
      .catch(() => setPortfolioError('Failed to load portfolio state'))
      .finally(() => setPortfolioLoading(false));
  }, []);

  const fetchDecisions = useCallback(() => {
    setDecisionsLoading(true);
    setDecisionsError(null);
    fetch(`/api/mirdt/execution/decisions?page=${page}&limit=20`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setDecisionsError(data.error);
        } else {
          setDecisions(data.decisions || []);
          setPagination(data.pagination || null);
        }
      })
      .catch(() => setDecisionsError('Failed to load decisions'))
      .finally(() => setDecisionsLoading(false));
  }, [page]);

  const fetchTrades = useCallback(() => {
    setTradesLoading(true);
    setTradesError(null);
    fetch(`/api/mirdt/execution/trades?page=${tradesPage}&limit=20`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setTradesError(data.error);
        } else {
          setTrades(data.trades || []);
          setTradesPagination(data.pagination || null);
        }
      })
      .catch(() => setTradesError('Failed to load trades'))
      .finally(() => setTradesLoading(false));
  }, [tradesPage]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio, refreshKey]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions, refreshKey]);

  useEffect(() => {
    if (activeTab === 'trades') fetchTrades();
  }, [fetchTrades, refreshKey, activeTab]);

  const handleSave = async () => {
    setSaveStatus(null);
    try {
      const res = await fetch('/api/mirdt/execution/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setPortfolioState(data.portfolio || editForm);
        setEditMode(false);
        setNoPortfolio(false);
        setSaveStatus({ type: 'success', message: 'Portfolio settings saved.' });
        setRefreshKey((k) => k + 1);
      } else {
        setSaveStatus({ type: 'error', message: data.error || 'Failed to save.' });
      }
    } catch {
      setSaveStatus({ type: 'error', message: 'Network error.' });
    }
  };

  const runOperation = async (
    endpoint: string,
    setter: React.Dispatch<React.SetStateAction<OpState>>,
    label: string,
    body?: Record<string, any>
  ) => {
    setter({ status: 'running', message: `Running ${label}...` });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setter({ status: 'success', message: data.message || `${label} complete.` });
        setRefreshKey((k) => k + 1);
      } else {
        setter({ status: 'error', message: data.error || `${label} failed.` });
      }
    } catch (err: any) {
      setter({ status: 'error', message: err.message || 'Network error' });
    }
  };

  const executeAction = async (id: string, body: Record<string, any>) => {
    setActionLoading(id);
    setActionMessage(null);
    try {
      const res = await fetch('/api/mirdt/execution/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success !== false) {
        const msg = data.tradeId ? `Trade opened: ${data.tradeId.slice(0, 8)}` : 'Action complete';
        setActionMessage({ id, type: 'success', msg });
        setRefreshKey((k) => k + 1);
      } else {
        setActionMessage({ id, type: 'error', msg: data.error || 'Failed' });
      }
    } catch {
      setActionMessage({ id, type: 'error', msg: 'Network error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAuthorizeOpen = (decisionId: string) =>
    executeAction(decisionId, { operation: 'authorize-open', decisionId });

  const handleCloseTrade = (tradeId: string, exitPrice: string) =>
    executeAction(tradeId, { operation: 'close-trade', tradeId, exitPrice, exitReason: 'MANUAL' });

  const updateField = (field: keyof PortfolioState, value: string) => {
    if (field === 'policyMode') {
      setEditForm((prev) => ({ ...prev, policyMode: value }));
    } else {
      setEditForm((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
    }
  };

  const portfolioFields: { label: string; key: keyof PortfolioState; type: 'number' | 'select' }[] = [
    { label: 'Capital (USD)', key: 'portfolioCapitalUsd', type: 'number' },
    { label: 'Risk Fraction (bps)', key: 'riskFractionBps', type: 'number' },
    { label: 'Max Concurrent Trades', key: 'maxConcurrentTrades', type: 'number' },
    { label: 'Drawdown Brake (bps)', key: 'drawdownBrakeBps', type: 'number' },
    { label: 'Global Size Multiplier', key: 'globalSizeMultiplier', type: 'number' },
    { label: 'Policy Mode', key: 'policyMode', type: 'select' },
  ];

  const columns: Column<Decision>[] = [
    {
      key: 'symbol',
      header: 'Symbol',
      render: (d) => <span className="font-dl-mono font-medium text-dl-navy">{d.symbol}</span>,
    },
    {
      key: 'grade',
      header: 'Grade',
      render: (d) => <span className={`font-dl-mono font-medium ${gradeColor(d.grade)}`}>{d.grade}</span>,
    },
    {
      key: 'eligibility_status',
      header: 'Eligibility',
      render: (d) => <span className="font-dl-mono">{d.eligibility_status}</span>,
    },
    {
      key: 'direction',
      header: 'Dir',
      render: (d) => <span className="font-dl-mono">{d.direction}</span>,
    },
    {
      key: 'current_price',
      header: 'Price',
      align: 'right',
      render: (d) => <span className="font-dl-mono">{formatQty(d.current_price)}</span>,
    },
    {
      key: 'stop_price',
      header: 'Stop',
      align: 'right',
      render: (d) => <span className="font-dl-mono">{formatQty(d.stop_price)}</span>,
    },
    {
      key: 'position_size_qty',
      header: 'Size',
      align: 'right',
      render: (d) => <span className="font-dl-mono">{formatQty(d.position_size_qty)}</span>,
    },
    {
      key: 'position_notional_usd',
      header: 'Notional',
      align: 'right',
      render: (d) => <span className="font-dl-mono">{formatUsd(d.position_notional_usd)}</span>,
    },
    {
      key: 'risk_budget_usd',
      header: 'Risk $',
      align: 'right',
      render: (d) => <span className="font-dl-mono">{formatUsd(d.risk_budget_usd)}</span>,
    },
    {
      key: 'entry_trigger',
      header: 'Trigger',
      render: (d) => <span className="font-dl-mono text-xs">{d.entry_trigger}</span>,
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (d) => <span className="font-dl-mono text-xs text-dl-gray">{formatUTC(d.created_at)}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (d) => {
        if (!d.entry_allowed || d.eligibility_status === 'REJECTED') {
          return <span className="font-dl-mono text-xs text-dl-gray">—</span>;
        }
        return (
          <div>
            <button
              onClick={() => handleAuthorizeOpen(d.id)}
              disabled={actionLoading === d.id}
              className="px-2 py-1 bg-dl-forest text-white font-dl-mono text-xs disabled:bg-dl-gray"
            >
              {actionLoading === d.id ? '...' : 'OPEN'}
            </button>
            {actionMessage?.id === d.id && (
              <span className={`text-xs ml-1 ${actionMessage.type === 'success' ? 'text-dl-forest' : 'text-dl-error'}`}>
                {actionMessage.msg}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const tradeColumns: Column<PaperTrade>[] = [
    {
      key: 'symbol',
      header: 'Symbol',
      render: (t) => <span className="font-dl-mono font-medium text-dl-navy">{t.symbol}</span>,
    },
    {
      key: 'direction',
      header: 'Dir',
      render: (t) => <span className="font-dl-mono">{t.direction}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <span className={`font-dl-mono font-medium ${t.status === 'OPEN' ? 'text-dl-forest' : 'text-dl-gray'}`}>
          {t.status}
        </span>
      ),
    },
    {
      key: 'entry_price',
      header: 'Entry',
      align: 'right',
      render: (t) => <span className="font-dl-mono">{formatQty(t.entry_price)}</span>,
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      render: (t) => <span className="font-dl-mono">{formatQty(t.quantity)}</span>,
    },
    {
      key: 'stop_price',
      header: 'Stop',
      align: 'right',
      render: (t) => <span className="font-dl-mono">{formatQty(t.stop_price)}</span>,
    },
    {
      key: 'exit_price',
      header: 'Exit',
      align: 'right',
      render: (t) => <span className="font-dl-mono">{t.exit_price ? formatQty(t.exit_price) : '—'}</span>,
    },
    {
      key: 'pnl',
      header: 'P&L',
      align: 'right',
      render: (t) => {
        if (!t.pnl) return <span className="font-dl-mono">—</span>;
        const val = parseFloat(t.pnl);
        return (
          <span className={`font-dl-mono ${val > 0 ? 'text-dl-forest' : val < 0 ? 'text-dl-error' : ''}`}>
            {formatUsd(t.pnl)} ({parseFloat(t.pnl_pct || '0').toFixed(2)}%)
          </span>
        );
      },
    },
    {
      key: 'outcome',
      header: 'Outcome',
      render: (t) => {
        if (!t.outcome) return <span className="font-dl-mono">—</span>;
        const color = t.outcome === 'WIN' ? 'text-dl-forest' : t.outcome === 'LOSS' ? 'text-dl-error' : 'text-dl-gray';
        return <span className={`font-dl-mono font-medium ${color}`}>{t.outcome}</span>;
      },
    },
    {
      key: 'exit_reason',
      header: 'Reason',
      render: (t) => <span className="font-dl-mono text-xs">{t.exit_reason || '—'}</span>,
    },
    {
      key: 'opened_at',
      header: 'Opened',
      render: (t) => <span className="font-dl-mono text-xs text-dl-gray">{formatUTC(t.opened_at)}</span>,
    },
    {
      key: 'close_action',
      header: '',
      render: (t) => {
        if (t.status !== 'OPEN') return null;
        return (
          <button
            onClick={() => handleCloseTrade(t.id, t.entry_price)}
            disabled={actionLoading === t.id}
            className="px-2 py-1 bg-dl-error text-white font-dl-mono text-xs disabled:bg-dl-gray"
          >
            {actionLoading === t.id ? '...' : 'CLOSE'}
          </button>
        );
      },
    },
  ];

  return (
    <DesignLawLayout>
      <PageShell
        title="Execution Console"
        subtitle="Paper-trade execution decisions derived from MIRDT setups. All sizing is deterministic. Human confirmation required."
        disclosure={FOOTER_DISCLOSURE}
      >
        <div className="border border-dl-border bg-dl-bg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <SectionHeading>Portfolio Controls</SectionHeading>
            {!portfolioLoading && !portfolioError && (
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="px-3 py-2 bg-dl-navy text-white font-dl-mono text-xs"
                    >
                      SAVE
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        if (portfolioState) setEditForm(portfolioState);
                      }}
                      className="px-3 py-2 border border-dl-border bg-white text-dl-navy font-dl-mono text-xs"
                    >
                      CANCEL
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-3 py-2 bg-dl-navy text-white font-dl-mono text-xs"
                  >
                    EDIT SETTINGS
                  </button>
                )}
              </div>
            )}
          </div>

          {portfolioLoading ? (
            <p className="text-sm text-dl-gray py-4 text-center">Loading portfolio state...</p>
          ) : portfolioError ? (
            <p className="text-sm text-dl-error py-4 text-center">{portfolioError}</p>
          ) : noPortfolio && !editMode ? (
            <div className="py-4 text-center">
              <p className="text-sm text-dl-gray mb-3">No portfolio state configured.</p>
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-dl-navy text-white font-dl-mono text-xs"
              >
                CONFIGURE PORTFOLIO
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {portfolioFields.map((f) => (
                <div key={f.key} className="border border-dl-border p-3">
                  <p className="text-xs font-dl-mono text-dl-gray mb-1">{f.label.toUpperCase()}</p>
                  {editMode ? (
                    f.type === 'select' ? (
                      <select
                        value={editForm[f.key]}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        className="w-full px-2 py-1 border border-dl-border bg-white text-dl-navy font-dl-mono text-sm"
                      >
                        {POLICY_MODES.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={editForm[f.key]}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        className="w-full px-2 py-1 border border-dl-border bg-white text-dl-navy font-dl-mono text-sm"
                      />
                    )
                  ) : (
                    <p className="font-dl-mono text-sm text-dl-navy">
                      {f.key === 'portfolioCapitalUsd'
                        ? formatUsd(portfolioState?.[f.key] ?? editForm[f.key])
                        : String(portfolioState?.[f.key] ?? editForm[f.key])}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {saveStatus && (
            <p className={`text-xs font-dl-mono mt-3 ${saveStatus.type === 'success' ? 'text-dl-forest' : 'text-dl-error'}`}>
              {saveStatus.message}
            </p>
          )}
        </div>

        <div className="border border-dl-border bg-dl-bg p-4 mb-6">
          <SectionHeading>Run Controls</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className="border border-dl-border p-3">
              <p className="text-xs font-dl-mono text-dl-gray mb-2">EXECUTION BATCH</p>
              <button
                onClick={() => runOperation('/api/mirdt/execution/run', setBatchOp, 'Execution Batch')}
                disabled={batchOp.status === 'running'}
                className="w-full px-3 py-2 bg-dl-navy text-white font-dl-mono text-xs disabled:bg-dl-gray"
              >
                {batchOp.status === 'running' ? 'RUNNING...' : 'RUN EXECUTION BATCH'}
              </button>
              {batchOp.message && (
                <p className={`text-xs mt-1 font-dl-mono ${batchOp.status === 'error' ? 'text-dl-error' : batchOp.status === 'success' ? 'text-dl-forest' : 'text-dl-gray'}`}>
                  {batchOp.message}
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
                {invalidationOp.status === 'running' ? 'CHECKING...' : 'CHECK INVALIDATIONS'}
              </button>
              {invalidationOp.message && (
                <p className={`text-xs mt-1 font-dl-mono ${invalidationOp.status === 'error' ? 'text-dl-error' : invalidationOp.status === 'success' ? 'text-dl-forest' : 'text-dl-gray'}`}>
                  {invalidationOp.message}
                </p>
              )}
            </div>

            <div className="border border-dl-border p-3">
              <p className="text-xs font-dl-mono text-dl-gray mb-2">EXPIRE STALE</p>
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

        <div className="flex border-b border-dl-border mb-4">
          <button
            onClick={() => setActiveTab('decisions')}
            className={`px-4 py-2 font-dl-mono text-sm border-b-2 ${
              activeTab === 'decisions' ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-gray'
            }`}
          >
            DECISION QUEUE
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-4 py-2 font-dl-mono text-sm border-b-2 ${
              activeTab === 'trades' ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-gray'
            }`}
          >
            PAPER TRADES
          </button>
        </div>

        {activeTab === 'decisions' && (
          <>
            {decisionsLoading ? (
              <p className="text-sm text-dl-gray py-12 text-center">Loading decisions...</p>
            ) : decisionsError ? (
              <p className="text-sm text-dl-error py-12 text-center">{decisionsError}</p>
            ) : (
              <>
                <DataTable
                  columns={columns}
                  data={decisions}
                  keyExtractor={(d) => d.id}
                  emptyMessage="No execution decisions. Run a batch to generate decisions."
                />
                {pagination && (
                  <PaginationControls
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    limit={pagination.limit}
                    onPageChange={setPage}
                    itemLabel="decisions"
                  />
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'trades' && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => runOperation('/api/mirdt/execution/action', setEmergencyOp, 'Emergency Exit', { operation: 'emergency-exit' })}
                disabled={emergencyOp.status === 'running'}
                className="px-3 py-2 bg-dl-error text-white font-dl-mono text-xs disabled:bg-dl-gray"
              >
                {emergencyOp.status === 'running' ? 'EXITING...' : 'EMERGENCY EXIT ALL'}
              </button>
              {emergencyOp.message && (
                <span className={`text-xs font-dl-mono ${emergencyOp.status === 'error' ? 'text-dl-error' : 'text-dl-forest'}`}>
                  {emergencyOp.message}
                </span>
              )}
            </div>

            {tradesLoading ? (
              <p className="text-sm text-dl-gray py-12 text-center">Loading trades...</p>
            ) : tradesError ? (
              <p className="text-sm text-dl-error py-12 text-center">{tradesError}</p>
            ) : (
              <>
                <DataTable
                  columns={tradeColumns}
                  data={trades}
                  keyExtractor={(t) => t.id}
                  emptyMessage="No paper trades. Authorize a decision from the Decision Queue to open a trade."
                />
                {tradesPagination && (
                  <PaginationControls
                    page={tradesPagination.page}
                    totalPages={tradesPagination.totalPages}
                    total={tradesPagination.total}
                    limit={tradesPagination.limit}
                    onPageChange={setTradesPage}
                    itemLabel="trades"
                  />
                )}
              </>
            )}
          </>
        )}
      </PageShell>
    </DesignLawLayout>
  );
}