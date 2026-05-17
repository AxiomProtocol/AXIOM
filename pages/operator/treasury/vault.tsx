import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';
import { getVaultSummary, getVaultEventHistory, getIncomeSummary } from '../../../lib/treasury/vault/vaultService';
import type { VaultSummary, StrategyPosition } from '../../../lib/treasury/vault/vaultService';

interface VaultEvent {
  id: number;
  eventType: string;
  strategy: string | null;
  amountUsd: number;
  txHash: string | null;
  blockNumber: number | null;
  createdAt: string | null;
}

interface IncomePeriod {
  period: string;
  since: string;
  harvestTotalUsdc: number;
  harvestEventCount: number;
  depositTotalUsdc: number;
  withdrawTotalUsdc: number;
  allocateTotalUsdc: number;
}

interface Props {
  summary: VaultSummary;
  events: VaultEvent[];
  monthly: IncomePeriod;
  quarterly: IncomePeriod;
  ytd: IncomePeriod;
  loadError: string | null;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  try {
    const [summary, events, monthly, quarterly, ytd] = await Promise.all([
      getVaultSummary(),
      getVaultEventHistory(50, 0),
      getIncomeSummary('monthly'),
      getIncomeSummary('quarterly'),
      getIncomeSummary('ytd'),
    ]);

    return {
      props: {
        summary,
        events: events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          strategy: e.strategy ?? null,
          amountUsd: parseFloat(String(e.amountUsd)),
          txHash: e.txHash ?? null,
          blockNumber: e.blockNumber ?? null,
          createdAt: e.createdAt?.toISOString() ?? null,
        })),
        monthly,
        quarterly,
        ytd,
        loadError: null,
      },
    };
  } catch (err: any) {
    const empty: VaultSummary = {
      aumUsdc: 0,
      idleUsdc: 0,
      deployedUsdc: 0,
      axusdIdleUsdc: 0,
      axusdDeployedUsdc: 0,
      aavePosition: { address: '', name: 'Not deployed', currentValueUsdc: 0, principalUsdc: 0, unrealizedYieldUsdc: 0, allocationPct: 0, lastRebalancedAt: null, apyEstimatePct: null },
      camelotPosition: { address: '', name: 'Not deployed', currentValueUsdc: 0, principalUsdc: 0, unrealizedYieldUsdc: 0, allocationPct: 0, lastRebalancedAt: null, apyEstimatePct: null },
      blendedApyEstimatePct: null,
      yieldHarvestedInceptionUsdc: 0,
      paused: false,
      lastUpdated: new Date().toISOString(),
      isLive: false,
    };
    const emptyPeriod: IncomePeriod = { period: '', since: '', harvestTotalUsdc: 0, harvestEventCount: 0, depositTotalUsdc: 0, withdrawTotalUsdc: 0, allocateTotalUsdc: 0 };
    return { props: { summary: empty, events: [], monthly: emptyPeriod, quarterly: emptyPeriod, ytd: emptyPeriod, loadError: err?.message ?? 'Failed to load vault data' } };
  }
};

