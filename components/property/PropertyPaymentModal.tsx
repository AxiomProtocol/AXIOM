/**
 * Property Analysis report payment modal.
 *
 * Two parallel payment options (task #403):
 *   1. Pay with AXUSD on Arbitrum One (default when a wallet is connected)
 *   2. Pay with card via Stripe Checkout (default when no wallet is connected)
 *
 * Both paths write to the same `property_reports` table and converge on
 * the same `/property/reports/{id}` receipt + report page. Wagmi is
 * browser-only, so this component must be loaded via next/dynamic with
 * ssr:false.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
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

type PayMethod = 'axusd' | 'card';

type Phase =
  | 'idle'
  | 'creating-intent'
  | 'awaiting-signature'
  | 'broadcasting'
  | 'confirming'
  | 'verifying'
  | 'card-creating'
  | 'card-redirecting'
  | 'card-polling'
  | 'generating'
  | 'done'
  | 'error';

const PRICE_LABELS: Record<'base' | 'premium', string> = {
  base: '$4.99',
  premium: '$14.99',
};

export default function PropertyPaymentModal({ payload, onClose }: Props) {
  const { address, isConnected, chain } = useAccount();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string>('');
  const [reportId, setReportId] = useState<string>('');
  const [instruction, setInstruction] = useState<PaymentInstruction | null>(null);

  // Pay-method picker. Defaults to AXUSD when a wallet is connected; if
  // no wallet, defaults to card so the buyer isn't dead-ended.
  const [method, setMethod] = useState<PayMethod>(isConnected ? 'axusd' : 'card');
  useEffect(() => {
    // If wallet connection state flips while the modal is open, nudge
    // the default method but don't override an explicit user pick once
    // they've started a flow.
    if (phase !== 'idle') return;
    setMethod(isConnected ? 'axusd' : 'card');
  }, [isConnected, phase]);

  // Card-flow state.
  const [cardCheckoutUrl, setCardCheckoutUrl] = useState<string>('');
  // HMAC access token returned by /api/property/create-checkout. The
  // poll endpoint requires this; the report UUID alone is not enough.
  const [cardAccessToken, setCardAccessToken] = useState<string>('');
  const cardWindowRef = useRef<Window | null>(null);
  const cardPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // 1. AXUSD path: as soon as we have a payload + wallet + axusd method,
  //    ask the server for an on-chain payment intent.
  useEffect(() => {
    if (!payload || !address) return;
    if (method !== 'axusd') return;
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
  }, [payload, address, instruction, phase, method]);

  // 2. Watch wagmi write hooks and progress the AXUSD phase machine.
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

  // 3. AXUSD path: once mined, hand the hash to the server.
  useEffect(() => {
    if (!txMined || !txHash || !reportId) return;
    if (method !== 'axusd') return;
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
        setTimeout(() => {
          window.location.href = `/property/reports/${reportId}`;
        }, 800);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Verification failed.');
        setPhase('error');
      });
  }, [txMined, txHash, reportId, method]);

  // 4. Card path polling — once we've handed the buyer to Stripe, poll
  //    /checkout-status until the webhook flips the row off `pending`.
  //    Sends the HMAC access token returned at session-create time so
  //    the report UUID alone is not a status oracle (review fix).
  useEffect(() => {
    if (phase !== 'card-polling' || !reportId || !cardAccessToken) return;

    let cancelled = false;
    async function poll() {
      try {
        const url = `/api/property/checkout-status?reportId=${encodeURIComponent(reportId)}&token=${encodeURIComponent(cardAccessToken)}`;
        const r = await fetch(url);
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(data.error || 'Could not check payment status.');
          setPhase('error');
          return;
        }
        if (data.status === 'ready') {
          setPhase('generating');
          setTimeout(() => {
            window.location.href = `/property/reports/${reportId}`;
          }, 600);
          return;
        }
        if (data.status === 'failed') {
          setError('Report generation failed after payment. Please contact support.');
          setPhase('error');
          return;
        }
        // Still pending / paid / generating — keep polling.
        cardPollTimerRef.current = setTimeout(poll, 2500);
      } catch {
        if (cancelled) return;
        // Transient network blip — keep polling, don't bail.
        cardPollTimerRef.current = setTimeout(poll, 4000);
      }
    }
    poll();

    return () => {
      cancelled = true;
      if (cardPollTimerRef.current) {
        clearTimeout(cardPollTimerRef.current);
        cardPollTimerRef.current = null;
      }
    };
  }, [phase, reportId, cardAccessToken]);

  // Clean up the popup window ref on unmount.
  useEffect(() => () => {
    if (cardPollTimerRef.current) clearTimeout(cardPollTimerRef.current);
  }, []);

  const tierLabel = payload?.tier === 'premium' ? 'Premium Report' : 'Base Report';
  const tierPrice = payload ? PRICE_LABELS[payload.tier] : '';

  const canPayAxusd = useMemo(
    () => phase === 'idle' && !!instruction && !!address && !wrongChain,
    [phase, instruction, address, wrongChain],
  );

  function handlePayAxusd() {
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

  async function handlePayCard() {
    if (!payload) return;
    // If we already have a checkout URL for this session, just refocus
    // the existing tab (or reopen if it was closed).
    if (cardCheckoutUrl && reportId) {
      setError('');
      setPhase('card-polling');
      try {
        if (cardWindowRef.current && !cardWindowRef.current.closed) {
          cardWindowRef.current.focus();
        } else {
          cardWindowRef.current = window.open(cardCheckoutUrl, '_blank', 'noopener');
        }
      } catch {
        // Popup blocked — fall through to in-tab navigation.
        window.location.href = cardCheckoutUrl;
      }
      return;
    }

    setError('');
    setPhase('card-creating');
    try {
      const r = await fetch('/api/property/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: payload.address,
          tier: payload.tier,
          sqft: payload.sqft,
          bedrooms: payload.bedrooms,
          bathrooms: payload.bathrooms,
          yearBuilt: payload.yearBuilt,
          propertyType: payload.propertyType,
          email: payload.email,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(data.message || data.error || 'Could not start card checkout.');
      }
      setReportId(data.reportId);
      setCardCheckoutUrl(data.checkoutUrl);
      setCardAccessToken(data.accessToken || '');
      setPhase('card-redirecting');
      // Briefly show "redirecting" so the buyer sees what's happening,
      // then open Stripe Checkout in a new tab and start polling.
      setTimeout(() => {
        try {
          cardWindowRef.current = window.open(data.checkoutUrl, '_blank', 'noopener');
          if (!cardWindowRef.current) {
            // Popup blocked — fall back to same-tab nav.
            window.location.href = data.checkoutUrl;
            return;
          }
        } catch {
          window.location.href = data.checkoutUrl;
          return;
        }
        setPhase('card-polling');
      }, 400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Card checkout failed.');
      setPhase('error');
    }
  }

  function handleRetry() {
    setError('');
    resetWrite();
    setCardCheckoutUrl('');
    setCardAccessToken('');
    setReportId('');
    setInstruction(null);
    if (cardPollTimerRef.current) {
      clearTimeout(cardPollTimerRef.current);
      cardPollTimerRef.current = null;
    }
    setPhase('idle');
  }

  if (!payload) return null;

  const inFlight =
    phase === 'awaiting-signature' ||
    phase === 'confirming' ||
    phase === 'verifying' ||
    phase === 'card-creating' ||
    phase === 'card-redirecting' ||
    phase === 'card-polling' ||
    phase === 'generating';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg bg-white border border-dl-border">
        <div className="flex items-start justify-between border-b border-dl-border px-5 py-4">
          <div>
            <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-widest">
              Choose Payment · {tierPrice}
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
          {/* Method picker */}
          <div className="grid grid-cols-2 gap-2">
            <MethodTab
              active={method === 'axusd'}
              onClick={() => { if (!inFlight) { setMethod('axusd'); setError(''); } }}
              disabled={inFlight}
              label="Pay with AXUSD"
              sub="Arbitrum One"
              recommended={isConnected}
            />
            <MethodTab
              active={method === 'card'}
              onClick={() => { if (!inFlight) { setMethod('card'); setError(''); } }}
              disabled={inFlight}
              label="Pay with card"
              sub="Stripe Checkout"
              recommended={!isConnected}
            />
          </div>

          {method === 'axusd' && (
            <>
              {!isConnected && (
                <div className="border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-800 font-dl-mono">
                  Connect a wallet on Arbitrum One (top-right of the page) to pay in AXUSD,
                  or switch to "Pay with card" to use Stripe Checkout.
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
            </>
          )}

          {method === 'card' && (
            <>
              <div className="border border-dl-border p-4 space-y-2 font-dl-mono text-xs">
                <Row label="Amount" value={tierPrice} bold />
                <Row label="Method" value="Card via Stripe Checkout" />
                <Row label="Currency" value="USD" />
              </div>
              <div className="text-xs text-dl-gray leading-relaxed">
                Stripe will open in a new tab. After your card is charged, this
                window will detect payment and load your report automatically.
              </div>
            </>
          )}

          {error && (
            <div className="border border-red-300 bg-red-50 p-3 text-xs text-red-800 font-dl-mono">
              {error}
            </div>
          )}

          <PhaseBanner phase={phase} txHash={txHash ?? null} method={method} />

          <div className="flex gap-3 pt-2">
            {phase === 'error' ? (
              <button
                type="button"
                onClick={handleRetry}
                className="flex-1 py-3 min-h-[44px] text-sm font-dl-mono border border-dl-navy text-dl-navy hover:bg-dl-navy hover:text-white"
              >
                Try Again
              </button>
            ) : method === 'axusd' ? (
              <button
                type="button"
                onClick={handlePayAxusd}
                disabled={!canPayAxusd}
                className={`flex-1 py-3 min-h-[44px] text-sm font-dl-mono border border-dl-navy ${
                  canPayAxusd
                    ? 'bg-dl-navy text-white hover:bg-opacity-90'
                    : 'bg-dl-navy text-white opacity-50 cursor-not-allowed'
                }`}
              >
                {phase === 'idle' && instruction
                  ? `Pay ${instruction.amountUsd} AXUSD`
                  : phaseLabel(phase)}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePayCard}
                disabled={inFlight}
                className={`flex-1 py-3 min-h-[44px] text-sm font-dl-mono border border-dl-navy ${
                  inFlight
                    ? 'bg-dl-navy text-white opacity-50 cursor-not-allowed'
                    : 'bg-dl-navy text-white hover:bg-opacity-90'
                }`}
              >
                {phase === 'card-polling' && cardCheckoutUrl
                  ? 'Reopen Stripe Checkout'
                  : phase === 'idle' || phase === 'creating-intent'
                    ? `Pay ${tierPrice} with card`
                    : phaseLabel(phase)}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={inFlight}
              className="px-4 py-3 min-h-[44px] text-sm font-dl-mono border border-dl-border text-dl-gray hover:text-dl-navy disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>

          {txHash && method === 'axusd' && (
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

function MethodTab({
  active, onClick, disabled, label, sub, recommended,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  label: string;
  sub: string;
  recommended: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-left px-3 py-3 border min-h-[60px] ${
        active
          ? 'border-dl-navy bg-dl-navy text-white'
          : 'border-dl-border bg-white text-dl-navy hover:border-dl-navy'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-dl-mono text-xs uppercase tracking-wider">{label}</span>
        {recommended && (
          <span className={`text-[9px] font-dl-mono uppercase px-1 ${
            active ? 'bg-white text-dl-navy' : 'bg-dl-navy text-white'
          }`}>
            Recommended
          </span>
        )}
      </div>
      <div className={`text-[11px] font-dl-mono mt-1 ${active ? 'text-white/80' : 'text-dl-gray'}`}>
        {sub}
      </div>
    </button>
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

function PhaseBanner({ phase, txHash, method }: { phase: Phase; txHash: string | null; method: PayMethod }) {
  if (phase === 'idle' || phase === 'error') return null;
  return (
    <div className="border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 font-dl-mono">
      {phaseLabel(phase)}
      {(phase === 'confirming' || phase === 'verifying') && txHash && method === 'axusd' && (
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
    case 'card-creating': return 'Opening Stripe Checkout…';
    case 'card-redirecting': return 'Redirecting to Stripe…';
    case 'card-polling': return 'Waiting for card payment to complete…';
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
