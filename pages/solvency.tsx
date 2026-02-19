import { useState, useEffect } from 'react';
import Head from 'next/head';
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

function fmtUsd(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtRatio(value: number): string {
  return (value * 100).toFixed(2) + '%';
}

function fmtTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }) + ' ET';
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
  { key: 'MARKET_CORRECTION', label: 'Market Correction', description: '15% treasury drawdown with elevated volatility' },
  { key: 'LIQUIDITY_CRISIS', label: 'Liquidity Crisis', description: '50% redemption capacity drawdown with flow imbalance' },
  { key: 'BLACK_SWAN', label: 'Black Swan', description: '50% treasury collapse with 70% redemption capacity loss' },
  { key: 'STABLECOIN_DEPEG', label: 'Stablecoin Depeg', description: 'Reserve asset depegging with 15% liability increase' },
  { key: 'GOVERNANCE_ATTACK', label: 'Governance Attack', description: 'Malicious issuance with 25% treasury drawdown' },
  { key: 'BANK_RUN', label: 'Redemption Run', description: 'Coordinated redemption demand exceeding capacity' },
];

const DEFINITIONS = [
  { term: 'Treasury Capital', definition: 'The aggregate pool of protocol-governed capital, encompassing liquid holdings, deployed positions, and operational reserves. Treasury capital represents the full asset side of the protocol balance sheet.' },
  { term: 'Designated Reserves', definition: 'Capital expressly allocated to backstop outstanding obligations. Reserves are a segregated subset of treasury capital, earmarked under stabilization policy to absorb losses and meet redemption demands.' },
  { term: 'AXUSD Outstanding', definition: 'The total supply of AXUSD issued by the protocol and currently outstanding on Arbitrum One. This figure represents the gross liability measure. As the protocol matures, externally circulating AXUSD constitutes the redeemable obligation base.' },
  { term: 'Loss Buffer', definition: 'A dedicated capital cushion positioned as the first absorption layer in the capital waterfall. The loss buffer is consumed before designated reserves or general treasury capital bear any impairment.' },
  { term: 'Coverage Ratio (CR)', definition: 'Total available capital divided by total outstanding liabilities. A CR above 1.0 indicates the protocol holds sufficient assets to meet all obligations. This is the primary capital adequacy measure.' },
  { term: 'Reserve Ratio (RR)', definition: 'Designated reserves divided by total outstanding liabilities. RR indicates the proportion of obligations directly supported by segregated reserve capital, independent of broader treasury holdings.' },
  { term: 'Loss Buffer Ratio (LBR)', definition: 'Loss buffer capital divided by total outstanding liabilities. LBR measures the depth of first-loss absorption capacity before reserves are drawn upon.' },
  { term: 'Liquidity Depth (LD)', definition: 'Immediately redeemable capital (e.g., PSM reserves) divided by total outstanding liabilities. LD measures the protocol capacity to meet instantaneous redemption demands without asset liquidation.' },
  { term: 'Regime Band', definition: 'A classification of the current protocol stress environment derived from the Regime Score (RS). Bands range from STABLE (low stress) through CAUTION and STRESS to CRISIS (severe stress). The regime band determines the Policy Multiplier applied to adaptive targets.' },
];

const WATERFALL_STEPS = [
  { order: '1', label: 'Loss Buffer (First Loss)', description: 'Absorbs initial impairment. This dedicated capital cushion is consumed before any other layer is drawn upon. It is the primary shock absorber in the capital structure.' },
  { order: '2', label: 'Designated Reserves', description: 'If losses exceed the loss buffer, segregated reserve capital is applied to meet remaining obligations under stabilization policy.' },
  { order: '3', label: 'Treasury General Pool', description: 'If designated reserves are insufficient, the broader treasury pool may be utilized under governance authorization to cover residual shortfalls.' },
  { order: '4', label: 'Participant Capital (Last Loss)', description: 'Only after all protocol-controlled buffers and reserves are fully exhausted does participant capital bear loss exposure. This is the terminal absorption layer.' },
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
    a: 'Solvency refers to the protocol capacity to meet all outstanding obligations from available capital. A solvent protocol maintains sufficient assets to satisfy all liabilities, with additional reserves providing a margin of safety against adverse conditions.',
  },
  {
    q: 'What is the reconciliation cadence for this data?',
    a: 'Disclosure snapshots are produced on a controlled reconciliation cycle by the protocol administrator. The standard cadence is daily, subject to operational requirements. Each snapshot is timestamped at the moment of capture. The "Data as of" indicator and snapshot reference ID reflect the exact reconciliation point. Values may exhibit temporal variance of up to 24 hours relative to point-in-time balances.',
  },
  {
    q: 'What does the coverage ratio represent?',
    a: 'The coverage ratio (CR) measures total available capital divided by total outstanding liabilities. A CR above 1.0 indicates the protocol holds sufficient assets to meet all obligations. For example, a CR of 1.50 indicates $1.50 in available capital for every $1.00 of outstanding liability.',
  },
  {
    q: 'What happens if reserves decline below target levels?',
    a: 'If reserves decline below established thresholds, the stabilization policy mode transitions from NORMAL to CAUTION or RESTRICTED. This activates enhanced monitoring protocols and may constrain certain operations until reserves are restored to target adequacy levels.',
  },
  {
    q: 'Can I independently verify the data shown here?',
    a: 'Yes. Each snapshot includes a cryptographic checksum (SHA-256 truncated digest) derived from the complete underlying dataset. This checksum can be cross-referenced against the protocol snapshot records to confirm data integrity. The snapshot reference ID and reconciliation timestamp provide a complete audit trail.',
  },
  {
    q: 'What is a checksum and why does it matter?',
    a: 'A checksum is a deterministic alphanumeric string produced by applying a cryptographic digest function to the complete dataset. Any modification to the underlying data — however minor — produces a different checksum. This tamper-evident mechanism enables independent verification that displayed figures have not been altered since the reconciliation snapshot was recorded.',
  },
  {
    q: 'What does the policy mode indicate?',
    a: 'Policy mode reflects the current operational posture of the protocol stabilization framework. NORMAL indicates standard operations within target thresholds. CAUTION signals enhanced monitoring due to advisory threshold crossings. RESTRICTED indicates intervention-level constraints on certain operations. EMERGENCY denotes a critical situation requiring governance intervention.',
  },
  {
    q: 'What is the loss buffer and how does it protect capital?',
    a: 'The loss buffer is a dedicated first-loss capital cushion positioned at the top of the capital waterfall. It absorbs impairment before any other capital layer is drawn upon, thereby protecting designated reserves, general treasury capital, and ultimately participant capital from loss exposure.',
  },
  {
    q: 'Who controls the treasury and how are decisions made?',
    a: 'Treasury operations are governed by multi-party authorization controls with defined approval workflows. No single party can unilaterally move or deploy capital. All treasury actions produce audit-traceable records visible through protocol reporting and snapshot disclosure.',
  },
  {
    q: 'Is this data audited by an independent third party?',
    a: 'The protocol maintains internal audit trails, cryptographic verification of all snapshots, and deterministic computation lineage. Independent third-party audits are planned as part of the protocol maturity roadmap. Current data integrity assurance relies on snapshot checksums, computation reproducibility, and administrative controls.',
  },
  {
    q: 'What is the difference between treasury total and treasury liquid?',
    a: 'Treasury total represents the aggregate capital under protocol governance, including deployed, locked, and reserved positions. Treasury liquid represents the immediately available portion that can be redeemed or redeployed without unwinding existing commitments or incurring liquidation costs.',
  },
  {
    q: 'What does BOOTSTRAP policy mode mean?',
    a: 'BOOTSTRAP indicates the protocol is in its control validation phase. During this period, all metrics are disclosed for transparency but stabilization policies are not yet active. The system is building toward the operational thresholds and capital levels required for transition to NORMAL mode. Bootstrap-phase capital levels do not invalidate the control design.',
  },
];

