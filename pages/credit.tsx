import { useState, useEffect, useCallback, useRef } from 'react';
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
        <div className="min-h-screen bg-dl-bg" />
      </DesignLawLayout>
    );
  }

  return (
    <DesignLawLayout>
      <div className="min-h-screen bg-dl-bg text-dl-navy px-4 py-16 max-w-3xl mx-auto">

        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-dl-gray font-mono mb-2">Axiom Protocol</p>
          <h1 className="text-3xl font-bold text-dl-navy mb-2">Crypto-Backed Credit Line</h1>
          <p className="text-dl-gray text-sm leading-relaxed max-w-xl">
            Deposit BTC, ETH, or AXUSD as collateral and access USD liquidity — no credit check, no taxable event.
            The Nexo/BlockFi product built for the Axiom community.
          </p>
        </div>

        {!isConnected && (
          <div className="border border-dl-border rounded-lg p-6 bg-white text-center">
            <p className="text-dl-gray text-sm mb-4">Connect your wallet to view or open a credit line.</p>
            <p className="text-xs text-dl-gray/60">Use the "Connect Wallet" button in the navigation above.</p>
          </div>
        )}

        {isConnected && needsSignIn && (
          <div className="border border-dl-border rounded-lg p-6 bg-white text-center">
            <p className="text-dl-navy font-medium mb-2">Wallet Sign-In Required</p>
            <p className="text-dl-gray text-sm mb-4">Sign a message with your wallet to access your credit line.</p>
            {signInError && <p className="text-red-600 text-xs mb-4">{signInError}</p>}
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="bg-dl-navy text-white px-6 py-2 rounded text-sm font-medium hover:bg-dl-navy/90 disabled:opacity-50"
            >
              {signingIn ? 'Signing…' : 'Sign In with Wallet'}
            </button>
          </div>
        )}

        {isConnected && !needsSignIn && loading && (
          <div className="text-dl-gray text-sm py-8 text-center font-mono">Loading credit status…</div>
        )}

        {isConnected && !needsSignIn && error && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-red-700 text-sm">{error}</div>
        )}

        {isConnected && !needsSignIn && !loading && status && (
          <div className="space-y-6">

            {/* ── No line yet ── */}
            {!status.hasLine && view === 'dashboard' && (
              <div className="border border-dl-border rounded-lg p-8 bg-white text-center">
                <div className="w-16 h-16 border-2 border-dl-border rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                  🔐
                </div>
                <h2 className="text-xl font-semibold text-dl-navy mb-2">No Credit Line Open</h2>
                <p className="text-dl-gray text-sm mb-2 max-w-sm mx-auto">
                  Deposit crypto as collateral and receive a USD credit line — no credit check required.
                </p>
                <div className="mt-4 mb-6 grid grid-cols-3 gap-3 text-center text-xs text-dl-gray">
                  <div className="border border-dl-border rounded p-3">
                    <div className="font-bold text-dl-navy font-mono">50% LTV</div>
                    <div>BTC / ETH</div>
                  </div>
                  <div className="border border-dl-border rounded p-3">
                    <div className="font-bold text-dl-navy font-mono">80% LTV</div>
                    <div>AXUSD</div>
                  </div>
                  <div className="border border-dl-border rounded p-3">
                    <div className="font-bold text-dl-navy font-mono">8% APR</div>
                    <div>Interest Rate</div>
                  </div>
                </div>
                <button
                  onClick={() => setView('open')}
                  className="bg-dl-navy text-white px-8 py-3 rounded text-sm font-semibold hover:bg-dl-navy/90"
                >
                  Open a Credit Line
                </button>
              </div>
            )}

            {/* ── Open Line Form ── */}
            {view === 'open' && !openResult && (
              <div className="border border-dl-border rounded-lg p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-dl-navy">Open a Credit Line</h2>
                  <button onClick={() => setView('dashboard')} className="text-dl-gray text-xs hover:text-dl-navy">← Back</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-dl-gray uppercase tracking-wide mb-1">
                      Collateral Asset
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['BTC', 'ETH', 'AXUSD'] as const).map(asset => (
                        <button
                          key={asset}
                          onClick={() => setOpenAsset(asset)}
                          className={`border rounded p-3 text-sm font-medium transition-colors ${
                            openAsset === asset
                              ? 'border-dl-navy bg-dl-navy text-white'
                              : 'border-dl-border text-dl-navy hover:border-dl-navy/50'
                          }`}
                        >
                          <div className="font-bold">{asset}</div>
                          <div className={`text-xs mt-0.5 ${openAsset === asset ? 'text-white/70' : 'text-dl-gray'}`}>
                            {LTV_RATIOS[asset]}% LTV
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-dl-gray uppercase tracking-wide mb-1">
                      Collateral Amount ({openAsset})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={openAmount}
                      onChange={e => setOpenAmount(e.target.value)}
                      placeholder={`e.g. 0.5 ${openAsset}`}
                      className="w-full border border-dl-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-dl-navy"
                    />
                  </div>

                  {openAmount && parseFloat(openAmount) > 0 && (
                    <div className="bg-dl-bg rounded p-4 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-dl-gray">Collateral</span>
                        <span className="font-mono font-medium">{openAmount} {openAsset}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dl-gray">LTV Ratio</span>
                        <span className="font-mono">{LTV_RATIOS[openAsset]}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dl-gray">Interest Rate</span>
                        <span className="font-mono">8.0% APR</span>
                      </div>
                      <div className="text-xs text-dl-gray/60 mt-2">
                        Credit limit is calculated from USD value at time of on-chain confirmation.
                      </div>
                    </div>
                  )}

                  {openError && <p className="text-red-600 text-xs">{openError}</p>}

                  <button
                    onClick={handleOpen}
                    disabled={openLoading || !openAmount || parseFloat(openAmount) <= 0}
                    className="w-full bg-dl-navy text-white py-3 rounded text-sm font-semibold hover:bg-dl-navy/90 disabled:opacity-50"
                  >
                    {openLoading ? 'Generating Deposit Address…' : 'Continue'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Deposit Address (after open) ── */}
            {view === 'open' && openResult && (
              <div className="border border-dl-border rounded-lg p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-dl-navy">Send Collateral</h2>
                  <button onClick={() => { setView('dashboard'); setOpenResult(null); }} className="text-dl-gray text-xs hover:text-dl-navy">← Back</button>
                </div>
                <p className="text-sm text-dl-gray mb-4">
                  Send exactly <strong className="font-mono text-dl-navy">{openResult.collateralAmount} {openResult.collateralAsset}</strong> to the address below to activate your credit line.
                </p>
                <div className="flex gap-6 flex-col sm:flex-row items-start sm:items-center mb-4">
                  <QRCode value={openResult.depositAddress} />
                  <div className="flex-1">
                    <div className="bg-dl-bg rounded p-4">
                      <p className="text-xs text-dl-gray uppercase tracking-wide mb-1">Deposit Address ({openResult.collateralAsset})</p>
                      <p className="font-mono text-sm text-dl-navy break-all select-all">{openResult.depositAddress}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard?.writeText(openResult.depositAddress)}
                      className="mt-2 text-xs text-dl-navy hover:underline font-mono"
                    >
                      Copy address
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="border border-dl-border rounded p-3">
                    <div className="text-xs text-dl-gray mb-1">Est. Credit Limit</div>
                    <div className="font-bold font-mono text-dl-navy">{fmtUsd(openResult.creditLimitUsd)}</div>
                    <div className="text-xs text-dl-gray/60 mt-0.5">based on value at confirmation</div>
                  </div>
                  <div className="border border-dl-border rounded p-3">
                    <div className="text-xs text-dl-gray mb-1">LTV Ratio</div>
                    <div className="font-bold font-mono text-dl-navy">{openResult.ltvRatio}%</div>
                    <div className="text-xs text-dl-gray/60 mt-0.5">Warning 70% · Liq. 85%</div>
                  </div>
                </div>
                <p className="text-xs text-dl-gray/60 bg-amber-50 border border-amber-100 rounded p-3">
                  Your credit line will be activated automatically once your deposit is confirmed on-chain (typically within 1–6 confirmations).
                </p>
              </div>
            )}

            {/* ── Pending collateral state ── */}
            {status.hasLine && status.line?.status === 'pending_collateral' && view === 'dashboard' && (
              <div className="border border-dl-border rounded-lg p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-dl-navy">Awaiting Collateral Deposit</h2>
                  <span className={`text-xs border px-2 py-1 rounded font-mono ${statusColors['pending_collateral']}`}>
                    {statusLabels['pending_collateral']}
                  </span>
                </div>
                <p className="text-sm text-dl-gray mb-4">
                  Send <strong className="font-mono text-dl-navy">{status.line.collateralAmountRaw} {status.line.collateralAsset}</strong> to the address below.
                </p>
                {status.line.depositAddress && (
                  <>
                    <div className="flex gap-6 flex-col sm:flex-row items-start sm:items-center mb-4">
                      <QRCode value={status.line.depositAddress} />
                      <div className="flex-1">
                        <div className="bg-dl-bg rounded p-4">
                          <p className="text-xs text-dl-gray uppercase tracking-wide mb-1">Deposit Address ({status.line.collateralAsset})</p>
                          <p className="font-mono text-sm text-dl-navy break-all select-all">{status.line.depositAddress}</p>
                        </div>
                        <button
                          onClick={() => navigator.clipboard?.writeText(status.line!.depositAddress!)}
                          className="mt-2 text-xs text-dl-navy hover:underline font-mono"
                        >
                          Copy address
                        </button>
                      </div>
                    </div>
                    <div className="mb-4">
                      <ConfirmationTimer openedAt={status.line.openedAt} />
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="border border-dl-border rounded p-3">
                    <div className="text-xs text-dl-gray mb-1">Estimated Credit Limit</div>
                    <div className="font-bold font-mono text-dl-navy">{fmtUsd(status.line.creditLimitUsd)}</div>
                  </div>
                  <div className="border border-dl-border rounded p-3">
                    <div className="text-xs text-dl-gray mb-1">Interest Rate</div>
                    <div className="font-bold font-mono text-dl-navy">{status.line.interestRatePct}% APR</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Active credit line dashboard ── */}
            {status.hasLine && status.line && ['active', 'warning', 'flagged'].includes(status.line.status) && view === 'dashboard' && (
              <div className="space-y-4">
                {status.line.status === 'warning' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                    <strong>Warning:</strong> Your LTV ratio is approaching the liquidation threshold. Add collateral or repay part of your balance.
                  </div>
                )}
                {status.line.status === 'flagged' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                    <strong>Action Required:</strong> Your account has been flagged for liquidation review. Please contact support or repay your balance immediately.
                  </div>
                )}

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="border border-dl-border rounded-lg p-4 bg-white">
                    <div className="text-xs text-dl-gray uppercase tracking-wide mb-1">Collateral</div>
                    <div className="font-bold font-mono text-dl-navy">{status.line.collateralAmountRaw}</div>
                    <div className="text-xs text-dl-gray/70">{status.line.collateralAsset}</div>
                    {status.collateralValueUsd && (
                      <div className="text-xs text-dl-gray/60 mt-0.5">{fmtUsd(status.collateralValueUsd)} USD</div>
                    )}
                  </div>
                  <div className="border border-dl-border rounded-lg p-4 bg-white">
                    <div className="text-xs text-dl-gray uppercase tracking-wide mb-1">Credit Limit</div>
                    <div className="font-bold font-mono text-dl-navy">{fmtUsd(status.line.creditLimitUsd)}</div>
                  </div>
                  <div className="border border-dl-border rounded-lg p-4 bg-white">
                    <div className="text-xs text-dl-gray uppercase tracking-wide mb-1">Drawn</div>
                    <div className="font-bold font-mono text-dl-navy">{fmtUsd(status.line.drawnAmountUsd)}</div>
                  </div>
                  <div className="border border-dl-border rounded-lg p-4 bg-white">
                    <div className="text-xs text-dl-gray uppercase tracking-wide mb-1">Available</div>
                    <div className={`font-bold font-mono ${parseFloat(status.line.availableCreditUsd) > 0 ? 'text-dl-forest' : 'text-red-600'}`}>
                      {fmtUsd(status.line.availableCreditUsd)}
                    </div>
                  </div>
                </div>

                {/* Health bar */}
                <div className="border border-dl-border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-dl-navy">Collateral Health</span>
                    <span className={`text-xs border px-2 py-1 rounded font-mono ${statusColors[status.line.status]}`}>
                      {statusLabels[status.line.status]}
                    </span>
                  </div>
                  <HealthBar ltvRatio={status.ltvRatio} healthStatus={status.healthStatus} />
                  {status.priceUsd && (
                    <p className="text-xs text-dl-gray/60 mt-2 font-mono">
                      Current {status.line.collateralAsset} price: ${parseFloat(status.priceUsd).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setView('draw'); setDrawSuccess(''); setDrawError(''); }}
                    disabled={parseFloat(status.line.availableCreditUsd) <= 0 || status.line.status === 'flagged'}
                    className="border border-dl-navy text-dl-navy py-3 rounded text-sm font-semibold hover:bg-dl-navy hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Draw Funds
                  </button>
                  <button
                    onClick={() => { setView('repay'); setRepaySuccess(''); setRepayError(''); }}
                    disabled={parseFloat(status.line.drawnAmountUsd) <= 0}
                    className="border border-dl-border text-dl-navy py-3 rounded text-sm font-semibold hover:border-dl-navy transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Repay
                  </button>
                </div>

                {/* Transaction history */}
                <div className="border border-dl-border rounded-lg p-4 bg-white">
                  <h3 className="text-sm font-semibold text-dl-navy mb-3">Transaction History</h3>
                  <TransactionHistory walletAddress={status.line.participantWallet} />
                </div>
              </div>
            )}

            {/* ── Draw Funds Form ── */}
            {view === 'draw' && status.hasLine && status.line && (
              <div className="border border-dl-border rounded-lg p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-dl-navy">Draw Funds</h2>
                  <button onClick={() => setView('dashboard')} className="text-dl-gray text-xs hover:text-dl-navy">← Back</button>
                </div>
                {drawSuccess ? (
                  <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-800">
                    <p className="font-semibold mb-1">Transfer Initiated</p>
                    <p>{drawSuccess}</p>
                    <button onClick={() => setView('dashboard')} className="mt-3 text-xs text-dl-navy underline">Back to Dashboard</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-dl-bg rounded p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-dl-gray">Available Credit</span>
                        <span className="font-mono font-bold text-dl-navy">{fmtUsd(status.line.availableCreditUsd)}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-dl-gray uppercase tracking-wide mb-1">Amount (USD)</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={drawAmount}
                        onChange={e => setDrawAmount(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full border border-dl-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-dl-navy"
                      />
                    </div>
                    <p className="text-xs text-dl-gray/60">
                      Funds will be sent via ACH to your registered bank account (1–3 business days).
                      You must have a registered bank account to draw funds.
                    </p>
                    {drawError && <p className="text-red-600 text-xs">{drawError}</p>}
                    <button
                      onClick={handleDraw}
                      disabled={drawLoading || !drawAmount || parseFloat(drawAmount) < 1}
                      className="w-full bg-dl-navy text-white py-3 rounded text-sm font-semibold hover:bg-dl-navy/90 disabled:opacity-50"
                    >
                      {drawLoading ? 'Initiating ACH Transfer…' : `Draw ${drawAmount ? fmtUsd(drawAmount) : 'Funds'}`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Repay Form ── */}
            {view === 'repay' && status.hasLine && status.line && (
              <div className="border border-dl-border rounded-lg p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-dl-navy">Repay Balance</h2>
                  <button onClick={() => setView('dashboard')} className="text-dl-gray text-xs hover:text-dl-navy">← Back</button>
                </div>
                {repaySuccess ? (
                  <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-800">
                    <p className="font-semibold mb-1">Repayment Intent Recorded</p>
                    <p>{repaySuccess}</p>
                    <button onClick={() => setView('dashboard')} className="mt-3 text-xs text-dl-navy underline">Back to Dashboard</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-dl-bg rounded p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-dl-gray">Outstanding Balance</span>
                        <span className="font-mono font-bold text-dl-navy">{fmtUsd(status.line.drawnAmountUsd)}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-dl-gray uppercase tracking-wide mb-1">Repayment Amount (USD)</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={repayAmount}
                        onChange={e => setRepayAmount(e.target.value)}
                        placeholder="e.g. 250"
                        className="w-full border border-dl-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-dl-navy"
                      />
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded p-3 text-xs text-amber-800">
                      <strong>How repayment works:</strong> Your repayment intent is recorded. Send payment via ACH or wire to Axiom Protocol LLC.
                      Your balance and collateral will be updated once ops confirms receipt.
                    </div>
                    {repayError && <p className="text-red-600 text-xs">{repayError}</p>}
                    <button
                      onClick={handleRepay}
                      disabled={repayLoading || !repayAmount || parseFloat(repayAmount) < 1}
                      className="w-full bg-dl-navy text-white py-3 rounded text-sm font-semibold hover:bg-dl-navy/90 disabled:opacity-50"
                    >
                      {repayLoading ? 'Recording Repayment Intent…' : `Record Repayment of ${repayAmount ? fmtUsd(repayAmount) : 'Balance'}`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Info section ── */}
            {view === 'dashboard' && (
              <div className="border border-dl-border rounded-lg p-5 bg-white">
                <h3 className="text-sm font-semibold text-dl-navy mb-3">How It Works</h3>
                <ol className="space-y-2 text-sm text-dl-gray list-decimal list-inside">
                  <li>Deposit BTC, ETH, or AXUSD as collateral — held in BitGo institutional custody</li>
                  <li>Receive a USD credit line at 50% LTV (BTC/ETH) or 80% LTV (AXUSD)</li>
                  <li>Draw funds via ACH to your registered bank account at any time</li>
                  <li>Repay at any time — ops confirms payment and releases proportional collateral</li>
                  <li>Monitor your LTV ratio in real time — warning at 70%, liquidation review at 85%</li>
                </ol>
                <p className="text-xs text-dl-gray/60 mt-4 border-t border-dl-border pt-3">
                  This product is provided for liquidity purposes only. No credit reporting or FICO scoring involved.
                  Interest rate is 8% APR on outstanding balance. Liquidation at 85% LTV is a manual ops review process.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}
