import { useState, useEffect } from 'react';
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
  | 'compliance';

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

  const [psmActivating, setPsmActivating] = useState(false);
  const [psmActivateKey, setPsmActivateKey] = useState('');
  const [psmActivateMsg, setPsmActivateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [psmAgentStatus, setPsmAgentStatus] = useState<boolean | null>(null);

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

  const loadComplianceTab = (key?: string) => {
    const k = key ?? complianceAdminKey;
    loadKycQueue(k);
    loadAccredQueue(k);
    loadComplianceLog(k);
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
              </>
            )}
          </>
      </PageShell>
    </DesignLawLayout>
  );
}