const VIEW_DESCRIPTIONS: Record<string, string> = {
  allocator: 'Capital adequacy metrics, asset composition, loss absorption structure, and adaptive target compliance for institutional capital allocation review.',
  clearinghouse: 'Counterparty risk assessment, AXUSD stability modeling, deterministic stress scenarios, hard brake triggers, and historical solvency tracking.',
  regulatory: 'Comprehensive disclosure documentation, compliance definitions, audit verification procedures, data integrity controls, and risk reporting framework.',
};

const AME_HISTORY_PAGE_SIZE = 10;

export default function SolvencyPage() {
  const [viewMode, setViewMode] = useState<'allocator' | 'clearinghouse' | 'regulatory'>('allocator');
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<SolvencyMetrics | null>(null);
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
  const [psmOps, setPsmOps] = useState<any[]>([]);
  const [psmOpsLoading, setPsmOpsLoading] = useState(false);
  const [enforcementState, setEnforcementState] = useState<any>(null);
  const [oracleResponse, setOracleResponse] = useState<any>(null);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [oracleQueryType, setOracleQueryType] = useState('regime_narration');
  const [fetchErrors, setFetchErrors] = useState<string[]>([]);

  const m = liveMetrics;

  useEffect(() => {
    fetch('/api/solvency/metrics')
      .then(res => res.json())
      .then(data => setLiveMetrics(data))
      .catch((err) => { console.error('[solvency] metrics fetch failed:', err); });
    fetch('/api/solvency/ame/latest')
      .then(res => res.json())
      .then(data => { setAmeData(data); setAmeLoading(false); })
      .catch((err) => { console.error('[solvency] AME latest fetch failed:', err); setAmeLoading(false); setFetchErrors(prev => [...prev, 'AME metrics unavailable']); });
    fetch('/api/solvency/ame/enforcement')
      .then(res => res.json())
      .then(data => setEnforcementState(data))
      .catch((err) => { console.error('[solvency] enforcement fetch failed:', err); });
  }, []);

  useEffect(() => {
    if (viewMode !== 'allocator') return;
    setPsmOpsLoading(true);
    fetch('/api/founder-ops/log')
      .then(res => res.json())
      .then(data => {
        if (data.entries) {
          const psm = data.entries.filter((e: any) => e.product === 'PSM' || (e.category || '').includes('PSM'));
          setPsmOps(psm);
        }
        setPsmOpsLoading(false);
      })
      .catch((err) => { console.error('[solvency] PSM ops fetch failed:', err); setPsmOpsLoading(false); });
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'regulatory') return;
    fetch('/api/solvency/ame/history?limit=100')
      .then(res => res.json())
      .then(data => { if (data.snapshots) setAmeHistory(data.snapshots); })
      .catch((err) => { console.error('[solvency] AME history fetch failed:', err); });
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
      .catch((err) => { console.error('[solvency] latest fetch failed:', err); });
    fetch('/api/solvency/history?limit=30')
      .then((res) => res.json())
      .then((data) => {
        if (data.points) setHistoryData(data.points);
      })
      .catch((err) => { console.error('[solvency] history fetch failed:', err); });
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
      const res = await fetch('/api/solvency/ame/stress-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioKeys: ameStressScenario === 'ALL' ? undefined : [ameStressScenario],
        }),
      });
      if (!res.ok) {
        setAmeStressResult({ dataStatus: 'error', projections: [] });
        return;
      }
      const data = await res.json();
      setAmeStressResult(data);
    } catch {
      setAmeStressResult({ dataStatus: 'error', projections: [] });
    } finally {
      setAmeStressLoading(false);
    }
  };

  const queryOracle = async (queryType: string) => {
    setOracleLoading(true);
    setOracleQueryType(queryType);
    try {
      const res = await fetch('/api/solvency/ame/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryType, includeStress: queryType === 'stress_recommendation' || queryType === 'full_briefing' }),
      });
      const data = await res.json();
      setOracleResponse(data);
    } catch {
      setOracleResponse({ interpretation: 'Oracle interpretation temporarily unavailable.', disclaimer: 'AI-generated interpretation. Not financial advice.' });
    } finally {
      setOracleLoading(false);
    }
  };

  const renderEnforcementPanel = () => {
    if (!enforcementState) return null;
    const ps = enforcementState.policyState;
    const events = enforcementState.recentEvents || [];
    const brakeArmed = enforcementState.hardBrakeArmed;
    return (
      <div className="mb-10">
        <SectionHeading>Enforcement Status</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-3 border border-dl-border mb-4">
          <div className="px-4 py-3 border-r border-b sm:border-b-0 border-dl-border bg-dl-bg-alt">
            <p className="text-xs text-dl-gray mb-1">Hard Brake</p>
            <p className={`text-sm font-dl-mono font-semibold ${brakeArmed ? 'text-dl-error' : 'text-dl-forest'}`}>
              {brakeArmed ? 'ARMED' : 'RELEASED'}
            </p>
          </div>
          <div className="px-4 py-3 border-r border-dl-border bg-dl-bg-alt">
            <p className="text-xs text-dl-gray mb-1">Policy Mode</p>
            <p className={`text-sm font-dl-mono font-semibold ${policyColor(ps?.policyMode || 'BOOTSTRAP')}`}>
              {ps?.policyMode || 'BOOTSTRAP'}
            </p>
          </div>
          <div className="px-4 py-3 bg-dl-bg-alt">
            <p className="text-xs text-dl-gray mb-1">Last Event</p>
            <p className="text-sm font-dl-mono text-dl-navy">
              {events.length > 0 ? events[0].event_type?.replace(/_/g, ' ') || events[0].eventType?.replace(/_/g, ' ') || 'N/A' : 'None'}
            </p>
          </div>
        </div>
        {events.length > 0 && (
          <div className="border border-dl-border">
            <div className="px-4 py-2 bg-dl-bg-alt border-b border-dl-border">
              <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">Recent Enforcement Events</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dl-border bg-dl-bg-alt">
                    <th className="px-4 py-2 text-left text-xs font-dl-mono text-dl-gray">Timestamp</th>
                    <th className="px-4 py-2 text-left text-xs font-dl-mono text-dl-gray">Event</th>
                    <th className="px-4 py-2 text-left text-xs font-dl-mono text-dl-gray">Severity</th>
                    <th className="px-4 py-2 text-left text-xs font-dl-mono text-dl-gray">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 10).map((e: any, i: number) => (
                    <tr key={i} className="border-b border-dl-border last:border-b-0">
                      <td className="px-4 py-2 font-dl-mono text-xs text-dl-navy">{e.created_at ? fmtTimestamp(e.created_at) : (e.createdAt ? fmtTimestamp(e.createdAt) : 'N/A')}</td>
                      <td className="px-4 py-2 font-dl-mono text-xs">{(e.event_type || e.eventType || '').replace(/_/g, ' ')}</td>
                      <td className={`px-4 py-2 font-dl-mono text-xs ${e.severity === 'CRITICAL' ? 'text-dl-error' : e.severity === 'WARN' ? 'text-dl-gold' : 'text-dl-gray'}`}>{e.severity}</td>
                      <td className={`px-4 py-2 font-dl-mono text-xs ${policyColor(e.policy_mode || e.policyMode || '')}`}>{e.policy_mode || e.policyMode || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOraclePanel = () => {
    const ORACLE_QUERIES = [
      { key: 'regime_narration', label: 'Regime Analysis' },
      { key: 'stress_recommendation', label: 'Stress Assessment' },
      { key: 'tradeoff_analysis', label: 'Tradeoff Analysis' },
      { key: 'audit_summary', label: 'Audit Summary' },
      { key: 'full_briefing', label: 'Full Briefing' },
    ];
    return (
      <div className="mb-10">
        <SectionHeading>Oracle Interpretation</SectionHeading>
        <div className="border border-dl-border mb-4 px-4 py-3 bg-dl-bg-alt">
          <p className="text-xs text-dl-gray leading-relaxed">
            AI-generated interpretation of deterministic AME metrics. The oracle reads system state and provides institutional-grade analysis.
            Deterministic metrics remain the authoritative source for all capital decisions. Oracle outputs are interpretive, not directive.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {ORACLE_QUERIES.map((q) => (
            <button
              key={q.key}
              onClick={() => queryOracle(q.key)}
              disabled={oracleLoading}
              className={`px-3 py-2 text-xs font-dl-mono border border-dl-border ${
                oracleQueryType === q.key && oracleResponse
                  ? 'bg-dl-navy text-white'
                  : 'bg-dl-bg text-dl-navy'
              } ${oracleLoading ? 'opacity-50' : ''}`}
            >
              {q.label}
            </button>
          ))}
        </div>
        {oracleLoading && (
          <div className="border border-dl-border p-4 bg-dl-bg-alt">
            <p className="text-sm text-dl-gray font-dl-mono">Generating oracle interpretation...</p>
          </div>
        )}
        {oracleResponse && !oracleLoading && (
          <div className="border border-dl-border">
            <div className="px-4 py-2 bg-dl-bg-alt border-b border-dl-border flex justify-between items-center">
              <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">
                {ORACLE_QUERIES.find(q => q.key === oracleResponse.queryType)?.label || 'Interpretation'}
              </p>
              <p className="text-xs font-dl-mono text-dl-gray">{oracleResponse.timestamp ? fmtTimestamp(oracleResponse.timestamp) : ''}</p>
            </div>
            <div className="px-4 py-4">
              <div className="text-sm text-dl-navy leading-relaxed whitespace-pre-wrap font-dl-mono">
                {oracleResponse.interpretation}
              </div>
            </div>
            <div className="px-4 py-2 bg-dl-bg-alt border-t border-dl-border">
              <p className="text-xs text-dl-gray italic">{oracleResponse.disclaimer}</p>
            </div>
          </div>
        )}
      </div>
    );
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
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-dl-border mb-8">
        <div className="px-4 py-3 border-r border-b sm:border-b-0 border-dl-border bg-dl-bg-alt">
          <p className="text-xs text-dl-gray mb-1">Last AME Evaluation</p>
          <p className="text-sm font-dl-mono text-dl-navy">{fmtTimestamp(ameData.timestamp)}</p>
        </div>
        <div className="px-4 py-3 sm:border-r border-b sm:border-b-0 border-dl-border bg-dl-bg-alt">
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
    const isBootstrap = m?.policyMode === 'BOOTSTRAP' || !m?.policyMode;
    if (m && m.dataStatus !== 'empty') {
      return (
        <div className="mb-10">
          <SectionHeading>Live Metrics</SectionHeading>
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
          {isBootstrap && (
            <div className="border border-dl-border border-t-0 px-6 py-3 bg-dl-bg-alt">
              <p className="text-xs text-dl-gray leading-relaxed font-dl-mono">
                Bootstrap phase — metrics reflect control validation and computation correctness, not capital adequacy at scale. See Interpretation Guidance above.
              </p>
            </div>
          )}
        </div>
      );
    }
    if (m && m.dataStatus === 'empty') {
      return (
        <div className="mb-10">
          <SectionHeading>Live Metrics</SectionHeading>
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

  const renderSupplyClassification = () => {
    const psmReserves = (m?.composition || []).filter(c => c.label.toUpperCase().includes('PSM')).reduce((sum, c) => sum + c.valueUsd, 0);
    const initialDeploymentSupply = (m?.liabilitiesTotalUsd || 0) - psmReserves;
    const effectiveBackingRatio = (m?.liabilitiesTotalUsd || 0) > 0 ? psmReserves / m!.liabilitiesTotalUsd : 0;

    return (
      <div className="mb-10">
        <SectionHeading>AXUSD Supply Classification</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt">
          <div className="mb-4">
            <div className="flex items-baseline justify-between py-2 border-b border-dl-border">
              <span className="text-sm text-dl-navy font-dl-serif font-medium">Total AXUSD Outstanding</span>
              <span className="text-sm font-dl-mono text-dl-navy font-semibold">{fmtUsd(m?.liabilitiesTotalUsd || 0)}</span>
            </div>
            <div className="flex items-baseline justify-between py-2 border-b border-dl-border pl-4">
              <span className="text-sm text-dl-navy">├── Initial Deployment Supply</span>
              <div className="text-right">
                <span className="text-sm font-dl-mono text-dl-navy">{fmtUsd(initialDeploymentSupply)}</span>
                <span className="text-xs text-dl-gray ml-2">(Contract deployment mint — not USDC-backed)</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between py-2 border-b border-dl-border pl-4">
              <span className="text-sm text-dl-navy">└── PSM-Backed Supply</span>
              <div className="text-right">
                <span className="text-sm font-dl-mono text-dl-forest">{fmtUsd(psmReserves)}</span>
                <span className="text-xs text-dl-gray ml-2">(1:1 USDC collateralized via PSM swaps)</span>
              </div>
            </div>
          </div>
          <div className="flex items-baseline justify-between py-3 border border-dl-border px-4 bg-dl-bg">
            <span className="text-sm text-dl-navy font-dl-serif font-medium">Effective PSM Backing Ratio</span>
            <span className="text-sm font-dl-mono text-dl-navy font-semibold">{fmtRatio(effectiveBackingRatio)}</span>
          </div>
        </div>
        <div className="border border-dl-border border-t-0 px-6 py-4 bg-dl-bg">
          <p className="text-xs text-dl-gray leading-relaxed font-dl-mono">
            Initial deployment supply represents tokens minted during contract deployment for protocol initialization. These tokens are not backed by USDC deposits in the PSM. The protocol is in a bootstrap capital deployment phase, systematically building collateral backing at $100 per week. As USDC is deposited through PSM swaps, the effective backing ratio will increase toward full collateralization.
          </p>
        </div>
      </div>
    );
  };

  const renderBootstrapCapitalDeployment = () => (
    <div className="mb-10">
      <SectionHeading>Bootstrap Capital Deployment</SectionHeading>
      <DetailGrid
        left={[
          { label: 'Current Weekly Deployment', value: '$100 / week', mono: true },
          { label: 'Target', value: 'Full collateralization of outstanding supply', mono: true },
        ]}
        right={[
          { label: 'Deployment Channels', value: 'PSM deposits, Euler Vault, DEX liquidity', mono: true },
          { label: 'Phase', value: 'Bootstrap — Active', mono: true },
        ]}
      />
      <div className="border border-dl-border border-t-0">
        <div className="grid grid-cols-2 px-6 py-3 bg-dl-bg border-b border-dl-border">
          <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Milestone</p>
          <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono text-right">Cumulative Capital Deployed</p>
        </div>
        {[
          { milestone: 'Week 1', value: '~$100' },
          { milestone: 'Week 13 (Quarter 1)', value: '~$1,300' },
          { milestone: 'Week 26 (Half Year)', value: '~$2,600' },
          { milestone: 'Week 52 (Year 1)', value: '~$5,200' },
        ].map((row, i) => (
          <div
            key={row.milestone}
            className={`grid grid-cols-2 px-6 py-3 ${i < 3 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}
          >
            <p className="text-sm text-dl-navy">{row.milestone}</p>
            <p className="text-sm font-dl-mono text-dl-navy text-right">{row.value}</p>
          </div>
        ))}
      </div>
      <div className="border border-dl-border border-t-0 px-6 py-4 bg-dl-bg-alt">
        <p className="text-xs text-dl-gray leading-relaxed font-dl-mono">
          This is a controlled, transparent bootstrap process. All capital deployments are verifiable on-chain.
        </p>
      </div>
    </div>
  );

  const classifyPsmOp = (op: any): 'MINT' | 'REDEEM' | 'OP' => {
    const t = ((op.title || '') + ' ' + (op.description || '')).toLowerCase();
    if (t.includes('mint')) return 'MINT';
    if (t.includes('redeem')) return 'REDEEM';
    return 'OP';
  };

  const classifyEcosystem = (op: any): string => {
    const t = ((op.title || '') + ' ' + (op.description || '')).toLowerCase();
    if (t.includes('euler') || t.includes('original')) return 'Euler';
    return 'Primary';
  };

  const renderPsmActivityLog = () => {
    const sortedOps = [...psmOps].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const totalMinted = sortedOps.filter(op => classifyPsmOp(op) === 'MINT').reduce((sum: number, op: any) => sum + (parseFloat(op.amount) || 0), 0);
    const totalRedeemed = sortedOps.filter(op => classifyPsmOp(op) === 'REDEEM').reduce((sum: number, op: any) => sum + (parseFloat(op.amount) || 0), 0);
    const netCapitalDeployed = totalMinted - totalRedeemed;

    return (
      <div className="mb-10">
        <SectionHeading>PSM Activity Log — On-Chain Verified</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt mb-4">
          <p className="text-sm text-dl-gray leading-relaxed">
            Every PSM mint and redemption is verified against the Arbitrum One blockchain before recording.
            Transaction hashes link directly to on-chain confirmation. This log provides a complete audit trail
            of all capital flows through the Peg Stability Module.
          </p>
        </div>

        {psmOpsLoading ? (
          <div className="border border-dl-border p-6 bg-dl-bg">
            <p className="text-sm text-dl-gray font-dl-mono">Loading activity log...</p>
          </div>
        ) : sortedOps.length === 0 ? (
          <div className="border border-dl-border p-6 bg-dl-bg">
            <p className="text-sm text-dl-gray font-dl-mono">No PSM operations recorded yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-0 mb-4">
              <div className="border border-dl-border p-4 bg-dl-bg">
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">Total Operations</p>
                <p className="text-lg font-dl-mono text-dl-navy font-semibold">{sortedOps.length}</p>
              </div>
              <div className="border border-dl-border border-l-0 p-4 bg-dl-bg">
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">Total Minted (USDC In)</p>
                <p className="text-lg font-dl-mono text-dl-forest font-semibold">{fmtUsd(totalMinted)}</p>
              </div>
              <div className="border border-dl-border border-l-0 p-4 bg-dl-bg">
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">Total Redeemed (AXUSD Out)</p>
                <p className="text-lg font-dl-mono text-dl-navy font-semibold">{fmtUsd(totalRedeemed)}</p>
              </div>
            </div>

            <div className="border border-dl-border p-4 bg-dl-bg mb-4">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">Net Capital Deployed via PSM</p>
              <p className="text-lg font-dl-mono text-dl-navy font-semibold">{fmtUsd(netCapitalDeployed)}</p>
            </div>

            <div className="border border-dl-border">
              <div className="grid grid-cols-12 px-6 py-3 bg-dl-bg border-b border-dl-border">
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono col-span-2">Date</p>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono col-span-1">Type</p>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono col-span-2 text-right">Amount</p>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono col-span-2">Ecosystem</p>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono col-span-4">Transaction Hash</p>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono col-span-1 text-right">Status</p>
              </div>
              {sortedOps.map((op, i) => {
                const opType = classifyPsmOp(op);
                const isMint = opType === 'MINT';
                const ecosystem = classifyEcosystem(op);
                const txHash = op.tx_hash || '';
                const shortHash = txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : '—';
                const arbiscanUrl = txHash ? `https://arbiscan.io/tx/${txHash}` : '';
                const dateStr = op.created_at ? new Date(op.created_at).toLocaleDateString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';
                const timeStr = op.created_at ? new Date(op.created_at).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '';

                return (
                  <div
                    key={op.id || i}
                    className={`grid grid-cols-12 px-6 py-3 ${i < sortedOps.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}
                  >
                    <div className="col-span-2">
                      <p className="text-sm font-dl-mono text-dl-navy">{dateStr}</p>
                      <p className="text-xs font-dl-mono text-dl-gray">{timeStr} ET</p>
                    </div>
                    <div className="col-span-1">
                      <span className={`text-xs font-dl-mono font-semibold px-2 py-1 border ${isMint ? 'text-dl-forest border-dl-forest' : 'text-dl-navy border-dl-navy'}`}>
                        {opType}
                      </span>
                    </div>
                    <p className="text-sm font-dl-mono text-dl-navy col-span-2 text-right">
                      {fmtUsd(parseFloat(op.amount) || 0)}
                    </p>
                    <p className="text-sm font-dl-mono text-dl-navy col-span-2">{ecosystem}</p>
                    <div className="col-span-4">
                      {arbiscanUrl ? (
                        <a href={arbiscanUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-dl-mono text-dl-link underline break-all">
                          {shortHash}
                        </a>
                      ) : (
                        <p className="text-sm font-dl-mono text-dl-gray">—</p>
                      )}
                    </div>
                    <p className="text-xs font-dl-mono text-dl-forest col-span-1 text-right uppercase">{op.status || '—'}</p>
                  </div>
                );
              })}
            </div>
            <div className="border border-dl-border border-t-0 px-6 py-4 bg-dl-bg-alt">
              <p className="text-xs text-dl-gray leading-relaxed font-dl-mono">
                All transactions are verified against Arbitrum One before recording. Each entry is immutable once logged. Transaction hashes link to Arbiscan for independent verification.
              </p>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderAllocatorView = () => (
    <>
      {renderMetricsGrid()}
      {renderEnforcementPanel()}
      {renderOraclePanel()}
      {renderSupplyClassification()}
      {renderBootstrapCapitalDeployment()}
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

      {renderPsmActivityLog()}

      <div className="mb-10">
        <SectionHeading>Capital Waterfall — Loss Absorption Priority</SectionHeading>
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

      <div className="mb-10">
        <SectionHeading>Custody and Authorization Structure</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            Protocol-governed capital is held in automated control layers deployed on Arbitrum One. Treasury
            operations are executed through multi-party authorization controls. No single key holder can
            unilaterally move, deploy, or withdraw capital.
          </p>
          <DetailGrid
            left={[
              { label: 'Custody Model', value: 'On-chain automated control layers', mono: true },
              { label: 'Authorization', value: 'Multi-party authorization', mono: true },
            ]}
            right={[
              { label: 'Network', value: 'Arbitrum One (L2)', mono: true },
              { label: 'Contract Registry', value: '72 verified contracts', mono: true },
            ]}
          />
          <div className="border border-dl-border border-t-0 px-6 py-4 bg-dl-bg">
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-3">Key Contract Addresses</p>
            <div className="space-y-2">
              {[
                { label: 'AXUSD Primary', address: '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C' },
                { label: 'PSM (USDC)', address: '0x5db58d9c21369d1532a48Bdd658E4Fe415404922' },
                { label: 'PSM (Euler)', address: '0x4584888cB411E9cc88e3800BAB73A430D90d3793' },
                { label: 'Treasury Hub', address: '0x3fD63728288546AC41dAe3bf25ca383061c3A929' },
              ].map((c) => (
                <div key={c.address} className="flex items-center gap-2">
                  <span className="text-xs text-dl-gray font-dl-mono w-28 shrink-0">{c.label}</span>
                  <a
                    href={`https://arbiscan.io/address/${c.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-dl-mono text-dl-navy underline break-all"
                  >
                    {c.address}
                  </a>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-dl-border border-t-0 px-6 py-3 bg-dl-bg">
            <p className="text-xs text-dl-gray leading-relaxed font-dl-mono">
              Signer count, threshold configuration, and timelock parameters are governed by protocol administration.
              Full authorization details will be disclosed as part of the independent attestation process.
            </p>
          </div>
        </div>
      </div>

      {m && m.limitations && m.limitations.length > 0 && (
        <div className="mb-10">
          <SectionHeading>Limitations and Data Freshness</SectionHeading>
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

      <div className="mb-10">
        <SectionHeading>Data Provenance</SectionHeading>
        <div className="border border-dl-border">
          <div className="grid grid-cols-2 px-6 py-3 bg-dl-bg border-b border-dl-border">
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Source</p>
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Reference</p>
          </div>
          {[
            { source: 'On-chain balances', ref: 'Alchemy RPC — Arbitrum One' },
            { source: 'Spot price reference', ref: 'CoinGecko API (mark-to-market)' },
            { source: 'Contract registry', ref: '72 verified contracts — arbiscan.io' },
            { source: 'Snapshot reference', ref: m ? `${m.snapshotId !== 'none' ? m.snapshotId.slice(0, 12) : '—'}` : '—' },
            { source: 'Integrity checksum', ref: m?.checksum || '—' },
          ].map((row, i) => (
            <div key={row.source} className={`grid grid-cols-2 px-6 py-3 ${i < 4 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
              <p className="text-sm text-dl-navy">{row.source}</p>
              <p className="text-sm font-dl-mono text-dl-gray">{row.ref}</p>
            </div>
          ))}
        </div>
        <div className="border border-dl-border border-t-0 px-6 py-3 bg-dl-bg-alt">
          <p className="text-xs text-dl-gray leading-relaxed font-dl-mono">
            Auditability: All displayed figures are derived from deterministic computations applied to checksummed reconciliation snapshots. Each metric is traceable to its source snapshot ID and reproducible from the underlying input data.
          </p>
        </div>
      </div>
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

  const renderAmeStressSimulator = () => {
    const projections = ameStressResult?.projections || [];
    return (
      <div className="mb-10">
        <SectionHeading>AME Stress Simulator</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt mb-4">
          <p className="text-sm text-dl-gray leading-relaxed">
            Deterministic stress projection. Select a predefined shock scenario and run the AME engine against current inputs. Results show projected metric changes and policy mode transitions. These are deterministic projections, not predictions.
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
            <option value="ALL">All Scenarios</option>
          </select>
          <button
            onClick={runAmeStress}
            disabled={ameStressLoading}
            className="px-4 py-2 border border-dl-border bg-dl-bg text-xs font-dl-mono text-dl-navy"
          >
            {ameStressLoading ? 'Running...' : 'Run Stress Projection'}
          </button>
        </div>
        {ameStressScenario !== 'ALL' && (
          <div className="border border-dl-border p-4 bg-dl-bg mb-4">
            <p className="text-xs text-dl-gray">{AME_SCENARIOS.find(s => s.key === ameStressScenario)?.description || ''}</p>
          </div>
        )}
        {ameStressResult?.dataStatus === 'error' && (
          <div className="border border-dl-border p-4 bg-dl-bg-alt mb-4">
            <p className="text-sm text-dl-error">Stress projection requires administrative authorization. Contact protocol administration to run authorized stress tests.</p>
          </div>
        )}
        {ameStressResult?.dataStatus === 'empty' && (
          <div className="border border-dl-border p-4 bg-dl-bg-alt mb-4">
            <p className="text-sm text-dl-gray">No solvency snapshot available to derive inputs. Run an AME evaluation first.</p>
          </div>
        )}
        {projections.length > 0 && (
          <>
            <div className="border border-dl-border overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dl-bg border-b border-dl-border">
                    <th className="px-4 py-3 text-left text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Scenario</th>
                    <th className="px-4 py-3 text-right text-xs text-dl-gray uppercase tracking-wider font-dl-mono">CR After</th>
                    <th className="px-4 py-3 text-right text-xs text-dl-gray uppercase tracking-wider font-dl-mono">SSS After</th>
                    <th className="px-4 py-3 text-center text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Mode After</th>
                    <th className="px-4 py-3 text-center text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Hard Brake</th>
                    <th className="px-4 py-3 text-right text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Breaches</th>
                  </tr>
                </thead>
                <tbody>
                  {projections.map((proj: any, i: number) => (
                    <tr key={proj.scenario?.key || i} className={`border-b border-dl-border last:border-b-0 ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                      <td className="px-4 py-2 font-dl-mono text-xs text-dl-navy">{proj.scenario?.label || 'N/A'}</td>
                      <td className="px-4 py-2 font-dl-mono text-xs text-dl-navy text-right">{fmtDecimal(proj.projectedMetrics?.coverageRatio || 0)}</td>
                      <td className="px-4 py-2 font-dl-mono text-xs text-dl-navy text-right">{proj.projectedMetrics?.stabilityScore || 0}</td>
                      <td className={`px-4 py-2 font-dl-mono text-xs text-center ${policyColor(proj.policyModeAfter || '')}`}>{proj.policyModeAfter || 'N/A'}</td>
                      <td className={`px-4 py-2 font-dl-mono text-xs text-center ${proj.hardBrakeAfter ? 'text-dl-error' : 'text-dl-forest'}`}>{proj.hardBrakeAfter ? 'YES' : 'NO'}</td>
                      <td className={`px-4 py-2 font-dl-mono text-xs text-right ${(proj.breaches?.length || 0) > 0 ? 'text-dl-error' : 'text-dl-forest'}`}>{proj.breaches?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ameStressResult.worstCase && (
              <div className="border border-dl-border p-4 bg-dl-bg-alt mb-4">
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-2">Worst Case Analysis</p>
                <p className="text-sm text-dl-navy mb-1">Scenario: <span className="font-dl-mono">{ameStressResult.worstCase.scenario?.label}</span></p>
                <p className="text-sm text-dl-navy mb-1">Resulting Mode: <span className={`font-dl-mono ${policyColor(ameStressResult.worstCase.policyModeAfter)}`}>{ameStressResult.worstCase.policyModeAfter}</span></p>
                {ameStressResult.worstCase.breaches?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-dl-gray mb-1">Threshold Breaches:</p>
                    {ameStressResult.worstCase.breaches.map((b: string, i: number) => (
                      <p key={i} className="text-xs font-dl-mono text-dl-error">{b}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {ameStressResult.conclusion && (
              <div className="border border-dl-border p-4 bg-dl-bg">
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">Conclusion</p>
                <p className="text-sm text-dl-navy">{ameStressResult.conclusion}</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderClearinghouseView = () => (
    <>
      {renderMetricsGrid()}
      {renderEnforcementPanel()}
      {renderOraclePanel()}

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
        <div className="border border-dl-border border-t-0 px-6 py-3 bg-dl-bg">
          <p className="text-xs text-dl-gray leading-relaxed font-dl-mono">
            Note: Total supply includes initial deployment mint. PSM backing ratio reflects only USDC-collateralized supply. See Allocator view for full supply classification.
          </p>
        </div>
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
            <p className="text-sm text-dl-navy font-medium mb-1">No historical data recorded yet</p>
            <p className="text-xs text-dl-gray leading-relaxed">Historical coverage tracking begins after the first two reconciliation cycles. Once multiple snapshots exist, a time-series chart of coverage ratio, reserve ratio, and policy mode will appear here.</p>
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
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">What These Metrics Mean</p>
          <p className="text-sm text-dl-gray leading-relaxed">Regime Score (RS) is a composite measure (0.0–1.0) quantifying the protocol stress environment from volatility, drawdown, flow imbalance, and liquidity compression signals. Policy Multiplier (PM) scales protective thresholds nonlinearly based on RS. Payout Factor (PF) determines the stability-weighted distribution capacity. All computations are deterministic and reproducible from input snapshot data.</p>
        </div>
        <div className="px-6 py-4 bg-dl-bg-alt border-b border-dl-border">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">How to Interpret RS and PM</p>
          <p className="text-sm text-dl-gray leading-relaxed">RS below 0.25 = STABLE. RS 0.25–0.50 = CAUTION. RS 0.50–0.75 = STRESS. RS 0.75+ = CRISIS. PM is computed as 1/(1−RS) clamped to 1–10. Higher PM means more protective target ratios.</p>
        </div>
        <div className="px-6 py-4 bg-dl-bg border-b border-dl-border">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">What Triggers Do</p>
          <p className="text-sm text-dl-gray leading-relaxed">Hard brakes are deterministic policy gates. When coverage, reserve, or liquidity ratios fall below their adaptive targets, corresponding actions activate automatically. Actions are prioritized in waterfall order: Crisis Lockdown, Freeze Distributions, Liquidity Defense, Redirect Flows.</p>
        </div>
        <div className="px-6 py-4 bg-dl-bg-alt border-b border-dl-border">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">Crisis Regime Protocol</p>
          <p className="text-sm text-dl-gray leading-relaxed">In CRISIS regime (RS ≥ 0.75), payout factor is forced to zero. All discretionary distributions are frozen. Crisis lockdown procedures activate. This state requires governance intervention to resolve.</p>
        </div>
        <div className="px-6 py-4 bg-dl-bg border-b border-dl-border">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">Model Limitations and Data Freshness</p>
          <p className="text-sm text-dl-gray leading-relaxed">AME operates on reconciliation snapshot data subject to temporal variance relative to point-in-time conditions. Realized volatility and drawdown inputs are proxy estimates. The model applies deterministic linear and clamped nonlinear transforms; it does not capture tail correlations, contagion effects, or non-linear cross-asset dependencies. External price feed references may introduce mark-to-market variance and rounding.</p>
        </div>
        <div className="px-6 py-4 bg-dl-bg-alt border-b border-dl-border">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">Reconciliation and Disclosure Cadence</p>
          <p className="text-sm text-dl-gray leading-relaxed">AME evaluations are produced on a controlled reconciliation cycle by protocol administration. Each evaluation creates immutable, checksummed audit artifacts with full input lineage. Historical evaluations are retained indefinitely for auditability and regulatory reference.</p>
        </div>
        <div className="px-6 py-4 bg-dl-bg">
          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-1">Data Sources and Integrity</p>
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

    const getBandFromScore = (score: number): string => {
      if (score >= 75) return 'STABLE';
      if (score >= 50) return 'CAUTION';
      if (score >= 25) return 'STRESS';
      return 'CRISIS';
    };

    return (
      <div className="mb-10">
        <SectionHeading>Historical Metric Snapshots</SectionHeading>
        {ameHistory.length === 0 ? (
          <div className="border border-dl-border p-6 bg-dl-bg-alt">
            <p className="text-sm text-dl-navy font-medium mb-1">No metric snapshots recorded yet</p>
            <p className="text-xs text-dl-gray leading-relaxed">Historical metric snapshots will appear here after the first AME evaluation is run. Each snapshot records coverage ratio, reserve ratio, stability score, and policy mode for longitudinal analysis and audit reference.</p>
          </div>
        ) : (
          <>
            <div className="border border-dl-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dl-bg border-b border-dl-border">
                    <th className="px-4 py-3 text-left text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Timestamp</th>
                    <th className="px-4 py-3 text-right text-xs text-dl-gray uppercase tracking-wider font-dl-mono">CR</th>
                    <th className="px-4 py-3 text-right text-xs text-dl-gray uppercase tracking-wider font-dl-mono">RR</th>
                    <th className="px-4 py-3 text-right text-xs text-dl-gray uppercase tracking-wider font-dl-mono">LSR</th>
                    <th className="px-4 py-3 text-right text-xs text-dl-gray uppercase tracking-wider font-dl-mono">VPI</th>
                    <th className="px-4 py-3 text-right text-xs text-dl-gray uppercase tracking-wider font-dl-mono">SSS</th>
                    <th className="px-4 py-3 text-center text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Band</th>
                    <th className="px-4 py-3 text-center text-xs text-dl-gray uppercase tracking-wider font-dl-mono">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((snap: any, i: number) => {
                    const sss = Number(snap.stabilityScore || 0);
                    const band = getBandFromScore(sss);
                    return (
                      <tr key={snap.id || i} className={`border-b border-dl-border last:border-b-0 ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                        <td className="px-4 py-2 font-dl-mono text-xs text-dl-navy">{fmtTimestamp(snap.createdAt)}</td>
                        <td className="px-4 py-2 font-dl-mono text-xs text-dl-navy text-right">{fmtDecimal(snap.coverageRatio)}</td>
                        <td className="px-4 py-2 font-dl-mono text-xs text-dl-navy text-right">{fmtDecimal(snap.reserveRatio)}</td>
                        <td className="px-4 py-2 font-dl-mono text-xs text-dl-navy text-right">{fmtDecimal(snap.liquidityStabilityRatio)}</td>
                        <td className="px-4 py-2 font-dl-mono text-xs text-dl-navy text-right">{fmtDecimal(snap.volatilityPressureIndex)}</td>
                        <td className="px-4 py-2 font-dl-mono text-xs text-dl-navy text-right">{sss}</td>
                        <td className={`px-4 py-2 font-dl-mono text-xs text-center ${regimeBandColor(band)}`}>{band}</td>
                        <td className={`px-4 py-2 font-dl-mono text-xs text-center ${policyColor(snap.policyMode || '')}`}>{snap.policyMode || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={ameHistoryPage}
              totalPages={totalPages}
              total={ameHistory.length}
              limit={AME_HISTORY_PAGE_SIZE}
              onPageChange={setAmeHistoryPage}
              itemLabel="snapshots"
            />
          </>
        )}
      </div>
    );
  };

  const renderRegulatoryView = () => (
    <>
      {renderMetricsGrid()}
      {renderEnforcementPanel()}
      {renderOraclePanel()}

      <div className="mb-10">
        <SectionHeading>Disclosure Purpose and Scope</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            This page provides transparent, verifiable financial health data for the Axiom Protocol.
            It is designed for participants, prospective allocators, counterparties, and any interested party
            requiring visibility into the capital adequacy and reserve posture of the protocol.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            All data is derived from controlled reconciliation snapshots produced on a defined disclosure cycle.
            Each snapshot captures the state of protocol capital at a specific point in time and includes a
            cryptographic checksum (SHA-256 truncated digest) for independent verification.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            The scope of this disclosure covers treasury capital, reserve designations, liability obligations,
            capital adequacy ratios, stabilization policy status, the composition of protocol-governed assets,
            and adaptive risk metrics produced by the Adaptive Metrics Engine (AME).
          </p>
          <p className="text-sm text-dl-gray leading-relaxed font-medium">
            No independent third-party attestation or external audit has been completed as of this disclosure.
            Data integrity assurance currently relies on cryptographic snapshot checksums, deterministic computation
            reproducibility, and internal administrative controls.
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
        <SectionHeading>Stabilization Policy Framework</SectionHeading>
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
        <SectionHeading>Data Integrity and Verification</SectionHeading>
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
        <SectionHeading>Reading Guide</SectionHeading>
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
        <SectionHeading>Frequently Asked Questions</SectionHeading>
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
        <SectionHeading>Verification and Reporting Procedures</SectionHeading>
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
        <SectionHeading>General Disclosure</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt">
          <p className="text-sm text-dl-gray leading-relaxed mb-3">
            The information presented on this page is provided for informational and transparency purposes only.
            Nothing on this page constitutes financial, legal, tax, or investment advice. All figures are
            derived from controlled reconciliation snapshots subject to temporal variance and may not reflect
            point-in-time balances. External price feed references may introduce mark-to-market variance and rounding.
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
        <title>Solvency and Reserve Transparency — Axiom Protocol | Institutional Disclosure</title>
        <meta name="description" content="Institutional-grade solvency disclosure, reserve transparency, capital adequacy metrics, and risk posture reporting for the Axiom Protocol. Verifiable, checksummed, and deterministic." />
        <meta property="og:title" content="Solvency and Reserve Transparency — Axiom Protocol" />
        <meta property="og:description" content="Institutional-grade solvency disclosure, reserve transparency, capital adequacy metrics, and risk posture reporting. Verifiable, checksummed, and deterministic." />
        <meta property="og:image" content="/images/og-solvency-transparency.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Solvency and Reserve Transparency — Axiom Protocol" />
        <meta name="twitter:description" content="Institutional-grade solvency disclosure, reserve transparency, and capital adequacy metrics for the Axiom Protocol." />
        <meta name="twitter:image" content="/images/og-solvency-transparency.png" />
      </Head>

      {fetchErrors.length > 0 && (
        <div className="border border-dl-error bg-dl-bg-alt px-4 py-3 mb-6">
          <p className="text-xs font-dl-mono text-dl-error uppercase tracking-wider mb-1">Data Fetch Warning</p>
          <p className="text-sm text-dl-gray">{fetchErrors.join('. ')}. Displayed data may be incomplete.</p>
        </div>
      )}

      <div className="border-b border-dl-border pb-8 mb-10">
        <div className="flex items-center gap-4 mb-4">
          <p className="text-xs text-dl-gray uppercase tracking-widest font-dl-mono">Protocol Health</p>
          <span className="px-3 py-1 border border-dl-border text-xs font-dl-mono uppercase tracking-wider text-dl-gray bg-dl-bg-alt">
            {m?.policyMode === 'NORMAL' ? 'OPERATIONAL' : m?.policyMode === 'BOOTSTRAP' || !m?.policyMode ? 'CONTROL VALIDATION WINDOW' : m.policyMode}
          </span>
        </div>
        <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          Solvency and Reserve Transparency
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed">
          This page provides verifiable visibility into the financial health of the Axiom Protocol.
          All figures are derived from controlled reconciliation snapshots and reflect capital positions,
          reserve adequacy, and stabilization policy status at the time of the most recent disclosure cycle.
        </p>
      </div>

      <div className="border border-dl-border p-6 mb-10 bg-dl-bg-alt">
        <p className="font-dl-serif text-sm text-dl-navy font-medium mb-3">Interpretation Guidance</p>
        <ul className="space-y-2">
          <li className="text-sm text-dl-gray leading-relaxed">— This dashboard is a transparency and risk posture disclosure tool. It is not performance marketing and should not be interpreted as a solicitation.</li>
          <li className="text-sm text-dl-gray leading-relaxed">— Early-stage and bootstrap capital levels do not invalidate the control design. The stabilization framework is active regardless of absolute capital scale.</li>
          <li className="text-sm text-dl-gray leading-relaxed">— The capital waterfall describes the structural priority of loss absorption. It is not a guarantee of recovery or a commitment to maintain specific capital levels.</li>
          <li className="text-sm text-dl-gray leading-relaxed">— Key metrics: Coverage Ratio (CR) measures total capital adequacy. Reserve Ratio (RR) measures segregated reserve depth. Loss Buffer Ratio (LBR) measures first-loss capacity. Liquidity Depth (LD) measures instantaneous redemption capacity. Regime Band classifies the stress environment.</li>
          <li className="text-sm text-dl-gray leading-relaxed">— All figures are subject to reconciliation latency. The data freshness window is indicated by the snapshot timestamp and reference ID below.</li>
        </ul>
      </div>

      <div className="mb-10">
        <SectionHeading>Metric Interpretation Under Bootstrap Conditions</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt mb-6">
          <p className="text-sm text-dl-gray leading-relaxed mb-5">
            During bootstrap, disclosed balances may be small by design. Magnitude is not the validation objective at this stage.
            The purpose of this page is to demonstrate that the disclosure system is operating with deterministic computations,
            defined capital segregation, and traceable reconciliation.
          </p>

          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-3">What These Metrics Demonstrate During Bootstrap</p>
          <ul className="space-y-2 mb-6">
            <li className="text-sm text-dl-gray leading-relaxed pl-4">— Deterministic calculation behavior and reproducible outputs from the same inputs</li>
            <li className="text-sm text-dl-gray leading-relaxed pl-4">— Segregation integrity across treasury, reserves, and designated buckets</li>
            <li className="text-sm text-dl-gray leading-relaxed pl-4">— Reconciliation traceability via the snapshot reference and integrity checksum</li>
            <li className="text-sm text-dl-gray leading-relaxed pl-4">— Policy state and regime classification behavior under defined rules</li>
          </ul>

          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-3">What These Metrics Do Not Imply During Bootstrap</p>
          <ul className="space-y-2 mb-6">
            <li className="text-sm text-dl-gray leading-relaxed pl-4">— Readiness for institutional scale or capacity</li>
            <li className="text-sm text-dl-gray leading-relaxed pl-4">— Any guarantee of liquidity, redemption capacity, or loss recovery</li>
            <li className="text-sm text-dl-gray leading-relaxed pl-4">— Any form of performance marketing, yield representation, or solicitation</li>
          </ul>

          <p className="font-dl-serif text-sm text-dl-navy font-medium mb-3">Decision Use for Allocators</p>
          <p className="text-sm text-dl-gray leading-relaxed">
            At this stage, use this page to verify control design, reporting integrity, and operational discipline.
            A later-stage disclosure posture would typically require an established disclosure cadence, defined reserve targets,
            and independent external attestations, without implying timing or commitment.
          </p>
        </div>
      </div>

      {m && (() => {
        const snapshotAgeMs = m.asOfUtc ? Date.now() - new Date(m.asOfUtc).getTime() : 0;
        const snapshotAgeHours = snapshotAgeMs / (1000 * 60 * 60);
        const isStale = snapshotAgeHours > 48;
        const fmtAge = (ms: number): string => {
          const totalMinutes = Math.floor(ms / (1000 * 60));
          if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
          const hours = Math.floor(totalMinutes / 60);
          if (hours < 48) return `${hours} hour${hours !== 1 ? 's' : ''}`;
          const days = Math.floor(hours / 24);
          const remainingHours = hours % 24;
          return `${days}d ${remainingHours}h`;
        };
        return (
          <>
            {isStale && (
              <div className="border-2 border-dl-gold px-4 py-3 mb-2 bg-dl-bg">
                <p className="text-sm text-dl-gold font-dl-mono font-semibold">DATA STALENESS ALERT</p>
                <p className="text-xs text-dl-gray mt-1">This snapshot is more than 48 hours old ({Math.round(snapshotAgeHours)} hours). Displayed metrics may not reflect current on-chain balances. Contact the protocol administrator if reconciliation has not occurred within the expected cadence.</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-dl-border p-4 mb-8 bg-dl-bg-alt">
              <div>
                <div className="flex items-center gap-4 mb-1">
                  <p className="text-xs text-dl-gray">Data as of</p>
                  <p className="text-xs font-dl-mono text-dl-gray">Snapshot Age: <span className={isStale ? 'text-dl-gold font-semibold' : 'text-dl-navy'}>{fmtAge(snapshotAgeMs)}</span></p>
                </div>
                <p className="font-dl-mono text-sm text-dl-navy">{fmtTimestamp(m.asOfUtc)}</p>
                <p className="font-dl-mono text-xs text-dl-gray mt-1">
                  Snapshot: {m.snapshotId !== 'none' ? m.snapshotId.slice(0, 12) : 'none'} — Checksum: {m.checksum}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3 sm:mt-0">
                <a
                  href={`/api/solvency/export?snapshotId=${m.snapshotId !== 'none' ? m.snapshotId : ''}`}
                  className="px-4 py-2 border border-dl-border bg-dl-bg text-xs font-dl-mono text-dl-navy"
                  download
                >
                  Download Snapshot PDF
                </a>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-2 border border-dl-border bg-dl-bg text-xs font-dl-mono text-dl-navy"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh data'}
                </button>
              </div>
            </div>
          </>
        );
      })()}

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

      <div className="border-t-2 border-dl-navy pt-8 mt-12">
        <DisclosureBlock
          label="Full Risk Disclosure — Material Risks and Limitations"
          text="RISK DISCLOSURE: This page provides informational transparency data only. It does not constitute an offer, solicitation, or recommendation to participate in any protocol activity. All solvency data is derived from controlled reconciliation snapshots subject to temporal variance and may not reflect point-in-time conditions. Reserve ratios, coverage ratios, and capital positions are subject to change between disclosure cycles. External price feed references may introduce mark-to-market variance and rounding. The protocol stabilization policy operates on a best-efforts basis and does not guarantee any particular outcome. Participation in the Axiom Protocol involves material risk including, but not limited to, total loss of contributed capital. The loss buffer and reserve designations are structural mechanisms and do not constitute insurance, guarantees, or warranties of any kind. Past performance, reserve adequacy, and historical coverage ratios are not indicative of future results. Multi-party authorization controls reduce but do not eliminate operational risk. Automated control layers are subject to technical risk including software defects and settlement environment disruptions. The Adaptive Metrics Engine (AME) produces deterministic computations from snapshot inputs; model outputs are projections subject to the limitations of input data quality and model assumptions. Participants are solely responsible for their own due diligence and should consult qualified legal, financial, and tax advisors. Axiom Protocol does not provide investment advice."
          defaultOpen={false}
        />
      </div>
    </DesignLawLayout>
  );
}


