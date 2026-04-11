import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { DesignLawLayout } from '../components/design-law';

interface CardParticipant {
  walletAddress: string;
  participantRef: string;
  fullName: string;
  email: string;
  cardStatus: string;
  cardId?: string;
  cardLast4?: string;
  physicalCardRequested?: boolean;
}

interface CardDetails {
  pan: string;
  cvv: string;
  expirationMonth: number;
  expirationYear: number;
}

interface CardTransaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  status: string;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const statusBadge: Record<string, string> = {
  issued: 'text-dl-forest border-dl-forest',
  frozen: 'text-dl-navy border-dl-navy',
  not_requested: 'text-dl-gray border-dl-border',
  program_required: 'text-dl-gold border-dl-gold',
  settled: 'text-dl-forest border-dl-forest',
  pending: 'text-dl-gold border-dl-gold',
  declined: 'text-red-700 border-red-700',
};

export default function MyCardPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [mounted, setMounted] = useState(false);
  const [participant, setParticipant] = useState<CardParticipant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [detailsSecondsLeft, setDetailsSecondsLeft] = useState(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [freezeLoading, setFreezeLoading] = useState(false);
  const [freezeMsg, setFreezeMsg] = useState('');

  const [transactions, setTransactions] = useState<CardTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState('');

  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');

  const [physicalLoading, setPhysicalLoading] = useState(false);
  const [physicalMsg, setPhysicalMsg] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [physicalFormOpen, setPhysicalFormOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchParticipant = useCallback(async (addr: string) => {
    setLoading(true);
    setError('');
    setNeedsSignIn(false);
    try {
      const res = await fetch(`/api/banking/participant/${addr}`);
      if (res.status === 401) { setNeedsSignIn(true); setLoading(false); return; }
      if (res.status === 404) { setParticipant(null); setLoading(false); return; }
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to load account'); setLoading(false); return; }
      const d = await res.json();
      setParticipant(d.participant);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (addr: string) => {
    setTxLoading(true);
    setTxError('');
    try {
      const res = await fetch(`/api/banking/participant/card/transactions?walletAddress=${addr}`);
      const d = await res.json();
      if (d.transactions) setTransactions(d.transactions);
      else setTxError(d.error || 'Failed to load transactions');
    } catch {
      setTxError('Network error — please try again');
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      fetchParticipant(address);
    }
  }, [isConnected, address, fetchParticipant]);

  useEffect(() => {
    if (participant && (participant.cardStatus === 'issued' || participant.cardStatus === 'frozen') && address) {
      fetchTransactions(address);
    }
  }, [participant, address, fetchTransactions]);

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

      if (!signer) {
        try {
          const { WalletService } = await import('../lib/services/WalletService');
          signer = WalletService.getInstance().getSigner();
        } catch {}
      }

      if (!signer && (window as any).ethereum) {
        const { ethers } = await import('ethers');
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        signer = await provider.getSigner();
        const network = await provider.getNetwork();
        chainId = Number(network.chainId) || 42161;
      }

      if (!signer) {
        setSignInError('No wallet signer available. Please reconnect your wallet and try again.');
        return;
      }

      const result = await siweService.signIn(signer, address, chainId);
      if (result.success) {
        setNeedsSignIn(false);
        fetchParticipant(address);
      } else {
        setSignInError(result.error || 'Sign-in failed. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSignInError(msg || 'Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const revealCardDetails = async () => {
    if (!address) return;
    setDetailsLoading(true);
    setDetailsError('');
    try {
      const res = await fetch(`/api/banking/participant/card/details?walletAddress=${address}`);
      const d = await res.json();
      if (!res.ok) { setDetailsError(d.error || 'Failed to retrieve card details'); return; }
      setCardDetails(d);

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);

      setDetailsSecondsLeft(30);
      countdownRef.current = setInterval(() => {
        setDetailsSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return s - 1;
        });
      }, 1000);

      hideTimerRef.current = setTimeout(() => {
        setCardDetails(null);
        setDetailsSecondsLeft(0);
      }, 30000);
    } catch {
      setDetailsError('Network error — please try again');
    } finally {
      setDetailsLoading(false);
    }
  };

  const hideDetails = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCardDetails(null);
    setDetailsSecondsLeft(0);
  };

  const toggleFreeze = async () => {
    if (!address || !participant) return;
    const shouldFreeze = participant.cardStatus === 'issued';
    setFreezeLoading(true);
    setFreezeMsg('');
    try {
      const res = await fetch(`/api/banking/participant/card/freeze?walletAddress=${address}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeze: shouldFreeze }),
      });
      const d = await res.json();
      if (d.success) {
        setParticipant(prev => prev ? { ...prev, cardStatus: d.cardStatus } : prev);
        setFreezeMsg(shouldFreeze ? 'Card frozen. No transactions will be authorized.' : 'Card unfrozen. Your card is active.');
      } else {
        setFreezeMsg(d.error || 'Failed to update card status');
      }
    } catch {
      setFreezeMsg('Network error — please try again');
    } finally {
      setFreezeLoading(false);
    }
  };

  const requestCard = async () => {
    if (!address) return;
    setRequestLoading(true);
    setRequestMsg('');
    try {
      const res = await fetch(`/api/banking/participant/card?walletAddress=${address}`, { method: 'POST' });
      const d = await res.json();
      if (d.cardStatus === 'issued') {
        setRequestMsg('Your Axiom Nexus Card has been issued.');
        fetchParticipant(address);
      } else if (d.cardStatus === 'program_required') {
        setRequestMsg('Card request queued. You will be notified by email when your card is ready — typically within 3–5 business days.');
        fetchParticipant(address);
      } else {
        setRequestMsg(d.message || 'Card request submitted.');
      }
    } catch {
      setRequestMsg('Request failed. Please try again or contact support.');
    } finally {
      setRequestLoading(false);
    }
  };

  const requestPhysicalCard = async () => {
    if (!address) return;
    setPhysicalLoading(true);
    setPhysicalMsg('');
    try {
      const res = await fetch(`/api/banking/participant/card/physical-request?walletAddress=${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingAddress: physicalAddress }),
      });
      const d = await res.json();
      if (d.success) {
        setPhysicalMsg(d.message || 'Physical card request submitted.');
        setPhysicalFormOpen(false);
        fetchParticipant(address);
      } else {
        setPhysicalMsg(d.error || 'Request failed. Please try again.');
      }
    } catch {
      setPhysicalMsg('Network error — please try again');
    } finally {
      setPhysicalLoading(false);
    }
  };

  const cardIsFrozen = participant?.cardStatus === 'frozen';
  const cardIsActive = participant?.cardStatus === 'issued' || cardIsFrozen;

  const expStr = cardDetails
    ? `${String(cardDetails.expirationMonth).padStart(2, '0')} / ${cardDetails.expirationYear}`
    : null;

  return (
    <DesignLawLayout>
      <div className="mb-5">
        <div className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Axiom Nexus / Consumer Banking</div>
        <h1 className="font-dl-serif text-3xl text-dl-navy font-bold mb-2">Axiom Nexus Card</h1>
        <p className="text-dl-gray text-sm max-w-2xl leading-relaxed">
          Your virtual debit card linked to your Axiom Nexus account — spendable anywhere Visa/Mastercard debit is accepted,
          with secure in-browser detail reveal and card management.
        </p>
      </div>

      <div className="border border-dl-border mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          <div className="px-5 py-3 border-r border-dl-border">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Network</p>
            <p className="font-dl-mono text-xs text-dl-forest font-semibold">Visa / Mastercard Debit</p>
            <p className="font-dl-mono text-xs text-dl-gray mt-0.5">Accepted worldwide</p>
          </div>
          <div className="px-5 py-3 border-r border-dl-border">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Issuer</p>
            <p className="font-dl-mono text-xs text-dl-navy">First Internet Bank · Member FDIC</p>
            <p className="font-dl-mono text-xs text-dl-gray mt-0.5">FDIC-insured up to $250,000</p>
          </div>
          <div className="px-5 py-3">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Card Type</p>
            <p className="font-dl-mono text-xs text-dl-navy">Virtual · Physical available</p>
            <p className="font-dl-mono text-xs text-dl-gray mt-0.5">Powered by Axiom Nexus banking rails</p>
          </div>
        </div>
      </div>

      {!mounted && (
        <div className="border border-dl-border p-8 text-center mb-8">
          <p className="font-dl-mono text-xs text-dl-gray animate-pulse">Loading...</p>
        </div>
      )}

      {mounted && !isConnected && (
        <div className="border border-dl-border p-8 text-center mb-8">
          <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-2">Wallet Required</p>
          <p className="text-dl-gray text-sm mb-4">Connect your wallet to view and manage your Nexus Card.</p>
          <p className="text-dl-gray text-xs">Use the Connect Wallet button in the top navigation.</p>
        </div>
      )}

      {isConnected && loading && (
        <div className="border border-dl-border p-8 text-center">
          <p className="font-dl-mono text-xs text-dl-gray animate-pulse">Loading account data...</p>
        </div>
      )}

      {isConnected && !loading && needsSignIn && (
        <div className="border border-dl-navy p-6 mb-8">
          <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-2">Wallet Verification Required</p>
          <p className="text-dl-gray text-sm mb-4 leading-relaxed">
            To protect your account, Axiom requires a one-time wallet signature to verify ownership before displaying
            your card details. This does not cost gas and does not move any funds.
          </p>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="border border-dl-navy bg-dl-navy text-white px-5 py-2.5 text-xs font-bold font-dl-mono uppercase tracking-wider hover:bg-dl-bg hover:text-dl-navy disabled:opacity-50"
          >
            {signingIn ? 'Waiting for signature...' : 'Sign In with Wallet'}
          </button>
          {signInError && (
            <p className="mt-3 text-xs text-red-700 font-dl-mono">{signInError}</p>
          )}
        </div>
      )}

      {isConnected && !loading && !needsSignIn && error && (
        <div className="border border-red-300 p-4 mb-6">
          <p className="text-sm text-red-700 font-dl-mono">{error}</p>
        </div>
      )}

      {isConnected && !loading && !participant && !error && !needsSignIn && (
        <div className="border border-dl-gold p-6 mb-8">
          <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-wider mb-2">Not Registered</p>
          <p className="text-dl-gray text-sm mb-4">
            You do not have an Axiom Nexus Account. Register through the Wealth Practice, Lending Fund, or Real Estate portal
            to receive your participant account and card eligibility.
          </p>
          <div className="flex gap-3 flex-wrap">
            <a href="/wealth-practice" className="border border-dl-navy bg-dl-navy text-white px-4 py-2 text-xs font-bold font-dl-mono uppercase hover:bg-dl-bg hover:text-dl-navy">
              Wealth Practice
            </a>
            <a href="/banking/my-account" className="border border-dl-navy text-dl-navy px-4 py-2 text-xs font-bold font-dl-mono uppercase hover:bg-dl-navy hover:text-white">
              My Nexus Account
            </a>
          </div>
        </div>
      )}

      {isConnected && !loading && participant && (
        <div className="space-y-6">
          {/* Card Art */}
          <div className="border border-dl-border">
            <div className="px-5 py-3 border-b border-dl-border bg-dl-bg flex items-center justify-between">
              <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Your Nexus Card</p>
              {cardIsActive && (
                <span className={`text-xs font-dl-mono border px-2 py-0.5 uppercase ${cardIsFrozen ? 'text-dl-navy border-dl-navy' : 'text-dl-forest border-dl-forest'}`}>
                  {cardIsFrozen ? 'Frozen' : 'Active'}
                </span>
              )}
            </div>
            <div className="p-6">
              <div className="max-w-sm mb-6">
                <div
                  className="p-6 relative"
                  style={{
                    background: cardIsFrozen
                      ? 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)'
                      : 'linear-gradient(135deg, #1B2A4A 0%, #1D3D2A 100%)',
                    minHeight: '200px',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
                  }}
                >
                  {cardIsFrozen && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ borderRadius: '12px', background: 'rgba(0,0,0,0.3)' }}>
                      <div className="text-center">
                        <p className="text-white font-dl-mono text-lg font-bold tracking-widest">FROZEN</p>
                        <p className="text-white opacity-70 text-xs font-dl-mono mt-1">Transactions paused</p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <p className="text-white text-xs font-dl-mono uppercase tracking-widest opacity-60">Axiom Protocol</p>
                      <p className="text-white font-bold text-xl font-dl-mono mt-0.5">Nexus</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-xs font-dl-mono opacity-60">First Internet Bank</p>
                      <p className="text-white text-xs font-dl-mono opacity-60 mt-0.5">Member FDIC</p>
                    </div>
                  </div>
                  <div className="mb-5">
                    {cardDetails ? (
                      <p className="text-white font-dl-mono text-lg tracking-widest">
                        {cardDetails.pan.replace(/(\d{4})(?=\d)/g, '$1 ')}
                      </p>
                    ) : (
                      <p className="text-white font-dl-mono text-lg tracking-widest opacity-80">
                        {participant.cardLast4 && cardIsActive
                          ? `···· ···· ···· ${participant.cardLast4}`
                          : '···· ···· ···· ····'}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-white text-xs font-dl-mono opacity-60 uppercase mb-0.5">Cardholder</p>
                      <p className="text-white text-sm font-dl-mono font-bold">{participant.fullName.toUpperCase()}</p>
                      {cardDetails && (
                        <div className="mt-2 flex gap-4">
                          <div>
                            <p className="text-white text-xs font-dl-mono opacity-60 uppercase">Expires</p>
                            <p className="text-white text-sm font-dl-mono font-bold">{expStr}</p>
                          </div>
                          <div>
                            <p className="text-white text-xs font-dl-mono opacity-60 uppercase">CVV</p>
                            <p className="text-white text-sm font-dl-mono font-bold">{cardDetails.cvv}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-white text-xs font-dl-mono opacity-60">Ref</p>
                      <p className="text-white text-xs font-dl-mono">{participant.participantRef}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card status states */}
              {participant.cardStatus === 'not_requested' && (
                <div>
                  <p className="text-dl-gray text-sm leading-relaxed mb-4 max-w-md">
                    Your Axiom Nexus Card is a virtual debit card linked to your participant account. Use it to spend your
                    available balance at any merchant, receive payouts instantly, and access funds at ATMs.
                  </p>
                  <button
                    onClick={requestCard}
                    disabled={requestLoading}
                    className="border border-dl-navy bg-dl-navy text-white px-6 py-2.5 text-sm font-bold font-dl-mono uppercase hover:bg-dl-bg hover:text-dl-navy disabled:opacity-50"
                  >
                    {requestLoading ? 'Requesting...' : 'Request Your Nexus Card'}
                  </button>
                  {requestMsg && <p className="mt-3 text-sm text-dl-gray leading-relaxed max-w-md">{requestMsg}</p>}
                </div>
              )}

              {participant.cardStatus === 'program_required' && (
                <div className="border border-dl-gold p-4 max-w-md">
                  <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-wider mb-2">Card Request Queued</p>
                  <p className="text-dl-gray text-sm leading-relaxed">
                    Your card has been requested. Axiom is completing card program setup with First Internet Bank.
                    You will receive a confirmation at <span className="font-semibold text-dl-navy">{participant.email}</span> when your card is ready — typically within 3–5 business days.
                  </p>
                </div>
              )}

              {cardIsActive && (
                <div className="space-y-4">
                  {/* Reveal / Hide details */}
                  <div className="flex flex-wrap gap-3 items-center">
                    {!cardDetails ? (
                      <button
                        onClick={revealCardDetails}
                        disabled={detailsLoading || cardIsFrozen}
                        className="border border-dl-navy bg-dl-navy text-white px-5 py-2.5 text-xs font-bold font-dl-mono uppercase hover:bg-dl-bg hover:text-dl-navy disabled:opacity-50"
                      >
                        {detailsLoading ? 'Retrieving...' : 'Reveal Card Details'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={hideDetails}
                          className="border border-dl-navy text-dl-navy px-5 py-2.5 text-xs font-bold font-dl-mono uppercase hover:bg-dl-navy hover:text-white"
                        >
                          Hide Details
                        </button>
                        <span className="font-dl-mono text-xs text-dl-gold">
                          Auto-hiding in {detailsSecondsLeft}s
                        </span>
                      </div>
                    )}

                    {/* Freeze / Unfreeze */}
                    <button
                      onClick={toggleFreeze}
                      disabled={freezeLoading}
                      className={`border px-5 py-2.5 text-xs font-bold font-dl-mono uppercase disabled:opacity-50 ${
                        cardIsFrozen
                          ? 'border-dl-forest text-dl-forest hover:bg-dl-forest hover:text-white'
                          : 'border-dl-navy text-dl-navy hover:bg-dl-navy hover:text-white'
                      }`}
                    >
                      {freezeLoading ? 'Updating...' : cardIsFrozen ? 'Unfreeze Card' : 'Freeze Card'}
                    </button>
                  </div>

                  {detailsError && (
                    <p className="text-xs font-dl-mono text-red-700">{detailsError}</p>
                  )}
                  {freezeMsg && (
                    <p className="text-xs font-dl-mono text-dl-gray">{freezeMsg}</p>
                  )}

                  {cardIsFrozen && (
                    <div className="border border-dl-navy p-4 max-w-md">
                      <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-1">Card Frozen</p>
                      <p className="text-dl-gray text-sm">
                        Your card is temporarily frozen. No purchases, ATM withdrawals, or online transactions will be authorized.
                        Unfreeze your card at any time to restore access.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Transaction History */}
          {cardIsActive && (
            <div className="border border-dl-border">
              <div className="px-5 py-3 border-b border-dl-border bg-dl-bg flex items-center justify-between">
                <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Card Transactions</p>
                {address && (
                  <button
                    onClick={() => fetchTransactions(address)}
                    className="text-xs text-dl-navy font-dl-mono border border-dl-border px-3 py-1 hover:bg-dl-navy hover:text-white"
                  >
                    Refresh
                  </button>
                )}
              </div>
              {txLoading ? (
                <div className="px-5 py-6 text-center">
                  <p className="font-dl-mono text-xs text-dl-gray animate-pulse">Loading transactions...</p>
                </div>
              ) : txError ? (
                <div className="px-5 py-4">
                  <p className="text-sm text-red-700 font-dl-mono">{txError}</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-dl-gray text-sm">No card transactions yet.</p>
                  <p className="text-dl-gray text-xs mt-1">Transactions appear here after your first purchase.</p>
                </div>
              ) : (
                <div>
                  <div className="hidden md:grid grid-cols-4 gap-0 px-5 py-2 border-b border-dl-border bg-dl-bg">
                    <p className="font-dl-mono text-xs text-dl-gray uppercase">Date</p>
                    <p className="font-dl-mono text-xs text-dl-gray uppercase">Merchant</p>
                    <p className="font-dl-mono text-xs text-dl-gray uppercase text-right">Amount</p>
                    <p className="font-dl-mono text-xs text-dl-gray uppercase text-right">Status</p>
                  </div>
                  <div className="divide-y divide-dl-border">
                    {transactions.map(tx => (
                      <div key={tx.id} className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-2 items-start">
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase md:hidden mb-0.5">Date</p>
                          <p className="font-dl-mono text-xs text-dl-navy">
                            {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <p className="font-dl-mono text-xs text-dl-gray uppercase md:hidden mb-0.5">Merchant</p>
                          <p className="text-sm text-dl-navy">{tx.merchant}</p>
                        </div>
                        <div className="md:text-right">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase md:hidden mb-0.5">Amount</p>
                          <p className="font-dl-mono text-sm text-dl-navy font-bold">{fmt(Math.abs(tx.amount))}</p>
                        </div>
                        <div className="md:text-right">
                          <p className="font-dl-mono text-xs text-dl-gray uppercase md:hidden mb-0.5">Status</p>
                          <span className={`inline-block text-xs font-dl-mono border px-2 py-0.5 uppercase ${statusBadge[tx.status] ?? 'text-dl-gray border-dl-border'}`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Physical Card Section */}
          {cardIsActive && (
            <div className="border border-dl-border">
              <div className="px-5 py-3 border-b border-dl-border bg-dl-bg">
                <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Get a Physical Card</p>
              </div>
              <div className="px-5 py-5">
                {participant.physicalCardRequested === true ? (
                  <div className="border border-dl-forest p-4 max-w-md">
                    <p className="font-dl-mono text-xs text-dl-forest uppercase tracking-wider mb-2">Physical Card Requested</p>
                    <p className="text-dl-gray text-sm leading-relaxed">
                      Your physical card request is on file. Axiom Operations will ship your card within 7–10 business days
                      and contact you at <span className="font-semibold text-dl-navy">{participant.email}</span> with a tracking number.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-dl-gray text-sm leading-relaxed mb-4 max-w-md">
                      Physical cards are available through the Axiom Nexus card program and ship within 7–10 business days.
                      Your card number, expiry, and CVV remain the same as your virtual card. Complete the request below
                      and Axiom Operations will fulfill it.
                    </p>

                    {!physicalFormOpen ? (
                      <button
                        onClick={() => setPhysicalFormOpen(true)}
                        className="border border-dl-navy text-dl-navy px-5 py-2.5 text-xs font-bold font-dl-mono uppercase hover:bg-dl-navy hover:text-white"
                      >
                        Request Physical Card
                      </button>
                    ) : (
                      <div className="space-y-4 max-w-md">
                        <div>
                          <label className="block text-dl-navy text-xs font-bold mb-2 font-dl-mono uppercase">
                            Shipping Address (optional)
                          </label>
                          <textarea
                            value={physicalAddress}
                            onChange={e => setPhysicalAddress(e.target.value)}
                            placeholder="123 Main St, Atlanta, GA 30301"
                            rows={3}
                            className="w-full border border-dl-border bg-dl-bg px-4 py-2.5 text-sm text-dl-navy focus:outline-none focus:border-dl-navy font-dl-mono resize-none"
                          />
                          <p className="text-dl-gray text-xs mt-1">
                            If blank, we will use the address on file with your participant account.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={requestPhysicalCard}
                            disabled={physicalLoading}
                            className="border border-dl-navy bg-dl-navy text-white px-5 py-2.5 text-xs font-bold font-dl-mono uppercase hover:bg-dl-bg hover:text-dl-navy disabled:opacity-50"
                          >
                            {physicalLoading ? 'Submitting...' : 'Submit Request'}
                          </button>
                          <button
                            onClick={() => setPhysicalFormOpen(false)}
                            className="border border-dl-border text-dl-gray px-5 py-2.5 text-xs font-bold font-dl-mono uppercase hover:border-dl-navy hover:text-dl-navy"
                          >
                            Cancel
                          </button>
                        </div>
                        {physicalMsg && <p className="text-sm text-dl-gray leading-relaxed">{physicalMsg}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card Features */}
          <div className="border border-dl-border">
            <div className="px-5 py-3 border-b border-dl-border bg-dl-bg">
              <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Card Features</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-dl-border">
              {[
                { title: 'Instant Payouts', desc: 'Receive group distributions, fund returns, and LP distributions directly to your card balance — no ACH settlement delay.' },
                { title: 'Accepted Anywhere', desc: 'Use your Nexus Card at any merchant that accepts Visa or Mastercard debit — online, in-store, and internationally.' },
                { title: 'ATM Access', desc: 'Withdraw cash at ATMs nationwide. Fee reimbursement policy applies per the Axiom Nexus cardholder agreement.' },
                { title: 'FDIC-Backed Funds', desc: 'Your card balance is backed by funds held at First Internet Bank, FDIC-insured up to $250,000 per depositor category.' },
              ].map(f => (
                <div key={f.title} className="px-5 py-4">
                  <p className="text-dl-navy font-semibold text-sm mb-1">{f.title}</p>
                  <p className="text-dl-gray text-xs leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Manage account link */}
          <div className="border border-dl-border p-5 flex items-center justify-between">
            <div>
              <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-1">Nexus Account</p>
              <p className="text-dl-gray text-sm">View deposits, distributions, insurance holds, and full account details.</p>
            </div>
            <a
              href="/banking/my-account"
              className="border border-dl-navy text-dl-navy px-4 py-2 text-xs font-bold font-dl-mono uppercase hover:bg-dl-navy hover:text-white whitespace-nowrap ml-4"
            >
              My Account →
            </a>
          </div>
        </div>
      )}
    </DesignLawLayout>
  );
}
