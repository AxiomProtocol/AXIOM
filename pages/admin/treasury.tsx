import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface AdminUser {
  id: number;
  email: string;
  role: string;
}

interface TreasuryBalances {
  treasury: {
    address: string;
    ethBalance: string;
    axmBalance: string;
  };
  contracts: {
    depinSuite: {
      address: string;
      ethBalance: string;
    };
    depinSales: {
      address: string;
      ethBalance: string;
      deployed: boolean;
    };
  };
  totals: {
    totalEth: string;
  };
}

interface TreasuryStats {
  revenue: {
    totalDistributions: number;
    totalRevenue: string;
    treasuryShare: string;
    lesseeShare: string;
    operatorShare: string;
    recentDistributions: Array<{
      txHash: string;
      totalRevenue: string;
      treasuryShare: string;
      timestamp: string;
    }>;
  };
  purchases: {
    totalNodes: number;
    totalEthCollected: string;
  };
}

interface NodeSalesData {
  contract: {
    address: string;
    status: string;
  };
  summary: {
    totalNodesSold: number;
    totalEthCollected: string;
    totalAxmCollected: string;
    estimatedUsdValue: string;
  };
  tierBreakdown: Array<{
    id: number;
    name: string;
    priceEth: number;
    priceAxm?: number;
    icon: string;
    sold: number;
    revenueEth: number;
    revenueAxm: number;
    percentage: string;
  }>;
  paymentMethods: {
    eth: { count: number; percentage: string };
    axm: { count: number; percentage: string; discountRate: string };
  };
  projections: {
    if100Nodes: {
      evenSplit: {
        totalEth: number;
        usdValue: number;
        breakdown: Array<{ name: string; count: number; eth: number }>;
      };
      popularTiers: {
        totalEth: number;
        usdValue: number;
        breakdown: Array<{ name: string; count: number; eth: number }>;
      };
    };
  };
  recentPurchases: Array<{
    txHash: string;
    tier: number;
    tierName: string;
    buyer: string;
    priceEth: string;
    priceAxm: string;
    paymentMethod: string;
    timestamp: string;
  }>;
}

