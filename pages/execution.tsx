import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  DesignLawLayout,
  SectionHeading,
  StatusBadge,
  PaginationControls,
} from '../components/design-law';

interface UserProfile {
  user_id: string;
  wallet_address: string;
  current_tier_id: string;
  current_policy_mode: string;
  axm_balance: number;
  axusd_reserve_balance: number;
  paper_start_date: string | null;
  paper_trade_count: number;
  paper_win_rate: number;
  paper_max_drawdown: number;
  paper_sharpe: number | null;
  paper_pnl_axusd: number;
  live_enabled: boolean;
  risk_budget_axusd: number;
  last_qualification_score: number;
  execution_suspended: boolean;
  suspension_reason: string | null;
  daily_loss_limit_axusd: number;
  rolling_7d_loss_limit_axusd: number;
  max_drawdown_limit_pct: number;
  consecutive_loss_brake: number;
}

interface TierInfo {
  tier_id: string;
  tier_name: string;
  tier_level: number;
  min_eqs: number;
  min_paper_days: number;
  min_trade_count: number;
  max_drawdown_pct: number;
  execution_enabled: boolean;
  axm_required: number;
}

interface QualificationSnapshot {
  id: string;
  rbar: number;
  dsi: number;
  psc: number;
  vrs: number;
  eds: number;
  rcs: number;
  eqs: number;
  tier_result: string;
  created_at: string;
}

interface Execution {
  execution_id: string;
  symbol: string;
  asset_class: string;
  direction: string;
  is_live: boolean;
  intent_status: string;
  filled_price: number;
  filled_qty: number;
  close_price: number | null;
  pnl_axusd: number | null;
  pnl_pct: number | null;
  max_adverse_excursion: number;
  max_favorable_excursion: number;
  close_reason: string | null;
  opened_at: string;
  closed_at: string | null;
}

interface DashboardData {
  profile: UserProfile;
  tier: TierInfo | null;
  policyMode: any;
  latestQualification: QualificationSnapshot | null;
  openPositionCount: number;
  recentViolations: any[];
}

const TIER_DISPLAY: Record<string, { label: string; color: string }> = {
  PAPER: { label: 'Paper', color: 'text-gray-600' },
  TIER_1: { label: 'Tier 1', color: 'text-blue-700' },
  TIER_2: { label: 'Tier 2', color: 'text-green-700' },
  TIER_3: { label: 'Tier 3', color: 'text-amber-700' },
};

function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isFinite(n) ? n : null;
}

