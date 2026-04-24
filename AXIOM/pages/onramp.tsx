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
        <title>Start With Dollars | Axiom Protocol</title>
        <meta
          name="description"
          content="Turn dollars into opportunity in minutes. Start with cash, move into Axiom Dollars, and choose your path — income, reserve access, or capital participation."
        />
      </Head>

      <SectionHeading
        title="Start With Dollars"
        subtitle="The easiest public entry into Axiom — buy digital dollars, move into Axiom Dollars, and choose your path"
      />

      {/* ── Cinematic Hero Banner ────────────────────────────────────────────── */}
      <div className="mt-6 relative overflow-hidden border border-dl-border" style={{ height: '340px' }}>
        <img
          src="/images/coinbase/onramp-hero.png"
          alt="Turn dollars into opportunity — powered by Coinbase infrastructure"
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 30%' }}
        />
        <div
          className="absolute inset-0 flex flex-col justify-end p-8"
          style={{ background: 'linear-gradient(to top, rgba(30,58,95,0.92) 0%, rgba(30,58,95,0.45) 60%, transparent 100%)' }}
        >
          <p className="text-xs font-dl-mono text-blue-200 uppercase tracking-widest mb-2">Powered by Coinbase Infrastructure</p>
          <p className="text-2xl md:text-3xl font-bold text-white font-dl-serif leading-tight">
            Turn Dollars Into<br />Opportunity in Minutes.
          </p>
          <p className="text-sm text-blue-100 font-dl-mono mt-3 max-w-2xl leading-relaxed">
            Start with cash, move into Axiom Dollars, and choose your path — income, reserve access, or capital participation.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <a
              href="#how-it-works"
              className="inline-block bg-dl-gold text-dl-navy px-6 py-3 text-xs font-bold hover:opacity-90 font-dl-mono uppercase tracking-wider"
            >
              Start With Dollars →
            </a>
            <a
              href="#how-it-works"
              className="inline-block border border-white text-white px-6 py-3 text-xs font-bold hover:bg-white hover:text-dl-navy font-dl-mono uppercase tracking-wider"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              See How It Works
            </a>
          </div>
        </div>
      </div>

      {/* ── Trust Strip — 4 institutional guarantees ───────────────────────── */}
      <div className="mt-0 border-l border-r border-b border-dl-border grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-dl-border bg-dl-bg">
        {[
          { label: 'Powered By Coinbase', detail: 'Infrastructure for payments and identity' },
          { label: 'Delivered On Arbitrum One', detail: 'Fast settlement, low fees' },
          { label: '1:1 Dollar Conversion', detail: 'No market pricing, no slippage' },
          { label: 'Reserve Access', detail: 'Available after identity verification' },
        ].map(item => (
          <div key={item.label} className="p-4 flex items-start gap-3">
            <span
              className="inline-flex items-center justify-center shrink-0"
              style={{ width: 18, height: 18, border: '1px solid #b8860b', marginTop: 2 }}
            >
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l2.5 2.5L9 1" stroke="#b8860b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wider font-bold">{item.label}</p>
              <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mt-1">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Intro — three benefit-led steps ─────────────────────────────────── */}
      <div id="how-it-works" className="mt-8 grid lg:grid-cols-3 gap-0 border border-dl-border">
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-dl-border">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-2">Step 1</p>
          <p className="text-sm font-bold text-dl-navy font-dl-serif mb-1">Fund Your Wallet</p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
            Use your card or bank account to purchase digital dollars (USDC) through Coinbase infrastructure. Funds are delivered to your wallet on Arbitrum One within minutes. Payment and identity checks are handled by Coinbase under its own compliance standards.
          </p>
        </div>
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-dl-border">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-2">Step 2 (optional)</p>
          <p className="text-sm font-bold text-dl-navy font-dl-serif mb-1">Move Into Axiom Dollars</p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
            Convert USDC into AXUSD through Axiom&apos;s instant 1:1 conversion engine — no market pricing, no slippage. AXUSD unlocks access to the broader Axiom ecosystem.
          </p>
        </div>
        <div className="p-6">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-2">Step 3 (optional)</p>
          <p className="text-sm font-bold text-dl-navy font-dl-serif mb-1">Choose Your Growth Path</p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
            Use AXUSD to enter savings, reserve access (AXAU), and other capital pathways inside Axiom. Reserve access requires identity verification.
          </p>
        </div>
      </div>

      {/* ── What Happens After You Start ────────────────────────────────────── */}
      <div className="mt-0 border-l border-r border-b border-dl-border">
        <div className="px-6 py-4 border-b border-dl-border bg-dl-bg">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">What Happens After You Start?</p>
        </div>
        <ol className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-dl-border list-none m-0 p-0">
          {[
            { num: '1', title: 'Buy Digital Dollars', body: 'Card or bank checkout through Coinbase. Delivered on Arbitrum One.' },
            { num: '2', title: 'Move Into AXUSD',     body: 'Instant 1:1 conversion into Axiom Dollars — no slippage.' },
            { num: '3', title: 'Choose Reserve, Savings, or Capital Access', body: 'Enter the Axiom ecosystem on the path that fits your goal.' },
          ].map(s => (
            <li key={s.num} className="p-6">
              <p className="font-dl-serif text-2xl text-dl-gold font-bold mb-1">{s.num}</p>
              <p className="text-sm font-bold text-dl-navy font-dl-serif mb-1">{s.title}</p>
              <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Asset Guide ─────────────────────────────────────────────────────── */}
      <div className="mt-6 border-l border-r border-b border-t border-dl-border">
        <div className="px-6 py-4 border-b border-dl-border bg-dl-bg">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">Asset Guide</p>
        </div>
        <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-dl-border">
          {[
            {
              symbol: 'USDC',
              full: 'Digital Dollars',
              chain: 'Arbitrum One',
              desc: 'Digital dollars widely used for payments, transfers, and entry into the broader on-chain economy. Issued by Circle. 1 USDC always equals $1.00.',
              use: 'Entry asset, payments, transfers',
              img: '/images/coinbase/icon-usdc.png',
              imgAlt: 'USDC 3D coin',
            },
            {
              symbol: 'AXUSD',
              full: 'Axiom Dollars',
              chain: 'Arbitrum One',
              desc: "Axiom's internal dollar rail used across savings, lending, and ecosystem access. Pegged 1:1 to USDC and identity-aware by design.",
              use: 'Savings, lending, ecosystem access',
              img: '/images/coinbase/icon-axusd.png',
              imgAlt: 'AXUSD 3D stablecoin',
            },
            {
              symbol: 'AXAU',
              full: 'Axiom Reserve Asset',
              chain: 'Arbitrum One',
              desc: 'A reserve asset for long-term capital preservation, structured around a blend of gold and land-backed reserve positions. Available through verified access.',
              use: 'Reserve asset, long-term holding',
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
              <span className="text-xs font-dl-mono text-dl-navy">AXUSD via 1:1 conversion</span>
              {destination === 'AXAU' && (
                <>
                  <span className="text-xs text-dl-gray">→</span>
                  <span className="text-xs font-dl-mono text-dl-navy">AXAU via reserve access</span>
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
                    Move Into Axiom Dollars (AXUSD)
                  </p>
                  <p className="text-xs text-dl-gray font-dl-mono">
                    Instant 1:1 conversion engine. Two wallet confirmations: approve + swap.
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
              a: 'Coinbase Pay is the payment infrastructure that powers this entry flow. Payment details and identity checks are handled by Coinbase under its own compliance standards. Axiom receives only the information needed to complete delivery and maintain transaction history.',
            },
            {
              q: 'Do I need a Coinbase account?',
              a: 'No. Card checkout can be completed without creating a full Coinbase trading account, depending on the payment method available in your region. If you already have a Coinbase account, additional methods like bank transfers may be available.',
            },
            {
              q: 'How long does it take to receive my digital dollars?',
              a: 'Card payments are typically delivered within 5–15 minutes. Bank transfers may take 1–3 business days depending on your bank. Once Coinbase confirms the purchase, digital dollars (USDC) arrive in your wallet on Arbitrum One.',
            },
            {
              q: 'What fees does Coinbase charge?',
              a: 'Coinbase applies a transaction fee that varies by payment method and amount, typically in the 1%–3.99% range for card purchases. Bank transfers generally carry lower fees. The exact fee is shown before you confirm.',
            },
            {
              q: 'What is the 1:1 conversion engine?',
              a: "Axiom's instant 1:1 conversion system for moving from USDC into AXUSD without market slippage. You send digital dollars and receive an equivalent amount of Axiom Dollars — no pricing risk, no slippage, just a small protocol fee.",
            },
            {
              q: 'Why does converting to AXUSD take two wallet confirmations?',
              a: 'Moving digital tokens on Arbitrum requires a brief two-step pattern: first you authorize the conversion engine to access your USDC, then you execute the swap. Both confirmations require a small amount of ETH for gas. This is standard behavior across the network.',
            },
            {
              q: 'What is AXAU and who can access it?',
              a: 'AXAU is the Axiom reserve asset, structured around a blend of gold and land-backed reserve positions. It is designed for participants who want long-term capital preservation. Access requires identity verification, after which requests enter an operational queue and are fulfilled within 1–2 business days.',
            },
            {
              q: 'I already have USDC — do I need to buy more?',
              a: 'No. If you already hold USDC on Arbitrum One, you can skip Step 1 entirely and move directly to the conversion step using the link on this page.',
            },
            {
              q: 'What happens if the Coinbase window does not open?',
              a: 'The flow opens in a popup window. If nothing appears, your browser may be blocking popups. Allow popups for this site and try again. If the issue persists, contact Axiom support.',
            },
            {
              q: 'Which networks are supported?',
              a: 'Digital dollars purchased through this flow are delivered to Arbitrum One (chain ID 42161). The conversion engine, AXUSD, and AXAU all settle on Arbitrum One. Make sure your wallet is set to Arbitrum One before any on-chain step.',
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
            <p className="text-sm font-bold text-dl-navy font-dl-serif">Powered by Coinbase Infrastructure</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Axiom uses Coinbase infrastructure to power this entry path: regulated payment processing for buying digital dollars, live market price feeds, and institutional treasury wallets on Base. The result is institutional-grade payment infrastructure delivered inside the Axiom interface.
            </p>
            <div className="border-t border-dl-border pt-3 space-y-1">
              <div className="flex justify-between text-xs font-dl-mono">
                <span className="text-dl-gray">Payment infrastructure</span>
                <span className="text-dl-navy">Coinbase</span>
              </div>
              <div className="flex justify-between text-xs font-dl-mono">
                <span className="text-dl-gray">Price data</span>
                <span className="text-dl-navy">Coinbase market feeds</span>
              </div>
              <div className="flex justify-between text-xs font-dl-mono">
                <span className="text-dl-gray">Treasury wallets</span>
                <span className="text-dl-navy">Coinbase-managed (Base)</span>
              </div>
              <div className="flex justify-between text-xs font-dl-mono">
                <span className="text-dl-gray">Identity verification</span>
                <span className="text-dl-navy">Coinbase (independent)</span>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <p className="text-sm font-bold text-dl-navy font-dl-serif">Privacy and Data Handling</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              When you use this entry path, your wallet address is shared with Coinbase to direct delivery of your digital dollars. No other personal information is passed from Axiom to Coinbase. Payment details, bank credentials, and identity documents remain exclusively with Coinbase under its privacy policy.
            </p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Axiom records your wallet address and purchase intent on its own servers for transaction history and audit purposes only. This data is not sold or shared with third parties outside the Axiom ecosystem.
            </p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Sessions expire after a fixed period. If the window closes without a completed purchase, no transaction is recorded and no funds move.
            </p>
          </div>
        </div>
      </div>
    </DesignLawLayout>
  );
}