function usd(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

function short(addr: string) {
  if (!addr || addr.length < 10) return addr || '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function eventBadge(type: string) {
  const map: Record<string, string> = {
    deposit:          'bg-blue-50 text-blue-800 border-blue-200',
    withdraw:         'bg-gray-50 text-gray-700 border-gray-200',
    allocate:         'bg-green-50 text-green-800 border-green-200',
    harvest:          'bg-yellow-50 text-yellow-800 border-yellow-200',
    rebalance:        'bg-purple-50 text-purple-800 border-purple-200',
    emergency_withdraw: 'bg-red-50 text-red-800 border-red-200',
  };
  return map[type] ?? 'bg-gray-50 text-gray-600 border-gray-200';
}

interface RebalanceForm {
  fromStrategy: 'aave_v3' | 'camelot';
  toStrategy: 'aave_v3' | 'camelot';
  amountUsdc: string;
  currentAaveApy: string;
  currentCamelotApy: string;
}

interface SentinelAuth {
  token:  string;
  nonce:  string;
  expiry: number;
  decision: { plainLanguage: string; aaveApyPct: number | null; camelotApyPct: number | null; spreadBps: number | null };
}

// ── Deposit Record Form ────────────────────────────────────────────────────────
// Allows vault operators to log a completed on-chain deposit to the audit trail.
function DepositRecordForm() {
  const [asset,  setAsset]  = useState<'USDC' | 'AXUSD'>('USDC');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy,   setBusy]   = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    const amountNum = parseFloat(amount);
    if (!isFinite(amountNum) || amountNum <= 0) {
      setStatus({ ok: false, msg: 'Amount must be a positive number.' });
      return;
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      setStatus({ ok: false, msg: 'Transaction hash must be a 0x-prefixed 64-hex-char string.' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/treasury/vault/record-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, amountUsdc: amountNum, txHash }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({ ok: true, msg: `Deposit recorded (event ID ${data.id}). Refresh to see it in the audit log.` });
        setAmount('');
        setTxHash('');
      } else {
        setStatus({ ok: false, msg: data.error ?? 'Failed to record deposit.' });
      }
    } catch {
      setStatus({ ok: false, msg: 'Network error — deposit not recorded.' });
    } finally {
      setBusy(false);
    }
  }, [asset, amount, txHash]);

  return (
    <form onSubmit={handleSubmit} className="border border-dl-border p-4 max-w-2xl space-y-4 mb-4">
      <p className="text-xs font-mono text-dl-gray uppercase tracking-wide">Record On-Chain Deposit</p>
      <p className="text-xs text-dl-gray">
        After executing the on-chain deposit transaction, enter the details below to link it to the vault audit log.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-mono text-dl-gray uppercase">Asset</label>
          <select
            value={asset}
            onChange={e => setAsset(e.target.value as 'USDC' | 'AXUSD')}
            className="w-full border border-dl-border px-2 py-1.5 text-xs font-mono text-dl-navy bg-white"
          >
            <option value="USDC">USDC</option>
            <option value="AXUSD">AXUSD</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-mono text-dl-gray uppercase">Amount (USD)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 10000"
            className="w-full border border-dl-border px-2 py-1.5 text-xs font-mono text-dl-navy"
          />
        </div>
        <div className="space-y-1 sm:col-span-1">
          <label className="text-xs font-mono text-dl-gray uppercase">Tx Hash</label>
          <input
            type="text"
            value={txHash}
            onChange={e => setTxHash(e.target.value.trim())}
            placeholder="0x..."
            className="w-full border border-dl-border px-2 py-1.5 text-xs font-mono text-dl-navy"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide bg-dl-navy text-white disabled:opacity-50"
        >
          {busy ? 'Recording…' : 'Record Deposit'}
        </button>
        {status && (
          <p className={`text-xs font-mono ${status.ok ? 'text-dl-forest' : 'text-red-600'}`}>
            {status.msg}
          </p>
        )}
      </div>
    </form>
  );
}

