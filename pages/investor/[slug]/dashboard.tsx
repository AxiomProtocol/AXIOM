import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface PortalConfig {
  portal_name: string;
  company_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  contact_email: string;
}

interface Investment {
  id: number;
  deal_name: string;
  investment_amount: number;
  investment_date: string;
  status: string;
  distributions_paid: number;
}

export default function InvestorDashboard() {
  const router = useRouter();
  const { slug } = router.query;
  const [portal, setPortal] = useState<PortalConfig | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [investorName, setInvestorName] = useState('');

  useEffect(() => {
    if (slug) {
      const token = localStorage.getItem(`investor_token_${slug}`);
      if (!token) {
        router.push(`/investor/${slug}`);
        return;
      }
      fetchData();
    }
  }, [slug]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem(`investor_token_${slug}`);
      const email = localStorage.getItem(`investor_email_${slug}`);

      const portalRes = await fetch(`/api/investor/portal?slug=${slug}`);
      if (portalRes.ok) {
        const data = await portalRes.json();
        setPortal(data.portal);
      }

      const investRes = await fetch(`/api/investor/investments?slug=${slug}&email=${email}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (investRes.ok) {
        const data = await investRes.json();
        setInvestments(data.investments || []);
        setInvestorName(data.investorName || email);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(`investor_token_${slug}`);
    localStorage.removeItem(`investor_email_${slug}`);
    router.push(`/investor/${slug}`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888' }}>Loading...</div>
      </div>
    );
  }

  const theme = {
    primary: portal?.primary_color || '#D4AF37',
    secondary: portal?.secondary_color || '#10B981',
    border: '#2a2a2a',
  };

  const totalInvested = investments.reduce((sum, inv) => sum + (Number(inv.investment_amount) || 0), 0);
  const totalDistributions = investments.reduce((sum, inv) => sum + (Number(inv.distributions_paid) || 0), 0);

  return (
    <>
      <Head>
        <title>Dashboard | {portal?.company_name || 'Investor Portal'}</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {portal?.logo_url && (
              <img src={portal.logo_url} alt="Logo" style={{ height: 36, objectFit: 'contain' }} />
            )}
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
              {portal?.company_name || portal?.portal_name}
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              color: '#888',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ color: '#fff', fontSize: 28, margin: '0 0 8px' }}>
              Welcome back{investorName ? `, ${investorName.split('@')[0]}` : ''}
            </h1>
            <p style={{ color: '#888', fontSize: 16, margin: 0 }}>
              Here's an overview of your investments
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
            marginBottom: 40,
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>Total Invested</div>
              <div style={{ color: theme.primary, fontSize: 32, fontWeight: 700 }}>
                ${totalInvested.toLocaleString()}
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>Total Distributions</div>
              <div style={{ color: theme.secondary, fontSize: 32, fontWeight: 700 }}>
                ${totalDistributions.toLocaleString()}
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>Active Investments</div>
              <div style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>
                {investments.filter(i => i.status === 'active').length}
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${theme.border}`,
            }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 18 }}>Your Investments</h3>
            </div>

            {investments.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#888' }}>
                <p style={{ fontSize: 16, marginBottom: 8 }}>No investments yet</p>
                <p style={{ fontSize: 14 }}>Your investments will appear here once confirmed</p>
              </div>
            ) : (
              <div>
                {investments.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      padding: '20px 24px',
                      borderBottom: `1px solid ${theme.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff', fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                        {inv.deal_name || 'Investment'}
                      </div>
                      <div style={{ color: '#888', fontSize: 13 }}>
                        Invested {new Date(inv.investment_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: theme.primary, fontSize: 18, fontWeight: 600 }}>
                        ${Number(inv.investment_amount).toLocaleString()}
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        background: inv.status === 'active' ? `${theme.secondary}20` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${inv.status === 'active' ? theme.secondary : theme.border}`,
                        borderRadius: 20,
                        fontSize: 12,
                        color: inv.status === 'active' ? theme.secondary : '#888',
                      }}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{
            marginTop: 40,
            padding: 24,
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            textAlign: 'center',
          }}>
            <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
              Have questions? Contact us at{' '}
              <a href={`mailto:${portal?.contact_email}`} style={{ color: theme.primary }}>
                {portal?.contact_email}
              </a>
            </p>
          </div>
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${theme.border}`,
          textAlign: 'center',
          background: '#0a0a0a',
        }}>
          <span style={{ color: '#666', fontSize: 12 }}>
            Powered by Axiom Protocol
          </span>
        </div>
      </div>
    </>
  );
}
