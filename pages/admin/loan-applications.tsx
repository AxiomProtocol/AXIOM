import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface LoanApplication {
  id: number;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string | null;
  companyName: string | null;
  propertyAddress: string;
  propertyCity: string | null;
  propertyState: string | null;
  propertyType: string | null;
  purchasePrice: string | null;
  rehabBudget: string | null;
  arvEstimate: string | null;
  loanAmountRequested: string;
  loanTermMonths: number | null;
  exitStrategy: string | null;
  yearsExperience: number | null;
  projectsCompleted: number | null;
  status: string;
  adminNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  submitted: number;
  underReview: number;
  approved: number;
  funded: number;
  rejected: number;
}

export default function AdminLoanApplications() {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const authenticate = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/realestate/loan-application', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications);
        setStats(data.stats);
        setAuthenticated(true);
        localStorage.setItem('admin_token', token);
      } else {
        alert('Invalid token');
      }
    } catch (err) {
      alert('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) {
      setToken(saved);
      fetch('/api/realestate/loan-application', {
        headers: { Authorization: `Bearer ${saved}` }
      }).then(res => {
        if (res.ok) {
          res.json().then(data => {
            setApplications(data.applications);
            setStats(data.stats);
            setAuthenticated(true);
          });
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAction = async (action: string) => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/realestate/loan-application', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: selectedApp.id,
          action,
          notes,
          reason
        })
      });
      if (res.ok) {
        const refreshRes = await fetch('/api/realestate/loan-application', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setApplications(data.applications);
          setStats(data.stats);
        }
        setSelectedApp(null);
        setNotes('');
        setReason('');
      }
    } catch (err) {
      alert('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: string | null) => {
    if (!val) return 'N/A';
    return '$' + parseInt(val).toLocaleString();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return { bg: '#FEF3C7', text: '#92400E' };
      case 'under_review': return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'approved': return { bg: '#D1FAE5', text: '#065F46' };
      case 'funded': return { bg: '#C7D2FE', text: '#4338CA' };
      case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  const filteredApps = filter === 'all' 
    ? applications 
    : applications.filter(a => a.status === filter);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!authenticated) {
    return (
      <>
        <Head><title>Admin Login | Loan Applications</title></Head>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
          <div style={{ background: '#FFFFFF', padding: '40px', borderRadius: '16px', maxWidth: '400px', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: '#1a1a2e' }}>Admin Access</h1>
            <input
              type="password"
              placeholder="Enter admin token"
              value={token}
              onChange={e => setToken(e.target.value)}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #E5E7EB', marginBottom: '16px' }}
            />
            <button
              onClick={authenticate}
              style={{ width: '100%', padding: '14px', background: '#00D4AA', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Login
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>Loan Applications | Admin</title></Head>
      <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e' }}>Loan Applications</h1>
              <p style={{ color: '#6b7280' }}>Manage fix & flip borrower applications</p>
            </div>
            <Link href="/admin/investors" style={{ padding: '10px 20px', background: '#7C3AED', color: '#FFFFFF', borderRadius: '8px', textDecoration: 'none', fontWeight: 500 }}>
              Investor Admin
            </Link>
          </div>

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total', value: stats.total, color: '#6B7280' },
                { label: 'New', value: stats.submitted, color: '#F59E0B' },
                { label: 'In Review', value: stats.underReview, color: '#3B82F6' },
                { label: 'Approved', value: stats.approved, color: '#10B981' },
                { label: 'Funded', value: stats.funded, color: '#6366F1' },
                { label: 'Rejected', value: stats.rejected, color: '#EF4444' },
              ].map((stat, i) => (
                <div key={i} style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFFFFF' }}
            >
              <option value="all">All Applications</option>
              <option value="submitted">New Submissions</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="funded">Funded</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', color: '#6B7280' }}>Borrower</th>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', color: '#6B7280' }}>Property</th>
                  <th style={{ padding: '14px', textAlign: 'right', fontSize: '13px', color: '#6B7280' }}>Loan Amt</th>
                  <th style={{ padding: '14px', textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>Status</th>
                  <th style={{ padding: '14px', textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>Date</th>
                  <th style={{ padding: '14px', textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      No applications found
                    </td>
                  </tr>
                ) : (
                  filteredApps.map(app => {
                    const statusStyle = getStatusColor(app.status);
                    return (
                      <tr key={app.id} style={{ borderTop: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '14px' }}>
                          <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{app.borrowerName}</div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>{app.borrowerEmail}</div>
                          {app.companyName && <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{app.companyName}</div>}
                        </td>
                        <td style={{ padding: '14px' }}>
                          <div style={{ fontSize: '14px', color: '#1a1a2e' }}>{app.propertyAddress}</div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>{app.propertyCity}, {app.propertyState}</div>
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 600, color: '#1a1a2e' }}>
                          {formatCurrency(app.loanAmountRequested)}
                        </td>
                        <td style={{ padding: '14px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 500,
                            background: statusStyle.bg,
                            color: statusStyle.text
                          }}>
                            {app.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '14px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
                          {formatDate(app.createdAt)}
                        </td>
                        <td style={{ padding: '14px', textAlign: 'center' }}>
                          <button
                            onClick={() => { setSelectedApp(app); setNotes(app.adminNotes || ''); }}
                            style={{ padding: '8px 16px', background: '#00D4AA', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedApp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '32px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e' }}>Application #{selectedApp.id}</h2>
              <button onClick={() => setSelectedApp(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', marginBottom: '12px' }}>Borrower Info</h3>
                <div style={{ fontSize: '14px', color: '#1a1a2e', lineHeight: 1.8 }}>
                  <div><strong>Name:</strong> {selectedApp.borrowerName}</div>
                  <div><strong>Email:</strong> {selectedApp.borrowerEmail}</div>
                  <div><strong>Phone:</strong> {selectedApp.borrowerPhone || 'N/A'}</div>
                  <div><strong>Company:</strong> {selectedApp.companyName || 'N/A'}</div>
                  <div><strong>Experience:</strong> {selectedApp.yearsExperience || 0} years</div>
                  <div><strong>Projects:</strong> {selectedApp.projectsCompleted || 0} completed</div>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', marginBottom: '12px' }}>Property & Loan</h3>
                <div style={{ fontSize: '14px', color: '#1a1a2e', lineHeight: 1.8 }}>
                  <div><strong>Address:</strong> {selectedApp.propertyAddress}</div>
                  <div><strong>City/State:</strong> {selectedApp.propertyCity}, {selectedApp.propertyState}</div>
                  <div><strong>Type:</strong> {selectedApp.propertyType?.replace('_', ' ')}</div>
                  <div><strong>Purchase:</strong> {formatCurrency(selectedApp.purchasePrice)}</div>
                  <div><strong>Rehab:</strong> {formatCurrency(selectedApp.rehabBudget)}</div>
                  <div><strong>ARV:</strong> {formatCurrency(selectedApp.arvEstimate)}</div>
                  <div><strong>Loan Request:</strong> {formatCurrency(selectedApp.loanAmountRequested)}</div>
                  <div><strong>Term:</strong> {selectedApp.loanTermMonths} months</div>
                  <div><strong>Exit:</strong> {selectedApp.exitStrategy}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '8px' }}>Admin Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', minHeight: '80px', resize: 'vertical' }}
                placeholder="Internal notes about this application..."
              />
            </div>

            {selectedApp.status !== 'rejected' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '8px' }}>Rejection Reason (if rejecting)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  placeholder="Reason for rejection..."
                />
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {selectedApp.status === 'submitted' && (
                <button
                  onClick={() => handleAction('review')}
                  disabled={actionLoading}
                  style={{ padding: '12px 24px', background: '#3B82F6', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Start Review
                </button>
              )}
              {(selectedApp.status === 'submitted' || selectedApp.status === 'under_review') && (
                <>
                  <button
                    onClick={() => handleAction('approve')}
                    disabled={actionLoading}
                    style={{ padding: '12px 24px', background: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={actionLoading}
                    style={{ padding: '12px 24px', background: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Reject
                  </button>
                </>
              )}
              {selectedApp.status === 'approved' && (
                <button
                  onClick={() => handleAction('fund')}
                  disabled={actionLoading}
                  style={{ padding: '12px 24px', background: '#6366F1', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Mark Funded
                </button>
              )}
              <button
                onClick={() => handleAction('add_notes')}
                disabled={actionLoading}
                style={{ padding: '12px 24px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
