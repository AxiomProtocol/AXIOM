import { useState, useEffect, Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../../components/design-law';

function IconShield({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
function IconChart({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
function IconBuilding({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}
function IconCoin({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconDeposit({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
function IconLock({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}
function IconGlobe({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}
function IconArrowUp({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}
function IconCheck({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
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
  const [activeTab, setActiveTab] = useState<'overview' | 'lp-dashboard' | 'open-market' | 'fiat-deposit'>('overview');
  const [juniorPoolStats, setJuniorPoolStats] = useState<JuniorPoolStats | null>(null);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [loansLoading, setLoansLoading] = useState(true);
  /** ID of the loan row currently expanded to show lifecycle detail + payment schedule. */
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [evkVault, setEvkVault] = useState<any>(null);
  const [evkLoading, setEvkLoading] = useState(false);

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

  useEffect(() => {
    if (activeTab !== 'open-market' || evkVault) return;
    setEvkLoading(true);
    fetch('/api/euler/axusd-vault')
      .then(r => r.json())
      .then(d => setEvkVault(d))
      .catch(() => {})
      .finally(() => setEvkLoading(false));
  }, [activeTab]);

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
        <title>Lending Fund — Layer 03 Capital Deployment | Axiom Protocol</title>
        <meta name="description" content="Axiom Protocol Lending Fund: SEC Reg D 506(c) bridge loan capital program for real asset acquisition. On-chain settlement and institutional reporting on Arbitrum One. Accredited participants only." />
      </Head>

      <div className="border-b border-dl-border mb-10 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="py-10 pr-0 lg:pr-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-dl-mono text-xs text-dl-gray border border-dl-border px-2 py-0.5">Layer 03 Capital Deployment</span>
              <span className="font-dl-mono text-xs text-dl-forest border border-dl-forest px-2 py-0.5">FORMATION</span>
            </div>
            <p className="text-xs text-dl-gray uppercase tracking-widest mb-4 font-dl-mono">SEC Reg D 506(c) | Accredited Participants Only</p>
            <h1 className="font-dl-serif text-3xl md:text-5xl text-dl-navy leading-tight mb-4">
              Axiom Lending Fund<br />
              <span className="text-dl-gold" style={{ fontSize: '60%' }}>Layer 03 Capital Deployment</span>
            </h1>
            <p className="text-sm text-dl-gray max-w-xl leading-relaxed mb-5">
              Institutional-grade bridge capital for real asset acquisition and development — the Layer 03 capital deployment component of the Axiom financial operating system.
              Every loan is secured by real property, underwritten at a maximum 70% LTV, settled in AXUSD on Arbitrum One, and recorded with an independently verifiable audit trail.
              Designed to align with SEC Reg D 506(c). Accredited participants only. Target return is variable — not guaranteed.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                'Max 70% LTV',
                'Arbitrum One',
                'SEC Reg D 506(c)',
                'AXUSD Denominated',
                'Accredited Only',
              ].map(tag => (
                <span key={tag} className="px-3 py-1 text-xs font-dl-mono text-dl-gray border border-dl-border bg-dl-bg">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link href="/lending-fund/invest">
                <SolidButton>Participate in Fund</SolidButton>
              </Link>
              <Link href="/lending-fund/borrow">
                <SolidButton variant="secondary">Apply for Capital</SolidButton>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-0 border border-dl-border">
              <div className="px-4 py-3 border-r border-dl-border text-center">
                <p className="font-dl-mono text-xs text-dl-gray mb-1">Target Return</p>
                <p className="font-dl-serif text-lg text-dl-navy font-semibold">10–14%</p>
                <p className="text-xs text-dl-gray">Variable — not guaranteed</p>
              </div>
              <div className="px-4 py-3 border-r border-dl-border text-center">
                <p className="font-dl-mono text-xs text-dl-gray mb-1">Max LTV</p>
                <p className="font-dl-serif text-lg text-dl-navy font-semibold">70%</p>
                <p className="text-xs text-dl-gray">After-Repair Value</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="font-dl-mono text-xs text-dl-gray mb-1">Settlement</p>
                <p className="font-dl-serif text-lg text-dl-navy font-semibold">On-Chain</p>
                <p className="text-xs text-dl-gray">Arbitrum One</p>
              </div>
            </div>
          </div>
          <div className="hidden lg:block border-l border-dl-border relative">
            <img
              src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80"
              alt="Residential property secured by Axiom Lending Fund"
              className="w-full h-full object-cover"
              style={{ minHeight: '420px', maxHeight: '520px' }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-dl-navy px-5 py-3">
              <p className="text-xs text-white font-dl-mono opacity-80">Fund Asset Class: Single-Family &amp; Multi-Family Residential Bridge</p>
            </div>
          </div>
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
            <p className="text-xs text-dl-gray mb-1">Target Return (Variable)</p>
            <p className="font-dl-mono text-lg font-semibold text-dl-navy">{loading ? '...' : stats?.apy || '10–14%'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-0 mb-8 border-b border-dl-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'overview' ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-gray'
          }`}
        >
          Fund Overview
        </button>
        <button
          onClick={() => setActiveTab('lp-dashboard')}
          className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'lp-dashboard' ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-gray'
          }`}
        >
          LP Dashboard
        </button>
        <button
          onClick={() => setActiveTab('open-market')}
          className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'open-market' ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-gray'
          }`}
        >
          Open Market
        </button>
        <button
          onClick={() => setActiveTab('fiat-deposit')}
          className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'fiat-deposit' ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-gray'
          }`}
        >
          Fiat Deposit
        </button>
        <Link
          href="/lending-fund/borrow"
          className="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-dl-gray hover:text-dl-navy whitespace-nowrap"
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
                {
                  num: '01', title: 'Deposit AXUSD',
                  desc: 'Accredited participants deposit AXUSD into the lending pool. Capital is committed to the on-chain credit market.',
                  icon: <IconDeposit className="w-8 h-8" />,
                },
                {
                  num: '02', title: 'Fund Bridge Loans',
                  desc: 'Pooled capital is deployed as short-term bridge loans to GEF Operator-tier real estate operators.',
                  icon: <IconBuilding className="w-8 h-8" />,
                },
                {
                  num: '03', title: 'Earn Interest',
                  desc: 'Interest paid by borrowers flows back to the pool. Your pro-rata share accumulates as claimable AXUSD.',
                  icon: <IconCoin className="w-8 h-8" />,
                },
                {
                  num: '04', title: 'Property Secured',
                  desc: 'Every loan is collateralized by real property at a maximum 70% LTV — capital protected by hard assets.',
                  icon: <IconShield className="w-8 h-8" />,
                },
              ].map((step, i) => (
                <div key={step.num} className={`px-5 py-6 ${i < 3 ? 'md:border-r border-b md:border-b-0 border-dl-border' : ''}`}>
                  <div className="text-dl-forest mb-3">{step.icon}</div>
                  <p className="font-dl-mono text-xs text-dl-gray mb-1">STEP {step.num}</p>
                  <h3 className="font-dl-serif text-base text-dl-navy font-semibold mb-2">{step.title}</h3>
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
                {
                  title: 'Hard Asset Collateral',
                  desc: 'Every loan is secured by a recorded first-lien position on real property. Maximum LTV of 70% on after-repair value provides a meaningful collateral cushion.',
                  icon: <IconShield className="w-6 h-6" />,
                  detail: '70% Max LTV',
                },
                {
                  title: 'On-Chain Settlement',
                  desc: 'Loan origination, disbursement, and repayment are executed on Arbitrum One. Every transaction is independently verifiable via block explorer.',
                  icon: <IconGlobe className="w-6 h-6" />,
                  detail: 'Arbitrum One',
                },
                {
                  title: 'Pro-Rata Interest',
                  desc: 'Interest paid by borrowers is tracked per LP share. Your claimable interest accumulates automatically — claim at any time via the LP Dashboard.',
                  icon: <IconCoin className="w-6 h-6" />,
                  detail: '10–14% Variable',
                },
              ].map((feature, i) => (
                <div key={feature.title} className={`px-6 py-6 ${i < 2 ? 'md:border-r border-b md:border-b-0 border-dl-border' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-dl-navy">{feature.icon}</div>
                    <span className="font-dl-mono text-xs text-dl-forest font-semibold border border-dl-forest px-2 py-0.5">{feature.detail}</span>
                  </div>
                  <h3 className="font-dl-serif text-base text-dl-navy font-semibold mb-2">{feature.title}</h3>
                  <p className="text-xs text-dl-gray leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Who Can Participate</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
              <div className="px-8 py-8 border-b md:border-b-0 md:border-r border-dl-border">
                <div className="flex items-center gap-3 mb-4">
                  <IconArrowUp className="w-7 h-7 text-dl-navy" />
                  <div>
                    <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">For Capital Providers</p>
                    <h3 className="font-dl-serif text-xl text-dl-navy font-semibold">LP Investors</h3>
                  </div>
                </div>
                <div className="relative mb-6 border border-dl-border overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=700&q=80"
                    alt="Real estate investment"
                    className="w-full object-cover"
                    style={{ height: '180px' }}
                  />
                </div>
                <ul className="space-y-2 mb-5">
                  {[
                    'Accredited investors only (SEC Reg D 506(c))',
                    'Minimum participation: $100 AXUSD',
                    'ERC-3643 identity verification required',
                    'Interest accrues daily, claim at any time',
                    'On-chain LP position — fully auditable',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-dl-gray">
                      <IconCheck className="w-4 h-4 text-dl-forest flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/lending-fund/invest">
                  <SolidButton>Invest in Fund</SolidButton>
                </Link>
              </div>
              <div className="px-8 py-8">
                <div className="flex items-center gap-3 mb-4">
                  <IconBuilding className="w-7 h-7 text-dl-navy" />
                  <div>
                    <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">For Real Estate Operators</p>
                    <h3 className="font-dl-serif text-xl text-dl-navy font-semibold">Borrowers</h3>
                  </div>
                </div>
                <div className="relative mb-6 border border-dl-border overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=700&q=80"
                    alt="Property construction and renovation"
                    className="w-full object-cover"
                    style={{ height: '180px' }}
                  />
                </div>
                <ul className="space-y-2 mb-5">
                  {[
                    'GEF Operator tier or higher required',
                    'Loan range: $50,000 – $500,000',
                    'Terms up to 24 months',
                    '14% annual rate (1,400 bps)',
                    'Draw tranches — receive capital in stages',
                    '3% origination fee, collected at closing',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-dl-gray">
                      <IconCheck className="w-4 h-4 text-dl-forest flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/lending-fund/borrow">
                  <SolidButton variant="secondary">Apply for Capital</SolidButton>
                </Link>
              </div>
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

      {activeTab === 'open-market' && (
        <div className="mb-12">
          <div className="mb-6">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
              <div>
                <SectionHeading>AXUSD EVK Open Money Market</SectionHeading>
                <p className="text-xs text-dl-gray max-w-2xl leading-relaxed">
                  An Euler V2 vault that holds ERC-3643 compliant AXUSD as its base asset.
                  Any identity-verified address may deposit USDC as collateral and borrow AXUSD at a variable rate
                  determined by a Linear Kink IRM (1% base, 5% at 80% utilization, 100% max).
                  No GEF operator tier required — identity verification and ERC-3643 compliance checks are enforced on-chain.
                </p>
              </div>
              <Link href="/lending-fund/borrow?market=open" className="px-4 py-2 bg-dl-navy text-white text-xs font-medium font-dl-mono whitespace-nowrap">
                Open Market Borrow &rarr;
              </Link>
            </div>

            {evkLoading && (
              <div className="border border-dl-border p-8 text-center">
                <p className="text-sm text-dl-gray font-dl-mono">Loading vault data...</p>
              </div>
            )}

            {!evkLoading && evkVault && (
              <>
                {evkVault.status === 'PENDING_DEPLOYMENT' && (
                  <div className="border border-dl-border bg-dl-bg-alt p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-dl-mono text-xs font-semibold text-dl-gold bg-yellow-50 border border-dl-gold px-2 py-0.5">PENDING DEPLOYMENT</span>
                      <span className="text-xs text-dl-gray font-dl-mono">Awaiting on-chain deployment</span>
                    </div>
                    <p className="text-xs text-dl-gray leading-relaxed mb-3">
                      The EVK vault contract has not yet been deployed to Arbitrum One. All parameters below reflect
                      the planned configuration. Deploy after the ERC-7726 oracle is live.
                    </p>
                    <div className="font-dl-mono text-xs text-dl-gray space-y-1">
                      <p><span className="text-dl-navy">Step 1:</span> {evkVault.deployInstructions?.step1}</p>
                      <p><span className="text-dl-navy">Step 2:</span> {evkVault.deployInstructions?.step2}</p>
                      <p><span className="text-dl-navy">Step 3:</span> {evkVault.deployInstructions?.step3}</p>
                      <p><span className="text-dl-navy">Step 4:</span> {evkVault.deployInstructions?.step4}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-6">
                  {[
                    { label: 'TVL', value: `$${parseFloat(evkVault.vault?.tvlAxusd || '0').toLocaleString('en-US', { minimumFractionDigits: 0 })} AXUSD`, sub: 'Total Value Locked' },
                    { label: 'Available', value: `$${parseFloat(evkVault.vault?.availableLiquidityAxusd || '0').toLocaleString('en-US', { minimumFractionDigits: 0 })} AXUSD`, sub: 'Undrawn liquidity' },
                    { label: 'Utilization', value: `${evkVault.vault?.utilizationPct || '0'}%`, sub: 'Borrow / TVL' },
                    { label: 'Borrow APY', value: `${evkVault.vault?.borrowApyPct || '1.0'}%`, sub: 'Variable (LinearKink IRM)' },
                  ].map((m, i) => (
                    <div key={m.label} className={`px-4 py-4 bg-dl-bg ${i < 3 ? 'border-r border-dl-border' : ''}`}>
                      <p className="text-xs text-dl-gray mb-1 font-dl-mono uppercase">{m.label}</p>
                      <p className="font-dl-mono text-base font-bold text-dl-navy">{m.value}</p>
                      <p className="text-xs text-dl-muted mt-0.5">{m.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="border border-dl-border">
                    <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
                      <p className="text-xs font-semibold text-dl-navy font-dl-mono uppercase">Collateral Parameters</p>
                    </div>
                    {evkVault.vault?.collateral?.map((c: any, i: number) => (
                      <div key={c.symbol} className={`px-4 py-3 text-xs font-dl-mono ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                        <div className="flex justify-between mb-1">
                          <span className="text-dl-gray uppercase">{c.symbol}</span>
                          <span className="text-dl-navy font-semibold">{c.address.slice(0, 6)}…{c.address.slice(-4)}</span>
                        </div>
                        <div className="flex justify-between text-dl-gray">
                          <span>Borrow LTV: <span className="text-dl-forest">{c.borrowLTV}%</span></span>
                          <span>Liq. LTV: <span className="text-dl-gold">{c.liquidationLTV}%</span></span>
                        </div>
                        <div className="text-dl-muted mt-1">Pool size: {parseFloat(c.poolSizeUsdc || '0').toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                      </div>
                    ))}
                  </div>
                  <div className="border border-dl-border">
                    <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
                      <p className="text-xs font-semibold text-dl-navy font-dl-mono uppercase">Market Configuration</p>
                    </div>
                    {[
                      { k: 'Asset', v: `ERC-3643 AXUSD` },
                      { k: 'Vault', v: evkVault.vault?.vaultAddress === '0x0000000000000000000000000000000000000000' ? 'PENDING DEPLOYMENT' : `${evkVault.vault?.vaultAddress?.slice(0, 6)}…${evkVault.vault?.vaultAddress?.slice(-4)}` },
                      { k: 'IRM', v: evkVault.vault?.irm === '0x0000000000000000000000000000000000000000' ? 'PENDING DEPLOYMENT' : `${evkVault.vault?.irm?.slice(0, 6)}…${evkVault.vault?.irm?.slice(-4)}` },
                      { k: 'Oracle', v: evkVault.vault?.oracleDeployed ? `${evkVault.vault?.oracle?.slice(0, 6)}…${evkVault.vault?.oracle?.slice(-4)}` : 'PENDING DEPLOYMENT' },
                      { k: 'Borrow Cap', v: `${parseFloat(evkVault.vault?.borrowCapAxusd || '500000').toLocaleString()} AXUSD` },
                      { k: 'Supply Cap', v: `${parseFloat(evkVault.vault?.supplyCapAxusd || '1000000').toLocaleString()} AXUSD` },
                      { k: 'EVC', v: `${evkVault.vault?.evc?.slice(0, 6)}…${evkVault.vault?.evc?.slice(-4)}` },
                      { k: 'Network', v: 'Arbitrum One (42161)' },
                    ].map((row, i) => (
                      <div key={row.k} className={`flex justify-between px-4 py-2 text-xs font-dl-mono ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                        <span className="text-dl-gray uppercase">{row.k}</span>
                        <span className={`text-dl-navy ${row.v === 'PENDING DEPLOYMENT' ? 'text-dl-gold' : ''}`}>{row.v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-dl-border bg-dl-bg-alt p-4">
                  <p className="text-xs text-dl-gray leading-relaxed">
                    <span className="font-semibold text-dl-navy">ERC-3643 Prerequisite:</span> The vault address and EVC must be registered
                    in the LendingPlatformModule (<span className="font-dl-mono">{`0xC017...50Bb6F`}</span>) via <span className="font-dl-mono">addPlatform()</span> before
                    the vault can receive or hold ERC-3643 AXUSD. This whitelist step runs during deployment.
                    Borrowers must hold a verified on-chain identity to interact with this market.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'fiat-deposit' && (
        <div className="mb-12">
          <SectionHeading>Fiat Deposit — Axiom Nexus Account</SectionHeading>
          <p className="text-sm text-dl-gray mb-8 leading-relaxed">
            The Lending Fund accepts fiat capital contributions via domestic ACH and wire transfer through the Axiom Nexus Account banking layer
            (First Internet Bank, FDIC-insured). Your deposit is credited to the LP Deposit ledger and allocated to the fund once settlement is confirmed.
          </p>

          {/* How it works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border mb-10">
            {[
              { n: '01', title: 'Register Your Nexus Account', body: 'Visit My Nexus Account to register your wallet address and receive your unique reference code (AXM-XXXXXXXX) and dedicated ACH routing and account number.' },
              { n: '02', title: 'Send ACH or Wire', body: 'Initiate a domestic ACH or wire to your dedicated virtual account number. Include your reference code in the memo field. Funds typically settle in 1–2 business days.' },
              { n: '03', title: 'LP Position Credited', body: 'Once the Axiom team confirms receipt, your LP deposit record is updated to "received" and your capital is allocated to the Lending Fund pool. You will receive a confirmation notification.' },
            ].map((s, i) => (
              <div key={s.n} className={`p-6 ${i < 2 ? 'border-r border-dl-border' : ''}`}>
                <p className="text-3xl font-dl-serif text-dl-navy mb-3">{s.n}</p>
                <p className="text-sm font-semibold text-dl-navy mb-2">{s.title}</p>
                <p className="text-xs text-dl-gray leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          {/* Deposit instructions panel */}
          <div className="border border-dl-border mb-10">
            <div className="bg-dl-navy px-6 py-4">
              <p className="font-dl-mono text-xs text-white uppercase tracking-wider">ACH Deposit Instructions</p>
            </div>
            <div className="divide-y divide-dl-border">
              {[
                { label: 'Bank Name', value: 'First Internet Bank' },
                { label: 'Account Name', value: 'Axiom Protocol LLC — Nexus Account' },
                { label: 'Account Type', value: 'Checking' },
                { label: 'Routing Number', value: '071006486' },
                { label: 'Account Number', value: 'Your dedicated virtual account number (see My Nexus Account)' },
                { label: 'Memo / Reference', value: 'Include your AXM-XXXXXXXX reference code' },
                { label: 'Settlement', value: '1–2 business days (ACH) · Same day (wire, by 2PM ET)' },
                { label: 'Minimum Deposit', value: '$5,000 (accredited participants only)' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between px-6 py-3 text-xs font-dl-mono">
                  <span className="text-dl-gray uppercase">{row.label}</span>
                  <span className="text-dl-navy text-right max-w-xs">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* My Nexus Account CTA */}
          <div className="border border-dl-border bg-dl-bg-alt p-6 mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="font-dl-serif text-dl-navy text-lg mb-1">Get Your Dedicated Account Number</p>
              <p className="text-xs text-dl-gray leading-relaxed">
                Every registered participant receives a unique ACH routing and account number through the Axiom Nexus Account layer.
                Your deposits are routed directly to your LP position with zero co-mingling.
              </p>
            </div>
            <a
              href="/banking/my-account"
              className="inline-block border border-dl-navy bg-dl-navy text-white font-dl-mono text-xs uppercase tracking-wider px-6 py-3 hover:bg-dl-navy/90 transition-colors whitespace-nowrap"
            >
              My Nexus Account
            </a>
          </div>

          {/* FAQ */}
          <SectionHeading>Frequently Asked Questions</SectionHeading>
          <div className="border border-dl-border divide-y divide-dl-border">
            {[
              {
                q: 'Is my fiat deposit insured?',
                a: 'The Axiom Nexus Account is held at First Internet Bank, an FDIC-insured institution. Deposits are insured up to $250,000 per depositor, per insured bank, per ownership category.',
              },
              {
                q: 'How long does settlement take?',
                a: 'Standard ACH transfers settle in 1–2 business days. Same-day wire transfers initiated before 2 PM ET typically settle the same business day. International wire transfers may take 2–5 business days.',
              },
              {
                q: 'What is the minimum deposit for the Lending Fund?',
                a: 'The minimum fiat deposit for Lending Fund participation is $5,000. This offering is available only to verified accredited participants under SEC Rule 506(c).',
              },
              {
                q: 'Can I use on-chain AXUSD instead of fiat?',
                a: 'Yes. The Lending Fund also accepts AXUSD via the Open Market tab. Fiat capital and on-chain AXUSD are both valid contribution pathways. Your LP position is denominated in AXUSD equivalent.',
              },
              {
                q: 'What happens after my deposit is confirmed?',
                a: 'Once the Axiom operations team confirms your ACH receipt, your LP Deposit record transitions from "pending" to "received" and then "applied" once capital is deployed to the fund. You will be notified at each stage.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="px-6 py-4">
                <p className="font-semibold text-dl-navy text-sm mb-1">{q}</p>
                <p className="text-xs text-dl-gray leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
