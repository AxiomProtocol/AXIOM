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

interface PortalSummary {
  portal_name: string;
  partner_email: string;
  investor_count: number;
}

export default function AdminInvestors() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [portals, setPortals] = useState<PortalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPortal, setSelectedPortal] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/investors');
      if (res.ok) {
        const data = await res.json();
        setInvestors(data.investors || []);
        setPortals(data.portals || []);
      }
    } catch (error) {
      console.error('Failed to fetch investors:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return theme.secondary;
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
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
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <Link href="/admin/partner-deals" style={{ color: theme.muted, textDecoration: 'none', fontSize: 14 }}>
                ← Back to Partner Deals
              </Link>
              <h1 style={{ margin: '8px 0 0', fontSize: 28, color: '#fff' }}>
                Investor Management
              </h1>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ color: theme.muted, fontSize: 14, marginBottom: 8 }}>Total Investors</div>
              <div style={{ color: theme.primary, fontSize: 32, fontWeight: 700 }}>
                {investors.length}
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ color: theme.muted, fontSize: 14, marginBottom: 8 }}>Active Portals</div>
              <div style={{ color: theme.secondary, fontSize: 32, fontWeight: 700 }}>
                {portals.length}
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ color: theme.muted, fontSize: 14, marginBottom: 8 }}>Verified</div>
              <div style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>
                {investors.filter(i => i.accreditation_status === 'verified').length}
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ color: theme.muted, fontSize: 14, marginBottom: 8 }}>Pending</div>
              <div style={{ color: '#F59E0B', fontSize: 32, fontWeight: 700 }}>
                {investors.filter(i => i.accreditation_status === 'pending').length}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: 16,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}>
            <input
              type="text"
              placeholder="Search by name or email..."
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
          </div>

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
        </div>
      </div>
    </>
  );
}
