import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../../components/design-law';
import { getVaultPosition, PRODUCT_VAULTS } from '../../lib/web3/vaultService';

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

interface LPPosition {
  shares: string;
  assetBalance: string;
  positionValue: string;
}

function formatUSD(value: string) {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function formatPercent(bps: number) {
  return (bps / 100).toFixed(1) + '%';
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

export default function LendingFundPage() {
  const [stats, setStats] = useState<FundStats | null>(null);
  const [riskParams, setRiskParams] = useState<ProductRisk | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [lpPosition, setLpPosition] = useState<LPPosition | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'lp-dashboard'>('overview');
  const [juniorPoolStats, setJuniorPoolStats] = useState<JuniorPoolStats | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, riskRes, juniorRes] = await Promise.all([
          fetch('/api/realestate/fund-stats'),
          fetch('/api/realestate/risk-params?productId=1'),
          fetch('/api/community-credit/junior-pool-stats'),
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
      } catch {} finally {
        setLoading(false);
      }
    }
    fetchData();
    checkWallet();
  }, []);

  const checkWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          fetchLPPosition(accounts[0]);
        }
      } catch {}
    }
  };

  const fetchLPPosition = async (address: string) => {
    try {
      const position = await getVaultPosition('lending-fund', address);
      setLpPosition(position);
    } catch {}
  };

  const totalAssets = parseFloat(stats?.totalAssets || '0');
  const lockedInLoans = parseFloat(stats?.lockedInLoans || '0');
  const utilizationRate = totalAssets > 0 ? ((lockedInLoans / totalAssets) * 100).toFixed(1) : '0.0';
  const idleCapital = totalAssets - lockedInLoans;
  const positionShares = parseFloat(lpPosition?.shares || '0');
  const positionValue = parseFloat(lpPosition?.positionValue || '0');
  const yieldEarned = positionValue - positionShares;

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
                  if (typeof window !== 'undefined' && (window as any).ethereum) {
                    const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
                    if (accounts.length > 0) {
                      setWalletAddress(accounts[0]);
                      fetchLPPosition(accounts[0]);
                    }
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
                      {lpPosition ? formatUSD(lpPosition.positionValue) : '—'}
                    </p>
                  </div>
                  <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Yield Earned</p>
                    <p className="font-dl-mono text-lg font-bold text-green-700">
                      {lpPosition ? (yieldEarned > 0 ? `+${formatUSD(yieldEarned.toString())}` : '$0') : '—'}
                    </p>
                  </div>
                  <div className="px-4 py-4 bg-dl-bg-alt">
                    <p className="text-xs text-dl-gray mb-1">AXUSD Balance</p>
                    <p className="font-dl-mono text-lg font-bold text-dl-navy">
                      {lpPosition ? formatUSD(lpPosition.assetBalance) : '—'}
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

              <div className="flex flex-wrap gap-3 mb-8">
                <Link href="/lending-fund/invest">
                  <SolidButton>Deposit More</SolidButton>
                </Link>
                <Link href="/lending-fund/invest">
                  <SolidButton variant="secondary">Withdraw</SolidButton>
                </Link>
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
