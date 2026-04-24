/**
 * Task #230 — On-chain AXUSD payment modal for paid Property Analysis reports.
 * Replaces the prior Stripe Checkout redirect.
 *
 * Wagmi is browser-only, so this component must be loaded via next/dynamic
 * with ssr:false from any page that wants to render it.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

interface FormPayload {
  address: string;
  tier: 'base' | 'premium';
  sqft?: string;
  bedrooms?: string;
  bathrooms?: string;
  yearBuilt?: string;
  propertyType?: string;
  email?: string;
}

interface PaymentInstruction {
  chainId: number;
  token: `0x${string}`;
  recipient: `0x${string}`;
  amountUsd: string;
  amountTokenUnits: string;
  decimals: number;
  symbol: 'AXUSD';
}

interface Props {
  payload: FormPayload | null;
  onClose: () => void;
}

type Phase =
  | 'idle'
  | 'creating-intent'
  | 'awaiting-signature'
  | 'broadcasting'
  | 'confirming'
  | 'verifying'
  | 'generating'
  | 'done'
  | 'error';

export default function PropertyPaymentModal({ payload, onClose }: Props) {
  const { address, isConnected, chain } = useAccount();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string>('');
  const [reportId, setReportId] = useState<string>('');
  const [instruction, setInstruction] = useState<PaymentInstruction | null>(null);

  const {
    writeContract,
    data: txHash,
    isPending: walletPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isSuccess: txMined, isLoading: txWaiting, error: txError } =
    useWaitForTransactionReceipt({ hash: txHash });

  const expectedChainId = instruction?.chainId ?? 42161;
  const wrongChain = isConnected && chain && chain.id !== expectedChainId;

  // 1. As soon as we have a payload + wallet, ask the server for an intent.
  useEffect(() => {
    if (!payload || !address) return;
    if (instruction || phase !== 'idle') return;
    setPhase('creating-intent');
    setError('');
    fetch('/api/property/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, wallet: address }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to create payment intent.');
        setReportId(data.reportId);
        setInstruction(data.payment);
        setPhase('idle');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPhase('error');
      });
  }, [payload, address, instruction, phase]);

  // 2. Watch the wallet write hooks and progress the phase machine.
  useEffect(() => {
    if (walletPending) setPhase('awaiting-signature');
  }, [walletPending]);

  useEffect(() => {
    if (txHash && !txMined) setPhase('confirming');
  }, [txHash, txMined]);

  useEffect(() => {
    if (writeError) {
      setError(parseWalletError(writeError));
      setPhase('error');
    }
  }, [writeError]);

  useEffect(() => {
    if (txError) {
      setError(parseWalletError(txError));
      setPhase('error');
    }
  }, [txError]);

  // 3. Once the on-chain transfer is mined, hand the hash to the server.
  useEffect(() => {
    if (!txMined || !txHash || !reportId) return;
    setPhase('verifying');
    fetch('/api/property/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, txHash }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Server could not verify the payment.');
        setPhase('generating');
        // Brief pause so the user reads the status, then jump to the report.
        setTimeout(() => {
          window.location.href = `/property/reports/${reportId}`;
        }, 800);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Verification failed.');
        setPhase('error');
      });
  }, [txMined, txHash, reportId]);

  const tierLabel = payload?.tier === 'premium' ? 'Premium Report' : 'Base Report';

  const canPay = useMemo(
    () => phase === 'idle' && !!instruction && !!address && !wrongChain,
    [phase, instruction, address, wrongChain],
  );

  function handlePay() {
    if (!instruction) return;
    setError('');
    writeContract({
      address: instruction.token,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [
        instruction.recipient,
        parseUnits(instruction.amountUsd, instruction.decimals),
      ],
    });
  }

  function handleRetry() {
    setError('');
    resetWrite();
    setPhase('idle');
  }

  if (!payload) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg bg-white border border-dl-border">
        <div className="flex items-start justify-between border-b border-dl-border px-5 py-4">
          <div>
            <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest">
              Pay With AXUSD · Arbitrum One
            </p>
            <h2 className="font-dl-serif text-lg text-dl-navy mt-1">{tierLabel}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-dl-gray text-sm font-dl-mono hover:text-dl-navy"
            aria-label="Close payment dialog"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 text-sm text-dl-navy">
          {!isConnected && (
            <div className="border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-800 font-dl-mono">
              Connect a wallet on Arbitrum One (top-right of the page) to continue.
              Reports are paid in AXUSD — no Stripe, no card.
            </div>
          )}

          {wrongChain && (
            <div className="border border-red-300 bg-red-50 p-3 text-xs text-red-800 font-dl-mono">
              Wrong network. Switch your wallet to Arbitrum One (chain id {expectedChainId}).
            </div>
          )}

          {instruction && (
            <div className="border border-dl-border p-4 space-y-2 font-dl-mono text-xs">
              <Row label="Amount" value={`${instruction.amountUsd} AXUSD`} bold />
              <Row label="Token" value={shortAddress(instruction.token)} />
              <Row label="Recipient" value={shortAddress(instruction.recipient)} />
              <Row label="Network" value={`Arbitrum One (${instruction.chainId})`} />
              {address && <Row label="From" value={shortAddress(address)} />}
            </div>
          )}

          <div className="text-xs text-dl-gray leading-relaxed">
            Need AXUSD? <a href="/onramp" className="underline text-dl-navy">Buy with a card via Coinbase
            and convert 1:1 in the Onramp.</a>
          </div>

          {error && (
            <div className="border border-red-300 bg-red-50 p-3 text-xs text-red-800 font-dl-mono">
              {error}
            </div>
          )}

          <PhaseBanner phase={phase} txHash={txHash ?? null} />

          <div className="flex gap-3 pt-2">
            {phase === 'error' ? (
              <button
                type="button"
                onClick={handleRetry}
                className="flex-1 py-3 min-h-[44px] text-sm font-dl-mono border border-dl-navy text-dl-navy hover:bg-dl-navy hover:text-white"
              >
                Try Again
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePay}
                disabled={!canPay}
                className={`flex-1 py-3 min-h-[44px] text-sm font-dl-mono border border-dl-navy ${
                  canPay
                    ? 'bg-dl-navy text-white hover:bg-opacity-90'
                    : 'bg-dl-navy text-white opacity-50 cursor-not-allowed'
                }`}
              >
                {phase === 'idle' && instruction
                  ? `Pay ${instruction.amountUsd} AXUSD`
                  : phaseLabel(phase)}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={
                phase === 'awaiting-signature'
                || phase === 'confirming'
                || phase === 'verifying'
                || phase === 'generating'
              }
              className="px-4 py-3 min-h-[44px] text-sm font-dl-mono border border-dl-border text-dl-gray hover:text-dl-navy disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>

          {txHash && (
            <p className="text-[10px] font-dl-mono text-dl-gray break-all pt-2 border-t border-dl-border">
              tx: <a
                href={`https://arbiscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-dl-navy"
              >{txHash}</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-dl-gray uppercase tracking-wide">{label}</span>
      <span className={bold ? 'text-dl-navy font-bold' : 'text-dl-navy'}>{value}</span>
    </div>
  );
}

function PhaseBanner({ phase, txHash }: { phase: Phase; txHash: string | null }) {
  if (phase === 'idle' || phase === 'error') return null;
  return (
    <div className="border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 font-dl-mono">
      {phaseLabel(phase)}
      {(phase === 'confirming' || phase === 'verifying') && txHash && (
        <span className="block mt-1 text-[10px] break-all">{txHash}</span>
      )}
    </div>
  );
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'creating-intent': return 'Preparing payment…';
    case 'awaiting-signature': return 'Confirm in your wallet…';
    case 'broadcasting': return 'Broadcasting transaction…';
    case 'confirming': return 'Waiting for on-chain confirmation…';
    case 'verifying': return 'Verifying payment on-chain…';
    case 'generating': return 'Payment confirmed — generating your report…';
    case 'done': return 'Done';
    default: return 'Working…';
  }
}

function shortAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function parseWalletError(err: Error): string {
  const msg = err.message || '';
  if (/user rejected|user denied|rejected the request/i.test(msg)) return 'Transaction cancelled in wallet.';
  if (/insufficient funds/i.test(msg)) return 'Insufficient ETH for gas on Arbitrum One.';
  if (/transfer amount exceeds balance/i.test(msg)) return 'Insufficient AXUSD balance to pay for this report.';
  return msg.split('(')[0].trim().slice(0, 160) || 'Wallet error.';
}
