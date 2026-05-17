import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { erc20Abi, parseAbi, parseUnits, formatUnits } from 'viem';
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
  asset: 'usdc' | 'axusd';
  currentAaveApy: string;
  currentCamelotApy: string;
}

interface SentinelAuth {
  token:  string;
  nonce:  string;
  asset:  string;
  expiry: number;
  decision: { plainLanguage: string; aaveApyPct: number | null; camelotApyPct: number | null; spreadBps: number | null };
}

// ── Constants ──────────────────────────────────────────────────────────────────
const ARBITRUM_ONE = 42161;
const USDC_ADDRESS  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as `0x${string}`;
const AXUSD_ADDRESS = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7' as `0x${string}`;

const VAULT_ABI = parseAbi([
  'function deposit(uint256 assets, address receiver) external returns (uint256 shares)',
  'function depositToken(address asset, uint256 amount) external',
  'function paused() view returns (bool)',
]);

type DepositAsset = 'USDC' | 'AXUSD';
type DepositStep  = 'idle' | 'approving' | 'approved' | 'depositing' | 'success' | 'error';

// ── Wallet Deposit Panel ───────────────────────────────────────────────────────
// Connects to the operator's wallet and executes approve → deposit on-chain,
// then auto-records the deposit in the vault audit log.
function WalletDepositPanel() {
  const { address, isConnected } = useAccount();
  const chainId                  = useChainId();
  const publicClient             = usePublicClient();
  const { writeContractAsync }   = useWriteContract();

  const vaultAddress = (process.env.NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS ?? '') as `0x${string}`;
  const isWrongChain = isConnected && chainId !== ARBITRUM_ONE;
  const isReady      = isConnected && !isWrongChain && !!vaultAddress;

  const [asset,  setAsset]  = useState<DepositAsset>('USDC');
  const [amount, setAmount] = useState('');
  const [step,   setStep]   = useState<DepositStep>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [approveTx, setApproveTx] = useState<`0x${string}` | null>(null);
  const [depositTx, setDepositTx] = useState<`0x${string}` | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTx ?? undefined });
  const { isSuccess: depositConfirmed } = useWaitForTransactionReceipt({ hash: depositTx ?? undefined });

  // Fetch USDC/AXUSD balance when wallet connects
  useEffect(() => {
    if (!address || !publicClient) return;
    const tokenAddr = asset === 'USDC' ? USDC_ADDRESS : AXUSD_ADDRESS;
    const decimals  = asset === 'USDC' ? 6 : 18;
    publicClient.readContract({
      address: tokenAddr,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    }).then((raw) => {
      setUsdcBalance(parseFloat(formatUnits(raw as bigint, decimals)).toFixed(2));
    }).catch(() => setUsdcBalance(null));
  }, [address, asset, publicClient, step]);

  // Move to "approved" once approval tx confirms
  useEffect(() => {
    if (approveConfirmed && step === 'approving') setStep('approved');
  }, [approveConfirmed, step]);

  // Auto-record and mark success once deposit tx confirms
  useEffect(() => {
    if (!depositConfirmed || step !== 'depositing' || !depositTx) return;
    const amtNum = parseFloat(amount);
    fetch('/api/treasury/vault/record-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset, amountUsdc: amtNum, txHash: depositTx }),
    }).finally(() => setStep('success'));
  }, [depositConfirmed, step, depositTx, asset, amount]);

  function reset() {
    setStep('idle');
    setAmount('');
    setApproveTx(null);
    setDepositTx(null);
    setErrMsg(null);
  }

  async function handleApprove() {
    if (!address || !vaultAddress) return;
    const amtNum = parseFloat(amount);
    if (!isFinite(amtNum) || amtNum <= 0) {
      setErrMsg('Enter a valid amount greater than zero.');
      return;
    }
    setErrMsg(null);
    setStep('approving');
    try {
      const decimals  = asset === 'USDC' ? 6 : 18;
      const tokenAddr = asset === 'USDC' ? USDC_ADDRESS : AXUSD_ADDRESS;
      const rawAmt    = parseUnits(amount, decimals);
      const hash = await writeContractAsync({
        address: tokenAddr,
        abi: erc20Abi,
        functionName: 'approve',
        args: [vaultAddress, rawAmt],
      });
      setApproveTx(hash);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Approval rejected or failed.');
      setStep('idle');
    }
  }

  async function handleDeposit() {
    if (!address || !vaultAddress) return;
    setErrMsg(null);
    setStep('depositing');
    try {
      const decimals  = asset === 'USDC' ? 6 : 18;
      const rawAmt    = parseUnits(amount, decimals);
      let hash: `0x${string}`;
      if (asset === 'USDC') {
        hash = await writeContractAsync({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: 'deposit',
          args: [rawAmt, address],
        });
      } else {
        hash = await writeContractAsync({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: 'depositToken',
          args: [AXUSD_ADDRESS, rawAmt],
        });
      }
      setDepositTx(hash);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Deposit transaction rejected or failed.');
      setStep('approved');
    }
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="border border-dl-border p-5 max-w-2xl mb-6 bg-gray-50">
        <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-2">Wallet Deposit</p>
        <p className="text-sm text-dl-gray">Connect your wallet using the <span className="font-semibold text-dl-navy">Access Platform</span> button in the navigation to deposit directly from your wallet.</p>
      </div>
    );
  }

  // ── Wrong network ──────────────────────────────────────────────────────────
  if (isWrongChain) {
    return (
      <div className="border border-amber-300 p-5 max-w-2xl mb-6 bg-amber-50">
        <p className="text-xs font-mono text-amber-700 uppercase tracking-wide mb-2">Wrong Network</p>
        <p className="text-sm text-amber-800">Switch your wallet to <span className="font-semibold">Arbitrum One</span> (Chain ID 42161) to deposit.</p>
      </div>
    );
  }

  // ── Vault address missing ──────────────────────────────────────────────────
  if (!vaultAddress) {
    return (
      <div className="border border-red-300 p-5 max-w-2xl mb-6 bg-red-50">
        <p className="text-xs font-mono text-red-700 uppercase tracking-wide mb-2">Configuration Required</p>
        <p className="text-sm text-red-800">Set <code className="bg-red-100 px-1 font-mono text-xs">NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS</code> in your environment to enable wallet deposits.</p>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="border border-dl-forest p-5 max-w-2xl mb-6">
        <p className="text-xs font-mono text-dl-forest uppercase tracking-wide mb-2">Deposit Complete</p>
        <p className="text-sm text-dl-navy mb-3">
          Your deposit of <span className="font-semibold">{amount} {asset}</span> has been confirmed on-chain and recorded in the vault audit log.
        </p>
        {depositTx && (
          <a
            href={`https://arbiscan.io/tx/${depositTx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-dl-forest underline block mb-4"
          >
            View on Arbiscan → {depositTx.slice(0, 12)}…{depositTx.slice(-6)}
          </a>
        )}
        <button onClick={reset} className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide border border-dl-border text-dl-navy">
          Make Another Deposit
        </button>
      </div>
    );
  }

  // ── Main panel ─────────────────────────────────────────────────────────────
  const stepNum = step === 'idle' ? 1 : step === 'approving' ? 1 : step === 'approved' ? 2 : 2;

  return (
    <div className="border border-dl-border p-5 max-w-2xl mb-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-dl-gray uppercase tracking-wide">Wallet Deposit</p>
        <span className="text-xs font-mono text-dl-gray">{address?.slice(0, 6)}…{address?.slice(-4)} · Arbitrum One</span>
      </div>

      {/* Step indicators */}
      <div className="flex gap-4 text-xs font-mono">
        <div className={`flex items-center gap-1.5 ${stepNum === 1 ? 'text-dl-navy font-semibold' : 'text-dl-gray'}`}>
          <span className={`w-5 h-5 flex items-center justify-center border text-xs ${step === 'approved' || step === 'depositing' ? 'bg-dl-forest border-dl-forest text-white' : 'border-dl-border'}`}>
            {step === 'approved' || step === 'depositing' ? '✓' : '1'}
          </span>
          Approve
        </div>
        <div className="text-dl-border self-center">→</div>
        <div className={`flex items-center gap-1.5 ${stepNum === 2 ? 'text-dl-navy font-semibold' : 'text-dl-gray'}`}>
          <span className="w-5 h-5 flex items-center justify-center border text-xs border-dl-border">
            2
          </span>
          Deposit
        </div>
      </div>

      {/* Asset + Amount inputs (only editable before approve) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-mono text-dl-gray uppercase">Asset</label>
          <select
            value={asset}
            onChange={e => { setAsset(e.target.value as DepositAsset); setUsdcBalance(null); }}
            disabled={step !== 'idle'}
            className="w-full border border-dl-border px-2 py-1.5 text-xs font-mono text-dl-navy bg-white disabled:opacity-60"
          >
            <option value="USDC">USDC</option>
            <option value="AXUSD">AXUSD</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-mono text-dl-gray uppercase flex justify-between">
            Amount
            {usdcBalance !== null && (
              <button
                type="button"
                onClick={() => setAmount(usdcBalance)}
                className="text-dl-forest underline normal-case"
              >
                Max: {usdcBalance}
              </button>
            )}
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 10000"
            disabled={step !== 'idle'}
            className="w-full border border-dl-border px-2 py-1.5 text-xs font-mono text-dl-navy disabled:opacity-60"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Step 1 — Approve */}
        {(step === 'idle' || step === 'approving') && (
          <button
            onClick={handleApprove}
            disabled={step === 'approving' || !amount}
            className="px-5 py-2 text-xs font-mono uppercase tracking-wide bg-dl-navy text-white disabled:opacity-50"
          >
            {step === 'approving' ? 'Waiting for approval…' : `Step 1 — Approve ${asset}`}
          </button>
        )}

        {/* Step 2 — Deposit (shown after approval confirms) */}
        {step === 'approved' && (
          <button
            onClick={handleDeposit}
            className="px-5 py-2 text-xs font-mono uppercase tracking-wide bg-dl-forest text-white"
          >
            Step 2 — Deposit to Vault
          </button>
        )}

        {step === 'depositing' && (
          <button disabled className="px-5 py-2 text-xs font-mono uppercase tracking-wide bg-dl-forest text-white opacity-50">
            Confirming deposit…
          </button>
        )}

        {step !== 'idle' && (
          <button onClick={reset} className="text-xs font-mono text-dl-gray underline">
            Start over
          </button>
        )}
      </div>

      {/* Tx hash links */}
      {approveTx && (
        <p className="text-xs font-mono text-dl-gray">
          Approval tx:{' '}
          <a href={`https://arbiscan.io/tx/${approveTx}`} target="_blank" rel="noopener noreferrer" className="text-dl-forest underline">
            {approveTx.slice(0, 12)}…{approveTx.slice(-6)}
          </a>
          {step === 'approved' && <span className="ml-2 text-dl-forest">✓ Confirmed</span>}
        </p>
      )}

      {/* Errors */}
      {errMsg && (
        <p className="text-xs font-mono text-red-600">{errMsg}</p>
      )}
    </div>
  );
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
    asset: 'usdc',
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
        asset:        rebalanceForm.asset,
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
        setSentinelAuth({ token: json.token, nonce: json.nonce, asset: json.asset, expiry: json.expiry, decision: json.sentinelDecision });
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
          asset:        sentinelAuth.asset,
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
              <label className="block text-xs font-mono text-dl-gray uppercase mb-1">Asset</label>
              <select
                className="w-full border border-dl-border p-2 font-mono text-sm bg-white"
                value={rebalanceForm.asset}
                onChange={(e) => {
                  setSentinelAuth(null);
                  setRebalanceForm((f) => ({ ...f, asset: e.target.value as 'usdc' | 'axusd' }));
                }}
              >
                <option value="usdc">USDC</option>
                <option value="axusd">AXUSD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-dl-gray uppercase mb-1">Amount</label>
              <input
                type="number" min="1" max="500000" step="any"
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

          {/* Vault address info strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mb-5">
            <div className="border border-dl-border p-3 space-y-1">
              <p className="text-xs font-mono text-dl-gray uppercase tracking-wide">Vault Address</p>
              <p className="font-mono text-xs break-all text-dl-navy">
                {process.env.NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS
                  ? <a href={`https://arbiscan.io/address/${process.env.NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-dl-forest underline">{process.env.NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS}</a>
                  : <span className="text-red-500">(configure NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS)</span>}
              </p>
            </div>
            <div className="border border-dl-border p-3 space-y-1">
              <p className="text-xs font-mono text-dl-gray uppercase tracking-wide">Accepted Assets</p>
              <div className="space-y-0.5 text-xs font-mono text-dl-navy">
                <div>USDC — 0xaf88d065e77c8cC2239327C5EDb3A432268e5831</div>
                <div>AXUSD — 0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7</div>
              </div>
            </div>
          </div>

          {/* Wallet-connected deposit — primary flow */}
          <WalletDepositPanel />

          {/* Manual record form — fallback for external wallet / hardware signer */}
          <details className="max-w-2xl">
            <summary className="text-xs font-mono text-dl-gray uppercase tracking-wide cursor-pointer select-none mb-3 hover:text-dl-navy">
              Manual record (used a hardware wallet or external signer?)
            </summary>
            <p className="text-xs text-dl-gray mb-3">
              If you executed the deposit from a hardware wallet, Gnosis Safe, or Arbiscan directly, paste the confirmed TX hash below to link it to the vault audit log.
            </p>
            <DepositRecordForm />
          </details>

          {/* ABI reference */}
          <details className="max-w-2xl mt-4">
            <summary className="text-xs font-mono text-dl-gray uppercase tracking-wide cursor-pointer select-none hover:text-dl-navy">
              ABI Reference
            </summary>
            <div className="mt-3 border border-dl-border p-4 bg-gray-50 space-y-3">
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
          </details>
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
