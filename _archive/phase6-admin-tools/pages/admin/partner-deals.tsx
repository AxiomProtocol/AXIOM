import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const theme = {
  primary: '#00D4AA',
  secondary: '#FFD700',
  accent: '#7B68EE',
  dark: '#0a0a0a',
  muted: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
};

interface Deal {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  propertyType: string;
  acquisitionStructure: string;
  capitalNeed: string;
  exitStrategy: string;
  timeline: string;
  dealValue: string;
  partnerRole: string;
  recommendedPrimary: string;
  recommendedSecondary: string[];
  recommendedProtection: string[];
  compliancePath: string;
  estimatedTerms: any;
  status: string;
  notes: string;
  propertyAddress: string;
  dealDescription: string;
  createdAt: string;
  updatedAt: string;
  contactedAt: string;
}

const statusColors: Record<string, string> = {
  new: '#3B82F6',
  contacted: '#8B5CF6',
  in_review: '#F59E0B',
  approved: '#10B981',
  funded: '#00D4AA',
  declined: '#EF4444',
  withdrawn: '#6B7280',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  in_review: 'In Review',
  approved: 'Approved',
  funded: 'Funded',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};

const allStatuses = ['new', 'contacted', 'in_review', 'approved', 'funded', 'declined', 'withdrawn'];

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDealValue = (value: string) => {
  const labels: Record<string, string> = {
    'under-100k': '<$100K',
    '100k-250k': '$100K-$250K',
    '250k-500k': '$250K-$500K',
    '500k-1m': '$500K-$1M',
    '1m-5m': '$1M-$5M',
    'over-5m': '$5M+',
  };
  return labels[value] || value;
};

