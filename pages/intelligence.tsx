import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
}

interface ProgramMetrics {
  programId: string;
  programName: string;
  participants: number;
  totalValue: number;
  activeTransactions: number;
  growthRate: number;
}

interface Alert {
  id: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export default function IntelligenceDashboard() {
  const { walletState } = useWallet();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [programs, setPrograms] = useState<ProgramMetrics[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'programs' | 'alerts' | 'trends'>('overview');
  const [selectedMetric, setSelectedMetric] = useState<string>('tvl');
  const [historicalData, setHistoricalData] = useState<{ timestamp: string; value: number }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadHistoricalData(selectedMetric);
  }, [selectedMetric]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [metricsRes, programsRes, alertsRes] = await Promise.all([
        fetch('/api/analytics/overview'),
        fetch('/api/analytics/programs'),
        fetch('/api/analytics/alerts')
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        if (data.success) setMetrics(data.metrics);
      }

      if (programsRes.ok) {
        const data = await programsRes.json();
        if (data.success) setPrograms(data.programs);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        if (data.success) setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Error loading intelligence data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalData = async (metric: string) => {
    try {
      const res = await fetch(`/api/analytics/historical?metric=${metric}&days=30`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setHistoricalData(data.data || []);
      }
    } catch (err) {
      console.error('Error loading historical data:', err);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/analytics/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', alertId })
      });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const formatValue = (metric: AnalyticsMetric) => {
    if (metric.id === 'tvl' || metric.id.includes('Value')) {
      return `$${(metric.value / 1000000).toFixed(2)}M`;
    }
    if (metric.id === 'axmPrice') {
      return `$${metric.value.toFixed(2)}`;
    }
    if (metric.id === 'gasUsed') {
      return `${metric.value.toFixed(2)} ETH`;
    }
    return metric.value.toLocaleString();
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendColor = (trend: string, isPositive: boolean = true) => {
    if (trend === 'up') return isPositive ? '#10B981' : '#EF4444';
    if (trend === 'down') return isPositive ? '#EF4444' : '#10B981';
    return '#6B7280';
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      info: '#3B82F6',
      warning: '#F59E0B',
      critical: '#EF4444'
    };
    return colors[severity] || '#6B7280';
  };

  const maxHistoricalValue = Math.max(...historicalData.map(d => d.value), 1);

  return (
    <>
      <Head>
        <title>Intelligence Platform | Axiom</title>
        <meta name="description" content="Real-time analytics and intelligence platform" />
      </Head>
      <Layout>
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
            color: 'white',
            padding: '48px 24px'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
                    Intelligence Platform
                  </h1>
                  <p style={{ fontSize: '16px', opacity: 0.9 }}>
                    Real-time analytics, metrics, and alerts across all Axiom programs
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '12px 16px'
                }}>
                  <div style={{ width: '12px', height: '12px', background: '#10B981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                  <span>Live Data</span>
                  <button
                    onClick={loadData}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {(['overview', 'programs', 'alerts', 'trends'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: activeTab === tab ? '#1E3A8A' : 'white',
                    color: activeTab === tab ? 'white' : '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  {tab === 'alerts' && alerts.length > 0 && (
                    <span style={{
                      background: '#EF4444',
                      color: 'white',
                      borderRadius: '50%',
                      padding: '2px 6px',
                      fontSize: '12px',
                      marginRight: '8px'
                    }}>
                      {alerts.length}
                    </span>
                  )}
                  {tab}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ fontSize: '24px', marginBottom: '16px' }}>Loading...</div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {metrics.map(metric => (
                      <div
                        key={metric.id}
                        style={{
                          background: 'white',
                          borderRadius: '16px',
                          padding: '24px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          border: selectedMetric === metric.id ? '2px solid #1E3A8A' : '2px solid transparent'
                        }}
                        onClick={() => setSelectedMetric(metric.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <span style={{ fontSize: '14px', color: '#6B7280' }}>{metric.name}</span>
                          <span style={{
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            background: `${getTrendColor(metric.trend)}15`,
                            color: getTrendColor(metric.trend)
                          }}>
                            {getTrendIcon(metric.trend)} {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
                          </span>
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937' }}>
                          {formatValue(metric)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
                          vs. last {metric.period}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'programs' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {programs.map(program => (
                      <div
                        key={program.programId}
                        style={{
                          background: 'white',
                          borderRadius: '16px',
                          padding: '24px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{program.programName}</h3>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            background: '#DCFCE7',
                            color: '#166534',
                            fontSize: '14px',
                            fontWeight: 500
                          }}>
                            +{program.growthRate.toFixed(1)}% growth
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Participants</div>
                            <div style={{ fontSize: '20px', fontWeight: 600 }}>{program.participants.toLocaleString()}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total Value</div>
                            <div style={{ fontSize: '20px', fontWeight: 600 }}>${(program.totalValue / 1000).toFixed(0)}K</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Active Txns</div>
                            <div style={{ fontSize: '20px', fontWeight: 600 }}>{program.activeTransactions}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Growth Rate</div>
                            <div style={{ fontSize: '20px', fontWeight: 600, color: '#10B981' }}>+{program.growthRate}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'alerts' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {alerts.length === 0 ? (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '60px 20px',
                        background: 'white',
                        borderRadius: '16px'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>No Active Alerts</h3>
                        <p style={{ color: '#6B7280' }}>All systems operating normally</p>
                      </div>
                    ) : (
                      alerts.map(alert => (
                        <div
                          key={alert.id}
                          style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '16px',
                            borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: `${getSeverityColor(alert.severity)}20`,
                                color: getSeverityColor(alert.severity),
                                fontSize: '12px',
                                fontWeight: 600,
                                textTransform: 'uppercase'
                              }}>
                                {alert.severity}
                              </span>
                              <span style={{ fontWeight: 600 }}>{alert.ruleName}</span>
                            </div>
                            <div style={{ fontSize: '14px', color: '#6B7280' }}>{alert.message}</div>
                            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                              {new Date(alert.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              border: '1px solid #D1D5DB',
                              background: 'white',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Acknowledge
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'trends' && (
                  <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Historical Trends</h3>
                      <select
                        value={selectedMetric}
                        onChange={(e) => setSelectedMetric(e.target.value)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: '1px solid #D1D5DB',
                          fontSize: '14px'
                        }}
                      >
                        <option value="tvl">Total Value Locked</option>
                        <option value="users">Total Users</option>
                        <option value="transactions">Daily Transactions</option>
                        <option value="axmPrice">AXM Price</option>
                      </select>
                    </div>
                    
                    <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '4px', padding: '20px 0' }}>
                      {historicalData.map((point, idx) => (
                        <div
                          key={idx}
                          style={{
                            flex: 1,
                            background: 'linear-gradient(180deg, #3B82F6 0%, #1E3A8A 100%)',
                            borderRadius: '4px 4px 0 0',
                            height: `${(point.value / maxHistoricalValue) * 100}%`,
                            minHeight: '4px',
                            position: 'relative'
                          }}
                          title={`${point.timestamp}: ${point.value.toLocaleString()}`}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280' }}>
                      <span>{historicalData[0]?.timestamp || ''}</span>
                      <span>{historicalData[historicalData.length - 1]?.timestamp || ''}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Layout>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}
