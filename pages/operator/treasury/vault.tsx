import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useBalance } from 'wagmi';
import { erc20Abi, parseAbi, parseUnits, formatUnits } from 'viem';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';
import { getVaultSummary, getVaultEventHistory, getIncomeSummary } from '../../../lib/treasury/vault/vaultService';
import type { VaultSummary, StrategyPosition, CronRunEntry } from '../../../lib/treasury/vault/vaultService';

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
  /** ISO 8601 UTC timestamp of the next scheduled harvest cron run. */
  nextCronRunAt: string;
}

// Compute the next UTC time at which the harvest cron fires.
// Schedule: "0 */6 * * *" — runs at 00:00, 06:00, 12:00, 18:00 UTC.
function computeNextHarvestCronRun(from: Date = new Date()): Date {
  const next = new Date(from);
  const h = next.getUTCHours();
  // Advance to the start of the next 6-hour slot.
  const nextSlotH = (Math.floor(h / 6) + 1) * 6;
  next.setUTCHours(nextSlotH, 0, 0, 0);
  return next;
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
        nextCronRunAt: computeNextHarvestCronRun().toISOString(),
      },
    };
  } catch (err: any) {
    const empty: VaultSummary = {
      aumUsdc: 0,
      idleUsdc: 0,
      deployedUsdc: 0,
      axusdIdleUsdc: 0,
      axusdDeployedUsdc: 0,
      aavePosition:        { address: '', name: 'Not deployed', currentValueUsdc: 0, principalUsdc: 0, unrealizedYieldUsdc: 0, allocationPct: 0, lastRebalancedAt: null, apyEstimatePct: null },
      camelotPosition:     { address: '', name: 'Not deployed', currentValueUsdc: 0, principalUsdc: 0, unrealizedYieldUsdc: 0, allocationPct: 0, lastRebalancedAt: null, apyEstimatePct: null },
      eulerUsdcPosition:   { address: '', name: 'Not deployed', currentValueUsdc: 0, principalUsdc: 0, unrealizedYieldUsdc: 0, allocationPct: 0, lastRebalancedAt: null, apyEstimatePct: null },
      eulerThbillPosition: { address: '', name: 'Not deployed', currentValueUsdc: 0, principalUsdc: 0, unrealizedYieldUsdc: 0, allocationPct: 0, lastRebalancedAt: null, apyEstimatePct: null },
      eulerWethPosition:   { address: '', name: 'Not deployed', currentValueUsdc: 0, principalUsdc: 0, unrealizedYieldUsdc: 0, allocationPct: 0, lastRebalancedAt: null, apyEstimatePct: null },
      blendedApyEstimatePct: null,
      yieldHarvestedInceptionUsdc: 0,
      lastHarvestedAt: null,
      paused: false,
      lastUpdated: new Date().toISOString(),
      isLive: false,
      minHarvestThresholdUsdc: 1.0,
      cronRunHistory: [],
    };
    const emptyPeriod: IncomePeriod = { period: '', since: '', harvestTotalUsdc: 0, harvestEventCount: 0, depositTotalUsdc: 0, withdrawTotalUsdc: 0, allocateTotalUsdc: 0 };
    return { props: { summary: empty, events: [], monthly: emptyPeriod, quarterly: emptyPeriod, ytd: emptyPeriod, loadError: err?.message ?? 'Failed to load vault data', nextCronRunAt: computeNextHarvestCronRun().toISOString() } };
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
  'function allocate(address strategy, address assetAddr, uint256 amount) external',
  'function paused() view returns (bool)',
]);

const AAVE_STRATEGY_ABI = parseAbi([
  'function currentValue() view returns (uint256)',
  'function principal() view returns (uint256)',
  'function unrealizedYield() view returns (int256)',
]);

type DepositAsset = 'USDC' | 'AXUSD';
type DepositStep  = 'idle' | 'approving' | 'approved' | 'depositing' | 'success' | 'error';

// ── Server-Side Deposit Panel ──────────────────────────────────────────────────
// Primary deposit path. Calls /api/treasury/vault/execute-deposit which signs
// and broadcasts the on-chain deposit using the deployer wallet (holds VAULT_ADMIN
// role). No MetaMask / WalletConnect interaction needed — operator cookie only.
interface ServerDepositResult {
  approveTx?: string;
  depositTx?: string;
  deployerAddress?: string;
}

