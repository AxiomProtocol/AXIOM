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

type ViewMode = 'terminal' | 'guide';

interface FAQItem { q: string; a: string; }

const MIRDT_FAQS: FAQItem[] = [
  { q: 'What is MIRDT?', a: 'The Market Intelligence and Risk Disclosure Terminal is a probabilistic trend-following analysis engine. It scans equity and digital asset markets for statistical setups based on moving average crossovers, momentum indicators, and volatility measurements. Every output includes explicit invalidation conditions and confidence scores.' },
  { q: 'Does MIRDT predict the future?', a: 'No. MIRDT identifies statistical patterns that have historically preceded directional moves. All outputs are probabilistic and backward-looking. Markets can and do behave differently from historical patterns. MIRDT provides analysis, not predictions or guarantees.' },
  { q: 'What is a "setup"?', a: 'A setup is a structured market observation that includes: the asset symbol, a directional thesis (LONG or SHORT), an entry price zone, an invalidation price (where the thesis is considered wrong), a confidence score, probability estimates (P5/P50/P95), a volatility estimate, and a time horizon. Each setup has a unique ID and an immutable data snapshot reference.' },
  { q: 'What asset classes does MIRDT cover?', a: 'MIRDT currently scans two asset classes: US equities (via Alpha Vantage OHLCV data) and digital assets (via CoinGecko OHLCV data). The system generates setups for any asset where the statistical criteria are met.' },
  { q: 'How does the confidence score work?', a: 'The confidence score represents the statistical strength of the observed pattern on a 0-100 scale. It is derived from signal strength (z-score of moving average crossover), trend alignment across multiple timeframes, and historical pattern reliability. A higher score indicates stronger statistical evidence, not certainty of outcome.' },
  { q: 'What does "invalidation" mean?', a: 'Every setup includes an invalidation price. If the market reaches this level, the original thesis is considered structurally broken and the setup is automatically marked as INVALIDATED. This is a core safety feature: every observation has a pre-defined point at which it is wrong.' },
  { q: 'What are P5, P50, and P95?', a: 'These are probabilistic price estimates based on historical volatility. P5 represents the 5th percentile (bearish extreme), P50 the median expected price, and P95 the 95th percentile (bullish extreme). They define the expected distribution of price outcomes over the setup horizon.' },
  { q: 'What is Signal Z?', a: 'Signal Z is the standardized z-score of the moving average crossover signal. A positive z-score indicates bullish momentum, a negative z-score indicates bearish momentum. Values beyond +/- 2.0 represent strong statistical deviation from the mean.' },
  { q: 'How often does MIRDT scan?', a: 'Market scans can be run on demand or on a scheduled basis. Each scan analyzes all configured assets, generates new setups where criteria are met, checks existing setups for invalidation, and marks expired setups past their horizon.' },
  { q: 'Is MIRDT the same as Sentinel?', a: 'No. MIRDT generates market intelligence (the raw setups and observations). Sentinel is a separate system that consumes MIRDT outputs and makes capital authorization decisions based on risk criteria, regime analysis, and portfolio constraints. MIRDT is the intelligence layer; Sentinel is the decision layer.' },
  { q: 'Can I use MIRDT outputs to trade?', a: 'MIRDT outputs are informational only and do not constitute investment advice, recommendations, or solicitations. Any capital deployment decisions are made entirely at your own discretion and risk. Axiom Protocol is not a registered investment advisor.' },
  { q: 'What happens when a setup expires?', a: 'Each setup has a time horizon (in days). When the horizon is reached without the invalidation price being hit, the setup is automatically marked as EXPIRED. Expired setups remain in the audit trail for transparency.' },
];

const PIPELINE_STEPS = [
  { step: '01', title: 'Market Scan', detail: 'MIRDT retrieves OHLCV (Open, High, Low, Close, Volume) data for all configured assets across equities and digital assets. It computes simple moving averages (SMA20, SMA50), directional slopes, volatility estimates, and z-scores for each asset.' },
  { step: '02', title: 'Setup Generation', detail: 'When an asset meets the statistical criteria (moving average crossover, sufficient signal strength, adequate liquidity), a setup record is created. The setup captures the directional thesis, entry zone, invalidation price, confidence score, and probability distribution.' },
  { step: '03', title: 'Data Snapshot', detail: 'Every setup is linked to an immutable data snapshot reference. This preserves the exact market conditions at the time of generation, ensuring full auditability and preventing look-ahead bias.' },
  { step: '04', title: 'Invalidation Monitoring', detail: 'Active setups are continuously monitored against live market prices. If the price crosses the invalidation level, the setup is automatically marked as INVALIDATED. Every thesis has a defined failure point.' },
  { step: '05', title: 'Expiration Sweep', detail: 'Setups that exceed their time horizon without being invalidated are marked as EXPIRED. This ensures the system only presents current, time-relevant analysis.' },
  { step: '06', title: 'Downstream Consumption', detail: 'Active setups can be consumed by the Sentinel authorization layer for capital decision-making, or viewed directly on the MIRDT terminal for manual analysis. All outputs flow through the same deterministic pipeline.' },
];