export default function AdminPartnerDeals() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const urlToken = router.query.token as string;
    if (urlToken) {
      setToken(urlToken);
      fetchDeals(urlToken);
    } else {
      setLoading(false);
    }
  }, [router.query.token]);

  const fetchDeals = async (adminToken: string, status?: string, search?: string) => {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/admin/partner-deals?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDeals(data.deals || []);
        setStats(data.stats || {});
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDeal = async (id: number, updates: Partial<Deal>) => {
    setUpdating(true);
    try {
      const response = await fetch('/api/admin/partner-deals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id, ...updates }),
      });

      if (response.ok) {
        const data = await response.json();
        setDeals(prev => prev.map(d => d.id === id ? data.deal : d));
        if (selectedDeal?.id === id) {
          setSelectedDeal(data.deal);
        }
        setMessage({ type: 'success', text: 'Deal updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update deal' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update deal' });
    } finally {
      setUpdating(false);
    }
  };

  const handleSearch = () => {
    fetchDeals(token, filterStatus, searchQuery);
  };

  const handleStatusFilter = (status: string) => {
    setFilterStatus(status);
    fetchDeals(token, status, searchQuery);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: theme.dark,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
      }}>
        Loading...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <>
        <Head>
          <title>Admin - Partner Deals | Axiom Protocol</title>
        </Head>
        <div style={{
          minHeight: '100vh',
          background: theme.dark,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          color: '#fff',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 40,
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
          }}>
            <h1 style={{ margin: '0 0 16px', fontSize: 24 }}>Admin Access Required</h1>
            <p style={{ color: theme.muted, margin: '0 0 24px' }}>
              Please use the admin token URL to access this page.
            </p>
            <code style={{
              display: 'block',
              padding: 12,
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 8,
              fontSize: 12,
              color: theme.muted,
            }}>
              /admin/partner-deals?token=YOUR_ADMIN_TOKEN
            </code>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Admin - Partner Deals | Axiom Protocol</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${theme.dark} 0%, #0f0f1a 100%)`,
        color: '#fff',
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '40px 24px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32,
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
                Partner Deal Pipeline
              </h1>
              <p style={{ margin: '8px 0 0', color: theme.muted }}>
                Manage incoming partner deal submissions
              </p>
            </div>
            {message && (
              <div style={{
                padding: '10px 20px',
                background: message.type === 'success' ? `${theme.primary}20` : 'rgba(255,100,100,0.1)',
                border: `1px solid ${message.type === 'success' ? theme.primary : '#ff6b6b'}`,
                borderRadius: 8,
                color: message.type === 'success' ? theme.primary : '#ff6b6b',
                fontSize: 14,
              }}>
                {message.text}
              </div>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}>
            {allStatuses.map(status => (
              <div
                key={status}
                onClick={() => handleStatusFilter(status)}
                style={{
                  background: filterStatus === status ? `${statusColors[status]}20` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${filterStatus === status ? statusColors[status] : theme.border}`,
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: statusColors[status],
                }}>
                  {stats[status] || 0}
                </div>
                <div style={{
                  fontSize: 12,
                  color: theme.muted,
                  marginTop: 4,
                }}>
                  {statusLabels[status]}
                </div>
              </div>
            ))}
            <div
              onClick={() => handleStatusFilter('all')}
              style={{
                background: filterStatus === 'all' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filterStatus === 'all' ? '#fff' : theme.border}`,
                borderRadius: 12,
                padding: 16,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800 }}>
                {Object.values(stats).reduce((a, b) => a + b, 0)}
              </div>
              <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
                All Deals
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: 12,
            marginBottom: 24,
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, company, or address..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                color: '#fff',
                fontSize: 14,
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                padding: '12px 24px',
                background: theme.primary,
                border: 'none',
                borderRadius: 10,
                color: '#000',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </div>

          {deals.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 60,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>No Deals Found</h3>
              <p style={{ margin: 0, color: theme.muted }}>
                {filterStatus !== 'all' ? `No ${statusLabels[filterStatus]} deals` : 'No partner deals submitted yet'}
              </p>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: theme.muted, fontWeight: 600 }}>Partner</th>
                    <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: theme.muted, fontWeight: 600 }}>Deal</th>
                    <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: theme.muted, fontWeight: 600 }}>Product</th>
                    <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: theme.muted, fontWeight: 600 }}>Role</th>
                    <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: theme.muted, fontWeight: 600 }}>Status</th>
                    <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: theme.muted, fontWeight: 600 }}>Submitted</th>
                    <th style={{ padding: 16, textAlign: 'center', fontSize: 13, color: theme.muted, fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr
                      key={deal.id}
                      style={{
                        borderTop: `1px solid ${theme.border}`,
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                      }}
                      onClick={() => setSelectedDeal(deal)}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: 16 }}>
                        <div style={{ fontWeight: 600 }}>{deal.name}</div>
                        <div style={{ fontSize: 13, color: theme.muted }}>{deal.email}</div>
                        {deal.company && (
                          <div style={{ fontSize: 12, color: theme.muted }}>{deal.company}</div>
                        )}
                      </td>
                      <td style={{ padding: 16 }}>
                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                          {deal.propertyType} - {formatDealValue(deal.dealValue)}
                        </div>
                        <div style={{ fontSize: 13, color: theme.muted, textTransform: 'capitalize' }}>
                          {deal.exitStrategy.replace('-', ' ')}
                        </div>
                      </td>
                      <td style={{ padding: 16 }}>
                        <div style={{ fontWeight: 600 }}>{deal.recommendedPrimary}</div>
                        <div style={{ fontSize: 12, color: theme.muted }}>{deal.compliancePath}</div>
                      </td>
                      <td style={{ padding: 16, textTransform: 'capitalize' }}>
                        {deal.partnerRole.replace('-', ' ')}
                      </td>
                      <td style={{ padding: 16 }}>
                        <span style={{
                          padding: '4px 10px',
                          background: `${statusColors[deal.status]}20`,
                          border: `1px solid ${statusColors[deal.status]}50`,
                          borderRadius: 16,
                          fontSize: 12,
                          fontWeight: 600,
                          color: statusColors[deal.status],
                        }}>
                          {statusLabels[deal.status] || deal.status}
                        </span>
                      </td>
                      <td style={{ padding: 16, fontSize: 13, color: theme.muted }}>
                        {formatDate(deal.createdAt).split(',')[0]}
                      </td>
                      <td style={{ padding: 16, textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDeal(deal);
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: 6,
                            color: '#fff',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedDeal && (
        <div
          onClick={() => setSelectedDeal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 24,
            paddingTop: 60,
            zIndex: 1000,
            overflowY: 'auto',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111',
              border: `1px solid ${theme.border}`,
              borderRadius: 20,
              padding: 32,
              maxWidth: 700,
              width: '100%',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 24,
            }}>
              <div>
                <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700 }}>
                  {selectedDeal.name}
                </h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <a href={`mailto:${selectedDeal.email}`} style={{ color: theme.primary, fontSize: 14 }}>
                    {selectedDeal.email}
                  </a>
                  {selectedDeal.phone && (
                    <>
                      <span style={{ color: theme.muted }}>|</span>
                      <a href={`tel:${selectedDeal.phone}`} style={{ color: theme.muted, fontSize: 14 }}>
                        {selectedDeal.phone}
                      </a>
                    </>
                  )}
                </div>
                {selectedDeal.company && (
                  <div style={{ color: theme.muted, fontSize: 14, marginTop: 4 }}>
                    {selectedDeal.company}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedDeal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.muted,
                  fontSize: 28,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              display: 'flex',
              gap: 12,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}>
              <span style={{ color: theme.muted, fontSize: 13 }}>Change Status:</span>
              {allStatuses.map(status => (
                <button
                  key={status}
                  onClick={() => updateDeal(selectedDeal.id, { status })}
                  disabled={updating || selectedDeal.status === status}
                  style={{
                    padding: '6px 14px',
                    background: selectedDeal.status === status ? `${statusColors[status]}30` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedDeal.status === status ? statusColors[status] : theme.border}`,
                    borderRadius: 20,
                    color: statusColors[status],
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: selectedDeal.status === status ? 'default' : 'pointer',
                    opacity: updating ? 0.5 : 1,
                  }}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
              marginBottom: 24,
            }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Property Type</div>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedDeal.propertyType}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Deal Value</div>
                <div style={{ fontWeight: 600 }}>{formatDealValue(selectedDeal.dealValue)}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Timeline</div>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedDeal.timeline.replace('-', ' ')}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Acquisition</div>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedDeal.acquisitionStructure.replace('-', ' ')}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Exit Strategy</div>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedDeal.exitStrategy.replace('-', ' ')}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Partner Role</div>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedDeal.partnerRole.replace('-', ' ')}</div>
              </div>
            </div>

            {selectedDeal.propertyAddress && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Property Address</div>
                <div style={{ fontWeight: 600 }}>{selectedDeal.propertyAddress}</div>
              </div>
            )}

            <div style={{
              background: `${theme.primary}10`,
              border: `1px solid ${theme.primary}30`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
            }}>
              <h4 style={{ margin: '0 0 16px', color: theme.primary, fontSize: 14 }}>
                Recommended Stack
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Primary Product</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedDeal.recommendedPrimary}</div>
                </div>
                <div>
                  <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Compliance Path</div>
                  <div style={{ fontWeight: 600 }}>{selectedDeal.compliancePath}</div>
                </div>
              </div>
              {selectedDeal.recommendedSecondary && selectedDeal.recommendedSecondary.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ color: theme.muted, fontSize: 12, marginBottom: 8 }}>Secondary Layers</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedDeal.recommendedSecondary.map((layer, i) => (
                      <span key={i} style={{
                        padding: '4px 10px',
                        background: `${theme.secondary}20`,
                        borderRadius: 16,
                        fontSize: 13,
                        color: theme.secondary,
                      }}>
                        {layer}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedDeal.dealDescription && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Partner Notes</div>
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  padding: 12,
                  lineHeight: 1.6,
                }}>
                  {selectedDeal.dealDescription}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <div style={{ color: theme.muted, fontSize: 12, marginBottom: 8 }}>Internal Notes</div>
              <textarea
                defaultValue={selectedDeal.notes || ''}
                placeholder="Add internal notes about this deal..."
                rows={3}
                onBlur={(e) => {
                  if (e.target.value !== (selectedDeal.notes || '')) {
                    updateDeal(selectedDeal.id, { notes: e.target.value });
                  }
                }}
                style={{
                  width: '100%',
                  padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 16,
              borderTop: `1px solid ${theme.border}`,
              fontSize: 13,
              color: theme.muted,
            }}>
              <div>Submitted: {formatDate(selectedDeal.createdAt)}</div>
              {selectedDeal.contactedAt && (
                <div>First Contact: {formatDate(selectedDeal.contactedAt)}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
