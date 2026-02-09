import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../../components/design-law';

interface FundStats {
  totalAssets: string;
  availableLiquidity: string;
  lockedInLoans: string;
  totalYield: string;
  activeLoans: number;
  totalOriginated: string;
  totalRepaid: string;
  apy: string;
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

export default function LendingFundPage() {
  const [stats, setStats] = useState<FundStats | null>(null);
  const [riskParams, setRiskParams] = useState<ProductRisk | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, riskRes] = await Promise.all([
          fetch('/api/realestate/fund-stats'),
          fetch('/api/realestate/risk-params?productId=1')
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (riskRes.ok) setRiskParams(await riskRes.json());
      } catch {} finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
            <p className="text-xs text-dl-gray mb-1">Total Pool Assets</p>
            <p className="font-dl-mono text-lg font-semibold text-dl-navy">{loading ? '...' : formatUSD(stats?.totalAssets || '0')}</p>
          </div>
          <div className="px-4 py-4 bg-dl-bg-alt border-r border-dl-border">
            <p className="text-xs text-dl-gray mb-1">Available Liquidity</p>
            <p className="font-dl-mono text-lg font-semibold text-dl-navy">{loading ? '...' : formatUSD(stats?.availableLiquidity || '0')}</p>
          </div>
          <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
            <p className="text-xs text-dl-gray mb-1">Active Loans</p>
            <p className="font-dl-mono text-lg font-semibold text-dl-navy">{loading ? '...' : String(stats?.activeLoans || 0)}</p>
          </div>
          <div className="px-4 py-4 bg-dl-bg-alt">
            <p className="text-xs text-dl-gray mb-1">Target Annual Rate</p>
            <p className="font-dl-mono text-lg font-semibold text-dl-navy">{loading ? '...' : stats?.apy || '10-14%'}</p>
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