function formatAxusd(val: unknown): string {
  const n = toNum(val);
  if (n === null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)} AXUSD`;
}

function formatPct(val: unknown): string {
  const n = toNum(val);
  if (n === null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function formatScore(val: unknown): string {
  const n = toNum(val);
  if (n === null) return '—';
  return n.toFixed(3);
}

export default function ExecutionDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'qualification'>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [execPagination, setExecPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [inputUserId, setInputUserId] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const authHeaders = useCallback((): HeadersInit => {
    return { 'Content-Type': 'application/json', 'x-admin-key': adminKey };
  }, [adminKey]);

  const fetchProfile = useCallback(async (uid: string) => {
    if (!uid || !adminKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/execution/user-profile?userId=${uid}`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        setAuthenticated(false);
        throw new Error('Invalid admin key');
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load profile');
      }
      const json = await res.json();
      setData(json);
      setAuthenticated(true);
    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [adminKey, authHeaders]);

  const fetchHistory = useCallback(async (uid: string, page = 1) => {
    if (!uid || !adminKey) return;
    try {
      const res = await fetch(`/api/execution/history?userId=${uid}&page=${page}&limit=15`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setExecutions(json.executions || []);
        setExecPagination(json.pagination || { page: 1, limit: 15, total: 0, totalPages: 0 });
      }
    } catch {}
  }, [adminKey, authHeaders]);

  useEffect(() => {
    if (userId && authenticated) {
      fetchProfile(userId);
      fetchHistory(userId);
    }
  }, [userId, authenticated, fetchProfile, fetchHistory]);

  const handleSearch = () => {
    if (inputUserId.trim() && adminKey.trim()) {
      setUserId(inputUserId.trim());
      fetchProfile(inputUserId.trim());
      fetchHistory(inputUserId.trim());
    }
  };

  const tabs = [
    { key: 'overview' as const, label: 'System Overview' },
    { key: 'history' as const, label: 'Execution History' },
    { key: 'qualification' as const, label: 'Qualification' },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Graduated Execution Framework | AXIOM</title>
      </Head>

      <SectionHeading>Graduated Execution Framework</SectionHeading>
      <p className="text-sm font-mono text-gray-500 -mt-2 mb-4">Behavior-based qualification from paper trading to live execution</p>

      <div className="mb-8 space-y-4">
        <div>
          <label className="block text-sm font-mono text-gray-600 mb-2">Admin Key</label>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter admin authorization key"
            className="w-full border border-gray-300 px-3 py-2 font-mono text-sm bg-white focus:outline-none focus:border-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-mono text-gray-600 mb-2">User ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputUserId}
              onChange={(e) => setInputUserId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter user UUID"
              className="flex-1 border border-gray-300 px-3 py-2 font-mono text-sm bg-white focus:outline-none focus:border-gray-500"
            />
            <button
              onClick={handleSearch}
              disabled={!adminKey.trim()}
              className={`border px-4 py-2 text-sm font-mono ${
                adminKey.trim()
                  ? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800'
                  : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Load
            </button>
          </div>
        </div>
      </div>

      {!userId && !loading && (
        <div className="border border-gray-200 p-8 text-center">
          <p className="font-serif text-gray-500">Enter a user ID to load their execution profile</p>
        </div>
      )}

      {loading && userId && (
        <div className="border border-gray-200 p-8 text-center">
          <p className="font-mono text-sm text-gray-500">Loading profile...</p>
        </div>
      )}

      {error && (
        <div className="border border-red-200 bg-red-50 p-4 mb-6">
          <p className="font-mono text-sm text-red-700">{error}</p>
        </div>
      )}

      {data && (
        <>
          <div className="flex border-b border-gray-200 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-mono border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewTab data={data} />}
          {activeTab === 'history' && (
            <HistoryTab
              executions={executions}
              pagination={execPagination}
              onPageChange={(p) => fetchHistory(userId, p)}
            />
          )}
          {activeTab === 'qualification' && <QualificationTab data={data} />}
        </>
      )}
    </DesignLawLayout>
  );
}

function OverviewTab({ data }: { data: DashboardData }) {
  const { profile, tier, policyMode } = data;
  const tierDisplay = TIER_DISPLAY[profile.current_tier_id] || { label: profile.current_tier_id, color: 'text-gray-600' };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 p-4">
          <p className="text-xs font-mono text-gray-500 uppercase">Current Tier</p>
          <p className={`text-xl font-serif mt-1 ${tierDisplay.color}`}>{tierDisplay.label}</p>
          <p className="text-xs font-mono text-gray-400 mt-1">EQS: {formatScore(profile.last_qualification_score)}</p>
        </div>
        <div className="border border-gray-200 p-4">
          <p className="text-xs font-mono text-gray-500 uppercase">Policy Mode</p>
          <p className="text-xl font-serif mt-1">{profile.current_policy_mode}</p>
          <p className="text-xs font-mono text-gray-400 mt-1">
            Execution: {policyMode?.is_execution_enabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <div className="border border-gray-200 p-4">
          <p className="text-xs font-mono text-gray-500 uppercase">Status</p>
          <div className="mt-1">
            {profile.execution_suspended ? (
              <StatusBadge status="SUSPENDED" />
            ) : profile.live_enabled ? (
              <StatusBadge status="LIVE ENABLED" />
            ) : (
              <StatusBadge status="PAPER ONLY" />
            )}
          </div>
          {profile.suspension_reason && (
            <p className="text-xs font-mono text-red-600 mt-1">{profile.suspension_reason}</p>
          )}
        </div>
      </div>

      <div className="border border-gray-200">
        <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
          <h3 className="font-mono text-sm font-medium">Paper Trading Performance</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-gray-200">
          <MetricCell label="Trades" value={String(profile.paper_trade_count)} />
          <MetricCell label="Win Rate" value={formatPct((toNum(profile.paper_win_rate) ?? 0) * 100)} />
          <MetricCell label="Total P&L" value={formatAxusd(profile.paper_pnl_axusd)} positive={(toNum(profile.paper_pnl_axusd) ?? 0) >= 0} />
          <MetricCell label="Max Drawdown" value={formatPct((toNum(profile.paper_max_drawdown) ?? 0) * 100)} />
          <MetricCell label="Sharpe" value={toNum(profile.paper_sharpe) !== null ? (toNum(profile.paper_sharpe) as number).toFixed(2) : '—'} />
          <MetricCell label="Open Positions" value={String(data.openPositionCount)} />
          <MetricCell label="AXM Balance" value={String(profile.axm_balance)} />
          <MetricCell label="AXUSD Reserve" value={String(profile.axusd_reserve_balance)} />
        </div>
      </div>

      <div className="border border-gray-200">
        <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
          <h3 className="font-mono text-sm font-medium">Risk Controls</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-gray-200">
          <MetricCell label="Daily Loss Limit" value={`${profile.daily_loss_limit_axusd} AXUSD`} />
          <MetricCell label="Rolling 7D Limit" value={`${profile.rolling_7d_loss_limit_axusd} AXUSD`} />
          <MetricCell label="Max DD Limit" value={`${profile.max_drawdown_limit_pct}%`} />
          <MetricCell label="Consecutive Loss Brake" value={String(profile.consecutive_loss_brake)} />
        </div>
      </div>

      {tier && (
        <div className="border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
            <h3 className="font-mono text-sm font-medium">Tier Requirements — {tier.tier_name}</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-gray-200">
            <MetricCell label="Min EQS" value={formatScore(tier.min_eqs)} />
            <MetricCell label="Min Paper Days" value={String(tier.min_paper_days)} />
            <MetricCell label="Min Trades" value={String(tier.min_trade_count)} />
            <MetricCell label="Max Drawdown" value={`${tier.max_drawdown_pct}%`} />
            <MetricCell label="AXM Required" value={String(tier.axm_required)} />
            <MetricCell label="Live Execution" value={tier.execution_enabled ? 'Yes' : 'No'} />
          </div>
        </div>
      )}

      {data.recentViolations.length > 0 && (
        <div className="border border-red-200">
          <div className="border-b border-red-200 px-4 py-2 bg-red-50">
            <h3 className="font-mono text-sm font-medium text-red-800">Recent Violations</h3>
          </div>
          <div className="divide-y divide-red-100">
            {data.recentViolations.map((v: any) => (
              <div key={v.violation_id} className="px-4 py-2 text-xs font-mono">
                <span className="text-red-600 font-medium">{v.violation_type}</span>
                <span className="text-gray-500 ml-2">{v.description}</span>
                <span className="text-gray-400 ml-2">{new Date(v.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab({
  executions,
  pagination,
  onPageChange,
}: {
  executions: Execution[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
}) {
  if (executions.length === 0) {
    return (
      <div className="border border-gray-200 p-8 text-center">
        <p className="font-mono text-sm text-gray-500">No execution history</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto border border-gray-200">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-3 py-2 text-xs text-gray-500">Symbol</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500">Dir</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500">Mode</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500">Entry</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500">Close</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500">P&L</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500">P&L %</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500">MAE</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500">MFE</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500">Reason</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500">Opened</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {executions.map((ex) => (
              <tr key={ex.execution_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{ex.symbol}</td>
                <td className={`px-3 py-2 ${ex.direction === 'LONG' ? 'text-green-700' : 'text-red-700'}`}>
                  {ex.direction}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-1 ${ex.is_live ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {ex.is_live ? 'LIVE' : 'PAPER'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{Number(ex.filled_price).toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{ex.close_price ? Number(ex.close_price).toFixed(2) : '—'}</td>
                <td className={`px-3 py-2 text-right ${(ex.pnl_axusd ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {ex.pnl_axusd !== null ? formatAxusd(ex.pnl_axusd) : '—'}
                </td>
                <td className={`px-3 py-2 text-right ${(ex.pnl_pct ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {ex.pnl_pct !== null ? formatPct(ex.pnl_pct) : '—'}
                </td>
                <td className="px-3 py-2 text-right">{Number(ex.max_adverse_excursion).toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{Number(ex.max_favorable_excursion).toFixed(2)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{ex.close_reason || '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-400">{new Date(ex.opened_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination.totalPages > 1 && (
        <div className="mt-4">
          <PaginationControls
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={onPageChange}
            itemLabel="executions"
          />
        </div>
      )}
    </div>
  );
}

function QualificationTab({ data }: { data: DashboardData }) {
  const q = data.latestQualification;
  const profile = data.profile;

  const tierProgression = [
    { tier: 'PAPER', label: 'Paper', eqs: 0, days: 0, trades: 0, dd: 100, axm: 0 },
    { tier: 'TIER_1', label: 'Tier 1', eqs: 0.70, days: 30, trades: 60, dd: 6, axm: 100 },
    { tier: 'TIER_2', label: 'Tier 2', eqs: 0.78, days: 60, trades: 120, dd: 4, axm: 500 },
    { tier: 'TIER_3', label: 'Tier 3', eqs: 0.85, days: 90, trades: 200, dd: 3, axm: 2000 },
  ];

  const paperDays = profile.paper_start_date
    ? Math.floor((Date.now() - new Date(profile.paper_start_date).getTime()) / 86400000)
    : 0;

  return (
    <div className="space-y-6">
      {q ? (
        <div className="border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
            <h3 className="font-mono text-sm font-medium">
              Latest BQE Score — {new Date(q.created_at).toLocaleString()}
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-serif text-lg">Execution Qualification Score (EQS)</span>
              <span className="font-mono text-2xl font-bold">{formatScore(q.eqs)}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <ScoreBar label="RBAR" description="Risk Budget Adherence" value={q.rbar} weight={0.20} />
              <ScoreBar label="DSI" description="Drawdown Stability" value={q.dsi} weight={0.20} />
              <ScoreBar label="PSC" description="Position Sizing Consistency" value={q.psc} weight={0.15} />
              <ScoreBar label="VRS" description="Volatility Response" value={q.vrs} weight={0.15} />
              <ScoreBar label="EDS" description="Exposure Discipline" value={q.eds} weight={0.15} />
              <ScoreBar label="RCS" description="Rule Compliance" value={q.rcs} weight={0.15} />
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 p-6 text-center">
          <p className="font-mono text-sm text-gray-500">No qualification snapshot yet. Run compute-qualification to generate one.</p>
        </div>
      )}

      <div className="border border-gray-200">
        <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
          <h3 className="font-mono text-sm font-medium">Tier Progression Ladder</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-3 py-2 text-xs text-gray-500">Tier</th>
                <th className="text-right px-3 py-2 text-xs text-gray-500">Min EQS</th>
                <th className="text-right px-3 py-2 text-xs text-gray-500">Min Days</th>
                <th className="text-right px-3 py-2 text-xs text-gray-500">Min Trades</th>
                <th className="text-right px-3 py-2 text-xs text-gray-500">Max DD</th>
                <th className="text-right px-3 py-2 text-xs text-gray-500">AXM Required</th>
                <th className="text-center px-3 py-2 text-xs text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tierProgression.map((t) => {
                const isCurrent = t.tier === profile.current_tier_id;
                const eqsOk = (toNum(q?.eqs) ?? 0) >= t.eqs;
                const daysOk = paperDays >= t.days;
                const tradesOk = (toNum(profile.paper_trade_count) ?? 0) >= t.trades;
                const ddOk = ((toNum(profile.paper_max_drawdown) ?? 0) * 100) <= t.dd;
                const axmOk = (toNum(profile.axm_balance) ?? 0) >= t.axm;
                const allMet = eqsOk && daysOk && tradesOk && ddOk && axmOk;

                return (
                  <tr key={t.tier} className={isCurrent ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2 font-medium">
                      {t.label}
                      {isCurrent && <span className="text-xs text-blue-600 ml-2">(current)</span>}
                    </td>
                    <td className={`px-3 py-2 text-right ${eqsOk ? 'text-green-700' : 'text-gray-400'}`}>
                      {t.eqs > 0 ? formatScore(t.eqs) : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right ${daysOk ? 'text-green-700' : 'text-gray-400'}`}>
                      {t.days > 0 ? t.days : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right ${tradesOk ? 'text-green-700' : 'text-gray-400'}`}>
                      {t.trades > 0 ? t.trades : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right ${ddOk ? 'text-green-700' : 'text-gray-400'}`}>
                      {t.dd < 100 ? `${t.dd}%` : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right ${axmOk ? 'text-green-700' : 'text-gray-400'}`}>
                      {t.axm > 0 ? t.axm : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isCurrent ? (
                        <StatusBadge status="ACTIVE" />
                      ) : allMet ? (
                        <StatusBadge status="QUALIFIED" />
                      ) : (
                        <StatusBadge status="LOCKED" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-gray-200 p-4">
        <h3 className="font-mono text-sm font-medium mb-3">Your Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ProgressMetric label="EQS" current={toNum(q?.eqs) ?? 0} target={0.70} format="score" />
          <ProgressMetric label="Paper Days" current={paperDays} target={30} format="int" />
          <ProgressMetric label="Trade Count" current={toNum(profile.paper_trade_count) ?? 0} target={60} format="int" />
          <ProgressMetric label="Max Drawdown" current={(toNum(profile.paper_max_drawdown) ?? 0) * 100} target={6} format="pct" inverted />
        </div>
      </div>
    </div>
  );
}

function MetricCell({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs font-mono text-gray-500">{label}</p>
      <p className={`text-sm font-mono mt-1 ${positive === false ? 'text-red-700' : positive === true ? 'text-green-700' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function ScoreBar({ label, description, value, weight }: { label: string; description: string; value: unknown; weight: number }) {
  const numVal = toNum(value) ?? 0;
  const pct = Math.min(numVal * 100, 100);
  return (
    <div className="border border-gray-100 p-3">
      <div className="flex justify-between items-baseline">
        <span className="font-mono text-xs font-medium">{label}</span>
        <span className="font-mono text-xs text-gray-400">w={weight}</span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      <div className="mt-2 h-2 bg-gray-100 relative">
        <div
          className="h-2 bg-gray-700 absolute left-0 top-0"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-mono text-xs mt-1 text-right">{formatScore(value)}</p>
    </div>
  );
}

function ProgressMetric({
  label, current, target, format, inverted,
}: {
  label: string; current: number; target: number; format: 'score' | 'int' | 'pct'; inverted?: boolean;
}) {
  const progress = inverted
    ? current <= target ? 100 : Math.max(0, (1 - (current - target) / target) * 100)
    : Math.min((current / target) * 100, 100);
  const met = inverted ? current <= target : current >= target;

  const formatVal = (v: number) => {
    if (format === 'score') return v.toFixed(3);
    if (format === 'pct') return `${v.toFixed(1)}%`;
    return String(Math.floor(v));
  };

  return (
    <div>
      <div className="flex justify-between text-xs font-mono">
        <span className="text-gray-500">{label}</span>
        <span className={met ? 'text-green-700' : 'text-gray-700'}>{formatVal(current)} / {formatVal(target)}</span>
      </div>
      <div className="mt-1 h-2 bg-gray-100 relative">
        <div
          className={`h-2 absolute left-0 top-0 ${met ? 'bg-green-600' : 'bg-gray-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
