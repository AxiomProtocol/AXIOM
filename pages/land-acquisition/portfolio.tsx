import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Investment {
  id: number;
  campaignId: number;
  campaignTitle: string;
  amount: string;
  sharesReceived: number;
  status: string;
  campaignStatus: string;
  location: string;
  acreage: string;
  propertyType: string;
  featuredImage: string;
  percentFunded: string;
  investedAt: string;
}

interface PoolMembership {
  id: number;
  poolId: number;
  poolName: string;
  contributed: string;
  cyclesCompleted: number;
  poolStatus: string;
  location: string;
  acreage: string;
  memberCount: number;
  percentFunded: string;
  joinedAt: string;
}

interface Summary {
  totalInvested: string;
  totalCurrentValue: string;
  totalReturns: string;
  activeCampaigns: number;
  activePools: number;
  totalSharesOwned: number;
  pendingVotes: number;
  unreadNotifications: number;
}

interface Document {
  id: number;
  type: string;
  title: string;
  description: string;
  fileUrl: string;
  fileSize: number;
  campaignTitle: string;
  poolName: string;
  createdAt: string;
}

const theme = {
  primary: '#00D4AA',
  secondary: '#FFD700',
  accent: '#7B68EE',
  dark: '#121212',
};

export default function InvestorPortfolioPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'investments' | 'pools' | 'documents' | 'notifications'>('overview');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [poolMemberships, setPoolMemberships] = useState<PoolMembership[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolio();
    fetchDocuments();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/land-acquisition/investor/portfolio', {
        headers: { 'x-user-id': '1' },
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.data.summary);
        setInvestments(data.data.investments);
        setPoolMemberships(data.data.poolMemberships);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/land-acquisition/investor/documents', {
        headers: { 'x-user-id': '1' },
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = parseFloat(String(value));
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <>
      <Head>
        <title>Investment Portfolio | Axiom Protocol</title>
      </Head>

      <main style={{ background: '#FFFFFF', minHeight: '100vh', padding: '40px 20px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 40 }}>
              <Link href="/land" style={{ color: theme.primary, textDecoration: 'none' }}>
                ← Back to Land Marketplace
              </Link>
              <h1 style={{ fontSize: 32, fontWeight: 700, marginTop: 16 }}>Investment Portfolio</h1>
              <p style={{ color: '#666' }}>Track your land investments, documents, and votes</p>
            </div>

          {summary && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 20, 
              marginBottom: 40 
            }}>
              <div style={{ padding: 24, background: '#f8f9fa', borderRadius: 12 }}>
                <div style={{ fontSize: 14, color: '#666' }}>Total Invested</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: theme.dark }}>{formatCurrency(summary.totalInvested)}</div>
              </div>
              <div style={{ padding: 24, background: '#f8f9fa', borderRadius: 12 }}>
                <div style={{ fontSize: 14, color: '#666' }}>Shares Owned</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: theme.dark }}>{summary.totalSharesOwned}</div>
              </div>
              <div style={{ padding: 24, background: '#f8f9fa', borderRadius: 12 }}>
                <div style={{ fontSize: 14, color: '#666' }}>Active Investments</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: theme.dark }}>{summary.activeCampaigns + summary.activePools}</div>
              </div>
              <div style={{ padding: 24, background: summary.pendingVotes > 0 ? '#fff3cd' : '#f8f9fa', borderRadius: 12 }}>
                <div style={{ fontSize: 14, color: '#666' }}>Pending Votes</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: summary.pendingVotes > 0 ? '#856404' : theme.dark }}>{summary.pendingVotes}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {(['overview', 'investments', 'pools', 'documents', 'notifications'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 24px',
                  background: activeTab === tab ? theme.primary : 'transparent',
                  color: activeTab === tab ? '#fff' : theme.dark,
                  border: `1px solid ${activeTab === tab ? theme.primary : '#ddd'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>Loading portfolio...</div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div>
                  <h3 style={{ marginBottom: 16 }}>Recent Investments</h3>
                  {investments.length === 0 && poolMemberships.length === 0 ? (
                    <p style={{ color: '#666' }}>No investments yet. <Link href="/land-acquisition" style={{ color: theme.primary }}>Browse opportunities</Link></p>
                  ) : (
                    <div style={{ display: 'grid', gap: 16 }}>
                      {investments.slice(0, 3).map((inv) => (
                        <div key={inv.id} style={{ padding: 20, background: '#f8f9fa', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{inv.campaignTitle}</div>
                            <div style={{ fontSize: 14, color: '#666' }}>{inv.location} - {inv.acreage} acres</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, color: theme.primary }}>{formatCurrency(inv.amount)}</div>
                            <div style={{ fontSize: 14, color: '#666' }}>{inv.sharesReceived} shares</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'investments' && (
                <div style={{ display: 'grid', gap: 16 }}>
                  {investments.map((inv) => (
                    <div key={inv.id} style={{ padding: 24, background: '#f8f9fa', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{inv.campaignTitle}</h4>
                          <div style={{ fontSize: 14, color: '#666' }}>{inv.location}</div>
                        </div>
                        <span style={{ 
                          padding: '4px 12px', 
                          background: inv.campaignStatus === 'funded' ? '#d4edda' : '#cce5ff',
                          color: inv.campaignStatus === 'funded' ? '#155724' : '#004085',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                        }}>
                          {inv.campaignStatus}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                        <div><div style={{ fontSize: 12, color: '#666' }}>Invested</div><div style={{ fontWeight: 600 }}>{formatCurrency(inv.amount)}</div></div>
                        <div><div style={{ fontSize: 12, color: '#666' }}>Shares</div><div style={{ fontWeight: 600 }}>{inv.sharesReceived}</div></div>
                        <div><div style={{ fontSize: 12, color: '#666' }}>Acreage</div><div style={{ fontWeight: 600 }}>{inv.acreage} acres</div></div>
                        <div><div style={{ fontSize: 12, color: '#666' }}>Funded</div><div style={{ fontWeight: 600 }}>{inv.percentFunded}%</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'pools' && (
                <div style={{ display: 'grid', gap: 16 }}>
                  {poolMemberships.map((pm) => (
                    <div key={pm.id} style={{ padding: 24, background: '#f8f9fa', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{pm.poolName}</h4>
                          <div style={{ fontSize: 14, color: '#666' }}>{pm.location}</div>
                        </div>
                        <span style={{ 
                          padding: '4px 12px', 
                          background: pm.poolStatus === 'active' ? '#d4edda' : '#fff3cd',
                          color: pm.poolStatus === 'active' ? '#155724' : '#856404',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                        }}>
                          {pm.poolStatus}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                        <div><div style={{ fontSize: 12, color: '#666' }}>Contributed</div><div style={{ fontWeight: 600 }}>{formatCurrency(pm.contributed)}</div></div>
                        <div><div style={{ fontSize: 12, color: '#666' }}>Cycles</div><div style={{ fontWeight: 600 }}>{pm.cyclesCompleted}</div></div>
                        <div><div style={{ fontSize: 12, color: '#666' }}>Members</div><div style={{ fontWeight: 600 }}>{pm.memberCount}</div></div>
                        <div><div style={{ fontSize: 12, color: '#666' }}>Funded</div><div style={{ fontWeight: 600 }}>{pm.percentFunded}%</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'documents' && (
                <div>
                  <h3 style={{ marginBottom: 16 }}>Document Vault</h3>
                  {documents.length === 0 ? (
                    <p style={{ color: '#666' }}>No documents yet. Documents will appear here as you invest.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {documents.map((doc) => (
                        <div key={doc.id} style={{ padding: 16, background: '#f8f9fa', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{doc.title}</div>
                            <div style={{ fontSize: 12, color: '#666' }}>{doc.type} - {doc.campaignTitle || doc.poolName}</div>
                          </div>
                          {doc.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{
                              padding: '8px 16px',
                              background: theme.primary,
                              color: '#fff',
                              borderRadius: 6,
                              textDecoration: 'none',
                              fontSize: 14,
                            }}>
                              Download
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <h3 style={{ marginBottom: 16 }}>Notifications</h3>
                  <p style={{ color: '#666' }}>View updates about your investments, milestones, and voting opportunities.</p>
                  <Link href="/land-acquisition/notifications" style={{ color: theme.primary }}>
                    View all notifications
                  </Link>
                </div>
              )}
            </>
          )}
          </div>
        </main>
    </>
  );
}
