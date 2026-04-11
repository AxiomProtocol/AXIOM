import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useAccount, useWalletClient } from 'wagmi';
import { DesignLawLayout } from '../components/design-law';

interface CreditLineStatus {
  hasLine: boolean;
  line?: {
    id: string;
    participantWallet: string;
    collateralAsset: 'BTC' | 'ETH' | 'AXUSD';
    collateralAmountRaw: string;
    collateralUsdValueAtOpen: string | null;
    creditLimitUsd: string | null;
    drawnAmountUsd: string;
    availableCreditUsd: string;
    interestRatePct: string;
    status: 'pending_collateral' | 'active' | 'warning' | 'flagged' | 'closed';
    depositAddress: string | null;
    openedAt: string | null;
  };
  collateralValueUsd: string | null;
  priceUsd: string | null;
  ltvRatio: number | null;
  healthStatus: 'safe' | 'warning' | 'critical' | null;
}

interface DrawRecord {
  id: string;
  initiatedAt: string;
  sourceAmountAxusd: string;
  corridorId: string;
  status: string;
  anchorRawResponse?: { type?: string; increaseTransferId?: string; repaymentAmountUsd?: number };
}

const fmtUsd = (val: string | number | null | undefined) => {
  if (val === null || val === undefined) return '—';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
};

const LTV_RATIOS: Record<string, number> = {
  BTC: 50,
  ETH: 50,
  AXUSD: 80,
};

const statusColors: Record<string, string> = {
  pending_collateral: 'text-dl-gold border-dl-gold',
  active: 'text-dl-forest border-dl-forest',
  warning: 'text-amber-600 border-amber-600',
  flagged: 'text-red-700 border-red-700',
  closed: 'text-dl-gray border-dl-border',
};

const statusLabels: Record<string, string> = {
  pending_collateral: 'Awaiting Collateral',
  active: 'Active',
  warning: 'Warning — Add Collateral',
  flagged: 'Flagged for Review',
  closed: 'Closed',
};

function HealthBar({ ltvRatio, healthStatus }: { ltvRatio: number | null; healthStatus: string | null }) {
  if (ltvRatio === null) return null;
  const clamped = Math.min(100, Math.max(0, ltvRatio));
  const barColor =
    healthStatus === 'critical' ? 'bg-red-600' :
    healthStatus === 'warning' ? 'bg-amber-500' :
    'bg-dl-forest';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-dl-gray font-mono">
        <span>LTV Ratio</span>
        <span className={healthStatus === 'critical' ? 'text-red-600 font-bold' : healthStatus === 'warning' ? 'text-amber-600 font-bold' : ''}>
          {ltvRatio.toFixed(1)}%
        </span>
      </div>
      <div className="w-full h-2.5 bg-dl-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-dl-gray/60 font-mono mt-1">
        <span>0%</span>
        <span className="text-amber-500">70% warn</span>
        <span className="text-red-500">85% liq</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function QRCode({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    import('qrcode').then(QRCodeLib => {
      QRCodeLib.toCanvas(canvasRef.current!, value, {
        width: 160,
        margin: 2,
        color: { dark: '#1a2744', light: '#ffffff' },
      }, (err) => {
        if (err) setError(true);
      });
    }).catch(() => setError(true));
  }, [value]);

  if (error) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="rounded border border-dl-border" />
      <p className="text-xs text-dl-gray/60">Scan to copy address</p>
    </div>
  );
}

function ConfirmationTimer({ openedAt }: { openedAt: string | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!openedAt) return;
    const start = new Date(openedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [openedAt]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="flex items-center gap-2 text-xs text-dl-gray font-mono">
      <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span>Waiting for on-chain confirmation · {label} elapsed</span>
    </div>
  );
}

