import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
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
  estimatedTerms: {
    ltv: string;
    rate: string;
    duration: string;
    minInvestment: string;
  };
  status: string;
  createdAt: string;
  propertyAddress?: string;
  dealDescription?: string;
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
  new: 'Submitted',
  contacted: 'In Contact',
  in_review: 'Under Review',
  approved: 'Approved',
  funded: 'Funded',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDealValue = (value: string) => {
  const labels: Record<string, string> = {
    'under-100k': 'Under $100K',
    '100k-250k': '$100K - $250K',
    '250k-500k': '$250K - $500K',
    '500k-1m': '$500K - $1M',
    '1m-5m': '$1M - $5M',
    'over-5m': '$5M+',
  };
  return labels[value] || value;
};

const formatPropertyType = (type: string) => {
  const labels: Record<string, string> = {
    residential: 'Residential',
    multifamily: 'Multifamily',
    commercial: 'Commercial',
    land: 'Land',
    agricultural: 'Agricultural',
  };
  return labels[type] || type;
};

const formatPartnerRole = (role: string) => {
  const labels: Record<string, string> = {
    operator: 'Operator',
    'operator-investor': 'Operator-Investor',
    syndicator: 'Syndicator',
    investor: 'Passive Investor',
  };
  return labels[role] || role;
};

