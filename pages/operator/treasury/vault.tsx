import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
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
}

export default function TreasuryVaultPage({ summary, events, monthly, quarterly, ytd, loadError }: Props) {
  const [rebalanceForm, setRebalanceForm] = useState<RebalanceForm>({
    fromStrategy: 'aave_v3',
    toStrategy: 'camelot',
    amountUsdc: '',
  });
  const [rebalancing, setRebalancing] = useState(false);
  const [rebalanceResult, setRebalanceResult] = useState<{ success: boolean; message: string; txHash?: string | null } | null>(null);

  async function handleRebalance(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(rebalanceForm.amountUsdc);
    if (!amt || amt <= 0) return;
    setRebalancing(true);
    setRebalanceResult(null);
    try {
      const res = await fetch('/api/treasury/vault/rebalance', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStrategy: rebalanceForm.fromStrategy,
          toStrategy: rebalanceForm.toStrategy,
          amountUsdc: amt,
        }),
      });
      const json = await res.json();
      setRebalanceResult({
        success: json.success,
        message: json.sentinelDecision?.plainLanguage ?? json.error ?? 'Unknown response',
        txHash: json.txHash,
      });
    } catch (err: any) {
      setRebalanceResult({ success: false, message: err.message });
    } finally {
      setRebalancing(false);
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

        {/* Sentinel-Gated Rebalance */}
        <section>
          <h2 className="font-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-1">Rebalance (Sentinel-Gated)</h2>
          <p className="text-sm text-dl-gray mb-4">
            All rebalance requests are evaluated by the Axiom Sentinel before any on-chain transaction is submitted.
            A 0.50% APY spread is required. The Sentinel will deny if data is unavailable or the circuit breaker is active.
          </p>
          <form onSubmit={handleRebalance} className="space-y-4 max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-dl-gray uppercase mb-1">From Strategy</label>
                <select
                  className="w-full border border-dl-border p-2 font-mono text-sm bg-white"
                  value={rebalanceForm.fromStrategy}
                  onChange={(e) => setRebalanceForm((f) => ({ ...f, fromStrategy: e.target.value as 'aave_v3' | 'camelot' }))}
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
                  onChange={(e) => setRebalanceForm((f) => ({ ...f, toStrategy: e.target.value as 'aave_v3' | 'camelot' }))}
                >
                  <option value="camelot">Camelot</option>
                  <option value="aave_v3">Aave v3</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono text-dl-gray uppercase mb-1">Amount (USDC)</label>
              <input
                type="number"
                min="1"
                max="500000"
                step="100"
                className="w-full border border-dl-border p-2 font-mono text-sm"
                placeholder="e.g. 10000"
                value={rebalanceForm.amountUsdc}
                onChange={(e) => setRebalanceForm((f) => ({ ...f, amountUsdc: e.target.value }))}
                required
              />
              <p className="text-xs text-dl-gray mt-1">Max per rebalance: $500,000</p>
            </div>
            <button
              type="submit"
              disabled={rebalancing}
              className="px-6 py-2 bg-dl-navy text-white font-mono text-sm disabled:opacity-50"
            >
              {rebalancing ? 'Requesting Sentinel Authorization…' : 'Request Rebalance'}
            </button>
          </form>

          {rebalanceResult && (
            <div className={`mt-4 border p-4 font-mono text-sm ${rebalanceResult.success ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
              <p className="font-semibold">{rebalanceResult.success ? 'Rebalance Authorized' : 'Rebalance Denied'}</p>
              <p className="mt-1 text-xs">{rebalanceResult.message}</p>
              {rebalanceResult.txHash && (
                <p className="mt-1 text-xs">
                  Tx:{' '}
                  <a
                    href={`https://arbiscan.io/tx/${rebalanceResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {short(rebalanceResult.txHash)}
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
            The vault admin must pre-approve the vault contract to spend the deposit amount,
            then call <code className="bg-gray-100 px-1 font-mono text-xs">deposit(asset, amount)</code>.
            Use the calldata below with your wallet or multisig.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
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
          <div className="mt-4 border border-dl-border p-4 bg-gray-50 max-w-2xl">
            <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-2">Deposit ABI</p>
            <pre className="text-xs font-mono text-dl-navy whitespace-pre-wrap break-all">{`function deposit(address asset, uint256 amount) external
// Prerequisite: IERC20(asset).approve(vaultAddress, amount)
// Caller: must hold VAULT_ADMIN role on the vault contract`}</pre>
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
