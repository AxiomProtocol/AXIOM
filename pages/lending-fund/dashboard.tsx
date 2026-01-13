import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface InvestorPosition {
  shares: string;
  assets: string;
  depositDate: string;
  canWithdraw: boolean;
  pendingYield: string;
  totalEarned: string;
}

interface LoanSummary {
  loanId: number;
  borrower: string;
  principal: string;
  status: string;
  maturityDate: string;
  interestRate: number;
  propertyAddress: string;
}

interface FundOverview {
  totalAssets: string;
  availableLiquidity: string;
  lockedInLoans: string;
  totalYieldAccumulated: string;
  activeLoans: number;
  sharePrice: string;
}

export default function InvestorDashboard() {
  const [position, setPosition] = useState<InvestorPosition | null>(null);
  const [overview, setOverview] = useState<FundOverview | null>(null);
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
          fetchDashboardData(accounts[0]);
        } else {
          setLoading(false);
        }
      } catch (error) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
          fetchDashboardData(accounts[0]);
        }
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    }
  };

  const fetchDashboardData = async (address: string) => {
    try {
      const [positionRes, overviewRes, loansRes] = await Promise.all([
        fetch(`/api/realestate/investor-position?address=${address}`),
        fetch('/api/realestate/fund-stats'),
        fetch('/api/realestate/active-loans')
      ]);

      if (positionRes.ok) {
        const positionData = await positionRes.json();
        setPosition(positionData);
      }

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setOverview(overviewData);
      }

      if (loansRes.ok) {
        const loansData = await loansRes.json();
        setLoans(loansData.loans || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUSD = (value: string | undefined) => {
    if (!value) return '$0.00';
    const num = parseFloat(value);
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'repaying': return 'text-blue-400 bg-blue-400/10';
      case 'repaid': return 'text-gray-400 bg-gray-400/10';
      case 'defaulted': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (!walletConnected) {
    return (
      <>
        <Head>
          <title>Investor Dashboard | AXUSD Lending Fund</title>
        </Head>
        <div style={{ background: "#FFFFFF", minHeight: "100vh" }} className="flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-6xl mb-6">🔗</div>
            <h1 className="text-3xl font-bold mb-4" style={{ color: "#1a1a2e" }}>Connect Your Wallet</h1>
            <p className="mb-8" style={{ color: "#6b7280" }}>
              Connect your wallet to view your investment position in the AXUSD Fix & Flip Lending Fund.
            </p>
            <button
              onClick={connectWallet}
              className="px-8 py-4 text-white font-bold rounded-lg transition-all w-full"
              style={{ background: "#00D4AA" }}
            >
              Connect Wallet
            </button>
            <Link href="/lending-fund" className="block mt-4" style={{ color: "#00D4AA" }}>
              ← Back to Fund Overview
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Investor Dashboard | AXUSD Lending Fund</title>
      </Head>

      <div style={{ background: "#FFFFFF", minHeight: "100vh" }} className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#1a1a2e" }}>Investor Dashboard</h1>
              <p style={{ color: "#6b7280" }}>Connected: {walletAddress && formatAddress(walletAddress)}</p>
            </div>
            <Link href="/lending-fund/onboarding" className="px-6 py-3 text-white font-bold rounded-lg transition-all" style={{ background: "#00D4AA" }}>
              + Add Investment
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              label="Your Position"
              value={formatUSD(position?.assets)}
              subtext={`${position?.shares || '0'} shares`}
              loading={loading}
            />
            <DashboardCard
              label="Total Earned"
              value={formatUSD(position?.totalEarned)}
              subtext="Lifetime yield"
              loading={loading}
            />
            <DashboardCard
              label="Pending Yield"
              value={formatUSD(position?.pendingYield)}
              subtext="Available to claim"
              loading={loading}
            />
            <DashboardCard
              label="Share Price"
              value={formatUSD(overview?.sharePrice || '1.00')}
              subtext="Current NAV per share"
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Fund Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <div className="text-gray-400 text-sm">Total Fund Assets</div>
                  <div className="text-xl font-bold text-white">{formatUSD(overview?.totalAssets)}</div>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <div className="text-gray-400 text-sm">Available Liquidity</div>
                  <div className="text-xl font-bold text-green-400">{formatUSD(overview?.availableLiquidity)}</div>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <div className="text-gray-400 text-sm">Locked in Loans</div>
                  <div className="text-xl font-bold text-yellow-400">{formatUSD(overview?.lockedInLoans)}</div>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <div className="text-gray-400 text-sm">Active Loans</div>
                  <div className="text-xl font-bold text-white">{overview?.activeLoans || 0}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  disabled={!position?.canWithdraw}
                  className={`w-full py-3 rounded-lg font-bold transition-all ${
                    position?.canWithdraw
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {position?.canWithdraw ? 'Withdraw Funds' : 'Locked (12mo)'}
                </button>
                <button className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-all">
                  Claim Yield
                </button>
                <Link href="/lending-fund/docs" className="block w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-center transition-all">
                  View Documents
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Active Loan Portfolio</h2>
            {loans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                      <th className="pb-3">Loan ID</th>
                      <th className="pb-3">Principal</th>
                      <th className="pb-3">Rate</th>
                      <th className="pb-3">Maturity</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((loan) => (
                      <tr key={loan.loanId} className="border-b border-gray-800">
                        <td className="py-4 text-white font-mono">#{loan.loanId}</td>
                        <td className="py-4 text-white">{formatUSD(loan.principal)}</td>
                        <td className="py-4 text-yellow-400">{(loan.interestRate / 100).toFixed(1)}%</td>
                        <td className="py-4 text-gray-400">{loan.maturityDate}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No active loans in portfolio yet
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function DashboardCard({ label, value, subtext, loading }: {
  label: string;
  value: string;
  subtext: string;
  loading: boolean;
}) {
  return (
    <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6">
      <div className="text-gray-400 text-sm mb-1">{label}</div>
      <div className="text-2xl font-bold text-white mb-1">
        {loading ? '...' : value}
      </div>
      <div className="text-sm text-gray-500">{subtext}</div>
    </div>
  );
}