export default function PartnerDashboard() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('partnerEmail') || localStorage.getItem('partner_email');
    const savedToken = localStorage.getItem('partnerToken');
    const savedName = localStorage.getItem('partnerName');
    
    if (savedEmail) {
      setEmail(savedEmail);
      if (savedName) setPartnerName(savedName);
      fetchDeals(savedEmail);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchDeals = async (partnerEmail: string) => {
    try {
      const response = await fetch(`/api/partner/deals?email=${encodeURIComponent(partnerEmail)}`);
      if (response.ok) {
        const data = await response.json();
        setDeals(data.deals || []);
        setAuthenticated(true);
        localStorage.setItem('partnerEmail', partnerEmail);
      } else if (response.status === 404) {
        setDeals([]);
        setAuthenticated(true);
        localStorage.setItem('partnerEmail', partnerEmail);
      } else {
        setAuthError('Unable to access your account. Please login.');
        setAuthenticated(false);
      }
    } catch (error) {
      setAuthError('Failed to fetch deals');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/partner/login');
  };

  const handleLogout = () => {
    localStorage.removeItem('partnerEmail');
    localStorage.removeItem('partner_email');
    localStorage.removeItem('partnerToken');
    localStorage.removeItem('partnerName');
    setAuthenticated(false);
    setDeals([]);
    setEmail('');
    router.push('/partner/login');
  };

  const requestPasswordReset = async () => {
    try {
      const res = await fetch('/api/partner/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setPasswordResetSent(true);
      }
    } catch (err) {
      console.error('Failed to request password reset');
    }
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
          <title>Partner Dashboard | Axiom Protocol</title>
        </Head>
        <div style={{
          minHeight: '100vh',
          background: `linear-gradient(180deg, ${theme.dark} 0%, #0f0f1a 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${theme.border}`,
            borderRadius: 20,
            padding: 40,
            maxWidth: 420,
            width: '100%',
          }}>
            <h1 style={{
              margin: '0 0 8px',
              fontSize: 28,
              fontWeight: 800,
              color: '#fff',
              textAlign: 'center',
            }}>
              Partner Dashboard
            </h1>
            <p style={{
              margin: '0 0 32px',
              color: theme.muted,
              textAlign: 'center',
              fontSize: 15,
            }}>
              Enter your email to view your submitted deals
            </p>

            <form onSubmit={handleLogin}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 16,
                  marginBottom: 16,
                }}
              />

              {authError && (
                <p style={{
                  color: '#ff6b6b',
                  fontSize: 14,
                  margin: '0 0 16px',
                  textAlign: 'center',
                }}>
                  {authError}
                </p>
              )}

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                View My Deals
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Link href="/partner/onboarding" style={{
                color: theme.primary,
                textDecoration: 'none',
                fontSize: 14,
              }}>
                Submit a New Deal →
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Partner Dashboard | Axiom Protocol</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${theme.dark} 0%, #0f0f1a 100%)`,
        color: '#fff',
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '40px 24px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 40,
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>
                Partner Dashboard
              </h1>
              <p style={{ margin: '8px 0 0', color: theme.muted }}>
                {email}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link href="/partner/onboarding" style={{
                padding: '12px 24px',
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600,
              }}>
                + Submit New Deal
              </Link>
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  color: theme.muted,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>⚙️</span> Settings
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 40,
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: theme.primary }}>
                {deals.length}
              </div>
              <div style={{ color: theme.muted, fontSize: 14, marginTop: 4 }}>
                Total Deals
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#F59E0B' }}>
                {deals.filter(d => ['new', 'contacted', 'in_review'].includes(d.status)).length}
              </div>
              <div style={{ color: theme.muted, fontSize: 14, marginTop: 4 }}>
                In Progress
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#10B981' }}>
                {deals.filter(d => ['approved', 'funded'].includes(d.status)).length}
              </div>
              <div style={{ color: theme.muted, fontSize: 14, marginTop: 4 }}>
                Approved/Funded
              </div>
            </div>
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
              <h3 style={{ margin: '0 0 8px', fontSize: 20, color: '#fff' }}>
                No Deals Yet
              </h3>
              <p style={{ margin: '0 0 24px', color: theme.muted }}>
                Submit your first deal to get started
              </p>
              <Link href="/partner/onboarding" style={{
                display: 'inline-block',
                padding: '14px 28px',
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
                borderRadius: 10,
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
              }}>
                Submit a Deal
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => setSelectedDeal(deal)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${theme.border}`,
                    borderRadius: 16,
                    padding: 24,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                          {formatPropertyType(deal.propertyType)} - {formatDealValue(deal.dealValue)}
                        </h3>
                        <span style={{
                          padding: '4px 12px',
                          background: `${statusColors[deal.status]}20`,
                          border: `1px solid ${statusColors[deal.status]}50`,
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          color: statusColors[deal.status],
                        }}>
                          {statusLabels[deal.status] || deal.status}
                        </span>
                      </div>
                      {deal.propertyAddress && (
                        <p style={{ margin: '0 0 8px', color: theme.muted, fontSize: 14 }}>
                          {deal.propertyAddress}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ color: theme.muted, fontSize: 13 }}>
                          <strong style={{ color: '#fff' }}>Role:</strong> {formatPartnerRole(deal.partnerRole)}
                        </span>
                        <span style={{ color: theme.muted, fontSize: 13 }}>
                          <strong style={{ color: '#fff' }}>Product:</strong> {deal.recommendedPrimary}
                        </span>
                        <span style={{ color: theme.muted, fontSize: 13 }}>
                          <strong style={{ color: '#fff' }}>Compliance:</strong> {deal.compliancePath}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: theme.muted, fontSize: 13 }}>
                        Submitted {formatDate(deal.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111',
              border: `1px solid ${theme.border}`,
              borderRadius: 20,
              padding: 32,
              maxWidth: 600,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 24,
            }}>
              <div>
                <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>
                  Deal #{selectedDeal.id}
                </h2>
                <span style={{
                  padding: '4px 12px',
                  background: `${statusColors[selectedDeal.status]}20`,
                  border: `1px solid ${statusColors[selectedDeal.status]}50`,
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  color: statusColors[selectedDeal.status],
                }}>
                  {statusLabels[selectedDeal.status] || selectedDeal.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedDeal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.muted,
                  fontSize: 24,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Property Type</div>
                <div style={{ fontWeight: 600 }}>{formatPropertyType(selectedDeal.propertyType)}</div>
              </div>
              <div>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Deal Value</div>
                <div style={{ fontWeight: 600 }}>{formatDealValue(selectedDeal.dealValue)}</div>
              </div>
              <div>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Exit Strategy</div>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedDeal.exitStrategy.replace('-', ' ')}</div>
              </div>
              <div>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Partner Role</div>
                <div style={{ fontWeight: 600 }}>{formatPartnerRole(selectedDeal.partnerRole)}</div>
              </div>
            </div>

            <div style={{
              background: `${theme.primary}10`,
              border: `1px solid ${theme.primary}30`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
            }}>
              <h4 style={{ margin: '0 0 12px', color: theme.primary, fontSize: 14 }}>
                Your Recommended Capital Stack
              </h4>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Primary Product</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedDeal.recommendedPrimary}</div>
              </div>
              {selectedDeal.recommendedSecondary && selectedDeal.recommendedSecondary.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: theme.muted, fontSize: 12, marginBottom: 6 }}>Secondary Layers</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedDeal.recommendedSecondary.map((layer, i) => (
                      <span key={i} style={{
                        padding: '6px 12px',
                        background: `${theme.secondary}20`,
                        border: `1px solid ${theme.secondary}40`,
                        borderRadius: 20,
                        fontSize: 13,
                        color: theme.secondary,
                        fontWeight: 500,
                      }}>
                        {layer}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedDeal.recommendedProtection && selectedDeal.recommendedProtection.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: theme.muted, fontSize: 12, marginBottom: 6 }}>Protection Layers</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedDeal.recommendedProtection.map((protection, i) => (
                      <span key={i} style={{
                        padding: '6px 12px',
                        background: `${theme.accent}20`,
                        border: `1px solid ${theme.accent}40`,
                        borderRadius: 20,
                        fontSize: 13,
                        color: theme.accent,
                        fontWeight: 500,
                      }}>
                        {protection}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedDeal.estimatedTerms && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: 12, 
                  marginBottom: 16,
                  padding: 12,
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 8,
                }}>
                  {selectedDeal.estimatedTerms.ltv && (
                    <div>
                      <div style={{ color: theme.muted, fontSize: 11 }}>LTV</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedDeal.estimatedTerms.ltv}</div>
                    </div>
                  )}
                  {selectedDeal.estimatedTerms.rate && (
                    <div>
                      <div style={{ color: theme.muted, fontSize: 11 }}>Rate</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedDeal.estimatedTerms.rate}</div>
                    </div>
                  )}
                  {selectedDeal.estimatedTerms.duration && (
                    <div>
                      <div style={{ color: theme.muted, fontSize: 11 }}>Duration</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedDeal.estimatedTerms.duration}</div>
                    </div>
                  )}
                  {selectedDeal.estimatedTerms.minInvestment && (
                    <div>
                      <div style={{ color: theme.muted, fontSize: 11 }}>Min Investment</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedDeal.estimatedTerms.minInvestment}</div>
                    </div>
                  )}
                </div>
              )}
              <div>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Compliance Path</div>
                <div style={{ fontWeight: 600 }}>{selectedDeal.compliancePath}</div>
              </div>
            </div>

            {selectedDeal.partnerRole === 'syndicator' && (
              <div style={{
                background: `${theme.secondary}10`,
                border: `1px solid ${theme.secondary}30`,
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
              }}>
                <h4 style={{ margin: '0 0 8px', color: theme.secondary, fontSize: 14 }}>
                  Syndicator Tools
                </h4>
                <p style={{ margin: '0 0 12px', color: theme.muted, fontSize: 14, lineHeight: 1.5 }}>
                  As a syndicator, you'll receive access to our white-label investor portal for managing your syndication.
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#fff', fontSize: 14, lineHeight: 1.8 }}>
                  <li>Custom-branded investor portal</li>
                  <li>Investor management dashboard</li>
                  <li>Automated distribution tracking</li>
                  <li>K-1 document generation</li>
                </ul>
              </div>
            )}

            {selectedDeal.partnerRole === 'operator-investor' && (
              <div style={{
                background: `${theme.accent}10`,
                border: `1px solid ${theme.accent}30`,
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
              }}>
                <h4 style={{ margin: '0 0 8px', color: theme.accent, fontSize: 14 }}>
                  Co-Investment Participation
                </h4>
                <p style={{ margin: '0 0 12px', color: theme.muted, fontSize: 14, lineHeight: 1.5 }}>
                  As an operator-investor, you'll have co-investment participation alongside Axiom capital.
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#fff', fontSize: 14, lineHeight: 1.8 }}>
                  <li>Preferred equity position</li>
                  <li>Pro-rata profit sharing</li>
                  <li>Skin-in-the-game alignment</li>
                  <li>Operator fee structure</li>
                </ul>
              </div>
            )}

            {selectedDeal.dealDescription && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Deal Notes</div>
                <div style={{ color: '#fff', lineHeight: 1.6 }}>{selectedDeal.dealDescription}</div>
              </div>
            )}

            <div style={{ color: theme.muted, fontSize: 13 }}>
              Submitted on {formatDate(selectedDeal.createdAt)}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }}
          onClick={() => setShowSettings(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111',
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 32,
              maxWidth: 420,
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: '#fff' }}>
                Account Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.muted,
                  fontSize: 24,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}>
              <div style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>Email</div>
              <div style={{ color: '#fff', fontSize: 16 }}>{email}</div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
            }}>
              <div style={{ color: theme.muted, fontSize: 12, marginBottom: 8 }}>Password</div>
              {passwordResetSent ? (
                <div style={{ color: theme.primary, fontSize: 14 }}>
                  Password reset link sent to your email!
                </div>
              ) : (
                <button
                  onClick={requestPasswordReset}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: `1px solid ${theme.primary}`,
                    borderRadius: 8,
                    color: theme.primary,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Change Password
                </button>
              )}
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                color: '#EF4444',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
