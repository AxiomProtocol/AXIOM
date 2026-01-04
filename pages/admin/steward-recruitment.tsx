import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { SiteLayout } from '../../components/navigation';
import { web3Theme } from '../../components/axiomRebuild/styles/web3Theme';

interface StewardInterest {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  region: string;
  city: string | null;
  state: string | null;
  motivation: string | null;
  source: string | null;
  status: string;
  contactedAt: string | null;
  convertedToApplicant: boolean;
  notes: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  newCount: number;
  contactedCount: number;
  convertedCount: number;
}

interface RegionCount {
  region: string;
  count: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: '#DBEAFE', text: '#1D4ED8' },
  contacted: { bg: '#FEF3C7', text: '#D97706' },
  qualified: { bg: '#D1FAE5', text: '#059669' },
  declined: { bg: '#FEE2E2', text: '#DC2626' }
};

const REGION_LABELS: Record<string, string> = {
  atlanta: 'Atlanta Metro',
  houston: 'Houston Area',
  chicago: 'Chicago Region',
  brooklyn: 'Brooklyn/NYC',
  la: 'Los Angeles',
  miami: 'Miami/South FL',
  dallas: 'Dallas/DFW',
  detroit: 'Detroit',
  philly: 'Philadelphia',
  dc: 'Washington DC',
  other: 'Other Region'
};

export default function StewardRecruitmentDashboard() {
  const [signups, setSignups] = useState<StewardInterest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [byRegion, setByRegion] = useState<RegionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'qualified'>('all');
  const [selectedSignup, setSelectedSignup] = useState<StewardInterest | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const adminToken = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/stewards/interest', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSignups(data.signups);
        setStats(data.stats);
        setByRegion(data.byRegion);
      } else if (res.status === 401) {
        const token = prompt('Enter admin token to access this dashboard:');
        if (token) {
          localStorage.setItem('admin_token', token);
          fetchData();
        }
      }
    } catch (err) {
      console.error('Failed to fetch recruitment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const adminToken = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/stewards/interest', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredSignups = signups.filter(s => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const targetStewards = 250;
  const progressPercent = stats ? Math.min((stats.total / targetStewards) * 100, 100) : 0;

  if (loading) {
    return (
      <SiteLayout>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>Loading...</div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <Head>
        <title>Steward Recruitment Tracker | Admin</title>
      </Head>

      <main style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
              Steward Recruitment Tracker
            </h1>
            <p style={{ fontSize: '16px', color: '#6B7280' }}>
              Track progress toward 250 stewards in 90 days
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: '#FFFFFF',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Signups</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#1F2937' }}>{stats?.total || 0}</div>
              <div style={{ marginTop: '12px' }}>
                <div style={{
                  height: '8px',
                  background: '#E5E7EB',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #00D4AA 0%, #7B68EE 100%)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                  {stats?.total || 0} / 250 ({progressPercent.toFixed(0)}%)
                </div>
              </div>
            </div>

            <div style={{
              background: '#FFFFFF',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>New (Uncontacted)</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#1D4ED8' }}>{stats?.newCount || 0}</div>
            </div>

            <div style={{
              background: '#FFFFFF',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Contacted</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#D97706' }}>{stats?.contactedCount || 0}</div>
            </div>

            <div style={{
              background: '#FFFFFF',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Converted</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#059669' }}>{stats?.convertedCount || 0}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                  Interest Signups ({filteredSignups.length})
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['all', 'new', 'contacted', 'qualified'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: filter === f ? '#1F2937' : '#F3F4F6',
                        color: filter === f ? '#FFFFFF' : '#6B7280',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                {filteredSignups.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF' }}>
                    No signups yet. Share the recruitment page to get started!
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Region</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Date</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSignups.map(signup => (
                        <tr 
                          key={signup.id} 
                          style={{ borderBottom: '1px solid #E5E7EB', cursor: 'pointer' }}
                          onClick={() => setSelectedSignup(signup)}
                        >
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 500, color: '#1F2937' }}>{signup.name}</div>
                            <div style={{ fontSize: '13px', color: '#6B7280' }}>{signup.email}</div>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: '#4B5563' }}>
                            {REGION_LABELS[signup.region] || signup.region}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 500,
                              background: STATUS_COLORS[signup.status]?.bg || '#F3F4F6',
                              color: STATUS_COLORS[signup.status]?.text || '#6B7280'
                            }}>
                              {signup.status}
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontSize: '13px', color: '#6B7280' }}>
                            {new Date(signup.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <select
                              value={signup.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateStatus(signup.id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB',
                                fontSize: '13px',
                                background: '#FFFFFF'
                              }}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="qualified">Qualified</option>
                              <option value="declined">Declined</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div>
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '16px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>
                  By Region
                </h3>
                {byRegion.length === 0 ? (
                  <div style={{ color: '#9CA3AF', fontSize: '14px' }}>No data yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {byRegion.map(r => (
                      <div key={r.region} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: '#4B5563' }}>
                          {REGION_LABELS[r.region] || r.region}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          background: '#F3F4F6',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: '#1F2937'
                        }}>
                          {r.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>
                  Quick Actions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <a
                    href="/stewards/recruit"
                    target="_blank"
                    style={{
                      display: 'block',
                      padding: '12px 16px',
                      background: '#F3F4F6',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: '#1F2937',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    View Recruitment Page →
                  </a>
                  <a
                    href="/stewards/social-templates"
                    style={{
                      display: 'block',
                      padding: '12px 16px',
                      background: '#F3F4F6',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: '#1F2937',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    Social Content Templates →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {selectedSignup && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              zIndex: 1000
            }} onClick={() => setSelectedSignup(null)}>
              <div style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '32px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto'
              }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                    {selectedSignup.name}
                  </h2>
                  <button
                    onClick={() => setSelectedSignup(null)}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Email</div>
                    <div style={{ fontSize: '15px', color: '#1F2937' }}>{selectedSignup.email}</div>
                  </div>
                  {selectedSignup.phone && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Phone</div>
                      <div style={{ fontSize: '15px', color: '#1F2937' }}>{selectedSignup.phone}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Region</div>
                    <div style={{ fontSize: '15px', color: '#1F2937' }}>
                      {REGION_LABELS[selectedSignup.region] || selectedSignup.region}
                      {selectedSignup.city && ` - ${selectedSignup.city}`}
                      {selectedSignup.state && `, ${selectedSignup.state}`}
                    </div>
                  </div>
                  {selectedSignup.motivation && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Motivation</div>
                      <div style={{ fontSize: '15px', color: '#1F2937', lineHeight: 1.6 }}>{selectedSignup.motivation}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Signed Up</div>
                    <div style={{ fontSize: '15px', color: '#1F2937' }}>
                      {new Date(selectedSignup.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                  <a
                    href={`mailto:${selectedSignup.email}?subject=Axiom Steward Corps - Next Steps`}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: web3Theme.colors.primary,
                      color: '#FFFFFF',
                      textAlign: 'center',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    Send Email
                  </a>
                  <button
                    onClick={() => {
                      updateStatus(selectedSignup.id, 'contacted');
                      setSelectedSignup(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#F3F4F6',
                      color: '#1F2937',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Mark Contacted
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </SiteLayout>
  );
}
