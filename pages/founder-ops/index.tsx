import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  DesignLawLayout,
  PageShell,
  SectionHeading,
  DataTable,
  StatusBadge,
  SolidButton,
} from '../../components/design-law';
import type { Column } from '../../components/design-law';

interface SentinelData {
  regime: string;
  regimeConfidence: number;
  systemStance: string;
  totalSignals: number;
  qualifiedSignals: number;
  approvedDecisions: number;
  deniedDecisions: number;
  authorityMode?: string;
  guardRail5?: { status: string; rule: string };
}

interface GuardRailStatus {
  id: number;
  title: string;
  status: 'PASS' | 'ENFORCED' | 'WARNING' | 'UNKNOWN' | 'LOADING';
  detail: string;
  source: string;
}

interface EulerData {
  deposited: string;
  utilization: string;
  supplyAPY: string;
  borrowAPY: string;
  feeRecipientConfigured: boolean;
  revenueRouterSet: boolean;
  feeRoutingStatus: string;
  interestFeePercent: string;
}

interface FeePlumbing {
  eulerFeeRecipientSet: boolean;
  revenueRouterConnected: boolean;
  feeRoutingStatus: string;
  status: string;
}

interface OverviewData {
  timestamp: string;
  sentinel: SentinelData;
  euler: EulerData;
  axusd: { totalSupply: string };
  lendingFund: { tvl: string; sharePrice: string; activeLoans: number };
  dex: { tvl: string; volume24h: string };
  treasury: { total: string; currentExposure: string };
  nodes: { total: number; active: number };
  feePlumbing: FeePlumbing;
  contracts: Record<string, string>;
}

interface LogEntry {
  id: string;
  created_at: string;
  week: number;
  phase: number;
  category: string;
  title: string;
  description: string;
  tx_hash: string | null;
  product: string | null;
  amount: string | null;
  status: string;
  failure_reason: string | null;
  fix_applied: string | null;
  protocol_change: string | null;
}

interface OperatorStrategyProfile {
  operator_wallet: string;
  strategy_type: string;
  asset_class: string | null;
  market: string | null;
  observations: number;
  signal_count: number;
  avg_capex_per_unit: string | null;
  avg_rent_lift: string | null;
  avg_noi_lift: string | null;
  avg_stabilization_days: string | null;
  avg_confidence: string | null;
  deal_count: number;
  last_signal_at: string | null;
  approved_outcomes: number;
  reviewed_outcomes: number;
  success_rate_pct: string | null;
  avg_cost_error_pct: string | null;
  avg_timeline_error_pct: string | null;
  avg_roi_variance_pct: string | null;
}

interface NetworkSignal {
  strategy_type: string;
  market: string;
  avg_capex_per_unit: string | null;
  avg_confidence: string;
  total_sample_size: number;
  signal_count: number;
}

interface NetworkSnapshot {
  id: string;
  snapshot_date: string;
  scope: string;
  confidence_score: string;
  created_at: string;
  aggregated_signals: NetworkSignal[];
}

interface CapitalEvent {
  id: string;
  deal_id: string | null;
  offering_id: string | null;
  event_type: string;
  capital_source_type: string | null;
  raise_velocity: string | null;
  minimum_capital_met: boolean | null;
  investor_demand_score: string | null;
  lender_path_chosen: string | null;
  refi_outcome: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  deal_address: string | null;
  offering_name: string | null;
}

const REGIME_COLORS: Record<string, string> = {
  TREND_UP: 'text-dl-forest',
  TREND_DOWN: 'text-dl-error',
  RANGE_LOW_VOL: 'text-dl-gray',
  HIGH_VOL_DISLOCATION: 'text-dl-gold',
};

const STANCE_COLORS: Record<string, string> = {
  RISK_ON: 'text-dl-forest',
  DEFENSIVE: 'text-dl-gold',
  HALTED: 'text-dl-error',
  NEUTRAL: 'text-dl-navy',
};