export default function TreasuryVaultPage({ summary, events, monthly, quarterly, ytd, loadError }: Props) {
  const [rebalanceForm, setRebalanceForm] = useState<RebalanceForm>({
    fromStrategy: 'aave_v3',
    toStrategy: 'camelot',
    amountUsdc: '',
    currentAaveApy: '',
    currentCamelotApy: '',
  });
  const [authorizing, setAuthorizing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [sentinelAuth, setSentinelAuth] = useState<SentinelAuth | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [executeResult, setExecuteResult] = useState<{ success: boolean; txHash?: string | null } | null>(null);

  function authExpired(): boolean {
    return sentinelAuth !== null && Date.now() > sentinelAuth.expiry;
  }

  /** Step 1 — Request Sentinel authorization token. */
  async function handleRequestAuth(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(rebalanceForm.amountUsdc);
    if (!amt || amt <= 0) return;
    setAuthorizing(true);
    setSentinelAuth(null);
    setAuthError(null);
    setExecuteResult(null);
    try {
      const body: Record<string, unknown> = {
        fromStrategy: rebalanceForm.fromStrategy,
        toStrategy:   rebalanceForm.toStrategy,
        amountUsdc:   amt,
      };
      if (rebalanceForm.currentAaveApy)    body.currentAaveApy    = parseFloat(rebalanceForm.currentAaveApy);
      if (rebalanceForm.currentCamelotApy) body.currentCamelotApy = parseFloat(rebalanceForm.currentCamelotApy);
      const res  = await fetch('/api/sentinel/rebalance-auth', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok && json.authorized) {
        setSentinelAuth({ token: json.token, nonce: json.nonce, expiry: json.expiry, decision: json.sentinelDecision });
      } else {
        setAuthError(json.sentinelDecision?.plainLanguage ?? json.error ?? 'Sentinel denied the request');
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAuthorizing(false);
    }
  }

  /** Step 2 — Execute on-chain rebalance with Sentinel token. */
  async function handleExecute() {
    if (!sentinelAuth || authExpired()) {
      setAuthError('Authorization token expired. Please re-authorize.');
      setSentinelAuth(null);
      return;
    }
    setExecuting(true);
    setExecuteResult(null);
    try {
      const res  = await fetch('/api/treasury/vault/rebalance', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStrategy: rebalanceForm.fromStrategy,
          toStrategy:   rebalanceForm.toStrategy,
          amountUsdc:   parseFloat(rebalanceForm.amountUsdc),
          token:        sentinelAuth.token,
          nonce:        sentinelAuth.nonce,
          expiry:       sentinelAuth.expiry,
        }),
      });
      const json = await res.json();
      setExecuteResult({ success: json.success, txHash: json.txHash });
      if (json.success) setSentinelAuth(null);
    } catch (err: unknown) {
      setExecuteResult({ success: false });
      setAuthError(err instanceof Error ? err.message : 'Network error during execution');
    } finally {
      setExecuting(false);
    }
  }

  return (
    <OperatorConsoleLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl text-dl-navy">Treasury Vault</h1>
            <p className="text-sm text-dl-gray font-mono mt-1">
              AxiomTreasuryVault — Arbitrum One — Operator Capital Management
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-2 py-1 text-xs font-mono border ${summary.isLive ? 'border-green-300 text-green-700 bg-green-50' : 'border-yellow-300 text-yellow-700 bg-yellow-50'}`}>
              {summary.isLive ? 'LIVE' : 'OFFLINE / NOT DEPLOYED'}
            </span>
            {summary.paused && (
              <span className="ml-2 inline-block px-2 py-1 text-xs font-mono border border-red-300 text-red-700 bg-red-50">PAUSED</span>
            )}
            <p className="text-xs text-dl-gray font-mono mt-1">Updated {new Date(summary.lastUpdated).toLocaleTimeString()}</p>
          </div>
        </div>

        {loadError && (
          <div className="border border-dl-error bg-red-50 p-3 text-sm text-dl-error font-mono">{loadError}</div>
        )}

        {/* AUM Panel */}
        <section>
          <h2 className="font-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-1">Assets Under Management</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total AUM', value: usd(summary.aumUsdc), note: 'Idle + deployed' },
              { label: 'Idle (undeployed)', value: usd(summary.idleUsdc), note: 'Held in vault' },
              { label: 'Deployed', value: usd(summary.deployedUsdc), note: 'Across strategies' },
            ].map((m) => (
              <div key={m.label} className="border border-dl-border p-4">
                <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">{m.label}</p>
                <p className="font-mono text-2xl text-dl-navy mt-1">{m.value}</p>
                <p className="text-xs text-dl-gray mt-1">{m.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Strategy Allocations */}
        <section>
          <h2 className="font-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-1">Strategy Allocations</h2>
          <table className="w-full text-sm font-mono border-collapse">
            <thead>
              <tr className="border-b border-dl-border text-dl-gray text-xs uppercase">
                <th className="text-left py-2 pr-4">Strategy</th>
                <th className="text-right py-2 pr-4">Current Value</th>
                <th className="text-right py-2 pr-4">Principal</th>
                <th className="text-right py-2 pr-4">Unrealised Yield</th>
                <th className="text-right py-2 pr-4">Allocation %</th>
                <th className="text-right py-2">Last Rebalanced</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'Aave v3 (USDC)', pos: summary.aavePosition },
                { key: 'Camelot (AXUSD/USDC)', pos: summary.camelotPosition },
              ].map(({ key, pos }) => (
                <tr key={key} className="border-b border-dl-border hover:bg-gray-50">
                  <td className="py-2 pr-4 text-dl-navy">
                    <div>{key}</div>
                    <div className="text-xs text-dl-gray">{short(pos.address)}</div>
                  </td>
                  <td className="py-2 pr-4 text-right">{usd(pos.currentValueUsdc)}</td>
                  <td className="py-2 pr-4 text-right">{usd(pos.principalUsdc)}</td>
                  <td className={`py-2 pr-4 text-right ${pos.unrealizedYieldUsdc >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {pos.unrealizedYieldUsdc >= 0 ? '+' : ''}{usd(pos.unrealizedYieldUsdc)}
                  </td>
                  <td className="py-2 pr-4 text-right">{pos.allocationPct.toFixed(1)}%</td>
                  <td className="py-2 text-right text-xs text-dl-gray">
                    {pos.lastRebalancedAt ? new Date(pos.lastRebalancedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Yield Totals */}
        <section>
          <h2 className="font-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-1">Yield Harvested</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: 'This Month',  value: usd(monthly.harvestTotalUsdc),  count: monthly.harvestEventCount },
              { label: 'This Quarter', value: usd(quarterly.harvestTotalUsdc), count: quarterly.harvestEventCount },
              { label: 'Year to Date', value: usd(ytd.harvestTotalUsdc),      count: ytd.harvestEventCount },
              { label: 'Inception',   value: usd(summary.yieldHarvestedInceptionUsdc), count: null },
            ].map((m) => (
              <div key={m.label} className="border border-dl-border p-4">
                <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">{m.label}</p>
                <p className="font-mono text-xl text-dl-forest mt-1">{m.value}</p>
                {m.count !== null && (
                  <p className="text-xs text-dl-gray mt-1">{m.count} harvest event{m.count !== 1 ? 's' : ''}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Sentinel-Gated Rebalance — Two-Step Authorization Flow */}
        <section>
          <h2 className="font-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-1">Rebalance (Sentinel-Gated)</h2>
          <p className="text-sm text-dl-gray mb-1">
            Two-step authorization: Step 1 evaluates the Axiom Sentinel and issues a 5-minute authorization token.
            Step 2 presents the token to execute the on-chain transaction. A 0.50% APY spread is required.
          </p>
          <p className="text-xs text-dl-gray font-mono mb-4">
            Provide current APYs if Sentinel lacks live data (Camelot has no on-chain APY feed).
          </p>

          {/* Step 1: Authorization form */}
          <form onSubmit={handleRequestAuth} className="space-y-4 max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-dl-gray uppercase mb-1">From Strategy</label>
                <select
                  className="w-full border border-dl-border p-2 font-mono text-sm bg-white"
                  value={rebalanceForm.fromStrategy}
                  onChange={(e) => {
                    setSentinelAuth(null);
                    setRebalanceForm((f) => ({ ...f, fromStrategy: e.target.value as 'aave_v3' | 'camelot' }));
                  }}
                >
                  <option value="aave_v3">Aave v3</option>
                  <option value="camelot">Camelot</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-dl-gray uppercase mb-1">To Strategy</label>
                <select
                  className="w-full border border-dl-border p-2 font-mono text-sm bg-white"
                  value={rebalanceForm.toStrategy}
                  onChange={(e) => {
                    setSentinelAuth(null);
                    setRebalanceForm((f) => ({ ...f, toStrategy: e.target.value as 'aave_v3' | 'camelot' }));
                  }}
                >
                  <option value="camelot">Camelot</option>
                  <option value="aave_v3">Aave v3</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono text-dl-gray uppercase mb-1">Amount (USDC)</label>
              <input
                type="number" min="1" max="500000" step="100"
                className="w-full border border-dl-border p-2 font-mono text-sm"
                placeholder="e.g. 10000"
                value={rebalanceForm.amountUsdc}
                onChange={(e) => { setSentinelAuth(null); setRebalanceForm((f) => ({ ...f, amountUsdc: e.target.value })); }}
                required
              />
              <p className="text-xs text-dl-gray mt-1">Max per rebalance: $500,000</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-dl-gray uppercase mb-1">Current Aave APY % <span className="normal-case">(optional override)</span></label>
                <input
                  type="number" min="0" max="100" step="0.01"
                  className="w-full border border-dl-border p-2 font-mono text-sm"
                  placeholder="e.g. 5.12"
                  value={rebalanceForm.currentAaveApy}
                  onChange={(e) => setRebalanceForm((f) => ({ ...f, currentAaveApy: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-dl-gray uppercase mb-1">Current Camelot APY % <span className="normal-case">(required if env unset)</span></label>
                <input
                  type="number" min="0" max="100" step="0.01"
                  className="w-full border border-dl-border p-2 font-mono text-sm"
                  placeholder="e.g. 6.80"
                  value={rebalanceForm.currentCamelotApy}
                  onChange={(e) => setRebalanceForm((f) => ({ ...f, currentCamelotApy: e.target.value }))}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={authorizing || executing}
              className="px-6 py-2 bg-dl-navy text-white font-mono text-sm disabled:opacity-50"
            >
              {authorizing ? 'Contacting Sentinel…' : 'Step 1 — Request Sentinel Authorization'}
            </button>
          </form>

          {/* Sentinel denial or error */}
          {authError && !sentinelAuth && (
            <div className="mt-4 border border-red-300 bg-red-50 p-4 font-mono text-sm text-red-800">
              <p className="font-semibold">Sentinel Denied</p>
              <p className="mt-1 text-xs">{authError}</p>
            </div>
          )}

          {/* Sentinel approval + Step 2 Execute */}
          {sentinelAuth && !executeResult && (
            <div className="mt-4 border border-green-300 bg-green-50 p-4 font-mono text-sm text-green-800 space-y-3">
              <p className="font-semibold">Sentinel Authorized — Token Issued</p>
              <p className="text-xs">{sentinelAuth.decision.plainLanguage}</p>
              <div className="text-xs text-green-700 space-y-0.5">
                {sentinelAuth.decision.aaveApyPct !== null && (
                  <p>Aave APY: {sentinelAuth.decision.aaveApyPct.toFixed(2)}%</p>
                )}
                {sentinelAuth.decision.camelotApyPct !== null && (
                  <p>Camelot APY: {sentinelAuth.decision.camelotApyPct.toFixed(2)}%</p>
                )}
                {sentinelAuth.decision.spreadBps !== null && (
                  <p>Spread: {sentinelAuth.decision.spreadBps} bps</p>
                )}
                <p>Token expires: {new Date(sentinelAuth.expiry).toLocaleTimeString()}</p>
              </div>
              <button
                onClick={handleExecute}
                disabled={executing}
                className="px-6 py-2 bg-green-700 text-white font-mono text-sm disabled:opacity-50"
              >
                {executing ? 'Submitting On-Chain…' : 'Step 2 — Execute Rebalance'}
              </button>
            </div>
          )}

          {/* Execution result */}
          {executeResult && (
            <div className={`mt-4 border p-4 font-mono text-sm ${executeResult.success ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
              <p className="font-semibold">{executeResult.success ? 'Rebalance Submitted On-Chain' : 'Execution Failed'}</p>
              {executeResult.txHash && (
                <p className="mt-1 text-xs">
                  Tx:{' '}
                  <a href={`https://arbiscan.io/tx/${executeResult.txHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                    {short(executeResult.txHash)}
                  </a>
                </p>
              )}
            </div>
          )}
        </section>

        {/* Event Log */}
        <section>
          <h2 className="font-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-1">Vault Event Log</h2>
          {events.length === 0 ? (
            <p className="text-sm text-dl-gray font-mono">No events recorded yet. Events are written by the on-chain event poller once the vault is deployed.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-dl-border text-dl-gray uppercase">
                    <th className="text-left py-2 pr-3">Type</th>
                    <th className="text-left py-2 pr-3">Strategy</th>
                    <th className="text-right py-2 pr-3">Amount (USD)</th>
                    <th className="text-left py-2 pr-3">Tx Hash</th>
                    <th className="text-left py-2 pr-3">Block</th>
                    <th className="text-left py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-b border-dl-border hover:bg-gray-50">
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 border text-xs ${eventBadge(ev.eventType)}`}>
                          {ev.eventType}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-dl-gray">{ev.strategy ? short(ev.strategy) : '—'}</td>
                      <td className="py-2 pr-3 text-right">{usd(ev.amountUsd)}</td>
                      <td className="py-2 pr-3">
                        {ev.txHash ? (
                          <a
                            href={`https://arbiscan.io/tx/${ev.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-dl-forest underline"
                          >
                            {short(ev.txHash)}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-dl-gray">{ev.blockNumber ?? '—'}</td>
                      <td className="py-2 text-dl-gray">
                        {ev.createdAt ? new Date(ev.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Deposit Capital */}
        <section>
          <h2 className="font-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-1">Deposit Capital</h2>
          <p className="text-sm text-dl-gray mb-4">
            Deposits are executed on-chain by the vault admin address.
            For USDC (primary), pre-approve the vault and call the ERC-4626 <code className="bg-gray-100 px-1 font-mono text-xs">deposit(uint256 assets, address receiver)</code>.
            For AXUSD and other secondary assets, call <code className="bg-gray-100 px-1 font-mono text-xs">depositToken(address asset, uint256 amount)</code>.
            After executing on-chain, record the deposit below to link it to the vault audit log.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mb-4">
            <div className="border border-dl-border p-4 space-y-2">
              <p className="text-xs font-mono text-dl-gray uppercase tracking-wide">Vault Address</p>
              <p className="font-mono text-xs break-all text-dl-navy">
                {process.env.NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS ?? '(configure NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS)'}
              </p>
            </div>
            <div className="border border-dl-border p-4 space-y-2">
              <p className="text-xs font-mono text-dl-gray uppercase tracking-wide">Accepted Assets</p>
              <div className="space-y-1 text-xs font-mono text-dl-navy">
                <div>USDC — 0xaf88d065e77c8cC2239327C5EDb3A432268e5831</div>
                <div>AXUSD — Arbitrum One (see contracts.ts)</div>
              </div>
            </div>
          </div>

          {/* Record Deposit Form */}
          <DepositRecordForm />

          <div className="mt-4 border border-dl-border p-4 bg-gray-50 max-w-2xl space-y-3">
            <p className="text-xs font-mono text-dl-gray uppercase tracking-wide">Deposit ABI Reference</p>
            <div>
              <p className="text-xs font-mono text-dl-gray mb-1">Primary asset (USDC) — ERC-4626:</p>
              <pre className="text-xs font-mono text-dl-navy whitespace-pre-wrap break-all">{`function deposit(uint256 assets, address receiver) external returns (uint256 shares)
// Prerequisite: IERC20(USDC).approve(vaultAddress, assets)
// Mints ATVS shares to receiver. Caller: must hold VAULT_ADMIN role.`}</pre>
            </div>
            <div>
              <p className="text-xs font-mono text-dl-gray mb-1">Secondary assets (AXUSD, etc.) — non-ERC4626:</p>
              <pre className="text-xs font-mono text-dl-navy whitespace-pre-wrap break-all">{`function depositToken(address asset, uint256 amount) external
// Prerequisite: IERC20(asset).approve(vaultAddress, amount)
// Tracked in idleBalance mapping — no ATVS shares minted. Caller: must hold VAULT_ADMIN role.`}</pre>
            </div>
          </div>
        </section>

        {/* Quick links */}
        <section className="border-t border-dl-border pt-4">
          <div className="flex flex-wrap gap-3 text-sm font-mono">
            <Link href="/operator/treasury/accounts" className="text-dl-forest underline">Treasury Accounts</Link>
            <Link href="/operator/treasury/allocations" className="text-dl-forest underline">Allocations</Link>
            <Link href="/operator/treasury/transactions" className="text-dl-forest underline">Transactions</Link>
            <a href="/api/treasury/vault/summary" target="_blank" rel="noopener noreferrer" className="text-dl-gray underline">API: /vault/summary</a>
            <a href="/api/treasury/income/summary?period=monthly" target="_blank" rel="noopener noreferrer" className="text-dl-gray underline">API: /income/summary</a>
          </div>
        </section>

      </div>
    </OperatorConsoleLayout>
  );
}
