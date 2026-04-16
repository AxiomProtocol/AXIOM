'use client';

import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

const ARBITRUM_CHAIN_ID = 42161;
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as `0x${string}`;
const PSM_ADDRESS = '0x5db58d9c21369d1532a48Bdd658E4Fe415404922' as `0x${string}`;

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

const PSM_ABI = [
  {
    name: 'swapCollateralForAXUSD',
    type: 'function',
    inputs: [{ name: 'collateralAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
] as const;

type Destination = 'USDC' | 'AXUSD' | 'AXAU';

const DESTINATIONS: { id: Destination; label: string; desc: string }[] = [
  {
    id: 'USDC',
    label: 'USDC',
    desc: 'Receive stable dollars on Arbitrum One. No further steps required.',
  },
  {
    id: 'AXUSD',
    label: 'AXUSD',
    desc: 'Axiom Protocol stablecoin. Converted 1:1 from USDC via the Peg Stability Module.',
  },
  {
    id: 'AXAU',
    label: 'AXAU',
    desc: 'Reserve instrument backed by gold and land NAV. Requires identity verification.',
  },
];

interface PurchaseIntent {
  id: number;
  intentId: string;
  asset: string;
  fiatCurrency: string;
  fiatAmount: string;
  chainId: number;
  status: string;
  createdAt: string;
}

interface OnrampConfig {
  configured: boolean;
}

interface AXAUQuote {
  axauOut: number;
  axauOutFormatted: string;
  mintNavPerToken: string;
  xauUsdPrice: string;
  mintPaused: boolean;
  oracleStale: boolean;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseContractError(err: Error): string {
  const msg = err.message;

  const revertMatch = msg.match(/execution reverted[:\s]*["']?([^"'(]+)["']?/i);
  if (revertMatch) {
    const reason = revertMatch[1].trim();
    if (/transfer amount exceeds balance/i.test(reason))
      return 'Insufficient USDC balance. Complete Step 1 to acquire USDC first.';
    if (/insufficient allowance/i.test(reason))
      return 'Allowance too low. Approve USDC before swapping.';
    if (/transfer amount exceeds allowance/i.test(reason))
      return 'Allowance too low. Approve USDC before swapping.';
    return reason.length < 120 ? reason : reason.slice(0, 120) + '…';
  }
  if (/user rejected|user denied|rejected the request/i.test(msg))
    return 'Transaction cancelled.';
  if (/insufficient funds/i.test(msg))
    return 'Insufficient ETH for gas fees on Arbitrum One.';
  if (/network/i.test(msg) && /switch/i.test(msg))
    return 'Wrong network — switch to Arbitrum One in your wallet.';
  return msg.split('(')[0].trim().slice(0, 120) || 'Transaction failed.';
}

function StepBadge({ n, done, active }: { n: number; done: boolean; active: boolean }) {
  return (
    <div
      className={`w-6 h-6 border flex items-center justify-center text-xs font-dl-mono shrink-0 ${
        done
          ? 'border-dl-forest bg-dl-forest text-white'
          : active
          ? 'border-dl-navy bg-dl-navy text-white'
          : 'border-dl-border text-dl-gray'
      }`}
    >
      {done ? '✓' : n}
    </div>
  );
}

export default function OnrampPage() {
  const { address, isConnected, chain } = useAccount();

  const [destination, setDestination] = useState<Destination>('USDC');
  const [fiatAmount, setFiatAmount] = useState('100');
  const [onrampConfig, setOnrampConfig] = useState<OnrampConfig | null>(null);

  const [launching, setLaunching] = useState(false);
  const [coinbaseDone, setCoinbaseDone] = useState(false);

  const [usdcToConvert, setUsdcToConvert] = useState('');
  const [psmDone, setPsmDone] = useState(false);
  const [psmError, setPsmError] = useState<string | null>(null);

  const [axauQuote, setAxauQuote] = useState<AXAUQuote | null>(null);
  const [axauQuoteLoading, setAxauQuoteLoading] = useState(false);
  const [axauEmail, setAxauEmail] = useState('');
  const [axauSubmitting, setAxauSubmitting] = useState(false);
  const [axauRequestDone, setAxauRequestDone] = useState(false);
  const [axauRequestId, setAxauRequestId] = useState<number | null>(null);
  const [axauError, setAxauError] = useState<string | null>(null);

  const [intents, setIntents] = useState<PurchaseIntent[]>([]);
  const [intentsLoading, setIntentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const psmEnabled = !!address && coinbaseDone && destination !== 'USDC';
  const axauEnabled = destination === 'AXAU' && psmDone;

  const { data: usdcBalanceRaw, refetch: refetchUsdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARBITRUM_CHAIN_ID,
    query: { enabled: !!address && coinbaseDone },
  });

  const { data: usdcAllowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, PSM_ADDRESS] : undefined,
    chainId: ARBITRUM_CHAIN_ID,
    query: { enabled: psmEnabled },
  });

  const {
    writeContract: approveUsdc,
    data: approveTxHash,
    isPending: approveIsPending,
    error: approveWriteError,
  } = useWriteContract();

  const { isSuccess: approveSuccess, isLoading: approveTxLoading } =
    useWaitForTransactionReceipt({ hash: approveTxHash });

  const {
    writeContract: psmSwap,
    data: psmTxHash,
    isPending: psmIsPending,
    error: psmWriteError,
  } = useWriteContract();

  const { isSuccess: psmTxSuccess, isLoading: psmTxLoading } =
    useWaitForTransactionReceipt({ hash: psmTxHash });

  const usdcBalance =
    usdcBalanceRaw !== undefined ? formatUnits(usdcBalanceRaw as bigint, 6) : null;
  const usdcAllowance =
    usdcAllowanceRaw !== undefined ? (usdcAllowanceRaw as bigint) : 0n;

  const convertAmountWei =
    usdcToConvert && !isNaN(parseFloat(usdcToConvert)) && parseFloat(usdcToConvert) > 0
      ? parseUnits(parseFloat(usdcToConvert).toFixed(6), 6)
      : 0n;

  const needsApproval = convertAmountWei > 0n && usdcAllowance < convertAmountWei;

  useEffect(() => {
    if (approveSuccess) refetchAllowance();
  }, [approveSuccess, refetchAllowance]);

  useEffect(() => {
    if (psmTxSuccess) {
      setPsmDone(true);
      refetchUsdcBalance();
    }
  }, [psmTxSuccess, refetchUsdcBalance]);

  useEffect(() => {
    if (usdcBalance && !usdcToConvert) {
      const bal = parseFloat(usdcBalance);
      if (bal > 0) setUsdcToConvert(bal.toFixed(2));
    }
  }, [usdcBalance, usdcToConvert]);

  useEffect(() => {
    if (approveWriteError)
      setPsmError(parseContractError(approveWriteError));
  }, [approveWriteError]);

  useEffect(() => {
    if (psmWriteError)
      setPsmError(parseContractError(psmWriteError));
  }, [psmWriteError]);

  useEffect(() => {
    if (destination === 'AXAU' && psmDone && usdcToConvert && parseFloat(usdcToConvert) > 0) {
      setAxauQuoteLoading(true);
      setAxauQuote(null);
      setAxauError(null);
      fetch(`/api/axau/buy-quote?axusdAmount=${encodeURIComponent(usdcToConvert)}`)
        .then(r => r.json() as Promise<AXAUQuote & { error?: string }>)
        .then(data => {
          if (data.error) { setAxauError(data.error); return; }
          if (data.oracleStale) { setAxauError('Oracle price stale. Please try again shortly.'); return; }
          if (data.mintPaused) { setAxauError('AXAU mint is currently paused.'); return; }
          setAxauQuote(data);
        })
        .catch(() => setAxauError('Unable to fetch AXAU quote. Check your connection.'))
        .finally(() => setAxauQuoteLoading(false));
    }
  }, [destination, psmDone, usdcToConvert]);

  useEffect(() => {
    fetch('/api/onramp/config')
      .then(r => r.json() as Promise<OnrampConfig>)
      .then(setOnrampConfig)
      .catch(() => setOnrampConfig({ configured: false }));
  }, []);

  const loadHistory = useCallback(async () => {
    if (!address) return;
    setIntentsLoading(true);
    try {
      const res = await fetch(`/api/onramp/history?wallet=${address}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json() as { intents: PurchaseIntent[] };
        setIntents(data.intents ?? []);
      }
    } catch {
    } finally {
      setIntentsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected) loadHistory();
  }, [isConnected, loadHistory]);

  async function handleLaunchCoinbase() {
    if (!address) return;
    setLaunching(true);
    setError(null);

    try {
      const intentRes = await fetch('/api/onramp/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          asset: 'USDC',
          fiatAmount: parseFloat(fiatAmount) || 100,
          fiatCurrency: 'USD',
          chainId: ARBITRUM_CHAIN_ID,
          flow: 'buy',
        }),
      });

      if (!intentRes.ok) {
        const errData = await intentRes.json() as { error?: string };
        throw new Error(errData.error ?? 'Failed to create intent');
      }

      const { widgetUrl } = await intentRes.json() as { widgetUrl: string | null };
      if (!widgetUrl) throw new Error('No session URL returned from server');

      const popup = window.open(
        widgetUrl,
        'coinbase-onramp',
        'width=600,height=700,popup=yes,noopener=no'
      );

      setLaunching(false);

      if (!popup) {
        setError('Popup blocked — please allow popups for this site and try again.');
        return;
      }

      const poll = setInterval(() => {
        if (popup.closed) {
          clearInterval(poll);
          setCoinbaseDone(true);
          loadHistory();
          setTimeout(() => refetchUsdcBalance(), 3000);
        }
      }, 600);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLaunching(false);
    }
  }

  function handleApprove() {
    if (!address || convertAmountWei === 0n) return;
    const amount = parseFloat(usdcToConvert) || 0;
    const balance = parseFloat(usdcBalance ?? '0');
    if (amount > balance) {
      setPsmError(`Insufficient USDC balance. You have ${balance.toFixed(4)} USDC but are trying to convert ${amount.toFixed(4)} USDC.`);
      return;
    }
    setPsmError(null);
    approveUsdc({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [PSM_ADDRESS, maxUint256],
    });
  }

  function handlePsmSwap() {
    if (!address || convertAmountWei === 0n) return;
    const amount = parseFloat(usdcToConvert) || 0;
    const balance = parseFloat(usdcBalance ?? '0');
    if (amount > balance) {
      setPsmError(`Insufficient USDC balance. You have ${balance.toFixed(4)} USDC but are trying to convert ${amount.toFixed(4)} USDC.`);
      return;
    }
    setPsmError(null);
    psmSwap({
      address: PSM_ADDRESS,
      abi: PSM_ABI,
      functionName: 'swapCollateralForAXUSD',
      args: [convertAmountWei],
    });
  }

  async function handleAxauSubmit() {
    if (!address || !axauQuote) return;
    setAxauSubmitting(true);
    setAxauError(null);

    try {
      const res = await fetch('/api/axau/purchase-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          email: axauEmail || undefined,
          axusdAmount: usdcToConvert,
          axauQuoted: axauQuote.axauOutFormatted,
          xauUsdPrice: axauQuote.xauUsdPrice,
        }),
      });

      const data = await res.json() as {
        success?: boolean;
        data?: { id: number };
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        const msg =
          data.code === 'IDENTITY_NOT_VERIFIED'
            ? 'Identity verification required. Complete your ERC-3643 identity credential before purchasing AXAU.'
            : data.code === 'PENDING_LIMIT_REACHED'
            ? 'You have too many pending requests. Wait for existing requests to process.'
            : (data.error ?? 'Failed to submit request');
        throw new Error(msg);
      }

      setAxauRequestDone(true);
      setAxauRequestId(data.data?.id ?? null);
    } catch (err: unknown) {
      setAxauError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAxauSubmitting(false);
    }
  }

  function resetFlow() {
    setCoinbaseDone(false);
    setPsmDone(false);
    setUsdcToConvert('');
    setPsmError(null);
    setAxauQuote(null);
    setAxauRequestDone(false);
    setAxauRequestId(null);
    setAxauError(null);
    setError(null);
  }

  const isWrongChain = isConnected && chain && chain.id !== ARBITRUM_CHAIN_ID;

  const step1Done = coinbaseDone;
  const step2Active = coinbaseDone && destination !== 'USDC';
  const step2Done = psmDone;
  const step3Active = axauEnabled;

  return (
    <DesignLawLayout>
      <Head>
        <title>Capital Stack Entry | Axiom Protocol</title>
      </Head>

      <SectionHeading
        title="Capital Stack Entry"
        subtitle="Your guided path from US dollars into the Axiom capital stack — powered by Coinbase"
      />

      {/* ── Cinematic Hero Banner ────────────────────────────────────────────── */}
      <div className="mt-6 relative overflow-hidden border border-dl-border" style={{ height: '320px' }}>
        <img
          src="/images/coinbase/onramp-hero.png"
          alt="Capital Stack Entry — powered by Coinbase"
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 30%' }}
        />
        <div
          className="absolute inset-0 flex flex-col justify-end p-8"
          style={{ background: 'linear-gradient(to top, rgba(30,58,95,0.92) 0%, rgba(30,58,95,0.45) 60%, transparent 100%)' }}
        >
          <p className="text-xs font-dl-mono text-blue-200 uppercase tracking-widest mb-1">Powered by Coinbase Developer Platform</p>
          <p className="text-2xl font-bold text-white font-dl-serif leading-tight">
            From fiat to the capital stack —<br />in three guided steps.
          </p>
          <p className="text-sm text-blue-100 font-dl-mono mt-2 max-w-xl">
            Buy USDC with your card. Convert to AXUSD at 1:1 via the Peg Stability Module. Acquire AXAU, the reserve instrument backed by gold and land.
          </p>
        </div>
      </div>

      {/* ── Intro — always visible ──────────────────────────────────────────── */}
      <div className="mt-8 grid lg:grid-cols-3 gap-0 border border-dl-border">
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-dl-border">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-2">Step 1</p>
          <p className="text-sm font-bold text-dl-navy font-dl-serif mb-1">Buy USDC with your card</p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
            Use Coinbase Pay to purchase USDC directly from your bank card or account. No crypto experience needed — KYC, payment processing, and delivery are all handled by Coinbase. USDC arrives in your wallet on Arbitrum One, typically within minutes.
          </p>
        </div>
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-dl-border">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-2">Step 2 (optional)</p>
          <p className="text-sm font-bold text-dl-navy font-dl-serif mb-1">Convert to AXUSD</p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
            If you want to participate in Axiom products — savings, lending, or AXAU — convert your USDC to AXUSD at a 1:1 rate through the Peg Stability Module. This requires two wallet confirmations: one approval and one swap. No price impact, no slippage.
          </p>
        </div>
        <div className="p-6">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-2">Step 3 (optional)</p>
          <p className="text-sm font-bold text-dl-navy font-dl-serif mb-1">Acquire AXAU</p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
            AXAU is the Axiom reserve instrument backed by gold and land net asset value. Converting AXUSD to AXAU requires identity verification through ERC-3643. Purchase requests enter an operational queue and are fulfilled within 1–2 business days.
          </p>
        </div>
      </div>

      {/* ── Asset Guide ─────────────────────────────────────────────────────── */}
      <div className="mt-0 border-l border-r border-b border-dl-border">
        <div className="px-6 py-4 border-b border-dl-border bg-dl-bg">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">Asset Guide</p>
        </div>
        <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-dl-border">
          {[
            {
              symbol: 'USDC',
              full: 'USD Coin',
              chain: 'Arbitrum One',
              desc: 'A regulated US dollar stablecoin issued by Circle. 1 USDC = $1.00 USD at all times. Widely accepted across DeFi. Holding USDC in your wallet gives you immediate access to the broader Arbitrum ecosystem.',
              use: 'Bridge, trading, payments',
              img: '/images/coinbase/icon-usdc.png',
              imgAlt: 'USDC 3D coin',
            },
            {
              symbol: 'AXUSD',
              full: 'Axiom USD Stablecoin',
              chain: 'Arbitrum One (ERC-3643)',
              desc: 'The Axiom Protocol stablecoin, pegged 1:1 to USDC via the Peg Stability Module. AXUSD is required to participate in Axiom savings, lending, and liquidity pools. It carries identity compliance built in via ERC-3643.',
              use: 'Savings, lending, protocol participation',
              img: '/images/coinbase/icon-axusd.png',
              imgAlt: 'AXUSD 3D stablecoin',
            },
            {
              symbol: 'AXAU',
              full: 'Axiom Reserve Instrument',
              chain: 'Arbitrum One',
              desc: 'A reserve instrument priced against a blend of gold (XAU/USD) and land net asset value. AXAU is designed for long-term capital preservation within the Axiom ecosystem. Identity verification is required before purchase.',
              use: 'Reserve instrument, long-term holding',
              img: '/images/coinbase/icon-axau.png',
              imgAlt: 'AXAU 3D gold coin',
            },
          ].map(a => (
            <div key={a.symbol} className="p-5">
              <div className="flex items-start gap-4 mb-3">
                <img
                  src={a.img}
                  alt={a.imgAlt}
                  className="w-16 h-16 object-cover shrink-0"
                  style={{ border: '1px solid rgba(30,58,95,0.12)' }}
                />
                <div>
                  <p className="text-base font-bold text-dl-navy font-dl-serif">{a.symbol}</p>
                  <p className="text-xs font-dl-mono text-dl-gray">{a.full}</p>
                </div>
              </div>
              <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mb-2">{a.desc}</p>
              <div className="flex justify-between text-xs font-dl-mono border-t border-dl-border pt-2">
                <span className="text-dl-gray">Network</span>
                <span className="text-dl-navy">{a.chain}</span>
              </div>
              <div className="flex justify-between text-xs font-dl-mono mt-1">
                <span className="text-dl-gray">Best for</span>
                <span className="text-dl-navy">{a.use}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Wallet Gate ─────────────────────────────────────────────────────── */}
      {!isConnected ? (
        <div className="mt-6 border border-dl-border p-8 text-center">
          <p className="text-sm font-bold text-dl-navy font-dl-serif mb-1">Connect your wallet to begin</p>
          <p className="text-xs text-dl-gray font-dl-mono">
            A wallet is required to receive USDC on Arbitrum One. If you do not have one, install MetaMask or any Arbitrum-compatible wallet and connect above.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-0">

          {isWrongChain && (
            <div className="mb-4 border border-amber-400 bg-amber-50 px-4 py-3">
              <p className="text-xs font-dl-mono text-amber-800">
                Switch your wallet to Arbitrum One (chain 42161) to use the PSM conversion steps.
              </p>
            </div>
          )}

          {/* Destination Selector */}
          <div className="border border-dl-border">
            <div className="px-6 py-4 border-b border-dl-border bg-dl-bg">
              <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">
                Select Destination
              </p>
            </div>
            <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-dl-border">
              {DESTINATIONS.map(d => (
                <button
                  key={d.id}
                  onClick={() => { setDestination(d.id); resetFlow(); }}
                  className={`p-5 text-left transition-colors ${
                    destination === d.id
                      ? 'bg-dl-navy text-white'
                      : 'bg-white hover:bg-dl-bg'
                  }`}
                >
                  <p className={`text-sm font-bold font-dl-serif mb-1 ${destination === d.id ? 'text-white' : 'text-dl-navy'}`}>
                    {d.label}
                  </p>
                  <p className={`text-xs font-dl-mono leading-relaxed ${destination === d.id ? 'text-blue-200' : 'text-dl-gray'}`}>
                    {d.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Flow path indicator */}
          {destination !== 'USDC' && (
            <div className="border-l border-r border-dl-border px-6 py-3 bg-dl-bg flex items-center gap-3">
              <span className="text-xs font-dl-mono text-dl-gray">Flow:</span>
              <span className="text-xs font-dl-mono text-dl-navy">Fiat (USD)</span>
              <span className="text-xs text-dl-gray">→</span>
              <span className="text-xs font-dl-mono text-dl-navy">USDC via Coinbase</span>
              <span className="text-xs text-dl-gray">→</span>
              <span className="text-xs font-dl-mono text-dl-navy">AXUSD via PSM</span>
              {destination === 'AXAU' && (
                <>
                  <span className="text-xs text-dl-gray">→</span>
                  <span className="text-xs font-dl-mono text-dl-navy">AXAU via Reserve</span>
                </>
              )}
            </div>
          )}

          {/* Step 1: Acquire USDC via Coinbase */}
          <div className="border border-dl-border">
            <div className="px-6 py-4 border-b border-dl-border flex items-center gap-3">
              <StepBadge n={1} done={step1Done} active={!step1Done} />
              <div>
                <p className="text-sm font-bold text-dl-navy font-dl-serif">
                  Acquire USDC via Coinbase
                </p>
                <p className="text-xs text-dl-gray font-dl-mono">
                  Purchase USDC on Arbitrum One using fiat — KYC handled by Coinbase.
                </p>
              </div>
              {step1Done && (
                <span className="ml-auto text-xs font-dl-mono text-dl-forest border border-dl-forest px-2 py-0.5">
                  COMPLETE
                </span>
              )}
            </div>

            {!step1Done && (
              <div className="p-6 grid lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider block mb-1">
                      Amount (USD)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={fiatAmount}
                      onChange={e => setFiatAmount(e.target.value)}
                      className="w-full border border-dl-border text-dl-navy text-sm font-dl-mono px-3 py-2 focus:outline-none focus:border-dl-navy"
                      placeholder="100"
                    />
                  </div>
                  <div className="bg-dl-bg border border-dl-border px-4 py-3 space-y-1">
                    <div className="flex justify-between text-xs font-dl-mono">
                      <span className="text-dl-gray">Network</span>
                      <span className="text-dl-navy">Arbitrum One</span>
                    </div>
                    <div className="flex justify-between text-xs font-dl-mono">
                      <span className="text-dl-gray">Asset</span>
                      <span className="text-dl-navy">USDC</span>
                    </div>
                    <div className="flex justify-between text-xs font-dl-mono">
                      <span className="text-dl-gray">Provider</span>
                      <span className="text-dl-navy">Coinbase Pay</span>
                    </div>
                    <div className="flex justify-between text-xs font-dl-mono">
                      <span className="text-dl-gray">Widget</span>
                      <span className="text-dl-navy">
                        {onrampConfig === null ? 'Checking…' : onrampConfig.configured ? 'Ready' : 'Not configured'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-end gap-3">
                  {error && (
                    <p className="text-xs font-dl-mono text-red-700 border border-red-300 bg-red-50 px-3 py-2">
                      {error}
                    </p>
                  )}
                  <button
                    onClick={handleLaunchCoinbase}
                    disabled={launching || onrampConfig === null || !onrampConfig.configured}
                    className="w-full py-3 bg-dl-navy text-white font-dl-mono text-sm hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {launching ? 'Opening Coinbase…' : `Buy USDC — $${parseFloat(fiatAmount || '0').toFixed(2)} USD`}
                  </button>
                  <p className="text-xs text-dl-gray font-dl-mono text-center">
                    Typical fees 1–3%. USDC delivered to your wallet on Arbitrum One.
                  </p>
                  {destination !== 'USDC' && (
                    <button
                      onClick={() => { setCoinbaseDone(true); }}
                      className="text-xs font-dl-mono text-dl-gray underline text-center"
                    >
                      I already have USDC — skip to conversion
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: PSM Conversion (AXUSD / AXAU destinations only) */}
          {destination !== 'USDC' && (
            <div className={`border border-dl-border ${!coinbaseDone ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="px-6 py-4 border-b border-dl-border flex items-center gap-3">
                <StepBadge n={2} done={step2Done} active={step2Active && !step2Done} />
                <div>
                  <p className="text-sm font-bold text-dl-navy font-dl-serif">
                    Convert USDC to AXUSD via PSM
                  </p>
                  <p className="text-xs text-dl-gray font-dl-mono">
                    1:1 swap through the Peg Stability Module. Two wallet confirmations: approve + swap.
                  </p>
                </div>
                {step2Done && (
                  <span className="ml-auto text-xs font-dl-mono text-dl-forest border border-dl-forest px-2 py-0.5">
                    COMPLETE
                  </span>
                )}
              </div>

              {coinbaseDone && !psmDone && (
                <div className="p-6 space-y-5">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider block mb-1">
                          USDC to Convert
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={usdcToConvert}
                          onChange={e => setUsdcToConvert(e.target.value)}
                          className="w-full border border-dl-border text-dl-navy text-sm font-dl-mono px-3 py-2 focus:outline-none focus:border-dl-navy"
                          placeholder="Enter USDC amount"
                        />
                        {usdcBalance !== null && (
                          <p className="mt-1 text-xs font-dl-mono text-dl-gray">
                            Wallet balance: {parseFloat(usdcBalance).toFixed(4)} USDC
                            <button
                              onClick={() => setUsdcToConvert(parseFloat(usdcBalance).toFixed(6))}
                              className="ml-2 text-dl-navy underline"
                            >
                              Max
                            </button>
                          </p>
                        )}
                      </div>

                      <div className="bg-dl-bg border border-dl-border px-4 py-3 space-y-1">
                        <div className="flex justify-between text-xs font-dl-mono">
                          <span className="text-dl-gray">You send</span>
                          <span className="text-dl-navy">{usdcToConvert || '—'} USDC</span>
                        </div>
                        <div className="flex justify-between text-xs font-dl-mono">
                          <span className="text-dl-gray">You receive</span>
                          <span className="text-dl-navy">
                            {usdcToConvert ? `~${parseFloat(usdcToConvert).toFixed(4)} AXUSD` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-dl-mono">
                          <span className="text-dl-gray">Rate</span>
                          <span className="text-dl-navy">1:1 (minus PSM fee)</span>
                        </div>
                        <div className="flex justify-between text-xs font-dl-mono">
                          <span className="text-dl-gray">Network</span>
                          <span className="text-dl-navy">Arbitrum One</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-end gap-3">
                      {psmError && (
                        <p className="text-xs font-dl-mono text-red-700 border border-red-300 bg-red-50 px-3 py-2">
                          {psmError}
                        </p>
                      )}

                      {needsApproval ? (
                        <>
                          <button
                            onClick={handleApprove}
                            disabled={approveIsPending || approveTxLoading || convertAmountWei === 0n}
                            className="w-full py-3 bg-dl-navy text-white font-dl-mono text-sm hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {approveIsPending
                              ? 'Confirm in wallet…'
                              : approveTxLoading
                              ? 'Approving…'
                              : 'Step 2a — Approve USDC for PSM'}
                          </button>
                          <p className="text-xs text-dl-gray font-dl-mono text-center">
                            Grants the PSM contract permission to spend your USDC.
                          </p>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handlePsmSwap}
                            disabled={psmIsPending || psmTxLoading || convertAmountWei === 0n}
                            className="w-full py-3 bg-dl-navy text-white font-dl-mono text-sm hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {psmIsPending
                              ? 'Confirm in wallet…'
                              : psmTxLoading
                              ? 'Converting…'
                              : 'Step 2b — Convert to AXUSD'}
                          </button>
                          {approveTxHash && (
                            <p className="text-xs text-dl-gray font-dl-mono text-center">
                              Approval confirmed. Ready to swap.
                            </p>
                          )}
                        </>
                      )}

                      {(approveTxHash || psmTxHash) && (
                        <div className="border border-dl-border px-3 py-2 space-y-1">
                          {approveTxHash && (
                            <div className="flex justify-between text-xs font-dl-mono">
                              <span className="text-dl-gray">Approve tx</span>
                              <a
                                href={`https://arbiscan.io/tx/${approveTxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-dl-navy underline"
                              >
                                {approveTxHash.slice(0, 10)}…
                              </a>
                            </div>
                          )}
                          {psmTxHash && (
                            <div className="flex justify-between text-xs font-dl-mono">
                              <span className="text-dl-gray">Swap tx</span>
                              <a
                                href={`https://arbiscan.io/tx/${psmTxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-dl-navy underline"
                              >
                                {psmTxHash.slice(0, 10)}…
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {psmDone && (
                <div className="px-6 py-4 bg-dl-bg">
                  <p className="text-xs font-dl-mono text-dl-forest">
                    Conversion complete. You received ~{usdcToConvert} AXUSD.
                    {psmTxHash && (
                      <>
                        {' '}
                        <a
                          href={`https://arbiscan.io/tx/${psmTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          View on Arbiscan
                        </a>
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: AXAU Purchase Request */}
          {destination === 'AXAU' && (
            <div className={`border border-dl-border ${!psmDone ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="px-6 py-4 border-b border-dl-border flex items-center gap-3">
                <StepBadge n={3} done={axauRequestDone} active={step3Active && !axauRequestDone} />
                <div>
                  <p className="text-sm font-bold text-dl-navy font-dl-serif">
                    Submit AXAU Purchase Request
                  </p>
                  <p className="text-xs text-dl-gray font-dl-mono">
                    Reserve instrument backed by gold and land NAV. Requires ERC-3643 identity verification.
                  </p>
                </div>
                {axauRequestDone && (
                  <span className="ml-auto text-xs font-dl-mono text-dl-forest border border-dl-forest px-2 py-0.5">
                    SUBMITTED
                  </span>
                )}
              </div>

              {psmDone && !axauRequestDone && (
                <div className="p-6 grid lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-dl-bg border border-dl-border px-4 py-3 space-y-1">
                      <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-2">
                        Purchase Quote
                      </p>
                      {axauQuoteLoading && (
                        <p className="text-xs font-dl-mono text-dl-gray">Fetching quote…</p>
                      )}
                      {axauQuote && !axauQuoteLoading && (
                        <>
                          <div className="flex justify-between text-xs font-dl-mono">
                            <span className="text-dl-gray">You send</span>
                            <span className="text-dl-navy">{usdcToConvert} AXUSD</span>
                          </div>
                          <div className="flex justify-between text-xs font-dl-mono">
                            <span className="text-dl-gray">You receive</span>
                            <span className="text-dl-navy">{axauQuote.axauOutFormatted} AXAU</span>
                          </div>
                          <div className="flex justify-between text-xs font-dl-mono">
                            <span className="text-dl-gray">XAU / USD</span>
                            <span className="text-dl-navy">${parseFloat(axauQuote.xauUsdPrice).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs font-dl-mono">
                            <span className="text-dl-gray">NAV per AXAU</span>
                            <span className="text-dl-navy">${axauQuote.mintNavPerToken}</span>
                          </div>
                          <div className="flex justify-between text-xs font-dl-mono">
                            <span className="text-dl-gray">Quote math</span>
                            <span className="text-dl-navy">Estimated</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider block mb-1">
                        Email (optional — for confirmation)
                      </label>
                      <input
                        type="email"
                        value={axauEmail}
                        onChange={e => setAxauEmail(e.target.value)}
                        className="w-full border border-dl-border text-dl-navy text-sm font-dl-mono px-3 py-2 focus:outline-none focus:border-dl-navy"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col justify-end gap-3">
                    {axauError && (
                      <p className="text-xs font-dl-mono text-red-700 border border-red-300 bg-red-50 px-3 py-2">
                        {axauError}
                      </p>
                    )}

                    <button
                      onClick={handleAxauSubmit}
                      disabled={axauSubmitting || !axauQuote || axauQuoteLoading}
                      className="w-full py-3 bg-dl-navy text-white font-dl-mono text-sm hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {axauSubmitting ? 'Submitting…' : 'Submit AXAU Purchase Request'}
                    </button>

                    <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
                      Requests enter an operational queue. Fulfillment typically within 1–2 business days.
                      Identity verification (ERC-3643) is required.
                    </p>
                  </div>
                </div>
              )}

              {axauRequestDone && (
                <div className="px-6 py-5 bg-dl-bg space-y-2">
                  <p className="text-sm font-dl-serif font-bold text-dl-navy">
                    Purchase request submitted.
                  </p>
                  {axauRequestId !== null && (
                    <p className="text-xs font-dl-mono text-dl-gray">
                      Request ID: <span className="text-dl-navy">#{axauRequestId}</span>
                    </p>
                  )}
                  {axauQuote && (
                    <p className="text-xs font-dl-mono text-dl-gray">
                      {usdcToConvert} AXUSD → {axauQuote.axauOutFormatted} AXAU (estimated)
                    </p>
                  )}
                  <p className="text-xs font-dl-mono text-dl-gray">
                    You will receive AXAU tokens upon fulfillment.
                    {axauEmail && ` A confirmation has been sent to ${axauEmail}.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* USDC destination — completion state */}
          {destination === 'USDC' && coinbaseDone && (
            <div className="border border-dl-border px-6 py-5 bg-dl-bg">
              <p className="text-sm font-dl-serif font-bold text-dl-navy mb-1">Purchase complete.</p>
              <p className="text-xs font-dl-mono text-dl-gray">
                USDC has been delivered to your wallet on Arbitrum One.
              </p>
              <button
                onClick={resetFlow}
                className="mt-3 text-xs font-dl-mono text-dl-navy underline"
              >
                Start another purchase
              </button>
            </div>
          )}

          {/* Transaction History */}
          <div className="mt-8 pt-8 border-t border-dl-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-dl-navy font-dl-serif">
                Onramp Transaction History
              </h3>
              <button
                onClick={loadHistory}
                className="text-xs font-dl-mono text-dl-gray hover:text-dl-navy border border-dl-border px-3 py-1"
              >
                Refresh
              </button>
            </div>

            {intentsLoading ? (
              <p className="text-sm text-dl-gray font-dl-mono">Loading…</p>
            ) : intents.length === 0 ? (
              <div className="border border-dl-border p-6 text-center">
                <p className="text-sm text-dl-gray font-dl-mono">
                  No Coinbase onramp transactions found for this wallet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-dl-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-dl-bg border-b border-dl-border">
                      <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Date</th>
                      <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Asset</th>
                      <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Amount</th>
                      <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Network</th>
                      <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intents.map(intent => (
                      <tr key={intent.intentId} className="border-b border-dl-border last:border-b-0">
                        <td className="p-3 font-dl-mono text-dl-gray text-xs">{formatDate(intent.createdAt)}</td>
                        <td className="p-3 font-dl-mono text-dl-navy">{intent.asset}</td>
                        <td className="p-3 font-dl-mono text-dl-navy">
                          ${Number(intent.fiatAmount).toFixed(2)} {intent.fiatCurrency}
                        </td>
                        <td className="p-3 font-dl-mono text-dl-navy">
                          {intent.chainId === 42161 ? 'Arbitrum One' : intent.chainId === 8453 ? 'Base' : String(intent.chainId)}
                        </td>
                        <td className="p-3">
                          <span className="font-dl-mono text-xs text-dl-gray border border-dl-border px-2 py-0.5 uppercase">
                            {intent.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FAQ — always visible ─────────────────────────────────────────────── */}
      <div className="mt-12 border border-dl-border">
        <div className="px-6 py-4 border-b border-dl-border bg-dl-bg">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">Frequently Asked Questions</p>
        </div>
        <div className="divide-y divide-dl-border">
          {[
            {
              q: 'What is Coinbase Pay and is it safe?',
              a: 'Coinbase Pay is a regulated fiat-to-crypto payment service operated by Coinbase, Inc. — one of the largest publicly traded crypto companies in the US. Your bank details and identity verification are handled entirely by Coinbase under their own compliance and security standards. Axiom Protocol never sees your payment card or bank credentials.',
            },
            {
              q: 'Do I need a Coinbase account?',
              a: 'No. Coinbase Pay supports guest checkout using a debit or credit card without requiring you to create or log in to a Coinbase account. If you already have a Coinbase account, you can use it to access additional payment methods like bank transfers.',
            },
            {
              q: 'How long does it take to receive USDC?',
              a: 'Card payments are typically processed within 5–15 minutes. Bank transfers (ACH) may take 1–3 business days depending on your bank. Once the purchase is confirmed by Coinbase, USDC is delivered directly to your connected wallet on Arbitrum One.',
            },
            {
              q: 'What fees does Coinbase charge?',
              a: 'Coinbase Pay charges a transaction fee that varies by payment method and amount, typically ranging from 1% to 3.99% for card purchases. Bank transfers generally carry lower fees. The exact fee is shown inside the Coinbase Pay widget before you confirm the transaction.',
            },
            {
              q: 'What is the Peg Stability Module (PSM)?',
              a: 'The PSM is an on-chain contract that swaps USDC for AXUSD at a 1:1 rate (minus a small protocol fee). It exists to ensure AXUSD always maintains its dollar peg. When you use the PSM, you send USDC and receive an equivalent amount of AXUSD — no market pricing, no slippage.',
            },
            {
              q: 'Why does converting to AXUSD require two wallet transactions?',
              a: 'ERC-20 tokens on Ethereum and Arbitrum require a two-step process: first you authorize the PSM contract to access your USDC (approve), then you execute the swap (swapCollateralForAXUSD). Both transactions require gas fees in ETH. This is standard behavior for all Arbitrum DeFi protocols.',
            },
            {
              q: 'What is AXAU and who can buy it?',
              a: 'AXAU is the Axiom reserve instrument, priced against a blend of XAU (gold) and land net asset value. It is designed for participants who want long-term capital preservation within the Axiom ecosystem. AXAU purchases require identity verification through ERC-3643 compliance credentials. Requests enter an operational queue and are fulfilled within 1–2 business days.',
            },
            {
              q: 'I already have USDC — do I need to buy more?',
              a: 'No. If you already hold USDC on Arbitrum One, you can skip Step 1 entirely. Use the "I already have USDC — skip to conversion" link on the page to proceed directly to the PSM conversion step.',
            },
            {
              q: 'What happens if the Coinbase widget does not open?',
              a: 'The widget opens in a popup window. If it does not appear, your browser may be blocking popups. Allow popups for this site in your browser settings, then click the button again. If the problem persists, contact Axiom support.',
            },
            {
              q: 'Which networks are supported?',
              a: 'USDC purchases via Coinbase Pay are delivered to Arbitrum One (chain ID 42161). The PSM and AXUSD contracts are deployed on Arbitrum One. AXAU minting also occurs on Arbitrum One. Make sure your wallet is set to Arbitrum One before attempting any on-chain steps.',
            },
          ].map((item, i) => (
            <div key={i} className="px-6 py-4">
              <p className="text-sm font-bold text-dl-navy font-dl-serif mb-1">{item.q}</p>
              <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── About Coinbase Integration ─────────────────────────────────────── */}
      <div className="mt-6 border border-dl-border">
        <div className="px-6 py-4 border-b border-dl-border bg-dl-bg">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">About the Coinbase Integration</p>
        </div>
        {/* Lifestyle image strip */}
        <div className="relative overflow-hidden border-b border-dl-border" style={{ height: '200px' }}>
          <img
            src="/images/coinbase/coinbase-pay-card.png"
            alt="Coinbase Pay — card and smartphone"
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 40%' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, rgba(30,58,95,0.88) 0%, rgba(30,58,95,0.3) 55%, transparent 100%)' }}
          />
          <div className="absolute inset-0 flex flex-col justify-center px-8">
            <p className="text-xs font-dl-mono text-blue-200 uppercase tracking-widest mb-1">Coinbase Developer Platform</p>
            <p className="text-xl font-bold text-white font-dl-serif max-w-sm">
              Institutional-grade payment rails, consumer-grade simplicity.
            </p>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-dl-border">
          <div className="p-6 space-y-3">
            <p className="text-sm font-bold text-dl-navy font-dl-serif">Coinbase Developer Platform (CDP)</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Axiom Protocol uses the Coinbase Developer Platform to power this onramp. CDP provides the Coinbase Pay widget (for user-facing fiat purchases), live crypto price feeds via Coinbase Advanced Trade, and server-managed treasury wallets on Base mainnet. This integration gives Axiom participants access to institutional-grade payment infrastructure without leaving the protocol interface.
            </p>
            <div className="border-t border-dl-border pt-3 space-y-1">
              <div className="flex justify-between text-xs font-dl-mono">
                <span className="text-dl-gray">Payment widget</span>
                <span className="text-dl-navy">Coinbase Pay</span>
              </div>
              <div className="flex justify-between text-xs font-dl-mono">
                <span className="text-dl-gray">Price data</span>
                <span className="text-dl-navy">Coinbase Advanced Trade</span>
              </div>
              <div className="flex justify-between text-xs font-dl-mono">
                <span className="text-dl-gray">Treasury wallets</span>
                <span className="text-dl-navy">CDP Server Wallets (Base)</span>
              </div>
              <div className="flex justify-between text-xs font-dl-mono">
                <span className="text-dl-gray">KYC provider</span>
                <span className="text-dl-navy">Coinbase (independent)</span>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <p className="text-sm font-bold text-dl-navy font-dl-serif">Privacy and Data Handling</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              When you use Coinbase Pay, your wallet address is shared with Coinbase to direct the USDC delivery. No other personal information is passed from Axiom to Coinbase. Your payment card details, bank credentials, and identity documents remain exclusively with Coinbase under their privacy policy.
            </p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Axiom Protocol records your wallet address and purchase intent on its own servers for transaction history and audit purposes only. This data is not sold or shared with third parties outside of the Axiom Protocol ecosystem.
            </p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Coinbase Pay sessions expire after a fixed period. If the widget closes without a completed purchase, no transaction is recorded and no funds move.
            </p>
          </div>
        </div>
      </div>
    </DesignLawLayout>
  );
}
