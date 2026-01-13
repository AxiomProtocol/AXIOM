import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface ApplicationData {
  application: {
    id: number;
    applicationNumber: string;
    loanAmountRequested: string;
    tier: string;
    status: string;
    monthlyPayment: string;
    dscrBps: number;
    ltvBps: number;
    interestRateBps: number;
    createdAt: string;
    conditionalApprovalAt: string | null;
    fundedAt: string | null;
    walletAddress: string | null;
  };
  borrower: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    isEntity: boolean;
    entityName: string | null;
  };
  property: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    propertyType: string;
    units: number;
    monthlyRent: string;
    appraisedValue: string;
  };
}

interface Stats {
  total: number;
  submitted: number;
  preScreened: number;
  conditionalApproval: number;
  docsComplete: number;
  readyToClose: number;
  funded: number;
  declined: number;
  totalRequested: number;
  avgDscr: number;
  avgLtv: number;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: '#6B7280',
  pre_screened: '#3B82F6',
  conditional_approval: '#F59E0B',
  docs_complete: '#8B5CF6',
  ready_to_close: '#22C55E',
  funded: '#059669',
  declined: '#EF4444'
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  pre_screened: 'Pre-Screened',
  conditional_approval: 'Conditional',
  docs_complete: 'Docs Complete',
  ready_to_close: 'Ready to Close',
  funded: 'Funded',
  declined: 'Declined'
};

