import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MobileBottomNav from '../../components/lending-fund/MobileBottomNav';

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

export default function LendingFundPage() {
  const [stats, setStats] = useState<FundStats | null>(null);
  const [riskParams, setRiskParams] = useState<ProductRisk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, riskRes] = await Promise.all([
          fetch('/api/realestate/fund-stats'),
          fetch('/api/realestate/risk-params?productId=1')
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (riskRes.ok) {
          const riskData = await riskRes.json();
          setRiskParams(riskData);
        }
      } catch (err) {
        setError('Unable to load fund data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatUSD = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatPercent = (bps: number) => {
    return (bps / 100).toFixed(1) + '%';
  };

  return (
    <>
      <Head>
        <title>AXUSD Fix & Flip Lending Fund | Axiom Nexus</title>
        <meta name="description" content="Earn 10-14% target returns backing real estate investors with the AXUSD Fix & Flip Lending Fund." />
      </Head>

      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <div className="relative overflow-hidden py-20">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(0, 212, 170, 0.08) 0%, transparent 50%)" }} />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-4 py-2 rounded-full mb-6" style={{ background: "rgba(0, 212, 170, 0.1)", border: "1px solid rgba(0, 212, 170, 0.3)" }}>
                <span style={{ color: "#00D4AA" }} className="text-sm font-medium">SEC Reg D 506(c) | Accredited Investors Only</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: "#1a1a2e" }}>
                AXUSD Fix & Flip
                <span className="block" style={{ color: "#00D4AA" }}>Lending Fund</span>
              </h1>

              <p className="text-xl max-w-3xl mx-auto mb-8" style={{ color: "#6b7280" }}>
                Earn 10-14% target annual returns by funding short-term bridge loans to real estate investors.
                Backed by property collateral. Settled in AXUSD stablecoin.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 px-4 sm:px-0">
                <Link href="/lending-fund/onboarding" className="px-8 py-4 min-h-[48px] text-white font-bold rounded-lg transition-all transform hover:scale-105 text-center active:scale-95" style={{ background: "#00D4AA" }}>
                  Invest in Fund
                </Link>
                <Link href="/lending-fund/apply" className="px-8 py-4 min-h-[48px] text-white font-bold rounded-lg transition-all transform hover:scale-105 text-center active:scale-95" style={{ background: "#7C3AED" }}>
                  Apply for Loan
                </Link>
                <Link href="/lending-fund/docs" className="px-8 py-4 min-h-[48px] bg-transparent font-bold rounded-lg transition-all text-center active:scale-95" style={{ border: "2px solid #00D4AA", color: "#00D4AA" }}>
                  View PPM Documents
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-12 sm:mb-16">
              <StatCard
                label="Total Pool Assets"
                value={loading ? '...' : formatUSD(stats?.totalAssets || '0')}
                icon="💰"
              />
              <StatCard
                label="Available Liquidity"
                value={loading ? '...' : formatUSD(stats?.availableLiquidity || '0')}
                icon="💧"
              />
              <StatCard
                label="Active Loans"
                value={loading ? '...' : String(stats?.activeLoans || 0)}
                icon="🏠"
              />
              <StatCard
                label="Target APY"
                value={loading ? '...' : stats?.apy || '10-14%'}
                icon="📈"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
              <div className="backdrop-blur rounded-2xl p-8" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                <h2 className="text-2xl font-bold mb-6" style={{ color: "#1a1a2e" }}>How It Works</h2>
                <div className="space-y-6">
                  <Step number={1} title="Deposit AXUSD" description="Invest a minimum of $10,000 AXUSD into the lending pool" />
                  <Step number={2} title="Pool Funds Loans" description="Your capital backs short-term bridge loans to fix-and-flip investors" />
                  <Step number={3} title="Earn Interest" description="Receive monthly distributions from loan interest payments" />
                  <Step number={4} title="Property Secured" description="All loans are secured by real estate at max 70% LTV" />
                </div>
              </div>

              <div className="backdrop-blur rounded-2xl p-8" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                <h2 className="text-2xl font-bold mb-6" style={{ color: "#1a1a2e" }}>Loan Parameters</h2>
                <div className="space-y-4">
                  <ParamRow
                    label="Maximum LTV"
                    value={riskParams ? formatPercent(riskParams.maxLtvBps) : '70%'}
                    description="Loan-to-value on after-repair value"
                  />
                  <ParamRow
                    label="Loan Term"
                    value={riskParams ? `Up to ${riskParams.maxTermDays} days` : 'Up to 365 days'}
                    description="Short-term bridge financing"
                  />
                  <ParamRow
                    label="Interest Rate"
                    value={riskParams ? formatPercent(riskParams.interestRateBps) : '14%'}
                    description="Annual rate charged to borrowers"
                  />
                  <ParamRow
                    label="Loan Size Range"
                    value={riskParams ? `${formatUSD(riskParams.minLoanSize)} - ${formatUSD(riskParams.maxLoanSize)}` : '$50K - $500K'}
                    description="Per property loan limits"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-8 mb-16" style={{ background: "linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(123, 104, 238, 0.1) 100%)", border: "1px solid rgba(0, 212, 170, 0.3)" }}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2" style={{ color: "#1a1a2e" }}>Ready to Invest?</h3>
                  <p style={{ color: "#6b7280" }}>Minimum investment: $10,000 AXUSD | Accredited investors only</p>
                </div>
                <div className="flex gap-4">
                  <Link href="/lending-fund/onboarding" className="px-6 py-3 text-white font-bold rounded-lg transition-all" style={{ background: "#00D4AA" }}>
                    Start Investment
                  </Link>
                  <Link href="/lending-fund/dashboard" className="px-6 py-3 font-bold rounded-lg transition-all" style={{ background: "#e5e7eb", color: "#374151" }}>
                    Investor Dashboard
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon="🔒"
                title="Property Secured"
                description="Every loan is secured by real estate with conservative 70% max LTV on after-repair value"
              />
              <FeatureCard
                icon="⛓️"
                title="On-Chain Transparency"
                description="All fund operations are recorded on Arbitrum One blockchain for full auditability"
              />
              <FeatureCard
                icon="📊"
                title="Monthly Distributions"
                description="Interest income distributed monthly to investors via AXUSD stablecoin"
              />
            </div>

            <div className="mt-12 sm:mt-16 p-4 sm:p-6 rounded-xl mb-20 sm:mb-0" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <p className="text-xs sm:text-sm text-center" style={{ color: "#6b7280" }}>
                <strong>Disclosure:</strong> This offering is made pursuant to SEC Rule 506(c) and is available only to verified accredited investors.
                Securities have not been registered under the Securities Act of 1933. Investment involves substantial risk including possible loss of principal.
                Past performance is not indicative of future results. Read the Private Placement Memorandum before investing.
              </p>
            </div>
          </div>
        </div>

        <MobileBottomNav />
      </div>
    </>
  );
}


