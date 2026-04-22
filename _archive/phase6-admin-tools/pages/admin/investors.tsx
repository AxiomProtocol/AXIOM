import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const theme = {
  dark: '#0a0a0a',
  primary: '#D4AF37',
  secondary: '#10B981',
  border: '#2a2a2a',
  muted: '#888',
};

interface Investor {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  accreditation_status: string;
  kyc_status: string;
  last_login: string | null;
  created_at: string;
  portal_name: string;
  partner_email: string;
}

interface Deal {
  id: number;
  name: string;
  email: string;
  property_type: string;
  property_address: string | null;
  deal_value: string;
  status: string;
  partner_role: string;
  recommended_primary: string;
  created_at: string;
}

interface PortalSummary {
  portal_name: string;
  partner_email: string;
  investor_count: number;
}

export default function AdminInvestors() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [portals, setPortals] = useState<PortalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'deals' | 'investors'>('deals');
  const [selectedPortal, setSelectedPortal] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [investorRes, dealRes] = await Promise.all([
        fetch('/api/admin/investors'),
        fetch('/api/admin/all-deals'),
      ]);
      
      if (investorRes.ok) {
        const data = await investorRes.json();
        setInvestors(data.investors || []);
        setPortals(data.portals || []);
      }
      
      if (dealRes.ok) {
        const data = await dealRes.json();
        setDeals(data.deals || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvestors = investors.filter(inv => {
    const matchesPortal = selectedPortal === 'all' || inv.portal_name === selectedPortal;
    const matchesSearch = !searchQuery || 
      inv.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.name && inv.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPortal && matchesSearch;
  });

  const filteredDeals = deals.filter(deal => {
    if (!searchQuery) return true;
    return deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deal.property_address && deal.property_address.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': case 'approved': case 'funded': return theme.secondary;
      case 'pending': case 'new': return '#F59E0B';
      case 'rejected': case 'declined': return '#EF4444';
      case 'in_review': case 'contacted': return '#3B82F6';
      default: return theme.muted;
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: theme.dark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: theme.muted }}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Investor Management | Axiom Admin</title>
      </Head>

      <div style={{ minHeight: '100vh', background: theme.dark, padding: '40px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 32 }}>
            <Link href="/" style={{ color: theme.muted, textDecoration: 'none', fontSize: 14 }}>
              ← Back to Home
            </Link>
            <h1 style={{ margin: '8px 0 0', fontSize: 28, color: '#fff' }}>
              Admin Dashboard
            </h1>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ color: theme.muted, fontSize: 14, marginBottom: 8 }}>Total Deals</div>
              <div style={{ color: theme.primary, fontSize: 32, fontWeight: 700 }}>
                {deals.length}
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ color: theme.muted, fontSize: 14, marginBottom: 8 }}>Total Investors</div>
              <div style={{ color: theme.secondary, fontSize: 32, fontWeight: 700 }}>
                {investors.length}
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ color: theme.muted, fontSize: 14, marginBottom: 8 }}>New Deals</div>
              <div style={{ color: '#F59E0B', fontSize: 32, fontWeight: 700 }}>
                {deals.filter(d => d.status === 'new').length}
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ color: theme.muted, fontSize: 14, marginBottom: 8 }}>Approved</div>
              <div style={{ color: theme.secondary, fontSize: 32, fontWeight: 700 }}>
                {deals.filter(d => d.status === 'approved' || d.status === 'funded').length}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button
              onClick={() => setActiveTab('deals')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'deals' ? theme.primary : 'transparent',
                border: `1px solid ${activeTab === 'deals' ? theme.primary : theme.border}`,
                borderRadius: 8,
                color: activeTab === 'deals' ? '#000' : '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Partner Deals ({deals.length})
            </button>
            <button
              onClick={() => setActiveTab('investors')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'investors' ? theme.primary : 'transparent',
                border: `1px solid ${activeTab === 'investors' ? theme.primary : theme.border}`,
                borderRadius: 8,
                color: activeTab === 'investors' ? '#000' : '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Portal Investors ({investors.length})
            </button>
          </div>

          <div style={{
            display: 'flex',
            gap: 16,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}>
            <input
              type="text"
              placeholder={activeTab === 'deals' ? "Search deals..." : "Search investors..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: 200,
                padding: 14,
                background: '#111',
                border: `1px solid ${theme.border}`,
                borderRadius: 8,
                color: '#fff',
                fontSize: 15,
              }}
            />
            {activeTab === 'investors' && (
              <select
                value={selectedPortal}
                onChange={(e) => setSelectedPortal(e.target.value)}
                style={{
                  padding: 14,
                  background: '#111',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 15,
                  minWidth: 200,
                }}
              >
                <option value="all">All Portals</option>
                {portals.map((p, i) => (
                  <option key={i} value={p.portal_name}>
                    {p.portal_name} ({p.investor_count})
                  </option>
                ))}
              </select>
            )}
          </div>

          {activeTab === 'deals' && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 24px',
                borderBottom: `1px solid ${theme.border}`,
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
                gap: 16,
                color: theme.muted,
                fontSize: 13,
                fontWeight: 600,
              }}>
                <div>Partner</div>
                <div>Property</div>
                <div>Value</div>
                <div>Product</div>
                <div>Status</div>
              </div>

              {filteredDeals.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: theme.muted }}>
                  No deals found
                </div>
              ) : (
                filteredDeals.map((deal) => (
                  <div
                    key={deal.id}
                    style={{
                      padding: '16px 24px',
                      borderBottom: `1px solid ${theme.border}`,
                      display: 'grid',
                      gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
                      gap: 16,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>
                        {deal.name}
                      </div>
                      <div style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>
                        {deal.email}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontSize: 14 }}>
                        {deal.property_type}
                      </div>
                      <div style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
                        {deal.property_address || 'No address'}
                      </div>
                    </div>
                    <div style={{ color: theme.primary, fontSize: 14, fontWeight: 500 }}>
                      {deal.deal_value}
                    </div>
                    <div style={{ color: '#fff', fontSize: 13 }}>
                      {deal.recommended_primary?.replace('AXUSD ', '') || '-'}
                    </div>
                    <div>
                      <span style={{
                        padding: '4px 12px',
                        background: `${getStatusColor(deal.status)}20`,
                        border: `1px solid ${getStatusColor(deal.status)}50`,
                        borderRadius: 20,
                        fontSize: 12,
                        color: getStatusColor(deal.status),
                      }}>
                        {deal.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'investors' && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 24px',
                borderBottom: `1px solid ${theme.border}`,
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
                gap: 16,
                color: theme.muted,
                fontSize: 13,
                fontWeight: 600,
              }}>
                <div>Investor</div>
                <div>Portal</div>
                <div>Accreditation</div>
                <div>KYC</div>
                <div>Last Login</div>
              </div>

              {filteredInvestors.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: theme.muted }}>
                  No investors found
                </div>
              ) : (
                filteredInvestors.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      padding: '16px 24px',
                      borderBottom: `1px solid ${theme.border}`,
                      display: 'grid',
                      gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
                      gap: 16,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>
                        {inv.name || 'No name'}
                      </div>
                      <div style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>
                        {inv.email}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontSize: 14 }}>
                        {inv.portal_name}
                      </div>
                      <div style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
                        {inv.partner_email}
                      </div>
                    </div>
                    <div>
                      <span style={{
                        padding: '4px 12px',
                        background: `${getStatusColor(inv.accreditation_status)}20`,
                        border: `1px solid ${getStatusColor(inv.accreditation_status)}50`,
                        borderRadius: 20,
                        fontSize: 12,
                        color: getStatusColor(inv.accreditation_status),
                      }}>
                        {inv.accreditation_status}
                      </span>
                    </div>
                    <div>
                      <span style={{
                        padding: '4px 12px',
                        background: `${getStatusColor(inv.kyc_status)}20`,
                        border: `1px solid ${getStatusColor(inv.kyc_status)}50`,
                        borderRadius: 20,
                        fontSize: 12,
                        color: getStatusColor(inv.kyc_status),
                      }}>
                        {inv.kyc_status}
                      </span>
                    </div>
                    <div style={{ color: theme.muted, fontSize: 13 }}>
                      {inv.last_login 
                        ? new Date(inv.last_login).toLocaleDateString()
                        : 'Never'
                      }
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