export default function LoanTapeAdmin() {
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let url = '/api/dscr/applications';
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (tierFilter) params.append('tier', tierFilter);
      if (params.toString()) url += '?' + params.toString();

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setApplications(data.applications || []);
        setStats(data.stats);
        setAuthenticated(true);
      } else {
        if (res.status === 401) {
          setAuthenticated(false);
          setError('Invalid admin token');
        } else {
          setError(data.error || 'Failed to fetch applications');
        }
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!applications.length) return;

    const headers = [
      'Application #', 'Status', 'Tier', 'Borrower', 'Email', 'Property Address',
      'City', 'State', 'Property Type', 'Units', 'Loan Amount', 'Monthly Payment',
      'DSCR', 'LTV', 'Rate', 'Monthly Rent', 'Appraised Value', 'Created', 'Wallet'
    ];

    const rows = applications.map(a => [
      a.application.applicationNumber,
      STATUS_LABELS[a.application.status] || a.application.status,
      a.application.tier?.toUpperCase(),
      a.borrower.isEntity ? a.borrower.entityName : `${a.borrower.firstName} ${a.borrower.lastName}`,
      a.borrower.email,
      a.property.streetAddress,
      a.property.city,
      a.property.state,
      a.property.propertyType,
      a.property.units,
      a.application.loanAmountRequested,
      a.application.monthlyPayment,
      ((a.application.dscrBps || 0) / 100).toFixed(2),
      ((a.application.ltvBps || 0) / 100).toFixed(1) + '%',
      ((a.application.interestRateBps || 0) / 100).toFixed(2) + '%',
      a.property.monthlyRent,
      a.property.appraisedValue,
      new Date(a.application.createdAt).toLocaleDateString(),
      a.application.walletAddress || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DSCR-LoanTape-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const updateApplicationStatus = async (id: number, status: string) => {
    try {
      const res = await fetch('/api/dscr/applications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        fetchApplications();
      }
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      setAdminToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (adminToken && authenticated) {
      fetchApplications();
    }
  }, [statusFilter, tierFilter]);

  const handleLogin = () => {
    localStorage.setItem('adminToken', adminToken);
    fetchApplications();
  };

  if (!authenticated) {
    return (
      <>
        <Head>
          <title>Admin Login | DSCR Loan Tape</title>
        </Head>
        <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%', border: '1px solid #E5E7EB' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>Admin Access</h1>
            {error && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px', marginBottom: '16px', color: '#DC2626', fontSize: '14px' }}>
                {error}
              </div>
            )}
            <input
              type="password"
              placeholder="Admin Token"
              value={adminToken}
              onChange={e => setAdminToken(e.target.value)}
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '15px', marginBottom: '16px', boxSizing: 'border-box' }}
            />
            <button onClick={handleLogin} style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
              color: '#FFFFFF',
              borderRadius: '10px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              Access Loan Tape
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>DSCR Loan Tape | Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '20px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', marginBottom: '4px' }}>DSCR Loan Tape</h1>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Manage DSCR rental loan applications</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={exportCSV} style={{
                padding: '12px 24px',
                background: '#FFFFFF',
                color: '#374151',
                borderRadius: '10px',
                border: '1px solid #E5E7EB',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}>
                Export CSV
              </button>
              <Link href="/lending-fund" style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none'
              }}>
                View Fund
              </Link>
            </div>
          </div>

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Applications</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e' }}>{stats.total}</div>
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Requested</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37' }}>${(stats.totalRequested / 1000000).toFixed(1)}M</div>
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Avg DSCR</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: stats.avgDscr >= 1.1 ? '#22C55E' : '#EF4444' }}>{stats.avgDscr.toFixed(2)}x</div>
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Avg LTV</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#3B82F6' }}>{(stats.avgLtv * 100).toFixed(1)}%</div>
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Ready to Close</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#22C55E' }}>{stats.readyToClose}</div>
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Funded</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669' }}>{stats.funded}</div>
              </div>
            </div>
          )}

          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #E5E7EB', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px' }}>
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="pre_screened">Pre-Screened</option>
              <option value="conditional_approval">Conditional Approval</option>
              <option value="docs_complete">Docs Complete</option>
              <option value="ready_to_close">Ready to Close</option>
              <option value="funded">Funded</option>
              <option value="declined">Declined</option>
            </select>
            <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px' }}>
              <option value="">All Tiers</option>
              <option value="low">Low Risk</option>
              <option value="standard">Standard</option>
              <option value="yield">Yield</option>
            </select>
            <button onClick={fetchApplications} style={{ padding: '10px 20px', background: '#F3F4F6', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading...</div>
          ) : applications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '18px', color: '#6b7280' }}>No applications found</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#FFFFFF', borderRadius: '12px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #E5E7EB' }}>App #</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #E5E7EB' }}>Borrower</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #E5E7EB' }}>Property</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #E5E7EB' }}>Loan Amt</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #E5E7EB' }}>Tier</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #E5E7EB' }}>DSCR</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #E5E7EB' }}>LTV</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #E5E7EB' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #E5E7EB' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map(a => (
                    <tr key={a.application.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <Link href={`/dscr/term-sheet/${a.application.id}`} style={{ color: '#D4AF37', fontWeight: 500 }}>
                          {a.application.applicationNumber}
                        </Link>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <div style={{ fontWeight: 500 }}>{a.borrower.isEntity ? a.borrower.entityName : `${a.borrower.firstName} ${a.borrower.lastName}`}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{a.borrower.email}</div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <div>{a.property.streetAddress}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{a.property.city}, {a.property.state}</div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right', fontWeight: 500 }}>
                        ${Number(a.application.loanAmountRequested).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '12px', 
                          fontWeight: 500,
                          background: a.application.tier === 'low' ? '#D1FAE5' : a.application.tier === 'yield' ? '#FEF3C7' : '#DBEAFE',
                          color: a.application.tier === 'low' ? '#059669' : a.application.tier === 'yield' ? '#92400E' : '#1D4ED8'
                        }}>
                          {a.application.tier?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 500, color: (a.application.dscrBps || 0) >= 110 ? '#22C55E' : '#EF4444' }}>
                        {((a.application.dscrBps || 0) / 100).toFixed(2)}x
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                        {((a.application.ltvBps || 0) / 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '12px', 
                          fontWeight: 500,
                          background: STATUS_COLORS[a.application.status] + '20',
                          color: STATUS_COLORS[a.application.status]
                        }}>
                          {STATUS_LABELS[a.application.status] || a.application.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <select 
                          value={a.application.status}
                          onChange={e => updateApplicationStatus(a.application.id, e.target.value)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                        >
                          <option value="submitted">Submitted</option>
                          <option value="pre_screened">Pre-Screened</option>
                          <option value="conditional_approval">Conditional</option>
                          <option value="docs_complete">Docs Complete</option>
                          <option value="ready_to_close">Ready to Close</option>
                          <option value="funded">Funded</option>
                          <option value="declined">Declined</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
