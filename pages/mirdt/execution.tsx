import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DesignLawLayout,
  PageShell,
  DataTable,
  PaginationControls,
  SectionHeading,
} from '../../components/design-law';
import type { Column } from '../../components/design-law';
import { computeHybridExit, hybridBadgeColor, type HybridExitBadge } from '../../lib/mirdt/hybridExit';

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

function safeParse(val: string | number | null | undefined, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(n) ? fallback : n;
}

function formatUTC(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const ts = Date.parse(dateStr);
  if (isNaN(ts)) return '—';
  return new Date(ts).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
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

type ExecViewMode = 'console' | 'guide';

function ExecutionGuide() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const EXEC_FAQS = [
    { q: 'What is the Execution Console?', a: 'The Execution Console is the paper-trading engine for MIRDT setups. It converts market intelligence observations into sized, risk-managed trade decisions with deterministic position sizing, then allows you to open and close paper trades to track performance against a verifiable target.' },
    { q: 'What is paper trading?', a: 'Paper trading is simulated trading that uses real market prices but does not deploy actual capital. Every trade opened through the Execution Console is tracked with real entry/exit prices, P&L calculations, and full audit trails, but no real money is at risk.' },
    { q: 'How does position sizing work?', a: 'Position sizing is fully deterministic. The system calculates the maximum position size based on your portfolio capital, risk fraction (in basis points), the distance between entry price and stop price, and the global size multiplier. The formula ensures no single trade risks more than your configured risk budget.' },
    { q: 'What is the risk fraction (BPS)?', a: 'Risk fraction in basis points (BPS) defines the maximum percentage of portfolio capital at risk per trade. 50 BPS = 0.50% of capital. For a $100,000 portfolio at 50 BPS, the maximum risk per trade is $500. This is the distance from entry to stop, multiplied by position size.' },
    { q: 'What are the decision grades (A, B, C, REJECT)?', a: 'Decisions are graded by the execution engine based on signal strength, confidence level, and risk/reward characteristics. Grade A represents the highest-conviction setups, B is moderate conviction, C is lower conviction, and REJECT means the setup did not meet minimum criteria for execution consideration.' },
    { q: 'What is the drawdown brake?', a: 'The drawdown brake (in BPS) is a circuit breaker that halts new trade openings if cumulative losses exceed the threshold. At 500 BPS (5%), if total P&L reaches -5% of starting capital, the system prevents opening new positions until losses are recovered. This prevents catastrophic drawdowns.' },
    { q: 'What does "human confirmation required" mean?', a: 'Every trade requires explicit human authorization before opening. The system generates decisions and sizes positions, but a human operator must review and click "AUTHORIZE OPEN" to initiate each trade. No trades are opened automatically.' },
    { q: 'How are exit prices determined?', a: 'When you close a trade, the system uses the current live market price (updated every 15 seconds) as the exit price. This ensures P&L calculations reflect actual market conditions at the time of closing.' },
    { q: 'What is the hybrid exit system?', a: 'The hybrid exit system provides two distinct exit boundaries: a riskStop (capital protection, tighter) and an invalidation level (thesis invalidation, wider). The riskStop uses adaptive k-values based on current volatility to adjust its tightness. Exit badges indicate which boundary was breached: EXIT_RISK, TAKE_PROFIT, INVALIDATED, TIME_EXIT, or HOLD.' },
    { q: 'What are policy modes?', a: 'Policy modes control the execution regime: BOOTSTRAP (initial phase, conservative sizing), NORMAL (standard operation), CAUTION (reduced sizing), RESTRICTED (minimal sizing, high-conviction only), and EMERGENCY (no new positions, exit-only mode). The mode affects position sizing multipliers.' },
    { q: 'What is the Proof of Execution target?', a: 'The Proof of Execution Playbook tracks cumulative P&L toward a $100 target over 30 days. This serves as verifiable evidence that the system can generate consistent returns before it is offered as a subscription product to external users.' },
    { q: 'Can the Execution Console trade with real money?', a: 'No. The Execution Console operates in paper-trade mode only. No live orders are placed on any exchange. All trades are simulated using real market prices for tracking and verification purposes.' },
  ];

  const EXEC_STEPS = [
    { step: '01', title: 'Configure Portfolio', detail: 'Set your portfolio capital, risk fraction (BPS), maximum concurrent trades, drawdown brake threshold, size multiplier, and policy mode. These parameters govern all position sizing calculations.' },
    { step: '02', title: 'Run Execution Batch', detail: 'The engine scans all active MIRDT setups, evaluates eligibility, calculates deterministic position sizes, and generates graded decisions (A/B/C/REJECT). Each decision includes entry price, stop price, quantity, and notional value.' },
    { step: '03', title: 'Review Decisions', detail: 'Browse the Decision Queue to see all generated decisions with their grades, directions, entry zones, and risk budgets. Decisions are informational until you authorize them.' },
    { step: '04', title: 'Authorize Trades', detail: 'Click "AUTHORIZE OPEN" on any decision to open a paper trade. The trade is created with the current market price as entry, and begins tracking live P&L against the 15-second price feed.' },
    { step: '05', title: 'Monitor Open Positions', detail: 'Switch to the Paper Trades tab to see all open positions with live P&L, hybrid exit badges (EXIT_RISK, TAKE_PROFIT, INVALIDATED, TIME_EXIT, HOLD), and distance to risk/invalidation levels.' },
    { step: '06', title: 'Close Trades', detail: 'Click "CLOSE" on any open trade to close it at the current live market price. The system calculates realized P&L, win/loss outcome, and logs the complete trade to the audit trail.' },
  ];

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading>Introduction</SectionHeading>
        <div className="border border-dl-border p-6 space-y-4 text-sm text-dl-gray leading-relaxed">
          <p>
            The Execution Console is Axiom Protocol's paper-trading engine. It converts MIRDT market
            intelligence setups into sized, risk-managed trade decisions with deterministic position
            sizing and full audit trails.
          </p>
          <p>
            Every aspect of the execution pipeline is deterministic: given the same portfolio parameters
            and market data, the system will always produce the same position sizes, grades, and decisions.
            Human confirmation is required before any position is opened.
          </p>
          <p>
            The console operates in paper-trade mode only. No live orders are placed on any exchange.
            All trades use real market prices for accurate P&L tracking, but no actual capital is deployed.
            This serves as the foundation for the Proof of Execution Playbook, which demonstrates
            verifiable system capability.
          </p>
          <div className="border-l-2 border-dl-gold pl-4 mt-4">
            <p className="text-xs font-dl-mono text-dl-navy">
              KEY PRINCIPLE: The system sizes positions. Humans confirm trades. Every action is logged.
              No capital is deployed without explicit authorization.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading>Core Capabilities</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Deterministic Sizing', desc: 'Position sizes are computed algorithmically from portfolio capital, risk fraction, stop distance, and policy mode. No discretionary overrides.' },
            { title: 'Human Confirmation Gates', desc: 'Every trade requires explicit operator authorization. The system proposes; you decide. No automated execution.' },
            { title: 'Live Price Integration', desc: '15-second polling against live market prices for real-time P&L tracking, exit badge computation, and accurate trade closing.' },
            { title: 'Hybrid Exit System', desc: 'Dual-boundary exit model with capital-protecting riskStop (adaptive k) and thesis-invalidating stop. Volatility-aware adjustments.' },
            { title: 'Graded Decision Queue', desc: 'Decisions are graded A through REJECT based on signal strength, confidence, and risk/reward. Focus on the highest-conviction setups.' },
            { title: 'Full Audit Trail', desc: 'Every action (batch run, authorization, open, close, emergency exit) is logged with timestamps, parameters, and outcomes for complete transparency.' },
          ].map((c, i) => (
            <div key={i} className="border border-dl-border p-4">
              <p className="text-sm font-medium text-dl-navy mb-2">{c.title}</p>
              <p className="text-xs text-dl-gray leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>How It Works</SectionHeading>
        <div className="space-y-3">
          {EXEC_STEPS.map((s) => (
            <div key={s.step} className="border border-dl-border p-4 flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 border border-dl-border flex items-center justify-center bg-dl-bg-alt">
                <span className="font-dl-mono text-sm text-dl-navy">{s.step}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-dl-navy">{s.title}</p>
                <p className="text-xs text-dl-gray leading-relaxed mt-1">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>Position Sizing Formula</SectionHeading>
        <div className="border border-dl-border p-6 space-y-4">
          <div className="bg-dl-bg-alt p-4 border border-dl-border-light">
            <p className="font-dl-mono text-xs text-dl-navy mb-2">RISK BUDGET</p>
            <p className="font-dl-mono text-sm text-dl-gray">riskBudget = portfolioCapital x (riskFractionBps / 10000)</p>
          </div>
          <div className="bg-dl-bg-alt p-4 border border-dl-border-light">
            <p className="font-dl-mono text-xs text-dl-navy mb-2">STOP DISTANCE</p>
            <p className="font-dl-mono text-sm text-dl-gray">stopDistance = |entryPrice - stopPrice|</p>
          </div>
          <div className="bg-dl-bg-alt p-4 border border-dl-border-light">
            <p className="font-dl-mono text-xs text-dl-navy mb-2">POSITION SIZE</p>
            <p className="font-dl-mono text-sm text-dl-gray">quantity = (riskBudget / stopDistance) x globalSizeMultiplier</p>
          </div>
          <p className="text-xs text-dl-gray leading-relaxed">
            This ensures that if the stop price is hit, the maximum loss equals the risk budget.
            For a $100,000 portfolio at 50 BPS with a 1x multiplier, the maximum risk per trade
            is $500. The position size adjusts based on how far the stop is from entry: tighter
            stops allow larger positions, wider stops require smaller positions.
          </p>
        </div>
      </section>

      <section>
        <SectionHeading>Exit Badge Reference</SectionHeading>
        <div className="border border-dl-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dl-border bg-dl-bg-alt">
                <th className="text-left px-4 py-2 font-dl-mono text-xs text-dl-gray">BADGE</th>
                <th className="text-left px-4 py-2 font-dl-mono text-xs text-dl-gray">MEANING</th>
                <th className="text-left px-4 py-2 font-dl-mono text-xs text-dl-gray">PRIORITY</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['EXIT_RISK', 'Live price breached the adaptive riskStop. Capital protection triggered.', '1 (Highest)'],
                ['TAKE_PROFIT', 'Live price reached the P50 target level. Profit objective met.', '2'],
                ['INVALIDATED', 'Live price crossed the invalidation level. Original thesis is structurally broken.', '3'],
                ['TIME_EXIT', 'Trade exceeded its defined horizon in days. Time-based expiration.', '4'],
                ['HOLD', 'No exit condition met. Trade remains open within normal parameters.', '5 (Lowest)'],
              ].map(([badge, meaning, priority], i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-dl-bg-alt'}>
                  <td className="px-4 py-2 font-dl-mono text-xs text-dl-navy whitespace-nowrap">{badge}</td>
                  <td className="px-4 py-2 text-xs text-dl-gray">{meaning}</td>
                  <td className="px-4 py-2 font-dl-mono text-xs text-dl-gray text-center">{priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionHeading>Frequently Asked Questions</SectionHeading>
        <div className="border border-dl-border-light">
          {EXEC_FAQS.map((item, i) => (
            <div key={i} className={i < EXEC_FAQS.length - 1 ? 'border-b border-dl-border-light' : ''}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-4 py-3 flex items-center justify-between bg-dl-bg hover:bg-dl-bg-alt"
              >
                <span className="text-sm text-dl-navy font-medium pr-4">{item.q}</span>
                <span className="text-dl-gray text-xs font-dl-mono flex-shrink-0">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="px-4 py-3 bg-dl-bg-alt text-sm text-dl-gray leading-relaxed">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>Important Disclosures</SectionHeading>
        <div className="border border-dl-border p-6 space-y-3 text-xs text-dl-gray leading-relaxed">
          <p>
            The Execution Console operates in paper-trade mode only. No live orders are placed on any
            exchange. All trades are simulated using real market prices. P&L figures represent simulated
            performance and do not reflect actual trading results.
          </p>
          <p>
            Past simulated performance does not guarantee future results. Position sizing calculations
            are deterministic but do not account for slippage, fees, liquidity constraints, or market
            impact that would exist in live trading conditions.
          </p>
          <p>
            Axiom Protocol does not provide investment advice. The Execution Console is an internal
            tool for system capability demonstration and strategy validation purposes only.
          </p>
        </div>
      </section>
    </div>
  );
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

  const [adminKey, setAdminKey] = useState<string>('');
  const [adminKeyVisible, setAdminKeyVisible] = useState(false);

  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<string | null>(null);
  const [pricesStale, setPricesStale] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const [volData, setVolData] = useState<Record<string, { volRatio: number; approx: boolean }>>({});
  const volFetchedRef = useRef<string>('');
  const [execViewMode, setExecViewMode] = useState<ExecViewMode>('console');

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

  const fetchLivePrices = useCallback(() => {
    if (trades.length === 0) return;

    const symbols = [...new Set(trades.map((t) => t.symbol))];
    const types = symbols.map((s) => {
      const trade = trades.find((t) => t.symbol === s);
      return trade?.asset_type || 'EQUITY';
    });

    fetch(`/api/prices?symbols=${symbols.join(',')}&types=${types.join(',')}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.prices) {
          const map: Record<string, number> = {};
          let hasStale = false;
          for (const p of data.prices) {
            if (p.price !== null) map[p.symbol] = p.price;
            if (p.stale) hasStale = true;
          }
          setLivePrices(map);
          setPricesUpdatedAt(data.timestamp);
          setPricesStale(hasStale);
        }
      })
      .catch(() => {});
  }, [trades]);

  const fetchVolatility = useCallback(() => {
    if (trades.length === 0) return;

    const symbols = [...new Set(trades.map((t) => t.symbol))];
    const symbolsKey = symbols.sort().join(',');

    if (volFetchedRef.current === symbolsKey) return;

    const types = symbols.map((s) => {
      const trade = trades.find((t) => t.symbol === s);
      return trade?.asset_type || 'EQUITY';
    });

    fetch(`/api/volatility?symbols=${symbols.join(',')}&types=${types.join(',')}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.vol) {
          const map: Record<string, { volRatio: number; approx: boolean }> = {};
          for (const [sym, v] of Object.entries(data.vol) as [string, any][]) {
            map[sym] = { volRatio: v.volRatio, approx: v.approx };
          }
          setVolData(map);
          volFetchedRef.current = symbolsKey;
        }
      })
      .catch(() => {});
  }, [trades]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio, refreshKey]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions, refreshKey]);

  useEffect(() => {
    if (activeTab === 'trades') fetchTrades();
  }, [fetchTrades, refreshKey, activeTab]);

  useEffect(() => {
    if (activeTab !== 'trades') return;
    fetchLivePrices();
    fetchVolatility();
    pollingRef.current = setInterval(fetchLivePrices, 15000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchLivePrices, fetchVolatility, activeTab, refreshKey]);

  const handleSave = async () => {
    if (!adminKey) {
      setSaveStatus({ type: 'error', message: 'Enter Admin Key above before saving.' });
      return;
    }
    setSaveStatus(null);
    try {
      const res = await fetch('/api/mirdt/execution/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
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
    if (!adminKey) {
      setter({ status: 'error', message: 'Enter Admin Key above before running operations.' });
      return;
    }
    setter({ status: 'running', message: `Running ${label}...` });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
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
    if (!adminKey) {
      setActionMessage({ id, type: 'error', msg: 'Enter Admin Key above before running actions.' });
      return;
    }
    setActionLoading(id);
    setActionMessage(null);
    try {
      const res = await fetch('/api/mirdt/execution/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
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
      key: 'live_price' as any,
      header: 'Live',
      align: 'right',
      render: (t) => {
        const price = livePrices[t.symbol];
        if (price === undefined) return <span className="font-dl-mono text-dl-gray">...</span>;
        if (t.status === 'OPEN') {
          return <span className="font-dl-mono font-medium text-dl-navy">{formatQty(price)}</span>;
        }
        return <span className="font-dl-mono text-dl-gray">{formatQty(price)}</span>;
      },
    },
    {
      key: 'k_val' as any,
      header: 'k',
      align: 'right',
      render: (t) => {
        const vol = volData[t.symbol];
        const price = livePrices[t.symbol];
        if (price === undefined) return <span className="font-dl-mono text-dl-gray">...</span>;
        const signal = computeHybridExit({
          direction: t.direction,
          entry: safeParse(t.entry_price),
          invalidationLevel: safeParse(t.stop_price),
          target: t.take_profit_p50 ? safeParse(t.take_profit_p50) : undefined,
          openedAt: t.opened_at,
          livePrice: price,
          volRatio: vol?.volRatio,
        });
        return (
          <span className="font-dl-mono text-xs">
            {signal.k.toFixed(1)}
            {vol?.approx && <span className="text-dl-gold ml-0.5" title="Volatility approximated">~</span>}
          </span>
        );
      },
    },
    {
      key: 'risk_stop' as any,
      header: 'RiskStop',
      align: 'right',
      render: (t) => {
        const vol = volData[t.symbol];
        const price = livePrices[t.symbol];
        if (price === undefined) return <span className="font-dl-mono text-dl-gray">...</span>;
        const signal = computeHybridExit({
          direction: t.direction,
          entry: safeParse(t.entry_price),
          invalidationLevel: safeParse(t.stop_price),
          target: t.take_profit_p50 ? safeParse(t.take_profit_p50) : undefined,
          openedAt: t.opened_at,
          livePrice: price,
          volRatio: vol?.volRatio,
        });
        return <span className="font-dl-mono text-dl-error">{formatQty(signal.riskStop)}</span>;
      },
    },
    {
      key: 'stop_price',
      header: 'Invalidation',
      align: 'right',
      render: (t) => <span className="font-dl-mono">{formatQty(t.stop_price)}</span>,
    },
    {
      key: 'r_multiple' as any,
      header: 'R',
      align: 'right',
      render: (t) => {
        const price = livePrices[t.symbol];
        if (price === undefined) return <span className="font-dl-mono text-dl-gray">...</span>;
        const vol = volData[t.symbol];
        const signal = computeHybridExit({
          direction: t.direction,
          entry: safeParse(t.entry_price),
          invalidationLevel: safeParse(t.stop_price),
          target: t.take_profit_p50 ? safeParse(t.take_profit_p50) : undefined,
          openedAt: t.opened_at,
          livePrice: price,
          volRatio: vol?.volRatio,
        });
        const color = signal.rMultiple > 0 ? 'text-dl-forest' : signal.rMultiple < 0 ? 'text-dl-error' : '';
        return <span className={`font-dl-mono font-medium ${color}`}>{signal.rMultiple.toFixed(2)}R</span>;
      },
    },
    {
      key: 'pnl_col' as any,
      header: 'P&L',
      align: 'right',
      render: (t) => {
        if (t.status !== 'OPEN') {
          if (t.pnl) {
            const val = parseFloat(t.pnl);
            return (
              <span className={`font-dl-mono ${val > 0 ? 'text-dl-forest' : val < 0 ? 'text-dl-error' : ''}`}>
                {formatUsd(t.pnl)} ({parseFloat(t.pnl_pct || '0').toFixed(2)}%)
              </span>
            );
          }
          return <span className="font-dl-mono">—</span>;
        }
        const price = livePrices[t.symbol];
        if (price === undefined) return <span className="font-dl-mono text-dl-gray">...</span>;
        const vol = volData[t.symbol];
        const signal = computeHybridExit({
          direction: t.direction,
          entry: safeParse(t.entry_price),
          invalidationLevel: safeParse(t.stop_price),
          target: t.take_profit_p50 ? safeParse(t.take_profit_p50) : undefined,
          openedAt: t.opened_at,
          livePrice: price,
          volRatio: vol?.volRatio,
        });
        const color = signal.unrealizedPnl > 0 ? 'text-dl-forest' : signal.unrealizedPnl < 0 ? 'text-dl-error' : '';
        return (
          <span className={`font-dl-mono ${color}`}>
            {formatUsd(signal.unrealizedPnl)} ({signal.unrealizedPnlPct.toFixed(2)}%)
          </span>
        );
      },
    },
    {
      key: 'exit_badge' as any,
      header: 'Signal',
      render: (t) => {
        if (t.status !== 'OPEN') {
          if (t.exit_reason) return <span className="font-dl-mono text-xs">{t.exit_reason}</span>;
          if (t.outcome) {
            const color = t.outcome === 'WIN' ? 'text-dl-forest' : t.outcome === 'LOSS' ? 'text-dl-error' : 'text-dl-gray';
            return <span className={`font-dl-mono font-medium ${color}`}>{t.outcome}</span>;
          }
          return <span className="font-dl-mono text-dl-gray">—</span>;
        }
        const price = livePrices[t.symbol];
        if (price === undefined) return <span className="font-dl-mono text-dl-gray">...</span>;
        const vol = volData[t.symbol];
        const signal = computeHybridExit({
          direction: t.direction,
          entry: safeParse(t.entry_price),
          invalidationLevel: safeParse(t.stop_price),
          target: t.take_profit_p50 ? safeParse(t.take_profit_p50) : undefined,
          openedAt: t.opened_at,
          livePrice: price,
          volRatio: vol?.volRatio,
        });
        return (
          <span className={`inline-block px-2 py-0.5 text-xs font-dl-mono font-medium border ${hybridBadgeColor(signal.badge)}`}>
            {signal.badge}
          </span>
        );
      },
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
        const currentPrice = livePrices[t.symbol];
        const hasPriceData = currentPrice !== undefined && currentPrice > 0;
        return (
          <button
            onClick={() => handleCloseTrade(t.id, String(currentPrice))}
            disabled={actionLoading === t.id || !hasPriceData}
            className="px-2 py-1 bg-dl-error text-white font-dl-mono text-xs disabled:bg-dl-gray"
            title={hasPriceData ? `Close at $${currentPrice.toFixed(2)}` : 'Waiting for live price...'}
          >
            {actionLoading === t.id ? '...' : hasPriceData ? 'CLOSE' : 'NO PRICE'}
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
        <div className="flex border-b border-dl-border mb-6" role="tablist">
          {([['console', 'Console'], ['guide', 'Guide & FAQ']] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={execViewMode === id}
              onClick={() => setExecViewMode(id as ExecViewMode)}
              className={`px-6 py-3 text-sm font-dl-mono uppercase tracking-wider border-b-2 ${
                execViewMode === id ? 'border-dl-navy text-dl-navy font-medium' : 'border-transparent text-dl-gray'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {execViewMode === 'guide' && <ExecutionGuide />}

        {execViewMode === 'console' && (<>
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
          <SectionHeading>Authentication</SectionHeading>
          <div className="flex items-center gap-3 mt-3">
            <label className="text-xs font-dl-mono text-dl-gray whitespace-nowrap">ADMIN KEY</label>
            <input
              type={adminKeyVisible ? 'text' : 'password'}
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin key to enable operations"
              className="flex-1 border border-dl-border bg-white px-3 py-2 font-dl-mono text-xs text-dl-navy"
            />
            <button
              onClick={() => setAdminKeyVisible(!adminKeyVisible)}
              className="px-3 py-2 border border-dl-border font-dl-mono text-xs text-dl-gray"
            >
              {adminKeyVisible ? 'HIDE' : 'SHOW'}
            </button>
            {adminKey && (
              <span className="text-xs font-dl-mono text-dl-forest">Ready</span>
            )}
          </div>
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

            {pricesUpdatedAt && trades.length > 0 && (
              <p className="text-xs font-dl-mono text-dl-gray mb-2">
                PRICES UPDATED: {new Date(pricesUpdatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (polling every 15s)
                {pricesStale && <span className="text-dl-gold ml-2">[STALE]</span>}
                {Object.keys(volData).length > 0 && (
                  <span className="ml-3">VOL DATA: {Object.keys(volData).length} symbols loaded</span>
                )}
              </p>
            )}

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
        </>)}
      </PageShell>
    </DesignLawLayout>
  );
}