function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="backdrop-blur rounded-xl p-4 sm:p-6 text-center touch-manipulation" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
      <div className="text-2xl sm:text-3xl mb-2">{icon}</div>
      <div className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "#1a1a2e" }}>{value}</div>
      <div className="text-xs sm:text-sm" style={{ color: "#6b7280" }}>{label}</div>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-8 h-8 rounded-full text-white font-bold flex items-center justify-center flex-shrink-0" style={{ background: "#00D4AA" }}>
        {number}
      </div>
      <div>
        <h4 className="font-semibold" style={{ color: "#1a1a2e" }}>{title}</h4>
        <p className="text-sm" style={{ color: "#6b7280" }}>{description}</p>
      </div>
    </div>
  );
}

function ParamRow({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-3 last:border-0" style={{ borderBottom: "1px solid #e5e7eb" }}>
      <div>
        <div className="font-medium" style={{ color: "#1a1a2e" }}>{label}</div>
        <div className="text-sm" style={{ color: "#6b7280" }}>{description}</div>
      </div>
      <div className="font-bold" style={{ color: "#00D4AA" }}>{value}</div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-xl p-6 text-center" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-2" style={{ color: "#1a1a2e" }}>{title}</h3>
      <p className="text-sm" style={{ color: "#6b7280" }}>{description}</p>
    </div>
  );
}
