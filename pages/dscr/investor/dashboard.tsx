import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface DashboardData {
  onChain: {
    vault: {
      totalAssets: string;
      totalSupply: string;
      lockedForLoans: string;
      availableLiquidity: string;
      utilizationRate: number;
    };
    portfolio: {
      totalOriginated: string;
      totalRepaid: string;
      activeLoans: number;
      totalInterestCollected: string;
    };
  };
  loanBook: {
    funded: number;
    totalFunded: number;
    avgDscr: number;
    avgLtv: number;
    monthlyPayments: number;
    tierDistribution: { low: number; standard: number; yield: number };
  };
  cashflows: {
    interestCollected: number;
    principalRepaid: number;
    netIncome: number;
    note: string;
  };
  risk: {
    portfolioLtv: number;
    portfolioDscr: number;
    utilizationRate: number;
  };
  pipeline: {
    softCommitments: number;
    totalCommitted: number;
  };
  investorPosition: {
    shares: string;
    assets: string;
    ownershipPct: number;
  } | null;
  contracts: {
    vault: string;
    manager: string;
    network: string;
    chainId: number;
  };
}

export default function InvestorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState('');
  const [connectedWallet, setConnectedWallet] = useState('');

  const fetchDashboard = async (wallet?: string) => {
    setLoading(true);
    try {
      let url = '/api/dscr/investor/dashboard';
      if (wallet) url += `?wallet=${wallet}`;
      
      const res = await fetch(url);
      const result = await res.json();
      
      if (res.ok) {
        setData(result);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const connectWallet = async () => {
    if (walletAddress) {
      setConnectedWallet(walletAddress);
      fetchDashboard(walletAddress);
    }
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toLocaleString()}`;
  };

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #E5E7EB'
  };

  const statCardStyle: React.CSSProperties = {
    ...cardStyle,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  };

  if (loading && !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Investor Dashboard | DSCR Rental Fund</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '20px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', marginBottom: '4px' }}>
                DSCR Fund Dashboard
              </h1>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Real-time on-chain metrics and portfolio performance
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/dscr/invest/commit" style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none'
              }}>
                Invest Now
              </Link>
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter wallet address (0x...)"
              value={walletAddress}
              onChange={e => setWalletAddress(e.target.value)}
              style={{
                flex: 1,
                minWidth: '300px',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #E5E7EB',
                fontSize: '14px'
              }}
            />
            <button onClick={connectWallet} style={{
              padding: '12px 24px',
              background: '#1a1a2e',
              color: '#FFFFFF',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              View My Position
            </button>
            {connectedWallet && (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                Connected: {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
              </span>
            )}
          </div>

          {data?.investorPosition && parseFloat(data.investorPosition.shares) > 0 && (
            <div style={{ ...cardStyle, marginBottom: '24px', background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)', color: '#FFFFFF' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#D4AF37' }}>Your Position</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Vault Shares</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{parseFloat(data.investorPosition.shares).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Current Value</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#D4AF37' }}>{formatCurrency(data.investorPosition.assets)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Fund Ownership</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{data.investorPosition.ownershipPct.toFixed(2)}%</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={statCardStyle}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Assets</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37' }}>
                {formatCurrency(data?.onChain.vault.totalAssets || '0')}
              </div>
              <div style={{ fontSize: '12px', color: '#22C55E' }}>AXUSD</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Deployed Capital</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#3B82F6' }}>
                {formatCurrency(data?.onChain.vault.lockedForLoans || '0')}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{data?.onChain.vault.utilizationRate.toFixed(1)}% utilized</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Active Loans</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#8B5CF6' }}>
                {data?.onChain.portfolio.activeLoans || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{data?.loanBook.funded || 0} total funded</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Originated</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e' }}>
                {formatCurrency(data?.onChain.portfolio.totalOriginated || '0')}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>lifetime</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Interest Collected</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#22C55E' }}>
                {formatCurrency(data?.onChain.portfolio.totalInterestCollected || '0')}
              </div>
              <div style={{ fontSize: '12px', color: '#22C55E' }}>realized income</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Available Liquidity</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#F59E0B' }}>
                {formatCurrency(data?.onChain.vault.availableLiquidity || '0')}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>ready to deploy</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            <div style={cardStyle}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Loan Book</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Funded</div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{formatCurrency(data?.loanBook.totalFunded || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Monthly Payments</div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{formatCurrency(data?.loanBook.monthlyPayments || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Avg DSCR</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: (data?.loanBook.avgDscr || 0) >= 1.1 ? '#22C55E' : '#EF4444' }}>
                    {(data?.loanBook.avgDscr || 0).toFixed(2)}x
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Avg LTV</div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{((data?.loanBook.avgLtv || 0) * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Tier Distribution</div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#22C55E' }}>Low Risk</span>
                      <span style={{ fontSize: '12px' }}>{data?.loanBook.tierDistribution.low || 0}</span>
                    </div>
                    <div style={{ height: '4px', background: '#E5E7EB', borderRadius: '2px' }}>
                      <div style={{ height: '100%', background: '#22C55E', borderRadius: '2px', width: `${((data?.loanBook.tierDistribution.low || 0) / Math.max(data?.loanBook.funded || 1, 1)) * 100}%` }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#3B82F6' }}>Standard</span>
                      <span style={{ fontSize: '12px' }}>{data?.loanBook.tierDistribution.standard || 0}</span>
                    </div>
                    <div style={{ height: '4px', background: '#E5E7EB', borderRadius: '2px' }}>
                      <div style={{ height: '100%', background: '#3B82F6', borderRadius: '2px', width: `${((data?.loanBook.tierDistribution.standard || 0) / Math.max(data?.loanBook.funded || 1, 1)) * 100}%` }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#F59E0B' }}>Yield</span>
                      <span style={{ fontSize: '12px' }}>{data?.loanBook.tierDistribution.yield || 0}</span>
                    </div>
                    <div style={{ height: '4px', background: '#E5E7EB', borderRadius: '2px' }}>
                      <div style={{ height: '100%', background: '#F59E0B', borderRadius: '2px', width: `${((data?.loanBook.tierDistribution.yield || 0) / Math.max(data?.loanBook.funded || 1, 1)) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Realized Cashflows</h2>
              <div style={{ background: '#F0FDF4', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>Net Income Collected</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#22C55E' }}>
                  {formatCurrency(data?.cashflows.netIncome || 0)}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Interest Collected</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>{formatCurrency(data?.cashflows.interestCollected || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Principal Repaid</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>{formatCurrency(data?.cashflows.principalRepaid || 0)}</div>
                </div>
              </div>
              <div style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                {data?.cashflows.note}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            <div style={cardStyle}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Risk Metrics</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Portfolio LTV</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: (data?.risk.portfolioLtv || 0) <= 0.70 ? '#22C55E' : '#F59E0B' }}>
                    {((data?.risk.portfolioLtv || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Portfolio DSCR</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: (data?.risk.portfolioDscr || 0) >= 1.2 ? '#22C55E' : '#F59E0B' }}>
                    {(data?.risk.portfolioDscr || 0).toFixed(2)}x
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Capital Utilization</div>
                  <div style={{ height: '12px', background: '#E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      background: (data?.risk.utilizationRate || 0) > 80 ? '#EF4444' : (data?.risk.utilizationRate || 0) > 60 ? '#F59E0B' : '#22C55E',
                      borderRadius: '6px',
                      width: `${data?.risk.utilizationRate || 0}%`,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    {(data?.risk.utilizationRate || 0).toFixed(1)}% deployed
                  </div>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Investment Pipeline</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Soft Commitments</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#8B5CF6' }}>{data?.pipeline.softCommitments || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Committed Capital</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37' }}>{formatCurrency(data?.pipeline.totalCommitted || 0)}</div>
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <Link href="/dscr/invest/commit" style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}>
                  Register Investment Commitment
                </Link>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Smart Contracts</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>DSCR Pool Vault</div>
                <a 
                  href={`https://arbiscan.io/address/${data?.contracts.vault}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '13px', color: '#3B82F6', fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {data?.contracts.vault}
                </a>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>DSCR Loan Manager</div>
                <a 
                  href={`https://arbiscan.io/address/${data?.contracts.manager}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '13px', color: '#3B82F6', fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {data?.contracts.manager}
                </a>
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
              Network: {data?.contracts.network} (Chain ID: {data?.contracts.chainId})
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
