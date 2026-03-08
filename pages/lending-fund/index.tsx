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

export default function LendingFundPage() {
  const [stats, setStats] = useState<FundStats | null>(null);
  const [riskParams, setRiskParams] = useState<ProductRisk | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [lpPosition, setLpPosition] = useState<LPPosition | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'lp-dashboard'>('overview');

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, riskRes] = await Promise.all([
          fetch('/api/realestate/fund-stats'),
          fetch('/api/realestate/risk-params?productId=1')
        ]);
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
          if (data.riskParams) setRiskParams(data.riskParams);
        }
        if (riskRes.ok) setRiskParams(await riskRes.json());
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
