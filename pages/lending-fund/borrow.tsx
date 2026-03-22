import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

/** Typed subset of the EIP-1193 browser provider injected by MetaMask and compatible wallets. */
interface EthereumProvider {
  request(args: { method: 'eth_requestAccounts' }): Promise<string[]>;
  request(args: { method: 'eth_accounts' }): Promise<string[]>;
  request(args: { method: 'eth_chainId' }): Promise<string>;
  request(args: { method: 'personal_sign'; params: [string, string] }): Promise<string>;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

/** Safely retrieves the injected EIP-1193 provider or returns null when unavailable. */
function getEthereum(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { ethereum?: EthereumProvider };
  return w.ethereum ?? null;
}

const MIN_LOAN = 50000;
const MAX_LOAN = 500000;
const RATE_BPS = 1400;
const ORIGINATION_BPS = 300;

interface LoanRow {
  loan_id: string;
  property_address: string;
  loan_amount_usd: string;
  outstanding_principal_usd: string;
  accrued_interest_usd: string;
  total_repaid_usd: string;
  origination_fee_usd: string;
  interest_rate_bps: number;
  loan_term_months: number;
  status: string;
  gef_tier_at_origination: string;
  funded_at: string | null;
  due_date: string | null;
  live_accrued_interest_usd: string;
  created_at: string;
}

interface GefInfo {
  gefTier: string;
  creditLimit: number;
  hasActiveLine: boolean;
}

interface ScheduleRow {
  month: number;
  dueDate: string;
  paymentUsd: string;
}

interface LoanDetail {
  loan: LoanRow & {
    live_accrued_interest_usd: string;
    total_due_usd: string;
    days_delinquent: number;
    monthly_payment_estimate: string;
    next_due_date: string | null;
    cumulative_interest_paid_usd: string;
  };
  chainState: {
    onChainStatus: string | null;
    onChainAccruedInterestUsd: string | null;
    onChainPrincipalUsd: string | null;
    onChainNextPaymentDue: { amountUsd: string; dueTimestamp: number } | null;
    onChainDaysDelinquent: number | null;
    onChainDueAt?: number;
    onChainGracePeriodSeconds?: number;
    onChainDefaultEligibleAt?: number;
    onChainPaymentSchedule?: ScheduleRow[];
    explorerFixedLoan: string | null;
    explorerMarket: string | null;
  };
  paymentSchedule: Array<{
    month: number;
    dueDate: string;
    payment: string;
    interest: string;
    principalPortion: string;
    balance: string;
  }>;
}

type PagePhase =
  | 'connect'
  | 'checking_tier'
  | 'tier_blocked'
  | 'dashboard'
  | 'apply_form'
  | 'applied';

function formatUSD(v: string | number): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatRate(bps: number): string {
  return (bps / 100).toFixed(0) + '%';
}

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Under Review',
  approved: 'Approved',
  active: 'Active',
  delinquent: 'Delinquent',
  repaid: 'Paid Off',
  defaulted: 'Defaulted',
};

const STATUS_COLORS: Record<string, string> = {
  pending_review: 'text-dl-gold',
  approved: 'text-dl-forest',
  active: 'text-dl-navy',
  delinquent: 'text-dl-error',
  repaid: 'text-dl-gray',
  defaulted: 'text-dl-error',
};

async function getNonce(wallet: string): Promise<{ message: string }> {
  const r = await fetch(`/api/community-credit/nonce?walletAddress=${encodeURIComponent(wallet)}`);
  if (!r.ok) throw new Error('Failed to fetch nonce');
  return r.json();
}

async function getSignedHeaders(
  wallet: string,
  ethereum: EthereumProvider
): Promise<Record<string, string>> {
  const { message } = await getNonce(wallet);
  const sig: string = await ethereum.request({
    method: 'personal_sign',
    params: [message, wallet],
  });
  return {
    'Content-Type': 'application/json',
    'x-wallet-signature': sig,
    'x-wallet-message': message,
  };
}

