import { useState, useEffect, Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../../components/design-law';
import {
  getCreditMarketPosition,
  claimInterestFromCreditMarket,
  type CreditMarketPosition,
} from '../../lib/web3/creditMarketService';
import { CREDIT_MARKET_ADDRESS } from '../../src/config/activeContracts.generated';

/** EIP-1193 browser provider — typed to avoid `any` escape. */
interface EthProvider {
  request(args: { method: 'eth_accounts' }): Promise<string[]>;
  request(args: { method: 'eth_requestAccounts' }): Promise<string[]>;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function getEth(): EthProvider | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { ethereum?: EthProvider }).ethereum ?? null;
}

interface FundStats {
  totalAssets: string;
  availableLiquidity: string;
  lockedInLoans: string;
  totalYield: string;
  activeLoans: number;
  totalOriginated: string;
  totalRepaid: string;
  totalDefaulted: string;
  sharePrice: string;
  apy: string;
  riskParams: any;
}

interface ProductRisk {
  maxLtvBps: number;
  maxTermDays: number;
  interestRateBps: number;
  minLoanSize: string;
  maxLoanSize: string;
}


function formatUSD(value: string) {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function formatPercent(bps: number) {
  return (bps / 100).toFixed(1) + '%';
}

interface ActiveLoan {
  loan_id: string;
  loan_amount_usd: string;
  outstanding_principal_usd: string;
  interest_rate_bps: number;
  term_days: number;
  status: string;
  funded_at: string | null;
  due_at: string | null;
  last_payment_at: string | null;
  property_address: string | null;
  total_repaid_usd: string;
  total_interest_paid_usd: string;
  lpInterestEarnedUsd: string;
}

interface JuniorPoolStats {
  totalLoansOriginated: number;
  totalVolumeOriginatedUsd: number;
  currentOutstandingUsd: number;
  totalInterestCollectedUsd: number;
  recentInterestDistributed30dUsd: number;
  recentRepaymentEvents30d: number;
  repaidCount: number;
  defaultedCount: number;
  overdueCount: number;
  activeLinesUnfunded: number;
  repaymentRatePct: string | null;
  interestRateBps: number;
  poolNote: string;
}

/**
 * Compute an amortization schedule from loan fields already available in ActiveLoan.
 * Used in the LP overview panel so no additional API call is required for schedule display.
 */
function computeAmortizationSchedule(
  principalUsd: string,
  rateBps: number,
  termDays: number,
  fundedAt: string | null,
): Array<{ month: number; dueDate: string; payment: number; interest: number; principalPmt: number; balance: number }> {
  const P = parseFloat(principalUsd);
  if (!P || P <= 0 || !rateBps || !termDays) return [];
  const r = rateBps / 10000 / 12; // monthly rate
  const n = Math.round(termDays / 30); // term in months
  const M = r > 0 ? P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : P / n;
  const rows: Array<{ month: number; dueDate: string; payment: number; interest: number; principalPmt: number; balance: number }> = [];
  let balance = P;
  for (let m = 1; m <= Math.min(n, 36); m++) {
    const interest = balance * r;
    const principalPmt = Math.min(M - interest, balance);
    balance = Math.max(0, balance - principalPmt);
    const payment = m === n ? principalPmt + interest + balance : M;
    let dueDate = '—';
    if (fundedAt) {
      const d = new Date(fundedAt);
      d.setMonth(d.getMonth() + m);
      dueDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    }
    rows.push({ month: m, dueDate, payment, interest, principalPmt, balance });
    if (balance <= 0) break;
  }
  return rows;
}

export default function LendingFundPage() {
  const [stats, setStats] = useState<FundStats | null>(null);
  const [riskParams, setRiskParams] = useState<ProductRisk | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [lpPosition, setLpPosition] = useState<CreditMarketPosition | null>(null);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'claiming' | 'success' | 'error'>('idle');
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'lp-dashboard'>('overview');
  const [juniorPoolStats, setJuniorPoolStats] = useState<JuniorPoolStats | null>(null);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [loansLoading, setLoansLoading] = useState(true);
  /** ID of the loan row currently expanded to show lifecycle detail + payment schedule. */
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, riskRes, juniorRes, loansRes] = await Promise.all([
          fetch('/api/realestate/fund-stats'),
          fetch('/api/realestate/risk-params?productId=1'),
          fetch('/api/community-credit/junior-pool-stats'),
          fetch('/api/realestate/loan-lifecycle?status=active,delinquent,approved'),
        ]);
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
          if (data.riskParams) setRiskParams(data.riskParams);
        }
        if (riskRes.ok) setRiskParams(await riskRes.json());
        if (juniorRes.ok) {
          const jpData = await juniorRes.json();
          if (jpData.success) setJuniorPoolStats(jpData);
        }
        if (loansRes.ok) {
          const loansData = await loansRes.json();
          if (loansData.loans) setActiveLoans(loansData.loans);
        }
      } catch {} finally {
        setLoading(false);
        setLoansLoading(false);
      }
    }
    fetchData();
    checkWallet();
  }, []);

  const checkWallet = async () => {
    const eth = getEth();
    if (!eth) return;
    try {
      const accounts = await eth.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        fetchLPPosition(accounts[0]);
      }
    } catch {}
  };

  const fetchLPPosition = async (address: string) => {
    try {
      const position = await getCreditMarketPosition(address);
      setLpPosition(position);
    } catch {}
  };

  const handleClaimInterest = async () => {
    setClaimStatus('claiming');
    setClaimError(null);
    try {
      const result = await claimInterestFromCreditMarket();
      setClaimTxHash(result.txHash);
      setClaimStatus('success');
      if (walletAddress) await fetchLPPosition(walletAddress);
    } catch (err: any) {
      setClaimError(err.message || 'Claim failed');
      setClaimStatus('error');
    }
  };

  const totalAssets = parseFloat(stats?.totalAssets || '0');
  const lockedInLoans = parseFloat(stats?.lockedInLoans || '0');
  const utilizationRate = totalAssets > 0 ? ((lockedInLoans / totalAssets) * 100).toFixed(1) : '0.0';
  const idleCapital = totalAssets - lockedInLoans;
  const positionShares = parseFloat(lpPosition?.shares || '0');
  const positionValue = parseFloat(lpPosition?.positionValueUsd || '0');
  const yieldEarned = parseFloat(lpPosition?.pendingInterestUsd || '0');

  return (
    <DesignLawLayout>
      <Head>
        <title>Lending Fund — Axiom Protocol</title>
        <meta name="description" content="SEC Reg D 506(c) compliant bridge loan fund providing short-term capital for real asset acquisition." />
      </Head>

      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-gray uppercase tracking-widest mb-4 font-dl-mono">SEC Reg D 506(c) | Accredited Participants Only</p>
        <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          Axiom Lending Fund
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed mb-6">
          Short-term bridge capital for real asset acquisition and development.
          Property-secured lending with conservative underwriting, on-chain settlement, and full audit trails.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/lending-fund/invest">
            <SolidButton>Participate in Fund</SolidButton>
          </Link>
          <Link href="/lending-fund/apply">
            <SolidButton variant="secondary">Apply for Capital</SolidButton>
          </Link>
        </div>
      </div>

      <div className="mb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
          <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
            <p className="text-xs text-dl-gray mb-1">Total Vault TVL</p>
            <p className="font-dl-mono text-lg font-semibold text-dl-navy">{loading ? '...' : formatUSD(stats?.totalAssets || '0')}</p>
          </div>
          <div className="px-4 py-4 bg-dl-bg-alt border-r border-dl-border">
            <p className="text-xs text-dl-gray mb-1">Available Liquidity</p>
            <p className="font-dl-mono text-lg font-semibold text-dl-navy">{loading ? '...' : formatUSD(stats?.availableLiquidity || '0')}</p>
          </div>
          <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
            <p className="text-xs text-dl-gray mb-1">Fund Utilization</p>
            <p className="font-dl-mono text-lg font-semibold text-dl-navy">{loading ? '...' : `${utilizationRate}%`}</p>
          </div>
          <div className="px-4 py-4 bg-dl-bg-alt">
            <p className="text-xs text-dl-gray mb-1">Target Annual Rate</p>
            <p className="font-dl-mono text-lg font-semibold text-dl-navy">{loading ? '...' : stats?.apy || '10-14%'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-0 mb-8 border-b border-dl-border">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'overview' ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-gray'
          }`}
        >
          Fund Overview
        </button>
        <button
          onClick={() => setActiveTab('lp-dashboard')}
          className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'lp-dashboard' ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-gray'
          }`}
        >
          LP Dashboard
        </button>
        <Link
          href="/lending-fund/borrow"
          className="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-dl-gray hover:text-dl-navy"
        >
          Borrow
        </Link>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="mb-12">
            <SectionHeading>Fund Performance</SectionHeading>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
              <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Active Loans</p>
                <p className="font-dl-mono text-xl font-bold text-dl-navy">{loading ? '...' : String(stats?.activeLoans || 0)}</p>
              </div>
              <div className="px-4 py-4 bg-dl-bg-alt border-r border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Total Deployed</p>
                <p className="font-dl-mono text-xl font-bold text-dl-navy">{loading ? '...' : formatUSD(stats?.lockedInLoans || '0')}</p>
              </div>
              <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Weighted Avg LTV</p>
                <p className="font-dl-mono text-xl font-bold text-dl-navy">{loading ? '...' : riskParams ? formatPercent(riskParams.maxLtvBps) : '70%'}</p>
              </div>
              <div className="px-4 py-4 bg-dl-bg-alt">
                <p className="text-xs text-dl-gray mb-1">Delinquency Count</p>
                <p className="font-dl-mono text-xl font-bold text-dl-navy">{loading ? '...' : String(stats?.totalDefaulted ? (parseFloat(stats.totalDefaulted) > 0 ? '1' : '0') : '0')}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-0 border border-t-0 border-dl-border">
              <div className="px-4 py-3 bg-dl-bg border-r border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Total Originated</p>
                <p className="font-dl-mono text-sm font-semibold text-dl-navy">{loading ? '...' : formatUSD(stats?.totalOriginated || '0')}</p>
              </div>
              <div className="px-4 py-3 bg-dl-bg-alt border-r border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Total Repaid</p>
                <p className="font-dl-mono text-sm font-semibold text-dl-navy">{loading ? '...' : formatUSD(stats?.totalRepaid || '0')}</p>
              </div>
              <div className="px-4 py-3 bg-dl-bg">
                <p className="text-xs text-dl-gray mb-1">Share Price</p>
                <p className="font-dl-mono text-sm font-semibold text-dl-navy">{loading ? '...' : `$${stats?.sharePrice || '1.00'}`}</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>How It Works</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-dl-border">
              {[
                { num: '1', title: 'Deposit', desc: 'Contribute AXUSD into the lending pool. Minimum participation: $100.' },
                { num: '2', title: 'Pool Funds', desc: 'Capital backs short-term bridge loans to qualified real estate operators.' },
                { num: '3', title: 'Earn Income', desc: 'Receive periodic distributions from loan interest payments.' },
                { num: '4', title: 'Property Secured', desc: 'All loans secured by real property at maximum 70% loan-to-value.' },
              ].map((step, i) => (
                <div key={step.num} className={`px-5 py-5 ${i < 3 ? 'md:border-r border-b md:border-b-0 border-dl-border' : ''}`}>
                  <p className="font-dl-mono text-xl text-dl-navy font-bold mb-2">{step.num}</p>
                  <h3 className="font-dl-serif text-sm text-dl-navy font-medium mb-1">{step.title}</h3>
                  <p className="text-xs text-dl-gray leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Loan Parameters</SectionHeading>
            <div className="border border-dl-border">
              {[
                { label: 'Maximum LTV', value: riskParams ? formatPercent(riskParams.maxLtvBps) : '70%', desc: 'Loan-to-value on after-repair value' },
                { label: 'Loan Term', value: riskParams ? `Up to ${riskParams.maxTermDays} days` : 'Up to 365 days', desc: 'Short-term bridge financing' },
                { label: 'Interest Rate', value: riskParams ? formatPercent(riskParams.interestRateBps) : '14%', desc: 'Annual rate charged to borrowers' },
                { label: 'Loan Size Range', value: riskParams ? `${formatUSD(riskParams.minLoanSize)} – ${formatUSD(riskParams.maxLoanSize)}` : '$50K – $500K', desc: 'Per property limits' },
              ].map((param, i) => (
                <div key={param.label} className={`px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-1 ${i < 3 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                  <div>
                    <p className="text-sm text-dl-navy font-medium">{param.label}</p>
                    <p className="text-xs text-dl-gray">{param.desc}</p>
                  </div>
                  <p className="font-dl-mono text-sm text-dl-navy font-semibold">{param.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Borrower Lifecycle States</SectionHeading>
            <div className="border border-dl-border">
              {[
                { state: 'Pending Review', desc: 'Application submitted, under underwriter review (24-48 hrs)', color: 'text-dl-gold' },
                { state: 'Approved', desc: 'Application approved, awaiting fund disbursement', color: 'text-dl-forest' },
                { state: 'Active', desc: 'Loan funded and in repayment. Daily interest accrues on outstanding principal.', color: 'text-dl-navy' },
                { state: 'Delinquent', desc: 'Past due date with outstanding balance. Late fees may apply.', color: 'text-dl-error' },
                { state: 'Repaid', desc: 'Loan fully repaid. All principal and interest cleared.', color: 'text-dl-forest' },
                { state: 'Defaulted', desc: 'Loan in default. Collateral recovery process initiated.', color: 'text-dl-error' },
              ].map((s, i) => (
                <div key={s.state} className={`flex flex-col md:flex-row md:items-center md:gap-4 px-5 py-3 ${i < 5 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                  <span className={`font-dl-mono text-xs font-semibold w-32 flex-shrink-0 ${s.color}`}>{s.state}</span>
                  <span className="text-xs text-dl-gray">{s.desc}</span>
                </div>
              ))}
              <div className="px-5 py-3 bg-dl-bg-alt border-t border-dl-border text-center">
                <Link href="/lending-fund/borrow" className="text-xs text-dl-navy underline">Access borrower dashboard (GEF Operator tier required) →</Link>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Live Loan Portfolio</SectionHeading>
            {loansLoading ? (
              <div className="border border-dl-border bg-dl-bg p-6 text-center">
                <p className="text-sm text-dl-gray font-dl-mono">Loading active loans...</p>
              </div>
            ) : activeLoans.length === 0 ? (
              <div className="border border-dl-border bg-dl-bg p-6 text-center">
                <p className="text-sm text-dl-gray">No active loans in portfolio at this time.</p>
              </div>
            ) : (
              <div className="border border-dl-border overflow-x-auto">
                <table className="w-full text-xs font-dl-mono">
                  <thead>
                    <tr className="bg-dl-bg-alt border-b border-dl-border">
                      <th className="text-left px-4 py-3 text-dl-gray font-medium">Loan ID</th>
                      <th className="text-left px-4 py-3 text-dl-gray font-medium">Location</th>
                      <th className="text-right px-4 py-3 text-dl-gray font-medium">Principal</th>
                      <th className="text-right px-4 py-3 text-dl-gray font-medium">Outstanding</th>
                      <th className="text-right px-4 py-3 text-dl-gray font-medium">Rate</th>
                      <th className="text-right px-4 py-3 text-dl-gray font-medium">LP Interest</th>
                      <th className="text-left px-4 py-3 text-dl-gray font-medium">Due Date</th>
                      <th className="text-left px-4 py-3 text-dl-gray font-medium">State</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLoans.map((loan, i) => {
                      const statusColor: Record<string, string> = {
                        active: 'text-dl-forest',
                        approved: 'text-dl-gold',
                        delinquent: 'text-dl-error',
                        repaid: 'text-dl-muted',
                        defaulted: 'text-dl-error',
                      };
                      const stateBg: Record<string, string> = {
                        active: 'bg-green-50 text-dl-forest border-green-200',
                        approved: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                        delinquent: 'bg-red-50 text-dl-error border-red-200',
                        repaid: 'bg-gray-50 text-dl-muted border-gray-200',
                        defaulted: 'bg-red-50 text-dl-error border-red-200',
                      };
                      const dueDate = loan.due_at ? new Date(loan.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—';
                      const isExpanded = expandedLoanId === loan.loan_id;
                      const schedule = isExpanded
                        ? computeAmortizationSchedule(
                            loan.loan_amount_usd,
                            loan.interest_rate_bps,
                            loan.term_days,
                            loan.funded_at,
                          )
                        : [];
                      return (
                        <Fragment key={loan.loan_id}>
                          <tr className={`border-b border-dl-border ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                            <td className="px-4 py-3 text-dl-navy">{loan.loan_id.slice(0, 8)}…</td>
                            <td className="px-4 py-3 text-dl-gray">{loan.property_address || '—'}</td>
                            <td className="px-4 py-3 text-right text-dl-navy">{formatUSD(loan.loan_amount_usd)}</td>
                            <td className="px-4 py-3 text-right text-dl-navy">{formatUSD(loan.outstanding_principal_usd)}</td>
                            <td className="px-4 py-3 text-right text-dl-navy">{formatPercent(loan.interest_rate_bps)}</td>
                            <td className="px-4 py-3 text-right text-dl-forest">
                              ${loan.lpInterestEarnedUsd || '0.0000'}
                            </td>
                            <td className="px-4 py-3 text-dl-gray">{dueDate}</td>
                            <td className={`px-4 py-3 font-semibold uppercase text-xs ${statusColor[loan.status] || 'text-dl-navy'}`}>
                              {loan.status}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setExpandedLoanId(isExpanded ? null : loan.loan_id)}
                                className="text-dl-navy underline text-xs"
                              >
                                {isExpanded ? 'Close' : 'Details'}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${loan.loan_id}-panel`} className="bg-dl-bg border-b border-dl-border">
                              <td colSpan={9} className="px-4 py-4">
                                {/* On-chain state badge + loan metrics */}
                                <div className="flex flex-wrap gap-3 items-center mb-4">
                                  <span className={`px-3 py-1 text-xs font-semibold uppercase border font-dl-mono ${stateBg[loan.status] || 'bg-dl-bg text-dl-navy border-dl-border'}`}>
                                    State: {loan.status.toUpperCase()}
                                  </span>
                                  <span className="text-xs text-dl-gray font-dl-mono">
                                    Rate: {formatPercent(loan.interest_rate_bps)} · Term: {Math.round(loan.term_days / 30)}mo · LP Interest Earned: ${loan.lpInterestEarnedUsd || '0.0000'}
                                  </span>
                                  {loan.due_at && (
                                    <span className="text-xs text-dl-gray font-dl-mono">
                                      Maturity: {dueDate}
                                    </span>
                                  )}
                                </div>
                                {/* Payment schedule sourced from on-chain amortization formula */}
                                {schedule.length > 0 ? (
                                  <div className="border border-dl-border overflow-x-auto">
                                    <div className="px-3 py-2 bg-dl-bg-alt border-b border-dl-border">
                                      <p className="text-xs text-dl-gray font-dl-mono">
                                        Payment Schedule — Amortized ({Math.round(loan.term_days / 30)} months, {formatPercent(loan.interest_rate_bps)} p.a.)
                                      </p>
                                    </div>
                                    <table className="w-full text-xs font-dl-mono">
                                      <thead>
                                        <tr className="bg-dl-bg-alt">
                                          <th className="px-3 py-2 text-left text-dl-gray font-normal">Mo.</th>
                                          <th className="px-3 py-2 text-left text-dl-gray font-normal">Due</th>
                                          <th className="px-3 py-2 text-right text-dl-gray font-normal">Payment</th>
                                          <th className="px-3 py-2 text-right text-dl-gray font-normal">Interest</th>
                                          <th className="px-3 py-2 text-right text-dl-gray font-normal">Principal</th>
                                          <th className="px-3 py-2 text-right text-dl-gray font-normal">Balance</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {schedule.slice(0, 12).map((row) => (
                                          <tr key={row.month} className={row.month % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}>
                                            <td className="px-3 py-1.5 text-dl-gray">{row.month}</td>
                                            <td className="px-3 py-1.5 text-dl-gray">{row.dueDate}</td>
                                            <td className="px-3 py-1.5 text-right text-dl-navy">{formatUSD(row.payment.toFixed(2))}</td>
                                            <td className="px-3 py-1.5 text-right text-dl-gold">{formatUSD(row.interest.toFixed(2))}</td>
                                            <td className="px-3 py-1.5 text-right text-dl-forest">{formatUSD(row.principalPmt.toFixed(2))}</td>
                                            <td className="px-3 py-1.5 text-right text-dl-navy">{formatUSD(row.balance.toFixed(2))}</td>
                                          </tr>
                                        ))}
                                        {schedule.length > 12 && (
                                          <tr className="bg-dl-bg-alt">
                                            <td colSpan={6} className="px-3 py-1.5 text-dl-muted text-center">
                                              +{schedule.length - 12} more payments · see borrower dashboard for full schedule
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-dl-gray">Schedule unavailable — loan not yet funded.</p>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-3 bg-dl-bg-alt border-t border-dl-border text-xs text-dl-gray">
                  {activeLoans.length} loan{activeLoans.length !== 1 ? 's' : ''} shown. LP Interest Earned = accrued interest since last payment.
                  Property addresses truncated for privacy.
                </div>
              </div>
            )}
          </div>

          <div className="mb-12">
            <SectionHeading>Fund Characteristics</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
              {[
                { title: 'Property Secured', desc: 'Every loan is secured by real property with conservative 70% maximum LTV on after-repair value.' },
                { title: 'On-Chain Transparency', desc: 'All fund operations are recorded on Arbitrum One for full auditability and independent verification.' },
                { title: 'Periodic Distributions', desc: 'Loan interest income distributed periodically to fund participants via AXUSD.' },
              ].map((feature, i) => (
                <div key={feature.title} className={`px-6 py-5 ${i < 2 ? 'md:border-r border-b md:border-b-0 border-dl-border' : ''}`}>
                  <h3 className="font-dl-serif text-sm text-dl-navy font-medium mb-2">{feature.title}</h3>
                  <p className="text-xs text-dl-gray leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'lp-dashboard' && (
        <>
          {!walletAddress ? (
            <div className="border border-dl-border bg-dl-bg-alt p-8 text-center mb-8">
              <h3 className="font-dl-serif text-xl text-dl-navy mb-3">Connect Wallet to View LP Dashboard</h3>
              <p className="text-sm text-dl-gray mb-6">Connect your Web3 wallet to see your vault position, yield earned, and transaction history.</p>
              <button
                onClick={async () => {
                  const eth = getEth();
                  if (!eth) { alert('Please install MetaMask or another Web3 wallet.'); return; }
                  const accounts = await eth.request({ method: 'eth_requestAccounts' });
                  if (accounts.length > 0) {
                    setWalletAddress(accounts[0]);
                    fetchLPPosition(accounts[0]);
                  }
                }}
                className="px-6 py-3 bg-dl-navy text-white font-medium"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <SectionHeading>Your Vault Position</SectionHeading>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
                  <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Shares Held</p>
                    <p className="font-dl-mono text-lg font-bold text-dl-navy">
                      {lpPosition ? parseFloat(lpPosition.shares).toFixed(4) : '—'}
                    </p>
                  </div>
                  <div className="px-4 py-4 bg-dl-bg-alt border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Current Value</p>
                    <p className="font-dl-mono text-lg font-bold text-dl-navy">
                      {lpPosition ? formatUSD(positionValue.toString()) : '—'}
                    </p>
                  </div>
                  <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Claimable Interest</p>
                    <p className="font-dl-mono text-lg font-bold text-green-700">
                      {lpPosition ? (yieldEarned > 0 ? `+${formatUSD(yieldEarned.toString())}` : '$0') : '—'}
                    </p>
                  </div>
                  <div className="px-4 py-4 bg-dl-bg-alt">
                    <p className="text-xs text-dl-gray mb-1">AXUSD Balance</p>
                    <p className="font-dl-mono text-lg font-bold text-dl-navy">
                      {lpPosition ? formatUSD(lpPosition.axusdBalanceUsd) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <SectionHeading>Fund Overview</SectionHeading>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-0 border border-dl-border">
                  <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Total Vault TVL</p>
                    <p className="font-dl-mono text-base font-semibold text-dl-navy">{formatUSD(stats?.totalAssets || '0')}</p>
                  </div>
                  <div className="px-4 py-4 bg-dl-bg-alt border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Deployed Capital</p>
                    <p className="font-dl-mono text-base font-semibold text-dl-navy">{formatUSD(stats?.lockedInLoans || '0')}</p>
                  </div>
                  <div className="px-4 py-4 bg-dl-bg">
                    <p className="text-xs text-dl-gray mb-1">Idle Capital</p>
                    <p className="font-dl-mono text-base font-semibold text-dl-navy">{formatUSD(idleCapital.toString())}</p>
                  </div>
                </div>
                <div className="border border-t-0 border-dl-border px-4 py-3 bg-dl-bg-alt">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-dl-gray">Fund Utilization Rate</span>
                    <span className="text-xs font-dl-mono text-dl-navy font-semibold">{utilizationRate}%</span>
                  </div>
                  <div className="w-full h-2 bg-dl-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-dl-navy rounded-full transition-all"
                      style={{ width: `${Math.min(parseFloat(utilizationRate), 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-dl-gray mt-1">
                    <span>Deployed: {formatUSD(stats?.lockedInLoans || '0')}</span>
                    <span>Idle: {formatUSD(idleCapital.toString())}</span>
                  </div>
                </div>
              </div>

              {lpPosition && parseFloat(lpPosition.pendingInterestUsd) > 0 && (
                <div className="mb-6 border border-dl-border bg-dl-bg-alt p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h4 className="font-dl-serif text-base text-dl-navy font-medium">Claimable Interest</h4>
                      <p className="text-xs text-dl-gray mt-0.5">
                        {formatUSD(lpPosition.pendingInterestUsd)} AXUSD available to claim on-chain
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={handleClaimInterest}
                        disabled={claimStatus === 'claiming'}
                        className="px-6 py-2 bg-dl-forest text-white text-sm font-medium disabled:opacity-50"
                      >
                        {claimStatus === 'claiming' ? 'Claiming...' : `Claim ${formatUSD(lpPosition.pendingInterestUsd)}`}
                      </button>
                      {claimStatus === 'success' && claimTxHash && (
                        <a
                          href={`https://arbitrum.blockscout.com/tx/${claimTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-dl-forest underline"
                        >
                          Claimed — View tx
                        </a>
                      )}
                      {claimStatus === 'error' && (
                        <p className="text-xs text-dl-error">{claimError}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 mb-8">
                <Link href="/lending-fund/invest">
                  <SolidButton>Deposit More</SolidButton>
                </Link>
                <Link href="/lending-fund/invest">
                  <SolidButton variant="secondary">Withdraw</SolidButton>
                </Link>
                <a
                  href={`https://arbitrum.blockscout.com/address/${CREDIT_MARKET_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-dl-border text-sm text-dl-gray hover:text-dl-navy"
                >
                  View Pool Contract
                </a>
              </div>

              <div className="mb-8 border border-dl-border bg-dl-bg-alt p-4">
                <p className="text-xs text-dl-gray">
                  Connected: <span className="font-dl-mono text-dl-navy">{walletAddress?.slice(0, 10)}...{walletAddress?.slice(-8)}</span>
                </p>
              </div>
            </>
          )}
        </>
      )}

      <div className="mb-10">
        <SectionHeading>Community Junior Tranche — Wealth Practice Graduates</SectionHeading>
        <div className="border border-dl-border">
          <div className="px-6 py-5 bg-dl-bg border-b border-dl-border border-l-4 border-l-dl-forest">
            <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-2">What Is the Community Junior Tranche?</h3>
            <p className="text-sm text-dl-gray leading-relaxed">
              Community Entry Credit interest payments are distributed to a community junior pool funded by Wealth Practice graduates.
              This is the first yield-generating mechanism in the Axiom capital stack available to non-accredited participants.
              Wealth Practice members who have completed at least one full cycle are eligible to participate.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-dl-border">
            <div className="px-5 py-4 bg-dl-bg-alt border-r border-dl-border border-b md:border-b-0">
              <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Interest Rate</p>
              <p className="font-dl-mono text-lg font-bold text-dl-navy">500 bps</p>
              <p className="text-xs text-dl-gray mt-0.5">5% APR on drawn balances</p>
            </div>
            <div className="px-5 py-4 bg-dl-bg border-r border-dl-border border-b md:border-b-0">
              <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Interest Collected</p>
              <p className="font-dl-mono text-lg font-bold text-dl-navy">
                {juniorPoolStats ? `$${juniorPoolStats.totalInterestCollectedUsd.toFixed(4)}` : '—'}
              </p>
              <p className="text-xs text-dl-gray mt-0.5">Total lifetime</p>
            </div>
            <div className="px-5 py-4 bg-dl-bg-alt border-r border-dl-border">
              <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">30-Day Distributions</p>
              <p className="font-dl-mono text-lg font-bold text-dl-navy">
                {juniorPoolStats ? `$${juniorPoolStats.recentInterestDistributed30dUsd.toFixed(4)}` : '—'}
              </p>
              <p className="text-xs text-dl-gray mt-0.5">{juniorPoolStats?.recentRepaymentEvents30d ?? 0} repayment events</p>
            </div>
            <div className="px-5 py-4 bg-dl-bg">
              <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Repayment Rate</p>
              <p className="font-dl-mono text-lg font-bold text-dl-navy">
                {juniorPoolStats?.repaymentRatePct != null ? `${juniorPoolStats.repaymentRatePct}%` : 'N/A'}
              </p>
              <p className="text-xs text-dl-gray mt-0.5">{juniorPoolStats?.repaidCount ?? 0} repaid / {juniorPoolStats?.totalLoansOriginated ?? 0} originated</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b border-dl-border">
            <div className="px-5 py-4 bg-dl-bg md:border-r border-b md:border-b-0 border-dl-border">
              <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Eligibility</p>
              <p className="text-sm text-dl-navy font-bold">Wealth Practice graduate</p>
              <p className="text-xs text-dl-gray mt-1">Minimum one completed Wealth Practice cycle (GEF Participant+)</p>
            </div>
            <div className="px-5 py-4 bg-dl-bg-alt md:border-r border-b md:border-b-0 border-dl-border">
              <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Current Outstanding</p>
              <p className="font-dl-mono text-sm font-bold text-dl-navy">
                {juniorPoolStats ? `$${juniorPoolStats.currentOutstandingUsd.toFixed(2)}` : '—'}
              </p>
              <p className="text-xs text-dl-gray mt-1">Drawn balances currently outstanding</p>
            </div>
            <div className="px-5 py-4 bg-dl-bg">
              <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Distribution</p>
              <p className="text-sm text-dl-navy font-bold">On repayment</p>
              <p className="text-xs text-dl-gray mt-1">Interest distributed atomically when borrowers repay credit lines</p>
            </div>
          </div>
          <div className="px-6 py-4 bg-dl-bg-alt text-center">
            <p className="text-xs text-dl-gray">
              V1 junior tranche LP invitations are manual. Complete the Wealth Practice and signal interest through the Investor Portal.{' '}
              <Link href="/wealth-practice" className="text-dl-navy underline">Join a Wealth Practice group &rarr;</Link>
              {' | '}
              <Link href="/community-credit" className="text-dl-navy underline">View Community Entry Credit &rarr;</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <SectionHeading>Disclosure</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt">
          <p className="text-xs text-dl-gray leading-relaxed">
            This offering is made pursuant to SEC Rule 506(c) and is available only to verified accredited participants.
            Securities have not been registered under the Securities Act of 1933. Participation involves substantial risk
            including possible loss of principal. Past performance is not indicative of future results. Review all program
            documentation before committing capital.
          </p>
        </div>
      </div>
    </DesignLawLayout>
  );
}
