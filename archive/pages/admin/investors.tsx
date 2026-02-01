import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { SiteLayout } from '../../components/navigation';

interface Investor {
  id: number;
  walletAddress: string;
  legalName: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  accreditationStatus: string;
  accreditationMethod: string | null;
  kycVerified: boolean;
  amlCleared: boolean;
  ofacCleared: boolean;
  ppmAcknowledged: boolean;
  riskDisclosureAcknowledged: boolean;
  subscriptionSigned: boolean;
  isEntity: boolean;
  entityName: string | null;
  entityType: string | null;
  adminNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  pending: number;
  underReview: number;
  verified: number;
  rejected: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#D97706' },
  documents_submitted: { bg: '#DBEAFE', text: '#1D4ED8' },
  under_review: { bg: '#E0E7FF', text: '#4F46E5' },
  verified: { bg: '#D1FAE5', text: '#059669' },
  rejected: { bg: '#FEE2E2', text: '#DC2626' },
  expired: { bg: '#F3F4F6', text: '#6B7280' },
};

const METHOD_LABELS: Record<string, string> = {
  income: 'Income ($200K+)',
  net_worth: 'Net Worth ($1M+)',
  professional: 'Professional License',
  entity: 'Entity ($5M+ Assets)',
  knowledgeable: 'Knowledgeable Employee',
};