export default function BorrowPage() {
  const [phase, setPhase] = useState<PagePhase>('connect');
  const [wallet, setWallet] = useState<string | null>(null);
  const [gefInfo, setGefInfo] = useState<GefInfo | null>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);

  const [applyForm, setApplyForm] = useState({
    borrowerName: '',
    propertyAddress: '',
    loanAmountUsd: '',
    loanTermMonths: '12',
  });
  const [applyError, setApplyError] = useState('');
  const [applying, setApplying] = useState(false);
  const [newLoanId, setNewLoanId] = useState<string | null>(null);

  const [repayLoanId, setRepayLoanId] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayError, setRepayError] = useState('');
  const [repayLoading, setRepayLoading] = useState(false);
  const [repaySuccess, setRepaySuccess] = useState('');

  const [detailLoanId, setDetailLoanId] = useState<string | null>(null);
  const [loanDetail, setLoanDetail] = useState<LoanDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchLoanDetail = useCallback(async (loanId: string) => {
    if (!wallet) return;
    setLoadingDetail(true);
    setLoanDetail(null);
    try {
      const eth = getEthereum();
      if (!eth) return;
      const headers = await getSignedHeaders(wallet, eth);
      const r = await fetch(`/api/realestate/loan-lifecycle?loanId=${encodeURIComponent(loanId)}`, { headers });
      const data = await r.json();
      if (data.success) setLoanDetail(data as LoanDetail);
    } catch {}
    setLoadingDetail(false);
  }, [wallet]);

  const fetchLoans = useCallback(async (addr: string) => {
    setLoadingLoans(true);
    try {
      const eth = getEthereum();
      if (!eth) return;
      const headers = await getSignedHeaders(addr, eth);
      const r = await fetch(`/api/realestate/loan-lifecycle?walletAddress=${encodeURIComponent(addr)}`, { headers });
      const data = await r.json();
      if (data.success) setLoans(data.loans ?? []);
    } catch {}
    setLoadingLoans(false);
  }, []);

  const connectWallet = async () => {
    const eth = getEthereum();
    if (!eth) {
      alert('Please install MetaMask or another Web3 wallet to continue.');
      return;
    }
    const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
    if (!accounts.length) return;
    const addr = accounts[0].toLowerCase();
    setWallet(addr);
    setPhase('checking_tier');

    const r = await fetch(`/api/community-credit/gef-tier?walletAddress=${encodeURIComponent(addr)}`);
    const data: GefInfo & { success: boolean } = await r.json();
    if (!data.success) {
      setGefInfo({ gefTier: 'Observer', creditLimit: 0, hasActiveLine: false });
      setPhase('tier_blocked');
      return;
    }
    setGefInfo(data);

    const operatorTiers = new Set(['Operator', 'Steward', 'Architect']);
    if (!operatorTiers.has(data.gefTier)) {
      setPhase('tier_blocked');
      return;
    }

    await fetchLoans(addr);
    setPhase('dashboard');
  };

  const handleApply = async () => {
    if (!wallet) return;
    setApplyError('');
    const amount = parseFloat(applyForm.loanAmountUsd.replace(/,/g, ''));
    if (isNaN(amount) || amount < MIN_LOAN || amount > MAX_LOAN) {
      setApplyError(`Loan amount must be between ${formatUSD(MIN_LOAN)} and ${formatUSD(MAX_LOAN)}`);
      return;
    }
    if (!applyForm.borrowerName.trim() || !applyForm.propertyAddress.trim()) {
      setApplyError('Please fill in all required fields');
      return;
    }
    setApplying(true);
    try {
      const headers = await getSignedHeaders(wallet, getEthereum()!);
      const r = await fetch('/api/realestate/loan-lifecycle', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'originate',
          walletAddress: wallet,
          borrowerName: applyForm.borrowerName.trim(),
          propertyAddress: applyForm.propertyAddress.trim(),
          loanAmountUsd: amount,
          loanTermMonths: parseInt(applyForm.loanTermMonths, 10),
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.success) {
        setApplyError(data.error ?? 'Application failed');
        return;
      }
      setNewLoanId(data.loanId);
      setPhase('applied');
      await fetchLoans(wallet);
    } catch (err: any) {
      setApplyError(err.message ?? 'Network error');
    } finally {
      setApplying(false);
    }
  };

  const handleRepay = async (loanId: string) => {
    if (!wallet) return;
    setRepayError('');
    setRepaySuccess('');
    const amount = parseFloat(repayAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
      setRepayError('Enter a valid payment amount');
      return;
    }
    setRepayLoading(true);
    try {
      // Step 1: Call repayLoan() on AXIOMFixedLoan from borrower wallet.
      // The contract does safeTransferFrom(msg.sender) — borrower must approve AXUSD first,
      // then repayLoan collects AXUSD and forwards to CreditMarket automatically.
      // AXUSD uses 6 decimal places.
      const eth = getEthereum();
      if (!eth) throw new Error('Web3 wallet not found. Please install MetaMask.');
      const ethers = (await import('ethers')).ethers;
      // eth conforms to Eip1193Provider structurally; cast is safe — ethers BrowserProvider only calls eth.request()
      const { BrowserProvider } = ethers;
      const provider = new BrowserProvider(eth as { request(...args: unknown[]): Promise<unknown> });
      const signer = await provider.getSigner();
      const { FIXED_LOAN_ABI } = await import('../../src/config/creditMarket.generated');
      const { FIXED_LOAN_NFT_ADDRESS, ACTIVE_AXUSD } = await import('../../src/config/activeContracts.generated');
      // Spread to remove readonly — ethers v6 InterfaceAbi accepts string[]
      const fixedLoan = new ethers.Contract(FIXED_LOAN_NFT_ADDRESS, [...FIXED_LOAN_ABI], signer);
      // keccak256(utf8(loanId)) — collision-safe bytes32 (consistent with API toLoanId32)
      const loanId32 = ethers.keccak256(ethers.toUtf8Bytes(loanId));
      // AXUSD has 6 decimals (like USDC)
      const paymentWei = ethers.parseUnits(amount.toFixed(6), 6);
      // Approve AXUSD spend on FixedLoan contract first
      const axusdAbi = ['function approve(address spender, uint256 amount) returns (bool)'];
      const axusd = new ethers.Contract(ACTIVE_AXUSD, axusdAbi, signer);
      await (await axusd.approve(FIXED_LOAN_NFT_ADDRESS, paymentWei)).wait(1);
      const tx = await fixedLoan.repayLoan(loanId32, paymentWei);
      const receipt = await tx.wait(1);
      const chainTxHash: string = receipt?.hash ?? tx.hash;

      // Step 2: Submit txHash to API for DB projection
      const headers = await getSignedHeaders(wallet, eth);
      const r = await fetch('/api/realestate/loan-lifecycle', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          loanId,
          action: 'repay',
          walletAddress: wallet,
          paymentUsd: amount,
          txHash: chainTxHash,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.success) {
        setRepayError(data.error ?? 'Repayment recording failed (on-chain tx succeeded)');
        return;
      }
      setRepaySuccess(`Payment of ${formatUSD(amount)} confirmed on-chain. Remaining: ${formatUSD(data.remainingPrincipalUsd)}`);
      setRepayAmount('');
      setRepayLoanId(null);
      await fetchLoans(wallet);
    } catch (err: any) {
      setRepayError(err.message ?? 'Network error');
    } finally {
      setRepayLoading(false);
    }
  };

  const loanAmountNum = parseFloat(applyForm.loanAmountUsd.replace(/,/g, '')) || 0;
  const termMonths = parseInt(applyForm.loanTermMonths, 10) || 12;
  const monthlyRate = (RATE_BPS / 10000) / 12;
  const estMonthlyPayment = loanAmountNum > 0
    ? (loanAmountNum * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1)
    : 0;
  const estOriginationFee = loanAmountNum * (ORIGINATION_BPS / 10000);

  const activeLoans = loans.filter(l => l.status === 'active');
  const pendingLoans = loans.filter(l => l.status === 'pending_review' || l.status === 'approved');
  const closedLoans = loans.filter(l => l.status === 'repaid' || l.status === 'defaulted');

  return (
    <DesignLawLayout>
      <Head>
        <title>Borrow — Axiom Lending Fund</title>
        <meta name="description" content="GEF Operator-grade real estate bridge capital. Apply, manage, and repay loans from the Axiom Lending Fund." />
      </Head>

      <div className="mb-8 border-b border-dl-border pb-6">
        <Link href="/lending-fund" className="text-xs text-dl-gray uppercase tracking-widest mb-4 inline-block">
          ← Lending Fund
        </Link>
        <h1 className="font-dl-serif text-3xl text-dl-navy">Borrow Capital</h1>
        <p className="mt-2 text-sm text-dl-gray max-w-2xl">
          Short-term bridge capital for real estate operators. Requires GEF Operator tier or higher.
          Maximum 70% LTV, 14% annual rate, terms up to 24 months.
        </p>
      </div>

      {phase === 'connect' && (
        <div className="border border-dl-border bg-dl-bg-alt p-10 text-center max-w-lg mx-auto">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">Connect Your Wallet</h2>
          <p className="text-sm text-dl-gray mb-6 leading-relaxed">
            Connect your wallet to verify your GEF tier and access borrower tools.
            GEF Operator tier or higher is required.
          </p>
          <button
            onClick={connectWallet}
            className="px-8 py-3 bg-dl-navy text-white font-medium text-sm"
          >
            Connect Wallet
          </button>
          <p className="text-xs text-dl-gray mt-4">
            Not sure about your tier?{' '}
            <Link href="/execution-framework" className="text-dl-navy underline">
              Check the GEF
            </Link>
          </p>
        </div>
      )}

      {phase === 'checking_tier' && (
        <div className="border border-dl-border bg-dl-bg-alt p-10 text-center max-w-lg mx-auto">
          <p className="text-sm text-dl-gray font-dl-mono">Verifying GEF tier...</p>
        </div>
      )}

      {phase === 'tier_blocked' && (
        <div className="border border-dl-border bg-dl-bg-alt p-8 max-w-xl mx-auto">
          <div className="mb-4 border-b border-dl-border pb-4">
            <p className="text-xs text-dl-gray uppercase tracking-widest font-dl-mono mb-1">Access Restricted</p>
            <h2 className="font-dl-serif text-xl text-dl-navy">GEF Operator Tier Required</h2>
          </div>
          <p className="text-sm text-dl-gray mb-4 leading-relaxed">
            Real estate bridge capital is reserved for GEF Operator-tier members and above.
            Your current tier:{' '}
            <span className="font-dl-mono text-dl-navy font-semibold">{gefInfo?.gefTier ?? 'Observer'}</span>
          </p>
          <div className="border border-dl-border bg-dl-bg p-4 mb-6">
            <p className="text-xs text-dl-gray uppercase tracking-widest font-dl-mono mb-3">Tier Requirements</p>
            {[
              { tier: 'Observer', req: 'Wallet connected, no credit activity', credit: '$0' },
              { tier: 'Participant', req: 'Active Wealth Practice member', credit: '$1,500' },
              { tier: 'Operator', req: 'Completed Wealth Practice + GEF milestones', credit: '$5,000 + RE access' },
              { tier: 'Steward', req: 'Operator + governance participation', credit: '$10,000 + RE access' },
              { tier: 'Architect', req: 'Steward + advanced execution record', credit: '$25,000 + RE access' },
            ].map((row, i) => (
              <div
                key={row.tier}
                className={`flex items-center justify-between py-2 text-xs ${i < 4 ? 'border-b border-dl-border' : ''} ${row.tier === gefInfo?.gefTier ? 'font-semibold text-dl-navy' : 'text-dl-gray'}`}
              >
                <span className="font-dl-mono">{row.tier}</span>
                <span>{row.req}</span>
                <span className="font-dl-mono">{row.credit}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/execution-framework" className="px-5 py-2 bg-dl-navy text-white text-sm font-medium">
              View GEF Dashboard
            </Link>
            <Link href="/wealth-practice" className="px-5 py-2 border border-dl-border text-dl-navy text-sm font-medium">
              Join Wealth Practice
            </Link>
          </div>
        </div>
      )}

      {phase === 'dashboard' && (
        <>
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={() => { setPhase('apply_form'); setApplyError(''); }}
              className="px-6 py-2 bg-dl-navy text-white text-sm font-medium"
            >
              Apply for Capital
            </button>
            <span className="px-4 py-2 border border-dl-border text-xs font-dl-mono text-dl-gray">
              Tier: {gefInfo?.gefTier} &nbsp;|&nbsp; {wallet?.slice(0, 8)}...{wallet?.slice(-6)}
            </span>
          </div>

          {repaySuccess && (
            <div className="mb-6 border border-dl-forest bg-dl-bg-alt p-4 text-sm text-dl-forest">
              {repaySuccess}
            </div>
          )}

          {activeLoans.length > 0 && (
            <div className="mb-10">
              <SectionHeading>Active Loans</SectionHeading>
              <div className="space-y-4">
                {activeLoans.map(loan => {
                  const totalDue = parseFloat(loan.outstanding_principal_usd) + parseFloat(loan.live_accrued_interest_usd ?? loan.accrued_interest_usd);
                  const isRepaying = repayLoanId === loan.loan_id;
                  return (
                    <div key={loan.loan_id} className="border border-dl-border">
                      <div className="px-5 py-4 bg-dl-bg border-b border-dl-border flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="text-xs text-dl-gray font-dl-mono mb-1">LOAN {loan.loan_id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-sm text-dl-navy font-medium">{loan.property_address}</p>
                        </div>
                        <span className={`text-xs font-dl-mono font-semibold ${STATUS_COLORS[loan.status] ?? 'text-dl-navy'}`}>
                          {STATUS_LABELS[loan.status] ?? loan.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-dl-border">
                        <div className="px-4 py-3 border-r border-dl-border bg-dl-bg-alt">
                          <p className="text-xs text-dl-gray mb-1">Original Amount</p>
                          <p className="font-dl-mono text-sm font-semibold text-dl-navy">{formatUSD(loan.loan_amount_usd)}</p>
                        </div>
                        <div className="px-4 py-3 border-r border-dl-border bg-dl-bg">
                          <p className="text-xs text-dl-gray mb-1">Outstanding Principal</p>
                          <p className="font-dl-mono text-sm font-semibold text-dl-navy">{formatUSD(loan.outstanding_principal_usd)}</p>
                        </div>
                        <div className="px-4 py-3 border-r border-dl-border bg-dl-bg-alt">
                          <p className="text-xs text-dl-gray mb-1">Accrued Interest</p>
                          <p className="font-dl-mono text-sm font-semibold text-dl-navy">{formatUSD(loan.live_accrued_interest_usd ?? loan.accrued_interest_usd)}</p>
                        </div>
                        <div className="px-4 py-3 bg-dl-bg">
                          <p className="text-xs text-dl-gray mb-1">Total Due Now</p>
                          <p className="font-dl-mono text-sm font-bold text-dl-navy">{formatUSD(totalDue)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 border-b border-dl-border text-xs font-dl-mono text-dl-gray">
                        <div className="px-4 py-2 border-r border-dl-border">Rate: {formatRate(loan.interest_rate_bps)} APR</div>
                        <div className="px-4 py-2 border-r border-dl-border md:border-r-0">Term: {loan.loan_term_months} months</div>
                        <div className="px-4 py-2">{loan.due_date ? `Due: ${new Date(loan.due_date).toLocaleDateString()}` : ''}</div>
                      </div>
                      <div className="px-5 py-4 bg-dl-bg-alt">
                        <div className="flex flex-wrap gap-2">
                          {!isRepaying && (
                            <button
                              onClick={() => { setRepayLoanId(loan.loan_id); setRepayAmount(''); setRepayError(''); setRepaySuccess(''); }}
                              className="px-5 py-2 bg-dl-navy text-white text-xs font-medium"
                            >
                              Make a Payment
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (detailLoanId === loan.loan_id) {
                                setDetailLoanId(null);
                                setLoanDetail(null);
                              } else {
                                setDetailLoanId(loan.loan_id);
                                fetchLoanDetail(loan.loan_id);
                              }
                            }}
                            className="px-5 py-2 border border-dl-border text-dl-navy text-xs font-medium"
                          >
                            {detailLoanId === loan.loan_id ? 'Hide Schedule' : 'View Payment Schedule'}
                          </button>
                        </div>
                        {isRepaying && (
                          <div className="mt-4">
                            <p className="text-xs text-dl-gray mb-2 font-dl-mono uppercase tracking-wider">Record Payment</p>
                            <div className="flex flex-wrap gap-2 items-end">
                              <div>
                                <label className="block text-xs text-dl-gray mb-1">Payment Amount (USD)</label>
                                <input
                                  type="number"
                                  value={repayAmount}
                                  onChange={e => setRepayAmount(e.target.value)}
                                  placeholder="e.g. 5000"
                                  min="0.01"
                                  max={totalDue.toFixed(2)}
                                  className="px-3 py-2 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono w-40"
                                />
                              </div>
                              <button
                                onClick={() => handleRepay(loan.loan_id)}
                                disabled={repayLoading}
                                className="px-5 py-2 bg-dl-forest text-white text-xs font-medium disabled:opacity-50"
                              >
                                {repayLoading ? 'Recording...' : 'Submit Payment'}
                              </button>
                              <button
                                onClick={() => setRepayLoanId(null)}
                                className="px-5 py-2 border border-dl-border text-dl-gray text-xs font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                            {repayError && <p className="text-xs text-dl-error mt-2">{repayError}</p>}
                            <p className="text-xs text-dl-gray mt-2">
                              Interest-first allocation: accrued interest ({formatUSD(loan.live_accrued_interest_usd)}) clears before principal.
                              Max payment: {formatUSD(totalDue)}.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* ─── Per-Loan Lifecycle Panel ─────────────────────── */}
                      {detailLoanId === loan.loan_id && (
                        <div className="border-t border-dl-border bg-dl-bg">
                          {loadingDetail ? (
                            <p className="px-5 py-6 text-xs text-dl-gray font-dl-mono">Loading on-chain lifecycle data...</p>
                          ) : loanDetail ? (
                            <div className="px-5 py-5">
                              {/* On-chain State Badge Row */}
                              <div className="flex flex-wrap gap-6 mb-5 pb-4 border-b border-dl-border">
                                <div>
                                  <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-1">On-Chain State</p>
                                  <span className={`font-dl-mono text-sm font-semibold ${
                                    loanDetail.chainState.onChainStatus === 'ACTIVE' ? 'text-dl-navy' :
                                    loanDetail.chainState.onChainStatus === 'DELINQUENT' ? 'text-dl-error' :
                                    loanDetail.chainState.onChainStatus === 'REPAID' ? 'text-dl-forest' :
                                    'text-dl-gold'
                                  }`}>
                                    {loanDetail.chainState.onChainStatus ?? 'PENDING'}
                                  </span>
                                </div>
                                {loanDetail.chainState.onChainPrincipalUsd && (
                                  <div>
                                    <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-1">Chain Principal</p>
                                    <p className="font-dl-mono text-sm text-dl-navy font-semibold">{formatUSD(loanDetail.chainState.onChainPrincipalUsd)}</p>
                                  </div>
                                )}
                                {loanDetail.chainState.onChainAccruedInterestUsd && (
                                  <div>
                                    <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-1">Accrued Interest</p>
                                    <p className="font-dl-mono text-sm text-dl-navy">{formatUSD(loanDetail.chainState.onChainAccruedInterestUsd)}</p>
                                  </div>
                                )}
                                {loanDetail.chainState.onChainNextPaymentDue && (
                                  <div>
                                    <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-1">Next Payment Due</p>
                                    <p className="font-dl-mono text-sm text-dl-navy font-semibold">{formatUSD(loanDetail.chainState.onChainNextPaymentDue.amountUsd)}</p>
                                    {loanDetail.chainState.onChainNextPaymentDue.dueTimestamp > 0 && (
                                      <p className="text-xs text-dl-gray">{new Date(loanDetail.chainState.onChainNextPaymentDue.dueTimestamp * 1000).toLocaleDateString()}</p>
                                    )}
                                  </div>
                                )}
                                {(loanDetail.chainState.onChainDaysDelinquent ?? 0) > 0 && (
                                  <div>
                                    <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-1">Days Past Due</p>
                                    <p className="font-dl-mono text-sm text-dl-error font-semibold">{loanDetail.chainState.onChainDaysDelinquent} days</p>
                                  </div>
                                )}
                                {loanDetail.chainState.onChainDueAt && (
                                  <div>
                                    <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-1">Maturity Date</p>
                                    <p className="font-dl-mono text-xs text-dl-gray">{new Date(loanDetail.chainState.onChainDueAt * 1000).toLocaleDateString()}</p>
                                  </div>
                                )}
                                {loanDetail.chainState.onChainDefaultEligibleAt && (
                                  <div>
                                    <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-1">Default Eligible After</p>
                                    <p className="font-dl-mono text-xs text-dl-gray">{new Date(loanDetail.chainState.onChainDefaultEligibleAt * 1000).toLocaleDateString()}</p>
                                  </div>
                                )}
                              </div>

                              {/* Payment Schedule Table */}
                              <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-wider mb-3">
                                Payment Schedule
                                {loanDetail.chainState.onChainPaymentSchedule ? ' — from on-chain contract' : ' — projected'}
                              </p>
                              {(() => {
                                const schedule = loanDetail.chainState.onChainPaymentSchedule ?? loanDetail.paymentSchedule.map(row => ({
                                  month: row.month,
                                  dueDate: row.dueDate,
                                  paymentUsd: row.payment,
                                }));
                                if (schedule.length === 0) {
                                  return <p className="text-xs text-dl-gray">Schedule unavailable — loan not yet disbursed.</p>;
                                }
                                const today = new Date().toISOString().slice(0, 10);
                                return (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs font-dl-mono border-collapse">
                                      <thead>
                                        <tr className="border-b border-dl-border text-dl-gray">
                                          <th className="text-left py-2 pr-4">Mo.</th>
                                          <th className="text-left py-2 pr-4">Due Date</th>
                                          <th className="text-right py-2">Payment (AXUSD)</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {schedule.map((row) => {
                                          const isPast = row.dueDate < today;
                                          return (
                                            <tr
                                              key={row.month}
                                              className={`border-b border-dl-border ${isPast ? 'text-dl-gray' : 'text-dl-navy'}`}
                                            >
                                              <td className="py-1.5 pr-4">{row.month}</td>
                                              <td className="py-1.5 pr-4">
                                                {row.dueDate}
                                                {isPast && <span className="ml-2 text-dl-gold text-xs">past</span>}
                                              </td>
                                              <td className="py-1.5 text-right">{formatUSD(row.paymentUsd)}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              })()}
                              {loanDetail.chainState.explorerFixedLoan && (
                                <p className="mt-4 text-xs text-dl-gray">
                                  <a
                                    href={`${loanDetail.chainState.explorerFixedLoan}#code`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-dl-navy underline"
                                  >
                                    View loan contract on Blockscout
                                  </a>
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="px-5 py-6 text-xs text-dl-error">Failed to load lifecycle data.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pendingLoans.length > 0 && (
            <div className="mb-10">
              <SectionHeading>Pending Applications</SectionHeading>
              <div className="border border-dl-border">
                {pendingLoans.map((loan, i) => (
                  <div
                    key={loan.loan_id}
                    className={`flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 gap-2 ${i < pendingLoans.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                  >
                    <div>
                      <p className="text-xs text-dl-gray font-dl-mono">{loan.loan_id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm text-dl-navy">{loan.property_address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">{formatUSD(loan.loan_amount_usd)}</p>
                      <p className={`text-xs font-dl-mono ${STATUS_COLORS[loan.status] ?? 'text-dl-gray'}`}>
                        {STATUS_LABELS[loan.status] ?? loan.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loans.length === 0 && !loadingLoans && (
            <div className="border border-dl-border bg-dl-bg-alt p-8 text-center mb-8">
              <p className="text-sm text-dl-gray mb-4">No loan history found. Click "Apply for Capital" to get started.</p>
            </div>
          )}

          {closedLoans.length > 0 && (
            <div className="mb-10">
              <SectionHeading>Closed / Historical</SectionHeading>
              <div className="border border-dl-border">
                {closedLoans.map((loan, i) => (
                  <div
                    key={loan.loan_id}
                    className={`flex flex-col md:flex-row md:items-center md:justify-between px-5 py-3 gap-2 ${i < closedLoans.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                  >
                    <div>
                      <p className="text-xs text-dl-gray font-dl-mono">{loan.loan_id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm text-dl-navy">{loan.property_address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-dl-mono text-sm text-dl-gray">{formatUSD(loan.loan_amount_usd)}</p>
                      <p className={`text-xs font-dl-mono ${STATUS_COLORS[loan.status] ?? 'text-dl-gray'}`}>
                        {STATUS_LABELS[loan.status] ?? loan.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {phase === 'apply_form' && (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-dl-serif text-xl text-dl-navy">Apply for Bridge Capital</h2>
            <button
              onClick={() => setPhase('dashboard')}
              className="text-xs text-dl-gray underline"
            >
              ← Back to Dashboard
            </button>
          </div>

          <div className="border border-dl-border mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-dl-border text-xs font-dl-mono text-dl-gray">
              <div className="px-4 py-3 border-r border-dl-border">
                <p className="mb-1 uppercase tracking-wider">Rate</p>
                <p className="text-dl-navy font-semibold">{formatRate(RATE_BPS)} APR</p>
              </div>
              <div className="px-4 py-3 border-r border-dl-border">
                <p className="mb-1 uppercase tracking-wider">Max LTV</p>
                <p className="text-dl-navy font-semibold">70%</p>
              </div>
              <div className="px-4 py-3 border-r border-dl-border">
                <p className="mb-1 uppercase tracking-wider">Origination</p>
                <p className="text-dl-navy font-semibold">{formatRate(ORIGINATION_BPS)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="mb-1 uppercase tracking-wider">Max Term</p>
                <p className="text-dl-navy font-semibold">24 months</p>
              </div>
            </div>
            {loanAmountNum >= MIN_LOAN && (
              <div className="grid grid-cols-2 text-xs font-dl-mono text-dl-gray bg-dl-bg-alt">
                <div className="px-4 py-3 border-r border-dl-border">
                  <p className="mb-1">Est. Monthly Payment</p>
                  <p className="text-dl-navy font-semibold text-sm">{formatUSD(estMonthlyPayment)}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="mb-1">Origination Fee</p>
                  <p className="text-dl-navy font-semibold text-sm">{formatUSD(estOriginationFee)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs text-dl-gray uppercase tracking-widest mb-1">Borrower / Entity Name *</label>
              <input
                type="text"
                value={applyForm.borrowerName}
                onChange={e => setApplyForm(p => ({ ...p, borrowerName: e.target.value }))}
                placeholder="Full legal name or LLC name"
                className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-dl-gray uppercase tracking-widest mb-1">Property Address *</label>
              <input
                type="text"
                value={applyForm.propertyAddress}
                onChange={e => setApplyForm(p => ({ ...p, propertyAddress: e.target.value }))}
                placeholder="123 Main St, Atlanta, GA 30301"
                className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-dl-gray uppercase tracking-widest mb-1">
                  Loan Amount (USD) *
                </label>
                <input
                  type="number"
                  value={applyForm.loanAmountUsd}
                  onChange={e => setApplyForm(p => ({ ...p, loanAmountUsd: e.target.value }))}
                  placeholder="50000 – 500000"
                  min={MIN_LOAN}
                  max={MAX_LOAN}
                  className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                />
                <p className="text-xs text-dl-gray mt-1">{formatUSD(MIN_LOAN)} – {formatUSD(MAX_LOAN)}</p>
              </div>

              <div>
                <label className="block text-xs text-dl-gray uppercase tracking-widest mb-1">Term (months) *</label>
                <select
                  value={applyForm.loanTermMonths}
                  onChange={e => setApplyForm(p => ({ ...p, loanTermMonths: e.target.value }))}
                  className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                >
                  {[6, 9, 12, 18, 24].map(m => (
                    <option key={m} value={String(m)}>{m} months</option>
                  ))}
                </select>
              </div>
            </div>

            {applyError && (
              <div className="border border-dl-error bg-dl-bg p-3">
                <p className="text-xs text-dl-error">{applyError}</p>
              </div>
            )}

            <div className="border border-dl-border bg-dl-bg-alt p-4 text-xs text-dl-gray leading-relaxed">
              By submitting this application, you confirm you are a verified GEF Operator or higher
              and that the information provided is accurate. This is not a commitment to lend.
              A wallet signature will be required to verify your identity. Loans are funded from
              the Axiom Lending Fund and subject to underwriter approval.
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApply}
                disabled={applying}
                className="px-8 py-3 bg-dl-navy text-white font-medium text-sm disabled:opacity-50"
              >
                {applying ? 'Signing & Submitting...' : 'Sign & Submit Application'}
              </button>
              <button
                onClick={() => setPhase('dashboard')}
                className="px-6 py-3 border border-dl-border text-dl-gray text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'applied' && (
        <div className="max-w-lg mx-auto text-center border border-dl-border bg-dl-bg-alt p-10">
          <p className="text-3xl text-dl-forest mb-4">✓</p>
          <h2 className="font-dl-serif text-2xl text-dl-navy mb-3">Application Submitted</h2>
          <p className="text-sm text-dl-gray mb-2">
            Reference ID:{' '}
            <span className="font-dl-mono text-dl-navy">{newLoanId?.slice(0, 12).toUpperCase()}</span>
          </p>
          <p className="text-sm text-dl-gray mb-6 leading-relaxed">
            Your application is under review. You will be contacted within 24-48 hours with a decision.
            All loan decisions are subject to property underwriting and fund availability.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setPhase('dashboard')}
              className="px-6 py-2 bg-dl-navy text-white text-sm font-medium"
            >
              View Dashboard
            </button>
            <Link href="/lending-fund" className="px-6 py-2 border border-dl-border text-dl-navy text-sm font-medium">
              Back to Fund
            </Link>
          </div>
        </div>
      )}

      <div className="mt-12 border-t border-dl-border pt-8">
        <SectionHeading>Loan Parameters</SectionHeading>
        <div className="border border-dl-border text-xs font-dl-mono">
          {[
            { k: 'Annual Interest Rate', v: `${formatRate(RATE_BPS)} (${RATE_BPS} bps)` },
            { k: 'Origination Fee', v: `${formatRate(ORIGINATION_BPS)} (${ORIGINATION_BPS} bps) — deducted at funding` },
            { k: 'Maximum LTV', v: '70% of After-Repair Value' },
            { k: 'Loan Size', v: `${formatUSD(MIN_LOAN)} – ${formatUSD(MAX_LOAN)}` },
            { k: 'Term Range', v: '6 – 24 months' },
            { k: 'Repayment', v: 'Interest-first allocation. Accrued interest clears before principal.' },
            { k: 'GEF Eligibility', v: 'Operator, Steward, or Architect tier required' },
          ].map((row, i) => (
            <div key={row.k} className={`flex flex-col md:flex-row md:justify-between px-4 py-3 gap-1 ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'} ${i < 6 ? 'border-b border-dl-border' : ''}`}>
              <span className="text-dl-gray uppercase tracking-wider">{row.k}</span>
              <span className="text-dl-navy">{row.v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 border border-dl-border bg-dl-bg-alt p-5">
        <p className="text-xs text-dl-gray leading-relaxed">
          This facility is offered through the Axiom Lending Fund pursuant to SEC Reg D 506(c).
          Loans are secured by real property. This is not an offer to lend. All terms subject to
          underwriter approval and fund liquidity. Interest accrues daily on outstanding principal.
          Overpayment is not permitted — total payment cannot exceed outstanding principal plus accrued interest.
        </p>
      </div>
    </DesignLawLayout>
  );
}