function ServerDepositPanel() {
  const [amount,  setAmount]  = useState('');
  const [asset,   setAsset]   = useState<'USDC' | 'AXUSD'>('USDC');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<ServerDepositResult | null>(null);
  const [errMsg,  setErrMsg]  = useState<string | null>(null);

  async function handleSubmit() {
    const amtNum = parseFloat(amount);
    if (!isFinite(amtNum) || amtNum <= 0) {
      setErrMsg('Enter a valid amount greater than zero.');
      return;
    }
    setErrMsg(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/treasury/vault/execute-deposit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, amount }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrMsg(data.error ?? 'Deposit failed — check server logs.');
      } else {
        setResult({ approveTx: data.approveTx, depositTx: data.depositTx, deployerAddress: data.deployerAddress });
        setAmount('');
      }
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Network error — could not reach execute-deposit API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-dl-border p-5 max-w-2xl mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-dl-gray uppercase tracking-wide">Server Deposit — Admin Key</p>
        <p className="text-xs font-mono text-dl-gray">Deployer wallet · no MetaMask required</p>
      </div>

      {result && (
        <div className="border border-dl-forest p-4 space-y-2">
          <p className="text-xs font-mono text-dl-forest uppercase tracking-wide">Deposit Confirmed On-Chain</p>
          {result.approveTx && (
            <a href={`https://arbiscan.io/tx/${result.approveTx}`} target="_blank" rel="noopener noreferrer"
               className="text-xs font-mono text-dl-forest underline block">
              Approve TX → {result.approveTx.slice(0, 12)}…{result.approveTx.slice(-6)}
            </a>
          )}
          {result.depositTx && (
            <a href={`https://arbiscan.io/tx/${result.depositTx}`} target="_blank" rel="noopener noreferrer"
               className="text-xs font-mono text-dl-forest underline block">
              Deposit TX → {result.depositTx.slice(0, 12)}…{result.depositTx.slice(-6)}
            </a>
          )}
          {!result.approveTx && (
            <p className="text-xs font-mono text-dl-gray">Allowance already sufficient — approve skipped.</p>
          )}
          <button type="button" onClick={() => setResult(null)}
                  className="mt-2 px-3 py-1 text-xs font-mono uppercase tracking-wide border border-dl-border text-dl-navy">
            New Deposit
          </button>
        </div>
      )}

      {!result && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-mono text-dl-gray uppercase">Asset</label>
              <select value={asset} onChange={e => setAsset(e.target.value as 'USDC' | 'AXUSD')}
                      disabled={loading}
                      className="w-full border border-dl-border bg-white text-sm font-mono text-dl-navy px-2 py-1.5">
                <option value="USDC">USDC</option>
                <option value="AXUSD">AXUSD</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono text-dl-gray uppercase">Amount</label>
              <input type="number" min="0" step="any" placeholder="0.00"
                     value={amount} onChange={e => setAmount(e.target.value)}
                     disabled={loading}
                     className="w-full border border-dl-border bg-white text-sm font-mono text-dl-navy px-2 py-1.5" />
            </div>
          </div>

          {errMsg && (
            <p className="text-xs font-mono text-red-700 border border-red-200 bg-red-50 px-3 py-2">{errMsg}</p>
          )}

          <button type="button" onClick={handleSubmit}
                  disabled={loading || !amount}
                  className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide border border-dl-navy text-dl-navy disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? 'Executing deposit…' : `Deposit ${amount || '—'} ${asset}`}
          </button>

          {loading && (
            <p className="text-xs font-mono text-dl-gray">
              Signing and broadcasting on Arbitrum One via deployer key. This takes 5–30 seconds…
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Wallet Deposit Panel ───────────────────────────────────────────────────────
// Secondary / advanced path — requires the connected wallet to hold the
// VAULT_ADMIN on-chain role. Use ServerDepositPanel (above) for standard deposits.
function WalletDepositPanel() {
  const { address, isConnected } = useAccount();
  const chainId                  = useChainId();
  const publicClient             = usePublicClient({ chainId: ARBITRUM_ONE });
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

  // Native ETH balance (for gas awareness)
  const { data: ethBalanceData } = useBalance({ address });
  const ethBalance = ethBalanceData
    ? parseFloat(formatUnits(ethBalanceData.value, 18)).toFixed(4)
    : null;

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
      credentials: 'include',
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
    if (!publicClient) {
      setErrMsg('Arbitrum One RPC client not ready — ensure your wallet is connected to Arbitrum One and try again.');
      return;
    }
    setErrMsg(null);
    setStep('depositing');
    try {
      const decimals  = asset === 'USDC' ? 6 : 18;
      const rawAmt    = parseUnits(amount, decimals);

      // Pre-simulate to surface revert reasons before MetaMask opens
      try {
        if (asset === 'USDC') {
          await publicClient.simulateContract({
            address: vaultAddress,
            abi: VAULT_ABI,
            functionName: 'deposit',
            args: [rawAmt, address],
            account: address,
          });
        } else {
          await publicClient.simulateContract({
            address: vaultAddress,
            abi: VAULT_ABI,
            functionName: 'depositToken',
            args: [AXUSD_ADDRESS, rawAmt],
            account: address,
          });
        }
      } catch (simErr: unknown) {
        const msg = simErr instanceof Error ? simErr.message : String(simErr);
        const isAccessControl = msg.includes('0xe2517d3f') || /missing role|AccessControl/i.test(msg);
        if (isAccessControl) {
          setErrMsg('Connected wallet does not hold the required on-chain role to deposit. Use the Server Deposit — Admin Key panel above.');
          setStep('approved');
          return;
        }
        const revertMatch = msg.match(/reverted with reason string '([^']+)'/);
        const reason = revertMatch ? revertMatch[1] : msg.slice(0, 120);
        setErrMsg(`Transaction would fail: ${reason}. Check your USDC balance and that the vault is not paused.`);
        setStep('approved');
        return;
      }

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
        <button type="button" onClick={reset} className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide border border-dl-border text-dl-navy">
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
        <div className="text-right space-y-0.5">
          <div className="text-xs font-mono text-dl-gray">{address?.slice(0, 6)}…{address?.slice(-4)} · Arbitrum One</div>
          {ethBalance !== null && (
            <div className="text-xs font-mono text-dl-gray">
              Gas balance: <span className={parseFloat(ethBalance) < 0.001 ? 'text-red-600 font-semibold' : 'text-dl-navy'}>{ethBalance} ETH</span>
            </div>
          )}
        </div>
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
            type="button"
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
            type="button"
            onClick={handleDeposit}
            className="px-5 py-2 text-xs font-mono uppercase tracking-wide bg-dl-forest text-white"
          >
            Step 2 — Deposit to Vault
          </button>
        )}

        {step === 'depositing' && (
          <button type="button" disabled className="px-5 py-2 text-xs font-mono uppercase tracking-wide bg-dl-forest text-white opacity-50">
            Confirming deposit…
          </button>
        )}

        {step !== 'idle' && (
          <button type="button" onClick={reset} className="text-xs font-mono text-dl-gray underline">
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

// ── Allocate to Aave v3 Panel ──────────────────────────────────────────────────
// STRATEGY_ADMIN-gated panel that pushes idle USDC from the vault into the
// AaveV3Strategy adapter, starting yield generation on Aave v3 Arbitrum.
// Requires new vault (with SM wired) to be deployed first.

const AAVE_STRATEGY_ADDRESS         = (process.env.NEXT_PUBLIC_AXIOM_AAVE_V3_STRATEGY_ADDRESS          ?? '') as `0x${string}`;
const EULER_USDC_STRATEGY_ADDRESS   = (process.env.NEXT_PUBLIC_EULER_USDC_THEO_STRATEGY_ADDRESS        ?? '') as `0x${string}`;
const EULER_THBILL_STRATEGY_ADDRESS = (process.env.NEXT_PUBLIC_EULER_THBILL_THEO_STRATEGY_ADDRESS      ?? '') as `0x${string}`;
const EULER_WETH_STRATEGY_ADDRESS   = (process.env.NEXT_PUBLIC_EULER_WETH_ARBITRUM_STRATEGY_ADDRESS    ?? '') as `0x${string}`;

// Euler v2 vault underlying assets (Arbitrum One)
const THBILL_ADDRESS = '0xfDD22Ce6D1F66bc0Ec89b20BF16CcB6670F55A5a' as `0x${string}`;
const WETH_ADDRESS   = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as `0x${string}`;

function AllocateToAavePanel() {
  const { address, isConnected } = useAccount();
  const chainId                  = useChainId();
  const publicClient             = usePublicClient({ chainId: ARBITRUM_ONE });
  const { writeContractAsync }   = useWriteContract();

  const vaultAddress    = (process.env.NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS ?? '') as `0x${string}`;
  const strategyAddress = AAVE_STRATEGY_ADDRESS;
  const isWrongChain    = isConnected && chainId !== ARBITRUM_ONE;

  const [amount,     setAmount]     = useState('');
  const [step,       setStep]       = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errMsg,     setErrMsg]     = useState<string | null>(null);
  const [allocateTx, setAllocateTx] = useState<`0x${string}` | null>(null);
  const [idleUsdc,   setIdleUsdc]   = useState<number | null>(null);
  const [deployed,   setDeployed]   = useState<number | null>(null);
  const [principal,  setPrincipal]  = useState<number | null>(null);

  const { isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: allocateTx ?? undefined });

  // Fetch vault idle USDC and strategy position
  const refreshStats = useCallback(() => {
    if (!publicClient || !vaultAddress) return;
    // Vault idle USDC
    publicClient.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [vaultAddress] })
      .then((raw) => setIdleUsdc(parseFloat(formatUnits(raw as bigint, 6))))
      .catch(() => setIdleUsdc(null));
    // Strategy position
    if (!strategyAddress) return;
    Promise.all([
      publicClient.readContract({ address: strategyAddress, abi: AAVE_STRATEGY_ABI, functionName: 'currentValue' }),
      publicClient.readContract({ address: strategyAddress, abi: AAVE_STRATEGY_ABI, functionName: 'principal' }),
    ]).then(([cv, pr]) => {
      setDeployed(parseFloat(formatUnits(cv as bigint, 6)));
      setPrincipal(parseFloat(formatUnits(pr as bigint, 6)));
    }).catch(() => { setDeployed(null); setPrincipal(null); });
  }, [publicClient, vaultAddress, strategyAddress]);

  useEffect(() => { refreshStats(); }, [refreshStats, step]);

  // Poll strategy position every 30 s so accrued yield stays live
  useEffect(() => {
    const id = setInterval(refreshStats, 30_000);
    return () => clearInterval(id);
  }, [refreshStats]);

  useEffect(() => {
    if (confirmed && step === 'sending') {
      refreshStats();
      setStep('success');
    }
  }, [confirmed, step, refreshStats]);

  async function handleAllocate() {
    if (!address || !vaultAddress || !strategyAddress || !publicClient) return;
    const amtNum = parseFloat(amount);
    if (!isFinite(amtNum) || amtNum <= 0) { setErrMsg('Enter a valid amount greater than zero.'); return; }
    setErrMsg(null);
    setStep('sending');
    try {
      const rawAmt = parseUnits(amount, 6);
      // Simulate first
      try {
        await publicClient.simulateContract({
          address: vaultAddress, abi: VAULT_ABI, functionName: 'allocate',
          args: [strategyAddress, USDC_ADDRESS, rawAmt], account: address,
        });
      } catch (simErr: unknown) {
        const msg = simErr instanceof Error ? simErr.message : String(simErr);
        const match = msg.match(/reverted with reason string '([^']+)'/);
        setErrMsg(`Transaction would fail: ${match ? match[1] : msg.slice(0, 160)}`);
        setStep('error');
        return;
      }
      const hash = await writeContractAsync({
        address: vaultAddress, abi: VAULT_ABI, functionName: 'allocate',
        args: [strategyAddress, USDC_ADDRESS, rawAmt],
      });
      setAllocateTx(hash);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Transaction rejected or failed.');
      setStep('error');
    }
  }

  function reset() { setStep('idle'); setAmount(''); setAllocateTx(null); setErrMsg(null); }

  if (!isConnected || isWrongChain) return null;

  // ── Vault redeploy pending ────────────────────────────────────────────────────
  if (!vaultAddress || !strategyAddress) {
    return (
      <div className="border border-dl-border p-5 max-w-2xl mb-4">
        <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-2">Allocate to Aave v3</p>
        <div className="border border-yellow-300 bg-yellow-50 p-3 text-xs font-mono text-yellow-800">
          Pending vault redeploy. Once the new vault stack is deployed with StrategyManager
          wired, set NEXT_PUBLIC_AXIOM_AAVE_V3_STRATEGY_ADDRESS and restart to enable this panel.
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="border border-dl-forest p-5 max-w-2xl mb-4 space-y-3">
        <p className="text-xs font-mono text-dl-forest uppercase tracking-wide">Allocation Complete</p>
        <p className="text-sm text-dl-navy">
          <span className="font-semibold">${amount} USDC</span> deployed into Aave v3 via AaveV3Strategy.
        </p>
        {allocateTx && (
          <a href={`https://arbiscan.io/tx/${allocateTx}`} target="_blank" rel="noopener noreferrer"
            className="text-xs font-mono text-dl-forest underline block">
            View on Arbiscan → {allocateTx.slice(0, 12)}…{allocateTx.slice(-6)}
          </a>
        )}
        {deployed !== null && (
          <p className="text-xs font-mono text-dl-navy">
            Strategy currentValue(): <span className="font-semibold">${deployed.toFixed(6)}</span> aUSDC
          </p>
        )}
        <button type="button" onClick={reset}
          className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide border border-dl-border text-dl-navy">
          Allocate Again
        </button>
      </div>
    );
  }

  const unrealized = deployed !== null && principal !== null ? deployed - principal : null;

  return (
    <div className="border border-dl-border p-5 max-w-2xl mb-4 space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-dl-gray uppercase tracking-wide">Allocate to Aave v3</p>
        <p className="text-xs font-mono text-dl-gray mt-0.5">
          Push idle USDC from vault into AaveV3Strategy — starts earning yield immediately
        </p>
      </div>

      {/* Live position stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-dl-border p-3">
          <p className="text-xs font-mono text-dl-gray uppercase mb-1">Vault Idle</p>
          <p className="text-sm font-mono font-semibold text-dl-navy">
            {idleUsdc !== null ? `$${idleUsdc.toFixed(2)}` : '—'}
          </p>
        </div>
        <div className="border border-dl-border p-3">
          <p className="text-xs font-mono text-dl-gray uppercase mb-1">In Aave</p>
          <p className="text-sm font-mono font-semibold text-dl-navy">
            {deployed !== null ? `$${deployed.toFixed(6)}` : '—'}
          </p>
        </div>
        <div className="border border-dl-border p-3">
          <p className="text-xs font-mono text-dl-gray uppercase mb-1">Accrued Yield</p>
          <p className={`text-sm font-mono font-semibold ${unrealized !== null && unrealized > 0 ? 'text-dl-forest' : 'text-dl-navy'}`}>
            {unrealized !== null ? `$${unrealized.toFixed(6)}` : '—'}
          </p>
        </div>
      </div>

      {/* Role note */}
      <div className="text-xs font-mono text-dl-gray border-l-2 border-dl-border pl-3">
        Requires STRATEGY_ADMIN role — connect the deployer wallet ({address?.slice(0,6)}…{address?.slice(-4)}).
        Vault calls allocate(aaveStrategy, USDC, amount) → StrategyManager → AaveV3Strategy.deploy().
      </div>

      {/* Amount input */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-dl-gray uppercase">Amount (USDC)</label>
        <div className="flex gap-2">
          <input
            type="number" min="0" step="any" value={amount}
            onChange={(e) => { if (step === 'idle' || step === 'error') setAmount(e.target.value); }}
            placeholder="e.g. 25.00"
            className="flex-1 border border-dl-border px-2 py-1.5 text-xs font-mono text-dl-navy"
          />
          {idleUsdc !== null && idleUsdc > 0 && (
            <button type="button" onClick={() => setAmount(idleUsdc.toFixed(2))}
              className="text-xs font-mono text-dl-forest underline whitespace-nowrap">
              Max {idleUsdc.toFixed(2)}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {errMsg && (
        <div className="border border-red-300 bg-red-50 p-3 text-xs font-mono text-red-700 break-all">{errMsg}</div>
      )}

      {/* Action */}
      <div className="flex gap-3">
        {(step === 'idle' || step === 'error') && (
          <button type="button" onClick={handleAllocate}
            disabled={!amount || parseFloat(amount) <= 0}
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide bg-dl-forest text-white disabled:opacity-40">
            Allocate to Aave v3
          </button>
        )}
        {step === 'sending' && (
          <button type="button" disabled
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide bg-dl-forest text-white opacity-60">
            Sending…
          </button>
        )}
        {step === 'error' && (
          <button type="button" onClick={reset}
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide border border-dl-border text-dl-gray">
            Reset
          </button>
        )}
      </div>

      {/* Addresses */}
      <div className="text-xs font-mono text-dl-gray space-y-0.5">
        <div>Vault: <span className="text-dl-navy">{vaultAddress}</span></div>
        <div>Strategy: <span className="text-dl-navy">{strategyAddress}</span></div>
      </div>
    </div>
  );
}

// ── Generic Euler v2 Allocate Panel ───────────────────────────────────────────
// One panel per Euler market. Calls vault.allocate(eulerStrategy, assetAddr, amount).
// For USDC: uses idle vault USDC balance.
// For thBILL/WETH: caller must first call vault.depositToken(asset, amount) to
// load the secondary asset, then allocate from the vault's idle balance.

type EulerAllocatePanelProps = {
  label: string;
  marketDesc: string;
  apyLabel: string;
  strategyAddress: `0x${string}`;
  assetAddress: `0x${string}`;
  assetSymbol: string;
  assetDecimals: number;
};

function AllocateToEulerPanel({
  label,
  marketDesc,
  apyLabel,
  strategyAddress,
  assetAddress,
  assetSymbol,
  assetDecimals,
}: EulerAllocatePanelProps) {
  const { address, isConnected } = useAccount();
  const chainId                  = useChainId();
  const publicClient             = usePublicClient({ chainId: ARBITRUM_ONE });
  const { writeContractAsync }   = useWriteContract();

  const vaultAddress = (process.env.NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS ?? '') as `0x${string}`;
  const isWrongChain = isConnected && chainId !== ARBITRUM_ONE;

  const [amount,     setAmount]     = useState('');
  const [step,       setStep]       = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errMsg,     setErrMsg]     = useState<string | null>(null);
  const [allocateTx, setAllocateTx] = useState<`0x${string}` | null>(null);
  const [idleBal,    setIdleBal]    = useState<number | null>(null);
  const [deployed,   setDeployed]   = useState<number | null>(null);
  const [principal,  setPrincipal]  = useState<number | null>(null);

  const { isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: allocateTx ?? undefined });

  const refreshStats = useCallback(() => {
    if (!publicClient || !vaultAddress) return;
    const scaleFactor = Math.pow(10, assetDecimals);
    publicClient.readContract({ address: assetAddress, abi: erc20Abi, functionName: 'balanceOf', args: [vaultAddress] })
      .then((raw) => setIdleBal(Number(raw as bigint) / scaleFactor))
      .catch(() => setIdleBal(null));
    if (!strategyAddress) return;
    Promise.all([
      publicClient.readContract({ address: strategyAddress, abi: AAVE_STRATEGY_ABI, functionName: 'currentValue' }),
      publicClient.readContract({ address: strategyAddress, abi: AAVE_STRATEGY_ABI, functionName: 'principal' }),
    ]).then(([cv, pr]) => {
      setDeployed(Number(cv as bigint) / scaleFactor);
      setPrincipal(Number(pr as bigint) / scaleFactor);
    }).catch(() => { setDeployed(null); setPrincipal(null); });
  }, [publicClient, vaultAddress, strategyAddress, assetAddress, assetDecimals]);

  useEffect(() => { refreshStats(); }, [refreshStats, step]);
  useEffect(() => {
    const id = setInterval(refreshStats, 30_000);
    return () => clearInterval(id);
  }, [refreshStats]);
  useEffect(() => {
    if (confirmed && step === 'sending') { refreshStats(); setStep('success'); }
  }, [confirmed, step, refreshStats]);

  async function handleAllocate() {
    if (!address || !vaultAddress || !strategyAddress || !publicClient) return;
    const amtNum = parseFloat(amount);
    if (!isFinite(amtNum) || amtNum <= 0) { setErrMsg('Enter a valid amount greater than zero.'); return; }
    setErrMsg(null);
    setStep('sending');
    try {
      const rawAmt = parseUnits(amount, assetDecimals);
      try {
        await publicClient.simulateContract({
          address: vaultAddress, abi: VAULT_ABI, functionName: 'allocate',
          args: [strategyAddress, assetAddress, rawAmt], account: address,
        });
      } catch (simErr: unknown) {
        const msg = simErr instanceof Error ? simErr.message : String(simErr);
        const match = msg.match(/reverted with reason string '([^']+)'/);
        setErrMsg(`Transaction would fail: ${match ? match[1] : msg.slice(0, 200)}`);
        setStep('error');
        return;
      }
      const hash = await writeContractAsync({
        address: vaultAddress, abi: VAULT_ABI, functionName: 'allocate',
        args: [strategyAddress, assetAddress, rawAmt],
      });
      setAllocateTx(hash);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Transaction rejected or failed.');
      setStep('error');
    }
  }

  function reset() { setStep('idle'); setAmount(''); setAllocateTx(null); setErrMsg(null); }

  if (!isConnected || isWrongChain) return null;
  if (!vaultAddress || !strategyAddress) {
    return (
      <div className="border border-dl-border p-5 max-w-2xl mb-4">
        <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-2">{label}</p>
        <div className="border border-yellow-300 bg-yellow-50 p-3 text-xs font-mono text-yellow-800">
          Strategy not yet deployed. Deploy EulerV2Strategy for this market and set the
          corresponding NEXT_PUBLIC_EULER_*_STRATEGY_ADDRESS secret.
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="border border-dl-forest p-5 max-w-2xl mb-4 space-y-3">
        <p className="text-xs font-mono text-dl-forest uppercase tracking-wide">Allocation Complete</p>
        <p className="text-sm text-dl-navy">
          <span className="font-semibold">{amount} {assetSymbol}</span> deployed into {label}.
        </p>
        {allocateTx && (
          <a href={`https://arbiscan.io/tx/${allocateTx}`} target="_blank" rel="noopener noreferrer"
            className="text-xs font-mono text-dl-forest underline block">
            View on Arbiscan → {allocateTx.slice(0, 12)}…{allocateTx.slice(-6)}
          </a>
        )}
        {deployed !== null && (
          <p className="text-xs font-mono text-dl-navy">
            Strategy currentValue(): <span className="font-semibold">{deployed.toFixed(6)} {assetSymbol}</span>
          </p>
        )}
        <button type="button" onClick={reset}
          className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide border border-dl-border text-dl-navy">
          Allocate Again
        </button>
      </div>
    );
  }

  const unrealized = deployed !== null && principal !== null ? deployed - principal : null;

  return (
    <div className="border border-dl-border p-5 max-w-2xl mb-4 space-y-5">
      <div>
        <p className="text-xs font-mono text-dl-gray uppercase tracking-wide">{label}</p>
        <p className="text-xs font-mono text-dl-gray mt-0.5">{marketDesc} — Target APY: <span className="text-dl-forest font-semibold">{apyLabel}</span></p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="border border-dl-border p-3">
          <p className="text-xs font-mono text-dl-gray uppercase mb-1">Vault Idle {assetSymbol}</p>
          <p className="text-sm font-mono font-semibold text-dl-navy">
            {idleBal !== null ? idleBal.toFixed(assetDecimals === 6 ? 2 : 6) : '—'}
          </p>
        </div>
        <div className="border border-dl-border p-3">
          <p className="text-xs font-mono text-dl-gray uppercase mb-1">In Euler</p>
          <p className="text-sm font-mono font-semibold text-dl-navy">
            {deployed !== null ? deployed.toFixed(assetDecimals === 6 ? 6 : 8) : '—'}
          </p>
        </div>
        <div className="border border-dl-border p-3">
          <p className="text-xs font-mono text-dl-gray uppercase mb-1">Accrued Yield</p>
          <p className={`text-sm font-mono font-semibold ${unrealized !== null && unrealized > 0 ? 'text-dl-forest' : 'text-dl-navy'}`}>
            {unrealized !== null ? unrealized.toFixed(assetDecimals === 6 ? 6 : 8) : '—'}
          </p>
        </div>
      </div>

      {assetSymbol !== 'USDC' && (
        <div className="border border-dl-border bg-gray-50 p-3 text-xs font-mono text-dl-navy space-y-1">
          <p className="text-dl-gray uppercase tracking-wide mb-1">Pre-allocation step required</p>
          <p>Before allocating, load {assetSymbol} into the vault via <code className="bg-white px-1">vault.depositToken({assetAddress.slice(0,10)}…, amount)</code></p>
          <p className="text-dl-gray">The Vault Idle {assetSymbol} stat above must be &gt; 0 before you can allocate.</p>
        </div>
      )}

      <div className="text-xs font-mono text-dl-gray border-l-2 border-dl-border pl-3">
        Requires STRATEGY_ADMIN role — connect deployer wallet ({address?.slice(0,6)}…{address?.slice(-4)}).
        Calls vault.allocate(eulerStrategy, {assetAddress.slice(0,10)}…, amount).
      </div>

      <div className="space-y-2">
        <label className="text-xs font-mono text-dl-gray uppercase">Amount ({assetSymbol})</label>
        <div className="flex gap-2">
          <input
            type="number" min="0" step="any" value={amount}
            onChange={(e) => { if (step === 'idle' || step === 'error') setAmount(e.target.value); }}
            placeholder={`e.g. ${assetSymbol === 'USDC' ? '25.00' : '0.01'}`}
            className="flex-1 border border-dl-border px-2 py-1.5 text-xs font-mono text-dl-navy"
          />
          {idleBal !== null && idleBal > 0 && (
            <button type="button" onClick={() => setAmount(idleBal.toFixed(assetDecimals === 6 ? 2 : 8))}
              className="text-xs font-mono text-dl-forest underline whitespace-nowrap">
              Max {idleBal.toFixed(assetDecimals === 6 ? 2 : 6)}
            </button>
          )}
        </div>
      </div>

      {errMsg && (
        <div className="border border-red-300 bg-red-50 p-3 text-xs font-mono text-red-700 break-all">{errMsg}</div>
      )}

      <div className="flex gap-3">
        {(step === 'idle' || step === 'error') && (
          <button type="button" onClick={handleAllocate}
            disabled={!amount || parseFloat(amount) <= 0}
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide bg-dl-forest text-white disabled:opacity-40">
            Allocate to {label}
          </button>
        )}
        {step === 'sending' && (
          <button type="button" disabled
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide bg-dl-forest text-white opacity-60">
            Sending…
          </button>
        )}
        {step === 'error' && (
          <button type="button" onClick={reset}
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide border border-dl-border text-dl-gray">
            Reset
          </button>
        )}
      </div>

      <div className="text-xs font-mono text-dl-gray space-y-0.5">
        <div>Vault: <span className="text-dl-navy">{vaultAddress}</span></div>
        <div>Strategy: <span className="text-dl-navy">{strategyAddress}</span></div>
        <div>Asset: <span className="text-dl-navy">{assetAddress}</span></div>
      </div>
    </div>
  );
}