export default function InvestorManagement() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const adminToken = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/investors', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setInvestors(data.investors);
        setStats(data.stats);
      } else if (res.status === 401) {
        const token = prompt('Enter admin token to access investor management:');
        if (token) {
          localStorage.setItem('admin_token', token);
          fetchData();
        }
      }
    } catch (err) {
      console.error('Failed to fetch investors:', err);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string) => {
    if (!selectedInvestor) return;
    setActionLoading(true);

    try {
      const adminToken = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/investors', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          id: selectedInvestor.id,
          action,
          notes: actionNotes,
          reason: rejectionReason
        })
      });

      if (res.ok) {
        await fetchData();
        setSelectedInvestor(null);
        setActionNotes('');
        setRejectionReason('');
      } else {
        alert('Action failed. Please try again.');
      }
    } catch (err) {
      console.error('Action failed:', err);
      alert('Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredInvestors = investors.filter(inv => {
    if (filter === 'all') return true;
    return inv.accreditationStatus === filter;
  });

  if (loading) {
    return (
      <SiteLayout>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
          <div style={{ color: '#6B7280' }}>Loading investor data...</div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <Head>
        <title>Investor Verification | Admin</title>
      </Head>

      <main style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
              Investor Verification
            </h1>
            <p style={{ fontSize: '16px', color: '#6B7280' }}>
              SEC Reg D 506(c) - Review and approve accredited investor applications
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {[
              { label: 'Total Applications', value: stats?.total || 0, color: '#1F2937' },
              { label: 'Pending Review', value: stats?.pending || 0, color: '#D97706' },
              { label: 'Under Review', value: stats?.underReview || 0, color: '#4F46E5' },
              { label: 'Verified', value: stats?.verified || 0, color: '#059669' },
              { label: 'Rejected', value: stats?.rejected || 0, color: '#DC2626' },
            ].map((stat, i) => (
              <div key={i} style={{
                background: '#FFFFFF',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {['all', 'pending', 'under_review', 'verified', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  background: filter === status ? '#00D4AA' : '#E5E7EB',
                  color: filter === status ? '#FFFFFF' : '#4B5563',
                  transition: 'all 0.2s'
                }}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Investor</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Method</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>KYC</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>AML</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Submitted</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvestors.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                        No investors found matching the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredInvestors.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 600, color: '#1F2937' }}>{inv.legalName}</div>
                          <div style={{ fontSize: '13px', color: '#6B7280' }}>{inv.email}</div>
                          <div style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                            {inv.walletAddress.slice(0, 6)}...{inv.walletAddress.slice(-4)}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontSize: '14px', color: '#4B5563' }}>
                            {inv.accreditationMethod ? METHOD_LABELS[inv.accreditationMethod] || inv.accreditationMethod : '-'}
                          </div>
                          {inv.isEntity && (
                            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                              {inv.entityType}: {inv.entityName}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: STATUS_COLORS[inv.accreditationStatus]?.bg || '#F3F4F6',
                            color: STATUS_COLORS[inv.accreditationStatus]?.text || '#6B7280'
                          }}>
                            {inv.accreditationStatus?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          {inv.kycVerified ? (
                            <span style={{ color: '#059669', fontSize: '18px' }}>✓</span>
                          ) : (
                            <span style={{ color: '#D1D5DB', fontSize: '18px' }}>○</span>
                          )}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          {inv.amlCleared ? (
                            <span style={{ color: '#059669', fontSize: '18px' }}>✓</span>
                          ) : (
                            <span style={{ color: '#D1D5DB', fontSize: '18px' }}>○</span>
                          )}
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#6B7280' }}>
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedInvestor(inv)}
                            style={{
                              padding: '8px 16px',
                              background: '#00D4AA',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 500
                            }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {selectedInvestor && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          zIndex: 1000
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                    {selectedInvestor.legalName}
                  </h2>
                  <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0' }}>
                    {selectedInvestor.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedInvestor(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#9CA3AF'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Wallet Address</div>
                  <div style={{ fontSize: '13px', color: '#1F2937', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedInvestor.walletAddress}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Location</div>
                  <div style={{ fontSize: '14px', color: '#1F2937' }}>
                    {[selectedInvestor.city, selectedInvestor.state, selectedInvestor.country].filter(Boolean).join(', ') || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Accreditation Method</div>
                  <div style={{ fontSize: '14px', color: '#1F2937' }}>
                    {selectedInvestor.accreditationMethod ? METHOD_LABELS[selectedInvestor.accreditationMethod] || selectedInvestor.accreditationMethod : '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Current Status</div>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: STATUS_COLORS[selectedInvestor.accreditationStatus]?.bg || '#F3F4F6',
                    color: STATUS_COLORS[selectedInvestor.accreditationStatus]?.text || '#6B7280'
                  }}>
                    {selectedInvestor.accreditationStatus?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>Verification Checklist</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'KYC Verified', checked: selectedInvestor.kycVerified, action: 'verify_kyc' },
                    { label: 'AML Cleared', checked: selectedInvestor.amlCleared, action: 'verify_aml' },
                    { label: 'OFAC Cleared', checked: selectedInvestor.ofacCleared, action: 'verify_ofac' },
                  ].map(item => (
                    <button
                      key={item.action}
                      onClick={() => !item.checked && performAction(item.action)}
                      disabled={item.checked || actionLoading}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: item.checked ? '2px solid #059669' : '2px solid #E5E7EB',
                        background: item.checked ? '#D1FAE5' : '#FFFFFF',
                        cursor: item.checked ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: item.checked ? '#059669' : '#4B5563'
                      }}
                    >
                      {item.checked ? '✓' : '○'} {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>Document Status</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { label: 'PPM', signed: selectedInvestor.ppmAcknowledged },
                    { label: 'Risk Disclosure', signed: selectedInvestor.riskDisclosureAcknowledged },
                    { label: 'Subscription', signed: selectedInvestor.subscriptionSigned },
                  ].map(doc => (
                    <div key={doc.label} style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: doc.signed ? '#D1FAE5' : '#FEF3C7',
                      fontSize: '12px',
                      textAlign: 'center',
                      color: doc.signed ? '#059669' : '#D97706'
                    }}>
                      {doc.label}: {doc.signed ? 'Signed' : 'Pending'}
                    </div>
                  ))}
                </div>
              </div>

              {selectedInvestor.adminNotes && (
                <div style={{ marginBottom: '24px', padding: '12px', background: '#F3F4F6', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Admin Notes</div>
                  <div style={{ fontSize: '14px', color: '#1F2937' }}>{selectedInvestor.adminNotes}</div>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1F2937', marginBottom: '8px' }}>
                  Add Notes
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Add internal notes about this investor..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {selectedInvestor.accreditationStatus !== 'verified' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1F2937', marginBottom: '8px' }}>
                    Rejection Reason (if rejecting)
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Reason for rejection..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '14px'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {selectedInvestor.accreditationStatus !== 'verified' && (
                  <button
                    onClick={() => performAction('approve')}
                    disabled={actionLoading}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '14px 24px',
                      background: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      opacity: actionLoading ? 0.7 : 1
                    }}
                  >
                    ✓ Approve Investor
                  </button>
                )}
                {selectedInvestor.accreditationStatus !== 'rejected' && (
                  <button
                    onClick={() => performAction('reject')}
                    disabled={actionLoading}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '14px 24px',
                      background: '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      opacity: actionLoading ? 0.7 : 1
                    }}
                  >
                    ✗ Reject
                  </button>
                )}
                <button
                  onClick={() => performAction('add_notes')}
                  disabled={actionLoading || !actionNotes}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '14px 24px',
                    background: '#4F46E5',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: actionLoading || !actionNotes ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    opacity: actionLoading || !actionNotes ? 0.7 : 1
                  }}
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  );
}