const SETUP_FIELDS = [
  ['Symbol', 'The asset ticker (e.g., BTC, ETH, META, GOOGL)'],
  ['Asset Type', 'CRYPTO (digital assets) or EQUITY (US equities)'],
  ['Direction', 'LONG (expecting price to rise) or SHORT (expecting price to fall)'],
  ['Entry Zone', 'A price range where the statistical setup is most favorable for entry'],
  ['Invalidation Price', 'The price at which the thesis is structurally broken'],
  ['Confidence Score', 'Statistical strength of the pattern (0-100 scale)'],
  ['Signal Z', 'Standardized z-score of the moving average crossover signal'],
  ['P5 / P50 / P95', 'Probabilistic price distribution over the setup horizon'],
  ['Volatility', 'Estimated annualized volatility of the asset'],
  ['Horizon', 'Number of days for which the setup is valid'],
  ['Status', 'ACTIVE, INVALIDATED, or EXPIRED'],
  ['Data Snapshot Ref', 'Immutable reference to market data at time of generation'],
];

function MIRDTGuide() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading>Introduction</SectionHeading>
        <div className="border border-dl-border p-6 space-y-4 text-sm text-dl-gray leading-relaxed">
          <p>
            The Market Intelligence and Risk Disclosure Terminal (MIRDT) is Axiom Protocol's probabilistic
            trend-following analysis engine. It scans equity and digital asset markets to identify statistical
            patterns that have historically preceded directional price movements.
          </p>
          <p>
            Every output produced by MIRDT is probabilistic and backward-looking. Setups represent structured
            observations with explicit confidence levels, invalidation conditions, and time horizons. MIRDT
            does not predict the future. It identifies where historical statistical evidence suggests
            a directional bias may exist.
          </p>
          <p>
            MIRDT serves as the intelligence layer in the Axiom Protocol stack. Its outputs can be consumed
            by the Sentinel authorization layer for automated risk-gated capital decisions, or reviewed
            directly by operators on the terminal interface.
          </p>
          <div className="border-l-2 border-dl-gold pl-4 mt-4">
            <p className="text-xs font-dl-mono text-dl-navy">
              KEY PRINCIPLE: Every setup has a defined invalidation point. If the market reaches that price,
              the thesis is structurally wrong and the setup is retired. No exceptions.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading>Core Capabilities</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Multi-Asset Scanning', desc: 'Covers US equities (Alpha Vantage) and digital assets (CoinGecko) with configurable asset lists and scan frequencies.' },
            { title: 'Probabilistic Outputs', desc: 'Every setup includes P5/P50/P95 price estimates, confidence scores, and volatility measurements. No absolute predictions.' },
            { title: 'Invalidation Discipline', desc: 'Pre-defined invalidation prices for every setup. If hit, the thesis is automatically marked as wrong.' },
            { title: 'Immutable Audit Trail', desc: 'Each setup links to a data snapshot reference, preserving the exact conditions at the time of generation.' },
            { title: 'Signal Z-Scores', desc: 'Standardized signal strength measurement based on moving average crossover magnitude, providing objective comparison across assets.' },
            { title: 'Time-Bounded Analysis', desc: 'Every setup has a defined horizon. Stale analysis is automatically expired, preventing outdated signals from persisting.' },
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
        <p className="text-sm text-dl-gray mb-4">
          The MIRDT pipeline is fully deterministic. Given the same market data inputs, it will always
          produce the same outputs. There is no discretionary element in setup generation.
        </p>
        <div className="space-y-3">
          {PIPELINE_STEPS.map((s) => (
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
        <SectionHeading>Setup Anatomy</SectionHeading>
        <p className="text-sm text-dl-gray mb-4">
          Each MIRDT setup contains the following data fields. Understanding these fields is essential
          for interpreting the terminal output correctly.
        </p>
        <div className="border border-dl-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dl-border bg-dl-bg-alt">
                <th className="text-left px-4 py-2 font-dl-mono text-xs text-dl-gray">FIELD</th>
                <th className="text-left px-4 py-2 font-dl-mono text-xs text-dl-gray">DESCRIPTION</th>
              </tr>
            </thead>
            <tbody>
              {SETUP_FIELDS.map(([field, desc], i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-dl-bg-alt'}>
                  <td className="px-4 py-2 font-dl-mono text-xs text-dl-navy whitespace-nowrap">{field}</td>
                  <td className="px-4 py-2 text-xs text-dl-gray">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionHeading>Using the Terminal</SectionHeading>
        <div className="border border-dl-border p-6 space-y-5 text-sm text-dl-gray leading-relaxed">
          {[
            { title: 'Step 1: Access the Terminal', body: 'Switch to the "Terminal" tab above to view all setups with their current status, confidence scores, and price data.' },
            { title: 'Step 2: Filter and Browse', body: 'Use the status filter to view Active, Expired, or Invalidated setups. Filter by asset class (Digital Assets or Equities) to narrow your view. Click any row to see the full setup detail.' },
            { title: 'Step 3: Run Operations', body: 'The Operations panel provides four controls: Full Cycle (runs all steps), Market Scan (generates new setups), Check Invalidations (verifies existing setups against live prices), and Expire Stale Setups (retires setups past their horizon).' },
            { title: 'Step 4: Review Setup Details', body: 'Clicking a setup row opens its detail view with the full thesis summary, rationale trace, probability distribution, and the complete data snapshot used to generate the observation.' },
            { title: 'Step 5: Monitor Status Changes', body: 'Use auto-refresh (1min, 5min, or 15min intervals) to monitor setups as market conditions evolve. Watch for status transitions from ACTIVE to INVALIDATED or EXPIRED.' },
          ].map((step, i) => (
            <div key={i}>
              <p className="font-medium text-dl-navy">{step.title}</p>
              <p className="mt-1">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>System Architecture</SectionHeading>
        <div className="border border-dl-border p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-dl-border-light p-4">
              <p className="font-dl-mono text-xs text-dl-navy mb-2">DATA SOURCES</p>
              <p className="text-xs text-dl-gray">Alpha Vantage (US Equities OHLCV)</p>
              <p className="text-xs text-dl-gray">CoinGecko (Digital Asset OHLCV)</p>
            </div>
            <div className="border border-dl-border-light p-4">
              <p className="font-dl-mono text-xs text-dl-navy mb-2">PROCESSING</p>
              <p className="text-xs text-dl-gray">SMA Computation (20/50)</p>
              <p className="text-xs text-dl-gray">Z-Score Calculation</p>
              <p className="text-xs text-dl-gray">Volatility Estimation</p>
              <p className="text-xs text-dl-gray">Probability Distribution</p>
            </div>
            <div className="border border-dl-border-light p-4">
              <p className="font-dl-mono text-xs text-dl-navy mb-2">OUTPUTS</p>
              <p className="text-xs text-dl-gray">Structured Setups (PostgreSQL)</p>
              <p className="text-xs text-dl-gray">Immutable Snapshots</p>
              <p className="text-xs text-dl-gray">Sentinel Signal Feed</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading>Frequently Asked Questions</SectionHeading>
        <div className="border border-dl-border-light">
          {MIRDT_FAQS.map((item, i) => (
            <div key={i} className={i < MIRDT_FAQS.length - 1 ? 'border-b border-dl-border-light' : ''}>
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
        <SectionHeading>Download</SectionHeading>
        <div className="border border-dl-border p-6">
          <p className="text-sm text-dl-gray mb-4">
            Download the comprehensive Sentinel Intelligence Brief covering MIRDT, Sentinel,
            and the Execution Engine architecture, capabilities, and operational status.
          </p>
          <a
            href="/downloads/axiom-sentinel-intelligence-brief.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-dl-navy text-white font-dl-mono text-xs"
          >
            OPEN SENTINEL INTELLIGENCE BRIEF
          </a>
          <p className="text-xs text-dl-gray mt-2">Opens in a new tab. Use the "Save as PDF" button or your browser's print function to download.</p>
        </div>
      </section>

      <section>
        <SectionHeading>Important Disclosures</SectionHeading>
        <div className="border border-dl-border p-6 space-y-3 text-xs text-dl-gray leading-relaxed">
          <p>
            All analysis presented by the Market Intelligence and Risk Disclosure Terminal is probabilistic
            and backward-looking. Setups represent statistical observations derived from historical market
            data and do not constitute investment recommendations, solicitations, or advice.
          </p>
          <p>
            Axiom Protocol does not provide investment advice. Market conditions change without notice.
            All capital deployment decisions carry inherent risk of partial or total loss. Users should
            consult qualified financial professionals before making any investment decisions.
          </p>
          <p>
            Past patterns do not guarantee future outcomes. Confidence scores reflect statistical evidence
            strength, not probability of profit. The invalidation mechanism is a risk management tool,
            not a guarantee against loss.
          </p>
        </div>
      </section>
    </div>
  );
}

export default function MIRDTIndex() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('terminal');
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
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text.length > 100 ? text.slice(0, 100) + '...' : text || 'Empty response from server');
      }
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
      <div className="flex border-b border-dl-border mb-6" role="tablist">
        {([['terminal', 'Terminal'], ['guide', 'Guide & FAQ']] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={viewMode === id}
            onClick={() => setViewMode(id as ViewMode)}
            className={`px-6 py-3 text-sm font-dl-mono uppercase tracking-wider border-b-2 ${
              viewMode === id ? 'border-dl-navy text-dl-navy font-medium' : 'border-transparent text-dl-gray'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {viewMode === 'guide' && (
        <MIRDTGuide />
      )}

      {viewMode === 'terminal' && (<>
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
              className="px-2 py-1 border border-dl-border bg-dl-bg text-dl-navy font-dl-mono text-xs"
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
          className="px-3 py-2 border border-dl-border bg-dl-bg text-dl-navy font-dl-mono text-xs"
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
      </>)}
    </PageShell>
    </DesignLawLayout>
  );
}