// ── USDC Backing Panel ─────────────────────────────────────────────────────────
// Incrementally backs the 10,000 AXUSD genesis mint with real USDC deposits.
// Presets: $25 / $50 / $100 + custom. Approve → vault.deposit() flow.
const GENESIS_MINT_TARGET = 10_000;

function UsdcBackingPanel() {
  const { address, isConnected } = useAccount();
  const chainId                  = useChainId();
  const publicClient             = usePublicClient({ chainId: ARBITRUM_ONE });
  const { writeContractAsync }   = useWriteContract();

  const vaultAddress = (process.env.NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS ?? '') as `0x${string}`;
  const isWrongChain = isConnected && chainId !== ARBITRUM_ONE;

  const PRESETS = [25, 50, 100];

  const [amount,     setAmount]     = useState('');
  const [step,       setStep]       = useState<DepositStep>('idle');
  const [errMsg,     setErrMsg]     = useState<string | null>(null);
  const [approveTx,  setApproveTx]  = useState<`0x${string}` | null>(null);
  const [depositTx,  setDepositTx]  = useState<`0x${string}` | null>(null);
  const [walletUsdc, setWalletUsdc] = useState<string | null>(null);
  const [vaultUsdc,  setVaultUsdc]  = useState<number | null>(null);

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTx ?? undefined });
  const { isSuccess: depositConfirmed } = useWaitForTransactionReceipt({ hash: depositTx ?? undefined });
  const { data: ethBalanceData }        = useBalance({ address });
  const ethBalance = ethBalanceData ? parseFloat(formatUnits(ethBalanceData.value, 18)).toFixed(4) : null;

  // Wallet USDC balance
  useEffect(() => {
    if (!address || !publicClient) return;
    publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    }).then((raw) => setWalletUsdc(parseFloat(formatUnits(raw as bigint, 6)).toFixed(2)))
      .catch(() => setWalletUsdc(null));
  }, [address, publicClient, step]);

  // Vault USDC balance (backed so far)
  useEffect(() => {
    if (!publicClient || !vaultAddress) return;
    publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [vaultAddress],
    }).then((raw) => setVaultUsdc(parseFloat(formatUnits(raw as bigint, 6))))
      .catch(() => setVaultUsdc(null));
  }, [publicClient, vaultAddress, step]);

  useEffect(() => {
    if (approveConfirmed && step === 'approving') setStep('approved');
  }, [approveConfirmed, step]);

  useEffect(() => {
    if (!depositConfirmed || step !== 'depositing' || !depositTx) return;
    const amtNum = parseFloat(amount);
    fetch('/api/treasury/vault/record-deposit', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset: 'USDC', amountUsdc: amtNum, txHash: depositTx }),
    }).finally(() => setStep('success'));
  }, [depositConfirmed, step, depositTx, amount]);

  function reset() {
    setStep('idle'); setAmount(''); setApproveTx(null); setDepositTx(null); setErrMsg(null);
  }

  async function handleApprove() {
    if (!address || !vaultAddress) return;
    const amtNum = parseFloat(amount);
    if (!isFinite(amtNum) || amtNum <= 0) { setErrMsg('Enter a valid amount greater than zero.'); return; }
    setErrMsg(null);
    setStep('approving');
    try {
      const hash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [vaultAddress, parseUnits(amount, 6)],
      });
      setApproveTx(hash);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Approval rejected or failed.');
      setStep('idle');
    }
  }

  async function handleDeposit() {
    if (!address || !vaultAddress) return;
    if (!publicClient) { setErrMsg('Arbitrum One RPC client not ready.'); return; }
    setErrMsg(null);
    setStep('depositing');
    try {
      const rawAmt = parseUnits(amount, 6);
      try {
        await publicClient.simulateContract({
          address: vaultAddress, abi: VAULT_ABI, functionName: 'deposit',
          args: [rawAmt, address], account: address,
        });
      } catch (simErr: unknown) {
        const msg = simErr instanceof Error ? simErr.message : String(simErr);
        const isAccessControl = msg.includes('0xe2517d3f') || /missing role|AccessControl/i.test(msg);
        if (isAccessControl) {
          setErrMsg('Connected wallet does not hold the required on-chain role. Use the Server Deposit — Admin Key panel to deposit.');
          setStep('approved');
          return;
        }
        const match = msg.match(/reverted with reason string '([^']+)'/);
        setErrMsg(`Transaction would fail: ${match ? match[1] : msg.slice(0, 120)}`);
        setStep('approved');
        return;
      }
      const hash = await writeContractAsync({
        address: vaultAddress, abi: VAULT_ABI, functionName: 'deposit',
        args: [rawAmt, address],
      });
      setDepositTx(hash);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Deposit rejected or failed.');
      setStep('approved');
    }
  }

  if (!isConnected || isWrongChain || !vaultAddress) return null;

  // ── Success ──────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="border border-dl-forest p-5 max-w-2xl mb-4">
        <p className="text-xs font-mono text-dl-forest uppercase tracking-wide mb-2">Backing Deposit Complete</p>
        <p className="text-sm text-dl-navy mb-3">
          <span className="font-semibold">${amount} USDC</span> deposited toward the genesis reserve gap.
        </p>
        {depositTx && (
          <a href={`https://arbiscan.io/tx/${depositTx}`} target="_blank" rel="noopener noreferrer"
            className="text-xs font-mono text-dl-forest underline block mb-4">
            View on Arbiscan → {depositTx.slice(0, 12)}…{depositTx.slice(-6)}
          </a>
        )}
        <button type="button" onClick={reset}
          className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide border border-dl-border text-dl-navy">
          Deposit Again
        </button>
      </div>
    );
  }

  // ── Main panel ───────────────────────────────────────────────────────────────
  const backedSoFar  = vaultUsdc ?? 0;
  const remaining    = Math.max(GENESIS_MINT_TARGET - backedSoFar, 0);
  const progressPct  = Math.min((backedSoFar / GENESIS_MINT_TARGET) * 100, 100);
  const stepNum      = step === 'idle' || step === 'approving' ? 1 : 2;

  return (
    <div className="border border-dl-border p-5 max-w-2xl mb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-dl-gray uppercase tracking-wide">Genesis Reserve Backing</p>
          <p className="text-xs font-mono text-dl-gray mt-0.5">Back the 10,000 AXUSD genesis mint with USDC</p>
        </div>
        <div className="text-right space-y-0.5">
          <div className="text-xs font-mono text-dl-gray">{address?.slice(0,6)}…{address?.slice(-4)} · Arb One</div>
          {ethBalance !== null && (
            <div className="text-xs font-mono text-dl-gray">
              Gas: <span className={parseFloat(ethBalance) < 0.001 ? 'text-red-600 font-semibold' : 'text-dl-navy'}>{ethBalance} ETH</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-dl-navy font-semibold">${backedSoFar.toFixed(2)} backed</span>
          <span className="text-dl-gray">${remaining.toFixed(2)} remaining of $10,000</span>
        </div>
        <div className="w-full h-2 bg-gray-100 border border-dl-border">
          <div className="h-full bg-dl-forest" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-xs font-mono text-dl-gray">{progressPct.toFixed(2)}% of genesis reserve covered</p>
      </div>

      {/* Step indicators */}
      <div className="flex gap-4 text-xs font-mono">
        <div className={`flex items-center gap-1.5 ${stepNum === 1 ? 'text-dl-navy font-semibold' : 'text-dl-gray'}`}>
          <span className={`w-5 h-5 flex items-center justify-center border text-xs ${step === 'approved' || step === 'depositing' ? 'bg-dl-forest border-dl-forest text-white' : 'border-dl-border'}`}>
            {step === 'approved' || step === 'depositing' ? '✓' : '1'}
          </span>
          Approve USDC
        </div>
        <div className="text-dl-border self-center">→</div>
        <div className={`flex items-center gap-1.5 ${stepNum === 2 ? 'text-dl-navy font-semibold' : 'text-dl-gray'}`}>
          <span className="w-5 h-5 flex items-center justify-center border text-xs border-dl-border">2</span>
          Deposit to Vault
        </div>
      </div>

      {/* Preset + custom amount */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-dl-gray uppercase">Amount (USDC)</label>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button key={p} type="button" disabled={step !== 'idle'}
              onClick={() => setAmount(String(p))}
              className={`px-3 py-1.5 text-xs font-mono border disabled:opacity-40 ${amount === String(p) ? 'bg-dl-navy text-white border-dl-navy' : 'border-dl-border text-dl-navy hover:bg-gray-50'}`}>
              ${p}
            </button>
          ))}
          <input
            type="number" min="0" step="any" value={amount}
            onChange={(e) => { if (step === 'idle') setAmount(e.target.value); }}
            placeholder="Custom"
            className="flex-1 border border-dl-border px-2 py-1.5 text-xs font-mono text-dl-navy min-w-0"
          />
          {walletUsdc !== null && (
            <button type="button" disabled={step !== 'idle'} onClick={() => setAmount(walletUsdc!)}
              className="text-xs font-mono text-dl-forest underline whitespace-nowrap disabled:opacity-40">
              Max {walletUsdc}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {errMsg && (
        <div className="border border-red-300 bg-red-50 p-3 text-xs font-mono text-red-700">{errMsg}</div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {step === 'idle' && (
          <button type="button" onClick={handleApprove}
            disabled={!amount || parseFloat(amount) <= 0}
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide bg-dl-navy text-white disabled:opacity-40">
            Step 1 — Approve USDC
          </button>
        )}
        {step === 'approving' && (
          <button type="button" disabled
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide bg-dl-navy text-white opacity-60">
            Approving…
          </button>
        )}
        {step === 'approved' && (
          <button type="button" onClick={handleDeposit}
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide bg-dl-forest text-white">
            Step 2 — Deposit ${amount} USDC
          </button>
        )}
        {step === 'depositing' && (
          <button type="button" disabled
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide bg-dl-forest text-white opacity-60">
            Depositing…
          </button>
        )}
        {step !== 'idle' && (
          <button type="button" onClick={reset}
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide border border-dl-border text-dl-gray">
            Reset
          </button>
        )}
      </div>
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

// ── Harvest Yield Panel ────────────────────────────────────────────────────────
// Server-side harvest triggered via POST /api/treasury/vault/harvest.
// Reads unrealized yield from the Aave strategy; enforces a $1.00 minimum
// before submitting the on-chain transaction.
function HarvestPanel({ lastHarvestedAt, unrealizedYield, principalUsdc, apyEstimatePct, minHarvestThresholdUsdc }: {
  lastHarvestedAt: string | null;
  unrealizedYield: number;
  principalUsdc: number;
  apyEstimatePct: number | null;
  minHarvestThresholdUsdc: number;
}) {
  const MIN_HARVEST = minHarvestThresholdUsdc;
  const [status, setStatus] = useState<
    | null
    | { ok: true;  txHash: string | null; yieldUsdc: number }
    | { ok: false; skipped?: boolean; reason?: string; error?: string }
  >(null);
  const [busy, setBusy] = useState(false);

  async function handleHarvest() {
    setBusy(true);
    setStatus(null);
    try {
      const res  = await fetch('/api/treasury/vault/harvest', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.skipped) {
        setStatus({ ok: false, skipped: true, reason: json.reason });
      } else if (json.success) {
        setStatus({ ok: true, txHash: json.txHash, yieldUsdc: json.yieldUsdc });
      } else {
        setStatus({ ok: false, error: json.error ?? json.detail ?? 'Harvest failed' });
      }
    } catch (err: unknown) {
      setStatus({ ok: false, error: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setBusy(false);
    }
  }

  const belowThreshold = unrealizedYield < MIN_HARVEST;

  // Accrual rate derived from Aave APY × deployed principal
  const apy = apyEstimatePct ?? 0;
  const dailyYieldUsdc  = principalUsdc * (apy / 100) / 365;
  const hourlyYieldUsdc = dailyYieldUsdc / 24;
  const annualYieldUsdc = principalUsdc * (apy / 100);
  // How many hours until accrued yield crosses the harvest threshold
  const remaining = Math.max(MIN_HARVEST - unrealizedYield, 0);
  const hoursToThreshold =
    hourlyYieldUsdc > 0 ? remaining / hourlyYieldUsdc : null;

  return (
    <div className="border border-dl-border p-5 max-w-2xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-dl-gray uppercase tracking-wide">Trigger Harvest</p>
          <p className="text-xs font-mono text-dl-gray mt-0.5">
            Sweeps accrued Aave yield (aUSDC balance − principal) back to the vault.
            Minimum threshold: ${MIN_HARVEST.toFixed(2)}.
          </p>
        </div>
        {lastHarvestedAt && (
          <div className="text-right shrink-0 ml-4">
            <p className="text-xs font-mono text-dl-gray uppercase">Last Harvested</p>
            <p className="text-xs font-mono text-dl-navy">{new Date(lastHarvestedAt).toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Live accrued yield indicator */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-dl-border p-3">
          <p className="text-xs font-mono text-dl-gray uppercase mb-1">Accrued Yield (Aave)</p>
          <p className={`text-sm font-mono font-semibold ${unrealizedYield > 0 ? 'text-dl-forest' : 'text-dl-navy'}`}>
            {usd(unrealizedYield)}
          </p>
          {belowThreshold && (
            <p className="text-xs font-mono text-dl-gray mt-1">Below ${MIN_HARVEST.toFixed(2)} threshold</p>
          )}
        </div>
        <div className="border border-dl-border p-3">
          <p className="text-xs font-mono text-dl-gray uppercase mb-1">Last Harvested</p>
          <p className="text-sm font-mono text-dl-navy">
            {lastHarvestedAt ? new Date(lastHarvestedAt).toLocaleDateString() : 'Never'}
          </p>
          {lastHarvestedAt && (
            <p className="text-xs font-mono text-dl-gray mt-1">
              {new Date(lastHarvestedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Accrual rate strip — derived from Aave APY × deployed principal */}
      <div className="border-t border-dl-border pt-3">
        <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-2">
          Live Accrual Rate
          {apyEstimatePct !== null && (
            <span className="ml-2 normal-case">({apyEstimatePct.toFixed(2)}% APY × {usd(principalUsdc)} principal)</span>
          )}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-dl-border p-3">
            <p className="text-xs font-mono text-dl-gray uppercase mb-1">Per Hour</p>
            <p className="text-sm font-mono font-semibold text-dl-forest">
              {apyEstimatePct !== null ? `+${usd(hourlyYieldUsdc)}` : '—'}
            </p>
          </div>
          <div className="border border-dl-border p-3">
            <p className="text-xs font-mono text-dl-gray uppercase mb-1">Per Day</p>
            <p className="text-sm font-mono font-semibold text-dl-forest">
              {apyEstimatePct !== null ? `+${usd(dailyYieldUsdc)}` : '—'}
            </p>
          </div>
          <div className="border border-dl-border p-3">
            <p className="text-xs font-mono text-dl-gray uppercase mb-1">Est. Annual</p>
            <p className="text-sm font-mono font-semibold text-dl-navy">
              {apyEstimatePct !== null ? usd(annualYieldUsdc) : '—'}
            </p>
          </div>
          <div className="border border-dl-border p-3">
            <p className="text-xs font-mono text-dl-gray uppercase mb-1">Time to Harvest</p>
            <p className="text-sm font-mono font-semibold text-dl-navy">
              {unrealizedYield >= MIN_HARVEST
                ? <span className="text-dl-forest">Ready now</span>
                : hoursToThreshold !== null
                  ? hoursToThreshold < 1
                    ? `~${Math.ceil(hoursToThreshold * 60)} min`
                    : hoursToThreshold < 48
                      ? `~${hoursToThreshold.toFixed(1)} hr`
                      : `~${(hoursToThreshold / 24).toFixed(1)} days`
                  : '—'}
            </p>
            {hoursToThreshold !== null && unrealizedYield < MIN_HARVEST && (
              <p className="text-xs font-mono text-dl-gray mt-1">
                {usd(remaining)} remaining
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleHarvest}
          disabled={busy || belowThreshold}
          className="px-5 py-2 text-xs font-mono uppercase tracking-wide bg-dl-forest text-white disabled:opacity-40"
          title={belowThreshold ? `Yield below $${MIN_HARVEST.toFixed(2)} minimum` : 'Harvest accrued Aave yield to vault'}
        >
          {busy ? 'Harvesting…' : 'Harvest Yield Now'}
        </button>
        {belowThreshold && !busy && (
          <p className="text-xs font-mono text-dl-gray">
            Accumulating — ${(MIN_HARVEST - unrealizedYield).toFixed(6)} more needed
          </p>
        )}
      </div>

      {/* Role note */}
      <p className="text-xs font-mono text-dl-gray border-l-2 border-dl-border pl-3">
        Requires STRATEGY_ADMIN role on-chain. Executes via SENTINEL_EXECUTOR_PRIVATE_KEY
        (or DEPLOYER_PRIVATE_KEY). Calls vault.harvest(aaveStrategy, USDC).
      </p>

      {/* Result */}
      {status && status.ok && (
        <div className="border border-dl-forest bg-green-50 p-3 text-xs font-mono text-dl-forest space-y-1">
          <p className="font-semibold">Harvest complete — {usd(status.yieldUsdc)} swept to vault</p>
          {status.txHash && (
            <a
              href={`https://arbiscan.io/tx/${status.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline block"
            >
              View on Arbiscan → {status.txHash.slice(0, 12)}…{status.txHash.slice(-6)}
            </a>
          )}
        </div>
      )}
      {status && !status.ok && status.skipped && (
        <div className="border border-yellow-300 bg-yellow-50 p-3 text-xs font-mono text-yellow-800">
          Skipped — {status.reason}
        </div>
      )}
      {status && !status.ok && !status.skipped && (
        <div className="border border-red-300 bg-red-50 p-3 text-xs font-mono text-red-700 break-all">
          {status.error}
        </div>
      )}
    </div>
  );
}

export default function TreasuryVaultPage({ summary, events, monthly, quarterly, ytd, loadError, nextCronRunAt }: Props) {
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

  // Live polling state — refreshed every 60 s from /api/treasury/vault/summary
  const [liveSummary, setLiveSummary] = useState<VaultSummary>(summary);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch('/api/treasury/vault/summary', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { success: boolean; data?: VaultSummary; error?: string };
        if (!cancelled && json.success && json.data) {
          setLiveSummary(json.data);
          setLastFetched(new Date());
          setPollError(null);
        } else if (!cancelled && !json.success) {
          setPollError(json.error ?? 'Refresh failed');
        }
      } catch (err: unknown) {
        if (!cancelled) setPollError(err instanceof Error ? err.message : 'Refresh failed');
      }
    }

    // First fetch immediately, then every 60 s
    poll();
    const interval = setInterval(poll, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

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
            <span className={`inline-block px-2 py-1 text-xs font-mono border ${liveSummary.isLive ? 'border-green-300 text-green-700 bg-green-50' : 'border-yellow-300 text-yellow-700 bg-yellow-50'}`}>
              {liveSummary.isLive ? 'LIVE' : 'OFFLINE / NOT DEPLOYED'}
            </span>
            {liveSummary.paused && (
              <span className="ml-2 inline-block px-2 py-1 text-xs font-mono border border-red-300 text-red-700 bg-red-50">PAUSED</span>
            )}
            <p className="text-xs text-dl-gray font-mono mt-1">Updated {new Date(liveSummary.lastUpdated).toLocaleTimeString()}</p>
          </div>
        </div>

        {loadError && (
          <div className="border border-dl-error bg-red-50 p-3 text-sm text-dl-error font-mono">{loadError}</div>
        )}

        {/* AUM + Live Rate Strip */}
        <section>
          <div className="flex items-baseline justify-between mb-3 border-b border-dl-border pb-1">
            <h2 className="font-serif text-lg text-dl-navy">Assets Under Management</h2>
            <span className="text-xs font-mono text-dl-gray">
              {pollError ? (
                <span className="text-red-600">Refresh error — {pollError}</span>
              ) : lastFetched ? (
                <>Auto-refreshed {lastFetched.toLocaleTimeString(undefined, { hour12: false })}</>
              ) : (
                'Refreshing…'
              )}
            </span>
          </div>

          {/* Primary AUM metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">Total AUM</p>
              <p className="font-mono text-2xl text-dl-navy mt-1">{usd(liveSummary.aumUsdc)}</p>
              <p className="text-xs text-dl-gray mt-1">Idle + deployed</p>
            </div>
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">Idle USDC</p>
              <p className="font-mono text-2xl text-dl-navy mt-1">{usd(liveSummary.idleUsdc)}</p>
              <p className="text-xs text-dl-gray mt-1">Held in vault, undeployed</p>
            </div>
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">In Aave v3</p>
              <p className="font-mono text-2xl text-dl-navy mt-1">{usd(liveSummary.aavePosition.currentValueUsdc)}</p>
              <p className="text-xs text-dl-gray mt-1">aUSDC position (principal + yield)</p>
            </div>
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">Accrued Yield</p>
              <p className={`font-mono text-2xl mt-1 ${liveSummary.aavePosition.unrealizedYieldUsdc > 0 ? 'text-dl-forest' : 'text-dl-navy'}`}>
                {liveSummary.aavePosition.unrealizedYieldUsdc >= 0 ? '+' : ''}{usd(liveSummary.aavePosition.unrealizedYieldUsdc)}
              </p>
              <p className="text-xs text-dl-gray mt-1">Unrealised Aave yield (since last harvest)</p>
            </div>
          </div>

          {/* APY strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-dl-forest p-4 bg-green-50">
              <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">Aave v3 USDC Supply APY</p>
              <p className="font-mono text-3xl text-dl-forest mt-1">
                {liveSummary.aavePosition.apyEstimatePct !== null
                  ? `${liveSummary.aavePosition.apyEstimatePct.toFixed(2)}%`
                  : '—'}
              </p>
              <p className="text-xs text-dl-gray mt-1">Live from Aave v3 Arbitrum · liquidityRate</p>
            </div>
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">Blended APY</p>
              <p className="font-mono text-3xl text-dl-navy mt-1">
                {liveSummary.blendedApyEstimatePct !== null
                  ? `${liveSummary.blendedApyEstimatePct.toFixed(2)}%`
                  : '—'}
              </p>
              <p className="text-xs text-dl-gray mt-1">Capital-weighted across active strategies</p>
            </div>
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">Total Deployed</p>
              <p className="font-mono text-3xl text-dl-navy mt-1">{usd(liveSummary.deployedUsdc)}</p>
              <p className="text-xs text-dl-gray mt-1">USDC across all strategies</p>
            </div>
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
                <th className="text-right py-2 pr-4">Live APY</th>
                <th className="text-right py-2 pr-4">Allocation %</th>
                <th className="text-right py-2">Last Rebalanced</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'Aave v3 (USDC)', pos: liveSummary.aavePosition },
                { key: 'Camelot (AXUSD/USDC)', pos: liveSummary.camelotPosition },
                { key: 'Euler v2 — USDC Theo', pos: liveSummary.eulerUsdcPosition },
                { key: 'Euler v2 — thBILL Theo', pos: liveSummary.eulerThbillPosition },
                { key: 'Euler v2 — WETH Arbitrum', pos: liveSummary.eulerWethPosition },
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
                  <td className="py-2 pr-4 text-right">
                    {pos.apyEstimatePct !== null
                      ? <span className="text-dl-forest font-semibold">{pos.apyEstimatePct.toFixed(2)}%</span>
                      : <span className="text-dl-gray">—</span>}
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
          <div className="flex items-baseline justify-between mb-3 border-b border-dl-border pb-1">
            <h2 className="font-serif text-lg text-dl-navy">Yield Harvested</h2>
            {liveSummary.lastHarvestedAt && (
              <span className="text-xs font-mono text-dl-gray">
                Last harvest: {new Date(liveSummary.lastHarvestedAt).toLocaleString()}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: 'This Month',  value: usd(monthly.harvestTotalUsdc),  count: monthly.harvestEventCount },
              { label: 'This Quarter', value: usd(quarterly.harvestTotalUsdc), count: quarterly.harvestEventCount },
              { label: 'Year to Date', value: usd(ytd.harvestTotalUsdc),      count: ytd.harvestEventCount },
              { label: 'Harvested Since Inception', value: usd(liveSummary.yieldHarvestedInceptionUsdc), count: null },
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

        {/* Harvest Yield */}
        <section>
          <h2 className="font-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-1">Harvest Aave Yield</h2>
          <p className="text-sm text-dl-gray mb-4">
            Sweeps accrued aUSDC yield (balance above principal) from the Aave v3 strategy back into the vault.
            Executed server-side via STRATEGY_ADMIN key — no wallet connection required.
          </p>
          <HarvestPanel
            lastHarvestedAt={liveSummary.lastHarvestedAt}
            unrealizedYield={liveSummary.aavePosition.unrealizedYieldUsdc}
            principalUsdc={liveSummary.aavePosition.principalUsdc}
            apyEstimatePct={liveSummary.aavePosition.apyEstimatePct}
            minHarvestThresholdUsdc={liveSummary.minHarvestThresholdUsdc}
          />
        </section>

        {/* Cron Harvest Schedule */}
        <section>
          <h2 className="font-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-1">Automated Harvest Schedule</h2>
          <p className="text-sm text-dl-gray mb-4">
            The vault automatically harvests Aave yield every 6 hours via a scheduled cron job
            (<code className="font-mono text-xs bg-gray-100 px-1">GET /api/cron/harvest-vault</code>).
            Auth: <code className="font-mono text-xs bg-gray-100 px-1">CRON_SECRET</code> or{' '}
            <code className="font-mono text-xs bg-gray-100 px-1">HARVEST_CRON_SECRET</code>.
            Minimum yield threshold: <span className="font-mono font-semibold">${liveSummary.minHarvestThresholdUsdc.toFixed(2)}</span>
            {' '}(env <code className="font-mono text-xs bg-gray-100 px-1">HARVEST_MIN_USDC</code>).
          </p>

          {/* Schedule info strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">Cron Schedule</p>
              <p className="font-mono text-base text-dl-navy mt-1">Every 6 hours</p>
              <p className="text-xs text-dl-gray mt-1 font-mono">0 */6 * * * (UTC)</p>
            </div>
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">Next Scheduled Harvest</p>
              <p className="font-mono text-base text-dl-navy mt-1">
                {new Date(nextCronRunAt).toLocaleString(undefined, { hour12: false })}
              </p>
              <p className="text-xs text-dl-gray mt-1 font-mono">{new Date(nextCronRunAt).toUTCString()}</p>
            </div>
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">Min Yield Threshold</p>
              <p className="font-mono text-base text-dl-navy mt-1">${liveSummary.minHarvestThresholdUsdc.toFixed(2)} USDC</p>
              <p className="text-xs text-dl-gray mt-1">Runs below threshold return skipped</p>
            </div>
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray font-mono uppercase tracking-wide">Last Cron Run</p>
              {liveSummary.cronRunHistory.length > 0 ? (
                <>
                  <p className="font-mono text-base text-dl-navy mt-1">
                    {new Date(liveSummary.cronRunHistory[0].startedAt).toLocaleString()}
                  </p>
                  <p className={`text-xs font-mono mt-1 ${
                    liveSummary.cronRunHistory[0].status === 'success' ? 'text-dl-forest' :
                    liveSummary.cronRunHistory[0].status === 'skipped' ? 'text-yellow-700' : 'text-red-600'
                  }`}>
                    {liveSummary.cronRunHistory[0].status.toUpperCase()}
                    {liveSummary.cronRunHistory[0].status === 'success' &&
                      ` — ${usd(liveSummary.cronRunHistory[0].yieldUsdc)} harvested`}
                  </p>
                </>
              ) : (
                <p className="font-mono text-base text-dl-gray mt-1">No runs recorded yet</p>
              )}
            </div>
          </div>

          {/* Run history table */}
          {liveSummary.cronRunHistory.length > 0 ? (
            <div>
              <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-2">Last {liveSummary.cronRunHistory.length} Cron Runs</p>
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-dl-border text-dl-gray uppercase">
                    <th className="text-left py-2 pr-3">Started</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-right py-2 pr-3">Yield</th>
                    <th className="text-right py-2 pr-3">Duration</th>
                    <th className="text-left py-2">Tx / Note</th>
                  </tr>
                </thead>
                <tbody>
                  {liveSummary.cronRunHistory.map((run) => (
                    <tr key={run.id} className="border-b border-dl-border hover:bg-gray-50">
                      <td className="py-2 pr-3 text-dl-gray">{new Date(run.startedAt).toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-1.5 py-0.5 border text-xs ${
                          run.status === 'success' ? 'border-green-300 text-green-700 bg-green-50' :
                          run.status === 'skipped' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                          'border-red-300 text-red-700 bg-red-50'
                        }`}>
                          {run.status}
                        </span>
                      </td>
                      <td className={`py-2 pr-3 text-right ${run.status === 'success' ? 'text-dl-forest' : 'text-dl-gray'}`}>
                        {run.status === 'success' ? usd(run.yieldUsdc) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right text-dl-gray">
                        {run.durationMs !== null ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="py-2 text-dl-gray max-w-xs truncate">
                        {run.txHash ? (
                          <a href={`https://arbiscan.io/tx/${run.txHash}`} target="_blank" rel="noopener noreferrer"
                            className="underline text-dl-forest">
                            {run.txHash.slice(0, 10)}…{run.txHash.slice(-6)}
                          </a>
                        ) : run.errorMessage ? (
                          <span className="text-red-600 truncate" title={run.errorMessage}>
                            {run.errorMessage.slice(0, 60)}{run.errorMessage.length > 60 ? '…' : ''}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-dl-border p-4 text-xs font-mono text-dl-gray">
              No cron run history yet. The first automated harvest will run at the next 6-hour interval.
              Ensure <code className="bg-gray-100 px-1">CRON_SECRET</code> (or <code className="bg-gray-100 px-1">HARVEST_CRON_SECRET</code>) and{' '}
              <code className="bg-gray-100 px-1">SENTINEL_EXECUTOR_PRIVATE_KEY</code> are configured.
            </div>
          )}
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

          {/* Server-side deposit — primary flow (deployer key, VAULT_ADMIN role) */}
          <ServerDepositPanel />

          {/* Wallet deposit — deployer wallet holds VAULT_ADMIN and can use this path */}
          <WalletDepositPanel />

          {/* Allocate idle USDC into Aave v3 for yield — STRATEGY_ADMIN only */}
          <AllocateToAavePanel />

          {/* ── Euler v2 allocation panels — STRATEGY_ADMIN only ─────────── */}
          <AllocateToEulerPanel
            label="Euler v2 — USDC Theo Market"
            marketDesc="K3 Capital Theo cluster, eUSDC-5"
            apyLabel="~13.11%"
            strategyAddress={EULER_USDC_STRATEGY_ADDRESS}
            assetAddress={USDC_ADDRESS}
            assetSymbol="USDC"
            assetDecimals={6}
          />
          <AllocateToEulerPanel
            label="Euler v2 — thBILL Theo Market"
            marketDesc="K3 Capital Theo cluster, ethBILL-2 (tokenised T-bill)"
            apyLabel="~15.31%"
            strategyAddress={EULER_THBILL_STRATEGY_ADDRESS}
            assetAddress={THBILL_ADDRESS}
            assetSymbol="thBILL"
            assetDecimals={6}
          />
          <AllocateToEulerPanel
            label="Euler v2 — WETH Arbitrum Market"
            marketDesc="K3 Capital Arbitrum cluster, eWETH-1"
            apyLabel="~15.98%"
            strategyAddress={EULER_WETH_STRATEGY_ADDRESS}
            assetAddress={WETH_ADDRESS}
            assetSymbol="WETH"
            assetDecimals={18}
          />

          {/* Genesis reserve backing — USDC deposits against the 10,000 genesis mint */}
          <UsdcBackingPanel />

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
