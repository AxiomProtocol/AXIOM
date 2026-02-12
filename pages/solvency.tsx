import { useState, useEffect } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import { DesignLawLayout, SectionHeading, DetailGrid, DisclosureBlock, PaginationControls } from '../components/design-law';

const HistoryChart = dynamic(() => import('../components/solvency/HistoryChart'), { ssr: false });

interface CompositionItem {
  label: string;
  valueUsd: number;
  pct: number;
}

interface SourceItem {
  label: string;
  detail: string;
}

interface SolvencyMetrics {
  schemaVersion: string;
  dataStatus: 'ok' | 'empty' | 'partial';
  asOfUtc: string;
  snapshotId: string;
  checksum: string;
  treasuryTotalUsd: number;
  treasuryLiquidUsd: number;
  reservesTotalUsd: number;
  liabilitiesTotalUsd: number;
  reserveRatio: number;
  coverageRatio: number;
  lossBufferUsd: number;
  policyMode: string;
  regimeState: string;
  hardBrake: string;
  gateStatus: string;
  composition: CompositionItem[];
  limitations: string[];
  sources: SourceItem[];
}

interface SolvencyPageProps {
  metrics: SolvencyMetrics | null;
}

function fmtUsd(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtRatio(value: number): string {
  return (value * 100).toFixed(2) + '%';
}

function fmtTimestamp(iso: string): string {
  try {
    return new Date(iso).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  } catch {
    return iso;
  }
}

function regimeBandColor(band: string): string {
  switch (band) {
    case 'STABLE': return 'text-dl-forest';
    case 'CAUTION': return 'text-dl-gold';
    case 'STRESS': return 'text-dl-error';
    case 'CRISIS': return 'text-dl-error';
    default: return 'text-dl-gray';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'OK': return 'text-dl-forest';
    case 'BREACH': return 'text-dl-gold';
    case 'CRISIS': return 'text-dl-error';
    default: return 'text-dl-gray';
  }
}

function fmtDecimal(value: number | string, decimals: number = 4): string {
  return Number(value).toFixed(decimals);
}

const AME_SCENARIOS = [
  { key: 'MARKET_CORRECTION', label: 'Market Correction' },
  { key: 'LIQUIDITY_CRISIS', label: 'Liquidity Crisis' },
  { key: 'BLACK_SWAN', label: 'Black Swan' },
  { key: 'DEPEG', label: 'Stablecoin Depeg' },
  { key: 'GOVERNANCE_ATTACK', label: 'Governance Attack' },
];

const DEFINITIONS = [
  { term: 'Treasury', definition: 'The total pool of protocol-controlled capital, including liquid holdings, locked positions, and operational reserves. Treasury represents the full balance sheet of assets under protocol governance.' },
  { term: 'Reserves', definition: 'Capital specifically designated to backstop obligations. Reserves are a subset of the treasury, earmarked under stabilization policy to meet liabilities and absorb potential losses.' },
  { term: 'AXUSD Issued', definition: 'The total supply of AXUSD stablecoin tokens minted by the protocol. This figure represents all AXUSD currently in circulation on Arbitrum One. As the protocol matures, issued AXUSD held by external participants constitutes redeemable obligations.' },
  { term: 'Loss Buffer', definition: 'A dedicated capital cushion that absorbs losses before reserves are impacted. The loss buffer serves as the first line of defense in the capital waterfall.' },
  { term: 'Coverage Ratio', definition: 'The ratio of total available capital (treasury plus reserves) to total liabilities. A coverage ratio above 1.0 indicates that the protocol holds more assets than it owes.' },
  { term: 'Reserve Ratio', definition: 'The ratio of designated reserves to total liabilities. This metric indicates the proportion of obligations directly backed by earmarked reserve capital.' },
];

const WATERFALL_STEPS = [
  { order: '1', label: 'Loss Buffer', description: 'Absorbs initial losses. This dedicated capital cushion is consumed first before any other capital layer is affected.' },
  { order: '2', label: 'Designated Reserves', description: 'If losses exceed the loss buffer, designated reserve capital is drawn upon to meet remaining obligations.' },
  { order: '3', label: 'Treasury General', description: 'If reserves are insufficient, the broader treasury pool may be utilized under governance authorization to cover shortfalls.' },
  { order: '4', label: 'Participant Capital', description: 'Only after all protocol-controlled buffers are exhausted does participant capital bear loss exposure. This is the last layer of absorption.' },
];

const POLICY_MODES = [
  { mode: 'BOOTSTRAP', trigger: 'Protocol initialization phase. Metrics are informational only. No stabilization actions are active.', color: 'text-dl-gray' },
  { mode: 'NORMAL', trigger: 'Reserve and coverage ratios are within target thresholds. Standard operations apply with routine monitoring.', color: 'text-dl-forest' },
  { mode: 'CAUTION', trigger: 'One or more metrics have crossed advisory thresholds. Enhanced monitoring is active. No restrictions on operations.', color: 'text-dl-gold' },
  { mode: 'RESTRICTED', trigger: 'Metrics have breached intervention thresholds. Certain operations may be limited. Capital deployment is paused pending review.', color: 'text-dl-error' },
  { mode: 'EMERGENCY', trigger: 'Critical threshold breach. All non-essential operations are suspended. Governance intervention is required.', color: 'text-dl-error' },
];

const FAQ_ITEMS = [
  {
    q: 'What does solvency mean in this context?',
    a: 'Solvency refers to the protocol ability to meet all outstanding obligations using its available capital. A solvent protocol holds sufficient assets to cover all liabilities, with additional reserves providing a margin of safety.',
  },
  {
    q: 'How often is the data on this page updated?',
    a: 'Snapshot data is updated periodically by the protocol administrator. Updates typically occur daily, but may vary based on operational requirements. The "as of" timestamp and snapshot identifier indicate exactly when the displayed data was captured.',
  },
  {
    q: 'What does the coverage ratio represent?',
    a: 'The coverage ratio measures total available capital (treasury plus reserves) divided by total liabilities. A ratio above 1.0 means the protocol holds more assets than it owes. For example, a coverage ratio of 1.50 means there is $1.50 in assets for every $1.00 of obligations.',
  },
  {
    q: 'What happens if reserves drop below the target level?',
    a: 'If reserves decline below established thresholds, the policy mode transitions from NORMAL to CAUTION or RESTRICTED. This triggers enhanced monitoring and may limit certain operations until reserves are restored to target levels.',
  },
  {
    q: 'Can I independently verify the data shown here?',
    a: 'Yes. Each snapshot includes a checksum (a cryptographic fingerprint of the underlying data). You can compare this checksum against the on-record snapshot to confirm data integrity. The snapshot identifier and timestamp provide an audit trail.',
  },
  {
    q: 'What is a checksum and why does it matter?',
    a: 'A checksum is a short alphanumeric string derived from the complete dataset using a cryptographic digest function. If any value in the underlying data changes, the checksum changes. This allows anyone to verify that the displayed data has not been altered since the snapshot was recorded.',
  },
  {
    q: 'What does the policy mode indicate?',
    a: 'Policy mode reflects the current operational posture of the protocol stabilization system. NORMAL indicates healthy operations. CAUTION signals elevated monitoring. RESTRICTED means certain actions are limited. EMERGENCY indicates a critical situation requiring governance intervention.',
  },
  {
    q: 'What is the loss buffer and how does it protect capital?',
    a: 'The loss buffer is a dedicated capital reserve that absorbs losses before any other capital layer is impacted. It serves as the first line of defense in the capital waterfall, protecting designated reserves, treasury capital, and ultimately participant capital from loss exposure.',
  },
  {
    q: 'Who controls the treasury and how are decisions made?',
    a: 'Treasury operations are governed by multi-party authorization controls. No single party can unilaterally move or deploy capital. All treasury actions require defined approval workflows and produce audit-traceable records visible through protocol reporting.',
  },
  {
    q: 'Is this data audited by an independent third party?',
    a: 'The protocol maintains internal audit trails and cryptographic verification of all snapshots. Independent third-party audits are planned as part of the protocol maturity roadmap. Current data integrity relies on snapshot checksums and administrative controls.',
  },
  {
    q: 'What is the difference between treasury total and treasury liquid?',
    a: 'Treasury total represents all capital under protocol governance, including locked or deployed positions. Treasury liquid represents the portion that is immediately available and can be redeemed or redeployed without unwinding existing commitments.',
  },
  {
    q: 'What does BOOTSTRAP policy mode mean?',
    a: 'BOOTSTRAP indicates the protocol is in its initialization phase. During this period, all metrics are informational. Stabilization policies are not yet active, and the system is building toward operational thresholds required for NORMAL mode.',
  },
];

const VIEW_DESCRIPTIONS: Record<string, string> = {
  allocator: 'Capital adequacy metrics, asset composition, and loss absorption structure for institutional capital allocation decisions.',
  clearinghouse: 'Counterparty risk assessment, AXUSD stability modeling, stress test scenarios, and historical solvency tracking.',
  regulatory: 'Full disclosure documentation, compliance definitions, audit verification procedures, and risk reporting framework.',
};

const AME_HISTORY_PAGE_SIZE = 10;

export default function SolvencyPage({ metrics }: SolvencyPageProps) {
  const [viewMode, setViewMode] = useState<'allocator' | 'clearinghouse' | 'regulatory'>('allocator');
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<SolvencyMetrics | null>(metrics);
  const [axusdStability, setAxusdStability] = useState<any>(null);
  const [stressResults, setStressResults] = useState<any[]>([]);
  const [stressLoading, setStressLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [ameData, setAmeData] = useState<any>(null);
  const [ameLoading, setAmeLoading] = useState(true);
  const [ameStressResult, setAmeStressResult] = useState<any>(null);
  const [ameStressLoading, setAmeStressLoading] = useState(false);
  const [ameStressScenario, setAmeStressScenario] = useState('MARKET_CORRECTION');
  const [ameHistory, setAmeHistory] = useState<any[]>([]);
  const [ameHistoryPage, setAmeHistoryPage] = useState(1);
  const [liabilityMode, setLiabilityMode] = useState<'GROSS' | 'NET'>('GROSS');

  const m = liveMetrics;

  useEffect(() => {
    fetch('/api/solvency/ame/latest')
      .then(res => res.json())
      .then(data => { setAmeData(data); setAmeLoading(false); })
      .catch(() => setAmeLoading(false));
  }, []);

  useEffect(() => {
    if (viewMode !== 'regulatory') return;
    fetch('/api/solvency/ame/history?metricKey=RS&limit=100')
      .then(res => res.json())
      .then(data => { if (data.points) setAmeHistory(data.points); })
      .catch(() => {});
  }, [viewMode]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/solvency/metrics');
      const data = await res.json();
      setLiveMetrics(data);
    } catch {
    } finally {
      setRefreshing(false);
    }
  };

  const toggleFaq = (idx: number) => {
    setFaqOpen((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const policyColor = (mode: string): string => {
    switch (mode) {
      case 'NORMAL': return 'text-dl-forest';
      case 'CAUTION': return 'text-dl-gold';
      case 'RESTRICTED':
      case 'EMERGENCY': return 'text-dl-error';
      default: return 'text-dl-gray';
    }
  };

  const stabilityScoreColor = (score: string): string => {
    switch (score) {
      case 'STRONG': return 'text-dl-forest';
      case 'ADEQUATE': return 'text-dl-navy';
      case 'WEAK': return 'text-dl-gold';
      case 'CRITICAL': return 'text-dl-error';
      default: return 'text-dl-gray';
    }
  };

  useEffect(() => {
    if (viewMode !== 'clearinghouse') return;
    fetch('/api/solvency/latest')
      .then((res) => res.json())
      .then((data) => {
        if (data.axusdStability) setAxusdStability(data.axusdStability);
      })
      .catch(() => {});
    fetch('/api/solvency/history?limit=30')
      .then((res) => res.json())
      .then((data) => {
        if (data.points) setHistoryData(data.points);
      })
      .catch(() => {});
  }, [viewMode]);

  const runStressScenarios = async () => {
    setStressLoading(true);
    try {
      const res = await fetch('/api/solvency/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (data.results) setStressResults(data.results);
    } catch {
    } finally {
      setStressLoading(false);
    }
  };

  const runAmeStress = async () => {
    setAmeStressLoading(true);
    try {
      const res = await fetch('/api/solvency/ame/stress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioKey: ameStressScenario }),
      });
      const data = await res.json();
      setAmeStressResult(data);
    } catch {
    } finally {
      setAmeStressLoading(false);
    }
  };

  const renderAmeStatusStrip = () => {
    if (ameLoading) {
      return (
        <div className="border border-dl-border p-4 mb-8 bg-dl-bg-alt">
          <p className="text-sm text-dl-gray font-dl-mono">Loading AME data...</p>
        </div>
      );
    }
    if (!ameData || !ameData.regimeBand) {
      return (
        <div className="border border-dl-border p-4 mb-8 bg-dl-bg-alt">
          <p className="text-sm text-dl-gray font-dl-mono">AME evaluation data not available.</p>
        </div>
      );
    }
    const primaryAction = ameData.actions && ameData.actions.length > 0
      ? ameData.actions[0].action.replace('ACTION_', '').replace(/_/g, ' ')
      : 'None';
    return (
      <div className="grid grid-cols-4 border border-dl-border mb-8">
        <div className="px-4 py-3 border-r border-dl-border bg-dl-bg-alt">
          <p className="text-xs text-dl-gray mb-1">Last AME Evaluation</p>
          <p className="text-sm font-dl-mono text-dl-navy">{fmtTimestamp(ameData.timestamp)}</p>
        </div>
        <div className="px-4 py-3 border-r border-dl-border bg-dl-bg-alt">
          <p className="text-xs text-dl-gray mb-1">Regime Band</p>
          <p className={`text-sm font-dl-mono font-semibold ${regimeBandColor(ameData.regimeBand)}`}>{ameData.regimeBand}</p>
        </div>
        <div className="px-4 py-3 border-r border-dl-border bg-dl-bg-alt">
          <p className="text-xs text-dl-gray mb-1">Breach Status</p>
          <p className={`text-sm font-dl-mono font-semibold ${statusColor(ameData.status)}`}>{ameData.status}</p>
        </div>
        <div className="px-4 py-3 bg-dl-bg-alt">
          <p className="text-xs text-dl-gray mb-1">Primary Action</p>
          <p className="text-sm font-dl-mono text-dl-navy">{primaryAction}</p>
        </div>
      </div>
    );
  };

  const renderMetricsGrid = () => {
    if (m && m.dataStatus !== 'empty') {
      return (
        <div className="mb-10">
          <SectionHeading>Live metrics</SectionHeading>
          <DetailGrid
            left={[
              { label: 'Treasury Total', value: fmtUsd(m.treasuryTotalUsd), mono: true },
              { label: 'Treasury Liquid', value: fmtUsd(m.treasuryLiquidUsd), mono: true },
              { label: 'Reserves Total', value: fmtUsd(m.reservesTotalUsd), mono: true },
              { label: 'AXUSD Issued', value: fmtUsd(m.liabilitiesTotalUsd), mono: true },
            ]}
            right={[
              { label: 'Reserve Ratio', value: fmtRatio(m.reserveRatio), mono: true },
              { label: 'Coverage Ratio', value: fmtRatio(m.coverageRatio), mono: true },
              { label: 'Loss Buffer', value: fmtUsd(m.lossBufferUsd), mono: true },
              { label: 'Policy Mode', value: <span className={policyColor(m.policyMode)}>{m.policyMode}</span>, mono: true },
            ]}
          />
        </div>
      );
    }
    if (m && m.dataStatus === 'empty') {
      return (
        <div className="mb-10">
          <SectionHeading>Live metrics</SectionHeading>
          <DetailGrid
            left={[
              { label: 'Treasury Total', value: fmtUsd(0), mono: true },
              { label: 'Treasury Liquid', value: fmtUsd(0), mono: true },
              { label: 'Reserves Total', value: fmtUsd(0), mono: true },
              { label: 'AXUSD Issued', value: fmtUsd(0), mono: true },
            ]}
            right={[
              { label: 'Reserve Ratio', value: '0.00%', mono: true },
              { label: 'Coverage Ratio', value: '0.00%', mono: true },
              { label: 'Loss Buffer', value: fmtUsd(0), mono: true },
              { label: 'Policy Mode', value: <span className="text-dl-gray">BOOTSTRAP</span>, mono: true },
            ]}
          />
        </div>
      );
    }
    return null;
  };

  const renderAmeAllocatorSection = () => {
    if (!ameData || !ameData.regimeBand) return null;
    const ratios = ameData.ratios || {};
    const targets = ameData.targets || {};
    const metricRows = [
      { label: 'Coverage Ratio (CR)', actual: ratios.coverageRatio, target: targets.crTarget, key: 'cr' },
      { label: 'Reserve Ratio (RR)', actual: ratios.reserveRatio, target: targets.rrTarget, key: 'rr' },
      { label: 'Loss Buffer Ratio (LBR)', actual: ratios.lossBufferRatio, target: targets.lbrTarget, key: 'lbr' },
      { label: 'Liquidity Depth (LD)', actual: ratios.liquidityDepth, target: targets.ldTarget, key: 'ld' },
    ];
    const activeActions = (ameData.actions || []).filter((a: any) => a.breached);
    return (
      <div className="mb-10">
        <SectionHeading>Adaptive Metrics Engine</SectionHeading>
        <DetailGrid
          left={[
            { label: 'Regime Score (RS)', value: fmtDecimal(ameData.rs), mono: true },
            { label: 'Policy Multiplier (PM)', value: fmtDecimal(ameData.pm, 2), mono: true },
          ]}
          right={[
            { label: 'Payout Factor (PF)', value: fmtDecimal(ameData.payoutFactor, 2), mono: true },
            { label: 'Regime Band', value: <span className={regimeBandColor(ameData.regimeBand)}>{ameData.regimeBand}</span>, mono: true },
          ]}
        />
        <div className="border border-dl-border mb-6">
          <div className="grid grid-cols-4 px-6 py-3 bg-dl-bg border-b border-dl-border">
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Metric</p>
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Actual</p>
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Target</p>
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Status</p>
          </div>
          {metricRows.map((row, i) => {
            const actual = row.actual != null ? Number(row.actual) : 0;
            const target = row.target != null ? Number(row.target) : 0;
            const met = actual >= target;
            return (
              <div
                key={row.key}
                className={`grid grid-cols-4 px-6 py-3 ${i < metricRows.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}
              >
                <p className="text-sm text-dl-navy">{row.label}</p>
                <p className="text-sm font-dl-mono text-dl-navy text-right">{fmtDecimal(actual)}</p>
                <p className="text-sm font-dl-mono text-dl-navy text-right">{fmtDecimal(target)}</p>
                <p className={`text-sm font-dl-mono text-right font-semibold ${met ? 'text-dl-forest' : 'text-dl-error'}`}>
                  {met ? 'Met' : 'Breached'}
                </p>
              </div>
            );
          })}
        </div>
        {activeActions.length > 0 && (
          <div className="border border-dl-border p-6 bg-dl-bg-alt">
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-3">Active Policy Actions</p>
            {activeActions.map((a: any, i: number) => (
              <div key={i} className={`py-2 ${i < activeActions.length - 1 ? 'border-b border-dl-border' : ''}`}>
                <p className="text-sm font-dl-mono text-dl-error font-semibold">{a.action.replace('ACTION_', '').replace(/_/g, ' ')}</p>
                <p className="text-xs text-dl-gray mt-1">{a.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAllocatorView = () => (
    <>
      {renderMetricsGrid()}
      {renderAmeAllocatorSection()}

      {m && m.composition && m.composition.length > 0 && (
        <div className="mb-10">
          <SectionHeading>Composition</SectionHeading>
          <div className="border border-dl-border">
            <div className="grid grid-cols-3 px-6 py-3 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Asset</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Value (USD)</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Allocation</p>
            </div>
            {m.composition.map((item, i) => (
              <div
                key={item.label}
                className={`grid grid-cols-3 px-6 py-3 ${i < m.composition.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}
              >
                <p className="text-sm text-dl-navy">{item.label}</p>
                <p className="text-sm font-dl-mono text-dl-navy text-right">{fmtUsd(item.valueUsd)}</p>
                <p className="text-sm font-dl-mono text-dl-navy text-right">{item.pct.toFixed(2)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-10">
        <SectionHeading>Capital waterfall</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt mb-4">
          <p className="text-sm text-dl-gray leading-relaxed">
            In the event of a capital shortfall, losses are absorbed in a defined sequence.
            This waterfall structure ensures that dedicated buffers and reserves are consumed
            before participant capital is exposed to loss. The order below reflects the
            priority of loss absorption from first to last.
          </p>
        </div>
        <div className="border border-dl-border">
          {WATERFALL_STEPS.map((step, i) => (
            <div
              key={step.order}
              className={`flex items-start gap-4 px-6 py-4 ${i < WATERFALL_STEPS.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
            >
              <span className="font-dl-mono text-lg text-dl-navy font-semibold w-8 flex-shrink-0">{step.order}</span>
              <div>
                <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">{step.label}</p>
                <p className="text-sm text-dl-gray leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {m && m.sources && m.sources.length > 0 && (
        <div className="mb-10">
          <SectionHeading>Sources</SectionHeading>
          <div className="border border-dl-border">
            {m.sources.map((src, i) => (
              <div
                key={i}
                className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-6 py-3 ${i < m.sources.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
              >
                <p className="text-sm font-dl-mono text-dl-navy font-medium w-40 flex-shrink-0">{src.label}</p>
                <p className="text-sm text-dl-gray">{src.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {m && m.limitations && m.limitations.length > 0 && (
        <div className="mb-10">
          <SectionHeading>Limitations</SectionHeading>
          <div className="border border-dl-border">
            {m.limitations.map((lim, i) => (
              <div
                key={i}
                className={`px-6 py-3 ${i < m.limitations.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
              >
                <p className="text-sm text-dl-gray leading-relaxed">— {lim}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderHardBrakeTriggerTable = () => {
    if (!ameData || !ameData.regimeBand) return null;
    const rs = Number(ameData.rs || 0);
    const ratios = ameData.ratios || {};
    const targets = ameData.targets || {};
    const triggers = [
      { trigger: 'CRISIS_LOCKDOWN', threshold: 'RS ≥ 0.80', current: fmtDecimal(rs), breached: rs >= 0.80, priority: 1 },
      { trigger: 'FREEZE_DISTRIBUTIONS', threshold: `CR < ${fmtDecimal(targets.crTarget || 0)}`, current: fmtDecimal(ratios.coverageRatio || 0), breached: (ratios.coverageRatio || 0) < (targets.crTarget || 0), priority: 2 },
      { trigger: 'LIQUIDITY_DEFENSE', threshold: `LD < ${fmtDecimal(targets.ldTarget || 0)}`, current: fmtDecimal(ratios.liquidityDepth || 0), breached: (ratios.liquidityDepth || 0) < (targets.ldTarget || 0), priority: 3 },
      { trigger: 'REDIRECT_FLOWS', threshold: `RR < ${fmtDecimal(targets.rrTarget || 0)}`, current: fmtDecimal(ratios.reserveRatio || 0), breached: (ratios.reserveRatio || 0) < (targets.rrTarget || 0), priority: 4 },
    ];
    return (
      <div className="mb-10">
        <SectionHeading>Hard Brake Trigger Table</SectionHeading>
        <div className="border border-dl-border mb-4">
          <div className="grid grid-cols-4 px-6 py-3 bg-dl-bg border-b border-dl-border">
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Trigger</p>
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Threshold</p>
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Current</p>
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Breached</p>
          </div>
          {triggers.map((t, i) => (
            <div
              key={t.trigger}
              className={`grid grid-cols-4 px-6 py-3 ${i < triggers.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}
            >
              <p className="text-sm font-dl-mono text-dl-navy">{t.trigger}</p>
              <p className="text-sm font-dl-mono text-dl-navy text-right">{t.threshold}</p>
              <p className="text-sm font-dl-mono text-dl-navy text-right">{t.current}</p>
              <p className={`text-sm font-dl-mono text-right font-semibold ${t.breached ? 'text-dl-error' : 'text-dl-forest'}`}>
                {t.breached ? 'YES' : 'NO'}
              </p>
            </div>
          ))}
        </div>
        <div className="border border-dl-border p-6 bg-dl-bg-alt">
          <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-3">Waterfall Priority Order</p>
          <p className="text-sm text-dl-gray leading-relaxed">
            1. Crisis Lockdown → 2. Freeze Distributions → 3. Liquidity Defense → 4. Redirect Flows
          </p>
        </div>
      </div>
    );
  };

  const renderAmeStressSimulator = () => (
    <div className="mb-10">
      <SectionHeading>AME Stress Simulator</SectionHeading>
      <div className="border border-dl-border p-6 bg-dl-bg-alt mb-4">
        <p className="text-sm text-dl-gray leading-relaxed">
          Simulation — deterministic projection. Select a predefined stress scenario and run the AME engine against current inputs with applied shocks. Results are projections, not predictions.
        </p>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <select
          value={ameStressScenario}
          onChange={(e) => setAmeStressScenario(e.target.value)}
          className="px-4 py-2 border border-dl-border bg-dl-bg text-sm font-dl-mono text-dl-navy"
        >
          {AME_SCENARIOS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <button
          onClick={runAmeStress}
          disabled={ameStressLoading}
          className="px-4 py-2 border border-dl-border bg-dl-bg text-xs font-dl-mono text-dl-navy"
        >
          {ameStressLoading ? 'Running...' : 'Run AME Simulation'}
        </button>
      </div>
      {ameStressResult && ameStressResult.projectedRS != null && (
        <div className="border border-dl-border">
          <div className="grid grid-cols-4 px-6 py-3 bg-dl-bg border-b border-dl-border">
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Metric</p>
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Projected</p>
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Baseline</p>
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Status</p>
          </div>
          <div className="grid grid-cols-4 px-6 py-3 bg-dl-bg-alt border-b border-dl-border">
            <p className="text-sm text-dl-navy">Regime Score (RS)</p>
            <p className="text-sm font-dl-mono text-dl-navy text-right">{fmtDecimal(ameStressResult.projectedRS)}</p>
            <p className="text-sm font-dl-mono text-dl-navy text-right">{ameData ? fmtDecimal(ameData.rs) : '—'}</p>
            <p className={`text-sm font-dl-mono text-right ${regimeBandColor(ameStressResult.projectedRegimeBand)}`}>{ameStressResult.projectedRegimeBand}</p>
          </div>
          <div className="grid grid-cols-4 px-6 py-3 bg-dl-bg border-b border-dl-border">
            <p className="text-sm text-dl-navy">Policy Multiplier (PM)</p>
            <p className="text-sm font-dl-mono text-dl-navy text-right">{fmtDecimal(ameStressResult.projectedPM, 2)}</p>
            <p className="text-sm font-dl-mono text-dl-navy text-right">{ameData ? fmtDecimal(ameData.pm, 2) : '—'}</p>
            <p className="text-sm font-dl-mono text-dl-navy text-right">—</p>
          </div>
          {ameStressResult.projectedRatios && (
            <>
              {[
                { label: 'Coverage Ratio', key: 'coverageRatio' },
                { label: 'Reserve Ratio', key: 'reserveRatio' },
                { label: 'Loss Buffer Ratio', key: 'lossBufferRatio' },
                { label: 'Liquidity Depth', key: 'liquidityDepth' },
              ].map((r, i) => (
                <div key={r.key} className={`grid grid-cols-4 px-6 py-3 ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'} ${i < 3 ? 'border-b border-dl-border' : ''}`}>
                  <p className="text-sm text-dl-navy">{r.label}</p>
                  <p className="text-sm font-dl-mono text-dl-navy text-right">{fmtDecimal(ameStressResult.projectedRatios[r.key] || 0)}</p>
                  <p className="text-sm font-dl-mono text-dl-navy text-right">{ameData?.ratios ? fmtDecimal(ameData.ratios[r.key] || 0) : '—'}</p>
                  <p className="text-sm font-dl-mono text-dl-navy text-right">—</p>
                </div>
              ))}
            </>
          )}
          {ameStressResult.projectedActions && ameStressResult.projectedActions.length > 0 && (
            <div className="px-6 py-3 bg-dl-bg-alt border-t border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-2">Projected Actions</p>
              {ameStressResult.projectedActions.map((a: any, i: number) => (
                <p key={i} className="text-sm font-dl-mono text-dl-error">{a.action.replace('ACTION_', '').replace(/_/g, ' ')}</p>
              ))}
            </div>
          )}
          {ameStressResult.breaches && ameStressResult.breaches.length > 0 && (
            <div className="px-6 py-3 bg-dl-bg border-t border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-2">Breaches</p>
              {ameStressResult.breaches.filter((b: any) => b.breached).map((b: any, i: number) => (
                <p key={i} className="text-sm font-dl-mono text-dl-error">{b.metric}: {fmtDecimal(b.projected)} vs target {fmtDecimal(b.target)}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderClearinghouseView = () => (
    <>
      {renderMetricsGrid()}

      <div className="mb-10">
        <SectionHeading>AXUSD Stability Assessment</SectionHeading>
        <div className="flex border border-dl-border mb-4">
          {(['GROSS', 'NET'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setLiabilityMode(mode)}
              className={`px-4 py-2 text-xs font-dl-mono uppercase tracking-wider border-r border-dl-border last:border-r-0 ${
                liabilityMode === mode
                  ? 'bg-dl-navy text-white'
                  : 'bg-dl-bg text-dl-navy'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        {liabilityMode === 'NET' ? (
          <div className="border border-dl-border p-6 bg-dl-bg-alt">
            <p className="text-sm font-dl-mono text-dl-navy font-semibold mb-2">Not available</p>
            <p className="text-sm text-dl-gray leading-relaxed">
              NET liability mode is not yet available. External circulation heuristics are pending implementation. NET mode will distinguish between protocol-held AXUSD and externally circulating AXUSD to provide a more precise liability figure. Until external circulation tracking is operational, GROSS mode (total AXUSD supply) is used as the conservative liability measure.
            </p>
          </div>
        ) : axusdStability ? (
          <DetailGrid
            left={[
              { label: 'Total Supply', value: fmtUsd(axusdStability.totalSupply), mono: true },
              { label: 'PSM Reserves', value: fmtUsd(axusdStability.psmReserves), mono: true },
              { label: 'Backing Ratio', value: fmtRatio(axusdStability.backingRatio), mono: true },
            ]}
            right={[
              { label: 'Peg Deviation', value: fmtRatio(axusdStability.pegDeviation), mono: true },
              { label: 'Redemption Capacity', value: fmtUsd(axusdStability.redemptionCapacity), mono: true },
              { label: 'Stability Score', value: <span className={stabilityScoreColor(axusdStability.stabilityScore)}>{axusdStability.stabilityScore}</span>, mono: true },
            ]}
          />
        ) : (
          <div className="border border-dl-border p-6 bg-dl-bg-alt">
            <p className="text-sm text-dl-gray">Loading stability assessment data...</p>
          </div>
        )}
      </div>

      {renderHardBrakeTriggerTable()}
      {renderAmeStressSimulator()}

      <div className="mb-10">
        <SectionHeading>Stress Test Scenarios</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt mb-4">
          <p className="text-sm text-dl-gray leading-relaxed">
            Deterministic stress scenarios model the impact of adverse conditions on protocol solvency metrics. Each scenario applies defined drawdowns to treasury, reserves, and liabilities to project resulting capital adequacy.
          </p>
        </div>
        <div className="mb-4">
          <button
            onClick={runStressScenarios}
            disabled={stressLoading}
            className="px-4 py-2 border border-dl-border bg-dl-bg text-xs font-dl-mono text-dl-navy"
          >
            {stressLoading ? 'Running scenarios...' : 'Run All Scenarios'}
          </button>
        </div>
        {stressResults.length > 0 && (
          <div className="border border-dl-border">
            <div className="grid grid-cols-5 px-6 py-3 bg-dl-bg border-b border-dl-border">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Scenario</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Coverage Ratio</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Reserve Ratio</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Policy Mode</p>
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Threshold Breach</p>
            </div>
            {stressResults.map((result, i) => (
              <div
                key={result.scenario?.id || i}
                className={`grid grid-cols-5 px-6 py-3 ${i < stressResults.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}
              >
                <p className="text-sm text-dl-navy">{result.scenario?.label || 'Unknown'}</p>
                <p className="text-sm font-dl-mono text-dl-navy text-right">{fmtRatio(result.adjustedCoverageRatio)}</p>
                <p className="text-sm font-dl-mono text-dl-navy text-right">{fmtRatio(result.adjustedReserveRatio)}</p>
                <p className={`text-sm font-dl-mono text-right ${policyColor(result.resultingPolicyMode)}`}>{result.resultingPolicyMode}</p>
                <p className={`text-sm font-dl-mono text-right ${result.breachesThreshold ? 'text-dl-error' : 'text-dl-forest'}`}>
                  {result.breachesThreshold ? 'YES' : 'NO'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-10">
        <SectionHeading>Historical Coverage</SectionHeading>
        {historyData.length > 0 ? (
          <HistoryChart data={historyData} />
        ) : (
          <div className="border border-dl-border p-6 bg-dl-bg-alt">
            <p className="text-sm text-dl-gray">No historical data available.</p>
          </div>
        )}
      </div>
    </>
  );

  const renderAmeMethodology = () => (
    <div className="mb-10">
      <SectionHeading>AME Methodology</SectionHeading>
      <div className="border border-dl-border">
        <div className="px-6 py-4 bg-dl-bg border-b border-dl-border">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">What these metrics mean</p>
          <p className="text-sm text-dl-gray leading-relaxed">RS is a composite score (0–1) measuring the protocol stress environment. PM scales protective thresholds nonlinearly. PF determines the stability-weighted distribution capacity. All computations are deterministic and reproducible from input data.</p>
        </div>
        <div className="px-6 py-4 bg-dl-bg-alt border-b border-dl-border">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">How to interpret RS and PM</p>
          <p className="text-sm text-dl-gray leading-relaxed">RS below 0.25 = STABLE. RS 0.25–0.50 = CAUTION. RS 0.50–0.75 = STRESS. RS 0.75+ = CRISIS. PM is computed as 1/(1−RS) clamped to 1–10. Higher PM means more protective target ratios.</p>
        </div>
        <div className="px-6 py-4 bg-dl-bg border-b border-dl-border">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">What triggers do</p>
          <p className="text-sm text-dl-gray leading-relaxed">Hard brakes are deterministic policy gates. When coverage, reserve, or liquidity ratios fall below their adaptive targets, corresponding actions activate automatically. Actions are prioritized in waterfall order: Crisis Lockdown, Freeze Distributions, Liquidity Defense, Redirect Flows.</p>
        </div>
        <div className="px-6 py-4 bg-dl-bg-alt border-b border-dl-border">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">What we do in crisis mode</p>
          <p className="text-sm text-dl-gray leading-relaxed">In CRISIS regime (RS ≥ 0.75), payout factor is forced to zero. All discretionary distributions are frozen. Crisis lockdown procedures activate. This state requires governance intervention to resolve.</p>
        </div>
        <div className="px-6 py-4 bg-dl-bg border-b border-dl-border">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">Limitations</p>
          <p className="text-sm text-dl-gray leading-relaxed">AME operates on snapshot data which may lag real-time conditions. Realized volatility and drawdown estimates are proxies. The model assumes deterministic linear or clamped nonlinear transforms and does not capture tail correlations.</p>
        </div>
        <div className="px-6 py-4 bg-dl-bg-alt border-b border-dl-border">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">Update cadence</p>
          <p className="text-sm text-dl-gray leading-relaxed">AME evaluations are produced periodically by protocol administration. Each evaluation creates immutable audit artifacts. Historical evaluations are retained indefinitely.</p>
        </div>
        <div className="px-6 py-4 bg-dl-bg">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">Data sources and integrity</p>
          <p className="text-sm text-dl-gray leading-relaxed">Input data is derived from on-chain treasury positions, protocol database snapshots, and computed market proxies. Each input snapshot is checksummed. Each evaluation references its input snapshot for full data lineage.</p>
        </div>
      </div>
    </div>
  );

  const renderAmeAuditArtifacts = () => {
    if (!ameData || !ameData.evaluationId) return null;
    return (
      <div className="mb-10">
        <SectionHeading>AME Audit Artifacts</SectionHeading>
        <DetailGrid
          left={[
            { label: 'Evaluation ID', value: ameData.evaluationId, mono: true },
            { label: 'Snapshot ID', value: ameData.inputSnapshotRef || '—', mono: true },
          ]}
          right={[
            { label: 'Model Version', value: ameData.modelVersion || '—', mono: true },
            { label: 'Checksum', value: ameData.disclosureSummary ? ameData.disclosureSummary.slice(0, 16) : '—', mono: true },
          ]}
        />
        <div className="border border-dl-border p-4 bg-dl-bg-alt">
          <a
            href="/api/solvency/ame/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-dl-mono text-dl-navy underline"
          >
            View latest evaluation data (JSON)
          </a>
        </div>
      </div>
    );
  };

  const renderAmeHistory = () => {
    const totalPages = Math.max(1, Math.ceil(ameHistory.length / AME_HISTORY_PAGE_SIZE));
    const startIdx = (ameHistoryPage - 1) * AME_HISTORY_PAGE_SIZE;
    const pageData = ameHistory.slice(startIdx, startIdx + AME_HISTORY_PAGE_SIZE);
    return (
      <div className="mb-10">
        <SectionHeading>Historical Evaluations</SectionHeading>
        {ameHistory.length === 0 ? (
          <div className="border border-dl-border p-6 bg-dl-bg-alt">
            <p className="text-sm text-dl-gray">No historical evaluation data available.</p>
          </div>
        ) : (
          <>
            <div className="border border-dl-border">
              <div className="grid grid-cols-6 px-6 py-3 bg-dl-bg border-b border-dl-border">
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Timestamp</p>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-center">Regime Band</p>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">RS</p>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">PM</p>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-center">Status</p>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Actions</p>
              </div>
              {pageData.map((point: any, i: number) => {
                const rs = Number(point.value || 0);
                let band = 'STABLE';
                if (rs >= 0.75) band = 'CRISIS';
                else if (rs >= 0.50) band = 'STRESS';
                else if (rs >= 0.25) band = 'CAUTION';
                const pm = Math.min(10, Math.max(1, 1 / (1 - rs)));
                return (
                  <div
                    key={point.evaluationId || i}
                    className={`grid grid-cols-6 px-6 py-3 ${i < pageData.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}
                  >
                    <p className="text-sm font-dl-mono text-dl-navy">{fmtTimestamp(point.ts)}</p>
                    <p className={`text-sm font-dl-mono text-center ${regimeBandColor(band)}`}>{band}</p>
                    <p className="text-sm font-dl-mono text-dl-navy text-right">{fmtDecimal(rs)}</p>
                    <p className="text-sm font-dl-mono text-dl-navy text-right">{fmtDecimal(pm, 2)}</p>
                    <p className={`text-sm font-dl-mono text-center ${rs >= 0.75 ? 'text-dl-error' : rs >= 0.50 ? 'text-dl-gold' : 'text-dl-forest'}`}>
                      {rs >= 0.75 ? 'CRISIS' : rs >= 0.50 ? 'BREACH' : 'OK'}
                    </p>
                    <p className="text-sm font-dl-mono text-dl-navy text-right">—</p>
                  </div>
                );
              })}
            </div>
            <PaginationControls
              page={ameHistoryPage}
              totalPages={totalPages}
              total={ameHistory.length}
              limit={AME_HISTORY_PAGE_SIZE}
              onPageChange={setAmeHistoryPage}
              itemLabel="evaluations"
            />
          </>
        )}
      </div>
    );
  };

  const renderRegulatoryView = () => (
    <>
      {renderMetricsGrid()}

      <div className="mb-10">
        <SectionHeading>Purpose and scope</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            This page exists to provide transparent, verifiable financial health data for the Axiom Protocol.
            It is designed for participants, prospective participants, and any interested party who requires
            visibility into the capital adequacy and reserve posture of the protocol.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            All data presented here is derived from periodic administrative snapshots. Each snapshot captures
            the state of protocol capital at a specific point in time and includes a cryptographic checksum
            for independent verification.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed">
            The scope of this disclosure covers treasury balances, reserve designations, liability obligations,
            capital adequacy ratios, stabilization policy status, and the composition of protocol-controlled assets.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <SectionHeading>Definitions</SectionHeading>
        <div className="border border-dl-border">
          {DEFINITIONS.map((d, i) => (
            <div
              key={d.term}
              className={`px-6 py-4 ${i < DEFINITIONS.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
            >
              <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">{d.term}</p>
              <p className="text-sm text-dl-gray leading-relaxed">{d.definition}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <SectionHeading>Stabilization policy</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt mb-4">
          <p className="text-sm text-dl-gray leading-relaxed">
            The protocol operates under a tiered stabilization policy that adjusts operational posture
            based on capital adequacy metrics. Transitions between modes are triggered by threshold
            crossings in reserve ratios, coverage ratios, and loss buffer levels. The current policy
            mode is displayed in the live metrics panel above.
          </p>
        </div>
        <div className="border border-dl-border">
          {POLICY_MODES.map((pm, i) => (
            <div
              key={pm.mode}
              className={`px-6 py-4 ${i < POLICY_MODES.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
            >
              <p className={`font-dl-mono text-sm font-semibold mb-1 ${pm.color}`}>{pm.mode}</p>
              <p className="text-sm text-dl-gray leading-relaxed">{pm.trigger}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <SectionHeading>Data integrity</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            Every solvency snapshot is assigned a unique identifier and a cryptographic checksum
            (SHA-256 truncated to 16 characters). The checksum is computed from the complete
            underlying dataset at the moment of capture. Any modification to the data after capture
            would produce a different checksum, providing a tamper-evident verification mechanism.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            Snapshots are stored with immutable timestamps in the protocol database. Each snapshot
            record includes the capture time, the full data payload, and the corresponding checksum.
            This creates an auditable chain of financial health records.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed">
            To verify a snapshot, compare the displayed checksum against the checksum stored in the
            protocol records for the same snapshot identifier. Matching checksums confirm the data
            has not been altered since capture.
          </p>
        </div>
      </div>

      {renderAmeMethodology()}
      {renderAmeAuditArtifacts()}
      {renderAmeHistory()}

      <div className="mb-10">
        <SectionHeading>How to read this page</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            This page is designed for transparency. Here is a brief guide for readers who may not
            have a financial or technical background:
          </p>
          <div className="space-y-3">
            <div className="border-b border-dl-border pb-3">
              <p className="text-sm text-dl-navy font-medium mb-1">The metrics panel</p>
              <p className="text-sm text-dl-gray leading-relaxed">
                Shows the current financial position of the protocol. The key numbers to look at
                are the coverage ratio (should be above 100%) and the policy mode (should be NORMAL
                or BOOTSTRAP during early stages).
              </p>
            </div>
            <div className="border-b border-dl-border pb-3">
              <p className="text-sm text-dl-navy font-medium mb-1">The timestamp and checksum</p>
              <p className="text-sm text-dl-gray leading-relaxed">
                These tell you when the data was captured and provide a way to verify it has not
                been altered. If the timestamp is old, the data may not reflect the most recent
                state of the protocol.
              </p>
            </div>
            <div className="border-b border-dl-border pb-3">
              <p className="text-sm text-dl-navy font-medium mb-1">Policy mode</p>
              <p className="text-sm text-dl-gray leading-relaxed">
                This indicates the operational health of the protocol. NORMAL is the target state.
                CAUTION or RESTRICTED modes signal that the protocol is taking protective action.
                BOOTSTRAP means the system is still initializing.
              </p>
            </div>
            <div>
              <p className="text-sm text-dl-navy font-medium mb-1">The capital waterfall</p>
              <p className="text-sm text-dl-gray leading-relaxed">
                Describes the order in which capital is used to absorb losses. Dedicated buffers
                are consumed first, and participant capital is the last layer exposed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <SectionHeading>Frequently asked questions</SectionHeading>
        <div className="border border-dl-border">
          {FAQ_ITEMS.map((faq, i) => (
            <div
              key={i}
              className={`${i < FAQ_ITEMS.length - 1 ? 'border-b border-dl-border' : ''}`}
            >
              <button
                onClick={() => toggleFaq(i)}
                className="w-full text-left px-6 py-4 flex items-start justify-between gap-4 bg-dl-bg"
              >
                <p className="text-sm text-dl-navy font-medium leading-relaxed">{faq.q}</p>
                <span className="font-dl-mono text-dl-gray text-sm flex-shrink-0 mt-0.5">
                  {faqOpen[i] ? '−' : '+'}
                </span>
              </button>
              {faqOpen[i] && (
                <div className="px-6 py-4 bg-dl-bg-alt">
                  <p className="text-sm text-dl-gray leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <SectionHeading>Verification and reporting</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            To verify any data on this page, locate the snapshot identifier and checksum displayed
            in the data freshness indicator above. These values can be cross-referenced against
            the protocol snapshot records to confirm data authenticity.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            If you identify a discrepancy between displayed data and expected values, or if you
            believe a data integrity issue exists, you may report it through the protocol governance
            channels. All reported issues are logged and reviewed by the protocol administration team.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed">
            The protocol maintains a complete history of all snapshots. Historical data can be
            requested through governance processes for audit and compliance purposes.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <SectionHeading>Disclosure</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt">
          <p className="text-sm text-dl-gray leading-relaxed mb-3">
            The information presented on this page is provided for informational and transparency purposes only.
            Nothing on this page constitutes financial, legal, tax, or investment advice. All figures are
            derived from periodic administrative snapshots and may not reflect real-time balances.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed">
            Participation in the Axiom Protocol carries material risk, including the potential for total loss
            of capital. Past solvency metrics and reserve ratios do not guarantee future adequacy or performance.
            Participants should consult qualified professional advisors before making any decisions based on
            information presented here.
          </p>
        </div>
      </div>
    </>
  );

  return (
    <DesignLawLayout>
      <Head>
        <title>Solvency and Reserve Transparency — Axiom Protocol</title>
        <meta name="description" content="Verifiable solvency data, reserve transparency, and capital health metrics for the Axiom Protocol." />
      </Head>

      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-gray uppercase tracking-widest mb-4 font-dl-mono">Protocol Health</p>
        <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          Solvency and Reserve Transparency
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed">
          This page provides verifiable visibility into the financial health of the Axiom Protocol.
          All figures are derived from administrative snapshots and reflect capital positions,
          reserve adequacy, and stabilization policy status at the time of the most recent data capture.
        </p>
      </div>

      {m && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-dl-border p-4 mb-8 bg-dl-bg-alt">
          <div>
            <p className="text-xs text-dl-gray mb-1">Data as of</p>
            <p className="font-dl-mono text-sm text-dl-navy">{fmtTimestamp(m.asOfUtc)}</p>
            <p className="font-dl-mono text-xs text-dl-gray mt-1">
              Snapshot: {m.snapshotId !== 'none' ? m.snapshotId.slice(0, 12) : 'none'} — Checksum: {m.checksum}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-3 sm:mt-0 px-4 py-2 border border-dl-border bg-dl-bg text-xs font-dl-mono text-dl-navy"
          >
            {refreshing ? 'Refreshing...' : 'Refresh data'}
          </button>
        </div>
      )}

      {m && m.dataStatus === 'empty' && (
        <div className="border border-dl-border p-6 mb-8 bg-dl-bg-alt">
          <p className="font-dl-serif text-lg text-dl-navy mb-2">No snapshot recorded</p>
          <p className="text-sm text-dl-gray leading-relaxed">
            The protocol has not yet recorded a solvency snapshot. This typically occurs during the initial
            bootstrap phase. Once the first administrative snapshot is ingested, all metrics will populate
            with verifiable data. Current policy mode is BOOTSTRAP and all values are informational placeholders.
          </p>
        </div>
      )}

      {!m && (
        <div className="border border-dl-border p-6 mb-8 bg-dl-bg-alt">
          <p className="font-dl-serif text-lg text-dl-navy mb-2">Data unavailable</p>
          <p className="text-sm text-dl-gray leading-relaxed">
            Unable to retrieve solvency metrics at this time. Please try refreshing the page.
            If the issue persists, the data service may be temporarily unavailable.
          </p>
        </div>
      )}

      {renderAmeStatusStrip()}

      <div className="mb-8">
        <div className="flex border border-dl-border">
          {(['allocator', 'clearinghouse', 'regulatory'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 px-4 py-3 text-xs font-dl-mono uppercase tracking-wider border-r border-dl-border last:border-r-0 ${
                viewMode === mode
                  ? 'bg-dl-navy text-white'
                  : 'bg-dl-bg text-dl-navy'
              }`}
            >
              {mode === 'allocator' ? 'Allocator' : mode === 'clearinghouse' ? 'Clearinghouse' : 'Regulatory'}
            </button>
          ))}
        </div>
        <p className="text-xs text-dl-gray mt-3 leading-relaxed">{VIEW_DESCRIPTIONS[viewMode]}</p>
      </div>

      {viewMode === 'allocator' && renderAllocatorView()}
      {viewMode === 'clearinghouse' && renderClearinghouseView()}
      {viewMode === 'regulatory' && renderRegulatoryView()}

      <DisclosureBlock
        label="Full Risk Disclosure"
        text="RISK DISCLOSURE: This page provides informational transparency data only. It does not constitute an offer, solicitation, or recommendation to participate in any protocol activity. All solvency data is derived from periodic administrative snapshots and may not reflect real-time conditions. Reserve ratios, coverage ratios, and capital positions are subject to change. The protocol stabilization policy operates on a best-efforts basis and does not guarantee any particular outcome. Participation in the Axiom Protocol involves material risk including, but not limited to, total loss of contributed capital. The loss buffer and reserve designations are structural mechanisms and do not constitute insurance, guarantees, or warranties of any kind. Past performance, reserve adequacy, and historical coverage ratios are not indicative of future results. Multi-party authorization controls reduce but do not eliminate operational risk. Automated control layers are subject to technical risk including software defects and settlement environment disruptions. Participants are solely responsible for their own due diligence and should consult qualified legal, financial, and tax advisors. Axiom Protocol does not provide investment advice."
        defaultOpen={false}
      />
    </DesignLawLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || `localhost:${process.env.PORT || 5000}`;
    const baseUrl = `${protocol}://${host}`;
    const res = await fetch(`${baseUrl}/api/solvency/metrics`);
    const metrics = await res.json();
    return { props: { metrics } };
  } catch {
    return { props: { metrics: null } };
  }
};