function TransactionHistory({ walletAddress }: { walletAddress: string }) {
  const [records, setRecords] = useState<DrawRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/credit/history?walletAddress=${walletAddress}`)
      .then(r => r.ok ? r.json() : { records: [] })
      .then(d => { setRecords(d.records ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [walletAddress]);

  if (loading) return <div className="text-xs text-dl-gray py-2 font-mono">Loading history…</div>;
  if (records.length === 0) return <div className="text-xs text-dl-gray py-2">No transactions yet.</div>;

  return (
    <div className="space-y-2">
      {records.map(r => {
        const isRepayment = r.anchorRawResponse?.type === 'repayment_intent';
        const label = isRepayment ? 'Repayment Intent' : 'Draw';
        const color = isRepayment ? 'text-dl-forest' : 'text-dl-navy';
        const sign = isRepayment ? '−' : '+';
        return (
          <div key={r.id} className="flex justify-between items-center text-sm py-2 border-b border-dl-border last:border-0">
            <div>
              <div className={`font-medium ${color}`}>{label}</div>
              <div className="text-xs text-dl-gray/60 font-mono">
                {new Date(r.initiatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div className="text-right">
              <div className={`font-mono font-bold ${color}`}>
                {sign}{fmtUsd(r.sourceAmountAxusd)}
              </div>
              <div className="text-xs text-dl-gray/60 capitalize">{r.status.replace('_', ' ')}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CreditPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [mounted, setMounted] = useState(false);

  const [status, setStatus] = useState<CreditLineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  const [view, setView] = useState<'dashboard' | 'open' | 'draw' | 'repay'>('dashboard');

  const [openAsset, setOpenAsset] = useState<'BTC' | 'ETH' | 'AXUSD'>('BTC');
  const [openAmount, setOpenAmount] = useState('');
  const [openLoading, setOpenLoading] = useState(false);
  const [openError, setOpenError] = useState('');
  const [openResult, setOpenResult] = useState<{
    depositAddress: string;
    creditLimitUsd: string;
    collateralAsset: string;
    collateralAmount: number;
    ltvRatio: number;
  } | null>(null);

  const [drawAmount, setDrawAmount] = useState('');
  const [drawLoading, setDrawLoading] = useState(false);
  const [drawError, setDrawError] = useState('');
  const [drawSuccess, setDrawSuccess] = useState('');

  const [repayAmount, setRepayAmount] = useState('');
  const [repayLoading, setRepayLoading] = useState(false);
  const [repayError, setRepayError] = useState('');
  const [repaySuccess, setRepaySuccess] = useState('');

  useEffect(() => { setMounted(true); }, []);

  const fetchStatus = useCallback(async (addr: string) => {
    setLoading(true);
    setError('');
    setNeedsSignIn(false);
    try {
      const res = await fetch(`/api/credit/status?walletAddress=${addr}`);
      if (res.status === 401) { setNeedsSignIn(true); setLoading(false); return; }
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to load credit status');
        setLoading(false);
        return;
      }
      const d = await res.json();
      setStatus(d);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      fetchStatus(address);
    }
  }, [isConnected, address, fetchStatus]);

  const handleSignIn = async () => {
    if (!address || typeof window === 'undefined') return;
    setSigningIn(true);
    setSignInError('');
    try {
      const { siweService } = await import('../lib/services/SIWEService');
      siweService.resetSigningState();

      let signer: { signMessage: (msg: string) => Promise<string> } | null = null;
      let chainId = 42161;

      if (walletClient) {
        chainId = walletClient.chain?.id ?? 42161;
        signer = {
          signMessage: (msg: string) => walletClient.signMessage({ message: msg }),
        };
      }

      if (!signer && (window as Window & { ethereum?: unknown }).ethereum) {
        const { ethers } = await import('ethers');
        const provider = new ethers.BrowserProvider(
          (window as Window & { ethereum: unknown }).ethereum as Parameters<typeof ethers.BrowserProvider>[0],
        );
        signer = await provider.getSigner();
        const network = await provider.getNetwork();
        chainId = Number(network.chainId) || 42161;
      }

      if (!signer) {
        setSignInError('No wallet signer available. Please reconnect your wallet.');
        setSigningIn(false);
        return;
      }

      await siweService.signIn(address, chainId, signer);
      setNeedsSignIn(false);
      fetchStatus(address);
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleOpen = async () => {
    if (!address) return;
    setOpenLoading(true);
    setOpenError('');
    setOpenResult(null);
    try {
      const res = await fetch('/api/credit/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, collateralAsset: openAsset, collateralAmount: openAmount }),
      });
      const d = await res.json();
      if (!res.ok) {
        setOpenError(d.error || 'Failed to open credit line');
        return;
      }
      setOpenResult({
        depositAddress: d.depositAddress,
        creditLimitUsd: d.creditLimitUsd,
        collateralAsset: d.collateralAsset,
        collateralAmount: d.collateralAmount,
        ltvRatio: d.ltvRatio,
      });
      fetchStatus(address);
    } catch {
      setOpenError('Network error — please try again');
    } finally {
      setOpenLoading(false);
    }
  };

  const handleDraw = async () => {
    if (!address) return;
    setDrawLoading(true);
    setDrawError('');
    setDrawSuccess('');
    try {
      const res = await fetch('/api/credit/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, amountUsd: drawAmount }),
      });
      const d = await res.json();
      if (!res.ok) {
        setDrawError(d.error || 'Draw failed');
        return;
      }
      setDrawSuccess(d.message || 'Draw initiated');
      setDrawAmount('');
      fetchStatus(address);
    } catch {
      setDrawError('Network error — please try again');
    } finally {
      setDrawLoading(false);
    }
  };

  const handleRepay = async () => {
    if (!address) return;
    setRepayLoading(true);
    setRepayError('');
    setRepaySuccess('');
    try {
      const res = await fetch('/api/credit/repay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, amountUsd: repayAmount }),
      });
      const d = await res.json();
      if (!res.ok) {
        setRepayError(d.error || 'Repay failed');
        return;
      }
      setRepaySuccess(d.message || 'Repayment intent recorded');
      setRepayAmount('');
      fetchStatus(address);
    } catch {
      setRepayError('Network error — please try again');
    } finally {
      setRepayLoading(false);
    }
  };

  if (!mounted) {
    return (
      <DesignLawLayout>
        <div className="bg-dl-bg" style={{ minHeight: '60vh' }} />
      </DesignLawLayout>
    );
  }

  return (
    <DesignLawLayout>

      {/* ── HERO ── */}
      <div className="bg-dl-navy -mx-6 -mt-8 mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="px-10 py-16 lg:py-24 flex flex-col justify-center">
            <p className="font-dl-mono text-xs uppercase tracking-widest mb-4" style={{ color: '#b8860b' }}>
              Axiom Nexus · Credit Products
            </p>
            <h1 className="font-dl-serif text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
              Your Crypto.<br />Your Credit Line.
            </h1>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.78)', maxWidth: '480px' }}>
              Deposit Bitcoin, Ethereum, or AXUSD as collateral and access USD liquidity immediately —
              no credit check, no income verification, no taxable event.
              The institutional-grade secured lending product, now available to the Axiom community.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#credit-dashboard" className="font-dl-mono text-xs uppercase tracking-wider px-6 py-3 font-bold border border-white text-white hover:bg-white hover:text-dl-navy transition-none">
                Open a Credit Line
              </a>
              <a href="/banking/my-account" className="font-dl-mono text-xs uppercase tracking-wider px-6 py-3 font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                My Nexus Account →
              </a>
            </div>
          </div>
          <div className="relative" style={{ minHeight: '320px' }}>
            <Image
              src="/images/products/credit-hero.png"
              alt="Crypto-backed credit line — Bitcoin and Ethereum as collateral"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              priority
            />
          </div>
        </div>
      </div>

      {/* ── TRUST BAR ── */}
      <div className="border border-dl-border mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="px-6 py-5 border-b md:border-b-0 md:border-r border-dl-border">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">BTC / ETH Collateral</p>
            <p className="font-dl-serif text-lg text-dl-forest font-bold mb-1">50% Loan-to-Value</p>
            <p className="text-dl-gray text-xs leading-relaxed">Deposit $10,000 in Bitcoin or Ethereum and receive up to $5,000 in USD credit — priced at the rate of on-chain confirmation.</p>
          </div>
          <div className="px-6 py-5 border-b md:border-b-0 md:border-r border-dl-border">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">AXUSD Collateral</p>
            <p className="font-dl-serif text-lg text-dl-navy font-bold mb-1">80% Loan-to-Value</p>
            <p className="text-dl-gray text-xs leading-relaxed">The highest LTV available. Deposit AXUSD and access 80 cents of credit for every dollar deposited — ideal for short-term liquidity needs.</p>
          </div>
          <div className="px-6 py-5">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">Interest Rate</p>
            <p className="font-dl-serif text-lg text-dl-navy font-bold mb-1">8.0% APR</p>
            <p className="text-dl-gray text-xs leading-relaxed">Fixed annual rate on the outstanding drawn balance. No origination fee, no prepayment penalty. Interest accrues only on drawn funds.</p>
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div className="mb-12">
        <div className="mb-8">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">What Makes This Different</p>
          <h2 className="font-dl-serif text-3xl text-dl-navy font-bold">Liquidity Without<br />Selling Your Assets.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
          {[
            {
              title: 'No Credit Check Required',
              desc: 'Your credit score is irrelevant. The collateral you deposit secures the line — period. First-time borrowers and participants with thin credit files get the same access as anyone else.',
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-dl-forest">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ),
            },
            {
              title: 'No Taxable Event',
              desc: 'Selling BTC or ETH to access cash triggers a capital gains tax event. Borrowing against your crypto is not a sale — you keep your position and your tax efficiency intact.',
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-dl-forest">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              ),
            },
            {
              title: 'Real-Time Collateral Health',
              desc: 'Your dashboard shows a live LTV ratio updated against current market prices. A green health bar turns yellow at 70% LTV (email warning) and red at 85% LTV (review threshold). You always know where you stand.',
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-dl-navy">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              ),
            },
            {
              title: 'Institutional-Grade Custody',
              desc: 'Your collateral is held in a BitGo institutional custody wallet — the same custody platform used by exchanges, hedge funds, and crypto-native banks. Multi-party authorization protects every asset movement.',
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-dl-gold">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              ),
            },
          ].map((f, i) => (
            <div key={f.title} className={`px-7 py-7 flex gap-5 ${i < 2 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'md:border-r border-dl-border' : ''}`}>
              <div className="shrink-0 mt-0.5">{f.icon}</div>
              <div>
                <p className="font-dl-serif text-lg text-dl-navy font-bold mb-2">{f.title}</p>
                <p className="text-dl-gray text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 border border-dl-border overflow-hidden">
          <div className="px-8 py-10 bg-dl-bg">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-6">How It Works</p>
            <div className="space-y-8">
              {[
                {
                  step: '01',
                  title: 'Deposit Collateral',
                  desc: 'Choose BTC, ETH, or AXUSD and enter your collateral amount. A BitGo deposit address is generated. Send your crypto to that address from any wallet.',
                },
                {
                  step: '02',
                  title: 'Credit Line Activates',
                  desc: 'Once your deposit confirms on-chain (typically 1–6 confirmations), your credit line activates automatically. No manual approval, no waiting.',
                },
                {
                  step: '03',
                  title: 'Draw USD Funds',
                  desc: 'Draw any amount up to your credit limit. Funds are sent via ACH to your registered bank account within 1–3 business days. Repay at any time to release collateral.',
                },
              ].map(s => (
                <div key={s.step} className="flex gap-5">
                  <div className="shrink-0">
                    <p className="font-dl-mono text-2xl font-bold" style={{ color: '#b8860b' }}>{s.step}</p>
                  </div>
                  <div>
                    <p className="font-dl-serif text-base text-dl-navy font-bold mb-1">{s.title}</p>
                    <p className="text-dl-gray text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden lg:block" style={{ minHeight: '400px' }}>
            <Image
              src="/images/products/collateral-visual.png"
              alt="Bitcoin and Ethereum as crypto collateral on a digital scale"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>
        </div>
      </div>

      {/* ── RISK DISCLOSURE ── */}
      <div className="border border-dl-border mb-12 px-6 py-5">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-3">Risk Disclosure</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-dl-navy text-sm font-semibold mb-1">Liquidation Threshold: 85% LTV</p>
            <p className="text-dl-gray text-xs leading-relaxed">If your collateral value falls and your LTV exceeds 85%, your account is flagged for liquidation review by Axiom Operations. You will be notified at 70% LTV via email to add collateral or repay.</p>
          </div>
          <div>
            <p className="text-dl-navy text-sm font-semibold mb-1">Collateral Price Risk</p>
            <p className="text-dl-gray text-xs leading-relaxed">BTC and ETH values fluctuate. A 30% price drop on $10,000 in BTC collateral at 50% LTV would raise your LTV from 50% to ~71% — approaching the warning threshold.</p>
          </div>
          <div>
            <p className="text-dl-navy text-sm font-semibold mb-1">Manual Liquidation Only</p>
            <p className="text-dl-gray text-xs leading-relaxed">Axiom does not perform automated liquidation. All reviews are conducted manually by Operations. This protects participants from flash liquidations due to temporary price volatility.</p>
          </div>
        </div>
      </div>

      {/* ── CREDIT DASHBOARD ── */}
      <div id="credit-dashboard">
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Your Account</p>
          <h2 className="font-dl-serif text-2xl text-dl-navy font-bold">Your Credit Line Dashboard</h2>
        </div>
      </div>

      <div className="space-y-6">

        {!isConnected && (
          <div className="border border-dl-border p-8 text-center">
            <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-3">Wallet Required</p>
            <p className="text-dl-gray text-sm mb-4">Connect your wallet to view or open a credit line.</p>
            <p className="text-dl-gray text-xs">Use the Connect Wallet button in the top navigation.</p>
          </div>
        )}

        {isConnected && needsSignIn && (
          <div className="border border-dl-navy p-6">
            <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-2">Wallet Verification Required</p>
            <p className="text-dl-gray text-sm mb-4 leading-relaxed">
              To protect your account, Axiom requires a one-time wallet signature to verify ownership before accessing your credit line. This does not cost gas and does not move any funds.
            </p>
            {signInError && <p className="text-red-700 text-xs font-dl-mono mb-3">{signInError}</p>}
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="border border-dl-navy bg-dl-navy text-white px-5 py-2.5 text-xs font-bold font-dl-mono uppercase tracking-wider hover:bg-dl-bg hover:text-dl-navy disabled:opacity-50"
            >
              {signingIn ? 'Waiting for signature...' : 'Sign In with Wallet'}
            </button>
          </div>
        )}

        {isConnected && !needsSignIn && loading && (
          <div className="border border-dl-border p-8 text-center">
            <p className="font-dl-mono text-xs text-dl-gray animate-pulse">Loading credit status...</p>
          </div>
        )}

        {isConnected && !needsSignIn && error && (
          <div className="border border-red-300 p-4">
            <p className="text-sm text-red-700 font-dl-mono">{error}</p>
          </div>
        )}

        {isConnected && !needsSignIn && !loading && status && (
          <div className="space-y-6">

            {/* ── No line yet ── */}
            {!status.hasLine && view === 'dashboard' && (
              <div className="border border-dl-border p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-dl-navy flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-dl-serif text-xl text-dl-navy font-bold">No Credit Line Open</p>
                    <p className="text-dl-gray text-sm">Deposit crypto as collateral to get started — no credit check required.</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-0 border border-dl-border mb-6">
                  <div className="px-5 py-4 border-r border-dl-border">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">BTC / ETH</p>
                    <p className="font-dl-mono text-lg text-dl-navy font-bold">50% LTV</p>
                  </div>
                  <div className="px-5 py-4 border-r border-dl-border">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">AXUSD</p>
                    <p className="font-dl-mono text-lg text-dl-forest font-bold">80% LTV</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Interest Rate</p>
                    <p className="font-dl-mono text-lg text-dl-navy font-bold">8.0% APR</p>
                  </div>
                </div>
                <button
                  onClick={() => setView('open')}
                  className="border border-dl-navy bg-dl-navy text-white px-8 py-3 text-sm font-bold font-dl-mono uppercase tracking-wider hover:bg-dl-bg hover:text-dl-navy"
                >
                  Open a Credit Line
                </button>
              </div>
            )}

            {/* ── Open Line Form ── */}
            {view === 'open' && !openResult && (
              <div className="border border-dl-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <p className="font-dl-serif text-lg text-dl-navy font-bold">Open a Credit Line</p>
                  <button onClick={() => setView('dashboard')} className="font-dl-mono text-xs text-dl-gray uppercase hover:text-dl-navy">← Back</button>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-3">Collateral Asset</label>
                    <div className="grid grid-cols-3 gap-0 border border-dl-border">
                      {(['BTC', 'ETH', 'AXUSD'] as const).map((asset, i) => (
                        <button
                          key={asset}
                          onClick={() => setOpenAsset(asset)}
                          className={`p-4 text-sm font-dl-mono ${i < 2 ? 'border-r border-dl-border' : ''} ${
                            openAsset === asset
                              ? 'bg-dl-navy text-white'
                              : 'text-dl-navy hover:bg-dl-bg'
                          }`}
                        >
                          <div className="font-bold">{asset}</div>
                          <div className={`text-xs mt-0.5 ${openAsset === asset ? 'opacity-70' : 'text-dl-gray'}`}>
                            {LTV_RATIOS[asset]}% LTV
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">
                      Collateral Amount ({openAsset})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={openAmount}
                      onChange={e => setOpenAmount(e.target.value)}
                      placeholder={`e.g. 0.5 ${openAsset}`}
                      className="w-full border border-dl-border px-4 py-3 text-sm font-dl-mono focus:outline-none focus:border-dl-navy"
                    />
                  </div>

                  {openAmount && parseFloat(openAmount) > 0 && (
                    <div className="border border-dl-border bg-dl-bg px-5 py-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-dl-gray">Collateral</span>
                        <span className="font-dl-mono font-bold text-dl-navy">{openAmount} {openAsset}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-dl-gray">LTV Ratio</span>
                        <span className="font-dl-mono text-dl-navy">{LTV_RATIOS[openAsset]}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-dl-gray">Interest Rate</span>
                        <span className="font-dl-mono text-dl-navy">8.0% APR</span>
                      </div>
                      <p className="font-dl-mono text-xs text-dl-gray pt-1">
                        Credit limit calculated from USD value at on-chain confirmation.
                      </p>
                    </div>
                  )}

                  {openError && <p className="text-red-700 text-xs font-dl-mono">{openError}</p>}

                  <button
                    onClick={handleOpen}
                    disabled={openLoading || !openAmount || parseFloat(openAmount) <= 0}
                    className="w-full border border-dl-navy bg-dl-navy text-white py-3 text-sm font-bold font-dl-mono uppercase tracking-wider hover:bg-dl-bg hover:text-dl-navy disabled:opacity-50"
                  >
                    {openLoading ? 'Generating Deposit Address...' : 'Continue — Generate Deposit Address'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Deposit Address (after open) ── */}
            {view === 'open' && openResult && (
              <div className="border border-dl-border p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="font-dl-serif text-lg text-dl-navy font-bold">Send Collateral</p>
                  <button onClick={() => { setView('dashboard'); setOpenResult(null); }} className="font-dl-mono text-xs text-dl-gray uppercase hover:text-dl-navy">← Back</button>
                </div>
                <p className="text-sm text-dl-gray mb-5 leading-relaxed">
                  Send exactly <strong className="font-dl-mono text-dl-navy">{openResult.collateralAmount} {openResult.collateralAsset}</strong> to the address below. Your credit line activates automatically after on-chain confirmation.
                </p>
                <div className="flex gap-6 flex-col sm:flex-row items-start sm:items-center mb-5">
                  <QRCode value={openResult.depositAddress} />
                  <div className="flex-1">
                    <div className="border border-dl-border bg-dl-bg px-5 py-4 mb-3">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">Deposit Address ({openResult.collateralAsset})</p>
                      <p className="font-dl-mono text-sm text-dl-navy break-all select-all">{openResult.depositAddress}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard?.writeText(openResult.depositAddress)}
                      className="border border-dl-border text-dl-gray px-4 py-2 text-xs font-dl-mono uppercase hover:border-dl-navy hover:text-dl-navy"
                    >
                      Copy Address
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-0 border border-dl-border mb-5">
                  <div className="px-5 py-4 border-r border-dl-border">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Est. Credit Limit</p>
                    <p className="font-dl-mono font-bold text-dl-navy text-base">{fmtUsd(openResult.creditLimitUsd)}</p>
                    <p className="font-dl-mono text-xs text-dl-gray mt-0.5">based on value at confirmation</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">LTV Ratio</p>
                    <p className="font-dl-mono font-bold text-dl-navy text-base">{openResult.ltvRatio}%</p>
                    <p className="font-dl-mono text-xs text-dl-gray mt-0.5">Warning 70% · Liquidation 85%</p>
                  </div>
                </div>
                <div className="border border-dl-gold px-5 py-4">
                  <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-wider mb-1">Awaiting On-Chain Confirmation</p>
                  <p className="text-dl-gray text-xs leading-relaxed">Your credit line activates automatically once your deposit is confirmed (typically 1–6 block confirmations). You will receive an email when it is active.</p>
                </div>
              </div>
            )}

            {/* ── Pending collateral state ── */}
            {status.hasLine && status.line?.status === 'pending_collateral' && view === 'dashboard' && (
              <div className="border border-dl-border p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="font-dl-serif text-lg text-dl-navy font-bold">Awaiting Collateral Deposit</p>
                  <span className={`text-xs border px-2 py-1 font-dl-mono uppercase ${statusColors['pending_collateral']}`}>
                    {statusLabels['pending_collateral']}
                  </span>
                </div>
                <p className="text-sm text-dl-gray mb-5 leading-relaxed">
                  Send <strong className="font-dl-mono text-dl-navy">{status.line.collateralAmountRaw} {status.line.collateralAsset}</strong> to the address below to activate your credit line.
                </p>
                {status.line.depositAddress && (
                  <>
                    <div className="flex gap-6 flex-col sm:flex-row items-start sm:items-center mb-5">
                      <QRCode value={status.line.depositAddress} />
                      <div className="flex-1">
                        <div className="border border-dl-border bg-dl-bg px-5 py-4 mb-3">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">Deposit Address ({status.line.collateralAsset})</p>
                          <p className="font-dl-mono text-sm text-dl-navy break-all select-all">{status.line.depositAddress}</p>
                        </div>
                        <button
                          onClick={() => navigator.clipboard?.writeText(status.line!.depositAddress!)}
                          className="border border-dl-border text-dl-gray px-4 py-2 text-xs font-dl-mono uppercase hover:border-dl-navy hover:text-dl-navy"
                        >
                          Copy Address
                        </button>
                      </div>
                    </div>
                    <div className="mb-5">
                      <ConfirmationTimer openedAt={status.line.openedAt} />
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-0 border border-dl-border">
                  <div className="px-5 py-4 border-r border-dl-border">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Estimated Credit Limit</p>
                    <p className="font-dl-mono font-bold text-dl-navy text-base">{fmtUsd(status.line.creditLimitUsd)}</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase mb-1">Interest Rate</p>
                    <p className="font-dl-mono font-bold text-dl-navy text-base">{status.line.interestRatePct}% APR</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Active credit line dashboard ── */}
            {status.hasLine && status.line && ['active', 'warning', 'flagged'].includes(status.line.status) && view === 'dashboard' && (
              <div className="space-y-5">
                {status.line.status === 'warning' && (
                  <div className="border border-amber-400 px-5 py-4">
                    <p className="font-dl-mono text-xs text-amber-700 uppercase tracking-wider mb-1">Warning — LTV Approaching Limit</p>
                    <p className="text-amber-800 text-sm">Your LTV ratio is approaching the liquidation threshold. Add collateral or repay part of your balance to restore your account health.</p>
                  </div>
                )}
                {status.line.status === 'flagged' && (
                  <div className="border border-red-400 px-5 py-4">
                    <p className="font-dl-mono text-xs text-red-700 uppercase tracking-wider mb-1">Action Required — Flagged for Review</p>
                    <p className="text-red-800 text-sm">Your account has been flagged for liquidation review. Please contact Axiom Operations or repay your balance immediately.</p>
                  </div>
                )}

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-dl-border">
                  <div className="px-5 py-5 border-b sm:border-b-0 sm:border-r border-dl-border">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase mb-2">Collateral</p>
                    <p className="font-dl-mono font-bold text-dl-navy text-base">{status.line.collateralAmountRaw}</p>
                    <p className="font-dl-mono text-xs text-dl-gray">{status.line.collateralAsset}</p>
                    {status.collateralValueUsd && (
                      <p className="font-dl-mono text-xs text-dl-gray mt-0.5">{fmtUsd(status.collateralValueUsd)}</p>
                    )}
                  </div>
                  <div className="px-5 py-5 border-b sm:border-b-0 sm:border-r border-dl-border">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase mb-2">Credit Limit</p>
                    <p className="font-dl-mono font-bold text-dl-navy text-base">{fmtUsd(status.line.creditLimitUsd)}</p>
                  </div>
                  <div className="px-5 py-5 sm:border-r border-dl-border">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase mb-2">Drawn</p>
                    <p className="font-dl-mono font-bold text-dl-navy text-base">{fmtUsd(status.line.drawnAmountUsd)}</p>
                  </div>
                  <div className="px-5 py-5">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase mb-2">Available</p>
                    <p className={`font-dl-mono font-bold text-base ${parseFloat(status.line.availableCreditUsd) > 0 ? 'text-dl-forest' : 'text-red-700'}`}>
                      {fmtUsd(status.line.availableCreditUsd)}
                    </p>
                  </div>
                </div>

                {/* Health bar */}
                <div className="border border-dl-border px-6 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-dl-serif text-base text-dl-navy font-bold">Collateral Health</p>
                    <span className={`text-xs border px-2 py-1 font-dl-mono uppercase ${statusColors[status.line.status]}`}>
                      {statusLabels[status.line.status]}
                    </span>
                  </div>
                  <HealthBar ltvRatio={status.ltvRatio} healthStatus={status.healthStatus} />
                  {status.priceUsd && (
                    <p className="font-dl-mono text-xs text-dl-gray mt-3">
                      Current {status.line.collateralAsset} price: ${parseFloat(status.priceUsd).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-0 border border-dl-border">
                  <button
                    onClick={() => { setView('draw'); setDrawSuccess(''); setDrawError(''); }}
                    disabled={parseFloat(status.line.availableCreditUsd) <= 0 || status.line.status === 'flagged'}
                    className="border-r border-dl-border py-4 text-sm font-bold font-dl-mono uppercase text-dl-navy hover:bg-dl-navy hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Draw Funds
                  </button>
                  <button
                    onClick={() => { setView('repay'); setRepaySuccess(''); setRepayError(''); }}
                    disabled={parseFloat(status.line.drawnAmountUsd) <= 0}
                    className="py-4 text-sm font-bold font-dl-mono uppercase text-dl-gray hover:text-dl-navy disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Repay Balance
                  </button>
                </div>

                {/* Transaction history */}
                <div className="border border-dl-border px-6 py-5">
                  <p className="font-dl-serif text-base text-dl-navy font-bold mb-4">Transaction History</p>
                  <TransactionHistory walletAddress={status.line.participantWallet} />
                </div>
              </div>
            )}

            {/* ── Draw Funds Form ── */}
            {view === 'draw' && status.hasLine && status.line && (
              <div className="border border-dl-border p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="font-dl-serif text-lg text-dl-navy font-bold">Draw Funds</p>
                  <button onClick={() => setView('dashboard')} className="font-dl-mono text-xs text-dl-gray uppercase hover:text-dl-navy">← Back</button>
                </div>
                {drawSuccess ? (
                  <div className="border border-dl-forest px-5 py-4">
                    <p className="font-dl-mono text-xs text-dl-forest uppercase tracking-wider mb-1">Transfer Initiated</p>
                    <p className="text-dl-gray text-sm mb-3">{drawSuccess}</p>
                    <button onClick={() => setView('dashboard')} className="font-dl-mono text-xs text-dl-navy uppercase hover:text-dl-forest">← Back to Dashboard</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border border-dl-border bg-dl-bg px-5 py-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-dl-gray">Available Credit</span>
                        <span className="font-mono font-bold text-dl-navy">{fmtUsd(status.line.availableCreditUsd)}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">Amount (USD)</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={drawAmount}
                        onChange={e => setDrawAmount(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full border border-dl-border px-4 py-3 text-sm font-dl-mono focus:outline-none focus:border-dl-navy"
                      />
                    </div>
                    <p className="font-dl-mono text-xs text-dl-gray leading-relaxed">
                      Funds are sent via ACH to your registered bank account within 1–3 business days.
                      A registered bank account is required to draw funds.
                    </p>
                    {drawError && <p className="text-red-700 text-xs font-dl-mono">{drawError}</p>}
                    <button
                      onClick={handleDraw}
                      disabled={drawLoading || !drawAmount || parseFloat(drawAmount) < 1}
                      className="w-full border border-dl-navy bg-dl-navy text-white py-3 text-sm font-bold font-dl-mono uppercase tracking-wider hover:bg-dl-bg hover:text-dl-navy disabled:opacity-50"
                    >
                      {drawLoading ? 'Initiating ACH Transfer...' : `Draw ${drawAmount ? fmtUsd(drawAmount) : 'Funds'}`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Repay Form ── */}
            {view === 'repay' && status.hasLine && status.line && (
              <div className="border border-dl-border p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="font-dl-serif text-lg text-dl-navy font-bold">Repay Balance</p>
                  <button onClick={() => setView('dashboard')} className="font-dl-mono text-xs text-dl-gray uppercase hover:text-dl-navy">← Back</button>
                </div>
                {repaySuccess ? (
                  <div className="border border-dl-forest px-5 py-4">
                    <p className="font-dl-mono text-xs text-dl-forest uppercase tracking-wider mb-1">Repayment Intent Recorded</p>
                    <p className="text-dl-gray text-sm mb-3">{repaySuccess}</p>
                    <button onClick={() => setView('dashboard')} className="font-dl-mono text-xs text-dl-navy uppercase hover:text-dl-forest">← Back to Dashboard</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border border-dl-border bg-dl-bg px-5 py-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-dl-gray">Outstanding Balance</span>
                        <span className="font-dl-mono font-bold text-dl-navy">{fmtUsd(status.line.drawnAmountUsd)}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">Repayment Amount (USD)</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={repayAmount}
                        onChange={e => setRepayAmount(e.target.value)}
                        placeholder="e.g. 250"
                        className="w-full border border-dl-border px-4 py-3 text-sm font-dl-mono focus:outline-none focus:border-dl-navy"
                      />
                    </div>
                    <div className="border border-dl-gold px-5 py-4">
                      <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-wider mb-2">How Repayment Works</p>
                      <p className="text-dl-gray text-xs leading-relaxed">
                        Your repayment intent is recorded here. Send payment via ACH or wire to Axiom Protocol LLC.
                        Your drawn balance and proportional collateral release will be updated once Operations confirms receipt.
                      </p>
                    </div>
                    {repayError && <p className="text-red-700 text-xs font-dl-mono">{repayError}</p>}
                    <button
                      onClick={handleRepay}
                      disabled={repayLoading || !repayAmount || parseFloat(repayAmount) < 1}
                      className="w-full border border-dl-navy bg-dl-navy text-white py-3 text-sm font-bold font-dl-mono uppercase tracking-wider hover:bg-dl-bg hover:text-dl-navy disabled:opacity-50"
                    >
                      {repayLoading ? 'Recording Repayment Intent...' : `Record Repayment of ${repayAmount ? fmtUsd(repayAmount) : 'Balance'}`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Dashboard info footer ── */}
            {view === 'dashboard' && (
              <div className="border border-dl-border px-6 py-5">
                <p className="font-dl-serif text-base text-dl-navy font-bold mb-4">Quick Reference</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  {[
                    'Deposit BTC, ETH, or AXUSD as collateral — held in BitGo institutional custody.',
                    'Receive a USD credit line at 50% LTV (BTC/ETH) or 80% LTV (AXUSD).',
                    'Draw funds via ACH to your registered bank account at any time.',
                    'Repay at any time — ops confirms payment and releases proportional collateral.',
                    'LTV warning email at 70%. Liquidation review threshold at 85%.',
                    'Interest rate is 8% APR on drawn balance only — no origination fee.',
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2 text-xs text-dl-gray leading-relaxed">
                      <span className="text-dl-gold shrink-0 font-bold font-dl-mono">{i + 1}.</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <p className="font-dl-mono text-xs text-dl-gray mt-5 pt-4 border-t border-dl-border">
                  Provided for liquidity purposes only. No credit reporting or FICO scoring. Liquidation at 85% LTV is a manual Operations review process — not automated.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}