export default function TreasuryDashboard() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [balances, setBalances] = useState<TreasuryBalances | null>(null);
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [nodeSales, setNodeSales] = useState<NodeSalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'balances' | 'revenue' | 'node-sales'>('overview');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authChecked && adminUser) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [authChecked, adminUser]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/auth/session');
      const data = await res.json();
      
      if (!data.authenticated) {
        router.push('/admin/login');
        return;
      }
      
      setAdminUser(data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    } finally {
      setAuthChecked(true);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [balancesRes, statsRes, nodeSalesRes] = await Promise.all([
        fetch('/api/admin/treasury/balances'),
        fetch('/api/admin/treasury/stats'),
        fetch('/api/admin/treasury/node-sales')
      ]);

      if (balancesRes.ok) setBalances(await balancesRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (nodeSalesRes.ok) setNodeSales(await nodeSalesRes.json());
    } catch (error) {
      console.error('Error fetching treasury data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied!');
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '-';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!authChecked || !adminUser) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(to bottom, #0a0f1e, #1a1f2e)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#fff'
      }}>
        <div>Checking authorization...</div>
      </div>
    );
  }

  if (loading || !balances || !stats) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(to bottom, #0a0f1e, #1a1f2e)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#fff'
      }}>
        <div>Loading Treasury Dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #0a0f1e, #1a1f2e)', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, cursor: 'pointer' }}>
                AXIOM
              </h1>
            </Link>
            <span style={{ color: '#999', fontSize: '1.5rem' }}>/</span>
            <span style={{ color: '#fff', fontSize: '1.5rem' }}>Treasury Dashboard</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/admin/depin-monitor" style={{ textDecoration: 'none' }}>
              <button style={{ 
                padding: '0.75rem 1.5rem', 
                background: 'rgba(59, 130, 246, 0.1)', 
                border: '1px solid rgba(59, 130, 246, 0.3)', 
                borderRadius: '8px', 
                color: '#3b82f6', 
                cursor: 'pointer',
                fontWeight: '500'
              }}>
                DePIN Monitor
              </button>
            </Link>
            <button 
              onClick={fetchData}
              style={{ 
                padding: '0.75rem 1.5rem', 
                background: 'rgba(251, 191, 36, 0.1)', 
                border: '1px solid rgba(251, 191, 36, 0.3)', 
                borderRadius: '8px', 
                color: '#fbbf24', 
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Refresh Data
            </button>
            <button 
              onClick={handleLogout}
              style={{ 
                padding: '0.75rem 1.5rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                borderRadius: '8px', 
                color: '#ef4444', 
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Logout
            </button>
          </div>
        </div>
        <div style={{ marginBottom: '1rem', color: '#666', fontSize: '0.875rem' }}>
          Logged in as: <span style={{ color: '#fbbf24' }}>{adminUser.email}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total ETH in System</div>
            <div style={{ color: '#fbbf24', fontSize: '1.75rem', fontWeight: 'bold' }}>{parseFloat(balances.totals.totalEth).toFixed(4)} ETH</div>
            <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.5rem' }}>Treasury + Contracts</div>
          </div>

          <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Treasury Vault</div>
            <div style={{ color: '#22c55e', fontSize: '1.75rem', fontWeight: 'bold' }}>{parseFloat(balances.treasury.ethBalance).toFixed(4)} ETH</div>
            <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.5rem' }}>{parseFloat(balances.treasury.axmBalance).toFixed(0)} AXM</div>
          </div>

          <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Nodes Sold</div>
            <div style={{ color: '#3b82f6', fontSize: '1.75rem', fontWeight: 'bold' }}>{nodeSales?.summary.totalNodesSold || stats.purchases.totalNodes}</div>
            <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.5rem' }}>{parseFloat(nodeSales?.summary.totalEthCollected || stats.purchases.totalEthCollected).toFixed(4)} ETH</div>
          </div>

          <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Revenue Distributed</div>
            <div style={{ color: '#a855f7', fontSize: '1.75rem', fontWeight: 'bold' }}>{stats.revenue.totalDistributions}</div>
            <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.5rem' }}>{parseFloat(stats.revenue.treasuryShare).toFixed(2)} AXM to treasury</div>
          </div>

          <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
            <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Est. USD Value</div>
            <div style={{ color: '#ec4899', fontSize: '1.75rem', fontWeight: 'bold' }}>${nodeSales?.summary.estimatedUsdValue || '0'}</div>
            <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.5rem' }}>@ $3,500/ETH</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap' }}>
          {(['overview', 'node-sales', 'balances', 'revenue'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '1rem 1.5rem',
                background: activeTab === tab ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #fbbf24' : '2px solid transparent',
                color: activeTab === tab ? '#fbbf24' : '#999',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '500',
                textTransform: 'capitalize'
              }}
            >
              {tab === 'node-sales' ? 'Node Sales Analytics' : tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: '#fbbf24', marginBottom: '1rem' }}>Contract Balances</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ color: '#999', fontSize: '0.875rem' }}>DePIN Suite Contract</div>
                  <div style={{ color: '#fff', fontWeight: 'bold' }}>{parseFloat(balances.contracts.depinSuite.ethBalance).toFixed(6)} ETH</div>
                  <div style={{ color: '#666', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => copyAddress(balances.contracts.depinSuite.address)}>
                    {balances.contracts.depinSuite.address.slice(0, 10)}...{balances.contracts.depinSuite.address.slice(-8)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: '0.875rem' }}>DePIN Sales Contract</div>
                  <div style={{ color: balances.contracts.depinSales.deployed ? '#fff' : '#f59e0b', fontWeight: 'bold' }}>
                    {balances.contracts.depinSales.deployed ? `${parseFloat(balances.contracts.depinSales.ethBalance).toFixed(6)} ETH` : 'Not Deployed'}
                  </div>
                  {balances.contracts.depinSales.deployed && (
                    <div style={{ color: '#666', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => copyAddress(balances.contracts.depinSales.address)}>
                      {balances.contracts.depinSales.address.slice(0, 10)}...{balances.contracts.depinSales.address.slice(-8)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: '#fbbf24', marginBottom: '1rem' }}>Revenue Distribution Split</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#999' }}>Lessee (70%)</span>
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{parseFloat(stats.revenue.lesseeShare).toFixed(2)} AXM</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#999' }}>Operator (25%)</span>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{parseFloat(stats.revenue.operatorShare).toFixed(2)} AXM</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: '#999' }}>Treasury (5%)</span>
                  <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{parseFloat(stats.revenue.treasuryShare).toFixed(2)} AXM</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'node-sales' && nodeSales && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#fff', margin: 0 }}>Node Sales Analytics</h2>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: nodeSales.contract.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${nodeSales.contract.status === 'active' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '8px'
              }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: nodeSales.contract.status === 'active' ? '#22c55e' : '#ef4444' 
                }}></div>
                <span style={{ color: nodeSales.contract.status === 'active' ? '#22c55e' : '#ef4444', fontSize: '0.875rem' }}>
                  Sales {nodeSales.contract.status === 'active' ? 'Active' : 'Paused'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ color: '#fbbf24', marginBottom: '1rem', marginTop: 0 }}>Sales by Tier</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {nodeSales.tierBreakdown.map((tier) => (
                    <div key={tier.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '1.25rem', width: '30px' }}>{tier.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#fff', fontSize: '0.875rem' }}>{tier.name}</span>
                          <span style={{ color: '#999', fontSize: '0.875rem' }}>{tier.sold} sold</span>
                        </div>
                        <div style={{ 
                          height: '6px', 
                          background: 'rgba(255,255,255,0.1)', 
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            width: `${tier.percentage}%`, 
                            height: '100%', 
                            background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                            borderRadius: '3px',
                            minWidth: tier.sold > 0 ? '4px' : '0'
                          }}></div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '100px' }}>
                        {tier.revenueAxm > 0 ? (
                          <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '0.875rem' }}>{tier.revenueAxm.toFixed(2)} AXM</div>
                        ) : tier.revenueEth > 0 ? (
                          <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '0.875rem' }}>{tier.revenueEth.toFixed(4)} ETH</div>
                        ) : (
                          <div style={{ color: '#666', fontWeight: 'bold', fontSize: '0.875rem' }}>-</div>
                        )}
                        <div style={{ color: '#666', fontSize: '0.75rem' }}>{tier.priceEth} ETH / {tier.priceAxm} AXM</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ color: '#fbbf24', marginBottom: '1rem', marginTop: 0 }}>Payment Methods</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ color: '#818cf8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>ETH Payments</div>
                    <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold' }}>{nodeSales.paymentMethods.eth.count}</div>
                    <div style={{ color: '#666', fontSize: '0.75rem' }}>{nodeSales.paymentMethods.eth.percentage}% of sales</div>
                  </div>
                  <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#fbbf24', fontSize: '0.875rem' }}>AXM Payments</span>
                      <span style={{ background: '#22c55e', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>15% OFF</span>
                    </div>
                    <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold' }}>{nodeSales.paymentMethods.axm.count}</div>
                    <div style={{ color: '#666', fontSize: '0.75rem' }}>{nodeSales.paymentMethods.axm.percentage}% of sales</div>
                  </div>
                </div>

                <h4 style={{ color: '#fff', marginBottom: '0.75rem', marginTop: 0, fontSize: '0.95rem' }}>Collected Totals</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#999' }}>ETH Collected:</span>
                    <span style={{ color: '#818cf8', fontWeight: 'bold' }}>{parseFloat(nodeSales.summary.totalEthCollected).toFixed(4)} ETH</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#999' }}>AXM Collected:</span>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{parseFloat(nodeSales.summary.totalAxmCollected).toFixed(2)} AXM</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <h3 style={{ color: '#3b82f6', marginBottom: '1rem', marginTop: 0 }}>Revenue Projections: 100 Nodes Sold</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ color: '#fff', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Scenario A: Even Distribution (20 per tier)</h4>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ color: '#22c55e', fontSize: '1.75rem', fontWeight: 'bold' }}>{nodeSales.projections.if100Nodes.evenSplit.totalEth} ETH</div>
                    <div style={{ color: '#666', fontSize: '0.875rem' }}>${nodeSales.projections.if100Nodes.evenSplit.usdValue.toLocaleString()} USD</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {nodeSales.projections.if100Nodes.evenSplit.breakdown.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: '#999' }}>{item.name} x{item.count}</span>
                        <span style={{ color: '#fff' }}>{item.eth} ETH</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ color: '#fff', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Scenario B: Popular Tier Focus</h4>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ color: '#22c55e', fontSize: '1.75rem', fontWeight: 'bold' }}>{nodeSales.projections.if100Nodes.popularTiers.totalEth} ETH</div>
                    <div style={{ color: '#666', fontSize: '0.875rem' }}>${nodeSales.projections.if100Nodes.popularTiers.usdValue.toLocaleString()} USD</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {nodeSales.projections.if100Nodes.popularTiers.breakdown.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: '#999' }}>{item.name} x{item.count}</span>
                        <span style={{ color: '#fff' }}>{item.eth} ETH</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {nodeSales.recentPurchases.length > 0 && (
              <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ color: '#fbbf24', marginBottom: '1rem', marginTop: 0 }}>Recent Purchases</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ color: '#999', textAlign: 'left', padding: '0.75rem', fontWeight: 'normal' }}>Transaction</th>
                        <th style={{ color: '#999', textAlign: 'left', padding: '0.75rem', fontWeight: 'normal' }}>Tier</th>
                        <th style={{ color: '#999', textAlign: 'left', padding: '0.75rem', fontWeight: 'normal' }}>Buyer</th>
                        <th style={{ color: '#999', textAlign: 'right', padding: '0.75rem', fontWeight: 'normal' }}>Payment</th>
                        <th style={{ color: '#999', textAlign: 'right', padding: '0.75rem', fontWeight: 'normal' }}>Amount</th>
                        <th style={{ color: '#999', textAlign: 'right', padding: '0.75rem', fontWeight: 'normal' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodeSales.recentPurchases.map((purchase, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <a 
                              href={`https://arbiscan.io/tx/${purchase.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: '0.8rem', textDecoration: 'none' }}
                            >
                              {purchase.txHash.slice(0, 8)}...{purchase.txHash.slice(-6)}
                            </a>
                          </td>
                          <td style={{ padding: '0.75rem', color: '#fff' }}>{purchase.tierName}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ color: '#999', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              {formatAddress(purchase.buyer)}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            <span style={{ 
                              background: purchase.paymentMethod === 'ETH' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                              color: purchase.paymentMethod === 'ETH' ? '#818cf8' : '#fbbf24',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem'
                            }}>
                              {purchase.paymentMethod}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#22c55e', fontWeight: 'bold' }}>
                            {purchase.paymentMethod === 'ETH' 
                              ? `${parseFloat(purchase.priceEth || '0').toFixed(3)} ETH`
                              : `${parseFloat(purchase.priceAxm || '0').toFixed(0)} AXM`
                            }
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#999' }}>
                            {purchase.timestamp ? new Date(purchase.timestamp).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {nodeSales.recentPurchases.length === 0 && (
              <div style={{ 
                background: 'rgba(34, 40, 56, 0.5)', 
                padding: '3rem', 
                borderRadius: '12px', 
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
                <div style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Ready for Node Sales</div>
                <div style={{ color: '#999', fontSize: '0.875rem' }}>
                  Purchases will appear here once nodes are sold. Share the Axiom Nodes page to start sales!
                </div>
                <Link href="/axiom-nodes" style={{ textDecoration: 'none' }}>
                  <button style={{
                    marginTop: '1.5rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#000',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}>
                    View Axiom Nodes Page
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'balances' && (
          <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ color: '#fbbf24', marginBottom: '1.5rem' }}>Detailed Balance Information</h3>
            
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: '#fff', marginBottom: '1rem' }}>Treasury Vault</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div style={{ color: '#999' }}>Address:</div>
                <div style={{ color: '#fff', fontFamily: 'monospace', cursor: 'pointer' }} onClick={() => copyAddress(balances.treasury.address)}>
                  {balances.treasury.address}
                </div>
                <div style={{ color: '#999' }}>ETH Balance:</div>
                <div style={{ color: '#22c55e', fontWeight: 'bold' }}>{balances.treasury.ethBalance} ETH</div>
                <div style={{ color: '#999' }}>AXM Balance:</div>
                <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>{parseFloat(balances.treasury.axmBalance).toFixed(2)} AXM</div>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#fff', marginBottom: '1rem' }}>Smart Contracts</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <div style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '0.5rem' }}>DePIN Suite (Operational)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div style={{ color: '#999' }}>Address:</div>
                    <div style={{ color: '#fff', fontFamily: 'monospace', cursor: 'pointer' }} onClick={() => copyAddress(balances.contracts.depinSuite.address)}>
                      {balances.contracts.depinSuite.address}
                    </div>
                    <div style={{ color: '#999' }}>ETH Balance:</div>
                    <div style={{ color: '#fff' }}>{balances.contracts.depinSuite.ethBalance} ETH</div>
                  </div>
                </div>

                <div>
                  <div style={{ color: '#a855f7', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    DePIN Sales (Node Purchases) {!balances.contracts.depinSales.deployed && <span style={{ color: '#f59e0b' }}>Not Deployed</span>}
                  </div>
                  {balances.contracts.depinSales.deployed ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <div style={{ color: '#999' }}>Address:</div>
                      <div style={{ color: '#fff', fontFamily: 'monospace', cursor: 'pointer' }} onClick={() => copyAddress(balances.contracts.depinSales.address)}>
                        {balances.contracts.depinSales.address}
                      </div>
                      <div style={{ color: '#999' }}>ETH Balance:</div>
                      <div style={{ color: '#fff' }}>{balances.contracts.depinSales.ethBalance} ETH</div>
                    </div>
                  ) : (
                    <div style={{ color: '#999', fontSize: '0.9rem' }}>
                      Deploy DePINNodeSales.sol to enable automatic ETH forwarding for node purchases
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div style={{ background: 'rgba(34, 40, 56, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ color: '#fbbf24', marginBottom: '1.5rem' }}>Revenue Distributions</h3>
            
            {stats.revenue.recentDistributions.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ color: '#999', textAlign: 'left', padding: '0.75rem' }}>Transaction</th>
                      <th style={{ color: '#999', textAlign: 'right', padding: '0.75rem' }}>Total Revenue</th>
                      <th style={{ color: '#999', textAlign: 'right', padding: '0.75rem' }}>Treasury Share</th>
                      <th style={{ color: '#999', textAlign: 'right', padding: '0.75rem' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.revenue.recentDistributions.map((dist, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem', color: '#3b82f6', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {dist.txHash.slice(0, 10)}...{dist.txHash.slice(-8)}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#fff', textAlign: 'right' }}>
                          {parseFloat(dist.totalRevenue).toFixed(2)} AXM
                        </td>
                        <td style={{ padding: '0.75rem', color: '#fbbf24', textAlign: 'right', fontWeight: 'bold' }}>
                          {parseFloat(dist.treasuryShare).toFixed(2)} AXM
                        </td>
                        <td style={{ padding: '0.75rem', color: '#999', textAlign: 'right' }}>
                          {new Date(dist.timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
                No revenue distributions recorded yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
