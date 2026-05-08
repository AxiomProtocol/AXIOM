import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import {
  DesignLawLayout,
  PageShell,
  SectionHeading,
  DataTable,
} from '../../components/design-law';
import type { Column } from '../../components/design-law';

function formatUTC(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
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

interface SentinelData {
  regime: string;
  regimeConfidence: number;
  systemStance: string;
  totalSignals: number;
  qualifiedSignals: number;
  approvedDecisions: number;
  deniedDecisions: number;
}

interface OverviewData {
  timestamp: string;
  sentinel: SentinelData;
  euler: {
    deposited: string;
    utilization: string;
    supplyAPY: string;
    feeRoutingStatus: string;
    interestFeePercent: string;
  };
  axusd: { totalSupply: string };
  lendingFund: { tvl: string; sharePrice: string; activeLoans: number };
  dex: { tvl: string; volume24h: string };
  treasury: { total: string; currentExposure: string };
  nodes: { total: number; active: number };
  feePlumbing: { eulerFeeRecipientSet: boolean; revenueRouterConnected: boolean; status: string };
}

interface EarnStats {
  deployed: boolean;
  status: string;
  tvlUsd: number;
  blendedApyPct: string;
  ameRegime: string | null;
  ameConfidence: number | null;
}

interface PoolData {
  id: string;
  address: string;
  reserve0Label: string;
  reserve1Label: string;
  reserve0: number;
  reserve1: number;
  tvlUsd: number;
  status: string;
  feeBps: number;
}

interface GuardRailStatus {
  id: number;
  title: string;
  status: 'PASS' | 'ENFORCED' | 'WARNING' | 'UNKNOWN' | 'LOADING';
  detail: string;
  source: string;
}

type TabId =
  | 'framework'
  | 'onchain'
  | 'realassets'
  | 'community'
  | 'log'
  | 'system'
  | 'governance'
  | 'compliance'
  | 'banking'
  | 'axauQueue'
  | 'axiomRail'
  | 'daoAccounts'
  | 'reserves';

const FRAMEWORK_PRINCIPLE = `This is not a personal budget. This is a disciplined capital deployment system designed to build a machine-verifiable operating record across Axiom's live rails. The objective is not to maximize short-term return. The objective is to systematically produce proof that Axiom's infrastructure is active, capitalized, measurable, and compounding across on-chain liquidity, real asset intelligence, and community coordination.`;

const MONTH_PROGRESSION = [
  {
    month: 1,
    label: 'Month 1',
    notes: 'Initial liquidity visible. First vault deposits recorded. First reports generated. First community cycle seeded.',
  },
  {
    month: 3,
    label: 'Month 3',
    notes: 'Meaningful pool depth established. Vault history begins to form. Multiple properties underwritten. Recurring execution pattern becomes visible.',
  },
  {
    month: 6,
    label: 'Month 6',
    notes: 'Consistent capital behavior is documented. On-chain and off-chain activity reinforce each other. Axiom no longer appears conceptual. Allocator-readable track record begins.',
  },
  {
    month: 12,
    label: 'Month 12',
    notes: 'Longitudinal proof-of-execution record across all rails. The protocol has visible operational history across digital, physical, and community layers. Credibility supported by evidence, not presentation.',
  },
];

const OUTCOME_ROWS = [
  { layer: 'On-Chain Pool Depth', m6: '~$1,000 USDC', m12: '~$1,900 USDC' },
  { layer: 'earnAXUSD Vault', m6: '~300 AXUSD + yield', m12: '~600 AXUSD + yield' },
  { layer: 'AXM Held', m6: '~$150 worth', m12: '~$300 worth' },
  { layer: 'Properties Analyzed', m6: '12–18 reports', m12: '24–36 reports' },
  { layer: 'Land Pipeline Capital', m6: '~$600 deployed', m12: '~$1,200 deployed' },
  { layer: 'Wealth Practice Cycles', m6: '2–3 groups active', m12: '4–6 groups active' },
];

const LAYERS = [
  {
    id: 'onchain',
    label: '1. On-Chain Liquidity Layer',
    monthly: '$225 / month',
    buckets: [
      { label: 'EulerSwap Pool Depth', amount: '$150', proof: 'Live TVL growth. Visible pool support. Timestamped liquidity deployment. Public execution record.', route: '/dex', routeLabel: 'Open Exchange' },
      { label: 'earnAXUSD Vault', amount: '$50', proof: 'Vault asset growth over time. Live yield accrual. Recurring capital deployment into protocol-native products.', route: '/axusd-3643', routeLabel: 'Open Unified AXUSD' },
      { label: 'AXM Accumulation', amount: '$25', proof: 'Documented holding history. Governance alignment. Recurring protocol commitment.', route: '/dex', routeLabel: 'Open Exchange' },
    ],
  },
  {
    id: 'realassets',
    label: '2. Real Asset Intelligence Layer',
    monthly: '$175 / month',
    buckets: [
      { label: 'Land Acquisition Pipeline', amount: '$100', proof: 'Documented deal advancement. Capital attached to real asset pipeline activity. Timestamped movement from digital treasury to physical opportunity.', route: '/land', routeLabel: 'Open Land Console' },
      { label: 'Property Analysis Reports', amount: '$50', proof: 'Recurring underwriting activity. Live report generation. Real property evaluation history. Growing intelligence dataset.', route: '/property', routeLabel: 'Open Property Analysis' },
      { label: 'Deal Origination Inputs', amount: '$25', proof: 'Continuous pipeline formation. Evidence of acquisition activity. Real market signal capture.', route: '/distressed-feed', routeLabel: 'Open Deal Flow' },
    ],
  },
  {
    id: 'community',
    label: '3. Community Coordination Layer',
    monthly: '$100 / month',
    buckets: [
      { label: 'Wealth Practice', amount: '$75', proof: 'Live contribution cycles. Recurring community participation. Timestamped group mechanics. Real user coordination history.', route: '/wealth-practice', routeLabel: 'Open Wealth Practice' },
      { label: 'Infrastructure Continuity', amount: '$25', proof: 'Continuity of core infrastructure. Evidence that the system remains operational. Support for persistent network activity.', route: '/depin/denet', routeLabel: 'Open DePIN Console' },
    ],
  },
];

export default function FounderOpsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('framework');

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [guardRails, setGuardRails] = useState<GuardRailStatus[]>([
    { id: 1, title: 'Capital Preservation', status: 'LOADING', detail: 'Loading...', source: 'sentinel' },
    { id: 2, title: 'AXUSD Peg Stability', status: 'LOADING', detail: 'Loading...', source: 'psm' },
    { id: 3, title: 'Treasury Coverage', status: 'LOADING', detail: 'Loading...', source: 'solvency' },
    { id: 4, title: 'Lending Health', status: 'LOADING', detail: 'Loading...', source: 'lending' },
    { id: 5, title: 'Regulatory Compliance', status: 'LOADING', detail: 'Loading...', source: 'disclosure' },
  ]);

  const [earnStats, setEarnStats] = useState<EarnStats | null>(null);
  const [earnLoading, setEarnLoading] = useState(false);

  const [prsData, setPrsData] = useState<{ prs: number; grade: string; dimensions: { id: string; label: string; grade: string }[] } | null>(null);
  const [prsLoading, setPrsLoading] = useState(true);

  const [pools, setPools] = useState<PoolData[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(false);

  const [reportCount, setReportCount] = useState<number | null>(null);
  const [dealCount, setDealCount] = useState<number | null>(null);
  const [groupCount, setGroupCount] = useState<number | null>(null);

  const [variances, setVariances] = useState<any[]>([]);
  const [varianceLoading, setVarianceLoading] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState<any | null>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  const [pendingOutcomes, setPendingOutcomes] = useState<any[]>([]);
  const [outcomesLoading, setOutcomesLoading] = useState(false);
  const [outcomeAdminKey, setOutcomeAdminKey] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewMsg, setReviewMsg] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);

  const [govStatus, setGovStatus] = useState<any | null>(null);
  const [govLoading, setGovLoading] = useState(false);
  const [adminActions, setAdminActions] = useState<any[]>([]);
  const [adminActionsLoading, setAdminActionsLoading] = useState(false);

  const [ingestAdminKey, setIngestAdminKey] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<any | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  const [complianceAdminKey, setComplianceAdminKey] = useState('');
  const [kycQueue, setKycQueue] = useState<any[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycMsg, setKycMsg] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);
  const [accredQueue, setAccredQueue] = useState<any[]>([]);
  const [accredLoading, setAccredLoading] = useState(false);
  const [accredMsg, setAccredMsg] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);
  const [complianceLog, setComplianceLog] = useState<any[]>([]);
  const [complianceLogLoading, setComplianceLogLoading] = useState(false);
  const [revokeMsg, setRevokeMsg] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [kycClaimsMap, setKycClaimsMap] = useState<Record<string, any[]>>({});
  const [loadingClaimsFor, setLoadingClaimsFor] = useState<string | null>(null);
  const [expiryTriggering, setExpiryTriggering] = useState(false);
  const [expiryTriggerMsg, setExpiryTriggerMsg] = useState<string | null>(null);

  const [circleScreening, setCircleScreening] = useState<{
    circleConfigured: boolean;
    stats: { total: number; approved: number; denied: number; review: number };
    recent: any[];
    denied: any[];
  } | null>(null);
  const [circleScreeningLoading, setCircleScreeningLoading] = useState(false);

  const [psmActivating, setPsmActivating] = useState(false);
  const [psmActivateKey, setPsmActivateKey] = useState('');
  const [psmActivateMsg, setPsmActivateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [psmAgentStatus, setPsmAgentStatus] = useState<boolean | null>(null);

  const [bankingData, setBankingData] = useState<any | null>(null);
  const [bankingLoading, setBankingLoading] = useState(false);
  const [bankingError, setBankingError] = useState<string | null>(null);
  const [bankingTxData, setBankingTxData] = useState<{ transactions: any[]; pending: any[] } | null>(null);
  const [bankingAdminKey, setBankingAdminKey] = useState('');

  // DAO Accounts tab state
  const [daoAccounts, setDaoAccounts] = useState<any[]>([]);
  const [daoAccountsLoading, setDaoAccountsLoading] = useState(false);
  const [daoAccountsError, setDaoAccountsError] = useState<string | null>(null);
  const [daoAdminKey, setDaoAdminKey] = useState('');
  const [daoProvisioningId, setDaoProvisioningId] = useState<string | null>(null);
  const [daoProvisionMsg, setDaoProvisionMsg] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);

  // Axiom Rail settlements tab state
  const [railSettlements, setRailSettlements] = useState<any[]>([]);
  const [railSummary, setRailSummary] = useState<any | null>(null);
  const [railLoading, setRailLoading] = useState(false);
  const [railError, setRailError] = useState<string | null>(null);
  const [railAdminKey, setRailAdminKey] = useState('');
  const [railMonitorRunning, setRailMonitorRunning] = useState(false);
  const [railMonitorResult, setRailMonitorResult] = useState<any | null>(null);
  const [railUploadOpen, setRailUploadOpen] = useState(false);
  const [railUploadTitle, setRailUploadTitle] = useState('');
  const [railUploadFile, setRailUploadFile] = useState<File | null>(null);
  const [railUploadNote, setRailUploadNote] = useState('');
  const [railUploadSubmitting, setRailUploadSubmitting] = useState(false);
  const [railUploadDocs, setRailUploadDocs] = useState<any[]>([]);

  // AXAU Queue tab state
  const [axauQueue, setAxauQueue] = useState<any[]>([]);
  const [axauQueueLoading, setAxauQueueLoading] = useState(false);
  const [axauQueueError, setAxauQueueError] = useState<string | null>(null);
  const [axauQueueAdminKey, setAxauQueueAdminKey] = useState('');
  const [axauFulfillMap, setAxauFulfillMap] = useState<Record<string, string>>({});
  const [axauFulfillMsg, setAxauFulfillMsg] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);
  const [axauFulfilling, setAxauFulfilling] = useState<string | null>(null);
  const [axauVault, setAxauVault] = useState<any | null>(null);
  const [axauBuffer, setAxauBuffer] = useState<any | null>(null);
  const [axauBufferLoading, setAxauBufferLoading] = useState(false);

  // Reserves tab state
  const [reservesData, setReservesData] = useState<any | null>(null);
  const [reservesLoading, setReservesLoading] = useState(false);
  const [reservesError, setReservesError] = useState<string | null>(null);
  const [reservesAdminKey, setReservesAdminKey] = useState('');
  const [reservesCopied, setReservesCopied] = useState<string | null>(null);
  const [reservesMintAmount, setReservesMintAmount] = useState('');
  const [reservesMintTo, setReservesMintTo] = useState('');
  const [reservesMintLoading, setReservesMintLoading] = useState(false);
  const [reservesMintResult, setReservesMintResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [reservesTopUpAmount, setReservesTopUpAmount] = useState('0.01');
  const [reservesTopUpLoading, setReservesTopUpLoading] = useState(false);
  const [reservesTopUpResult, setReservesTopUpResult] = useState<{ ok: boolean; msg: string } | null>(null);

  type SnapshotPoint = { t: string; balance: number; usdValue: number | null };
  const [reservesHistory, setReservesHistory] = useState<Record<string, SnapshotPoint[]>>({});
  const [reservesHistoryLoading, setReservesHistoryLoading] = useState(false);

  // Aggregate reserve USD value per snapshot hour — shared by the 7D Change %
  // cell in the totals strip AND the portfolio sparkline so both always reflect
  // identical data without duplicating the summation logic.
  const reservesAggregateBuckets = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const pts of Object.values(reservesHistory)) {
      for (const pt of pts) {
        if (pt.usdValue != null) {
          buckets[pt.t] = (buckets[pt.t] ?? 0) + pt.usdValue;
        }
      }
    }
    return buckets;
  }, [reservesHistory]);
  const reservesAggregateSortedTimes = useMemo(
    () => Object.keys(reservesAggregateBuckets).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    ),
    [reservesAggregateBuckets],
  );

  useEffect(() => {
    Promise.all([
      fetch('/api/founder-ops/overview').then(r => r.json()).catch(() => null),
      fetch('/api/founder-ops/log').then(r => r.json()).catch(() => ({ logs: [] })),
    ]).then(([ov, lg]) => {
      // API returns { success: true, data: { sentinel, euler, axusd, ... } }
      const ovData = ov?.data ?? ov;
      if (ovData && !ovData.error) setData(ovData);
      else if (ov?.error) setError(ov.error);
      setLogs(lg.logs || []);
      setLoading(false);
    }).catch(e => {
      setError(String(e));
      setLoading(false);
    });

    fetch('/api/euler/earn-stats').then(r => r.json()).then(d => {
      if (d && d.tvlUsd != null) setEarnStats(d);
    }).catch(() => {});
    fetch('/api/euler/eulerswap-pools').then(r => r.json()).then(d => {
      if (d.pools) setPools(d.pools);
    }).catch(() => {});

    Promise.all([
      fetch('/api/land/candidates').then(r => r.json()).catch(() => null),
      fetch('/api/wealth-practice/groups').then(r => r.json()).catch(() => null),
    ]).then(([candidates, groups]) => {
      // Land candidates: { success, candidates: [], stats: { total, byStage } }
      const landTotal = candidates?.stats?.total ?? candidates?.candidates?.length ?? null;
      if (landTotal != null) setDealCount(landTotal);
      // Wealth practice groups: { groups: [], total }
      if (groups?.total != null) setGroupCount(groups.total);
      else if (Array.isArray(groups?.groups)) setGroupCount(groups.groups.length);
    });

    fetch('/api/sentinel/guard-rails').then(r => r.json()).then(d => {
      if (d.guardRails) setGuardRails(d.guardRails);
    }).catch(() => {});

    setPrsLoading(true);
    fetch('/api/mirdt/protocol-readiness').then(r => r.json()).then(d => {
      if (d.prs != null) setPrsData(d);
    }).catch(() => {}).finally(() => setPrsLoading(false));
  }, []);

  const loadGovernanceStatus = async () => {
    setGovLoading(true);
    try {
      const res = await fetch('/api/governance/multisig-status').then(r => r.json()).catch(() => null);
      if (res?.success) setGovStatus(res);
    } finally {
      setGovLoading(false);
    }
  };

  const loadAdminActions = async (adminKey?: string) => {
    setAdminActionsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (adminKey) headers['x-admin-key'] = adminKey;
      const res = await fetch('/api/governance/admin-actions?limit=50', { headers }).then(r => r.json()).catch(() => null);
      if (res?.success) setAdminActions(res.actions ?? []);
    } finally {
      setAdminActionsLoading(false);
    }
  };

  const loadKycQueue = async (key?: string) => {
    setKycLoading(true);
    try {
      const k = key ?? complianceAdminKey;
      const res = await fetch('/api/erc3643/identity/review?status=submitted,under_review', { headers: { 'x-admin-key': k } }).then(r => r.json()).catch(() => null);
      if (res?.success) setKycQueue(res.data ?? []);
    } finally {
      setKycLoading(false);
    }
  };

  const loadAccredQueue = async (key?: string) => {
    setAccredLoading(true);
    try {
      const k = key ?? complianceAdminKey;
      const res = await fetch('/api/erc3643/accreditation/approve', { headers: { 'x-admin-key': k } }).then(r => r.json()).catch(() => null);
      if (res?.success) setAccredQueue(res.data ?? []);
    } finally {
      setAccredLoading(false);
    }
  };

  const loadComplianceLog = async (key?: string) => {
    setComplianceLogLoading(true);
    try {
      const k = key ?? complianceAdminKey;
      const res = await fetch('/api/erc3643/identity/compliance-log?limit=50', { headers: { 'x-admin-key': k } }).then(r => r.json()).catch(() => null);
      if (res?.success) setComplianceLog(res.data ?? []);
    } finally {
      setComplianceLogLoading(false);
    }
  };

  const loadCircleScreening = async (key?: string) => {
    const k = key ?? complianceAdminKey;
    if (!k) return;
    setCircleScreeningLoading(true);
    try {
      const res = await fetch('/api/circle/screening-results', { headers: { 'x-admin-key': k } });
      const json = await res.json();
      if (json?.success) setCircleScreening(json.data);
    } catch { } finally {
      setCircleScreeningLoading(false);
    }
  };

  const loadComplianceTab = (key?: string) => {
    const k = key ?? complianceAdminKey;
    loadKycQueue(k);
    loadAccredQueue(k);
    loadComplianceLog(k);
    loadCircleScreening(k);
  };

  const loadBankingData = async (key?: string) => {
    setBankingLoading(true);
    setBankingError(null);
    try {
      const overviewRes = await fetch('/api/banking/overview').then(r => r.json()).catch(() => null);
      if (overviewRes?.success) setBankingData(overviewRes.data);
      else setBankingError(overviewRes?.error ?? 'Failed to load banking data');
    } finally {
      setBankingLoading(false);
    }
    const k = key ?? bankingAdminKey;
    if (k) {
      try {
        const txRes = await fetch('/api/banking/transactions?limit=20', { headers: { 'x-admin-key': k } }).then(r => r.json()).catch(() => null);
        if (txRes?.success) setBankingTxData(txRes.data);
      } catch { /* non-fatal */ }
    }
  };

  const loadAxauQueue = async (key?: string) => {
    const k = key ?? axauQueueAdminKey;
    if (!k) {
      setAxauQueueError('Enter admin key above and click Refresh Queue.');
      return;
    }
    setAxauQueueLoading(true);
    setAxauQueueError(null);
    try {
      const [queueRes, vaultRes] = await Promise.all([
        fetch('/api/axau/purchase-request', {
          headers: { 'x-admin-key': k },
        }).then(r => r.json()).catch(() => null),
        fetch('/api/axau/buy-quote?axusdAmount=1').then(r => r.json()).catch(() => null),
      ]);
      if (queueRes?.data) {
        setAxauQueue(queueRes.data);
      } else if (queueRes?.error) {
        setAxauQueueError(queueRes.error);
      }
      if (vaultRes?.xauUsdPrice) setAxauVault(vaultRes);
    } catch (e) {
      setAxauQueueError(String(e));
    } finally {
      setAxauQueueLoading(false);
    }
    // Also fetch vault buffer (non-blocking — failure is non-fatal)
    if (k) {
      setAxauBufferLoading(true);
      fetch('/api/axau/vault-buffer', { headers: { 'x-admin-key': k } })
        .then(r => r.json())
        .then(j => { if (j?.data) setAxauBuffer(j.data); })
        .catch(() => {})
        .finally(() => setAxauBufferLoading(false));
    }
  };

  const loadDaoAccounts = async (key?: string) => {
    const k = key ?? daoAdminKey;
    if (!k) { setDaoAccountsError('Enter admin key and click Refresh.'); return; }
    setDaoAccountsLoading(true);
    setDaoAccountsError(null);
    try {
      const res = await fetch('/api/banking/dao-account/list', { headers: { 'x-admin-key': k } });
      const json = await res.json();
      if (!res.ok) setDaoAccountsError(json.error ?? 'Failed to load DAO accounts');
      else setDaoAccounts(json.data ?? []);
    } catch (e) {
      setDaoAccountsError(String(e));
    } finally {
      setDaoAccountsLoading(false);
    }
  };

  const handleDaoProvision = async (applicationId: string) => {
    const k = daoAdminKey;
    if (!k) { setDaoProvisionMsg({ id: applicationId, type: 'error', text: 'Admin key required' }); return; }
    setDaoProvisioningId(applicationId);
    setDaoProvisionMsg(null);
    try {
      const res = await fetch('/api/banking/dao-account/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': k },
        body: JSON.stringify({ applicationId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setDaoProvisionMsg({ id: applicationId, type: 'error', text: json.error ?? 'Provision failed' });
      } else {
        setDaoProvisionMsg({
          id: applicationId,
          type: 'success',
          text: `Provisioned — Account ID: ${json.data.increaseAccountId} · Token: ${json.data.accountToken}`,
        });
        await loadDaoAccounts(k);
      }
    } catch (e) {
      setDaoProvisionMsg({ id: applicationId, type: 'error', text: String(e) });
    } finally {
      setDaoProvisioningId(null);
    }
  };

  const loadAxiomRailSettlements = async (key?: string) => {
    const k = key ?? railAdminKey;
    if (!k) {
      setRailError('Enter admin key and click Refresh.');
      return;
    }
    setRailLoading(true);
    setRailError(null);
    try {
      const res = await fetch('/api/axiom-rail/settlements', {
        headers: { 'x-admin-key': k },
      });
      const json = await res.json();
      if (!res.ok) {
        setRailError(json.error ?? 'Failed to load settlements');
      } else {
        setRailSettlements(json.data ?? []);
        setRailSummary(json.summary ?? null);
      }
    } catch (e) {
      setRailError(String(e));
    } finally {
      setRailLoading(false);
    }
  };

  const runAxiomRailMonitor = async () => {
    const k = railAdminKey;
    if (!k) { setRailError('Enter admin key first.'); return; }
    setRailMonitorRunning(true);
    setRailMonitorResult(null);
    try {
      const res = await fetch('/api/axiom-rail/monitor', {
        method: 'POST',
        headers: { 'x-admin-key': k },
      });
      const json = await res.json();
      setRailMonitorResult(json);
      if (json.success) await loadAxiomRailSettlements(k);
    } catch (e) {
      setRailMonitorResult({ success: false, error: String(e) });
    } finally {
      setRailMonitorRunning(false);
    }
  };

  const loadRailSettlementDocs = async () => {
    if (!railAdminKey) return;
    try {
      const res = await fetch('/api/founder/settlement-list', {
        headers: { 'x-admin-key': railAdminKey },
      });
      const json = await res.json();
      if (json.success) setRailUploadDocs(json.data ?? []);
    } catch { /* silent */ }
  };

  // ── Allocation policy + AI alternative state ─────────────────────────────
  type AllocAssetKey = 'axau'|'kag'|'paxg'|'axusd'|'usdc'|'wbtc'|'cbeth'|'cash_reserve'|'operating_spend';
  type AllocWeights = Record<AllocAssetKey, number>;
  type AllocAsset = { key: AllocAssetKey; label: string; category: string; note: string };
  type AllocPolicyRow = { scope: 'driver' | 'treasury'; share_pct: number; weights: AllocWeights; updated_at: string; updated_by: string | null };
  type AllocAiResult = { weights: AllocWeights; rationale: string; net_pay: number; share_pct: number; scope_amount: number; warnings?: string[] };
  const ALLOC_ASSET_FALLBACK: ReadonlyArray<AllocAsset> = [
    { key: 'axau',            label: 'AXAU',            category: 'reserve',    note: 'Axiom gold reserve instrument' },
    { key: 'kag',             label: 'KAG',             category: 'reserve',    note: 'Silver reserve' },
    { key: 'paxg',            label: 'PAXG',            category: 'reserve',    note: 'Paxos gold (AXAU underlying)' },
    { key: 'axusd',           label: 'AXUSD',           category: 'stablecoin', note: 'Axiom unified stablecoin' },
    { key: 'usdc',            label: 'USDC',            category: 'stablecoin', note: 'Circle USD' },
    { key: 'wbtc',            label: 'WBTC',            category: 'crypto',     note: 'Wrapped Bitcoin' },
    { key: 'cbeth',           label: 'cbETH',           category: 'crypto',     note: 'Coinbase staked ETH' },
    { key: 'cash_reserve',    label: 'Cash reserve',    category: 'fiat',       note: 'Off-chain emergency buffer' },
    { key: 'operating_spend', label: 'Operating spend', category: 'fiat',       note: 'Kept in checking for weekly bills' },
  ];
  const [allocAssets, setAllocAssets]       = useState<ReadonlyArray<AllocAsset>>(ALLOC_ASSET_FALLBACK);
  const [allocPolicies, setAllocPolicies]   = useState<{ driver: AllocPolicyRow | null; treasury: AllocPolicyRow | null }>({ driver: null, treasury: null });
  const [allocPolicyOpen, setAllocPolicyOpen] = useState(false);
  const [allocPolicyDraft, setAllocPolicyDraft] = useState<{ driver: AllocPolicyRow; treasury: AllocPolicyRow } | null>(null);
  const [allocPolicySaving, setAllocPolicySaving] = useState(false);
  const [allocPolicyError, setAllocPolicyError] = useState<string | null>(null);
  // Per-doc + per-scope AI cache: keyed `${docId}:${scope}`
  const [allocAiCache, setAllocAiCache] = useState<Record<string, { loading: boolean; result: AllocAiResult | null; error: string | null }>>({});

  // Latest settlement (used by Reserves tab to drive the allocation panel)
  type LatestSettlement = { document_id: string; title: string | null; statement_date: string | null; driver_name: string | null; net_pay: number | null; status: string | null };
  const [allocLatestSettlement, setAllocLatestSettlement] = useState<LatestSettlement | null>(null);
  const [allocLatestLoading, setAllocLatestLoading] = useState(false);

  // ── Axiom wallet balance (funding source for Reserves tab) ────────────────
  type WalletBalance = { available_cents: number; pending_cents: number; available_usd: number; pending_usd: number; updated_at: string };
  const [walletBalance, setWalletBalance]         = useState<WalletBalance | null>(null);
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(false);
  const [walletFundingSource, setWalletFundingSource]   = useState<'settlement' | 'wallet' | 'custom'>('settlement');
  const [customFundingAmount, setCustomFundingAmount]   = useState('');
  const [walletTopupLoading, setWalletTopupLoading]     = useState(false);

  const loadWalletBalance = async (keyArg?: string) => {
    const adminKey = keyArg ?? reservesAdminKey ?? railAdminKey;
    if (!adminKey) return;
    setWalletBalanceLoading(true);
    try {
      const res  = await fetch('/api/wallet/balance', { headers: { 'x-admin-key': adminKey } });
      const json = await res.json();
      if (json.success) setWalletBalance(json.data as WalletBalance);
    } catch { /* silent */ }
    finally { setWalletBalanceLoading(false); }
  };

  const startWalletTopup = async (amountCents: number) => {
    const adminKey = reservesAdminKey || railAdminKey;
    if (!adminKey) return;
    setWalletTopupLoading(true);
    try {
      const res  = await fetch('/api/wallet/topup/checkout', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey, 'content-type': 'application/json' },
        body: JSON.stringify({ amount_cents: amountCents }),
      });
      const json = await res.json();
      if (json.success && json.checkout_url) {
        window.open(json.checkout_url, '_blank');
      }
    } catch { /* silent */ }
    finally { setWalletTopupLoading(false); }
  };

  const loadAllocPolicy = async (keyArg?: string) => {
    const adminKey = keyArg ?? reservesAdminKey ?? railAdminKey;
    if (!adminKey) return;
    try {
      const res = await fetch('/api/founder/allocation-policy', { headers: { 'x-admin-key': adminKey } });
      const json = await res.json();
      if (json.success) {
        const driver   = (json.data as AllocPolicyRow[]).find(r => r.scope === 'driver')   ?? null;
        const treasury = (json.data as AllocPolicyRow[]).find(r => r.scope === 'treasury') ?? null;
        setAllocPolicies({ driver, treasury });
        if (Array.isArray(json.assets) && json.assets.length > 0) setAllocAssets(json.assets as AllocAsset[]);
      }
    } catch { /* silent */ }
  };

  const beginEditPolicy = () => {
    if (!allocPolicies.driver || !allocPolicies.treasury) return;
    setAllocPolicyDraft({
      driver:   { ...allocPolicies.driver,   weights: { ...allocPolicies.driver.weights } },
      treasury: { ...allocPolicies.treasury, weights: { ...allocPolicies.treasury.weights } },
    });
    setAllocPolicyError(null);
    setAllocPolicyOpen(true);
  };

  const loadLatestSettlement = async (keyArg?: string) => {
    const adminKey = keyArg ?? reservesAdminKey ?? railAdminKey;
    if (!adminKey) return;
    setAllocLatestLoading(true);
    try {
      const res = await fetch('/api/founder/settlement-list?limit=10', { headers: { 'x-admin-key': adminKey } });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        type ListRow = { document_id: string; title: string | null; statement_date: string | null; driver_name: string | null; total_net_pay_current: number | string | null; status: string | null };
        const rows = json.data as ListRow[];
        const extracted = rows.find(r => (r.status === 'extracted' || r.status === 'low_confidence') && r.total_net_pay_current != null);
        if (extracted) {
          const np = Number(extracted.total_net_pay_current);
          setAllocLatestSettlement({
            document_id: extracted.document_id,
            title: extracted.title,
            statement_date: extracted.statement_date,
            driver_name: extracted.driver_name,
            net_pay: Number.isFinite(np) ? np : null,
            status: extracted.status,
          });
        } else {
          setAllocLatestSettlement(null);
        }
      }
    } catch { /* silent */ }
    finally { setAllocLatestLoading(false); }
  };

  const savePolicy = async () => {
    if (!allocPolicyDraft) return;
    const adminKey = reservesAdminKey || railAdminKey;
    setAllocPolicySaving(true);
    setAllocPolicyError(null);
    try {
      const res = await fetch('/api/founder/allocation-policy', {
        method: 'PUT',
        headers: { 'x-admin-key': adminKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          driver:   { share_pct: allocPolicyDraft.driver.share_pct,   weights: allocPolicyDraft.driver.weights },
          treasury: { share_pct: allocPolicyDraft.treasury.share_pct, weights: allocPolicyDraft.treasury.weights },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setAllocPolicyError(json.error || 'Save failed');
      } else {
        const driver   = (json.data as AllocPolicyRow[]).find(r => r.scope === 'driver')   ?? null;
        const treasury = (json.data as AllocPolicyRow[]).find(r => r.scope === 'treasury') ?? null;
        setAllocPolicies({ driver, treasury });
        setAllocPolicyOpen(false);
        setAllocPolicyDraft(null);
        setAllocAiCache({}); // invalidate AI alternatives — baseline changed
      }
    } catch (e) {
      setAllocPolicyError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setAllocPolicySaving(false);
    }
  };

  const generateAllocationAi = async (docId: string, scope: 'driver' | 'treasury') => {
    const key = `${docId}:${scope}`;
    const adminKey = reservesAdminKey || railAdminKey;
    setAllocAiCache(prev => ({ ...prev, [key]: { loading: true, result: null, error: null } }));
    try {
      const res = await fetch('/api/founder/allocation-ai', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey, 'content-type': 'application/json' },
        body: JSON.stringify({ documentId: docId, scope }),
      });
      const json = await res.json();
      if (json.success) {
        setAllocAiCache(prev => ({ ...prev, [key]: { loading: false, result: { weights: json.weights, rationale: json.rationale ?? '', net_pay: json.net_pay, share_pct: json.share_pct, scope_amount: json.scope_amount, warnings: json.warnings }, error: null } }));
      } else {
        setAllocAiCache(prev => ({ ...prev, [key]: { loading: false, result: null, error: json.error || 'AI failed' } }));
      }
    } catch (e) {
      setAllocAiCache(prev => ({ ...prev, [key]: { loading: false, result: null, error: e instanceof Error ? e.message : 'AI failed' } }));
    }
  };

  // ── Settlement statement summary + lazy-loaded detail typings ────────────
  type SettlementRow = {
    order?: string | number | null;
    date?: string | null;
    description?: string | null;
    amount?: number | string | null;
    rate?: number | string | null;
    miles?: number | string | null;
    loaded_miles?: number | string | null;
    empty_miles?: number | string | null;
    type?: string | null;
    origin?: string | null;
    destination?: string | null;
    dispatch_date?: string | null;
    pickup_date?: string | null;
    empty_date?: string | null;
    ending_balance?: number | string | null;
    balance_due?: number | string | null;
  };
  type SettlementPayload = {
    statement_date?: string | null;
    driver_name?: string | null;
    driver_code?: string | null;
    driver_address?: string | null;
    driver_phone?: string | null;
    driver_email?: string | null;
    unit_number?: string | null;
    total_miles?: number | string | null;
    loaded_miles?: number | string | null;
    empty_miles?: number | string | null;
    miles_per_gallon?: number | string | null;
    total_days_off?: number | string | null;
    mileage_pay_rows?: SettlementRow[] | null;
    mileage_pay_current?: number | string | null;
    mileage_pay_ytd?: number | string | null;
    mileage_pay_ltd?: number | string | null;
    reimbursement_rows?: SettlementRow[] | null;
    reimbursements_current?: number | string | null;
    reimbursements_ytd?: number | string | null;
    reimbursements_ltd?: number | string | null;
    fuel_protection_rows?: SettlementRow[] | null;
    fuel_protection_current?: number | string | null;
    fuel_protection_ytd?: number | string | null;
    fuel_protection_ltd?: number | string | null;
    total_gross_pay_current?: number | string | null;
    total_gross_pay_ytd?: number | string | null;
    total_gross_pay_ltd?: number | string | null;
    advances_rows?: SettlementRow[] | null;
    advances_current?: number | string | null;
    advances_ytd?: number | string | null;
    advances_ltd?: number | string | null;
    escrow_rows?: SettlementRow[] | null;
    escrow_current?: number | string | null;
    escrow_ytd?: number | string | null;
    escrow_ltd?: number | string | null;
    escrow_ending_balance?: number | string | null;
    recurring_expense_rows?: SettlementRow[] | null;
    recurring_expenses_current?: number | string | null;
    recurring_expenses_ytd?: number | string | null;
    recurring_expenses_ltd?: number | string | null;
    truck_repair_rows?: SettlementRow[] | null;
    truck_repairs_current?: number | string | null;
    truck_repairs_ytd?: number | string | null;
    truck_repairs_ltd?: number | string | null;
    other_misc_rows?: SettlementRow[] | null;
    other_misc_current?: number | string | null;
    other_misc_ytd?: number | string | null;
    other_misc_ltd?: number | string | null;
    fuel_expense_rows?: SettlementRow[] | null;
    fuel_expenses_current?: number | string | null;
    fuel_expenses_ytd?: number | string | null;
    fuel_expenses_ltd?: number | string | null;
    total_deductions_current?: number | string | null;
    total_deductions_ytd?: number | string | null;
    total_deductions_ltd?: number | string | null;
    previous_balance_due_current?: number | string | null;
    total_net_pay_current?: number | string | null;
    total_net_pay_ytd?: number | string | null;
    total_net_pay_ltd?: number | string | null;
  };
  type SettlementListRow = {
    id: string;
    title: string;
    description?: string | null;
    file_name: string;
    file_url: string;
    created_at: string;
    extraction_status?: 'extracted' | 'low_confidence' | 'failed' | null;
    extraction_confidence?: number | null;
    extraction_field_count?: number | null;
    extraction_error?: string | null;
    payload_statement_date?: string | null;
    payload_unit_number?: string | null;
    payload_driver_name?: string | null;
    payload_total_miles?: string | number | null;
    payload_loaded_miles?: string | number | null;
    payload_empty_miles?: string | number | null;
    payload_mileage_pay_current?: string | number | null;
    payload_reimbursements_current?: string | number | null;
    payload_fuel_protection_current?: string | number | null;
    payload_total_gross_pay_current?: string | number | null;
    payload_total_deductions_current?: string | number | null;
    payload_total_net_pay_current?: string | number | null;
    // Optional payload from in-session upload response
    extraction?: { status?: 'extracted' | 'low_confidence' | 'failed' | null; payload?: SettlementPayload | null } | null;
  };
  type DetailCacheEntry = { loading: boolean; payload: SettlementPayload | null; error: string | null };
  const [railExpandedDoc, setRailExpandedDoc] = useState<string | null>(null);
  const [railDetailCache, setRailDetailCache] = useState<Record<string, DetailCacheEntry>>({});

  const openSettlementDetail = async (docId: string, inlinePayload: SettlementPayload | null) => {
    if (railExpandedDoc === docId) { setRailExpandedDoc(null); return; }
    setRailExpandedDoc(docId);
    if (railDetailCache[docId]?.payload) return;
    if (inlinePayload) {
      setRailDetailCache(prev => ({ ...prev, [docId]: { loading: false, payload: inlinePayload, error: null } }));
      return;
    }
    setRailDetailCache(prev => ({ ...prev, [docId]: { loading: true, payload: null, error: null } }));
    try {
      const res = await fetch(`/api/founder/settlement-extraction?id=${encodeURIComponent(docId)}`, {
        headers: { 'x-admin-key': railAdminKey },
      });
      const json = await res.json();
      if (json.success) {
        setRailDetailCache(prev => ({ ...prev, [docId]: { loading: false, payload: (json.data?.payload ?? null) as SettlementPayload | null, error: null } }));
      } else {
        setRailDetailCache(prev => ({ ...prev, [docId]: { loading: false, payload: null, error: json.error ?? 'Failed to load extraction' } }));
      }
    } catch {
      setRailDetailCache(prev => ({ ...prev, [docId]: { loading: false, payload: null, error: 'Network error loading extraction' } }));
    }
  };

  const handleRailUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!railUploadTitle || !railUploadFile) return;
    setRailUploadSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', railUploadFile);
      fd.append('title', railUploadTitle);
      if (railUploadNote) fd.append('note', railUploadNote);
      const res = await fetch('/api/founder/upload-settlement', {
        method: 'POST',
        headers: { 'x-admin-key': railAdminKey },
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        setRailUploadDocs(prev => [json.data, ...prev]);
        setRailUploadOpen(false);
        setRailUploadTitle('');
        setRailUploadFile(null);
        setRailUploadNote('');
      } else {
        alert(json.error ?? 'Upload failed');
      }
    } catch {
      alert('Failed to connect to server');
    } finally {
      setRailUploadSubmitting(false);
    }
  };

  const handleAxauFulfill = async (requestId: string, action: 'processing' | 'fulfilled' | 'failed') => {
    setAxauFulfilling(requestId);
    setAxauFulfillMsg(null);
    try {
      const txHash = axauFulfillMap[requestId] || '';
      const res = await fetch('/api/axau/purchase-request/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': axauQueueAdminKey },
        body: JSON.stringify({ requestId, action, fulfillmentTxHash: txHash || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAxauFulfillMsg({ id: requestId, type: 'error', text: json.error || 'Action failed' });
      } else {
        setAxauFulfillMsg({ id: requestId, type: 'success', text: `Marked as ${action}` });
        await loadAxauQueue();
      }
    } catch (e) {
      setAxauFulfillMsg({ id: requestId, type: 'error', text: String(e) });
    } finally {
      setAxauFulfilling(null);
    }
  };

  const handleAutoFulfill = async (requestId: string) => {
    setAxauFulfilling(requestId);
    setAxauFulfillMsg(null);
    try {
      const res  = await fetch('/api/axau/auto-fulfill', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': axauQueueAdminKey },
        body:    JSON.stringify({ requestId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAxauFulfillMsg({ id: requestId, type: 'error', text: json.error || 'Auto-fulfill failed' });
      } else {
        const d = json.data;
        setAxauFulfillMsg({
          id:   requestId,
          type: 'success',
          text: `Fulfilled — minted ${d?.axauMinted ?? '?'} AXAU`,
        });
        await loadAxauQueue();
      }
    } catch (e) {
      setAxauFulfillMsg({ id: requestId, type: 'error', text: String(e) });
    } finally {
      setAxauFulfilling(null);
    }
  };

  const handleKycAction = async (submissionId: string, action: 'approve' | 'reject', reviewNote?: string) => {
    setKycMsg(null);
    try {
      if (action === 'approve') {
        const res = await fetch('/api/erc3643/identity/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': complianceAdminKey },
          body: JSON.stringify({ submissionId, reviewNote }),
        });
        const json = await res.json();
        if (!res.ok) {
          setKycMsg({ id: submissionId, type: 'error', text: json.error || 'Approval failed' });
        } else {
          setKycMsg({ id: submissionId, type: 'success', text: 'Approved — identity registered, Topics 1 (KYC) and 3 (Sanctions) issued.' });
          setKycQueue(prev => prev.filter(s => s.id !== submissionId));
          loadComplianceLog(complianceAdminKey);
        }
      } else {
        const res = await fetch('/api/erc3643/identity/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': complianceAdminKey },
          body: JSON.stringify({ submissionId, action: 'reject', reviewNote }),
        });
        const json = await res.json();
        if (!res.ok) {
          setKycMsg({ id: submissionId, type: 'error', text: json.error || 'Rejection failed' });
        } else {
          setKycMsg({ id: submissionId, type: 'success', text: 'Submission rejected.' });
          setKycQueue(prev => prev.filter(s => s.id !== submissionId));
        }
      }
    } catch (e: unknown) {
      setKycMsg({ id: submissionId, type: 'error', text: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleAccredAction = async (submissionId: string, action: 'approve' | 'reject', reviewNote?: string) => {
    setAccredMsg(null);
    try {
      const res = await fetch('/api/erc3643/accreditation/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': complianceAdminKey },
        body: JSON.stringify({ submissionId, action, reviewNote }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAccredMsg({ id: submissionId, type: 'error', text: json.error || 'Action failed' });
      } else {
        setAccredMsg({ id: submissionId, type: 'success', text: action === 'approve' ? 'Accreditation approved — Topic 2 claim issued.' : 'Accreditation rejected.' });
        setAccredQueue(prev => prev.filter(s => s.id !== submissionId));
        loadComplianceLog(complianceAdminKey);
      }
    } catch (e: unknown) {
      setAccredMsg({ id: submissionId, type: 'error', text: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleMarkUnderReview = async (submissionId: string) => {
    setKycMsg(null);
    try {
      const res = await fetch('/api/erc3643/identity/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': complianceAdminKey },
        body: JSON.stringify({ submissionId, action: 'mark_under_review' }),
      });
      const json = await res.json();
      if (!res.ok) {
        setKycMsg({ id: submissionId, type: 'error', text: json.error || 'Failed to mark under review' });
      } else {
        setKycMsg({ id: submissionId, type: 'success', text: 'Marked as Under Review.' });
        setKycQueue(prev => prev.map(s => s.id === submissionId ? { ...s, status: 'under_review' } : s));
      }
    } catch (e: unknown) {
      setKycMsg({ id: submissionId, type: 'error', text: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleFetchClaimsForWallet = async (submissionId: string, wallet: string) => {
    if (kycClaimsMap[submissionId]) {
      setKycClaimsMap(prev => { const n = { ...prev }; delete n[submissionId]; return n; });
      return;
    }
    setLoadingClaimsFor(submissionId);
    try {
      const res = await fetch(`/api/erc3643/identity/status?wallet=${wallet}`, {
        headers: { 'x-admin-key': complianceAdminKey },
      });
      const json = await res.json();
      const claims = (json?.data?.claims ?? []).filter((c: any) => !c.revoked);
      setKycClaimsMap(prev => ({ ...prev, [submissionId]: claims }));
    } catch (e) {
      console.error('Failed to fetch claims:', e);
    } finally {
      setLoadingClaimsFor(null);
    }
  };

  const handleTriggerExpiryCheck = async () => {
    if (!complianceAdminKey) return;
    setExpiryTriggering(true);
    setExpiryTriggerMsg(null);
    try {
      const res = await fetch('/api/erc3643/identity/expiry-check', {
        method: 'POST',
        headers: { 'x-admin-key': complianceAdminKey },
      });
      const json = await res.json();
      if (!res.ok) {
        setExpiryTriggerMsg(`Error: ${json.error}`);
      } else {
        setExpiryTriggerMsg(`Done — ${json?.data?.alertsSent ?? 0} claim(s) expiring, email sent: ${json?.data?.emailSent ? 'yes' : 'no'}`);
        loadComplianceLog(complianceAdminKey);
      }
    } catch (e: unknown) {
      setExpiryTriggerMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setExpiryTriggering(false);
    }
  };

  const checkPsmAgentStatus = async () => {
    try {
      const res = await fetch('/api/axusd/psm');
      const json = await res.json();
      setPsmAgentStatus(json?.data?.canonical?.agentRegistered ?? false);
    } catch {
      setPsmAgentStatus(false);
    }
  };

  const handleActivatePsm = async () => {
    if (!psmActivateKey || psmActivating) return;
    setPsmActivating(true);
    setPsmActivateMsg(null);
    try {
      const res = await fetch('/api/erc3643/admin/activate-psm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': psmActivateKey },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const d = json.data;
        setPsmActivateMsg({
          type: 'success',
          text: d.status === 'already_active'
            ? 'PSM is already registered as AXUSD agent — mint/redeem are live.'
            : `PSM activated. TX: ${d.txHash?.slice(0, 20)}… Mint and redeem are now live.`,
        });
        setPsmAgentStatus(true);
      } else {
        setPsmActivateMsg({ type: 'error', text: json.error ?? 'Unknown error' });
      }
    } catch (e: unknown) {
      setPsmActivateMsg({ type: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setPsmActivating(false);
    }
  };

  const handleRevoke = async (claimId: string) => {
    if (!confirm('Revoke this claim on-chain? This action cannot be undone.')) return;
    setRevokingId(claimId);
    setRevokeMsg(null);
    try {
      const res = await fetch('/api/erc3643/identity/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': complianceAdminKey },
        body: JSON.stringify({ claimId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRevokeMsg({ id: claimId, type: 'error', text: json.error || 'Revocation failed' });
      } else {
        setRevokeMsg({ id: claimId, type: 'success', text: `Claim revoked. TX: ${json.data?.txHash?.slice(0, 10)}…` });
        loadComplianceLog(complianceAdminKey);
      }
    } catch (e: unknown) {
      setRevokeMsg({ id: claimId, type: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setRevokingId(null);
    }
  };

  const loadReservesHistory = async (key: string) => {
    if (!key) return;
    setReservesHistoryLoading(true);
    try {
      const res = await fetch('/api/founder/reserve-snapshot-history?days=7', {
        headers: { 'x-admin-key': key },
      });
      const json = await res.json();
      if (res.ok && json.success && json.history) {
        setReservesHistory(json.history);
      }
    } catch {
      // Non-critical — sparklines simply remain empty
    } finally {
      setReservesHistoryLoading(false);
    }
  };

  const loadReserves = async (key?: string) => {
    const k = key ?? reservesAdminKey;
    if (!k) { setReservesError('Enter admin key and click Refresh.'); return; }
    setReservesLoading(true);
    setReservesError(null);
    try {
      const res = await fetch('/api/founder/reserve-positions', {
        headers: { 'x-admin-key': k },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setReservesError(json.error ?? 'Failed to load reserve positions');
      } else {
        setReservesData(json);
        // Fetch snapshot history concurrently — non-blocking for the live view
        loadReservesHistory(k);
      }
    } catch (e) {
      setReservesError(String(e));
    } finally {
      setReservesLoading(false);
    }
  };

  const mintAxusd = async () => {
    if (!reservesMintAmount || !reservesMintTo) {
      setReservesMintResult({ ok: false, msg: 'Amount and recipient address are required' });
      return;
    }
    setReservesMintLoading(true);
    setReservesMintResult(null);
    try {
      const r = await fetch('/api/erc3643/admin/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': reservesAdminKey },
        body: JSON.stringify({ toAddress: reservesMintTo, amountAxusd: reservesMintAmount, reason: 'Founder Ops reserves replenishment' }),
      });
      const j = await r.json();
      if (!r.ok) { setReservesMintResult({ ok: false, msg: j.error ?? 'Mint failed' }); return; }
      setReservesMintResult({
        ok: true,
        msg: `${reservesMintAmount} AXUSD minted — ${j.data?.status === 'pending_safe' ? 'Safe proposal created (≥10k AXUSD)' : 'tx: ' + (j.data?.txHash ?? 'confirmed')}`,
      });
    } catch (e: any) {
      setReservesMintResult({ ok: false, msg: String(e) });
    } finally {
      setReservesMintLoading(false);
    }
  };

  const topUpAxauBuffer = async () => {
    const amt = parseFloat(reservesTopUpAmount);
    if (isNaN(amt) || amt <= 0) {
      setReservesTopUpResult({ ok: false, msg: 'Enter a valid PAXG amount greater than 0' });
      return;
    }
    setReservesTopUpLoading(true);
    setReservesTopUpResult(null);
    try {
      const r = await fetch('/api/founder/mint-axau', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': reservesAdminKey },
        body: JSON.stringify({ paxgAmountFloat: amt }),
      });
      const j = await r.json();
      if (!r.ok) { setReservesTopUpResult({ ok: false, msg: j.error ?? 'Buffer top-up failed' }); return; }
      setReservesTopUpResult({ ok: true, msg: j.message ?? `Buffer top-up submitted — tx: ${j.txHash}` });
    } catch (e: any) {
      setReservesTopUpResult({ ok: false, msg: String(e) });
    } finally {
      setReservesTopUpLoading(false);
    }
  };

  const copyReserveAddr = (addr: string) => {
    navigator.clipboard.writeText(addr).then(() => {
      setReservesCopied(addr);
      setTimeout(() => setReservesCopied(null), 2000);
    }).catch(() => {});
  };

  const loadVariances = async () => {
    setVarianceLoading(true);
    try {
      const res = await fetch('/api/founder-ops/variances').then(r => r.json()).catch(() => ({ variances: [] }));
      setVariances(res.variances || []);
    } finally {
      setVarianceLoading(false);
    }
  };

  const loadOutcomes = async (key?: string) => {
    setOutcomesLoading(true);
    try {
      const headers: Record<string, string> = {};
      const k = key ?? outcomeAdminKey;
      if (k) headers['x-admin-solvency-key'] = k;
      const res = await fetch('/api/founder-ops/pending-outcomes', { headers }).then(r => r.json()).catch(() => ({ outcomes: [] }));
      setPendingOutcomes(res.outcomes || []);
    } finally {
      setOutcomesLoading(false);
    }
  };

  const reviewOutcome = async (outcomeId: string, decision: 'approved' | 'rejected' | 'delete') => {
    setReviewingId(outcomeId);
    setReviewMsg(null);
    try {
      const res = await fetch('/api/admin/review-outcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-solvency-key': outcomeAdminKey,
        },
        body: JSON.stringify({ outcomeId, decision, notes: reviewNotes[outcomeId] || '' }),
      });
      const json = await res.json();
      if (!res.ok) {
        setReviewMsg({ id: outcomeId, type: 'error', text: json.error || 'Review failed' });
      } else {
        setReviewMsg({ id: outcomeId, type: 'success', text: `Outcome ${decision} successfully.` });
        setPendingOutcomes(prev => prev.filter(o => o.id !== outcomeId));
      }
    } catch (e: any) {
      setReviewMsg({ id: outcomeId, type: 'error', text: e.message });
    } finally {
      setReviewingId(null);
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
      if (!res.ok) setCalibrationError(json.error || 'Calibration failed');
      else { setCalibrationResult(json); if (!dryRun) loadVariances(); }
    } catch (err: any) {
      setCalibrationError(err.message);
    } finally {
      setCalibrating(false);
    }
  };

  const logColumns: Column<LogEntry>[] = [
    { key: 'created_at', header: 'Date', render: r => <span className="font-dl-mono text-xs">{formatUTC(r.created_at)}</span> },
    { key: 'category', header: 'Layer', render: r => <span className="font-dl-mono text-xs uppercase text-dl-navy">{r.category}</span> },
    { key: 'title', header: 'Action', render: r => (
      <div>
        <p className="text-xs font-medium text-dl-navy">{r.title}</p>
        <p className="text-xs text-dl-gray mt-0.5">{r.description}</p>
      </div>
    )},
    { key: 'amount', header: 'Amount', render: r => <span className="font-dl-mono text-xs">{r.amount || '—'}</span> },
    { key: 'status', header: 'Status', render: r => (
      <span className={`font-dl-mono text-xs uppercase ${r.status === 'SUCCESS' ? 'text-dl-forest' : r.status === 'FAILURE' ? 'text-dl-error' : 'text-dl-gold'}`}>
        {r.status}
      </span>
    )},
    { key: 'tx_hash', header: 'TX', render: r => r.tx_hash ? (
      <a href={`https://arbiscan.io/tx/${r.tx_hash}`} target="_blank" rel="noopener noreferrer"
        className="font-dl-mono text-xs text-dl-navy underline">
        {r.tx_hash.slice(0, 6)}…{r.tx_hash.slice(-4)}
      </a>
    ) : <span className="text-dl-gray text-xs">—</span> },
  ];

  const TABS: { id: TabId; label: string }[] = [
    { id: 'framework', label: 'Capital Deployment Record' },
    { id: 'onchain', label: 'On-Chain Layer' },
    { id: 'realassets', label: 'Real Assets' },
    { id: 'community', label: 'Community' },
    { id: 'log', label: `Log${logs.length > 0 ? ` (${logs.length})` : ''}` },
    { id: 'governance', label: 'Governance Migration' },
    { id: 'system', label: 'System Status' },
    { id: 'compliance', label: `Compliance${kycQueue.length > 0 || accredQueue.length > 0 ? ` (${kycQueue.length + accredQueue.length})` : ''}` },
    { id: 'banking', label: 'Banking' },
    { id: 'axauQueue', label: `AXAU Queue${axauQueue.filter(r => r.status === 'pending').length > 0 ? ` (${axauQueue.filter(r => r.status === 'pending').length})` : ''}` },
    { id: 'axiomRail', label: `Axiom Rail${railSummary ? ` (${(railSummary.byStatus.pending_user_transfer_start ?? 0) + (railSummary.byStatus.pending_external ?? 0) + (railSummary.byStatus.pending_anchor ?? 0)} pending)` : ''}` },
    { id: 'daoAccounts', label: `DAO Accounts${daoAccounts.filter(a => a.status === 'pending_review').length > 0 ? ` (${daoAccounts.filter(a => a.status === 'pending_review').length} pending)` : ''}` },
    { id: 'reserves', label: 'Reserves' },
  ];

  const primaryPool = pools.find(p => p.reserve0Label && p.reserve1Label) || pools[0] || null;
  const poolTvl = primaryPool?.tvlUsd != null ? Number(primaryPool.tvlUsd) : null;

  return (
    <DesignLawLayout>
      <Head>
        <title>Founder Operations | Axiom Protocol</title>
        <meta name="description" content="Axiom Protocol Proof-of-Execution Framework — systematic capital deployment across on-chain liquidity, real asset intelligence, and community coordination." />
      </Head>

      <PageShell
        title="Founder Operations"
        subtitle="Proof-of-Execution Framework — $500/month systematic deployment across on-chain, real asset, and community rails."
        disclosure="Internal operations dashboard. All on-chain data is live from Arbitrum One. Off-chain metrics reflect database state."
      >
        <>
            <div className="flex flex-wrap gap-0 border border-dl-border mb-6 bg-dl-bg-alt">
              <a href="/founder-ops/lending-review#kyc" className="flex items-center gap-2 px-5 py-3 border-r border-dl-border text-sm text-dl-navy hover:bg-dl-bg group">
                <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Admin</span>
                <span className="font-medium group-hover:text-dl-forest">KYC / Accreditation Review →</span>
              </a>
              <a href="/founder-ops/lending-review" className="flex items-center gap-2 px-5 py-3 border-r border-dl-border text-sm text-dl-navy hover:bg-dl-bg group">
                <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Admin</span>
                <span className="font-medium group-hover:text-dl-forest">Loan Applications →</span>
              </a>
              <a href="/founder-ops/playbook" className="flex items-center gap-2 px-5 py-3 text-sm text-dl-navy hover:bg-dl-bg group">
                <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Admin</span>
                <span className="font-medium group-hover:text-dl-forest">Founder Playbook →</span>
              </a>
            </div>

            <div className="flex flex-wrap gap-0 border-b border-dl-border mb-8">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'system') { loadOutcomes(); loadVariances(); }
                    if (tab.id === 'governance') { loadGovernanceStatus(); loadAdminActions(outcomeAdminKey || undefined); }
                    if (tab.id === 'banking') { loadBankingData(); }
                    if (tab.id === 'axauQueue') { loadAxauQueue(); }
                    if (tab.id === 'axiomRail') { loadAxiomRailSettlements(); loadRailSettlementDocs(); loadAllocPolicy(); }
                    if (tab.id === 'daoAccounts') { loadDaoAccounts(); }
                    if (tab.id === 'reserves') { loadReserves(); loadAllocPolicy(); loadLatestSettlement(); loadWalletBalance(); }
                  }}
                  className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-dl-navy text-dl-navy font-medium'
                      : 'border-transparent text-dl-gray hover:text-dl-navy'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB: PROOF OF EXECUTION ─────────────────────────────── */}
            {activeTab === 'framework' && (
              <>
                <div className="border border-dl-border mb-8 bg-dl-bg-alt">
                  <div className="px-6 py-5 border-b border-dl-border">
                    <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-3">Core Principle</p>
                    <p className="text-sm text-dl-navy leading-relaxed max-w-3xl">{FRAMEWORK_PRINCIPLE}</p>
                  </div>
                  <div className="px-6 py-4">
                    <p className="font-dl-mono text-xs text-dl-gray leading-relaxed">
                      The asset is not the only thing that matters. <strong className="text-dl-navy">The record matters.</strong>{' '}
                      Any founder can make claims. Very few can produce a timestamped, multi-layer, machine-verifiable operating history
                      that shows capital deployed, rails used, assets analyzed, groups coordinated, and infrastructure kept live over time.
                      That is what this framework builds.
                    </p>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Protocol Readiness Score</SectionHeading>
                  <div className="border border-dl-border">
                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-dl-border">
                      <div className="px-5 py-4">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">PRS Score</p>
                        {prsLoading ? (
                          <p className="font-dl-mono text-2xl font-bold text-dl-gray">—</p>
                        ) : prsData ? (
                          <p className="font-dl-mono text-2xl font-bold text-dl-navy">{prsData.prs.toFixed(1)} <span className="text-sm text-dl-gray font-normal">/ 10</span></p>
                        ) : (
                          <p className="font-dl-mono text-sm text-dl-gray">Unavailable</p>
                        )}
                      </div>
                      <div className="px-5 py-4">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Signal</p>
                        {prsData ? (
                          <p className={`font-dl-mono text-sm font-semibold ${
                            prsData.grade === 'FAVORABLE' ? 'text-dl-forest' :
                            prsData.grade === 'NEUTRAL' ? 'text-dl-navy' :
                            prsData.grade === 'CAUTION' ? 'text-dl-gold' : 'text-red-600'
                          }`}>{prsData.grade}</p>
                        ) : (
                          <p className="font-dl-mono text-sm text-dl-gray">—</p>
                        )}
                      </div>
                      <div className="px-5 py-4">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Intelligence Terminal</p>
                        <a href="/mirdt" className="font-dl-mono text-xs text-dl-navy underline hover:text-dl-forest">
                          Open Capital Intelligence Terminal →
                        </a>
                        {prsData && (
                          <div className="flex gap-1 mt-2">
                            {prsData.dimensions?.map((d) => (
                              <div
                                key={d.id}
                                className="flex-1 h-1.5"
                                style={{
                                  backgroundColor:
                                    d.grade === 'A' ? '#1D3D2A' :
                                    d.grade === 'B' ? '#1B2A4A' :
                                    d.grade === 'ALERT' ? '#DC2626' :
                                    '#B8973A',
                                }}
                                title={`${d.label}: ${d.grade}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Monthly Deployment — $500 / Month</SectionHeading>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-dl-border">
                    {LAYERS.map((layer, li) => (
                      <div key={layer.id} className={`${li < 2 ? 'border-b lg:border-b-0 lg:border-r' : ''} border-dl-border`}>
                        <div className="px-4 py-3 border-b border-dl-border bg-dl-bg-alt">
                          <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase tracking-wider">{layer.label}</p>
                          <p className="font-dl-mono text-xs text-dl-gold mt-0.5">{layer.monthly}</p>
                        </div>
                        {layer.buckets.map((b, bi) => (
                          <div key={b.label} className={`px-4 py-3 ${bi < layer.buckets.length - 1 ? 'border-b border-dl-border' : ''}`}>
                            <div className="flex items-baseline justify-between mb-1">
                              <p className="text-xs font-medium text-dl-navy">{b.label}</p>
                              <span className="font-dl-mono text-xs font-bold text-dl-navy ml-2 flex-shrink-0">{b.amount}</span>
                            </div>
                            <p className="text-xs text-dl-gray leading-relaxed mb-2">Proof: {b.proof}</p>
                            {b.route && (
                              <a href={b.route} className="font-dl-mono text-xs text-dl-navy underline hover:text-dl-forest">
                                {b.routeLabel} →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Live Layer Status</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-0 border border-dl-border">
                    <div className="px-4 py-4 border-b border-r border-dl-border">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">EulerSwap Pool TVL</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {poolsLoading ? '...' : poolTvl != null ? `$${poolTvl.toLocaleString()}` : '—'}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">
                        {primaryPool ? `${primaryPool.reserve0Label ?? 'USDC'}/${primaryPool.reserve1Label ?? 'AXUSD'} · ${primaryPool.status}` : 'On-chain liquidity layer'}
                      </p>
                    </div>
                    <div className="px-4 py-4 border-b border-r border-dl-border">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">earnAXUSD Vault</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {earnStats ? `$${earnStats.tvlUsd.toLocaleString()}` : '—'}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">
                        {earnStats ? `${earnStats.blendedApyPct}% APY · ${earnStats.status}` : 'Yield aggregation layer'}
                      </p>
                    </div>
                    <div className="px-4 py-4 border-b border-dl-border">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">AXUSD In Circulation</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {data ? parseFloat(data.axusd.totalSupply).toLocaleString() : '—'}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Protocol stablecoin supply</p>
                    </div>
                    <div className="px-4 py-4 border-r border-dl-border">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">Properties Analyzed</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {reportCount != null ? reportCount : '—'}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Total underwriting reports</p>
                    </div>
                    <div className="px-4 py-4 border-r border-dl-border">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">Active Deals</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {dealCount != null ? dealCount : '—'}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Land acquisition pipeline</p>
                    </div>
                    <div className="px-4 py-4">
                      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">Wealth Practice Groups</p>
                      <p className="font-dl-heading text-xl text-dl-navy">
                        {groupCount != null ? groupCount : '—'}
                      </p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Active coordination cycles</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Month-by-Month Progression</SectionHeading>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 border border-dl-border mb-6">
                    {MONTH_PROGRESSION.map((m, i) => (
                      <div key={m.month} className={`px-4 py-4 ${i < 3 ? 'border-b lg:border-b-0 lg:border-r' : ''} border-dl-border`}>
                        <p className="font-dl-mono text-xs font-semibold text-dl-gold uppercase tracking-wider mb-2">{m.label}</p>
                        <p className="text-xs text-dl-gray leading-relaxed">{m.notes}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border border-dl-border">
                    <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
                      <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase tracking-wider">Illustrative 12-Month Outcome</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dl-border">
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Layer</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">6 Months</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">12 Months</th>
                          </tr>
                        </thead>
                        <tbody>
                          {OUTCOME_ROWS.map((row, i) => (
                            <tr key={i} className={`border-b border-dl-border last:border-0 ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                              <td className="p-3 text-xs text-dl-navy">{row.layer}</td>
                              <td className="p-3 text-right font-dl-mono text-xs text-dl-gray">{row.m6}</td>
                              <td className="p-3 text-right font-dl-mono text-xs text-dl-navy font-medium">{row.m12}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── TAB: ON-CHAIN LAYER ─────────────────────────────────── */}
            {activeTab === 'onchain' && (
              <>
                {/* ── PSM ACTIVATION ───────────────────────────────────── */}
                <div className="mb-8">
                  <SectionHeading>Canonical PSM Activation</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed font-dl-mono">
                    The Canonical PSM (<span className="text-dl-navy">0xDB669bb6…</span>) must be registered as an agent on the AXUSD T-REX token before
                    mint and redeem are live. This calls <span className="text-dl-navy">addAgent(CANONICAL_PSM)</span> on
                    the AXUSD token using the deployer key. Safe to run multiple times — idempotent.
                  </p>

                  <div className="border border-dl-border p-4 bg-dl-bg-alt">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-dl-mono text-xs text-dl-gray uppercase">Agent Status:</span>
                        {psmAgentStatus === null ? (
                          <button onClick={checkPsmAgentStatus} className="font-dl-mono text-xs border border-dl-border text-dl-gray px-3 py-1">
                            Check On-Chain
                          </button>
                        ) : (
                          <span className={`font-dl-mono text-xs font-semibold px-2 py-0.5 border ${psmAgentStatus ? 'border-dl-forest text-dl-forest' : 'border-dl-gold text-dl-gold'}`}>
                            {psmAgentStatus ? 'ACTIVE' : 'PENDING ACTIVATION'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 items-center mb-3">
                      <input
                        type="password"
                        placeholder="Admin key"
                        value={psmActivateKey}
                        onChange={e => setPsmActivateKey(e.target.value)}
                        className="font-dl-mono text-xs border border-dl-border px-3 py-2 bg-dl-bg w-48"
                      />
                      <button
                        onClick={handleActivatePsm}
                        disabled={!psmActivateKey || psmActivating || psmAgentStatus === true}
                        className="bg-dl-navy text-white px-5 py-2 font-dl-mono text-xs disabled:opacity-40"
                      >
                        {psmActivating ? 'Activating…' : psmAgentStatus === true ? 'Already Active' : 'Activate PSM'}
                      </button>
                    </div>

                    {psmActivateMsg && (
                      <p className={`font-dl-mono text-xs ${psmActivateMsg.type === 'success' ? 'text-dl-forest' : 'text-red-600'}`}>
                        {psmActivateMsg.text}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>EulerSwap Pool Depth — $150 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Deploy $150/month into the USDC side of the live pool. This creates visible, verifiable on-chain
                    liquidity that any allocator, partner, or observer can inspect directly from the contract.
                  </p>
                  {pools.length === 0 ? (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">Loading pool data...</p>
                    </div>
                  ) : (
                    <div className="border border-dl-border">
                      <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
                        <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase">EulerSwap AXUSD / USDC Pool</p>
                      </div>
                      {pools.map((pool, i) => (
                        <div key={pool.id || pool.address} className={`${i < pools.length - 1 ? 'border-b border-dl-border' : ''}`}>
                          <div className="grid grid-cols-2 lg:grid-cols-5 gap-0">
                            <div className="px-4 py-3 border-r border-dl-border">
                              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Status</p>
                              <p className={`font-dl-mono text-sm font-bold ${pool.status === 'LIVE' ? 'text-dl-forest' : 'text-dl-gold'}`}>{pool.status}</p>
                            </div>
                            <div className="px-4 py-3 border-r border-dl-border">
                              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">TVL</p>
                              <p className="font-dl-mono text-sm font-bold text-dl-navy">${Number(pool.tvlUsd || 0).toLocaleString()}</p>
                            </div>
                            <div className="px-4 py-3 border-r border-dl-border">
                              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">{pool.reserve0Label || 'Token 0'} Reserve</p>
                              <p className="font-dl-mono text-sm font-bold text-dl-navy">{Number(pool.reserve0 || 0).toFixed(2)}</p>
                            </div>
                            <div className="px-4 py-3 border-r border-dl-border">
                              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">{pool.reserve1Label || 'Token 1'} Reserve</p>
                              <p className="font-dl-mono text-sm font-bold text-dl-navy">{Number(pool.reserve1 || 0).toFixed(2)}</p>
                            </div>
                            <div className="px-4 py-3">
                              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Fee</p>
                              <p className="font-dl-mono text-sm font-bold text-dl-navy">{pool.feeBps != null ? `${Number(pool.feeBps).toFixed(4)} bps` : '—'}</p>
                            </div>
                          </div>
                          <div className="px-4 py-2 border-t border-dl-border bg-dl-bg-alt">
                            <a href={`https://arbiscan.io/address/${pool.address}`} target="_blank" rel="noopener noreferrer"
                              className="font-dl-mono text-xs text-dl-gray underline">{pool.address}</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 border border-dl-border bg-dl-bg-alt px-4 py-3 flex items-center justify-between gap-4">
                    <p className="font-dl-mono text-xs text-dl-gray">
                      To add liquidity: <span className="text-dl-navy">USDC_AMOUNT=150 node scripts/add-pool-liquidity.js</span> — deposits USDC into EUSDC vault and reconfigures pool equilibrium.
                    </p>
                    <a href="/dex" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 whitespace-nowrap hover:bg-dl-navy hover:text-white flex-shrink-0">
                      Open Exchange →
                    </a>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>earnAXUSD Vault — $50 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Mint 50 AXUSD and deposit into the earnAXUSD vault each month. Creates a live yield history and
                    demonstrates that Axiom's yield-bearing rails are not theoretical.
                  </p>
                  {earnStats ? (
                    <div className="border border-dl-border">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
                        <div className="px-4 py-3 border-r border-dl-border">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Status</p>
                          <p className={`font-dl-mono text-sm font-bold ${earnStats.deployed ? 'text-dl-forest' : 'text-dl-gold'}`}>{earnStats.status}</p>
                        </div>
                        <div className="px-4 py-3 border-r border-dl-border">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">TVL</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">${earnStats.tvlUsd.toLocaleString()} AXUSD</p>
                        </div>
                        <div className="px-4 py-3 border-r border-dl-border">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Blended APY</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-forest">{earnStats.blendedApyPct}%</p>
                        </div>
                        <div className="px-4 py-3">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">AME Regime</p>
                          <p className={`font-dl-mono text-sm font-bold ${REGIME_COLORS[earnStats.ameRegime ?? ''] ?? 'text-dl-navy'}`}>
                            {earnStats.ameRegime ?? '—'}
                          </p>
                        </div>
                      </div>
                      <div className="px-4 py-2 border-t border-dl-border bg-dl-bg-alt flex items-center justify-between gap-4">
                        <a href="https://arbiscan.io/address/0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B" target="_blank" rel="noopener noreferrer"
                          className="font-dl-mono text-xs text-dl-gray underline">0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B</a>
                        <a href="/axusd-3643" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-1.5 whitespace-nowrap hover:bg-dl-navy hover:text-white flex-shrink-0">
                          Open Unified AXUSD →
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">Loading vault data...</p>
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <SectionHeading>AXM Accumulation — $25 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Accumulate AXM on a recurring basis. Demonstrates aligned governance exposure and long-term participation.
                    Each buy is timestamped on-chain. Over 12 months this builds a documented holding history.
                  </p>
                  <div className="border border-dl-border">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
                      <div className="px-4 py-3 border-b lg:border-b-0 border-r border-dl-border">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Proof Created</p>
                        <p className="text-xs text-dl-navy leading-relaxed">Documented holding history, governance alignment, recurring protocol commitment</p>
                      </div>
                      <div className="px-4 py-3 border-b lg:border-b-0 border-r border-dl-border">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">AXM Token</p>
                        <a href="https://arbiscan.io/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D" target="_blank" rel="noopener noreferrer"
                          className="font-dl-mono text-xs text-dl-navy underline">0x864F9c6f5…2539D</a>
                      </div>
                      <div className="px-4 py-3 border-b lg:border-b-0 border-r border-dl-border">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">6-Month Target</p>
                        <p className="font-dl-mono text-sm font-bold text-dl-navy">~$150 held</p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Execute</p>
                        <a href="/dex" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 inline-block hover:bg-dl-navy hover:text-white">
                          Open Exchange →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {data && (
                  <div className="mb-8">
                    <SectionHeading>Supporting Infrastructure</SectionHeading>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-dl-border">
                      <div className="px-4 py-3 border-r border-dl-border">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">EVK Vault (eAXUSD-6)</p>
                        <p className="font-dl-mono text-sm font-bold text-dl-navy">${data.euler.deposited}</p>
                        <p className="font-dl-mono text-xs text-dl-gray mt-1">{data.euler.utilization}% utilization</p>
                      </div>
                      <div className="px-4 py-3 border-r border-dl-border">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Supply APY</p>
                        <p className="font-dl-mono text-sm font-bold text-dl-forest">{data.euler.supplyAPY}%</p>
                      </div>
                      <div className="px-4 py-3 border-r border-dl-border">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Fee Routing</p>
                        <p className={`font-dl-mono text-sm font-bold ${data.euler.feeRoutingStatus === 'OPERATIONAL' ? 'text-dl-forest' : 'text-dl-gold'}`}>
                          {data.euler.feeRoutingStatus}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Interest Fee</p>
                        <p className="font-dl-mono text-sm font-bold text-dl-navy">{data.euler.interestFeePercent}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── TAB: REAL ASSETS ────────────────────────────────────── */}
            {activeTab === 'realassets' && (
              <>
                <div className="border border-dl-border mb-8 bg-dl-bg-alt px-5 py-4">
                  <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">Layer Objective — $175 / month</p>
                  <p className="text-sm text-dl-navy leading-relaxed max-w-2xl">
                    Link Axiom's digital rails to real-world asset progression. Each month produces documented deal advancement,
                    live report generation, and evidence of active acquisition activity — not placeholder activity.
                  </p>
                </div>

                <div className="mb-8">
                  <SectionHeading>Land Acquisition Pipeline — $100 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Deploy toward live deal progression: title work, survey costs, earnest money reserves, or parcel targeting.
                    Every dollar here has a timestamped deal record in the system.
                  </p>
                  <div className="border border-dl-border">
                    <div className="px-4 py-3 border-b border-dl-border bg-dl-bg-alt flex items-center justify-between">
                      <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase">Active Pipeline</p>
                      {dealCount != null && (
                        <span className="font-dl-mono text-xs text-dl-forest">{dealCount} deals in system</span>
                      )}
                    </div>
                    <div className="px-4 py-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Proof Created</p>
                          <p className="text-xs text-dl-navy leading-relaxed">Documented deal advancement, capital attached to real asset pipeline activity, timestamped movement from digital treasury to physical opportunity.</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">6-Month Target</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">~$600 deployed</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">12-Month Target</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">~$1,200 deployed</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <a href="/land" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 inline-block hover:bg-dl-navy hover:text-white">
                          Open Land Acquisition Console →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Property Analysis Reports — $50 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Run 1–2 live property analyses per month through the Property Analysis tool. Proves that
                    the intelligence layer is actively underwriting real opportunities, not sitting dormant.
                  </p>
                  <div className="border border-dl-border">
                    <div className="px-4 py-3 border-b border-dl-border bg-dl-bg-alt flex items-center justify-between">
                      <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase">Underwriting History</p>
                      {reportCount != null && (
                        <span className="font-dl-mono text-xs text-dl-forest">{reportCount} total reports</span>
                      )}
                    </div>
                    <div className="px-4 py-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Proof Created</p>
                          <p className="text-xs text-dl-navy leading-relaxed">Recurring underwriting activity, live report generation, real property evaluation history, growing intelligence dataset.</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">6-Month Target</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">12–18 reports</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">12-Month Target</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">24–36 reports</p>
                        </div>
                      </div>
                      <a href="/property" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 inline-block hover:bg-dl-navy hover:text-white">
                        Open Property Analysis →
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Deal Origination Inputs — $25 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Sourcing submissions, comps data, distressed lead inputs, or other live origination signals.
                    Supports the intake side of the real asset pipeline and keeps deal flow active.
                  </p>
                  <div className="border border-dl-border px-4 py-4 bg-dl-bg-alt">
                    <p className="font-dl-mono text-xs text-dl-gray mb-2">Proof Created</p>
                    <p className="text-xs text-dl-navy leading-relaxed">Continuous pipeline formation. Evidence of acquisition activity. Real market signal capture.</p>
                    <div className="mt-3">
                      <a href="/distressed-feed" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 inline-block hover:bg-dl-navy hover:text-white">
                        Open Deal Flow →
                      </a>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── TAB: COMMUNITY ──────────────────────────────────────── */}
            {activeTab === 'community' && (
              <>
                <div className="border border-dl-border mb-8 bg-dl-bg-alt px-5 py-4">
                  <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">Layer Objective — $100 / month</p>
                  <p className="text-sm text-dl-navy leading-relaxed max-w-2xl">
                    Prove that Axiom can coordinate recurring participant behavior, not just passive capital.
                    The community layer is the only layer that cannot be faked at scale — real participants, real cycles, real coordination.
                  </p>
                </div>

                <div className="mb-8">
                  <SectionHeading>Wealth Practice — $75 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Seed or contribute to an active group cycle. Proves that Axiom can coordinate recurring participant
                    behavior, not just passive capital.
                  </p>
                  <div className="border border-dl-border">
                    <div className="px-4 py-3 border-b border-dl-border bg-dl-bg-alt flex items-center justify-between">
                      <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase">Active Group Cycles</p>
                      {groupCount != null && (
                        <span className="font-dl-mono text-xs text-dl-forest">{groupCount} groups in system</span>
                      )}
                    </div>
                    <div className="px-4 py-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Proof Created</p>
                          <p className="text-xs text-dl-navy leading-relaxed">Live contribution cycles. Recurring community participation. Timestamped group mechanics. Real user coordination history.</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">6-Month Target</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">2–3 active groups</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">12-Month Target</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">4–6 active groups</p>
                        </div>
                      </div>
                      <a href="/wealth-practice" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 inline-block hover:bg-dl-navy hover:text-white">
                        Open Wealth Practice →
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Infrastructure Continuity — $25 / month</SectionHeading>
                  <p className="text-xs text-dl-gray mb-4 max-w-2xl leading-relaxed">
                    Allocate toward DePIN node costs, storage, or related operational continuity that keeps
                    the infrastructure layer active and observable.
                  </p>
                  <div className="border border-dl-border">
                    <div className="px-4 py-3 border-b border-dl-border bg-dl-bg-alt flex items-center justify-between">
                      <p className="font-dl-mono text-xs font-semibold text-dl-navy uppercase">DePIN Node Status</p>
                      {data && (
                        <span className="font-dl-mono text-xs text-dl-forest">{data.nodes.active} active / {data.nodes.total} total</span>
                      )}
                    </div>
                    <div className="px-4 py-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Proof Created</p>
                          <p className="text-xs text-dl-navy leading-relaxed">Continuity of core infrastructure. Evidence the system remains operational. Support for persistent network activity.</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Active Nodes</p>
                          <p className="font-dl-mono text-xl font-bold text-dl-navy">{data?.nodes.active ?? '—'}</p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Total Nodes</p>
                          <p className="font-dl-mono text-xl font-bold text-dl-navy">{data?.nodes.total ?? '—'}</p>
                        </div>
                      </div>
                      <a href="/depin/denet" className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 inline-block hover:bg-dl-navy hover:text-white">
                        Open DePIN Console →
                      </a>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── TAB: OPERATIONS LOG ─────────────────────────────────── */}
            {activeTab === 'log' && (
              <>
                <SectionHeading>Operations Log</SectionHeading>
                <p className="text-sm text-dl-gray mb-6 max-w-2xl">
                  Every action, failure, and fix documented with on-chain evidence where applicable.
                  This log is the timestamped execution record. Failures increase credibility when documented.
                </p>
                <DataTable
                  columns={logColumns}
                  data={logs}
                  keyExtractor={(e) => e.id}
                  emptyMessage="No operations logged yet. Log your first action via POST /api/founder-ops/log"
                />
              </>
            )}

            {/* ── TAB: GOVERNANCE MIGRATION ───────────────────────────── */}
            {activeTab === 'governance' && (
              <>
                <div className="border border-dl-border border-l-4 border-l-dl-gold px-6 py-4 mb-6 bg-dl-bg-alt">
                  <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gold mb-2">Governance Hardening — Task #42</p>
                  <p className="text-sm text-dl-navy leading-relaxed max-w-3xl">
                    The protocol currently operates under a single deployer EOA ({' '}
                    <span className="font-dl-mono text-xs">0x8d7892CF…4C96</span>) that holds most administrative roles.
                    This tracker shows which roles have been migrated to the Governance Safe (3-of-5) and which remain on the EOA pending migration.
                  </p>
                </div>

                {govLoading && (
                  <div className="border border-dl-border p-8 text-center mb-6">
                    <p className="font-dl-mono text-sm text-dl-gray">Loading governance status…</p>
                  </div>
                )}

                {!govLoading && !govStatus && (
                  <div className="border border-dl-border p-8 text-center mb-6">
                    <p className="font-dl-mono text-sm text-dl-gray">Click the Governance Migration tab to load status.</p>
                  </div>
                )}

                {govStatus && (
                  <>
                    <div className="mb-6">
                      <SectionHeading>Migration Summary</SectionHeading>
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-0 border border-dl-border">
                        <div className="px-4 py-4 border-r border-dl-border">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Total Roles</p>
                          <p className="font-dl-heading text-2xl text-dl-navy">{govStatus.summary.total}</p>
                        </div>
                        <div className="px-4 py-4 border-r border-dl-border">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Migrated to Safe</p>
                          <p className="font-dl-heading text-2xl text-dl-forest">{govStatus.summary.migrated}</p>
                        </div>
                        <div className="px-4 py-4 border-r border-dl-border">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Pending Migration</p>
                          <p className="font-dl-heading text-2xl text-dl-gold">{govStatus.summary.pending}</p>
                        </div>
                        <div className="px-4 py-4 border-r border-dl-border">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Migration %</p>
                          <p className="font-dl-heading text-2xl text-dl-navy">{govStatus.summary.migrationPct}%</p>
                        </div>
                        <div className="px-4 py-4">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Overall Risk</p>
                          <p className={`font-dl-heading text-xl ${
                            govStatus.riskLevel === 'CRITICAL' ? 'text-dl-error' :
                            govStatus.riskLevel === 'HIGH' ? 'text-dl-gold' :
                            govStatus.riskLevel === 'MEDIUM' ? 'text-dl-navy' : 'text-dl-forest'
                          }`}>{govStatus.riskLevel}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <SectionHeading>Key Addresses</SectionHeading>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-dl-border">
                        {[
                          { label: 'Governance Safe (3-of-5)', addr: govStatus.addresses.GOVERNANCE_SAFE, note: 'Treasury and emergency powers — primary multisig target', status: 'SAFE' },
                          { label: 'AXM Admin Safe', addr: govStatus.addresses.AXM_ADMIN_SAFE, note: 'AXM minting authority — already wired', status: 'SAFE' },
                          { label: 'Deployer EOA', addr: govStatus.addresses.DEPLOYER_EOA, note: 'Current holder of most admin roles — migration source', status: 'EOA' },
                          { label: 'Timelock Controller', addr: govStatus.addresses.TIMELOCK, note: '24h delay — target for DEFAULT_ADMIN and parameter changes', status: 'TIMELOCK' },
                        ].map((a, i) => (
                          <div key={a.addr} className={`px-5 py-4 ${i % 2 === 0 ? 'border-b lg:border-b-0 lg:border-r' : 'border-b last:border-0'} border-dl-border`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-dl-mono text-xs px-2 py-0.5 border ${
                                a.status === 'SAFE' ? 'border-dl-forest text-dl-forest' :
                                a.status === 'EOA' ? 'border-dl-gold text-dl-gold' :
                                'border-dl-navy text-dl-navy'
                              }`}>{a.status}</span>
                              <p className="text-sm font-medium text-dl-navy">{a.label}</p>
                            </div>
                            <a href={`https://arbiscan.io/address/${a.addr}`} target="_blank" rel="noopener noreferrer"
                              className="font-dl-mono text-xs text-dl-navy underline break-all">{a.addr}</a>
                            <p className="font-dl-mono text-xs text-dl-gray mt-1">{a.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <SectionHeading>Role Migration Tracker</SectionHeading>
                      <div className="border border-dl-border">
                        <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border grid grid-cols-5 gap-2">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase col-span-2">Role</p>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase">Current Holder</p>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase">Target</p>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase">Status</p>
                        </div>
                        {govStatus.roles.map((role: any, i: number) => (
                          <div key={role.id} className={`px-4 py-3 border-b border-dl-border last:border-0 ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                            <div className="grid grid-cols-5 gap-2 items-start">
                              <div className="col-span-2">
                                <p className="text-xs font-medium text-dl-navy">{role.role}</p>
                                <p className="font-dl-mono text-xs text-dl-gray mt-0.5 leading-relaxed">{role.description}</p>
                                <p className="font-dl-mono text-xs text-dl-gray mt-1">
                                  {role.contracts.slice(0, 2).join(' · ')}
                                  {role.contracts.length > 2 ? ` +${role.contracts.length - 2}` : ''}
                                </p>
                              </div>
                              <div>
                                <span className={`font-dl-mono text-xs px-1.5 py-0.5 border ${
                                  role.currentHolderType === 'SAFE' ? 'border-dl-forest text-dl-forest' :
                                  role.currentHolderType === 'EOA' ? 'border-dl-gold text-dl-gold' :
                                  role.currentHolderType === 'TIMELOCK' ? 'border-dl-navy text-dl-navy' :
                                  'border-dl-gray text-dl-gray'
                                }`}>{role.currentHolderType}</span>
                                <p className="font-dl-mono text-xs text-dl-gray mt-1 break-all">
                                  {role.currentHolder.slice(0, 10)}…{role.currentHolder.slice(-4)}
                                </p>
                              </div>
                              <div>
                                <span className={`font-dl-mono text-xs px-1.5 py-0.5 border ${
                                  role.targetHolderType === 'SAFE' ? 'border-dl-forest text-dl-forest' :
                                  role.targetHolderType === 'TIMELOCK' ? 'border-dl-navy text-dl-navy' :
                                  'border-dl-gray text-dl-gray'
                                }`}>{role.targetHolderType}</span>
                              </div>
                              <div>
                                {role.migrated ? (
                                  <span className="font-dl-mono text-xs text-dl-forest border border-dl-forest px-1.5 py-0.5">COMPLETE</span>
                                ) : (
                                  <span className={`font-dl-mono text-xs border px-1.5 py-0.5 ${
                                    role.riskLevel === 'critical' ? 'border-dl-error text-dl-error' :
                                    role.riskLevel === 'high' ? 'border-dl-gold text-dl-gold' :
                                    'border-dl-gray text-dl-gray'
                                  }`}>PENDING</span>
                                )}
                                <p className="font-dl-mono text-xs text-dl-gray mt-1 leading-relaxed">{role.migrationNote.replace('PENDING — ', '')}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <SectionHeading>Migration Checklist</SectionHeading>
                      <div className="border border-dl-border">
                        {[
                          { step: '1', title: 'Confirm Safe is operational', detail: 'Test Safe transaction signing with all 3 required signers. Verify app.safe.global shows Governance Safe at 0x2Bb2c2A7…', done: true },
                          { step: '2', title: 'Wire AXM Safe as token admin', detail: 'AXM_ADMIN_SAFE (0x9369…) holds MINTER_ROLE — verify via Arbiscan roles event.', done: true },
                          { step: '3', title: 'Transfer GUARDIAN_ROLE to Safe', detail: 'Execute: grantRole(GUARDIAN_ROLE, SAFE) on AXIOMCreditMarket + renounceRole(GUARDIAN_ROLE, EOA)', done: false },
                          { step: '4', title: 'Transfer RISK_COMMITTEE_ROLE to Safe', detail: 'Execute on AXIOMCreditMarket and RiskConfig via Safe transaction batch', done: false },
                          { step: '5', title: 'Transfer SETTLEMENT_AUTHORITY_ROLE to Safe', detail: 'Required before first external credit market borrower — execute on AXIOMFixedLoan', done: false },
                          { step: '6', title: 'Add Safe as Identity Registry agent', detail: 'Execute: addAgent(SAFE) on IdentityRegistry — allows Safe to register/update investors', done: false },
                          { step: '7', title: 'Transfer EVK vault governor', detail: 'Execute: setGovernor(SAFE) on eAXUSD-6 (0xacdA8780…)', done: false },
                          { step: '8', title: 'Grant DEFAULT_ADMIN_ROLE to Timelock', detail: 'Execute via Safe: grantRole(DEFAULT_ADMIN, TIMELOCK) then renounceRole(DEFAULT_ADMIN, EOA) — requires Timelock to be proposer-configured', done: false },
                          { step: '9', title: 'Wire EIP-1271 claim signing infrastructure', detail: 'Safe-aware claim signing required before migrating ClaimIssuer signing key from EOA to Safe', done: false },
                          { step: '10', title: 'Publish on-chain migration attestation', detail: 'Update disclosure page with final role registry — timestamp and post snapshot to IPFS for third-party verification', done: false },
                        ].map((item) => (
                          <div key={item.step} className={`flex items-start gap-4 px-5 py-3 border-b border-dl-border last:border-0 ${item.done ? 'bg-dl-bg' : 'bg-dl-bg'}`}>
                            <div className={`w-5 h-5 border flex-shrink-0 flex items-center justify-center mt-0.5 ${item.done ? 'border-dl-forest bg-dl-forest' : 'border-dl-border'}`}>
                              {item.done && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-dl-navy">Step {item.step}: {item.title}</p>
                              <p className="font-dl-mono text-xs text-dl-gray mt-0.5 leading-relaxed">{item.detail}</p>
                            </div>
                            <span className={`font-dl-mono text-xs px-2 py-0.5 border flex-shrink-0 ${item.done ? 'border-dl-forest text-dl-forest' : 'border-dl-gold text-dl-gold'}`}>
                              {item.done ? 'DONE' : 'PENDING'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <SectionHeading>Safe Transaction Links</SectionHeading>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-dl-border">
                        {[
                          { label: 'Governance Safe — app.safe.global', href: `https://app.safe.global/home?safe=arb1:${govStatus.addresses.GOVERNANCE_SAFE}`, note: '3-of-5 threshold — treasury and emergency powers' },
                          { label: 'AXM Admin Safe — app.safe.global', href: `https://app.safe.global/home?safe=arb1:${govStatus.addresses.AXM_ADMIN_SAFE}`, note: 'AXM minting authority' },
                          { label: 'Governance Safe — Arbiscan', href: `https://arbiscan.io/address/${govStatus.addresses.GOVERNANCE_SAFE}`, note: 'On-chain transaction history' },
                          { label: 'Deployer EOA — Arbiscan', href: `https://arbiscan.io/address/${govStatus.addresses.DEPLOYER_EOA}`, note: 'Current admin authority — migration source' },
                        ].map((link, i) => (
                          <div key={link.href} className={`px-5 py-4 ${i < 2 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'lg:border-r border-dl-border' : ''}`}>
                            <a href={link.href} target="_blank" rel="noopener noreferrer"
                              className="text-sm text-dl-navy underline hover:text-dl-forest font-medium">{link.label} →</a>
                            <p className="font-dl-mono text-xs text-dl-gray mt-1">{link.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <SectionHeading>Admin Action Log</SectionHeading>
                      <div className="border border-dl-border border-l-4 border-l-dl-navy px-5 py-3 mb-3 bg-dl-bg-alt">
                        <p className="font-dl-mono text-xs text-dl-gray">
                          Every mint, burn, freeze, claim issuance, registry update, and whitelist action is logged here.
                          All pending Safe proposals appear as <span className="text-dl-gold">PENDING_SAFE</span>.
                          Admin key required to view. See <code className="text-xs bg-dl-bg px-1">docs/emergency-powers-policy.md</code> for disclosure rules.
                        </p>
                      </div>
                      {adminActionsLoading && (
                        <div className="border border-dl-border p-6 text-center">
                          <p className="font-dl-mono text-sm text-dl-gray">Loading admin action log…</p>
                        </div>
                      )}
                      {!adminActionsLoading && adminActions.length === 0 && (
                        <div className="border border-dl-border">
                          <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
                            <p className="font-dl-mono text-xs text-dl-gray">
                              No actions logged yet — or admin key not provided. Enter your admin key in the System Status tab, then reload this tab.
                            </p>
                          </div>
                          <div className="px-4 py-3 text-center">
                            <p className="font-dl-mono text-xs text-dl-gray">
                              Log is populated when admin API endpoints (freeze, mint, claim issuance, etc.) are invoked.
                            </p>
                          </div>
                        </div>
                      )}
                      {!adminActionsLoading && adminActions.length > 0 && (
                        <div className="border border-dl-border">
                          <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border grid grid-cols-5 gap-2">
                            <p className="font-dl-mono text-xs text-dl-gray uppercase">Action</p>
                            <p className="font-dl-mono text-xs text-dl-gray uppercase">Caller</p>
                            <p className="font-dl-mono text-xs text-dl-gray uppercase">Target / Amount</p>
                            <p className="font-dl-mono text-xs text-dl-gray uppercase">Role</p>
                            <p className="font-dl-mono text-xs text-dl-gray uppercase">Status / Time</p>
                          </div>
                          {adminActions.map((action: any, i: number) => (
                            <div key={action.id} className={`px-4 py-3 border-b border-dl-border last:border-0 ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                              <div className="grid grid-cols-5 gap-2 items-start">
                                <div>
                                  <p className="font-dl-mono text-xs font-medium text-dl-navy">{action.actionType}</p>
                                </div>
                                <div>
                                  <p className="font-dl-mono text-xs text-dl-gray break-all">
                                    {action.callerAddress ? `${action.callerAddress.slice(0, 8)}…${action.callerAddress.slice(-4)}` : '—'}
                                  </p>
                                </div>
                                <div>
                                  {action.targetAddress && (
                                    <p className="font-dl-mono text-xs text-dl-gray">
                                      {`${action.targetAddress.slice(0, 8)}…${action.targetAddress.slice(-4)}`}
                                    </p>
                                  )}
                                  {action.amount && (
                                    <p className="font-dl-mono text-xs text-dl-navy">{action.amount} AXUSD</p>
                                  )}
                                  {action.txHash && (
                                    <a href={`https://arbiscan.io/tx/${action.txHash}`} target="_blank" rel="noopener noreferrer"
                                      className="font-dl-mono text-xs text-dl-navy underline">
                                      {`${action.txHash.slice(0, 8)}…`}
                                    </a>
                                  )}
                                </div>
                                <div>
                                  <span className="font-dl-mono text-xs text-dl-gray">{action.role ?? '—'}</span>
                                </div>
                                <div>
                                  <span className={`font-dl-mono text-xs px-1.5 py-0.5 border ${
                                    action.status === 'success' ? 'border-dl-forest text-dl-forest' :
                                    action.status === 'pending_safe' ? 'border-dl-gold text-dl-gold' :
                                    'border-dl-error text-dl-error'
                                  }`}>{action.status?.toUpperCase()}</span>
                                  <p className="font-dl-mono text-xs text-dl-gray mt-1">
                                    {new Date(action.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── TAB: SYSTEM STATUS ──────────────────────────────────── */}
            {activeTab === 'system' && !data && (
              <div className="border border-dl-border px-6 py-10 text-center">
                <p className="font-dl-mono text-sm text-dl-gray">{loading ? 'Loading system data…' : (error || 'System data unavailable.')}</p>
              </div>
            )}
            {activeTab === 'system' && data && (
              <>
                <div className="mb-8">
                  <SectionHeading>Sentinel Intelligence</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-dl-border">
                    <div className="px-4 py-4 border-r border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Market Regime</p>
                      <p className={`font-dl-heading text-lg ${REGIME_COLORS[data.sentinel.regime] || 'text-dl-navy'}`}>{data.sentinel.regime}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">{data.sentinel.regimeConfidence}% confidence</p>
                    </div>
                    <div className="px-4 py-4 border-r border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">System Stance</p>
                      <p className={`font-dl-heading text-lg ${STANCE_COLORS[data.sentinel.systemStance] || 'text-dl-navy'}`}>{data.sentinel.systemStance}</p>
                    </div>
                    <div className="px-4 py-4 border-r border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Signals</p>
                      <p className="font-dl-heading text-lg text-dl-navy">
                        {data.sentinel.qualifiedSignals} <span className="text-sm text-dl-gray">/ {data.sentinel.totalSignals}</span>
                      </p>
                    </div>
                    <div className="px-4 py-4">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Decisions</p>
                      <p className="font-dl-heading text-lg">
                        <span className="text-dl-forest">{data.sentinel.approvedDecisions}</span>
                        {' / '}
                        <span className="text-dl-error">{data.sentinel.deniedDecisions}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Treasury + Vault Positions</SectionHeading>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-dl-border">
                    <div className="px-4 py-3 border-r border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Euler Vault</p>
                      <p className="font-dl-heading text-lg text-dl-navy">${data.euler.deposited}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">{data.euler.utilization}% util · {data.euler.supplyAPY}% APY</p>
                    </div>
                    <div className="px-4 py-3 border-r border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Lending Fund</p>
                      <p className="font-dl-heading text-lg text-dl-navy">${data.lendingFund.tvl}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Share: ${data.lendingFund.sharePrice} · {data.lendingFund.activeLoans} loans</p>
                    </div>
                    <div className="px-4 py-3 border-r border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">AXUSD Supply</p>
                      <p className="font-dl-heading text-lg text-dl-navy">{parseFloat(data.axusd.totalSupply).toLocaleString()}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Treasury</p>
                      <p className="font-dl-heading text-lg text-dl-navy">{data.treasury.total}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Exposure: {data.treasury.currentExposure}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Mandatory Guard Rails</SectionHeading>
                  <div className="space-y-2">
                    {guardRails.map((gr) => {
                      const color = gr.status === 'PASS' || gr.status === 'ENFORCED' ? 'text-dl-forest' :
                        gr.status === 'WARNING' ? 'text-dl-gold' :
                        gr.status === 'LOADING' ? 'text-dl-gray' : 'text-dl-error';
                      const border = gr.status === 'PASS' || gr.status === 'ENFORCED' ? 'border-l-2 border-l-[#2D5F2D]' :
                        gr.status === 'WARNING' ? 'border-l-2 border-l-[#8B7355]' :
                        gr.status === 'LOADING' ? 'border-l-2 border-l-gray-300' : 'border-l-2 border-l-[#8B2500]';
                      return (
                        <div key={gr.id} className={`border border-dl-border p-3 ${border}`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs uppercase tracking-wider text-dl-navy">GR #{gr.id} — {gr.title}</p>
                            <span className={`text-xs font-dl-mono font-bold ${color}`}>{gr.status}</span>
                          </div>
                          <p className="text-xs text-dl-gray">{gr.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Fee Plumbing</SectionHeading>
                  <div className="border border-dl-border px-4 py-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Fee Recipient</p>
                        <p className={`font-dl-mono text-sm ${data.feePlumbing.eulerFeeRecipientSet ? 'text-dl-forest' : 'text-dl-error'}`}>
                          {data.feePlumbing.eulerFeeRecipientSet ? 'CONFIGURED' : 'NOT SET'}
                        </p>
                      </div>
                      <div>
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Revenue Router</p>
                        <p className={`font-dl-mono text-sm ${data.feePlumbing.revenueRouterConnected ? 'text-dl-forest' : 'text-dl-error'}`}>
                          {data.feePlumbing.revenueRouterConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                        </p>
                      </div>
                      <div>
                        <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Overall</p>
                        <p className={`font-dl-mono text-sm ${data.feePlumbing.status === 'OPERATIONAL' ? 'text-dl-forest' : 'text-dl-gold'}`}>
                          {data.feePlumbing.status}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionHeading>Admin Tools</SectionHeading>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
                    <a href="/founder-ops/lending-review" className="block px-5 py-4 border-r border-dl-border hover:bg-dl-bg-alt group">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Investor Verification</p>
                      <p className="font-dl-serif text-base text-dl-navy group-hover:text-dl-forest font-medium">KYC / Accreditation Review →</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Approve or reject pending investor accreditation records</p>
                    </a>
                    <a href="/founder-ops/lending-review" className="block px-5 py-4 border-r border-dl-border hover:bg-dl-bg-alt group">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Loan Applications</p>
                      <p className="font-dl-serif text-base text-dl-navy group-hover:text-dl-forest font-medium">Lending Review →</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Review and approve Fix &amp; Flip loan applications</p>
                    </a>
                    <a href="/founder-ops/playbook" className="block px-5 py-4 hover:bg-dl-bg-alt group">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Operations</p>
                      <p className="font-dl-serif text-base text-dl-navy group-hover:text-dl-forest font-medium">Founder Playbook →</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Monthly capital deployment playbook and action items</p>
                    </a>
                  </div>
                  <p className="font-dl-mono text-xs text-dl-gray mt-2">
                    All admin tools require the <span className="text-dl-navy">ADMIN_SOLVENCY_KEY</span> token to access.
                  </p>
                </div>

                <div className="mb-8">
                  <SectionHeading>Feed Ingestion</SectionHeading>
                  <p className="font-dl-mono text-xs text-dl-gray mb-3">
                    Triggers a full distressed property ingestion across all 10 target states (HUD, USDA, courthouse scrapers, tax liens, ATTOM). Requires admin key. This operation takes 2–5 minutes.
                  </p>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="password"
                      placeholder="Admin key"
                      value={ingestAdminKey}
                      onChange={e => setIngestAdminKey(e.target.value)}
                      className="font-dl-mono text-xs border border-dl-border px-3 py-2 bg-dl-bg w-48"
                    />
                    <button
                      onClick={async () => {
                        if (!ingestAdminKey) return;
                        setIngesting(true);
                        setIngestResult(null);
                        setIngestError(null);
                        try {
                          const res = await fetch('/api/distressed-feed/ingest', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-admin-key': ingestAdminKey },
                            body: JSON.stringify({}),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Ingestion failed');
                          setIngestResult(data.ingestion);
                        } catch (err: any) {
                          setIngestError(err.message);
                        } finally {
                          setIngesting(false);
                        }
                      }}
                      disabled={ingesting || !ingestAdminKey}
                      className="bg-dl-navy text-white px-4 py-2 font-dl-mono text-xs disabled:opacity-50"
                    >
                      {ingesting ? 'Running…' : 'Run Ingestion'}
                    </button>
                  </div>
                  {ingesting && (
                    <div className="border border-dl-border p-4 bg-dl-bg-alt">
                      <p className="font-dl-mono text-xs text-dl-gray animate-pulse">Ingestion in progress — fetching all sources. Do not close this tab…</p>
                    </div>
                  )}
                  {ingestError && (
                    <div className="border border-dl-error p-4">
                      <p className="font-dl-mono text-xs text-dl-error">{ingestError}</p>
                    </div>
                  )}
                  {ingestResult && (
                    <div className="border border-dl-border p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        {[
                          { label: 'Fetched', value: ingestResult.totalFetched },
                          { label: 'Inserted', value: ingestResult.totalInserted },
                          { label: 'Updated', value: ingestResult.totalUpdated },
                          { label: 'Skipped', value: ingestResult.totalSkipped },
                        ].map(m => (
                          <div key={m.label}>
                            <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">{m.label}</p>
                            <p className="font-dl-heading text-lg text-dl-navy">{m.value ?? 0}</p>
                          </div>
                        ))}
                      </div>
                      {ingestResult.sourceResults && (
                        <div className="border-t border-dl-border pt-3">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-2">By Source</p>
                          <div className="flex flex-wrap gap-2">
                            {ingestResult.sourceResults.map((sr: any) => (
                              <div key={sr.source} className="border border-dl-border px-2 py-1">
                                <span className="font-dl-mono text-xs text-dl-gray uppercase">{sr.source}</span>
                                <span className="font-dl-mono text-xs text-dl-navy ml-2">{sr.listings?.length ?? 0}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {ingestResult.errors && ingestResult.errors.length > 0 && (
                        <div className="border-t border-dl-border pt-3 mt-3">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Errors ({ingestResult.errors.length})</p>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {ingestResult.errors.slice(0, 10).map((e: string, i: number) => (
                              <p key={i} className="font-dl-mono text-xs text-dl-error">{e}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="font-dl-mono text-xs text-dl-gray mt-3">
                        Completed {new Date(ingestResult.completedAt).toLocaleString()}. Refresh the Deal Flow page to see updated listings.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <SectionHeading>Outcome Verification Queue</SectionHeading>

                  {/* Admin key + load */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="password"
                      placeholder="Admin key"
                      value={outcomeAdminKey}
                      onChange={e => setOutcomeAdminKey(e.target.value)}
                      className="font-dl-mono text-xs border border-dl-border px-3 py-2 bg-dl-bg w-48"
                    />
                    <button
                      onClick={() => loadOutcomes()}
                      disabled={outcomesLoading || !outcomeAdminKey}
                      className="bg-dl-navy text-white px-4 py-2 font-dl-mono text-xs disabled:opacity-50"
                    >
                      {outcomesLoading ? 'Loading…' : 'Load Queue'}
                    </button>
                  </div>

                  {outcomesLoading && (
                    <p className="font-dl-mono text-sm text-dl-gray py-4">Loading pending outcomes…</p>
                  )}

                  {!outcomesLoading && pendingOutcomes.length === 0 && (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-gray">No pending outcomes in queue.</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-1">Enter your admin key and click Load Queue to check.</p>
                    </div>
                  )}

                  {pendingOutcomes.map((o: any) => (
                    <div key={o.id} className="border border-dl-border mb-4 bg-dl-bg">
                      {/* Header */}
                      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-dl-border bg-dl-bg-alt">
                        <span className="font-dl-mono text-xs text-blue-700 bg-blue-50 border border-blue-300 px-1.5 py-0.5">UNDER REVIEW</span>
                        <p className="font-dl-serif text-sm text-dl-navy font-medium">
                          {o.deal_name || `Deal ${o.deal_id?.slice(0, 8)}…`}
                        </p>
                        {o.property_address && (
                          <p className="font-dl-mono text-xs text-dl-gray">{o.property_address}</p>
                        )}
                        <span className="ml-auto font-dl-mono text-xs text-dl-gray">
                          Submitted {formatUTC(o.submitted_at)}
                        </span>
                      </div>

                      {/* Deal metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-dl-border">
                        {[
                          { label: 'Rehab Cost', value: o.actual_rehab_cost ? `$${Number(o.actual_rehab_cost).toLocaleString()}` : '—' },
                          { label: 'Sale Price', value: o.actual_sale_price ? `$${Number(o.actual_sale_price).toLocaleString()}` : '—' },
                          { label: 'DSCR', value: o.actual_dscr ? Number(o.actual_dscr).toFixed(2) : '—' },
                          { label: 'Cash Flow / mo', value: o.actual_monthly_cash_flow ? `$${Number(o.actual_monthly_cash_flow).toLocaleString()}` : '—' },
                        ].map((m, i) => (
                          <div key={m.label} className={`px-4 py-3 ${i < 3 ? 'border-r border-dl-border' : ''}`}>
                            <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">{m.label}</p>
                            <p className="font-dl-mono text-sm text-dl-navy font-bold">{m.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Metadata */}
                      <div className="px-4 py-3 border-b border-dl-border grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-dl-mono text-dl-gray">
                        <div><span className="uppercase text-dl-gray mr-2">Funding:</span><span className="text-dl-navy">{o.funding_path?.replace(/_/g, ' ') || '—'}</span></div>
                        <div><span className="uppercase text-dl-gray mr-2">Lender:</span><span className="text-dl-navy">{o.lender_path_chosen || '—'}</span></div>
                        <div><span className="uppercase text-dl-gray mr-2">Timeline:</span><span className="text-dl-navy">{o.actual_timeline_days ? `${o.actual_timeline_days} days` : '—'}</span></div>
                        {o.meta?.contractorName && <div><span className="uppercase text-dl-gray mr-2">Contractor:</span><span className="text-dl-navy">{o.meta.contractorName}</span></div>}
                        {o.meta?.dispositionType && <div><span className="uppercase text-dl-gray mr-2">Disposition:</span><span className="text-dl-navy capitalize">{o.meta.dispositionType}</span></div>}
                        <div><span className="uppercase text-dl-gray mr-2">Submitted by:</span><span className="text-dl-navy">{o.submitted_by || '—'}</span></div>
                      </div>

                      {/* Variance data */}
                      {o.variances && o.variances.length > 0 && (
                        <div className="px-4 py-3 border-b border-dl-border">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase mb-2">Prediction vs Actual</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs font-dl-mono">
                              <thead>
                                <tr className="text-dl-gray">
                                  <th className="text-left pb-1">Metric</th>
                                  <th className="text-right pb-1">Predicted</th>
                                  <th className="text-right pb-1">Actual</th>
                                  <th className="text-right pb-1">Var %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {o.variances.map((v: any) => {
                                  const pct = Number(v.variance_pct);
                                  const color = pct > 15 ? 'text-dl-error' : pct < -15 ? 'text-dl-forest' : 'text-dl-navy';
                                  return (
                                    <tr key={v.metric_key} className="border-t border-dl-border">
                                      <td className="py-1 capitalize text-dl-gray">{v.metric_key.replace(/_/g, ' ')}</td>
                                      <td className="py-1 text-right">{Number(v.predicted_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                      <td className="py-1 text-right text-dl-navy">{Number(v.actual_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                      <td className={`py-1 text-right font-bold ${color}`}>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Review actions */}
                      <div className="px-4 py-4">
                        <textarea
                          placeholder="Review notes (optional)"
                          value={reviewNotes[o.id] || ''}
                          onChange={e => setReviewNotes(prev => ({ ...prev, [o.id]: e.target.value }))}
                          rows={2}
                          className="w-full font-dl-mono text-xs border border-dl-border px-3 py-2 bg-dl-bg resize-none mb-3"
                        />
                        {reviewMsg && reviewMsg.id === o.id && (
                          <p className={`font-dl-mono text-xs mb-3 ${reviewMsg.type === 'success' ? 'text-dl-forest' : 'text-dl-error'}`}>
                            {reviewMsg.text}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => reviewOutcome(o.id, 'approved')}
                            disabled={!!reviewingId || !outcomeAdminKey}
                            className="bg-dl-forest text-white px-4 py-2 font-dl-mono text-xs disabled:opacity-50"
                          >
                            {reviewingId === o.id ? 'Processing…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => reviewOutcome(o.id, 'rejected')}
                            disabled={!!reviewingId || !outcomeAdminKey}
                            className="border border-dl-error text-dl-error px-4 py-2 font-dl-mono text-xs disabled:opacity-50"
                          >
                            {reviewingId === o.id ? 'Processing…' : 'Reject'}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Permanently delete this outcome and all linked data?')) {
                                reviewOutcome(o.id, 'delete');
                              }
                            }}
                            disabled={!!reviewingId || !outcomeAdminKey}
                            className="border border-dl-border text-dl-gray px-4 py-2 font-dl-mono text-xs disabled:opacity-50 ml-auto"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mb-8">
                  <SectionHeading>Variance Tracking</SectionHeading>
                  <div className="flex gap-3 mb-4">
                    <button onClick={() => runCalibration(true)} disabled={calibrating}
                      className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-xs disabled:opacity-50">
                      {calibrating ? 'Running...' : 'Preview Calibration'}
                    </button>
                    <button onClick={() => runCalibration(false)} disabled={calibrating}
                      className="bg-dl-navy text-white px-4 py-2 font-dl-mono text-xs disabled:opacity-50">
                      {calibrating ? 'Applying...' : 'Apply Calibration'}
                    </button>
                  </div>
                  {calibrationError && <p className="font-dl-mono text-xs text-dl-error mb-4">{calibrationError}</p>}
                  {varianceLoading ? (
                    <p className="font-dl-mono text-sm text-dl-gray py-4">Loading variance data...</p>
                  ) : variances.length === 0 ? (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">No variance records yet.</p>
                      <p className="font-dl-mono text-xs text-dl-muted mt-1">Created when project outcomes are submitted with Cost Intelligence estimates on record.</p>
                    </div>
                  ) : (
                    <div className="border border-dl-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dl-border">
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Deal</th>
                            <th className="text-left p-3 text-xs uppercase tracking-wider text-dl-gray">Metric</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Predicted</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Actual</th>
                            <th className="text-right p-3 text-xs uppercase tracking-wider text-dl-gray">Var %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variances.map((v: any) => (
                            <tr key={v.id} className="border-b border-dl-border last:border-0">
                              <td className="p-3 font-dl-mono text-xs text-dl-navy">{v.deal_name || v.deal_id?.slice(0, 8) + '…'}</td>
                              <td className="p-3 font-dl-mono text-xs text-dl-gray capitalize">{v.metric_key?.replace(/_/g, ' ')}</td>
                              <td className="p-3 text-right font-dl-mono text-xs">{Number(v.predicted_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-dl-mono text-xs text-dl-navy">{Number(v.actual_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                              <td className={`p-3 text-right font-dl-mono text-xs font-bold ${Number(v.variance_pct) > 15 ? 'text-dl-error' : Number(v.variance_pct) < -15 ? 'text-dl-forest' : 'text-dl-navy'}`}>
                                {Number(v.variance_pct) > 0 ? '+' : ''}{Number(v.variance_pct).toFixed(2)}%
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

            {/* ── TAB: COMPLIANCE QUEUE ───────────────────────────────── */}
            {activeTab === 'compliance' && (
              <>
                <div className="mb-6">
                  <p className="font-dl-mono text-xs text-dl-gray mb-1">All compliance actions require the admin key. KYC approval issues Topics 1 and 3 atomically. Accreditation approval issues Topic 2 only — separate gated process.</p>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="password"
                      placeholder="Admin key"
                      value={complianceAdminKey}
                      onChange={e => setComplianceAdminKey(e.target.value)}
                      className="font-dl-mono text-xs border border-dl-border px-3 py-2 bg-dl-bg w-48"
                    />
                    <button
                      onClick={() => loadComplianceTab(complianceAdminKey)}
                      disabled={!complianceAdminKey}
                      className="bg-dl-navy text-white px-4 py-2 font-dl-mono text-xs disabled:opacity-40"
                    >
                      Load
                    </button>
                  </div>
                </div>

                {/* KYC Queue */}
                <div className="mb-8">
                  <SectionHeading>KYC Compliance Queue</SectionHeading>
                  <p className="font-dl-mono text-xs text-dl-gray mb-4">Pending KYC submissions awaiting review. Approve runs registerIdentity + issueClaim(Topic 1: KYC) + issueClaim(Topic 3: Sanctions) atomically.</p>
                  {kycLoading ? (
                    <p className="font-dl-mono text-sm text-dl-gray py-4">Loading KYC queue...</p>
                  ) : kycQueue.length === 0 ? (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">No pending KYC submissions.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {kycQueue.map((sub: any) => (
                        <div key={sub.id} className="border border-dl-border p-4 bg-dl-bg-alt">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div><p className="font-dl-mono text-xs text-dl-gray uppercase mb-0.5">Wallet</p><p className="font-dl-mono text-xs text-dl-navy break-all">{sub.walletAddress}</p></div>
                            <div><p className="font-dl-mono text-xs text-dl-gray uppercase mb-0.5">Name</p><p className="font-dl-mono text-xs">{sub.fullName}</p></div>
                            <div><p className="font-dl-mono text-xs text-dl-gray uppercase mb-0.5">Country</p><p className="font-dl-mono text-xs">{sub.country}</p></div>
                            <div><p className="font-dl-mono text-xs text-dl-gray uppercase mb-0.5">Submitted</p><p className="font-dl-mono text-xs">{sub.createdAt ? new Date(sub.createdAt).toISOString().slice(0, 10) : '—'}</p></div>
                          </div>
                          {kycMsg && kycMsg.id === sub.id && (
                            <p className={`font-dl-mono text-xs mb-3 ${kycMsg.type === 'success' ? 'text-dl-forest' : 'text-dl-error'}`}>{kycMsg.text}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mb-2">
                            {sub.status === 'submitted' && (
                              <button onClick={() => handleMarkUnderReview(sub.id)} disabled={!complianceAdminKey}
                                className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-xs disabled:opacity-40">
                                Mark Under Review
                              </button>
                            )}
                            <button onClick={() => handleKycAction(sub.id, 'approve')} disabled={!complianceAdminKey}
                              className="bg-dl-forest text-white px-4 py-2 font-dl-mono text-xs disabled:opacity-40">
                              Approve + Issue Claims
                            </button>
                            <button onClick={() => handleKycAction(sub.id, 'reject')} disabled={!complianceAdminKey}
                              className="border border-dl-error text-dl-error px-4 py-2 font-dl-mono text-xs disabled:opacity-40">
                              Reject
                            </button>
                            <button onClick={() => handleFetchClaimsForWallet(sub.id, sub.walletAddress)} disabled={!complianceAdminKey}
                              className="border border-dl-border text-dl-gray px-4 py-2 font-dl-mono text-xs disabled:opacity-40">
                              {loadingClaimsFor === sub.id ? 'Loading…' : kycClaimsMap[sub.id] ? 'Hide Claims' : 'View Active Claims'}
                            </button>
                          </div>
                          {kycClaimsMap[sub.id] && kycClaimsMap[sub.id].length === 0 && (
                            <p className="font-dl-mono text-xs text-dl-muted mt-1">No active claims for this wallet.</p>
                          )}
                          {kycClaimsMap[sub.id] && kycClaimsMap[sub.id].length > 0 && (
                            <div className="mt-2 border border-dl-border bg-white p-3">
                              <p className="font-dl-mono text-xs text-dl-gray uppercase mb-2">Active Claims — Revoke</p>
                              <div className="space-y-1">
                                {kycClaimsMap[sub.id].map((claim: any) => (
                                  <div key={claim.id} className="flex items-center justify-between gap-4">
                                    <span className="font-dl-mono text-xs text-dl-navy">
                                      T{claim.topic} ({({ 1: 'KYC', 2: 'Accred', 3: 'Sanctions' } as Record<number, string>)[claim.topic] ?? claim.topic}) — exp: {claim.expiresAt ? new Date(claim.expiresAt).toISOString().slice(0, 10) : '—'}
                                    </span>
                                    {revokeMsg && revokeMsg.id === claim.id && (
                                      <span className={`font-dl-mono text-xs ${revokeMsg.type === 'success' ? 'text-dl-forest' : 'text-dl-error'}`}>{revokeMsg.text}</span>
                                    )}
                                    <button
                                      onClick={() => handleRevoke(claim.id)}
                                      disabled={!!revokingId || !complianceAdminKey}
                                      className="border border-dl-error text-dl-error px-3 py-1 font-dl-mono text-xs disabled:opacity-40"
                                    >
                                      {revokingId === claim.id ? 'Revoking…' : 'Revoke'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Accreditation Queue */}
                <div className="mb-8">
                  <SectionHeading>Accreditation Queue</SectionHeading>
                  <p className="font-dl-mono text-xs text-dl-gray mb-4">Pending accreditation (Topic 2: Accredited Investor) submissions. Requires separate explicit approval — does not auto-approve with KYC.</p>
                  {accredLoading ? (
                    <p className="font-dl-mono text-sm text-dl-gray py-4">Loading accreditation queue...</p>
                  ) : accredQueue.length === 0 ? (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">No pending accreditation submissions.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {accredQueue.map((sub: any) => (
                        <div key={sub.id} className="border border-dl-border p-4 bg-dl-bg-alt">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div><p className="font-dl-mono text-xs text-dl-gray uppercase mb-0.5">Wallet</p><p className="font-dl-mono text-xs text-dl-navy break-all">{sub.walletAddress}</p></div>
                            <div><p className="font-dl-mono text-xs text-dl-gray uppercase mb-0.5">Basis</p><p className="font-dl-mono text-xs">{sub.accreditationBasis ?? '—'}</p></div>
                            <div><p className="font-dl-mono text-xs text-dl-gray uppercase mb-0.5">Self-Cert</p><p className="font-dl-mono text-xs">{sub.selfCertification ? 'Yes' : 'No'}</p></div>
                            <div><p className="font-dl-mono text-xs text-dl-gray uppercase mb-0.5">Submitted</p><p className="font-dl-mono text-xs">{sub.createdAt ? new Date(sub.createdAt).toISOString().slice(0, 10) : '—'}</p></div>
                          </div>
                          {sub.notes && <p className="font-dl-mono text-xs text-dl-gray mb-3 italic">{sub.notes}</p>}
                          {accredMsg && accredMsg.id === sub.id && (
                            <p className={`font-dl-mono text-xs mb-3 ${accredMsg.type === 'success' ? 'text-dl-forest' : 'text-dl-error'}`}>{accredMsg.text}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => handleAccredAction(sub.id, 'approve')} disabled={!complianceAdminKey}
                              className="bg-dl-forest text-white px-4 py-2 font-dl-mono text-xs disabled:opacity-40">
                              Issue Topic 2
                            </button>
                            <button onClick={() => handleAccredAction(sub.id, 'reject')} disabled={!complianceAdminKey}
                              className="border border-dl-error text-dl-error px-4 py-2 font-dl-mono text-xs disabled:opacity-40">
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expiry Check Trigger */}
                <div className="mb-8 border border-dl-border p-4 bg-dl-bg-alt">
                  <SectionHeading>Expiry Alert Job</SectionHeading>
                  <p className="font-dl-mono text-xs text-dl-gray mb-3">Daily expiry scan runs automatically at 08:00 UTC via Vercel Cron (<code className="font-dl-mono">0 8 * * *</code>). Run manually to scan now and send email alerts for claims expiring within 30 days.</p>
                  <div className="flex items-center gap-3">
                    <button onClick={handleTriggerExpiryCheck} disabled={!complianceAdminKey || expiryTriggering}
                      className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-xs disabled:opacity-40">
                      {expiryTriggering ? 'Running…' : 'Run Expiry Check Now'}
                    </button>
                    {expiryTriggerMsg && (
                      <span className={`font-dl-mono text-xs ${expiryTriggerMsg.startsWith('Error') ? 'text-dl-error' : 'text-dl-forest'}`}>{expiryTriggerMsg}</span>
                    )}
                  </div>
                </div>

                {/* Compliance Event Log */}
                <div className="mb-8">
                  <SectionHeading>Compliance Event Log</SectionHeading>
                  <p className="font-dl-mono text-xs text-dl-gray mb-4">Unified compliance stream: claim issuances, renewals, revocations, expiry alerts, and AXUSD transfer-block events. Operator / issuer column shows the authorizing address for each event.</p>
                  {complianceLogLoading ? (
                    <p className="font-dl-mono text-sm text-dl-gray py-4">Loading compliance log...</p>
                  ) : complianceLog.length === 0 ? (
                    <div className="border border-dl-border p-6 text-center">
                      <p className="font-dl-mono text-sm text-dl-muted">No compliance events logged yet.</p>
                    </div>
                  ) : (
                    <div className="border border-dl-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dl-border bg-dl-bg-alt">
                            <th className="text-left p-3 font-dl-mono text-xs uppercase tracking-wider text-dl-gray">Timestamp</th>
                            <th className="text-left p-3 font-dl-mono text-xs uppercase tracking-wider text-dl-gray">Wallet</th>
                            <th className="text-left p-3 font-dl-mono text-xs uppercase tracking-wider text-dl-gray">Action</th>
                            <th className="text-left p-3 font-dl-mono text-xs uppercase tracking-wider text-dl-gray">Topic</th>
                            <th className="text-left p-3 font-dl-mono text-xs uppercase tracking-wider text-dl-gray">Issuer / Operator</th>
                            <th className="text-left p-3 font-dl-mono text-xs uppercase tracking-wider text-dl-gray">Result</th>
                            <th className="text-left p-3 font-dl-mono text-xs uppercase tracking-wider text-dl-gray">TX / Claim</th>
                            <th className="text-left p-3 font-dl-mono text-xs uppercase tracking-wider text-dl-gray">Revoke</th>
                          </tr>
                        </thead>
                        <tbody>
                          {complianceLog.map((entry: any) => (
                            <tr key={entry.id} className={`border-b border-dl-border last:border-0 hover:bg-dl-bg-alt ${entry.eventType === 'transfer_compliance' ? 'bg-yellow-50/30' : ''}`}>
                              <td className="p-3 font-dl-mono text-xs text-dl-gray whitespace-nowrap">{entry.createdAt ? new Date(entry.createdAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : '—'}</td>
                              <td className="p-3 font-dl-mono text-xs text-dl-navy break-all max-w-[120px]">{entry.wallet?.slice(0, 8)}…{entry.wallet?.slice(-4)}</td>
                              <td className="p-3 font-dl-mono text-xs uppercase text-dl-navy">
                                {entry.eventType === 'transfer_compliance'
                                  ? <span className={entry.action === 'transfer_blocked' ? 'text-dl-error' : 'text-dl-forest'}>{entry.action.replace('_', ' ')}</span>
                                  : entry.action}
                              </td>
                              <td className="p-3 font-dl-mono text-xs">{entry.topic ? ({ 1: 'KYC', 2: 'Accred', 3: 'Sanctions' } as Record<number, string>)[entry.topic] ?? `T${entry.topic}` : (entry.eventType === 'transfer_compliance' ? 'Transfer' : '—')}</td>
                              <td className="p-3 font-dl-mono text-xs text-dl-gray">
                                {entry.operatorAddress
                                  ? <span title={entry.operatorAddress}>{entry.operatorAddress.slice(0, 6)}…{entry.operatorAddress.slice(-4)}</span>
                                  : <span className="text-dl-muted">ClaimIssuer</span>}
                              </td>
                              <td className="p-3 font-dl-mono text-xs">
                                <span className={`uppercase ${entry.result === 'success' ? 'text-dl-forest' : entry.result === 'blocked' || entry.result === 'rejected' ? 'text-dl-error' : 'text-dl-gold'}`}>
                                  {entry.result}
                                </span>
                              </td>
                              <td className="p-3 font-dl-mono text-xs">
                                {entry.txHash ? (
                                  <a href={`https://arbiscan.io/tx/${entry.txHash}`} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline">
                                    {entry.txHash.slice(0, 8)}…
                                  </a>
                                ) : entry.claimId ? (
                                  <span className="text-dl-gray">{entry.claimId.slice(0, 8)}…</span>
                                ) : '—'}
                              </td>
                              <td className="p-3">
                                {entry.claimId && entry.action === 'issuance' ? (
                                  <>
                                    {revokeMsg && revokeMsg.id === entry.claimId && (
                                      <p className={`font-dl-mono text-xs mb-1 ${revokeMsg.type === 'success' ? 'text-dl-forest' : 'text-dl-error'}`}>{revokeMsg.text}</p>
                                    )}
                                    <button
                                      onClick={() => handleRevoke(entry.claimId)}
                                      disabled={!!revokingId || !complianceAdminKey}
                                      className="border border-dl-error text-dl-error px-3 py-1 font-dl-mono text-xs disabled:opacity-40"
                                    >
                                      {revokingId === entry.claimId ? 'Revoking…' : 'Revoke'}
                                    </button>
                                  </>
                                ) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Circle Screening Panel */}
                <div className="mb-8">
                  <SectionHeading>Circle Address Screening</SectionHeading>
                  <p className="font-dl-mono text-xs text-dl-gray mb-4">
                    Circle Compliance Engine results. Screening runs as a pre-check on all new ERC-3643 credential applications. Fallback mode (APPROVED) when Circle API key is absent.
                  </p>
                  {circleScreeningLoading ? (
                    <p className="font-dl-mono text-sm text-dl-gray py-4">Loading screening data...</p>
                  ) : !circleScreening ? (
                    <div className="border border-dl-border p-4 bg-dl-bg-alt">
                      <p className="font-dl-mono text-xs text-dl-muted">Load compliance tab to view screening results.</p>
                    </div>
                  ) : (
                    <>
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 mb-4 border font-dl-mono text-xs ${circleScreening.circleConfigured ? 'border-dl-forest text-dl-forest bg-dl-bg-alt' : 'border-dl-gold text-dl-gold bg-dl-bg-alt'}`}>
                        {circleScreening.circleConfigured ? '● CIRCLE API ACTIVE' : '○ FALLBACK MODE — CIRCLE_COMPLIANCE_API_KEY not set'}
                      </div>
                      <div className="grid grid-cols-4 gap-0 border border-dl-border mb-6">
                        {[
                          { label: 'Total Screened', value: circleScreening.stats.total, color: 'text-dl-navy' },
                          { label: 'Approved', value: circleScreening.stats.approved, color: 'text-dl-forest' },
                          { label: 'Denied', value: circleScreening.stats.denied, color: 'text-red-600' },
                          { label: 'Review', value: circleScreening.stats.review, color: 'text-dl-gold' },
                        ].map((s, i) => (
                          <div key={s.label} className={`px-4 py-3 text-center ${i < 3 ? 'border-r border-dl-border' : ''}`}>
                            <p className={`font-dl-mono text-xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      {circleScreening.denied.length > 0 && (
                        <div className="mb-6">
                          <p className="font-dl-mono text-xs text-red-600 uppercase tracking-wider mb-2">Denied Addresses</p>
                          <div className="border border-red-200 overflow-x-auto">
                            <table className="w-full text-xs font-dl-mono">
                              <thead><tr className="bg-red-50 border-b border-red-200">
                                <th className="text-left px-3 py-2 text-dl-gray">Wallet</th>
                                <th className="text-left px-3 py-2 text-dl-gray">Risk Score</th>
                                <th className="text-left px-3 py-2 text-dl-gray">Categories</th>
                                <th className="text-left px-3 py-2 text-dl-gray">Screened</th>
                              </tr></thead>
                              <tbody>
                                {circleScreening.denied.map((d: any, i: number) => (
                                  <tr key={i} className="border-b border-red-100">
                                    <td className="px-3 py-2 text-red-700 break-all">{d.wallet_address}</td>
                                    <td className="px-3 py-2 text-red-700">{d.risk_score}</td>
                                    <td className="px-3 py-2 text-red-700">{(d.risk_categories ?? []).join(', ') || '—'}</td>
                                    <td className="px-3 py-2 text-dl-gray">{d.screened_at ? new Date(d.screened_at).toISOString().slice(0, 10) : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      {circleScreening.recent.length > 0 && (
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">Recent Screenings (last 20)</p>
                          <div className="border border-dl-border overflow-x-auto">
                            <table className="w-full text-xs font-dl-mono">
                              <thead><tr className="bg-dl-bg-alt border-b border-dl-border">
                                <th className="text-left px-3 py-2 text-dl-gray">Wallet</th>
                                <th className="text-left px-3 py-2 text-dl-gray">Result</th>
                                <th className="text-left px-3 py-2 text-dl-gray">Score</th>
                                <th className="text-left px-3 py-2 text-dl-gray">Source</th>
                                <th className="text-left px-3 py-2 text-dl-gray">Date</th>
                              </tr></thead>
                              <tbody>
                                {circleScreening.recent.map((r: any, i: number) => (
                                  <tr key={i} className="border-b border-dl-border">
                                    <td className="px-3 py-2 text-dl-navy break-all">{r.wallet_address}</td>
                                    <td className={`px-3 py-2 font-bold ${r.result === 'APPROVED' ? 'text-dl-forest' : r.result === 'DENIED' ? 'text-red-600' : 'text-dl-gold'}`}>{r.result}</td>
                                    <td className="px-3 py-2">{r.risk_score}</td>
                                    <td className="px-3 py-2 text-dl-gray">DB cache</td>
                                    <td className="px-3 py-2 text-dl-gray">{r.screened_at ? new Date(r.screened_at).toISOString().slice(0, 10) : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      <div className="mt-4 border border-dl-border p-3 bg-dl-bg-alt">
                        <p className="font-dl-mono text-xs text-dl-gray">
                          <strong className="text-dl-navy">Webhook registration:</strong> Register <code className="bg-dl-bg px-1">/api/webhooks/circle</code> in the Circle Developer Console once your API key is active. The endpoint supports ECDSA SHA-256 verification, IP allowlisting, and idempotency.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── TAB: BANKING ──────────────────────────────────────── */}
            {activeTab === 'banking' && (
              <>
                <div className="mb-6">
                  <h2 className="font-dl-serif text-xl text-dl-navy mb-1">Banking Infrastructure</h2>
                  <p className="font-dl-mono text-xs text-dl-gray">ACH / Wire Settlement Rail</p>
                </div>

                <div className="border border-dl-border bg-dl-bg-alt px-6 py-5 mb-6">
                  <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">Rail Status — Offline</p>
                  <p className="text-sm text-dl-gray leading-relaxed">
                    ACH/wire banking infrastructure is currently offline. The full settlement dashboard and transaction history will be available when rails are restored.
                  </p>
                </div>

              </>
            )}

            {/* ── TAB: AXAU QUEUE ──────────────────────────────────── */}
            {activeTab === 'axauQueue' && (
              <>
                <div className="mb-6">
                  <h2 className="font-dl-serif text-xl text-dl-navy mb-1">AXAU Purchase Queue</h2>
                  <p className="font-dl-mono text-xs text-dl-gray">Vault Buffer · Pending Purchase Requests · Auto-Fulfillment</p>
                </div>

                {/* Vault stats strip */}
                {axauVault && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-4 bg-dl-bg-alt">
                    {[
                      { label: 'XAU / USD', value: `$${axauVault.xauUsdPrice}` },
                      { label: 'MINT NAV', value: `$${parseFloat(axauVault.mintNavPerToken ?? '0').toFixed(4)}` },
                      { label: 'COVERAGE', value: axauVault.coverageRatioPct ?? '—' },
                      { label: 'MINT STATUS', value: axauVault.mintPaused ? 'PAUSED' : 'ACTIVE', red: axauVault.mintPaused },
                    ].map((item, i) => (
                      <div key={i} className="p-4 border-r border-dl-border last:border-r-0">
                        <p className="font-dl-mono text-[9px] text-dl-gray uppercase tracking-wider mb-1">{item.label}</p>
                        <p className={`font-dl-mono text-sm font-bold ${item.red ? 'text-red-700' : 'text-dl-navy'}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Vault Buffer panel */}
                {axauBuffer ? (
                  <div className={`border mb-6 ${axauBuffer.bufferCapacity === 'SUFFICIENT' ? 'border-dl-forest bg-green-50' : axauBuffer.bufferCapacity === 'DEPLETED' ? 'border-dl-error bg-red-50' : 'border-yellow-400 bg-yellow-50'}`}>
                    <div className="px-5 py-3 border-b border-inherit flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className={`font-dl-mono text-[9px] px-2 py-0.5 uppercase tracking-wider border ${axauBuffer.bufferCapacity === 'SUFFICIENT' ? 'border-dl-forest text-dl-forest' : axauBuffer.bufferCapacity === 'DEPLETED' ? 'border-dl-error text-dl-error' : 'border-yellow-500 text-yellow-700'}`}>
                          {axauBuffer.bufferCapacity === 'SUFFICIENT' ? 'BUFFER SUFFICIENT' : axauBuffer.bufferCapacity === 'DEPLETED' ? 'BUFFER DEPLETED' : 'BUFFER PARTIAL'}
                        </span>
                        <p className="font-dl-mono text-xs text-dl-navy font-bold">Vault Pre-Fund Buffer</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {axauBuffer.axauCoversOrders ? (
                          <span className="font-dl-mono text-[9px] border border-dl-forest text-dl-forest px-2 py-0.5 uppercase tracking-wider">PATH A — AXAU RESERVE</span>
                        ) : (
                          <span className="font-dl-mono text-[9px] border border-dl-navy text-dl-navy px-2 py-0.5 uppercase tracking-wider">PATH B — PAXG MINT</span>
                        )}
                        {axauBuffer.mintPaused && (
                          <span className="font-dl-mono text-[9px] border border-dl-error text-dl-error px-2 py-0.5 uppercase tracking-wider">MINT PAUSED</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-inherit">
                      {[
                        { label: 'AXAU Reserve (buffer)', value: `${parseFloat(axauBuffer.axauBalanceFormatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} AXAU` },
                        { label: 'PAXG in Wallet', value: `${axauBuffer.paxgBalanceFormatted} PAXG` },
                        { label: 'Pending Orders (AXAU)', value: `${parseFloat(axauBuffer.pendingAxauTotal ?? '0').toLocaleString(undefined, { maximumFractionDigits: 4 })} AXAU` },
                        { label: 'Pending Orders (AXUSD)', value: `$${parseFloat(axauBuffer.pendingAxusdTotal).toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
                      ].map(stat => (
                        <div key={stat.label} className="px-5 py-3">
                          <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider mb-1">{stat.label}</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-2 border-t border-inherit">
                      <p className="font-dl-mono text-[9px] text-dl-gray">
                        Buffer wallet: <span className="text-dl-navy">{axauBuffer.deployerAddress}</span>
                        {' · '}PATH A uses pre-minted AXAU (zero PAXG, 1 tx). PATH B mints from PAXG (2 tx).
                        {' · '}To reload PATH A, send AXAU or PAXG to this address on Arbitrum One.
                      </p>
                    </div>
                  </div>
                ) : axauBufferLoading ? (
                  <div className="border border-dl-border p-4 mb-6">
                    <p className="font-dl-mono text-xs text-dl-gray">Loading vault buffer…</p>
                  </div>
                ) : axauQueueAdminKey ? (
                  <div className="border border-dl-border p-4 mb-6">
                    <p className="font-dl-mono text-xs text-dl-gray">Vault buffer unavailable. Check that the deployer key is configured.</p>
                  </div>
                ) : null}

                {/* Queue summary cards */}
                {axauQueue.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Pending', value: axauQueue.filter(r => r.status === 'pending').length, color: 'text-yellow-700' },
                      { label: 'Processing', value: axauQueue.filter(r => r.status === 'processing').length, color: 'text-blue-700' },
                      { label: 'Fulfilled', value: axauQueue.filter(r => r.status === 'fulfilled').length, color: 'text-dl-forest' },
                      { label: 'Total AXUSD Pending', value: axauQueue.filter(r => r.status === 'pending').reduce((s: number, r: any) => s + parseFloat(r.axusdAmount ?? 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 }), color: 'text-dl-navy' },
                    ].map(card => (
                      <div key={card.label} className="border border-dl-border bg-dl-bg-alt p-4">
                        <p className="font-dl-mono text-[9px] text-dl-gray uppercase tracking-wider mb-1">{card.label}</p>
                        <p className={`font-dl-mono text-lg font-bold ${card.color}`}>{card.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin key + refresh */}
                <div className="flex gap-3 items-center mb-5 flex-wrap">
                  <input
                    type="password"
                    placeholder="Admin key to load queue"
                    value={axauQueueAdminKey}
                    onChange={e => setAxauQueueAdminKey(e.target.value)}
                    className="font-dl-mono text-xs border border-dl-border px-3 py-2 bg-dl-surface w-64 outline-none"
                  />
                  <button
                    onClick={() => loadAxauQueue(axauQueueAdminKey)}
                    className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 uppercase tracking-wider hover:bg-dl-navy hover:text-white transition-colors"
                  >
                    {axauQueueLoading ? 'Loading…' : 'Refresh Queue'}
                  </button>
                  <a href="/axau-buy" target="_blank" rel="noopener noreferrer" className="font-dl-mono text-xs border border-dl-border text-dl-gray px-4 py-2 uppercase tracking-wider hover:text-dl-navy">
                    Buy Page ↗
                  </a>
                </div>

                {axauQueueError && (
                  <div className="border border-dl-error p-4 mb-4">
                    <p className="font-dl-mono text-xs text-dl-error">{axauQueueError}</p>
                  </div>
                )}

                {axauQueueLoading && !axauQueue.length && (
                  <p className="font-dl-mono text-xs text-dl-gray">Loading purchase queue…</p>
                )}

                {!axauQueueLoading && axauQueue.length === 0 && !axauQueueError && (
                  <div className="border border-dl-border p-8 text-center">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">No purchase requests found</p>
                    <p className="font-dl-serif text-sm text-dl-gray mt-2">Enter admin key and click Refresh Queue to load data.</p>
                  </div>
                )}

                {axauQueue.length > 0 && (
                  <div className="overflow-x-auto border border-dl-border">
                    <table className="w-full text-left min-w-[900px]">
                      <thead>
                        <tr className="bg-dl-bg-alt border-b border-dl-border">
                          {['ID', 'Wallet', 'AXUSD', 'AXAU Quoted', 'XAU Price', 'Email', 'Status', 'Submitted', 'Actions'].map(h => (
                            <th key={h} className="font-dl-mono text-[9px] text-dl-gray uppercase tracking-wider px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {axauQueue.map((req: any) => {
                          const shortId = req.id?.slice(0, 8)?.toUpperCase();
                          const shortWallet = req.walletAddress ? `${req.walletAddress.slice(0, 6)}…${req.walletAddress.slice(-4)}` : '—';
                          const statusColors: Record<string, string> = {
                            pending:    'border-yellow-400 text-yellow-700 bg-yellow-50',
                            processing: 'border-blue-400 text-blue-700 bg-blue-50',
                            fulfilled:  'border-dl-forest text-dl-forest bg-green-50',
                            failed:     'border-dl-error text-dl-error bg-red-50',
                          };
                          const sc = statusColors[req.status] ?? 'border-dl-border text-dl-gray';
                          const isBusy = axauFulfilling === req.id;

                          return (
                            <tr key={req.id} className="border-b border-dl-border hover:bg-dl-bg-alt">
                              <td className="px-4 py-3 font-dl-mono text-xs text-dl-navy">#{shortId}</td>
                              <td className="px-4 py-3 font-dl-mono text-xs text-dl-gray" title={req.walletAddress}>{shortWallet}</td>
                              <td className="px-4 py-3 font-dl-mono text-xs text-dl-navy font-bold">
                                {parseFloat(req.axusdAmount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 font-dl-mono text-xs" style={{ color: '#b8860b', fontWeight: 700 }}>
                                {parseFloat(req.axauQuoted ?? 0).toFixed(6)}
                              </td>
                              <td className="px-4 py-3 font-dl-mono text-xs text-dl-gray">
                                {req.xauUsdPrice ? `$${parseFloat(req.xauUsdPrice).toLocaleString()}` : '—'}
                              </td>
                              <td className="px-4 py-3 font-dl-mono text-xs text-dl-gray">{req.email || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`font-dl-mono text-[9px] border px-2 py-0.5 uppercase tracking-wider ${sc}`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-dl-mono text-xs text-dl-gray">
                                {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-3">
                                {req.status === 'fulfilled' || req.status === 'failed' ? (
                                  <span className="font-dl-mono text-[9px] text-dl-gray">
                                    {req.status === 'fulfilled' && req.fulfillmentTxHash ? (
                                      <a
                                        href={`https://arbiscan.io/tx/${req.fulfillmentTxHash}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="text-dl-navy underline"
                                      >
                                        View Tx ↗
                                      </a>
                                    ) : req.status === 'fulfilled' ? 'Fulfilled' : 'Failed'}
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-1.5 min-w-[220px]">
                                    {/* Auto-Fulfill (primary action when buffer is available) */}
                                    {req.status === 'pending' && (
                                      <button
                                        onClick={() => handleAutoFulfill(req.id)}
                                        disabled={isBusy || (!!axauBuffer?.mintPaused && !axauBuffer?.axauCoversOrders) || axauBuffer?.bufferCapacity === 'DEPLETED'}
                                        title={
                                          axauBuffer?.bufferCapacity === 'DEPLETED'
                                            ? 'Buffer depleted — send AXAU or PAXG to buffer wallet'
                                            : axauBuffer?.axauCoversOrders
                                              ? 'PATH A — transfer from pre-minted AXAU reserve (no PAXG consumed)'
                                              : axauBuffer?.mintPaused
                                                ? 'Mint paused and no AXAU reserve — cannot fulfill'
                                                : 'PATH B — mint fresh AXAU from PAXG buffer'
                                        }
                                        className={`font-dl-mono text-[9px] border px-2 py-1 uppercase tracking-wider disabled:opacity-50 ${
                                          axauBuffer?.bufferCapacity === 'SUFFICIENT'
                                            ? 'border-dl-forest text-dl-forest hover:bg-green-50'
                                            : axauBuffer?.bufferCapacity === 'PARTIAL'
                                              ? 'border-yellow-500 text-yellow-700 hover:bg-yellow-50'
                                              : 'border-dl-border text-dl-gray'
                                        }`}
                                      >
                                        {isBusy ? 'Processing…' : axauBuffer?.axauCoversOrders ? '⚡ Auto-Fulfill (PATH A)' : axauBuffer?.bufferCapacity === 'DEPLETED' ? '⚡ Auto-Fulfill (no buffer)' : '⚡ Auto-Fulfill (PATH B)'}
                                      </button>
                                    )}
                                    {/* Manual flow divider */}
                                    <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider">— or manual —</p>
                                    {req.status === 'pending' && (
                                      <button
                                        onClick={() => handleAxauFulfill(req.id, 'processing')}
                                        disabled={isBusy}
                                        className="font-dl-mono text-[9px] border border-blue-400 text-blue-700 px-2 py-1 uppercase tracking-wider hover:bg-blue-50 disabled:opacity-50"
                                      >
                                        {isBusy ? '…' : 'Mark Processing'}
                                      </button>
                                    )}
                                    <div className="flex gap-1">
                                      <input
                                        type="text"
                                        placeholder="Tx hash (for manual fulfill)"
                                        value={axauFulfillMap[req.id] ?? ''}
                                        onChange={e => setAxauFulfillMap(m => ({ ...m, [req.id]: e.target.value }))}
                                        className="font-dl-mono text-[9px] border border-dl-border px-2 py-1 flex-1 outline-none bg-dl-surface min-w-0"
                                      />
                                    </div>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleAxauFulfill(req.id, 'fulfilled')}
                                        disabled={isBusy || !axauFulfillMap[req.id]}
                                        className="font-dl-mono text-[9px] border border-dl-forest text-dl-forest px-2 py-1 uppercase tracking-wider hover:bg-green-50 disabled:opacity-50"
                                      >
                                        {isBusy ? '…' : 'Fulfill'}
                                      </button>
                                      <button
                                        onClick={() => handleAxauFulfill(req.id, 'failed')}
                                        disabled={isBusy}
                                        className="font-dl-mono text-[9px] border border-dl-error text-dl-error px-2 py-1 uppercase tracking-wider hover:bg-red-50 disabled:opacity-50"
                                      >
                                        Fail
                                      </button>
                                    </div>
                                    {axauFulfillMsg?.id === req.id && (
                                      <p className={`font-dl-mono text-[9px] ${axauFulfillMsg.type === 'success' ? 'text-dl-forest' : 'text-dl-error'}`}>
                                        {axauFulfillMsg.text}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="border-t border-dl-border pt-6 mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      ['Reserve Instrument', 'AXAU (ERC-20, Arbitrum One)'],
                      ['Backing Asset', 'PAXG (PAX Gold)'],
                      ['Vault Contract', 'AXGoldVault'],
                    ].map(([lbl, val]) => (
                      <div key={lbl}>
                        <p className="font-dl-mono text-[9px] text-dl-gray uppercase tracking-wider">{lbl}</p>
                        <p className="font-dl-mono text-xs text-dl-navy mt-1">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── TAB: AXIOM RAIL SETTLEMENTS ─────────────────────────── */}
            {activeTab === 'axiomRail' && (
              <>
                <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-dl-serif text-xl text-dl-navy mb-1">Axiom Rail — Settlement Console</h2>
                    <p className="font-dl-mono text-xs text-dl-gray">Stellar SEP-24/31 · ACH/Wire Settlement · Monitor &amp; Settle</p>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <a href="/axiom-payment-rails" target="_blank" rel="noopener noreferrer"
                      className="font-dl-mono text-[9px] border border-dl-border text-dl-gray px-3 py-1.5 uppercase tracking-wider hover:text-dl-navy">
                      Rail Status ↗
                    </a>
                    <a href="/axiom-rail/deposit" target="_blank" rel="noopener noreferrer"
                      className="font-dl-mono text-[9px] border border-dl-border text-dl-gray px-3 py-1.5 uppercase tracking-wider hover:text-dl-navy">
                      Deposit UI ↗
                    </a>
                    <button
                      onClick={() => setRailUploadOpen(o => !o)}
                      className="font-dl-mono text-[9px] border border-dl-forest text-dl-forest px-3 py-1.5 uppercase tracking-wider hover:bg-dl-forest hover:text-white transition-colors"
                    >
                      + Upload Settlement Statement
                    </button>
                  </div>
                </div>

                {/* Weekly settlement statement upload */}
                {railUploadOpen && (
                  <div className="border border-dl-border bg-dl-bg-alt p-5 mb-6">
                    <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray mb-4">Upload Weekly Settlement Statement</p>
                    <form onSubmit={handleRailUpload} className="space-y-3">
                      <div>
                        <label className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray block mb-1">Statement Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Week of May 5, 2026 — Axiom Rail Settlement"
                          value={railUploadTitle}
                          onChange={e => setRailUploadTitle(e.target.value)}
                          className="font-dl-mono text-xs border border-dl-border px-3 py-2 bg-dl-surface w-full outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray block mb-1">PDF File *</label>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          required
                          onChange={e => setRailUploadFile(e.target.files?.[0] ?? null)}
                          className="font-dl-mono text-xs border border-dl-border px-3 py-2 bg-dl-surface w-full outline-none file:mr-3 file:border-0 file:bg-dl-navy file:text-white file:px-3 file:py-1 file:font-dl-mono file:text-[9px] file:uppercase file:tracking-wider file:cursor-pointer"
                        />
                        {railUploadFile && (
                          <p className="font-dl-mono text-[9px] text-dl-forest mt-1">{railUploadFile.name} — {(railUploadFile.size / 1024).toFixed(0)} KB</p>
                        )}
                      </div>
                      <div>
                        <label className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray block mb-1">Notes (optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Includes 3 completed rail transfers"
                          value={railUploadNote}
                          onChange={e => setRailUploadNote(e.target.value)}
                          className="font-dl-mono text-xs border border-dl-border px-3 py-2 bg-dl-surface w-full outline-none"
                        />
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button
                          type="submit"
                          disabled={railUploadSubmitting}
                          className="font-dl-mono text-[9px] border border-dl-navy text-dl-navy px-4 py-2 uppercase tracking-wider hover:bg-dl-navy hover:text-white transition-colors disabled:opacity-50"
                        >
                          {railUploadSubmitting ? 'Saving…' : 'Save Statement'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRailUploadOpen(false)}
                          className="font-dl-mono text-[9px] border border-dl-border text-dl-gray px-4 py-2 uppercase tracking-wider hover:text-dl-navy transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Saved settlement statements */}
                {railUploadDocs.length > 0 && (() => {
                  const fmt = (v: unknown): string => {
                    if (v === null || v === undefined || v === '') return '—';
                    const n = typeof v === 'number' ? v : Number(v);
                    if (typeof v === 'string' && !Number.isFinite(n)) return v;
                    if (!Number.isFinite(n)) return String(v);
                    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  };
                  const fmtInt = (v: unknown): string => {
                    if (v === null || v === undefined || v === '') return '—';
                    const n = typeof v === 'number' ? v : Number(v);
                    if (typeof v === 'string' && !Number.isFinite(n)) return v;
                    if (!Number.isFinite(n)) return String(v);
                    return Math.round(n).toLocaleString('en-US');
                  };
                  // Render a signed currency cell that preserves the underlying
                  // numeric sign (escrow can legitimately be negative from
                  // trailing-minus PDFs). For "deduction" rows we also show
                  // positive values with a leading minus, since they reduce
                  // gross pay.
                  const signed = (raw: unknown, asDeduction = false): string => {
                    if (raw === null || raw === undefined || raw === '') return '—';
                    const n = Number(raw);
                    if (!Number.isFinite(n)) return '—';
                    if (n < 0) return `−$${fmt(Math.abs(n))}`;
                    if (n > 0 && asDeduction) return `−$${fmt(n)}`;
                    return `$${fmt(n)}`;
                  };
                  return (
                  <div className="border border-dl-border mb-6">
                    <div className="bg-dl-bg-alt border-b border-dl-border px-4 py-2">
                      <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray">Filed Settlement Statements ({railUploadDocs.length})</p>
                    </div>
                    <div className="divide-y divide-dl-border">
                      {(railUploadDocs as SettlementListRow[]).map(doc => {
                        // Status comes from either the list endpoint
                        // (`extraction_status`) or, for rows just inserted
                        // by the in-session upload response, the nested
                        // `extraction.status`. Without this fallback,
                        // freshly uploaded rows would render as
                        // "No extraction" until a manual refresh.
                        const status = doc.extraction_status ?? doc.extraction?.status ?? null;
                        const isOpen = railExpandedDoc === doc.id;
                        const detail = railDetailCache[doc.id];
                        // Inline payload (from in-session upload response) is
                        // preferred when present; otherwise the lazy-loaded
                        // detail cache supplies the full panel.
                        const inlinePayload = doc.extraction?.payload ?? null;
                        const detailPayload: SettlementPayload | null = detail?.payload ?? inlinePayload;
                        // Summary metrics use the flattened payload_* columns
                        // returned by the list endpoint, falling back to inline
                        // payload when available.
                        const sumStmtDate = doc.payload_statement_date ?? inlinePayload?.statement_date ?? null;
                        const sumUnit     = doc.payload_unit_number    ?? inlinePayload?.unit_number    ?? null;
                        const sumTotal    = doc.payload_total_miles    ?? inlinePayload?.total_miles    ?? null;
                        const sumLoaded   = doc.payload_loaded_miles   ?? inlinePayload?.loaded_miles   ?? null;
                        const sumEmpty    = doc.payload_empty_miles    ?? inlinePayload?.empty_miles    ?? null;
                        const sumMileage  = doc.payload_mileage_pay_current     ?? inlinePayload?.mileage_pay_current     ?? null;
                        const sumReimb    = doc.payload_reimbursements_current  ?? inlinePayload?.reimbursements_current  ?? null;
                        const sumFuelPro  = doc.payload_fuel_protection_current ?? inlinePayload?.fuel_protection_current ?? null;
                        const sumGross    = doc.payload_total_gross_pay_current ?? inlinePayload?.total_gross_pay_current ?? null;
                        const sumDeduct   = doc.payload_total_deductions_current?? inlinePayload?.total_deductions_current?? null;
                        const sumNet      = doc.payload_total_net_pay_current   ?? inlinePayload?.total_net_pay_current   ?? null;
                        const reimbPlusFuel = (Number(sumReimb) || 0) + (Number(sumFuelPro) || 0);
                        const hasSummary = status === 'extracted' || status === 'low_confidence';
                        return (
                          <div key={doc.id}>
                            <div className="px-4 py-3">
                              <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="min-w-0 flex-1">
                                  <p className="font-dl-mono text-xs text-dl-navy">{doc.title}</p>
                                  {doc.description && <p className="font-dl-mono text-[9px] text-dl-gray mt-0.5">{doc.description}</p>}
                                  <p className="font-dl-mono text-[8px] text-dl-gray mt-0.5">
                                    Uploaded {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    {sumStmtDate && <> · Statement {sumStmtDate}</>}
                                    {sumUnit && <> · Unit {sumUnit}</>}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {status === 'extracted' && (
                                    <span className="font-dl-mono text-[8px] uppercase tracking-wider px-2 py-0.5 border border-dl-forest text-dl-forest">Extracted</span>
                                  )}
                                  {status === 'low_confidence' && (
                                    <span className="font-dl-mono text-[8px] uppercase tracking-wider px-2 py-0.5 border border-yellow-700 text-yellow-700">Extraction incomplete — review manually</span>
                                  )}
                                  {status === 'failed' && (
                                    <span className="font-dl-mono text-[8px] uppercase tracking-wider px-2 py-0.5 border border-red-700 text-red-700">Extraction failed</span>
                                  )}
                                  {!status && (
                                    <span className="font-dl-mono text-[8px] uppercase tracking-wider px-2 py-0.5 border border-dl-border text-dl-gray">No extraction</span>
                                  )}
                                  {hasSummary && (
                                    <button
                                      onClick={() => openSettlementDetail(doc.id, inlinePayload)}
                                      className="font-dl-mono text-[9px] border border-dl-border text-dl-gray px-3 py-1.5 uppercase tracking-wider hover:text-dl-navy"
                                    >
                                      {isOpen ? 'Hide details' : 'Open details'}
                                    </button>
                                  )}
                                  <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-dl-mono text-[9px] border border-dl-border text-dl-gray px-3 py-1.5 uppercase tracking-wider hover:text-dl-navy"
                                  >
                                    View PDF ↗
                                  </a>
                                </div>
                              </div>

                              {hasSummary && (
                                <div className="grid grid-cols-2 md:grid-cols-6 gap-px bg-dl-border mt-3 border border-dl-border">
                                  <div className="bg-dl-surface px-3 py-2">
                                    <p className="font-dl-mono text-[8px] uppercase tracking-wider text-dl-gray">Total Miles</p>
                                    <p className="font-dl-mono text-xs text-dl-navy mt-0.5">{fmtInt(sumTotal)}</p>
                                    <p className="font-dl-mono text-[8px] text-dl-gray">L {fmtInt(sumLoaded)} / E {fmtInt(sumEmpty)}</p>
                                  </div>
                                  <div className="bg-dl-surface px-3 py-2">
                                    <p className="font-dl-mono text-[8px] uppercase tracking-wider text-dl-gray">Mileage Pay</p>
                                    <p className="font-dl-mono text-xs text-dl-navy mt-0.5">${fmt(sumMileage)}</p>
                                  </div>
                                  <div className="bg-dl-surface px-3 py-2">
                                    <p className="font-dl-mono text-[8px] uppercase tracking-wider text-dl-gray">Reimburse + Fuel Pay</p>
                                    <p className="font-dl-mono text-xs text-dl-navy mt-0.5">${fmt(reimbPlusFuel)}</p>
                                  </div>
                                  <div className="bg-dl-surface px-3 py-2">
                                    <p className="font-dl-mono text-[8px] uppercase tracking-wider text-dl-gray">Gross Pay</p>
                                    <p className="font-dl-mono text-xs text-dl-navy mt-0.5">${fmt(sumGross)}</p>
                                  </div>
                                  <div className="bg-dl-surface px-3 py-2">
                                    <p className="font-dl-mono text-[8px] uppercase tracking-wider text-dl-gray">Deductions</p>
                                    <p className="font-dl-mono text-xs text-dl-navy mt-0.5">${fmt(sumDeduct)}</p>
                                  </div>
                                  <div className="bg-dl-surface px-3 py-2">
                                    <p className="font-dl-mono text-[8px] uppercase tracking-wider text-dl-gray">Net Pay</p>
                                    <p className="font-dl-mono text-xs text-dl-forest mt-0.5">${fmt(sumNet)}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {isOpen && (
                              <div className="px-4 pb-4 bg-dl-bg-alt border-t border-dl-border">
                                {detail?.loading && (
                                  <p className="font-dl-mono text-[10px] text-dl-gray mt-3">Loading extracted detail…</p>
                                )}
                                {detail?.error && !detail.loading && (
                                  <p className="font-dl-mono text-[10px] text-red-700 mt-3">{detail.error}</p>
                                )}
                                {detailPayload && (() => {
                                  const dp = detailPayload;
                                  const totalRows: ReadonlyArray<{ label: string; c: unknown; y: unknown; l: unknown; bold?: boolean; neg?: boolean; accent?: boolean }> = [
                                    { label: 'Mileage Pay',            c: dp.mileage_pay_current,          y: dp.mileage_pay_ytd,          l: dp.mileage_pay_ltd },
                                    { label: 'Reimbursements / Other', c: dp.reimbursements_current,       y: dp.reimbursements_ytd,       l: dp.reimbursements_ltd },
                                    { label: 'Fuel Protection Pay',    c: dp.fuel_protection_current,      y: dp.fuel_protection_ytd,      l: dp.fuel_protection_ltd },
                                    { label: 'Total Gross Pay',        c: dp.total_gross_pay_current,      y: dp.total_gross_pay_ytd,      l: dp.total_gross_pay_ltd, bold: true },
                                    { label: 'Advances',               c: dp.advances_current,             y: dp.advances_ytd,             l: dp.advances_ltd, neg: true },
                                    { label: 'Escrow',                 c: dp.escrow_current,               y: dp.escrow_ytd,               l: dp.escrow_ltd, neg: true },
                                    { label: 'Recurring Expenses',     c: dp.recurring_expenses_current,   y: dp.recurring_expenses_ytd,   l: dp.recurring_expenses_ltd, neg: true },
                                    { label: 'Truck Repairs',          c: dp.truck_repairs_current,        y: dp.truck_repairs_ytd,        l: dp.truck_repairs_ltd, neg: true },
                                    { label: 'Other Misc Expenses',    c: dp.other_misc_current,           y: dp.other_misc_ytd,           l: dp.other_misc_ltd, neg: true },
                                    { label: 'Fuel Expenses',          c: dp.fuel_expenses_current,        y: dp.fuel_expenses_ytd,        l: dp.fuel_expenses_ltd, neg: true },
                                    { label: 'Total Deductions',       c: dp.total_deductions_current,     y: dp.total_deductions_ytd,     l: dp.total_deductions_ltd, bold: true, neg: true },
                                    { label: 'Previous Balance Due',   c: dp.previous_balance_due_current, y: null,                        l: null },
                                    { label: 'Total Net Pay',          c: dp.total_net_pay_current,        y: dp.total_net_pay_ytd,        l: dp.total_net_pay_ltd, bold: true, accent: true },
                                  ];
                                  const lineSections: ReadonlyArray<{ key: keyof SettlementPayload; label: string }> = [
                                    { key: 'reimbursement_rows',     label: 'Reimbursements & Other Pay' },
                                    { key: 'fuel_protection_rows',   label: 'Fuel Protection Pay' },
                                    { key: 'advances_rows',          label: 'Advances' },
                                    { key: 'escrow_rows',            label: 'Escrow' },
                                    { key: 'recurring_expense_rows', label: 'Recurring Expenses' },
                                    { key: 'truck_repair_rows',      label: 'Truck Repairs' },
                                    { key: 'other_misc_rows',        label: 'Other Miscellaneous Expenses' },
                                    { key: 'fuel_expense_rows',      label: 'Fuel Expenses' },
                                  ];
                                  return (
                                    <>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                        <div className="border border-dl-border bg-dl-surface p-3">
                                          <p className="font-dl-serif text-sm text-dl-navy mb-2">Driver</p>
                                          <dl className="font-dl-mono text-[10px] space-y-1">
                                            <div className="flex justify-between gap-3"><dt className="text-dl-gray">Name</dt><dd className="text-dl-navy text-right">{fmt(dp.driver_name)}</dd></div>
                                            <div className="flex justify-between gap-3"><dt className="text-dl-gray">Code</dt><dd className="text-dl-navy text-right">{fmt(dp.driver_code)}</dd></div>
                                            <div className="flex justify-between gap-3"><dt className="text-dl-gray">Unit</dt><dd className="text-dl-navy text-right">{fmt(dp.unit_number)}</dd></div>
                                            <div className="flex justify-between gap-3"><dt className="text-dl-gray">Address</dt><dd className="text-dl-navy text-right">{fmt(dp.driver_address)}</dd></div>
                                            <div className="flex justify-between gap-3"><dt className="text-dl-gray">Phone</dt><dd className="text-dl-navy text-right">{fmt(dp.driver_phone)}</dd></div>
                                            <div className="flex justify-between gap-3"><dt className="text-dl-gray">Email</dt><dd className="text-dl-navy text-right">{fmt(dp.driver_email)}</dd></div>
                                          </dl>
                                        </div>
                                        <div className="border border-dl-border bg-dl-surface p-3">
                                          <p className="font-dl-serif text-sm text-dl-navy mb-2">Operations Summary</p>
                                          <dl className="font-dl-mono text-[10px] space-y-1">
                                            <div className="flex justify-between gap-3"><dt className="text-dl-gray">Statement date</dt><dd className="text-dl-navy text-right">{fmt(dp.statement_date)}</dd></div>
                                            <div className="flex justify-between gap-3"><dt className="text-dl-gray">Total miles</dt><dd className="text-dl-navy text-right">{fmtInt(dp.total_miles)}</dd></div>
                                            <div className="flex justify-between gap-3"><dt className="text-dl-gray">Loaded / Empty</dt><dd className="text-dl-navy text-right">{fmtInt(dp.loaded_miles)} / {fmtInt(dp.empty_miles)}</dd></div>
                                            <div className="flex justify-between gap-3"><dt className="text-dl-gray">Miles per gallon</dt><dd className="text-dl-navy text-right">{fmt(dp.miles_per_gallon)}</dd></div>
                                            <div className="flex justify-between gap-3"><dt className="text-dl-gray">Days off</dt><dd className="text-dl-navy text-right">{fmtInt(dp.total_days_off)}</dd></div>
                                          </dl>
                                        </div>
                                      </div>

                                      <div className="border border-dl-border bg-dl-surface mt-4">
                                        <table className="w-full font-dl-mono text-[10px]">
                                          <thead className="bg-dl-bg-alt">
                                            <tr>
                                              <th className="text-left px-3 py-2 text-dl-gray uppercase tracking-wider text-[8px]">Section</th>
                                              <th className="text-right px-3 py-2 text-dl-gray uppercase tracking-wider text-[8px]">Current</th>
                                              <th className="text-right px-3 py-2 text-dl-gray uppercase tracking-wider text-[8px]">YTD</th>
                                              <th className="text-right px-3 py-2 text-dl-gray uppercase tracking-wider text-[8px]">LTD</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-dl-border">
                                            {totalRows.map(row => (
                                              <tr key={row.label}>
                                                <td className={`px-3 py-1.5 ${row.bold ? 'text-dl-navy font-semibold' : 'text-dl-gray'}`}>{row.label}</td>
                                                <td className={`px-3 py-1.5 text-right ${row.accent ? 'text-dl-forest' : row.bold ? 'text-dl-navy font-semibold' : 'text-dl-navy'}`}>{signed(row.c, !!row.neg)}</td>
                                                <td className="px-3 py-1.5 text-right text-dl-gray">{signed(row.y, !!row.neg)}</td>
                                                <td className="px-3 py-1.5 text-right text-dl-gray">{signed(row.l, !!row.neg)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

                                      {Array.isArray(dp.mileage_pay_rows) && dp.mileage_pay_rows.length > 0 && (
                                        <div className="border border-dl-border bg-dl-surface mt-4">
                                          <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray px-3 py-2 border-b border-dl-border bg-dl-bg-alt">Mileage Pay Detail</p>
                                          <div className="overflow-x-auto">
                                            <table className="w-full font-dl-mono text-[10px]">
                                              <thead className="bg-dl-bg-alt">
                                                <tr>
                                                  {['Order','Disp','Pickup','Empty','Origin','Dest','Type','Rate','Loaded','Empty','Amount'].map(h => (
                                                    <th key={h} className="text-left px-2 py-1 text-dl-gray uppercase tracking-wider text-[8px]">{h}</th>
                                                  ))}
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-dl-border">
                                                {dp.mileage_pay_rows.map((r: SettlementRow, i: number) => (
                                                  <tr key={`${r.order ?? 'row'}-${i}`}>
                                                    <td className="px-2 py-1 text-dl-navy">{fmt(r.order)}</td>
                                                    <td className="px-2 py-1 text-dl-gray">{fmt(r.dispatch_date)}</td>
                                                    <td className="px-2 py-1 text-dl-gray">{fmt(r.pickup_date)}</td>
                                                    <td className="px-2 py-1 text-dl-gray">{fmt(r.empty_date)}</td>
                                                    <td className="px-2 py-1 text-dl-gray">{fmt(r.origin)}</td>
                                                    <td className="px-2 py-1 text-dl-gray">{fmt(r.destination)}</td>
                                                    <td className="px-2 py-1 text-dl-gray">{fmt(r.type)}</td>
                                                    <td className="px-2 py-1 text-right text-dl-gray">{fmt(r.rate)}</td>
                                                    <td className="px-2 py-1 text-right text-dl-gray">{fmtInt(r.loaded_miles)}</td>
                                                    <td className="px-2 py-1 text-right text-dl-gray">{fmtInt(r.empty_miles)}</td>
                                                    <td className="px-2 py-1 text-right text-dl-navy">{signed(r.amount)}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      )}

                                      {lineSections.map(section => {
                                        const rows = dp[section.key] as SettlementRow[] | undefined | null;
                                        if (!Array.isArray(rows) || rows.length === 0) return null;
                                        return (
                                          <div key={section.key as string} className="border border-dl-border bg-dl-surface mt-4">
                                            <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray px-3 py-2 border-b border-dl-border bg-dl-bg-alt">{section.label}</p>
                                            <div className="overflow-x-auto">
                                              <table className="w-full font-dl-mono text-[10px]">
                                                <thead className="bg-dl-bg-alt">
                                                  <tr>
                                                    <th className="text-left px-2 py-1 text-dl-gray uppercase tracking-wider text-[8px]">Order</th>
                                                    <th className="text-left px-2 py-1 text-dl-gray uppercase tracking-wider text-[8px]">Date</th>
                                                    <th className="text-left px-2 py-1 text-dl-gray uppercase tracking-wider text-[8px]">Description</th>
                                                    <th className="text-right px-2 py-1 text-dl-gray uppercase tracking-wider text-[8px]">Amount</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-dl-border">
                                                  {rows.map((r: SettlementRow, i: number) => (
                                                    <tr key={`${r.order ?? 'row'}-${r.date ?? i}-${i}`}>
                                                      <td className="px-2 py-1 text-dl-navy">{fmt(r.order)}</td>
                                                      <td className="px-2 py-1 text-dl-gray">{fmt(r.date)}</td>
                                                      <td className="px-2 py-1 text-dl-gray">{fmt(r.description)}</td>
                                                      <td className="px-2 py-1 text-right text-dl-navy">{signed(r.amount)}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })()}

                {/* Summary stats */}
                {railSummary && (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-0 border border-dl-border mb-4 bg-dl-bg-alt">
                    {[
                      { label: 'Total', value: railSummary.total, color: 'text-dl-navy' },
                      { label: 'Pending Start', value: railSummary.byStatus.pending_user_transfer_start ?? 0, color: 'text-yellow-700' },
                      { label: 'Pending Anchor', value: railSummary.byStatus.pending_anchor ?? 0, color: 'text-blue-700' },
                      { label: 'Completed', value: railSummary.byStatus.completed ?? 0, color: 'text-dl-forest' },
                      { label: 'Error', value: railSummary.byStatus.error ?? 0, color: 'text-dl-error' },
                      { label: 'Withdraws / Deposits', value: `${railSummary.byFlow.withdraw} / ${railSummary.byFlow.deposit}`, color: 'text-dl-navy' },
                    ].map((s, i) => (
                      <div key={i} className="p-3 border-r border-dl-border last:border-r-0">
                        <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider mb-1">{s.label}</p>
                        <p className={`font-dl-mono text-sm font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Controls */}
                <div className="flex gap-3 items-center mb-5 flex-wrap">
                  <input
                    type="password"
                    placeholder="Admin key"
                    value={railAdminKey}
                    onChange={e => setRailAdminKey(e.target.value)}
                    className="font-dl-mono text-xs border border-dl-border px-3 py-2 bg-dl-surface w-56 outline-none"
                  />
                  <button
                    onClick={() => { loadAxiomRailSettlements(railAdminKey); loadRailSettlementDocs(); }}
                    disabled={railLoading}
                    className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 uppercase tracking-wider hover:bg-dl-navy hover:text-white transition-colors disabled:opacity-50"
                  >
                    {railLoading ? 'Loading…' : 'Refresh'}
                  </button>
                  <button
                    onClick={runAxiomRailMonitor}
                    disabled={railMonitorRunning || !railAdminKey}
                    className="font-dl-mono text-xs border border-dl-forest text-dl-forest px-4 py-2 uppercase tracking-wider hover:bg-green-50 disabled:opacity-50"
                  >
                    {railMonitorRunning ? 'Running Monitor…' : 'Run Settlement Monitor'}
                  </button>
                </div>

                {railError && (
                  <div className="border border-dl-error p-4 mb-4">
                    <p className="font-dl-mono text-xs text-dl-error">{railError}</p>
                  </div>
                )}

                {/* Monitor result */}
                {railMonitorResult && (
                  <div className={`border p-4 mb-5 ${railMonitorResult.success ? 'border-dl-forest bg-green-50' : 'border-dl-error bg-red-50'}`}>
                    <p className="font-dl-mono text-[9px] uppercase tracking-wider mb-2 font-bold text-dl-navy">
                      Monitor Run — {railMonitorResult.scannedAt ? new Date(railMonitorResult.scannedAt).toLocaleString() : 'just now'}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      {[
                        { label: 'Stellar Detected', value: railMonitorResult.phase1DetectedWithdraws ?? 0, color: 'text-dl-navy' },
                        { label: 'Payouts Initiated', value: railMonitorResult.phase2InitiatedPayouts ?? 0, color: 'text-dl-forest' },
                        { label: 'Increase Settled', value: railMonitorResult.phase3ConfirmedWithdraws ?? 0, color: 'text-dl-forest' },
                        { label: 'Deposits Matched', value: railMonitorResult.phase1DetectedDeposits ?? 0, color: 'text-blue-700' },
                        { label: 'Errors', value: railMonitorResult.errors?.length ?? 0, color: (railMonitorResult.errors?.length ?? 0) > 0 ? 'text-dl-error' : 'text-dl-gray' },
                      ].map(s => (
                        <div key={s.label}>
                          <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider">{s.label}</p>
                          <p className={`font-dl-mono text-base font-bold ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    {railMonitorResult.details && railMonitorResult.details.length > 0 && (
                      <div className="space-y-1">
                        {railMonitorResult.details.map((d: any, i: number) => (
                          <div key={i} className="flex gap-2 items-baseline">
                            <span className={`font-dl-mono text-[8px] px-1 uppercase border ${d.status === 'ok' ? 'border-dl-forest text-dl-forest' : d.status === 'skip' ? 'border-dl-gray text-dl-gray' : 'border-dl-error text-dl-error'}`}>
                              {d.flow} / {d.phase ?? d.action}
                            </span>
                            <span className="font-dl-mono text-[9px] text-dl-navy">{d.transferId?.slice(0, 20)}</span>
                            <span className="font-dl-mono text-[9px] text-dl-gray flex-1">{d.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {railMonitorResult.errors?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-inherit">
                        {railMonitorResult.errors.map((e: string, i: number) => (
                          <p key={i} className="font-dl-mono text-[9px] text-dl-error">{e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Transfer table */}
                {railLoading && !railSettlements.length && (
                  <p className="font-dl-mono text-xs text-dl-gray">Loading settlements…</p>
                )}

                {!railLoading && railSettlements.length === 0 && !railError && (
                  <div className="border border-dl-border p-8 text-center">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">No settlement records found</p>
                    <p className="font-dl-serif text-sm text-dl-gray mt-2">Enter admin key and click Refresh to load data.</p>
                  </div>
                )}

                {railSettlements.length > 0 && (
                  <div className="overflow-x-auto border border-dl-border">
                    <table className="w-full text-left min-w-[1000px]">
                      <thead>
                        <tr className="bg-dl-bg-alt border-b border-dl-border">
                          {['ID', 'Flow', 'Protocol', 'Asset → USD', 'Amount', 'Memo', 'Status', 'Stellar Account', 'Initiated', 'Details'].map(h => (
                            <th key={h} className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider px-3 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {railSettlements.map((row: any) => {
                          const shortId = row.id?.slice(0, 10)?.toUpperCase();
                          const isWithdraw = row.corridorId === 'usdc-to-usd-axiom-rail-rtp';
                          const stellarKey = row.stellarPublicKey ?? row.sep31StellarAccountId ?? null;
                          const shortStellar = stellarKey ? `${stellarKey.slice(0, 6)}…${stellarKey.slice(-4)}` : '—';

                          const statusColors: Record<string, string> = {
                            pending_user_transfer_start: 'border-yellow-400 text-yellow-700 bg-yellow-50',
                            pending_external:  'border-yellow-400 text-yellow-700 bg-yellow-50',
                            pending_anchor:    'border-blue-400 text-blue-700 bg-blue-50',
                            pending_stellar:   'border-blue-400 text-blue-700 bg-blue-50',
                            completed:         'border-dl-forest text-dl-forest bg-green-50',
                            error:             'border-dl-error text-dl-error bg-red-50',
                            refunded:          'border-dl-gold text-dl-gold bg-yellow-50',
                          };
                          const sc = statusColors[row.status] ?? 'border-dl-border text-dl-gray';
                          const statusLabel: Record<string, string> = {
                            pending_user_transfer_start: 'Awaiting Transfer',
                            pending_external: 'Pending External',
                            pending_anchor: 'USD Received',
                            pending_stellar: 'Settling',
                            completed: 'Completed',
                            error: 'Error',
                          };

                          const raw = row.anchorRawResponse as any ?? {};
                          const increaseId = raw.increaseTransferId ?? raw.increaseInboundTxId ?? null;

                          return (
                            <tr key={row.id} className="border-b border-dl-border hover:bg-dl-bg-alt">
                              <td className="px-3 py-2 font-dl-mono text-[9px] text-dl-navy" title={row.id}>#{shortId}</td>
                              <td className="px-3 py-2">
                                <span className={`font-dl-mono text-[8px] border px-1 py-0.5 uppercase tracking-wider ${isWithdraw ? 'border-dl-navy text-dl-navy' : 'border-dl-forest text-dl-forest'}`}>
                                  {isWithdraw ? 'Withdraw' : 'Deposit'}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-dl-mono text-[9px] text-dl-gray uppercase">{row.sepProtocol ?? '—'}</td>
                              <td className="px-3 py-2 font-dl-mono text-[9px] text-dl-gray">
                                {(row.anchorRawResponse as any)?.asset ?? row.destinationCurrency ?? '—'}
                              </td>
                              <td className="px-3 py-2 font-dl-mono text-[9px] text-dl-navy font-bold">
                                ${parseFloat(row.sourceAmountAxusd ?? '0').toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 font-dl-mono text-[9px] text-dl-gray" title={row.sep31StellarMemo ?? ''}>
                                {row.sep31StellarMemo ?? '—'}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`font-dl-mono text-[8px] border px-1.5 py-0.5 uppercase tracking-wider ${sc}`}>
                                  {statusLabel[row.status] ?? row.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-dl-mono text-[9px] text-dl-gray" title={stellarKey ?? ''}>
                                {stellarKey ? (
                                  <a href={`https://stellar.expert/explorer/public/account/${stellarKey}`} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline">
                                    {shortStellar}
                                  </a>
                                ) : '—'}
                              </td>
                              <td className="px-3 py-2 font-dl-mono text-[9px] text-dl-gray">
                                {row.initiatedAt ? new Date(row.initiatedAt).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-3 py-2 font-dl-mono text-[9px] text-dl-gray">
                                {row.stellarTransactionHash ? (
                                  <a href={`https://stellar.expert/explorer/public/tx/${row.stellarTransactionHash}`} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline">Stellar Tx ↗</a>
                                ) : null}
                                {increaseId && (
                                  <span className="ml-1 text-dl-gray">Inc: {increaseId.slice(0, 8)}</span>
                                )}
                                {row.errorMessage && (
                                  <span className="text-dl-error" title={row.errorMessage}>Err</span>
                                )}
                                {!row.stellarTransactionHash && !increaseId && !row.errorMessage && '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Info footer */}
                <div className="border-t border-dl-border pt-5 mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      ['Anchor ID', 'axiom-rail'],
                      ['Signing Key', 'GBLOO5…YIIY'],
                      ['Deposit Account', 'GA4GMI…VITM7P'],
                      ['Settlement Bank', 'ACH/Wire Settlement Rail'],
                    ].map(([lbl, val]) => (
                      <div key={lbl}>
                        <p className="font-dl-mono text-[9px] text-dl-gray uppercase tracking-wider">{lbl}</p>
                        <p className="font-dl-mono text-xs text-dl-navy mt-1">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── TAB: DAO ACCOUNTS ──────────────────────────────────── */}
            {activeTab === 'daoAccounts' && (
              <>
                <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-dl-serif text-xl text-dl-navy mb-1">DAO Operating Accounts</h2>
                    <p className="font-dl-mono text-xs text-dl-gray">Review applications · Manage active accounts</p>
                  </div>
                  <a href="/banking/dao-account" target="_blank" rel="noopener noreferrer"
                    className="font-dl-mono text-[9px] border border-dl-border text-dl-gray px-3 py-1.5 uppercase tracking-wider hover:text-dl-navy">
                    Application Page ↗
                  </a>
                </div>

                <div className="flex gap-3 items-center mb-5 flex-wrap">
                  <input
                    type="password"
                    placeholder="Admin key"
                    value={daoAdminKey}
                    onChange={e => setDaoAdminKey(e.target.value)}
                    className="font-dl-mono text-xs border border-dl-border px-3 py-2 bg-dl-surface w-56 outline-none"
                  />
                  <button
                    onClick={() => loadDaoAccounts(daoAdminKey)}
                    disabled={daoAccountsLoading}
                    className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 uppercase tracking-wider hover:bg-dl-navy hover:text-white transition-colors disabled:opacity-50"
                  >
                    {daoAccountsLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                {daoAccountsError && (
                  <div className="border border-dl-error p-4 mb-4">
                    <p className="font-dl-mono text-xs text-dl-error">{daoAccountsError}</p>
                  </div>
                )}

                {daoAccountsLoading && !daoAccounts.length && (
                  <p className="font-dl-mono text-xs text-dl-gray">Loading applications…</p>
                )}

                {!daoAccountsLoading && daoAccounts.length === 0 && !daoAccountsError && (
                  <div className="border border-dl-border p-8 text-center">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">No applications found</p>
                    <p className="font-dl-serif text-sm text-dl-gray mt-2">Enter admin key and click Refresh to load data.</p>
                  </div>
                )}

                {daoAccounts.length > 0 && (
                  <>
                    <div className="grid grid-cols-4 gap-0 border border-dl-border mb-4 bg-dl-bg-alt">
                      {[
                        { label: 'Total', value: daoAccounts.length, color: 'text-dl-navy' },
                        { label: 'Pending Review', value: daoAccounts.filter((a: any) => a.status === 'pending_review').length, color: 'text-yellow-700' },
                        { label: 'Active', value: daoAccounts.filter((a: any) => a.status === 'active').length, color: 'text-dl-forest' },
                        { label: 'Rejected', value: daoAccounts.filter((a: any) => a.status === 'rejected').length, color: 'text-dl-error' },
                      ].map((s, i) => (
                        <div key={i} className="p-3 border-r border-dl-border last:border-r-0">
                          <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider mb-1">{s.label}</p>
                          <p className={`font-dl-mono text-sm font-bold ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="overflow-x-auto border border-dl-border">
                      <table className="w-full text-left min-w-[900px]">
                        <thead>
                          <tr className="bg-dl-bg-alt border-b border-dl-border">
                            {['ID', 'Entity Name', 'EIN', 'Address', 'Status', 'Increase Account', 'Applied', 'Actions'].map(h => (
                              <th key={h} className="font-dl-mono text-[9px] text-dl-gray uppercase tracking-wider px-4 py-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {daoAccounts.map((app: any) => {
                            const shortId = app.id?.slice(0, 8)?.toUpperCase();
                            const statusColors: Record<string, string> = {
                              pending_review: 'border-yellow-400 text-yellow-700 bg-yellow-50',
                              approved:       'border-blue-400 text-blue-700 bg-blue-50',
                              active:         'border-dl-forest text-dl-forest bg-green-50',
                              rejected:       'border-dl-error text-dl-error bg-red-50',
                            };
                            const sc = statusColors[app.status] ?? 'border-dl-border text-dl-gray';
                            const isBusy = daoProvisioningId === app.id;

                            return (
                              <tr key={app.id} className="border-b border-dl-border hover:bg-dl-bg-alt">
                                <td className="px-4 py-3 font-dl-mono text-xs text-dl-navy">#{shortId}</td>
                                <td className="px-4 py-3 font-dl-mono text-xs text-dl-navy font-bold">{app.entityName}</td>
                                <td className="px-4 py-3 font-dl-mono text-xs text-dl-gray">{app.entityEin ? `${app.entityEin.slice(0, 2)}-${app.entityEin.slice(2)}` : '—'}</td>
                                <td className="px-4 py-3 font-dl-mono text-xs text-dl-gray" title={app.entityAddress}>{app.entityAddress ? app.entityAddress.slice(0, 30) + (app.entityAddress.length > 30 ? '…' : '') : '—'}</td>
                                <td className="px-4 py-3">
                                  <span className={`font-dl-mono text-[9px] border px-2 py-0.5 uppercase tracking-wider ${sc}`}>
                                    {app.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-dl-mono text-[10px] text-dl-gray">
                                  {app.increaseAccountId ? (
                                    <span title={app.increaseAccountId}>{app.increaseAccountId.slice(0, 12)}…</span>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-3 font-dl-mono text-xs text-dl-gray">
                                  {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-4 py-3">
                                  {app.status === 'active' ? (
                                    <span className="font-dl-mono text-[9px] text-dl-forest">Provisioned</span>
                                  ) : app.status === 'rejected' ? (
                                    <span className="font-dl-mono text-[9px] text-dl-error">Rejected</span>
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      <button
                                        onClick={() => handleDaoProvision(app.id)}
                                        disabled={isBusy || app.status === 'active'}
                                        className="font-dl-mono text-[9px] border border-dl-forest text-dl-forest px-2 py-1 uppercase tracking-wider hover:bg-green-50 disabled:opacity-50"
                                      >
                                        {isBusy ? 'Provisioning…' : 'Provision Account'}
                                      </button>
                                      {daoProvisionMsg?.id === app.id && (
                                        <p className={`font-dl-mono text-[9px] break-all ${daoProvisionMsg.type === 'success' ? 'text-dl-forest' : 'text-dl-error'}`}>
                                          {daoProvisionMsg.text}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                <div className="border-t border-dl-border pt-5 mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      ['Banking Layer', 'ACH/Wire Rail — Offline'],
                      ['FDIC Coverage', 'Up to $250,000 per depositor'],
                      ['Application Page', '/banking/dao-account'],
                    ].map(([lbl, val]) => (
                      <div key={lbl}>
                        <p className="font-dl-mono text-[9px] text-dl-gray uppercase tracking-wider">{lbl}</p>
                        <p className="font-dl-mono text-xs text-dl-navy mt-1">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── TAB: RESERVES ──────────────────────────────────────── */}
            {activeTab === 'reserves' && (
              <>
                <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-dl-serif text-xl text-dl-navy mb-1">Reserve Asset Management</h2>
                    <p className="font-dl-mono text-xs text-dl-gray">Live balances · Deposit addresses · Operational status — ETH, PAXG, AXAU, AXM, USDC, AXUSD</p>
                  </div>
                  <a
                    href="/observer/reserve-performance"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-dl-mono text-[9px] border border-dl-border text-dl-gray px-3 py-1.5 uppercase tracking-wider hover:text-dl-navy"
                  >
                    Public Performance View ↗
                  </a>
                </div>

                {/* Admin key + Refresh */}
                <div className="flex gap-3 items-center mb-5 flex-wrap">
                  <input
                    type="password"
                    placeholder="Admin key"
                    value={reservesAdminKey}
                    onChange={e => setReservesAdminKey(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadReserves(reservesAdminKey)}
                    className="font-dl-mono text-xs border border-dl-border px-3 py-2 bg-dl-surface w-56 outline-none"
                  />
                  <button
                    onClick={() => { loadReserves(reservesAdminKey); loadAllocPolicy(reservesAdminKey); loadLatestSettlement(reservesAdminKey); loadWalletBalance(reservesAdminKey); }}
                    disabled={reservesLoading}
                    className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-4 py-2 uppercase tracking-wider hover:bg-dl-navy hover:text-white transition-colors disabled:opacity-50"
                  >
                    {reservesLoading ? 'Loading…' : 'Refresh'}
                  </button>
                  {reservesData?.fetchedAt && (
                    <span className="font-dl-mono text-[9px] text-dl-gray">
                      Last fetched: {new Date(reservesData.fetchedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {/* ── Funding Source — shown immediately after key is entered ── */}
                {reservesAdminKey && (() => {
                  const fmtUsd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
                  const settlementNetPay = allocLatestSettlement?.net_pay ?? null;
                  const walletAvailableUsd = walletBalance ? walletBalance.available_usd : null;
                  const customUsd = customFundingAmount !== '' ? Number(customFundingAmount) : null;
                  const fundingAmount: number | null =
                    walletFundingSource === 'wallet'  ? walletAvailableUsd :
                    walletFundingSource === 'custom'  ? (customUsd != null && Number.isFinite(customUsd) && customUsd > 0 ? customUsd : null) :
                    settlementNetPay;
                  return (
                    <div className="border border-dl-navy mb-5">
                      <div className="px-4 py-3 border-b border-dl-navy bg-dl-navy flex items-center justify-between">
                        <p className="font-dl-mono text-xs uppercase tracking-widest text-white font-bold">Funding Source</p>
                        {fundingAmount != null && (
                          <p className="font-dl-mono text-xs text-emerald-300 font-semibold">{fmtUsd(fundingAmount)} ready to allocate</p>
                        )}
                      </div>
                      <div className="px-4 py-4 bg-white flex flex-col gap-4">
                        {/* Source toggle */}
                        <div className="flex gap-0">
                          {(['settlement','wallet','custom'] as const).map(src => (
                            <button
                              key={src}
                              onClick={() => setWalletFundingSource(src)}
                              className={`font-dl-mono text-xs uppercase tracking-wider px-4 py-2 border transition-colors ${walletFundingSource === src ? 'bg-dl-navy text-white border-dl-navy' : 'bg-white text-dl-navy border-dl-border hover:bg-dl-bg-alt'}`}
                            >
                              {src === 'settlement' ? 'Settlement Net Pay' : src === 'wallet' ? 'Axiom Balance' : 'Custom Amount'}
                            </button>
                          ))}
                        </div>

                        {/* Settlement */}
                        {walletFundingSource === 'settlement' && (
                          <div className="flex items-baseline gap-3">
                            <p className="font-dl-mono text-xs text-dl-gray">Latest net pay:</p>
                            <p className="font-dl-mono text-base text-dl-navy font-semibold">
                              {settlementNetPay != null ? fmtUsd(settlementNetPay) : allocLatestLoading ? 'Loading…' : 'No settlement loaded'}
                            </p>
                          </div>
                        )}

                        {/* Axiom Balance */}
                        {walletFundingSource === 'wallet' && (
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">Available balance</p>
                              <p className="font-dl-mono text-2xl text-dl-navy font-bold">
                                {walletBalanceLoading ? 'Loading…' : walletBalance != null ? fmtUsd(walletBalance.available_usd) : '$0.00'}
                              </p>
                              {walletBalance && walletBalance.pending_cents > 0 && (
                                <p className="font-dl-mono text-xs text-dl-gray mt-1">{fmtUsd(walletBalance.pending_usd)} pending</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray">Top up via debit card</p>
                              <div className="flex gap-2 flex-wrap">
                                {[25, 100, 250, 500].map(d => (
                                  <button
                                    key={d}
                                    disabled={walletTopupLoading}
                                    onClick={() => startWalletTopup(d * 100)}
                                    className="font-dl-mono text-xs border border-dl-navy text-dl-navy px-3 py-1.5 uppercase tracking-wider hover:bg-dl-navy hover:text-white disabled:opacity-50 transition-colors font-semibold"
                                  >
                                    +${d}
                                  </button>
                                ))}
                                <button
                                  disabled={walletTopupLoading}
                                  onClick={() => loadWalletBalance(reservesAdminKey)}
                                  className="font-dl-mono text-xs border border-dl-border text-dl-gray px-3 py-1.5 uppercase tracking-wider hover:text-dl-navy disabled:opacity-50"
                                >
                                  {walletBalanceLoading ? '…' : 'Refresh'}
                                </button>
                              </div>
                              {walletTopupLoading && <p className="font-dl-mono text-xs text-dl-gray">Opening Stripe checkout…</p>}
                            </div>
                          </div>
                        )}

                        {/* Custom amount */}
                        {walletFundingSource === 'custom' && (
                          <div className="flex items-baseline gap-3">
                            <p className="font-dl-mono text-xs text-dl-gray">Enter amount:</p>
                            <div className="flex items-center gap-1">
                              <span className="font-dl-mono text-sm text-dl-gray">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={customFundingAmount}
                                onChange={e => setCustomFundingAmount(e.target.value)}
                                placeholder="0.00"
                                className="font-dl-mono text-sm border border-dl-border px-2 py-1.5 w-32 text-right outline-none bg-white"
                              />
                            </div>
                            {fundingAmount != null && (
                              <p className="font-dl-mono text-xs text-dl-forest font-semibold">{fmtUsd(fundingAmount)} will be split</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {reservesError && (
                  <div className="border border-dl-error p-4 mb-4">
                    <p className="font-dl-mono text-xs text-dl-error">{reservesError}</p>
                  </div>
                )}

                {reservesLoading && !reservesData && (
                  <p className="font-dl-mono text-xs text-dl-gray">Fetching reserve positions from Arbitrum One…</p>
                )}

                {!reservesLoading && !reservesData && !reservesError && (
                  <div className="border border-dl-border p-8 text-center">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">No data loaded</p>
                    <p className="font-dl-serif text-sm text-dl-gray mt-2">Enter admin key and click Refresh to load live reserve balances.</p>
                  </div>
                )}

                {reservesData && (
                  <>
                    {/* Totals strip */}
                    {(() => {
                      // ── 7D change % from pre-computed aggregate buckets ─────
                      let sevenDayChange: number | null = null;
                      if (reservesAggregateSortedTimes.length >= 2) {
                        const oldest = reservesAggregateBuckets[reservesAggregateSortedTimes[0]];
                        const latest = reservesAggregateBuckets[reservesAggregateSortedTimes[reservesAggregateSortedTimes.length - 1]];
                        if (oldest > 0) sevenDayChange = ((latest - oldest) / oldest) * 100;
                      }

                      // ── HEALTHY vs ALERT asset count from live data ─────────
                      type AssetStatus = { status: string };
                      const assets = reservesData.assets as AssetStatus[];
                      const healthyCount = assets.filter(a => a.status === 'OK').length;
                      const alertCount   = assets.filter(a => a.status !== 'OK').length;

                      const items = [
                        {
                          label: 'Total Reserve USD Value',
                          value: reservesData.totals.totalValueUsdFormatted,
                          color: 'text-dl-navy',
                        },
                        {
                          label: '7D USD Change',
                          value: sevenDayChange !== null
                            ? `${sevenDayChange >= 0 ? '+' : ''}${sevenDayChange.toFixed(2)}%`
                            : reservesHistoryLoading ? 'Loading…' : '—',
                          color: sevenDayChange === null
                            ? 'text-dl-gray'
                            : sevenDayChange > 0.01
                              ? 'text-dl-forest'
                              : sevenDayChange < -0.01
                                ? 'text-dl-error'
                                : 'text-dl-gray',
                        },
                        {
                          label: 'Asset Health',
                          value: `${healthyCount} HEALTHY · ${alertCount} ALERT`,
                          color: alertCount > 0 ? 'text-dl-error' : 'text-dl-forest',
                        },
                        {
                          label: 'ETH Gas Reserve',
                          value: reservesData.totals.ethStatus === 'LOW' ? 'LOW' : 'NOMINAL',
                          color: reservesData.totals.ethStatus === 'LOW' ? 'text-dl-error' : 'text-dl-forest',
                        },
                        {
                          label: 'AXAU Buffer',
                          value: reservesData.totals.axauBufferCapacity === 'UNKNOWN' ? '—' : reservesData.totals.axauBufferCapacity,
                          color: reservesData.totals.axauBufferCapacity === 'SUFFICIENT' ? 'text-dl-forest' : reservesData.totals.axauBufferCapacity === 'DEPLETED' ? 'text-dl-error' : reservesData.totals.axauBufferCapacity === 'PARTIAL' ? 'text-yellow-700' : 'text-dl-gray',
                        },
                        {
                          label: 'AXAU Mint',
                          value: reservesData.totals.mintPaused ? 'PAUSED' : 'ACTIVE',
                          color: reservesData.totals.mintPaused ? 'text-dl-error' : 'text-dl-forest',
                        },
                      ];

                      return (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 border border-dl-border mb-6 bg-dl-bg-alt">
                          {items.map((item, i) => (
                            <div key={i} className="p-4 border-r border-dl-border last:border-r-0 border-b md:border-b-0">
                              <p className="font-dl-mono text-[9px] text-dl-gray uppercase tracking-wider mb-1">{item.label}</p>
                              <p className={`font-dl-mono text-sm font-bold ${item.color}`}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* 7-day portfolio USD sparkline */}
                    {(() => {
                      if (reservesHistoryLoading && reservesAggregateSortedTimes.length === 0) {
                        return (
                          <div className="border border-dl-border mb-4 px-5 py-2 bg-dl-bg">
                            <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider">7D Portfolio Trend — loading…</p>
                          </div>
                        );
                      }
                      if (reservesAggregateSortedTimes.length < 2) return null;

                      // Use pre-computed aggregate buckets — identical source to 7D Change %
                      const buckets = reservesAggregateBuckets;
                      const sortedTimes = reservesAggregateSortedTimes;

                      const W = 600; const H = 40; const PAD = 3;
                      const drawH = H - PAD * 2;
                      const values = sortedTimes.map(t => buckets[t]);
                      const minVal = Math.min(...values);
                      const maxVal = Math.max(...values);
                      const range = maxVal - minVal || 1;

                      const points = sortedTimes.map((t, i) => {
                        const x = (i / (sortedTimes.length - 1)) * W;
                        const y = PAD + drawH - ((buckets[t] - minVal) / range) * drawH;
                        return `${x.toFixed(1)},${y.toFixed(1)}`;
                      }).join(' ');

                      const oldest    = sortedTimes[0];
                      const latest    = sortedTimes[sortedTimes.length - 1];
                      const latestVal = buckets[latest];
                      const oldestVal = buckets[oldest];
                      const pctChange = oldestVal > 0 ? ((latestVal - oldestVal) / oldestVal) * 100 : 0;
                      const trend     = pctChange > 0.01 ? 'up' : pctChange < -0.01 ? 'down' : 'flat';
                      const trendColor = trend === 'up' ? '#166534' : trend === 'down' ? '#991b1b' : '#64748b';
                      const daySpan   = Math.round((new Date(latest).getTime() - new Date(oldest).getTime()) / 86400000);
                      const dotX      = W.toFixed(1);
                      const dotY      = (PAD + drawH - ((latestVal - minVal) / range) * drawH).toFixed(1);
                      const fmtDate   = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      const fmtUsd    = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                      return (
                        <div className="border border-dl-border mb-4 px-5 py-3 bg-dl-bg">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider">
                              {daySpan > 0 ? `${daySpan}D` : 'Intraday'} Portfolio Trend · {sortedTimes.length} snapshot{sortedTimes.length !== 1 ? 's' : ''}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="font-dl-mono text-[8px]" style={{ color: trendColor }}>
                                {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
                              </span>
                              <span className="font-dl-mono text-[8px] text-dl-navy font-bold">
                                {fmtUsd(latestVal)}
                              </span>
                            </div>
                          </div>
                          <svg
                            viewBox={`0 0 ${W} ${H}`}
                            width="100%"
                            height={H}
                            preserveAspectRatio="none"
                            aria-label={`${daySpan > 0 ? `${daySpan}-day` : 'intraday'} total reserve portfolio trend`}
                          >
                            <polyline
                              points={points}
                              fill="none"
                              stroke={trendColor}
                              strokeWidth="1.5"
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              vectorEffect="non-scaling-stroke"
                            />
                            <circle
                              cx={dotX}
                              cy={dotY}
                              r="2.5"
                              fill={trendColor}
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="font-dl-mono text-[7px] text-dl-gray opacity-60">{fmtDate(oldest)}</p>
                            <p className="font-dl-mono text-[7px] text-dl-gray opacity-60">{fmtDate(latest)}</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Reserve composition breakdown bar */}
                    {reservesData.totals.totalValueUsd > 0 && (() => {
                      const ASSET_COLORS: Record<string, string> = {
                        ETH: 'bg-blue-400', PAXG: 'bg-yellow-500', AXAU: 'bg-amber-600',
                        AXM: 'bg-emerald-600', USDC: 'bg-green-400', AXUSD: 'bg-teal-500',
                      };
                      const valued = (reservesData.assets as any[]).filter((a: any) => a.usdValue !== null && a.usdValue > 0);
                      return (
                        <div className="mb-6">
                          <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider mb-2">Reserve Composition</p>
                          <div className="flex h-5 w-full overflow-hidden border border-dl-border">
                            {valued.map((a: any) => {
                              const pct = ((a.usdValue as number) / reservesData.totals.totalValueUsd) * 100;
                              return (
                                <div
                                  key={a.symbol}
                                  className={ASSET_COLORS[a.symbol] ?? 'bg-dl-gray'}
                                  style={{ width: `${pct}%` }}
                                  title={`${a.symbol}: ${pct.toFixed(1)}% ($${(a.usdValue as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
                                />
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                            {valued.map((a: any) => {
                              const pct = ((a.usdValue as number) / reservesData.totals.totalValueUsd) * 100;
                              return (
                                <div key={a.symbol} className="flex items-center gap-1">
                                  <span className={`inline-block w-2 h-2 flex-shrink-0 ${ASSET_COLORS[a.symbol] ?? 'bg-dl-gray'}`} />
                                  <span className="font-dl-mono text-[9px] text-dl-gray">{a.symbol} {pct.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Asset cards — 2-column grid on desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {(reservesData.assets as any[]).map((asset: any) => {
                        const statusConfig: Record<string, { border: string; badge: string; text: string }> = {
                          OK:       { border: 'border-dl-border',   badge: 'border-dl-forest text-dl-forest bg-green-50',  text: 'OK' },
                          LOW:      { border: 'border-yellow-400',  badge: 'border-yellow-500 text-yellow-700 bg-yellow-50', text: 'LOW' },
                          PARTIAL:  { border: 'border-yellow-400',  badge: 'border-yellow-500 text-yellow-700 bg-yellow-50', text: 'PARTIAL' },
                          ZERO:     { border: 'border-dl-border',   badge: 'border-dl-gray text-dl-gray',                text: 'ZERO' },
                          DEPLETED: { border: 'border-dl-error',    badge: 'border-dl-error text-dl-error bg-red-50',    text: 'DEPLETED' },
                          UNKNOWN:  { border: 'border-dl-border',   badge: 'border-dl-gray text-dl-gray',                text: '—' },
                        };
                        const sc = statusConfig[asset.status] ?? statusConfig.UNKNOWN;
                        const isDepositCopied = reservesCopied === asset.depositAddress;

                        return (
                          <div key={asset.symbol} className={`border ${sc.border} bg-dl-bg-alt`}>
                            {/* Card header */}
                            <div className="px-5 py-4 border-b border-dl-border flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-dl-mono text-base font-bold text-dl-navy">{asset.symbol}</span>
                                  <span className={`font-dl-mono text-[9px] border px-1.5 py-0.5 uppercase tracking-wider ${sc.badge}`}>
                                    {sc.text}
                                  </span>
                                </div>
                                <p className="font-dl-mono text-[10px] text-dl-gray truncate">{asset.label}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-dl-mono text-sm font-bold text-dl-navy">{asset.balanceFormatted}</p>
                                <p className="font-dl-mono text-[10px] text-dl-gray mt-0.5">
                                  {asset.usdValue !== null
                                    ? '$' + (asset.usdValue as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : 'Price unavailable'}
                                </p>
                              </div>
                            </div>

                            {/* Status detail */}
                            <div className="px-5 py-3 border-b border-dl-border">
                              <p className="font-dl-mono text-[9px] text-dl-gray leading-relaxed">{asset.statusDetail}</p>
                              {asset.price !== null && (
                                <p className="font-dl-mono text-[9px] text-dl-gray mt-1">
                                  Price: ${typeof asset.price === 'number' && asset.price > 100
                                    ? asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : (asset.price as number).toFixed(6)
                                  } · {asset.priceSource}
                                </p>
                              )}
                              {asset.lastUpdatedAt && (
                                <p className="font-dl-mono text-[8px] text-dl-gray mt-1 opacity-60">
                                  Updated: {new Date(asset.lastUpdatedAt).toLocaleTimeString()}
                                </p>
                              )}
                            </div>

                            {/* 7-day balance sparkline */}
                            {(() => {
                              const pts = reservesHistory[asset.symbol] ?? [];
                              if (pts.length < 2 && !reservesHistoryLoading) return null;
                              if (reservesHistoryLoading && pts.length === 0) {
                                return (
                                  <div className="px-5 py-2 border-b border-dl-border">
                                    <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider">7D Trend — loading…</p>
                                  </div>
                                );
                              }
                              if (pts.length < 2) return null;
                              const values = pts.map(p => p.balance);
                              const minVal = Math.min(...values);
                              const maxVal = Math.max(...values);
                              const range = maxVal - minVal || 1;
                              const W = 200;
                              const H = 28;
                              const PAD = 2;
                              const drawH = H - PAD * 2;
                              const points = pts.map((p, i) => {
                                const x = (i / (pts.length - 1)) * W;
                                const y = PAD + drawH - ((p.balance - minVal) / range) * drawH;
                                return `${x.toFixed(1)},${y.toFixed(1)}`;
                              }).join(' ');
                              const latest = pts[pts.length - 1];
                              const oldest = pts[0];
                              const pctChange = oldest.balance !== 0
                                ? ((latest.balance - oldest.balance) / oldest.balance) * 100
                                : 0;
                              const trend = pctChange > 0.01 ? 'up' : pctChange < -0.01 ? 'down' : 'flat';
                              const trendColor = trend === 'up' ? '#166534' : trend === 'down' ? '#991b1b' : '#64748b';
                              const firstHour = new Date(oldest.t);
                              const lastHour  = new Date(latest.t);
                              const daySpan = Math.round((lastHour.getTime() - firstHour.getTime()) / 86400000);
                              return (
                                <div className="px-5 py-2 border-b border-dl-border bg-dl-bg">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider">
                                      {daySpan}D Balance Trend · {pts.length} snapshots
                                    </p>
                                    <p className="font-dl-mono text-[8px]" style={{ color: trendColor }}>
                                      {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
                                    </p>
                                  </div>
                                  <svg
                                    viewBox={`0 0 ${W} ${H}`}
                                    width="100%"
                                    height={H}
                                    preserveAspectRatio="none"
                                    aria-label={`${asset.symbol} ${daySpan}-day balance trend`}
                                  >
                                    <polyline
                                      points={points}
                                      fill="none"
                                      stroke={trendColor}
                                      strokeWidth="1.2"
                                      strokeLinejoin="round"
                                      strokeLinecap="round"
                                      vectorEffect="non-scaling-stroke"
                                    />
                                    <circle
                                      cx={(((pts.length - 1) / (pts.length - 1)) * W).toFixed(1)}
                                      cy={(PAD + drawH - ((latest.balance - minVal) / range) * drawH).toFixed(1)}
                                      r="2"
                                      fill={trendColor}
                                      vectorEffect="non-scaling-stroke"
                                    />
                                  </svg>
                                  <div className="flex items-center justify-between mt-0.5">
                                    <p className="font-dl-mono text-[7px] text-dl-gray opacity-60">
                                      {firstHour.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </p>
                                    <p className="font-dl-mono text-[7px] text-dl-gray opacity-60">
                                      {lastHour.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Location breakdown */}
                            {(asset.locationBreakdown as any[]).length > 1 && (
                              <div className="px-5 py-3 border-b border-dl-border">
                                <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider mb-2">Location Breakdown</p>
                                <div className="space-y-1">
                                  {(asset.locationBreakdown as any[]).map((loc: any) => (
                                    <div key={loc.address} className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1 min-w-0">
                                        <a
                                          href={loc.arbiscanUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-dl-mono text-[9px] text-dl-navy underline truncate max-w-[140px]"
                                          title={loc.address}
                                        >
                                          {loc.label}
                                        </a>
                                      </div>
                                      <span className="font-dl-mono text-[9px] text-dl-gray flex-shrink-0">{loc.balanceFormatted}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Deposit address + action */}
                            <div className="px-5 py-3 flex items-start justify-between gap-3 flex-wrap">
                              <div className="min-w-0 flex-1">
                                <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider mb-1">Deposit Address</p>
                                <a
                                  href={asset.depositArbiscanUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-dl-mono text-[10px] text-dl-navy underline break-all"
                                  title={asset.depositLabel}
                                >
                                  {asset.depositAddress.slice(0, 10)}…{asset.depositAddress.slice(-8)}
                                </a>
                                <p className="font-dl-mono text-[8px] text-dl-gray mt-0.5">{asset.depositLabel}</p>
                              </div>
                              <div className="flex-shrink-0 flex flex-col gap-1.5">
                                {/* Primary action */}
                                {(asset.actionType === 'copy_address' || asset.actionType === 'axau_buffer') && (
                                  <button
                                    onClick={() => copyReserveAddr(asset.depositAddress)}
                                    className={`font-dl-mono text-[9px] border px-3 py-1.5 uppercase tracking-wider transition-colors ${
                                      isDepositCopied
                                        ? 'border-dl-forest text-dl-forest bg-green-50'
                                        : 'border-dl-navy text-dl-navy hover:bg-dl-navy hover:text-white'
                                    }`}
                                  >
                                    {isDepositCopied ? 'Copied ✓' : asset.actionLabel}
                                  </button>
                                )}
                                {(asset.actionType === 'open_bitgo' || asset.actionType === 'open_safe' || asset.actionType === 'open_contract') && asset.actionUrl && (
                                  <a
                                    href={asset.actionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-dl-mono text-[9px] border border-dl-navy text-dl-navy px-3 py-1.5 uppercase tracking-wider hover:bg-dl-navy hover:text-white transition-colors text-center"
                                  >
                                    {asset.actionLabel} ↗
                                  </a>
                                )}
                                {/* Purchase link — shown when asset has a purchaseUrl (e.g. AXM → Protocol Exchange) */}
                                {asset.purchaseUrl && (
                                  <a
                                    href={asset.purchaseUrl}
                                    className="font-dl-mono text-[9px] border border-dl-forest text-dl-forest px-3 py-1.5 uppercase tracking-wider hover:bg-dl-forest hover:text-white transition-colors text-center"
                                  >
                                    {asset.purchaseLabel ?? `Buy ${asset.symbol}`} ↗
                                  </a>
                                )}
                                {asset.secondFundingUrl && (
                                  <a
                                    href={asset.secondFundingUrl}
                                    className="font-dl-mono text-[9px] border border-dl-forest text-dl-forest px-3 py-1.5 uppercase tracking-wider hover:bg-dl-forest hover:text-white transition-colors text-center"
                                  >
                                    {asset.secondFundingLabel ?? 'Fund'} ↗
                                  </a>
                                )}
                                {/* Secondary external link for copy_address assets that also have an actionUrl (e.g. AXM → Governance Safe) */}
                                {asset.actionType === 'copy_address' && asset.actionUrl && (
                                  <a
                                    href={asset.actionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-dl-mono text-[9px] border border-dl-border text-dl-gray px-3 py-1.5 uppercase tracking-wider hover:text-dl-navy transition-colors text-center"
                                  >
                                    Governance Safe ↗
                                  </a>
                                )}
                                {/* Secondary: view on Arbiscan */}
                                <a
                                  href={asset.depositArbiscanUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-dl-mono text-[9px] border border-dl-border text-dl-gray px-3 py-1.5 uppercase tracking-wider hover:text-dl-navy text-center"
                                >
                                  View ↗
                                </a>
                                {/* AXAU buffer copy-also option */}
                                {asset.actionType === 'axau_buffer' && (
                                  <button
                                    onClick={() => copyReserveAddr(asset.depositAddress)}
                                    className="font-dl-mono text-[9px] border border-dl-border text-dl-gray px-3 py-1.5 uppercase tracking-wider hover:text-dl-navy"
                                  >
                                    Replenish: Send PAXG ↓
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* AXAU buffer-specific extra state */}
                            {asset.symbol === 'AXAU' && asset.bufferCapacity && (
                              <div className={`px-5 py-2 border-t border-dl-border ${
                                asset.bufferCapacity === 'SUFFICIENT' ? 'bg-green-50' :
                                asset.bufferCapacity === 'DEPLETED'   ? 'bg-red-50'   :
                                'bg-yellow-50'
                              }`}>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className={`font-dl-mono text-[9px] border px-2 py-0.5 uppercase tracking-wider ${
                                    asset.bufferCapacity === 'SUFFICIENT' ? 'border-dl-forest text-dl-forest' :
                                    asset.bufferCapacity === 'DEPLETED'   ? 'border-dl-error text-dl-error' :
                                    'border-yellow-500 text-yellow-700'
                                  }`}>
                                    {asset.bufferCapacity}
                                  </span>
                                  {asset.mintPaused && (
                                    <span className="font-dl-mono text-[9px] border border-dl-error text-dl-error px-2 py-0.5 uppercase tracking-wider">
                                      MINT PAUSED
                                    </span>
                                  )}
                                  <span className="font-dl-mono text-[9px] text-dl-gray">
                                    PATH A: send AXAU direct · PATH B: trigger mint below
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* AXAU — Trigger Buffer Mint from PAXG (PATH B) */}
                            {asset.symbol === 'AXAU' && (
                              <div className="px-5 py-3 border-t border-dl-border">
                                <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider mb-2">Trigger Mint from PAXG · PATH B</p>
                                {asset.oracleStale && (
                                  <div className="flex items-center gap-2 mb-2 px-2 py-1 border border-yellow-400 bg-yellow-50">
                                    <span className="font-dl-mono text-[8px] border border-yellow-500 text-yellow-700 px-1.5 py-0.5 uppercase tracking-wider">Oracle Stale</span>
                                    <span className="font-dl-mono text-[8px] text-yellow-700">
                                      XAU/USD price stale ({asset.oracleAgeSeconds !== null && asset.oracleAgeSeconds !== undefined ? Math.floor(asset.oracleAgeSeconds / 3600) + 'h' : '?'} old · threshold {asset.oracleThresholdSeconds !== undefined ? Math.floor(asset.oracleThresholdSeconds / 3600) + 'h' : '27h'}) — mint disabled
                                    </span>
                                  </div>
                                )}
                                <div className="flex gap-2 items-center flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-dl-mono text-[9px] text-dl-gray">PAXG:</span>
                                    <input
                                      type="number"
                                      value={reservesTopUpAmount}
                                      onChange={e => setReservesTopUpAmount(e.target.value)}
                                      className="font-dl-mono text-xs border border-dl-border px-2 py-1.5 bg-white w-24 outline-none"
                                      min="0.001"
                                      step="0.01"
                                      placeholder="0.01"
                                    />
                                  </div>
                                  <button
                                    onClick={topUpAxauBuffer}
                                    disabled={reservesTopUpLoading || !!asset.mintPaused || !!asset.oracleStale || asset.bufferCapacity === 'DEPLETED' || !reservesAdminKey || (() => {
                                      const paxg = (reservesData?.assets as any[])?.find((a: any) => a.symbol === 'PAXG');
                                      return !paxg || paxg.balance <= 0;
                                    })()}
                                    title={
                                      !!asset.oracleStale ? `Chainlink XAU/USD oracle is stale (${asset.oracleAgeSeconds !== null && asset.oracleAgeSeconds !== undefined ? Math.floor(asset.oracleAgeSeconds / 3600) + 'h' : '?'} old) — mint gated until oracle updates` :
                                      asset.mintPaused ? 'Mint is paused on-chain (MintRedeemController.mintPaused = true)' :
                                      asset.bufferCapacity === 'DEPLETED' ? 'AXAU buffer is DEPLETED — replenish buffer before triggering another mint' :
                                      !reservesAdminKey ? 'Admin key required' :
                                      (() => {
                                        const paxg = (reservesData?.assets as any[])?.find((a: any) => a.symbol === 'PAXG');
                                        return (!paxg || paxg.balance <= 0) ? 'No PAXG balance detected in deployer EOA' : 'Mint AXAU from PAXG into deployer buffer (PATH B)';
                                      })()
                                    }
                                    className="font-dl-mono text-[9px] border border-dl-navy text-dl-navy px-3 py-1.5 uppercase tracking-wider hover:bg-dl-navy hover:text-white disabled:opacity-50 transition-colors"
                                  >
                                    {reservesTopUpLoading ? 'Submitting…' : 'Trigger Mint from PAXG'}
                                  </button>
                                </div>
                                {reservesTopUpResult && (
                                  <p className={`font-dl-mono text-[9px] mt-2 leading-relaxed break-all ${reservesTopUpResult.ok ? 'text-dl-forest' : 'text-dl-error'}`}>
                                    {reservesTopUpResult.msg}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* AXUSD — Inline Mint Form */}
                            {asset.symbol === 'AXUSD' && (
                              <div className="px-5 py-3 border-t border-dl-border">
                                <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider mb-2">Deposit Action — Mint AXUSD (MINTER_ROLE · Deployer EOA)</p>
                                <div className="flex gap-2 flex-wrap items-center">
                                  <input
                                    type="number"
                                    placeholder="Amount"
                                    value={reservesMintAmount}
                                    onChange={e => setReservesMintAmount(e.target.value)}
                                    className="font-dl-mono text-xs border border-dl-border px-2 py-1.5 bg-white w-28 outline-none"
                                    min="0"
                                    step="100"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Recipient 0x…"
                                    value={reservesMintTo}
                                    onChange={e => setReservesMintTo(e.target.value)}
                                    className="font-dl-mono text-xs border border-dl-border px-2 py-1.5 bg-white w-44 outline-none"
                                  />
                                  <button
                                    onClick={mintAxusd}
                                    disabled={reservesMintLoading || !reservesAdminKey}
                                    title={!reservesAdminKey ? 'Admin key required' : 'Mint AXUSD to recipient via deployer EOA (direct) or Safe proposal (≥10k)'}
                                    className="font-dl-mono text-[9px] border border-dl-navy text-dl-navy px-3 py-1.5 uppercase tracking-wider hover:bg-dl-navy hover:text-white disabled:opacity-50 transition-colors"
                                  >
                                    {reservesMintLoading ? 'Minting…' : 'Mint AXUSD'}
                                  </button>
                                </div>
                                <p className="font-dl-mono text-[8px] text-dl-gray mt-1.5 opacity-70">Under 10,000 AXUSD executes directly · 10,000+ creates a Safe proposal</p>
                                {reservesMintResult && (
                                  <p className={`font-dl-mono text-[9px] mt-2 leading-relaxed break-all ${reservesMintResult.ok ? 'text-dl-forest' : 'text-dl-error'}`}>
                                    {reservesMintResult.msg}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer — addresses reference */}
                    <div className="border-t border-dl-border pt-5">
                      <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider mb-3">Address Reference</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[
                          { label: 'Deployer EOA', addr: reservesData.deployer },
                          { label: 'Governance Safe (3-of-5)', addr: reservesData.governanceSafe },
                        ].map(item => (
                          <div key={item.addr} className="flex items-center justify-between gap-3 border border-dl-border px-4 py-2 bg-dl-bg-alt">
                            <div>
                              <p className="font-dl-mono text-[8px] text-dl-gray uppercase tracking-wider">{item.label}</p>
                              <p className="font-dl-mono text-[10px] text-dl-navy mt-0.5 break-all">{item.addr}</p>
                            </div>
                            <button
                              onClick={() => copyReserveAddr(item.addr)}
                              className={`font-dl-mono text-[9px] border px-2 py-1 uppercase tracking-wider flex-shrink-0 ${
                                reservesCopied === item.addr
                                  ? 'border-dl-forest text-dl-forest bg-green-50'
                                  : 'border-dl-border text-dl-gray hover:text-dl-navy'
                              }`}
                            >
                              {reservesCopied === item.addr ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    ALLOCATION GUIDANCE — fixed-policy split of latest weekly
                    settlement net pay across reserves + AI alternative.
                    Lives on Reserves tab because these are reserve allocations.
                ───────────────────────────────────────────────────────────────── */}
                {reservesAdminKey && (() => {
                  const fmtUsd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
                  const dp = allocPolicies.driver;
                  const tp = allocPolicies.treasury;
                  const latest = allocLatestSettlement;

                  // Resolve funding amount from selected source
                  const settlementNetPay = latest?.net_pay ?? null;
                  const walletAvailableUsd = walletBalance ? walletBalance.available_usd : null;
                  const customUsd = customFundingAmount !== '' ? Number(customFundingAmount) : null;
                  const fundingAmount: number | null =
                    walletFundingSource === 'wallet'     ? walletAvailableUsd :
                    walletFundingSource === 'custom'     ? (customUsd != null && Number.isFinite(customUsd) && customUsd > 0 ? customUsd : null) :
                    settlementNetPay;

                  const driverAmount   = (fundingAmount != null && dp) ? (fundingAmount * dp.share_pct) / 100 : null;
                  const treasuryAmount = (fundingAmount != null && tp) ? (fundingAmount * tp.share_pct) / 100 : null;

                  const renderColumn = (
                    scope: 'driver' | 'treasury',
                    policy: AllocPolicyRow | null,
                    scopeAmount: number | null,
                  ) => {
                    const aiKey = latest ? `${latest.document_id}:${scope}` : '';
                    const ai = aiKey ? allocAiCache[aiKey] : undefined;
                    return (
                      <div className="border border-dl-border bg-white">
                        <div className="px-4 py-2.5 border-b border-dl-border bg-dl-bg-alt flex items-center justify-between">
                          <div>
                            <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray">{scope === 'driver' ? 'Driver Allocation (FUQC personal)' : 'Treasury Allocation (Protocol)'}</p>
                            <p className="font-dl-mono text-[10px] text-dl-navy mt-0.5">
                              {policy ? `${policy.share_pct}% of net pay` : '—'} {scopeAmount != null && <span className="text-dl-forest">· {fmtUsd(scopeAmount)}</span>}
                            </p>
                          </div>
                          {latest && (
                            <button
                              onClick={() => generateAllocationAi(latest.document_id, scope)}
                              disabled={ai?.loading}
                              className="font-dl-mono text-[9px] border border-dl-navy text-dl-navy px-2.5 py-1 uppercase tracking-wider hover:bg-dl-navy hover:text-white disabled:opacity-50 transition-colors"
                            >
                              {ai?.loading ? 'Thinking…' : ai?.result ? 'Regenerate AI' : 'Generate AI alternative'}
                            </button>
                          )}
                        </div>
                        <table className="w-full">
                          <thead className="bg-dl-bg-alt">
                            <tr>
                              <th className="text-left font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray px-3 py-1.5">Asset</th>
                              <th className="text-right font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray px-3 py-1.5">Policy %</th>
                              <th className="text-right font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray px-3 py-1.5">Policy $</th>
                              {ai?.result && <>
                                <th className="text-right font-dl-mono text-[9px] uppercase tracking-wider text-dl-forest px-3 py-1.5">AI %</th>
                                <th className="text-right font-dl-mono text-[9px] uppercase tracking-wider text-dl-forest px-3 py-1.5">AI $</th>
                              </>}
                            </tr>
                          </thead>
                          <tbody>
                            {allocAssets.map(a => {
                              const pPct = policy?.weights[a.key] ?? 0;
                              const pAmt = scopeAmount != null ? (scopeAmount * pPct) / 100 : null;
                              const aPct = ai?.result?.weights[a.key] ?? 0;
                              const aAmt = ai?.result ? (ai.result.scope_amount * aPct) / 100 : null;
                              const delta = ai?.result ? aPct - pPct : 0;
                              const isHidden = pPct === 0 && aPct === 0;
                              if (isHidden) return null;
                              return (
                                <tr key={a.key} className="border-t border-dl-border">
                                  <td className="px-3 py-1.5">
                                    <p className="font-dl-mono text-[11px] text-dl-navy">{a.label}</p>
                                    <p className="font-dl-mono text-[8px] text-dl-gray">{a.note}</p>
                                  </td>
                                  <td className="text-right font-dl-mono text-[11px] text-dl-navy px-3 py-1.5">{pPct}%</td>
                                  <td className="text-right font-dl-mono text-[11px] text-dl-navy px-3 py-1.5">{pAmt != null ? fmtUsd(pAmt) : '—'}</td>
                                  {ai?.result && <>
                                    <td className={`text-right font-dl-mono text-[11px] px-3 py-1.5 ${delta > 0 ? 'text-dl-forest' : delta < 0 ? 'text-dl-error' : 'text-dl-gray'}`}>
                                      {aPct}% {delta !== 0 && <span className="text-[8px]">({delta > 0 ? '+' : ''}{delta})</span>}
                                    </td>
                                    <td className="text-right font-dl-mono text-[11px] text-dl-navy px-3 py-1.5">{aAmt != null ? fmtUsd(aAmt) : '—'}</td>
                                  </>}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {ai?.error && <p className="font-dl-mono text-[10px] text-dl-error px-3 py-2 border-t border-dl-border">{ai.error}</p>}
                        {ai?.result?.rationale && (
                          <div className="border-t border-dl-border px-3 py-2 bg-dl-bg-alt">
                            <p className="font-dl-mono text-[8px] uppercase tracking-wider text-dl-gray mb-1">AI Rationale</p>
                            <p className="font-dl-serif text-xs text-dl-navy leading-relaxed">{ai.result.rationale}</p>
                            {ai.result.warnings && ai.result.warnings.length > 0 && (
                              <p className="font-dl-mono text-[9px] text-dl-error mt-1">⚠ {ai.result.warnings.join(' · ')}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div className="mt-8 border-t border-dl-border pt-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                        <div>
                          <h3 className="font-dl-serif text-lg text-dl-navy mb-1">Net-Pay Allocation Guidance</h3>
                          <p className="font-dl-mono text-[10px] text-dl-gray">
                            Splits the most recent weekly settlement net pay across reserve assets · Driver vs Treasury side-by-side · Fixed policy + AI alternative
                          </p>
                        </div>
                        <button
                          onClick={() => allocPolicyOpen ? setAllocPolicyOpen(false) : beginEditPolicy()}
                          disabled={!dp || !tp}
                          className="font-dl-mono text-[10px] border border-dl-border text-dl-gray px-3 py-1.5 uppercase tracking-wider hover:text-dl-navy disabled:opacity-50"
                        >
                          {allocPolicyOpen ? 'Close Policy Editor' : 'Edit Allocation Policy'}
                        </button>
                      </div>

                      {/* Latest settlement context */}
                      <div className="border border-dl-border bg-dl-bg-alt px-4 py-3 mb-4">
                        {allocLatestLoading && <p className="font-dl-mono text-[10px] text-dl-gray">Looking up latest settlement…</p>}
                        {!allocLatestLoading && !latest && (
                          <p className="font-dl-mono text-[10px] text-dl-gray">
                            No extracted settlement found. Upload a weekly statement on the Axiom Rail tab to enable allocation guidance.
                          </p>
                        )}
                        {latest && (
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                              <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray">Latest Settlement</p>
                              <p className="font-dl-mono text-[11px] text-dl-navy mt-0.5">
                                {latest.driver_name ?? 'Driver —'} · {latest.statement_date ?? '—'}
                                {latest.title && <span className="text-dl-gray"> · {latest.title}</span>}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray">Net Pay</p>
                              <p className="font-dl-mono text-base text-dl-forest mt-0.5">{netPay != null ? fmtUsd(netPay) : '—'}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Policy editor (collapsible) */}
                      {allocPolicyOpen && allocPolicyDraft && (
                        <div className="border border-dl-navy bg-white p-4 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-dl-mono text-[10px] uppercase tracking-wider text-dl-navy">Edit Allocation Policy</p>
                            <p className="font-dl-mono text-[9px] text-dl-gray">Driver share + Treasury share must sum to 100 · Each scope&apos;s asset weights must sum to 100</p>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {(['driver', 'treasury'] as const).map(scope => {
                              const draft = allocPolicyDraft[scope];
                              const sum = allocAssets.reduce((s, a) => s + (Number(draft.weights[a.key]) || 0), 0);
                              return (
                                <div key={scope} className="border border-dl-border p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="font-dl-mono text-[10px] uppercase tracking-wider text-dl-navy">{scope === 'driver' ? 'Driver' : 'Treasury'} share of net pay (%)</label>
                                    <input
                                      type="number"
                                      min={0} max={100} step={1}
                                      value={draft.share_pct}
                                      onChange={e => setAllocPolicyDraft(prev => prev ? { ...prev, [scope]: { ...prev[scope], share_pct: Number(e.target.value) } } : prev)}
                                      className="font-dl-mono text-xs border border-dl-border px-2 py-1 w-20 text-right outline-none"
                                    />
                                  </div>
                                  <table className="w-full">
                                    <tbody>
                                      {allocAssets.map(a => (
                                        <tr key={a.key} className="border-t border-dl-border">
                                          <td className="font-dl-mono text-[10px] text-dl-navy py-1.5">{a.label}</td>
                                          <td className="py-1.5 text-right">
                                            <input
                                              type="number"
                                              min={0} max={100} step={1}
                                              value={draft.weights[a.key]}
                                              onChange={e => setAllocPolicyDraft(prev => prev ? { ...prev, [scope]: { ...prev[scope], weights: { ...prev[scope].weights, [a.key]: Number(e.target.value) } } } : prev)}
                                              className="font-dl-mono text-xs border border-dl-border px-2 py-1 w-16 text-right outline-none"
                                            />
                                            <span className="font-dl-mono text-[9px] text-dl-gray ml-1">%</span>
                                          </td>
                                        </tr>
                                      ))}
                                      <tr className="border-t border-dl-navy">
                                        <td className="font-dl-mono text-[10px] uppercase text-dl-navy py-1.5">Sum</td>
                                        <td className={`font-dl-mono text-xs text-right py-1.5 pr-6 ${Math.abs(sum - 100) < 0.5 ? 'text-dl-forest' : 'text-dl-error'}`}>{sum}%</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })}
                          </div>
                          {allocPolicyError && <p className="font-dl-mono text-[10px] text-dl-error mt-3">{allocPolicyError}</p>}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={savePolicy}
                              disabled={allocPolicySaving}
                              className="font-dl-mono text-[10px] border border-dl-navy bg-dl-navy text-white px-4 py-1.5 uppercase tracking-wider hover:bg-dl-navy-dark disabled:opacity-50"
                            >{allocPolicySaving ? 'Saving…' : 'Save Policy'}</button>
                            <button
                              onClick={() => { setAllocPolicyOpen(false); setAllocPolicyDraft(null); setAllocPolicyError(null); }}
                              className="font-dl-mono text-[10px] border border-dl-border text-dl-gray px-4 py-1.5 uppercase tracking-wider hover:text-dl-navy"
                            >Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Side-by-side allocation columns */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {renderColumn('driver',   dp, driverAmount)}
                        {renderColumn('treasury', tp, treasuryAmount)}
                      </div>

                      <p className="font-dl-mono text-[8px] text-dl-gray mt-3 leading-relaxed">
                        Amounts shown in USD. Unit conversion to oz / tokens at execution time uses live oracle prices (PAXG/XAU for AXAU, KAG for silver, Camelot pool for AXUSD/AXM). The AI alternative may diverge from policy when the week shows abnormal escrow movement, large deductions, or other risk signals from the settlement payload.
                      </p>
                    </div>
                  );
                })()}
              </>
            )}
          </>
      </PageShell>
    </DesignLawLayout>
  );
}
