import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface KYCVerification {
  id: string;
  userId: string;
  walletAddress: string;
  status: 'not_started' | 'pending' | 'verified' | 'rejected' | 'expired';
  level: number;
  submittedAt: string;
  verifiedAt?: string;
  expiresAt?: string;
  amlScore: number;
  riskLevel: string;
}

interface RegulatoryLimit {
  id: string;
  name: string;
  description: string;
  limit: number;
  period: string;
  currentUsage: number;
  appliesTo: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  resource: string;
  details: Record<string, any>;
}

export default function CompliancePage() {
  const { walletState } = useWallet();
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<KYCVerification | null>(null);
  const [limits, setLimits] = useState<RegulatoryLimit[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'kyc' | 'limits' | 'audit'>('kyc');

  useEffect(() => {
    loadData();
  }, [walletState.address]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kycRes, auditRes] = await Promise.all([
        fetch(`/api/compliance/kyc${walletState.address ? `?walletAddress=${walletState.address}` : ''}`),
        fetch('/api/compliance/audit?limit=50')
      ]);

      if (kycRes.ok) {
        const data = await kycRes.json();
        if (data.success) {
          setVerification(data.verification);
          setLimits(data.limits || []);
        }
      }

      if (auditRes.ok) {
        const data = await auditRes.json();
        if (data.success) {
          setAuditEntries(data.entries || []);
        }
      }
    } catch (err) {
      console.error('Error loading compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      verified: '#10B981',
      pending: '#F59E0B',
      rejected: '#EF4444',
      expired: '#6B7280',
      not_started: '#3B82F6'
    };
    return colors[status] || '#6B7280';
  };

  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      blocked: '#991B1B'
    };
    return colors[risk] || '#6B7280';
  };

  return (
    <>
      <Head>
        <title>Compliance | Axiom</title>
        <meta name="description" content="KYC/AML verification and compliance management" />
      </Head>
      <Layout>
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
            color: 'white',
            padding: '48px 24px'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
                Compliance Center
              </h1>
              <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '24px' }}>
                KYC/AML verification and regulatory compliance
              </p>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>KYC Status</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, textTransform: 'capitalize' }}>
                    {verification?.status || 'Not Started'}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>Verification Level</div>
                  <div style={{ fontSize: '20px', fontWeight: 700 }}>
                    Level {verification?.level || 0}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>Risk Level</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, textTransform: 'capitalize' }}>
                    {verification?.riskLevel || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
              {(['kyc', 'limits', 'audit'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: activeTab === tab ? '#1E40AF' : 'white',
                    color: activeTab === tab ? 'white' : '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  {tab === 'kyc' ? 'KYC Verification' : tab === 'limits' ? 'Limits' : 'Audit Log'}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>
            ) : (
              <>
                {activeTab === 'kyc' && (
                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {verification ? (
                      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                          <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: `${getStatusColor(verification.status)}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            fontSize: '32px'
                          }}>
                            {verification.status === 'verified' ? '✓' : verification.status === 'pending' ? '⏳' : '!'}
                          </div>
                          <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>
                            {verification.status}
                          </h3>
                          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Level {verification.level} Verification</p>
                        </div>

                        <div style={{ display: 'grid', gap: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E5E7EB' }}>
                            <span style={{ color: '#6B7280' }}>AML Score</span>
                            <span style={{ fontWeight: 600 }}>{verification.amlScore}/100</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E5E7EB' }}>
                            <span style={{ color: '#6B7280' }}>Risk Level</span>
                            <span style={{ fontWeight: 600, color: getRiskColor(verification.riskLevel), textTransform: 'capitalize' }}>
                              {verification.riskLevel}
                            </span>
                          </div>
                          {verification.expiresAt && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                              <span style={{ color: '#6B7280' }}>Expires</span>
                              <span style={{ fontWeight: 600 }}>{new Date(verification.expiresAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'white', borderRadius: '20px', padding: '48px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Start KYC Verification</h3>
                        <p style={{ color: '#6B7280', marginBottom: '24px' }}>Complete verification to unlock higher transaction limits</p>
                        <button style={{
                          padding: '14px 32px',
                          background: '#1E40AF',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}>
                          Begin Verification
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'limits' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {limits.map(limit => (
                      <div key={limit.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>{limit.name}</h3>
                            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>{limit.description}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '24px', fontWeight: 700 }}>
                              {limit.limit === -1 ? 'Unlimited' : `$${limit.limit.toLocaleString()}`}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'capitalize' }}>{limit.period}</div>
                          </div>
                        </div>
                        {limit.limit !== -1 && (
                          <div style={{ marginTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                              <span style={{ color: '#6B7280' }}>Usage</span>
                              <span>${limit.currentUsage.toLocaleString()} / ${limit.limit.toLocaleString()}</span>
                            </div>
                            <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(limit.currentUsage / limit.limit) * 100}%`, background: '#1E40AF', borderRadius: '4px' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'audit' && (
                  <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Audit Trail</h3>
                    {auditEntries.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {auditEntries.slice(0, 20).map(entry => (
                          <div key={entry.id} style={{ padding: '12px', background: '#F9FAFB', borderRadius: '8px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 600 }}>{entry.action}</span>
                              <span style={{ color: '#6B7280', fontSize: '12px' }}>{new Date(entry.timestamp).toLocaleString()}</span>
                            </div>
                            <div style={{ color: '#6B7280', fontSize: '12px' }}>
                              {entry.actor} | {entry.resource}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#9CA3AF', textAlign: 'center' }}>No audit entries yet</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