function formatUTC(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function truncateAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr || '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── EVK Whitelist constants ────────────────────────────────────────────────
const LPM_ADDR     = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F';
const EVK_FACTORY  = '0x29a56a1b8214D9Cf7c5561811750D5cBDb45CC8e';
const EVC_ADDR     = '0x0C9a3dd6b8F28529d72d7f9cE918D493519EE383';

interface EvkWhitelistTabProps {
  lpmPlatforms: string[];
  lpmLoading: boolean;
  onRefresh: () => void;
}

function EvkWhitelistTab({ lpmPlatforms, lpmLoading, onRefresh }: EvkWhitelistTabProps) {
  const [addingAddr, setAddingAddr] = useState('');
  const [addResult, setAddResult] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const REQUIRED = [
    { label: 'EVC', addr: EVC_ADDR, sub: 'Euler Vault Connector — routes all vault calls' },
    { label: 'EVK Factory', addr: EVK_FACTORY, sub: 'Creates EVK vault proxies; must hold AXUSD during deployment' },
    { label: 'EVK Vault', addr: 'PENDING DEPLOYMENT', sub: 'EVK_OPEN_MARKET_VAULT — update after deploy' },
  ];

  const handleAddPlatform = async () => {
    if (!addingAddr.match(/^0x[0-9a-fA-F]{40}$/)) {
      setAddResult('Invalid address format.');
      return;
    }
    setAddLoading(true);
    setAddResult(null);
    try {
      const r = await fetch('/api/erc3643/whitelist/add-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: addingAddr }),
      });
      const d = await r.json();
      if (d.success) {
        setAddResult('Platform queued for whitelist. Tx: ' + (d.txHash || 'n/a'));
        setAddingAddr('');
        onRefresh();
      } else {
        setAddResult('Error: ' + (d.error || 'Unknown error'));
      }
    } catch {
      setAddResult('Request failed. Check console.');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="mb-8">
      <SectionHeading>EVK Open Money Market — LPM Whitelist Admin</SectionHeading>
      <p className="text-xs text-dl-gray max-w-2xl leading-relaxed mb-6">
        The ERC-3643 LendingPlatformModule (LPM) must whitelist the EVC, EVK Factory, and the
        deployed vault before any address can hold or transfer ERC-3643 AXUSD through the vault.
        This panel shows the whitelist status and provides an admin action to add platforms.
      </p>

      <div className="border border-dl-border mb-6">
        <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
          <p className="text-xs font-semibold text-dl-navy font-dl-mono uppercase">Required Whitelist Addresses</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
          <div className="px-4 py-3 border-b border-r border-dl-border bg-dl-bg">
            <p className="text-xs text-dl-gray mb-1 font-dl-mono uppercase">LPM</p>
            <p className="font-dl-mono text-xs font-bold text-dl-navy break-all">{LPM_ADDR}</p>
            <p className="text-xs text-dl-muted mt-0.5">LendingPlatformModule</p>
          </div>
          {REQUIRED.map((m, i) => (
            <div key={m.label} className={`px-4 py-3 border-b ${i < 2 ? 'border-r' : ''} border-dl-border bg-dl-bg`}>
              <p className="text-xs text-dl-gray mb-1 font-dl-mono uppercase">{m.label}</p>
              <p className={`font-dl-mono text-xs font-bold break-all ${m.addr === 'PENDING DEPLOYMENT' ? 'text-dl-gold' : 'text-dl-navy'}`}>{m.addr}</p>
              <p className="text-xs text-dl-muted mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-dl-border mb-6">
        <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border flex items-center justify-between">
          <p className="text-xs font-semibold text-dl-navy font-dl-mono uppercase">Whitelisted Platforms (Live from LPM)</p>
          <button
            onClick={onRefresh}
            disabled={lpmLoading}
            className="font-dl-mono text-xs border border-dl-border px-3 py-1 text-dl-navy hover:bg-dl-bg-alt disabled:opacity-50"
          >
            {lpmLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {lpmLoading ? (
          <div className="px-4 py-6 text-center text-sm text-dl-gray">Loading platform data...</div>
        ) : lpmPlatforms.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-dl-gray">
            No platforms loaded yet — click Refresh, or no platforms have been whitelisted.
          </div>
        ) : (
          lpmPlatforms.map((addr, i) => (
            <div key={addr} className={`flex justify-between items-center px-4 py-3 text-xs font-dl-mono ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'} border-b border-dl-border`}>
              <span className="text-dl-navy">{addr}</span>
              <a href={`https://arbiscan.io/address/${addr}`} target="_blank" rel="noopener noreferrer" className="text-dl-gray underline">Arbiscan</a>
            </div>
          ))
        )}
      </div>

      <div className="border border-dl-border mb-6">
        <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
          <p className="text-xs font-semibold text-dl-navy font-dl-mono uppercase">Admin Action — Add Platform to Whitelist</p>
        </div>
        <div className="px-4 py-4 bg-dl-bg">
          <p className="text-xs text-dl-gray mb-3 leading-relaxed">
            Enter the platform address (EVC, EVK Factory, or deployed vault) to whitelist it in the
            LendingPlatformModule. This calls <span className="font-dl-mono">addPlatform(AXUSD_TOKEN, platform)</span> via
            the LPM admin API. Requires founder key authorization.
          </p>
          <div className="flex gap-3 items-start">
            <input
              type="text"
              value={addingAddr}
              onChange={e => setAddingAddr(e.target.value)}
              placeholder="0x... platform address"
              className="flex-1 border border-dl-border px-3 py-2 font-dl-mono text-xs text-dl-text bg-white focus:outline-none"
            />
            <button
              onClick={handleAddPlatform}
              disabled={addLoading || !addingAddr}
              className="bg-dl-navy text-white px-5 py-2 font-dl-mono text-xs disabled:opacity-50"
            >
              {addLoading ? 'Submitting...' : 'Add Platform'}
            </button>
          </div>
          {addResult && (
            <p className={`mt-2 font-dl-mono text-xs ${addResult.startsWith('Error') ? 'text-dl-error' : 'text-dl-forest'}`}>
              {addResult}
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { label: 'Quick: EVC', addr: EVC_ADDR },
              { label: 'Quick: EVK Factory', addr: EVK_FACTORY },
            ].map(q => (
              <button
                key={q.addr}
                onClick={() => setAddingAddr(q.addr)}
                className="border border-dl-border px-3 py-1.5 font-dl-mono text-xs text-dl-navy text-left hover:bg-dl-bg-alt"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-dl-border mb-6">
        <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
          <p className="text-xs font-semibold text-dl-navy font-dl-mono uppercase">Deployment Sequence (Task #38)</p>
        </div>
        {[
          { n: '01', cmd: 'npx hardhat run scripts/deploy-axusd-oracle.js --network arbitrumOne', desc: 'Deploy ERC-7726 AXIOMOracleAdapter. Update AXUSD_ERC7726_ORACLE_ADAPTER in oracleConfig.ts.' },
          { n: '02', cmd: 'AXUSD_ORACLE_ADAPTER=<addr> npx hardhat run scripts/deploy-axusd-evk-vault.js --network arbitrumOne', desc: 'Deploy LinearKink IRM + EVK vault. Script auto-whitelists EVC + EVK Factory + vault in LPM. Supply cap 1M, borrow cap 500K set at launch.' },
          { n: '03', cmd: 'Update shared/contracts.ts + src/config/activeContracts.generated.ts', desc: 'Set EVK_OPEN_MARKET_VAULT, EVK_OPEN_MARKET_IRM, EVK_OPEN_MARKET_GOVERNOR to deployed addresses.' },
          { n: '04', cmd: 'Verify whitelist here → click Refresh above', desc: 'Confirm EVC, EVK Factory, and vault all appear in the live LPM platform list.' },
          { n: '05', cmd: 'vault.deposit(initialAmount, receiverAddr)', desc: 'Seed initial AXUSD liquidity. Governor transfers to multisig after seeding.' },
        ].map((step, i) => (
          <div key={step.n} className={`px-4 py-3 ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'} ${i < 4 ? 'border-b border-dl-border' : ''}`}>
            <div className="flex items-start gap-3">
              <span className="font-dl-mono text-xs font-bold text-dl-navy w-5 flex-shrink-0">{step.n}</span>
              <div>
                <p className="font-dl-mono text-xs text-dl-navy mb-1">{step.cmd}</p>
                <p className="text-xs text-dl-gray">{step.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-dl-border bg-dl-bg-alt p-4">
        <p className="text-xs text-dl-gray leading-relaxed">
          <span className="font-semibold text-dl-navy">ERC-3643 Compliance:</span> The LendingPlatformModule enforces that only
          whitelisted addresses can hold or receive ERC-3643 AXUSD. Three addresses require whitelist entries: the EVC
          (routes all vault calls), the EVK Factory (creates vault proxies and briefly holds asset during deployment),
          and the vault itself (settlement address for all borrows and repayments). Individual borrower wallets do
          NOT need whitelist entries — the vault is the compliance boundary.
        </p>
      </div>
    </div>
  );
}

const ALLOCATION_TABLE = [
  { bucket: 'AXUSD (via PSM)', amount: '$40', purpose: 'Euler Vault + Lending Vault deposits' },
  { bucket: 'AXM (via Camelot)', amount: '$25', purpose: 'SEED lock — governance + revenue share' },
  { bucket: 'USDC Buffer', amount: '$20', purpose: 'Gas costs + operating reserve' },
  { bucket: 'Node/Infrastructure', amount: '$15', purpose: 'DePIN node rewards accumulation' },
];

const CHECKPOINTS = [
  { week: 4, gate: 'PSM and vault deposits must complete full cycle without contract errors' },
  { week: 8, gate: 'All Phase 1 products must complete full lifecycle before Phase 2' },
  { week: 12, gate: 'Revenue Router must have distributed at least once' },
  { week: 20, gate: 'Expansion gate must return actionable pass/fail result' },
  { week: 28, gate: 'Land acquisition and crowdfunding must complete full test cycles' },
  { week: 36, gate: 'Governance timelock must be proven with at least 3 queued actions' },
  { week: 40, gate: 'Full treasury audit before any real property commitment' },
  { week: 44, gate: 'HARD PAUSE: If no qualifying property found, Phase 4 pauses — capital compounds' },
  { week: 52, gate: 'Complete documentation review before any public release' },
];

const FOOTER_DISCLOSURE =
  'INTERNAL USE ONLY: This dashboard is for founder operational validation. All data reflects ' +
  'real on-chain state on Arbitrum One. Self-borrow tests are tagged as non-representative. ' +
  'Sentinel is advisory only until post-public governance vote. No investment advice provided.';

export default function FounderOpsPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [guardRails, setGuardRails] = useState<GuardRailStatus[]>([
    { id: 1, title: 'Fee Recipient Assumption Check', status: 'LOADING', detail: 'Checking...', source: '/api/founder-ops/fee-plumbing-preflight' },
    { id: 2, title: 'Revenue Router Accounting Visibility', status: 'LOADING', detail: 'Checking...', source: '/api/founder-ops/overview' },
    { id: 3, title: 'ERC4626 Share Math Edge Case', status: 'LOADING', detail: 'Checking...', source: '/api/euler/vault-stats' },
    { id: 4, title: 'Self-Borrow Risk Contamination', status: 'ENFORCED', detail: 'POST /api/founder-ops/log rejects untagged self-borrow entries', source: 'Code enforcement' },
    { id: 5, title: 'Sentinel Authority Boundary', status: 'LOADING', detail: 'Checking...', source: '/api/sentinel/overview' },
    { id: 6, title: 'Property Phase Timing Risk', status: 'ENFORCED', detail: 'POST /api/founder-ops/log blocks Week 44+ property ops without qualifying property or HARD PAUSE', source: 'Code enforcement' },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'allocation' | 'checkpoints' | 'log' | 'outcomes' | 'intelligence' | 'variance' | 'evk-whitelist'>('overview');
  const [lpmPlatforms, setLpmPlatforms] = useState<string[]>([]);
  const [lpmLoading, setLpmLoading] = useState(false);
  const [pendingOutcomes, setPendingOutcomes] = useState<any[]>([]);
  const [outcomesLoading, setOutcomesLoading] = useState(false);
  const [outcomesUnauthorized, setOutcomesUnauthorized] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [operatorProfiles, setOperatorProfiles] = useState<OperatorStrategyProfile[]>([]);
  const [networkSnapshot, setNetworkSnapshot] = useState<NetworkSnapshot | null>(null);
  const [networkSignals, setNetworkSignals] = useState<NetworkSignal[]>([]);
  const [capitalEvents, setCapitalEvents] = useState<CapitalEvent[]>([]);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [intelligenceUnauthorized, setIntelligenceUnauthorized] = useState(false);
  const [snapshotRefreshing, setSnapshotRefreshing] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [matrixEvents, setMatrixEvents] = useState<any[]>([]);
  const [matrixRooms, setMatrixRooms] = useState<any[]>([]);

  const [variances, setVariances] = useState<any[]>([]);
  const [regionFactors, setRegionFactors] = useState<any[]>([]);
  const [varianceLoading, setVarianceLoading] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState<any>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/founder-ops/overview').then(r => r.json()),
      fetch('/api/founder-ops/log').then(r => r.json()),
      fetch('/api/founder-ops/fee-plumbing-preflight').then(r => r.json()).catch(() => null),
      fetch('/api/euler/vault-stats').then(r => r.json()).catch(() => null),
      fetch('/api/sentinel/overview').then(r => r.json()).catch(() => null),
      fetch('/api/founder-ops/pending-outcomes').then(r => r.ok ? r.json() : { outcomes: [], count: 0 }).catch(() => ({ outcomes: [], count: 0 })),
    ])
      .then(([overviewRes, logRes, preflightRes, vaultRes, sentinelRes, pendingRes]) => {
        if (overviewRes.success) setData(overviewRes.data);
        else setError(overviewRes.error || 'Failed to load overview');
        if (logRes.success) setLogs(logRes.entries || []);
        if (pendingRes.outcomes) {
          setPendingOutcomes(pendingRes.outcomes);
        } else if (pendingRes.code === 'REVIEWER_NOT_AUTHORIZED' || pendingRes.code === 'SIWE_AUTH_REQUIRED') {
          setOutcomesUnauthorized(true);
        }

        setGuardRails(prev => {
          const updated = [...prev];

          if (preflightRes?.data?.guardRails) {
            const gr1 = preflightRes.data.guardRails.find((g: any) => g.name?.includes('Fee Recipient') || g.name?.includes('GR1'));
            const gr2 = preflightRes.data.guardRails.find((g: any) => g.name?.includes('Revenue Router') || g.name?.includes('GR2'));
            if (gr1) {
              updated[0] = { ...updated[0], status: gr1.status === 'PASS' ? 'PASS' : 'WARNING', detail: gr1.details?.finding || gr1.status };
            }
            if (gr2) {
              updated[1] = { ...updated[1], status: gr2.status === 'PASS' ? 'PASS' : 'WARNING', detail: gr2.details?.finding || gr2.status };
            }
          } else {
            if (overviewRes.data?.feePlumbing) {
              const fp = overviewRes.data.feePlumbing;
              updated[0] = { ...updated[0], status: fp.eulerFeeRecipientSet ? 'PASS' : 'WARNING', detail: fp.eulerFeeRecipientSet ? 'Fee recipient configured' : 'Fee recipient NOT set' };
              updated[1] = { ...updated[1], status: fp.revenueRouterConnected ? 'PASS' : 'WARNING', detail: fp.revenueRouterConnected ? 'Revenue router connected' : 'Revenue router NOT connected' };
            }
          }

          if (vaultRes?.guardRail3) {
            const gr3 = vaultRes.guardRail3;
            const gr3Status = gr3.status === 'PASS' ? 'PASS' : gr3.status === 'WARNING' ? 'WARNING' : gr3.status === 'NO_DEPOSITS' ? 'PASS' : 'UNKNOWN';
            updated[2] = { ...updated[2], status: gr3Status as GuardRailStatus['status'], detail: gr3.detail || `Share price: ${gr3.sharePrice}` };
          }

          if (sentinelRes?.guardRail5) {
            const gr5 = sentinelRes.guardRail5;
            const gr5Status = gr5.status === 'ENFORCED' ? 'ENFORCED' : gr5.status === 'PASS' ? 'PASS' : 'WARNING';
            updated[4] = { ...updated[4], status: gr5Status as GuardRailStatus['status'], detail: gr5.rule || `Authority mode: ${sentinelRes.authorityMode}` };
          } else if (sentinelRes?.authorityMode === 'ADVISORY') {
            updated[4] = { ...updated[4], status: 'ENFORCED', detail: 'Sentinel is ADVISORY ONLY until post-public governance vote' };
          }

          return updated;
        });
      })
      .catch(() => setError('Failed to connect to server'))
      .finally(() => setLoading(false));
  }, []);

  const loadIntelligence = async () => {
    setIntelligenceLoading(true);
    setIntelligenceUnauthorized(false);
    try {
      const [profilesRes, latestRes, eventsRes, matrixRes] = await Promise.all([
        fetch('/api/operator-strategy/profiles').then(r => r.json()).catch(() => ({ profiles: [] })),
        fetch('/api/network-intelligence/latest').then(r => r.json()).catch(() => ({ snapshot: null, currentSignals: [] })),
        fetch('/api/capital-intelligence/events?limit=50').then(r => r.json()).catch(() => ({ events: [] })),
        fetch('/api/matrix/events?limit=50').then(r => r.json()).catch(() => ({ events: [], rooms: [] })),
      ]);

      if (profilesRes.code === 'SIWE_AUTH_REQUIRED' || latestRes.code === 'SIWE_AUTH_REQUIRED' || eventsRes.code === 'SIWE_AUTH_REQUIRED') {
        setIntelligenceUnauthorized(true);
        return;
      }

      setOperatorProfiles(profilesRes.profiles || []);
      if (latestRes.snapshot) {
        const snap = latestRes.snapshot;
        setNetworkSnapshot({
          ...snap,
          aggregated_signals: typeof snap.aggregated_signals === 'string'
            ? JSON.parse(snap.aggregated_signals)
            : (snap.aggregated_signals || []),
        });
      } else {
        setNetworkSnapshot(null);
      }
      setNetworkSignals(latestRes.currentSignals || []);
      setCapitalEvents(eventsRes.events || []);
      setMatrixEvents(matrixRes.events || []);
      setMatrixRooms(matrixRes.rooms || []);
    } catch {
    } finally {
      setIntelligenceLoading(false);
    }
  };

  const handleRefreshSnapshot = async () => {
    setSnapshotRefreshing(true);
    setSnapshotError(null);
    try {
      const res = await fetch('/api/network-intelligence/generate-snapshot', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setSnapshotError(json.error || 'Snapshot generation failed');
      } else {
        const snap = json.snapshot;
        setNetworkSnapshot({
          ...snap,
          aggregated_signals: typeof snap.aggregated_signals === 'string'
            ? JSON.parse(snap.aggregated_signals)
            : (snap.aggregated_signals || []),
        });
      }
    } catch {
      setSnapshotError('Snapshot generation failed — check connection');
    } finally {
      setSnapshotRefreshing(false);
    }
  };

  const loadPendingOutcomes = async () => {
    setOutcomesLoading(true);
    try {
      const res = await fetch('/api/founder-ops/pending-outcomes');
      if (res.status === 401 || res.status === 403) {
        setOutcomesUnauthorized(true);
        setPendingOutcomes([]);
      } else if (res.ok) {
        const json = await res.json();
        setOutcomesUnauthorized(false);
        setPendingOutcomes(json.outcomes || []);
      }
    } catch {
    } finally {
      setOutcomesLoading(false);
    }
  };

  const handleReview = async (id: string, decision: 'approved' | 'rejected') => {
    setReviewingId(id);
    setReviewError(null);
    try {
      const res = await fetch(`/api/verified-outcomes/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: reviewNotes[id] || '' }),
      });
      const json = await res.json();
      if (!res.ok) {
        setReviewError(json.error || 'Review failed');
      } else {
        await loadPendingOutcomes();
      }
    } catch {
      setReviewError('Review failed — check connection');
    } finally {
      setReviewingId(null);
    }
  };

  const logColumns: Column<LogEntry>[] = [
    {
      key: 'week',
      header: 'Wk',
      render: (e) => <span className="font-dl-mono text-dl-navy">{e.week}</span>,
    },
    {
      key: 'phase',
      header: 'Ph',
      render: (e) => <span className="font-dl-mono text-dl-gray">{e.phase}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (e) => {
        const color = e.category === 'failure' ? 'text-dl-error' : e.category === 'fix' ? 'text-dl-forest' : 'text-dl-navy';
        return <span className={`text-xs uppercase tracking-wider ${color}`}>{e.category}</span>;
      },
    },
    {
      key: 'title',
      header: 'Title',
      render: (e) => <span className="font-medium text-dl-navy">{e.title}</span>,
    },
    {
      key: 'product',
      header: 'Product',
      render: (e) => <span className="text-dl-gray text-xs">{e.product || '—'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right' as const,
      render: (e) => <span className="font-dl-mono">{e.amount ? `$${parseFloat(e.amount).toFixed(2)}` : '—'}</span>,
    },
    {
      key: 'tx_hash',
      header: 'Tx',
      render: (e) => e.tx_hash ? (
        <a href={`https://arbitrum.blockscout.com/tx/${e.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline font-dl-mono text-xs">
          {truncateAddr(e.tx_hash)}
        </a>
      ) : <span className="text-dl-gray">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <StatusBadge status={e.status === 'completed' ? 'ACTIVE' : e.status === 'failure' ? 'EXPIRED' : 'PENDING'} />,
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (e) => <span className="font-dl-mono text-xs text-dl-gray">{formatUTC(e.created_at)}</span>,
    },
  ];

  const loadVariances = async () => {
    setVarianceLoading(true);
    try {
      const [varRes, regRes] = await Promise.all([
        fetch('/api/founder-ops/variances').then(r => r.json()).catch(() => ({ variances: [] })),
        fetch('/api/cost-intelligence/catalog').then(r => r.json()).catch(() => ({ regions: [] })),
      ]);
      setVariances(varRes.variances || []);
      setRegionFactors(regRes.regions || []);
    } finally {
      setVarianceLoading(false);
    }
  };

  const runCalibration = async (dryRun: boolean) => {
    setCalibrating(true);
    setCalibrationResult(null);
    setCalibrationError(null);
    try {
      const res = await fetch('/api/cost-intelligence/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCalibrationError(json.error || 'Calibration failed');
      } else {
        setCalibrationResult(json);
        if (!dryRun) loadVariances();
      }
    } catch (err: any) {
      setCalibrationError(err.message);
    } finally {
      setCalibrating(false);
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'System Overview' },
    { id: 'allocation' as const, label: 'Capital Allocation' },
    { id: 'checkpoints' as const, label: 'Risk Checkpoints' },
    { id: 'log' as const, label: 'Operations Log' },
    { id: 'outcomes' as const, label: `Outcomes${pendingOutcomes.length > 0 ? ` (${pendingOutcomes.length})` : ''}` },
    { id: 'intelligence' as const, label: 'Intelligence' },
    { id: 'variance' as const, label: 'Variance Tracking' },
    { id: 'evk-whitelist' as const, label: 'EVK Whitelist' },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Founder Operations | Axiom Protocol</title>
        <meta name="description" content="Internal founder operations dashboard for Axiom Protocol proof-of-concept validation" />
      </Head>

      <PageShell
        title="Founder Operations Dashboard"
        subtitle="Internal proof-of-concept validation. $100/week operational playbook. All data is live on-chain state."
        disclosure={FOOTER_DISCLOSURE}
      >
        <div className="mb-6">
          <a href="/founder-ops/playbook" className="inline-block font-dl-mono text-sm text-dl-navy border border-dl-border px-4 py-2 hover:underline">
            View Operational Playbook v2.1
          </a>
        </div>
        {loading ? (
          <p className="text-sm text-dl-gray py-12 text-center">Loading operational data...</p>
        ) : error ? (
          <p className="text-sm text-dl-error py-12 text-center">{error}</p>
        ) : (
          <>
            <div className="flex gap-0 border-b border-dl-border mb-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'outcomes') loadPendingOutcomes();
                    if (tab.id === 'intelligence') loadIntelligence();
                    if (tab.id === 'variance') loadVariances();
                    if (tab.id === 'evk-whitelist' && !lpmPlatforms.length) {
                      setLpmLoading(true);
                      fetch('/api/erc3643/whitelist/platforms')
                        .then(r => r.json())
                        .then(d => { if (d.platforms) setLpmPlatforms(d.platforms); })
                        .catch(() => {})
                        .finally(() => setLpmLoading(false));
                    }
                  }}
                  className={`px-4 py-2 text-sm border-b-2 -mb-px transition-none ${
                    activeTab === tab.id
                      ? 'border-dl-navy text-dl-navy font-medium'
                      : 'border-transparent text-dl-gray hover:text-dl-navy'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && data && (
              <>
                <div className="mb-8">
                  <SectionHeading>Sentinel Intelligence</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">MARKET REGIME</p>
                      <p className={`font-dl-heading text-xl ${REGIME_COLORS[data.sentinel.regime] || 'text-dl-navy'}`}>
                        {data.sentinel.regime}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">{data.sentinel.regimeConfidence}% confidence</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">SYSTEM STANCE</p>
                      <p className={`font-dl-heading text-xl ${STANCE_COLORS[data.sentinel.systemStance] || 'text-dl-navy'}`}>
                        {data.sentinel.systemStance}
                      </p>
                      <p className="text-xs text-dl-gray mt-1">Advisory only — no auto-execution</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">SIGNALS</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {data.sentinel.qualifiedSignals} <span className="text-sm text-dl-gray">/ {data.sentinel.totalSignals}</span>
                      </p>
                      <p className="text-xs text-dl-gray mt-1">qualified / total</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">DECISIONS</p>
                      <p className="font-dl-heading text-xl">
                        <span className="text-dl-forest">{data.sentinel.approvedDecisions}</span>
                        {' / '}
                        <span className="text-dl-error">{data.sentinel.deniedDecisions}</span>
                      </p>
                      <p className="text-xs text-dl-gray mt-1">approved / denied</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Treasury + Vault Positions</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">EULER VAULT</p>
                      <p className="font-dl-heading text-xl text-dl-navy">${data.euler.deposited}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">
                        {data.euler.utilization}% util | {data.euler.supplyAPY}% APY
                      </p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">LENDING FUND</p>
                      <p className="font-dl-heading text-xl text-dl-navy">${data.lendingFund.tvl}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">
                        Share: ${data.lendingFund.sharePrice} | Loans: {data.lendingFund.activeLoans}
                      </p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">AXUSD SUPPLY</p>
                      <p className="font-dl-heading text-xl text-dl-navy">{parseFloat(data.axusd.totalSupply).toLocaleString()}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Designed to align with GENIUS Act</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">TREASURY</p>
                      <p className="font-dl-heading text-xl text-dl-navy">{data.treasury.total}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Exposure: {data.treasury.currentExposure}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Market Infrastructure</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">DEX (CAMELOT)</p>
                      <p className="font-dl-heading text-lg text-dl-navy">TVL: ${data.dex.tvl}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">24h Vol: ${data.dex.volume24h}</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">DePIN NODES</p>
                      <p className="font-dl-heading text-lg text-dl-navy">{data.nodes.total} total</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">{data.nodes.active} active</p>
                    </div>
                    <div className="border border-dl-border p-4">
                      <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">EULER FEE CONFIG</p>
                      <p className="font-dl-heading text-lg text-dl-navy">{data.euler.interestFeePercent}%</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">interest fee rate</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Fee Plumbing Status</SectionHeading>
                  <div className="border border-dl-border p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">FEE RECIPIENT</p>
                        <p className={`font-dl-mono text-sm ${data.feePlumbing.eulerFeeRecipientSet ? 'text-dl-forest' : 'text-dl-error'}`}>
                          {data.feePlumbing.eulerFeeRecipientSet ? 'CONFIGURED' : 'NOT SET'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">REVENUE ROUTER</p>
                        <p className={`font-dl-mono text-sm ${data.feePlumbing.revenueRouterConnected ? 'text-dl-forest' : 'text-dl-error'}`}>
                          {data.feePlumbing.revenueRouterConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">OVERALL STATUS</p>
                        <p className={`font-dl-mono text-sm ${data.feePlumbing.status === 'OPERATIONAL' ? 'text-dl-forest' : 'text-dl-error'}`}>
                          {data.feePlumbing.status}
                        </p>
                      </div>
                    </div>
                    {data.feePlumbing.status !== 'OPERATIONAL' && (
                      <div className="mt-4 border-t border-dl-border pt-3">
                        <p className="text-xs text-dl-error">
                          ACTION REQUIRED: Fee plumbing is not fully wired. Before calling setFeeReceiver(), verify that vault fees are non-zero
                          and borrow interest exists. If fees are zero, you will falsely validate the plumbing. Check vault fee params and
                          historical interest accrual first.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Mandatory Guard Rails</SectionHeading>
                  <div className="space-y-3">
                    {guardRails.map((gr) => {
                      const statusColor =
                        gr.status === 'PASS' ? 'text-dl-forest' :
                        gr.status === 'ENFORCED' ? 'text-dl-forest' :
                        gr.status === 'WARNING' ? 'text-dl-gold' :
                        gr.status === 'LOADING' ? 'text-dl-gray' :
                        'text-dl-error';
                      const statusBg =
                        gr.status === 'PASS' || gr.status === 'ENFORCED' ? 'border-l-2 border-l-[#2D5F2D]' :
                        gr.status === 'WARNING' ? 'border-l-2 border-l-[#8B7355]' :
                        gr.status === 'LOADING' ? 'border-l-2 border-l-gray-300' :
                        'border-l-2 border-l-[#8B2500]';
                      return (
                        <div key={gr.id} className={`border border-dl-border p-3 ${statusBg}`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs uppercase tracking-wider text-dl-navy">GR #{gr.id} — {gr.title}</p>
                            <span className={`text-xs font-dl-mono font-bold ${statusColor}`}>{gr.status}</span>
                          </div>
                          <p className="text-xs text-dl-gray">{gr.detail}</p>
                          <p className="text-[10px] font-dl-mono text-dl-gray mt-1">Source: {gr.source}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'allocation' && (
              <>
                <SectionHeading>Weekly $100 Capital Allocation</SectionHeading>
                <div className="border border-dl-border mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dl-border">
                        <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Bucket</th>
                        <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Amount</th>
                        <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ALLOCATION_TABLE.map((row, i) => (
                        <tr key={i} className="border-b border-dl-border last:border-0">
                          <td className="p-3 font-medium text-dl-navy">{row.bucket}</td>
                          <td className="p-3 text-right font-dl-mono text-dl-navy">{row.amount}</td>
                          <td className="p-3 text-dl-gray">{row.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <SectionHeading>Sentinel Regime Adjustments</SectionHeading>
                <div className="border border-dl-border mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dl-border">
                        <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Regime</th>
                        <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">AXM</th>
                        <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Buffer</th>
                        <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-dl-border">
                        <td className="p-3 text-dl-forest font-medium">RISK_ON</td>
                        <td className="p-3 text-right font-dl-mono">$35</td>
                        <td className="p-3 text-right font-dl-mono">$10</td>
                        <td className="p-3 text-dl-gray">Increase AXM accumulation during favorable regime</td>
                      </tr>
                      <tr className="border-b border-dl-border">
                        <td className="p-3 text-dl-navy font-medium">NEUTRAL / DEFENSIVE</td>
                        <td className="p-3 text-right font-dl-mono">$25</td>
                        <td className="p-3 text-right font-dl-mono">$20</td>
                        <td className="p-3 text-dl-gray">Standard allocation</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-dl-error font-medium">HALTED</td>
                        <td className="p-3 text-right font-dl-mono">$15</td>
                        <td className="p-3 text-right font-dl-mono">$30</td>
                        <td className="p-3 text-dl-gray">Reduce exposure, increase cash buffer</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {data && (
                  <div className="border border-dl-border p-4">
                    <p className="text-xs uppercase tracking-wider text-dl-gray mb-2">CURRENT RECOMMENDED ALLOCATION</p>
                    <p className={`font-dl-heading text-lg ${STANCE_COLORS[data.sentinel.systemStance] || 'text-dl-navy'}`}>
                      Sentinel Stance: {data.sentinel.systemStance}
                    </p>
                    <p className="text-sm text-dl-gray mt-1">
                      {data.sentinel.systemStance === 'HALTED'
                        ? 'Reduce AXM to $15/week. Increase USDC buffer to $30/week. Capital preservation mode.'
                        : data.sentinel.systemStance === 'RISK_ON'
                        ? 'Increase AXM to $35/week. Reduce buffer to $10/week. Accumulation mode.'
                        : 'Standard allocation: $25 AXM, $20 buffer. Steady execution.'}
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'checkpoints' && (
              <>
                <SectionHeading>Risk Checkpoints</SectionHeading>
                <p className="text-sm text-dl-gray mb-6">
                  If any checkpoint fails, do not proceed to next phase. Fix, re-test, document the fix.
                </p>
                <div className="border border-dl-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dl-border">
                        <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray w-20">Week</th>
                        <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Gate Requirement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CHECKPOINTS.map((cp, i) => (
                        <tr key={i} className={`border-b border-dl-border last:border-0 ${cp.week === 44 ? 'bg-red-50' : ''}`}>
                          <td className={`p-3 font-dl-mono font-medium ${cp.week === 44 ? 'text-dl-error' : 'text-dl-navy'}`}>
                            Wk {cp.week}
                          </td>
                          <td className={`p-3 ${cp.week === 44 ? 'text-dl-error' : 'text-dl-gray'}`}>
                            {cp.gate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8">
                  <SectionHeading>52-Week Financial Projection</SectionHeading>
                  <div className="border border-dl-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-dl-border">
                          <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Week</th>
                          <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Invested</th>
                          <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Revenue (est)</th>
                          <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Total Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { week: 8, invested: '$800', revenue: '$10', total: '$810' },
                          { week: 16, invested: '$1,600', revenue: '$40', total: '$1,640' },
                          { week: 24, invested: '$2,400', revenue: '$100', total: '$2,500' },
                          { week: 32, invested: '$3,200', revenue: '$200', total: '$3,400' },
                          { week: 40, invested: '$4,000', revenue: '$350', total: '$4,350' },
                          { week: 48, invested: '$4,800', revenue: '$550', total: '$5,350' },
                          { week: 52, invested: '$5,200', revenue: '$700', total: '$5,900' },
                        ].map((row, i) => (
                          <tr key={i} className="border-b border-dl-border last:border-0">
                            <td className="p-3 font-dl-mono text-dl-navy">{row.week}</td>
                            <td className="p-3 text-right font-dl-mono text-dl-navy">{row.invested}</td>
                            <td className="p-3 text-right font-dl-mono text-dl-forest">{row.revenue}</td>
                            <td className="p-3 text-right font-dl-mono font-medium text-dl-navy">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'log' && (
              <>
                <SectionHeading>Operations Log</SectionHeading>
                <p className="text-sm text-dl-gray mb-4">
                  Every action, failure, and fix documented with on-chain evidence. Failures increase credibility when documented.
                </p>
                <DataTable
                  columns={logColumns}
                  data={logs}
                  keyExtractor={(e) => e.id}
                  emptyMessage="No operations logged yet. Log your first action via POST /api/founder-ops/log"
                />
              </>
            )}

            {activeTab === 'intelligence' && (
              <>
                {intelligenceUnauthorized && (
                  <div className="border border-dl-border p-8 text-center mb-8">
                    <p className="font-dl-mono text-sm text-dl-muted">Intelligence data requires wallet authentication.</p>
                    <p className="font-dl-mono text-xs text-dl-muted mt-1">Connect your wallet and sign in to access operator strategy, network intelligence, and capital event data.</p>
                  </div>
                )}
                <div className="mb-10">
                  <SectionHeading>Operator Strategy Profiles</SectionHeading>
                  <p className="text-sm text-dl-gray mb-4">
                    Aggregated execution signals per operator and strategy type. Populated as verified outcomes are approved and signals are recorded.
                  </p>
                  {intelligenceLoading ? (
                    <p className="font-dl-mono text-sm text-dl-gray py-8 text-center">Loading intelligence data...</p>
                  ) : intelligenceUnauthorized ? null : operatorProfiles.length === 0 ? (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">No operator strategy signals recorded yet.</p>
                      <p className="font-dl-mono text-xs text-dl-muted mt-1">
                        Profiles populate after verified outcomes are approved and operator signals are written to the DB.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-dl-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dl-border">
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Operator</th>
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Strategy</th>
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Market</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Deals</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Success Rate</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Avg ROI Var.</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Cost Err %</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Timeline Err %</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Capex/Unit</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Stab. Days</th>
                          </tr>
                        </thead>
                        <tbody>
                          {operatorProfiles.map((p, i) => (
                            <tr key={`${p.operator_wallet}-${p.strategy_type}-${i}`} className="border-b border-dl-border last:border-0">
                              <td className="p-3 font-dl-mono text-xs text-dl-navy">{truncateAddr(p.operator_wallet)}</td>
                              <td className="p-3 text-xs text-dl-navy capitalize">{p.strategy_type.replace(/_/g, ' ')}</td>
                              <td className="p-3 text-xs text-dl-gray">{p.market || '—'}</td>
                              <td className="p-3 text-right font-dl-mono text-xs">{p.deal_count}</td>
                              <td className="p-3 text-right font-dl-mono text-xs">
                                {p.success_rate_pct != null
                                  ? <span className={Number(p.success_rate_pct) >= 70 ? 'text-dl-forest' : Number(p.success_rate_pct) >= 50 ? 'text-dl-gold' : 'text-dl-error'}>
                                      {Number(p.success_rate_pct).toFixed(1)}%
                                    </span>
                                  : '—'}
                              </td>
                              <td className="p-3 text-right font-dl-mono text-xs">
                                {p.avg_roi_variance_pct != null
                                  ? <span className={Number(p.avg_roi_variance_pct) >= 0 ? 'text-dl-forest' : 'text-dl-error'}>
                                      {Number(p.avg_roi_variance_pct) > 0 ? '+' : ''}{Number(p.avg_roi_variance_pct).toFixed(2)}%
                                    </span>
                                  : '—'}
                              </td>
                              <td className="p-3 text-right font-dl-mono text-xs">
                                {p.avg_cost_error_pct != null ? `${Number(p.avg_cost_error_pct).toFixed(1)}%` : '—'}
                              </td>
                              <td className="p-3 text-right font-dl-mono text-xs">
                                {p.avg_timeline_error_pct != null ? `${Number(p.avg_timeline_error_pct).toFixed(1)}%` : '—'}
                              </td>
                              <td className="p-3 text-right font-dl-mono text-xs">
                                {p.avg_capex_per_unit ? `$${Number(p.avg_capex_per_unit).toLocaleString()}` : '—'}
                              </td>
                              <td className="p-3 text-right font-dl-mono text-xs">
                                {p.avg_stabilization_days ? Number(p.avg_stabilization_days).toFixed(0) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mb-10">
                  <div className="flex items-center justify-between mb-2">
                    <SectionHeading>Network Intelligence</SectionHeading>
                    <button
                      onClick={handleRefreshSnapshot}
                      disabled={snapshotRefreshing}
                      className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-3 py-1.5 hover:bg-dl-navy hover:text-white disabled:opacity-50"
                    >
                      {snapshotRefreshing ? 'Generating...' : 'Refresh Snapshot'}
                    </button>
                  </div>
                  {snapshotError && (
                    <div className="border border-dl-error p-2 mb-3">
                      <p className="font-dl-mono text-xs text-dl-error">{snapshotError}</p>
                    </div>
                  )}
                  {networkSnapshot && (
                    <div className="border border-dl-border p-3 mb-4 flex gap-6 text-xs font-dl-mono">
                      <span className="text-dl-muted">Snapshot: <span className="text-dl-navy">{networkSnapshot.snapshot_date}</span></span>
                      <span className="text-dl-muted">Scope: <span className="text-dl-navy capitalize">{networkSnapshot.scope}</span></span>
                      <span className="text-dl-muted">Confidence: <span className="text-dl-navy">{(Number(networkSnapshot.confidence_score) * 100).toFixed(1)}%</span></span>
                      <span className="text-dl-muted">ID: <span className="text-dl-navy">{networkSnapshot.id.slice(0, 8)}…</span></span>
                    </div>
                  )}
                  <p className="text-sm text-dl-gray mb-4">
                    Market cost benchmarks by strategy type. Computed from verified local signals via the market cost signals table.
                  </p>
                  {!intelligenceLoading && networkSignals.length === 0 ? (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">No market cost signals recorded yet.</p>
                      <p className="font-dl-mono text-xs text-dl-muted mt-1">
                        Signals populate as verified deal outcomes feed into the market cost signals table.
                        Click "Refresh Snapshot" to generate a snapshot from any available data.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-dl-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dl-border">
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Strategy Type</th>
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Market</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Avg Capex/Unit</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Confidence</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Sample Size</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Signal Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {networkSignals.map((s, i) => (
                            <tr key={`${s.strategy_type}-${s.market}-${i}`} className="border-b border-dl-border last:border-0">
                              <td className="p-3 text-xs text-dl-navy capitalize">{s.strategy_type ? s.strategy_type.replace(/_/g, ' ') : '—'}</td>
                              <td className="p-3 text-xs text-dl-gray">{s.market || '—'}</td>
                              <td className="p-3 text-right font-dl-mono text-xs">
                                {s.avg_capex_per_unit ? `$${Number(s.avg_capex_per_unit).toLocaleString()}` : '—'}
                              </td>
                              <td className="p-3 text-right font-dl-mono text-xs">
                                {(Number(s.avg_confidence) * 100).toFixed(1)}%
                              </td>
                              <td className="p-3 text-right font-dl-mono text-xs">{s.total_sample_size}</td>
                              <td className="p-3 text-right font-dl-mono text-xs">{s.signal_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <SectionHeading>Matrix Coordination Layer</SectionHeading>
                  <p className="text-sm text-dl-gray mb-4">
                    Structured coordination events across all six intelligence layers. Each room is tied to a real entity (deal, inspection, outcome, offering). Events are written automatically at every workflow step.
                  </p>

                  {matrixRooms.length > 0 && (
                    <div className="mb-4">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-2">Active Coordination Rooms</p>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                        {(['deal', 'inspection', 'project_outcome', 'offering'] as const).map((et) => {
                          const count = matrixRooms.filter(r => r.entityType === et).length;
                          return (
                            <div key={et} className="border border-dl-border p-3">
                              <p className="font-dl-mono text-xs text-dl-muted uppercase">{et.replace(/_/g, ' ')}</p>
                              <p className="font-dl-mono text-2xl text-dl-navy mt-1">{count}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {matrixEvents.length === 0 ? (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">No coordination events recorded yet.</p>
                      <p className="font-dl-mono text-xs text-dl-muted mt-1">
                        Events are written automatically when deals are created, inspections start, outcomes are submitted, and capital moves.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-dl-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dl-border">
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Event Type</th>
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Layer</th>
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Entity</th>
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Room</th>
                            <th className="text-center p-3 text-xs uppercase tracking-wider text-dl-gray">Anchored</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matrixEvents.map((e) => {
                            const eventColor =
                              e.eventType?.includes('created') ? 'text-dl-forest' :
                              e.eventType?.includes('verified') || e.eventType?.includes('funded') ? 'text-dl-navy' :
                              e.eventType?.includes('rejected') ? 'text-dl-error' :
                              e.eventType?.includes('submitted') ? 'text-dl-gold' :
                              'text-dl-gray';
                            const layerLabel =
                              e.entityType === 'deal' ? 'L1 — Deal' :
                              e.entityType === 'inspection' ? 'L5 — Field' :
                              e.entityType === 'project_outcome' ? 'L2 — Execution' :
                              e.entityType === 'offering' ? 'L4 — Capital' :
                              e.entityType;
                            const hash = e.payload?._hash as string | undefined;
                            return (
                              <tr key={e.id} className="border-b border-dl-border last:border-0">
                                <td className="p-3">
                                  <span className={`font-dl-mono text-xs ${eventColor}`}>
                                    {e.eventType?.replace('axiom.', '').replace(/\./g, ' ') || '—'}
                                  </span>
                                </td>
                                <td className="p-3 font-dl-mono text-xs text-dl-muted">{layerLabel}</td>
                                <td className="p-3 font-dl-mono text-xs text-dl-gray">
                                  {e.entityId ? e.entityId.slice(0, 8) + '…' : '—'}
                                </td>
                                <td className="p-3 font-dl-mono text-xs text-dl-muted">
                                  {e.matrixRoomId
                                    ? e.matrixRoomId.startsWith('axiom-unconfigured:')
                                      ? <span className="text-dl-muted">Synthetic</span>
                                      : <span className="text-dl-forest">Live</span>
                                    : '—'}
                                </td>
                                <td className="p-3 text-center font-dl-mono text-xs">
                                  {hash ? (
                                    <span className="text-dl-gold" title={hash}>SHA-256</span>
                                  ) : (
                                    <span className="text-dl-muted">—</span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-dl-mono text-xs text-dl-gray">
                                  {formatUTC(e.createdAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <SectionHeading>Capital Intelligence Events</SectionHeading>
                  <p className="text-sm text-dl-gray mb-4">
                    Automated capital behavior log. Events are written when subscriptions are submitted, capital calls are paid, and offerings are closed.
                  </p>
                  {!intelligenceLoading && capitalEvents.length === 0 ? (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">No capital intelligence events recorded yet.</p>
                      <p className="font-dl-mono text-xs text-dl-muted mt-1">
                        Events are automatically written when syndication actions occur (commitment submitted, capital call paid, offering closed).
                      </p>
                    </div>
                  ) : (
                    <div className="border border-dl-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dl-border">
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Event</th>
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Deal / Offering</th>
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Source</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Raise Velocity</th>
                            <th className="text-center p-3 text-xs uppercase tracking-wider text-dl-gray">Min Met</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Demand Score</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {capitalEvents.map((e) => (
                            <tr key={e.id} className="border-b border-dl-border last:border-0">
                              <td className="p-3">
                                <span className={`font-dl-mono text-xs uppercase ${
                                  e.event_type === 'offering_closed' ? 'text-dl-forest' :
                                  e.event_type === 'capital_call_paid' ? 'text-dl-navy' :
                                  'text-dl-gray'
                                }`}>
                                  {e.event_type.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="p-3 text-xs text-dl-navy">
                                {e.offering_name || e.deal_address || (e.offering_id ? e.offering_id.slice(0, 8) + '…' : '—')}
                              </td>
                              <td className="p-3 text-xs text-dl-gray capitalize">
                                {e.capital_source_type || '—'}
                              </td>
                              <td className="p-3 text-right font-dl-mono text-xs">
                                {e.raise_velocity ? `$${Number(e.raise_velocity).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                              </td>
                              <td className="p-3 text-center font-dl-mono text-xs">
                                {e.minimum_capital_met === null ? '—' :
                                  <span className={e.minimum_capital_met ? 'text-dl-forest' : 'text-dl-error'}>
                                    {e.minimum_capital_met ? 'YES' : 'NO'}
                                  </span>
                                }
                              </td>
                              <td className="p-3 text-right font-dl-mono text-xs">
                                {e.investor_demand_score ? `${(Number(e.investor_demand_score) * 100).toFixed(1)}%` : '—'}
                              </td>
                              <td className="p-3 text-right font-dl-mono text-xs text-dl-gray">
                                {formatUTC(e.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'variance' && (
              <>
                <SectionHeading>Variance Tracking</SectionHeading>
                <p className="text-sm text-dl-gray mb-6">
                  Predicted vs actual metrics from approved project outcomes. Drives Bayesian calibration of regional cost multipliers in the Cost Intelligence Engine.
                </p>

                <div className="flex gap-3 mb-6">
                  <button
                    onClick={() => runCalibration(true)}
                    disabled={calibrating}
                    className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm disabled:opacity-50"
                  >
                    {calibrating ? 'Running...' : 'Preview Calibration (Dry Run)'}
                  </button>
                  <button
                    onClick={() => runCalibration(false)}
                    disabled={calibrating}
                    className="bg-dl-navy text-white px-4 py-2 font-dl-mono text-sm disabled:opacity-50"
                  >
                    {calibrating ? 'Applying...' : 'Apply Calibration'}
                  </button>
                </div>

                {calibrationError && (
                  <div className="border border-dl-error p-3 mb-4 font-dl-mono text-xs text-dl-error">{calibrationError}</div>
                )}

                {calibrationResult && (
                  <div className="border border-dl-border p-4 mb-6">
                    <p className="font-dl-mono text-xs text-dl-muted uppercase tracking-wider mb-3">
                      {calibrationResult.dryRun ? 'Dry Run Result' : 'Calibration Applied'} — {calibrationResult.signalsProcessed} signals processed, {calibrationResult.regionsUpdated} regions updated
                    </p>
                    {calibrationResult.updates && calibrationResult.updates.length > 0 ? (
                      <table className="w-full font-dl-mono text-xs">
                        <thead>
                          <tr className="border-b border-dl-border">
                            <th className="text-left p-2 text-dl-muted uppercase">Region</th>
                            <th className="text-right p-2 text-dl-muted uppercase">Prior Factor</th>
                            <th className="text-right p-2 text-dl-muted uppercase">New Factor</th>
                            <th className="text-right p-2 text-dl-muted uppercase">Avg Var %</th>
                            <th className="text-right p-2 text-dl-muted uppercase">Sample</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calibrationResult.updates.map((u: any) => (
                            <tr key={u.regionCode} className="border-b border-dl-border last:border-0">
                              <td className="p-2 text-dl-navy">{u.regionName} ({u.regionCode})</td>
                              <td className="p-2 text-right text-dl-muted">{u.previousFactor.toFixed(4)}x</td>
                              <td className={`p-2 text-right font-bold ${u.newFactor > u.previousFactor ? 'text-dl-error' : 'text-dl-forest'}`}>
                                {u.newFactor.toFixed(4)}x
                              </td>
                              <td className={`p-2 text-right ${u.avgVariancePct > 0 ? 'text-dl-error' : 'text-dl-forest'}`}>
                                {u.avgVariancePct > 0 ? '+' : ''}{u.avgVariancePct}%
                              </td>
                              <td className="p-2 text-right text-dl-muted">{u.sampleSize}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-dl-muted">No regions with sufficient signal ({'>'}= 3 approved outcomes) to calibrate yet.</p>
                    )}
                  </div>
                )}

                {varianceLoading ? (
                  <p className="font-dl-mono text-sm text-dl-gray text-center py-8">Loading variance data...</p>
                ) : variances.length === 0 ? (
                  <div className="border border-dl-border p-6 text-center mb-8">
                    <p className="font-dl-mono text-sm text-dl-muted">No variance records yet.</p>
                    <p className="font-dl-mono text-xs text-dl-muted mt-1">
                      Variance records are created when project outcomes are submitted with Cost Intelligence estimates on record for the same deal.
                    </p>
                  </div>
                ) : (
                  <div className="border border-dl-border overflow-x-auto mb-8">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-dl-border">
                          <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Deal</th>
                          <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Metric</th>
                          <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Predicted</th>
                          <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Actual</th>
                          <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Var %</th>
                          <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variances.map((v: any) => (
                          <tr key={v.id} className="border-b border-dl-border last:border-0">
                            <td className="p-3 font-dl-mono text-xs text-dl-navy truncate max-w-[180px]">
                              {v.deal_name || v.deal_id?.slice(0, 8) + '…'}
                            </td>
                            <td className="p-3 font-dl-mono text-xs text-dl-gray capitalize">
                              {v.metric_key.replace(/_/g, ' ')}
                            </td>
                            <td className="p-3 text-right font-dl-mono text-xs text-dl-muted">
                              {Number(v.predicted_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-dl-mono text-xs text-dl-navy">
                              {Number(v.actual_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className={`p-3 text-right font-dl-mono text-xs font-bold ${Number(v.variance_pct) > 15 ? 'text-dl-error' : Number(v.variance_pct) < -15 ? 'text-dl-forest' : 'text-dl-navy'}`}>
                              {Number(v.variance_pct) > 0 ? '+' : ''}{Number(v.variance_pct).toFixed(2)}%
                            </td>
                            <td className="p-3 font-dl-mono text-xs text-dl-gray">
                              {new Date(v.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {regionFactors.length > 0 && (
                  <div className="mb-8">
                    <SectionHeading>Current Regional Cost Factors</SectionHeading>
                    <p className="text-sm text-dl-gray mb-4">
                      Live multipliers applied to Craftsman NCE benchmarks by market. Calibration adjusts these based on verified outcome variance.
                    </p>
                    <div className="border border-dl-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dl-border">
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Region</th>
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Code</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Overall Factor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {regionFactors.map((r: any) => (
                            <tr key={r.region_code} className="border-b border-dl-border last:border-0">
                              <td className="p-3 font-dl-mono text-xs text-dl-navy">{r.region_name}</td>
                              <td className="p-3 font-dl-mono text-xs text-dl-gray">{r.region_code}</td>
                              <td className={`p-3 text-right font-dl-mono text-xs font-bold ${Number(r.overall_factor) > 1.1 ? 'text-dl-error' : Number(r.overall_factor) < 0.95 ? 'text-dl-forest' : 'text-dl-navy'}`}>
                                {Number(r.overall_factor).toFixed(4)}x
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'outcomes' && (
              <>
                <SectionHeading>Outcome Verification Queue</SectionHeading>
                <p className="text-sm text-dl-gray mb-6">
                  Deal outcomes submitted for verification review. Approve to confirm the record and mark rewards eligible. Reject to return for correction.
                </p>
                {reviewError && (
                  <div className="border border-dl-error p-3 mb-4">
                    <p className="font-dl-mono text-xs text-dl-error">{reviewError}</p>
                  </div>
                )}
                {outcomesLoading ? (
                  <p className="font-dl-mono text-sm text-dl-gray text-center py-8">Loading pending outcomes...</p>
                ) : outcomesUnauthorized ? (
                  <div className="border border-dl-border p-8 text-center">
                    <p className="font-dl-mono text-sm text-dl-muted">Review queue restricted.</p>
                    <p className="font-dl-mono text-xs text-dl-muted mt-1">
                      This wallet is not on the authorized reviewer list. Connect as a reviewer wallet or contact the protocol operator.
                    </p>
                  </div>
                ) : pendingOutcomes.length === 0 ? (
                  <div className="border border-dl-border p-8 text-center">
                    <p className="font-dl-mono text-sm text-dl-muted">No outcomes pending review.</p>
                    <p className="font-dl-mono text-xs text-dl-muted mt-1">
                      Outcomes appear here after operators submit and request verification from the deal workspace.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingOutcomes.map((outcome: any) => (
                      <div key={outcome.id} className="border border-dl-border p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="font-dl-serif text-base text-dl-navy">{outcome.deal_name || 'Deal'}</p>
                            {outcome.property_address && (
                              <p className="font-dl-mono text-xs text-dl-forest mt-0.5">{outcome.property_address}</p>
                            )}
                            <p className="font-dl-mono text-xs text-dl-muted mt-0.5">
                              ID: {outcome.id.slice(0, 8)}… · Submitted: {new Date(outcome.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          <span className="font-dl-mono text-xs text-dl-navy border border-dl-navy px-2 py-0.5">UNDER REVIEW</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div>
                            <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-0.5">Rehab Cost</p>
                            <p className="font-dl-mono text-sm text-dl-navy">
                              ${Number(outcome.actual_rehab_cost).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-0.5">Timeline</p>
                            <p className="font-dl-mono text-sm text-dl-navy">{outcome.actual_timeline_days} days</p>
                          </div>
                          {outcome.actual_sale_price && (
                            <div>
                              <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-0.5">Sale Price</p>
                              <p className="font-dl-mono text-sm text-dl-navy">
                                ${Number(outcome.actual_sale_price).toLocaleString()}
                              </p>
                            </div>
                          )}
                          {outcome.actual_monthly_cash_flow && (
                            <div>
                              <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-0.5">Cash Flow/mo</p>
                              <p className="font-dl-mono text-sm text-dl-navy">
                                ${Number(outcome.actual_monthly_cash_flow).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {outcome.variances && outcome.variances.length > 0 && (
                          <div className="border border-dl-border mb-4 overflow-x-auto">
                            <table className="w-full font-dl-mono text-xs">
                              <thead>
                                <tr className="border-b border-dl-border">
                                  <th className="text-left p-2 text-dl-muted uppercase">Metric</th>
                                  <th className="text-right p-2 text-dl-muted uppercase">Predicted</th>
                                  <th className="text-right p-2 text-dl-muted uppercase">Actual</th>
                                  <th className="text-right p-2 text-dl-muted uppercase">Var %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {outcome.variances.slice(0, 4).map((v: any) => (
                                  <tr key={v.metric_key} className="border-b border-dl-border last:border-0">
                                    <td className="p-2 text-dl-navy capitalize">{v.metric_key.replace(/_/g, ' ')}</td>
                                    <td className="p-2 text-right text-dl-muted">{Number(v.predicted_value).toFixed(2)}</td>
                                    <td className="p-2 text-right text-dl-navy">{Number(v.actual_value).toFixed(2)}</td>
                                    <td className={`p-2 text-right font-bold ${Number(v.variance_pct) > 10 ? 'text-dl-error' : Number(v.variance_pct) < -10 ? 'text-dl-forest' : 'text-dl-navy'}`}>
                                      {Number(v.variance_pct) > 0 ? '+' : ''}{Number(v.variance_pct).toFixed(2)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="mb-3">
                          <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Review Notes</label>
                          <input
                            type="text"
                            value={reviewNotes[outcome.id] || ''}
                            onChange={e => setReviewNotes(prev => ({ ...prev, [outcome.id]: e.target.value }))}
                            placeholder="Optional notes for the record..."
                            className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm text-dl-text bg-white focus:outline-none"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReview(outcome.id, 'approved')}
                            disabled={reviewingId === outcome.id}
                            className="bg-dl-forest text-white px-5 py-2 font-dl-mono text-sm disabled:opacity-50"
                          >
                            {reviewingId === outcome.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReview(outcome.id, 'rejected')}
                            disabled={reviewingId === outcome.id}
                            className="border border-dl-error text-dl-error px-5 py-2 font-dl-mono text-sm disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'evk-whitelist' && (
              <EvkWhitelistTab
                lpmPlatforms={lpmPlatforms}
                lpmLoading={lpmLoading}
                onRefresh={() => {
                  setLpmLoading(true);
                  fetch('/api/erc3643/whitelist/platforms')
                    .then(r => r.json())
                    .then(d => { if (d.platforms) setLpmPlatforms(d.platforms); })
                    .catch(() => {})
                    .finally(() => setLpmLoading(false));
                }}
              />
            )}
          </>
        )}
      </PageShell>
    </DesignLawLayout>
  );
}
