import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface SecurityEvent {
  id: string;
  type: 'auth' | 'transaction' | 'contract' | 'anomaly' | 'system';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  details: Record<string, any>;
}

interface ContractStatus {
  name: string;
  address: string;
  status: 'healthy' | 'warning' | 'paused';
  lastActivity: string;
  tvl: number;
  pendingUpgrade: boolean;
}

interface SecurityMetrics {
  totalEvents24h: number;
  criticalEvents: number;
  resolvedEvents: number;
  activeMonitors: number;
  lastScan: string;
}

export default function SecurityDashboard() {
  const { walletState } = useWallet();
  
  const [events, setEvents] = useState<SecurityEvent[]>([
    {
      id: '1',
      type: 'auth',
      severity: 'info',
      title: 'Admin Login',
      description: 'Successful admin authentication from authorized IP',
      timestamp: '2026-01-10T12:30:00Z',
      resolved: true,
      details: { ip: '192.168.1.xxx', location: 'US' }
    },
    {
      id: '2',
      type: 'transaction',
      severity: 'warning',
      title: 'Large Transaction Detected',
      description: 'Transaction exceeding $5,000 threshold detected',
      timestamp: '2026-01-10T11:45:00Z',
      resolved: true,
      details: { amount: 7500, token: 'AXUSD' }
    },
    {
      id: '3',
      type: 'contract',
      severity: 'info',
      title: 'Contract Upgrade Scheduled',
      description: 'SEED contract upgrade queued with 48h timelock',
      timestamp: '2026-01-10T10:00:00Z',
      resolved: false,
      details: { contract: 'SEED', newVersion: '2.1.0' }
    },
    {
      id: '4',
      type: 'anomaly',
      severity: 'warning',
      title: 'Unusual Activity Pattern',
      description: 'Higher than normal transaction volume detected',
      timestamp: '2026-01-09T22:15:00Z',
      resolved: true,
      details: { normalVolume: 50, detectedVolume: 127 }
    }
  ]);
  
  const [contracts, setContracts] = useState<ContractStatus[]>([
    {
      name: 'AXM Token',
      address: '0x1234...5678',
      status: 'healthy',
      lastActivity: '2 min ago',
      tvl: 850000,
      pendingUpgrade: false
    },
    {
      name: 'SEED Staking',
      address: '0x2345...6789',
      status: 'healthy',
      lastActivity: '15 min ago',
      tvl: 425000,
      pendingUpgrade: true
    },
    {
      name: 'SUSU Pool',
      address: '0x3456...7890',
      status: 'healthy',
      lastActivity: '1 hour ago',
      tvl: 180000,
      pendingUpgrade: false
    },
    {
      name: 'Land Registry',
      address: '0x4567...8901',
      status: 'healthy',
      lastActivity: '3 hours ago',
      tvl: 320000,
      pendingUpgrade: false
    }
  ]);
  
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents24h: 47,
    criticalEvents: 0,
    resolvedEvents: 45,
    activeMonitors: 12,
    lastScan: '2 min ago'
  });
  
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'contracts' | 'monitors'>('overview');
  const [eventFilter, setEventFilter] = useState<string>('all');

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      healthy: '#10B981',
      warning: '#F59E0B',
      paused: '#6B7280',
      critical: '#EF4444'
    };
    return colors[status] || '#6B7280';
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      info: '#3B82F6',
      warning: '#F59E0B',
      critical: '#EF4444'
    };
    return colors[severity] || '#6B7280';
  };

  const filteredEvents = events.filter(event => {
    if (eventFilter === 'all') return true;
    if (eventFilter === 'unresolved') return !event.resolved;
    return event.type === eventFilter;
  });

  return (
    <>
      <Head>
        <title>Security Dashboard | Axiom</title>
        <meta name="description" content="Monitor security events and smart contract status" />
      </Head>
      <Layout>
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)',
            color: 'white',
            padding: '48px 24px'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
                    Security Dashboard
                  </h1>
                  <p style={{ fontSize: '16px', opacity: 0.9 }}>
                    Monitor security events, smart contracts, and system health.
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 20px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: metrics.criticalEvents === 0 ? '#10B981' : '#EF4444',
                    animation: 'pulse 2s infinite'
                  }} />
                  <span>
                    {metrics.criticalEvents === 0 ? 'All Systems Operational' : `${metrics.criticalEvents} Critical Alerts`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
              {['overview', 'events', 'contracts', 'monitors'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  style={{
                    padding: '10px 20px',
                    background: activeTab === tab ? '#1F2937' : 'white',
                    color: activeTab === tab ? 'white' : '#374151',
                    border: '1px solid #E5E7EB',
                    borderRadius: '24px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #E5E7EB'
                  }}>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Events (24h)</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937' }}>{metrics.totalEvents24h}</div>
                  </div>
                  <div style={{
                    background: metrics.criticalEvents > 0 ? '#FEF2F2' : 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: `1px solid ${metrics.criticalEvents > 0 ? '#FECACA' : '#E5E7EB'}`
                  }}>
                    <div style={{ fontSize: '13px', color: metrics.criticalEvents > 0 ? '#B91C1C' : '#6B7280', marginBottom: '8px' }}>Critical</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: metrics.criticalEvents > 0 ? '#DC2626' : '#10B981' }}>{metrics.criticalEvents}</div>
                  </div>
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #E5E7EB'
                  }}>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Resolved</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#10B981' }}>{metrics.resolvedEvents}</div>
                  </div>
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #E5E7EB'
                  }}>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Active Monitors</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#3B82F6' }}>{metrics.activeMonitors}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #E5E7EB'
                  }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                      Contract Status
                    </h3>
                    {contracts.map(contract => (
                      <div 
                        key={contract.address}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 0',
                          borderBottom: '1px solid #F3F4F6'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: getStatusColor(contract.status)
                          }} />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{contract.name}</div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{contract.address}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>${(contract.tvl / 1000).toFixed(0)}K</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{contract.lastActivity}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #E5E7EB'
                  }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                      Recent Events
                    </h3>
                    {events.slice(0, 4).map(event => (
                      <div 
                        key={event.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px',
                          background: '#F9FAFB',
                          borderRadius: '10px',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: getSeverityColor(event.severity),
                          marginTop: '6px',
                          flexShrink: 0
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>{event.title}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                        {event.resolved && (
                          <span style={{ color: '#10B981', fontSize: '12px' }}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {['all', 'unresolved', 'auth', 'transaction', 'contract', 'anomaly'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setEventFilter(filter)}
                      style={{
                        padding: '8px 16px',
                        background: eventFilter === filter ? '#3B82F6' : 'white',
                        color: eventFilter === filter ? 'white' : '#374151',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredEvents.map(event => (
                    <div
                      key={event.id}
                      style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        border: `2px solid ${getSeverityColor(event.severity)}30`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: getSeverityColor(event.severity)
                          }} />
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{event.title}</h4>
                            <span style={{
                              padding: '4px 8px',
                              background: '#F3F4F6',
                              borderRadius: '4px',
                              fontSize: '11px',
                              textTransform: 'uppercase'
                            }}>
                              {event.type}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', color: '#6B7280' }}>
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                          {event.resolved ? (
                            <span style={{ fontSize: '12px', color: '#10B981' }}>Resolved</span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#F59E0B' }}>Open</span>
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>{event.description}</p>
                      <div style={{
                        background: '#F9FAFB',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '13px'
                      }}>
                        <strong>Details:</strong>{' '}
                        {Object.entries(event.details).map(([key, value]) => (
                          <span key={key} style={{ marginRight: '12px' }}>
                            {key}: <code style={{ background: '#E5E7EB', padding: '2px 6px', borderRadius: '4px' }}>{String(value)}</code>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'contracts' && (
              <div style={{ display: 'grid', gap: '16px' }}>
                {contracts.map(contract => (
                  <div
                    key={contract.address}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '1px solid #E5E7EB'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: `${getStatusColor(contract.status)}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px'
                        }}>
                          📄
                        </div>
                        <div>
                          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{contract.name}</h4>
                          <code style={{ fontSize: '13px', color: '#6B7280' }}>{contract.address}</code>
                        </div>
                      </div>
                      <div style={{
                        padding: '8px 16px',
                        background: `${getStatusColor(contract.status)}20`,
                        color: getStatusColor(contract.status),
                        borderRadius: '24px',
                        fontSize: '14px',
                        fontWeight: 500,
                        textTransform: 'capitalize'
                      }}>
                        {contract.status}
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                      <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>TVL</div>
                        <div style={{ fontSize: '18px', fontWeight: 600 }}>${(contract.tvl / 1000).toFixed(0)}K</div>
                      </div>
                      <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Last Activity</div>
                        <div style={{ fontSize: '18px', fontWeight: 600 }}>{contract.lastActivity}</div>
                      </div>
                      <div style={{ background: contract.pendingUpgrade ? '#FEF3C7' : '#F9FAFB', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ fontSize: '12px', color: contract.pendingUpgrade ? '#92400E' : '#6B7280', marginBottom: '4px' }}>Upgrade</div>
                        <div style={{ fontSize: '18px', fontWeight: 600, color: contract.pendingUpgrade ? '#D97706' : '#1F2937' }}>
                          {contract.pendingUpgrade ? 'Pending' : 'None'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'monitors' && (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '32px',
                border: '1px solid #E5E7EB',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
                <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Security Monitors Active</h3>
                <p style={{ fontSize: '16px', color: '#6B7280', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
                  {metrics.activeMonitors} monitors are actively scanning for anomalies, unauthorized access attempts, and suspicious transactions.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  {[
                    { name: 'Rate Limiting', status: 'active' },
                    { name: 'Anomaly Detection', status: 'active' },
                    { name: 'Transaction Monitoring', status: 'active' },
                    { name: 'Contract Watching', status: 'active' },
                    { name: 'Auth Tracking', status: 'active' },
                    { name: 'IP Filtering', status: 'active' }
                  ].map(monitor => (
                    <div
                      key={monitor.name}
                      style={{
                        padding: '12px 20px',
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#10B981'
                      }} />
                      <span style={{ fontSize: '14px', color: '#166534' }}>{monitor.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
