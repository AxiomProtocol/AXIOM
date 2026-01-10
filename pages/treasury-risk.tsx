import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface TreasuryMetrics {
  totalValueLocked: number;
  utilizationRate: number;
  diversificationScore: number;
  liquidityRatio: number;
  collateralRatio: number;
  reserveRatio: number;
}

interface RiskIndicator {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: number;
  threshold: { warning: number; critical: number };
  description: string;
}

interface StressScenario {
  id: string;
  name: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  projectedLoss: number;
  probability: number;
  mitigation: string;
}

interface AlertItem {
  id: string;
  type: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export default function TreasuryRiskDashboard() {
  const { walletState } = useWallet();
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState<TreasuryMetrics>({
    totalValueLocked: 1245000,
    utilizationRate: 68,
    diversificationScore: 75,
    liquidityRatio: 85,
    collateralRatio: 156,
    reserveRatio: 22
  });
  
  const [riskIndicators, setRiskIndicators] = useState<RiskIndicator[]>([
    { id: 'collateral', name: 'Collateral Ratio', status: 'healthy', value: 156, threshold: { warning: 130, critical: 110 }, description: 'Ratio of collateral to borrowed assets' },
    { id: 'liquidity', name: 'Liquidity Score', status: 'healthy', value: 85, threshold: { warning: 60, critical: 40 }, description: 'Available liquidity for withdrawals' },
    { id: 'utilization', name: 'Utilization Rate', status: 'healthy', value: 68, threshold: { warning: 75, critical: 85 }, description: 'Percentage of treasury in active use' }
  ]);

  useEffect(() => {
    loadTreasuryMetrics();
  }, []);

  const loadTreasuryMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/treasury/metrics');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetrics(data.metrics);
          setRiskIndicators(data.riskIndicators.map((ri: any) => ({
            ...ri,
            description: getIndicatorDescription(ri.id)
          })));
        }
      }
    } catch (err) {
      console.log('Using default treasury metrics');
      setMetrics({
        totalValueLocked: 1245000,
        utilizationRate: 68,
        diversificationScore: 75,
        liquidityRatio: 85,
        collateralRatio: 156,
        reserveRatio: 22
      });
      setRiskIndicators([
        { id: 'collateral', name: 'Collateral Ratio', status: 'healthy', value: 156, threshold: { warning: 130, critical: 110 }, description: 'Ratio of collateral to borrowed assets' },
        { id: 'liquidity', name: 'Liquidity Score', status: 'healthy', value: 85, threshold: { warning: 60, critical: 40 }, description: 'Available liquidity for withdrawals' },
        { id: 'utilization', name: 'Utilization Rate', status: 'healthy', value: 68, threshold: { warning: 75, critical: 85 }, description: 'Percentage of treasury in active use' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getIndicatorDescription = (id: string): string => {
    const descriptions: Record<string, string> = {
      collateral: 'Ratio of collateral to borrowed assets',
      liquidity: 'Available liquidity for withdrawals',
      utilization: 'Percentage of treasury in active use',
      concentration: 'Asset concentration in single positions',
      volatility: '30-day rolling volatility'
    };
    return descriptions[id] || 'Risk metric';
  };
  
  const [stressScenarios, setStressScenarios] = useState<StressScenario[]>([
    {
      id: '1',
      name: 'Market Crash (-30%)',
      description: 'Simulates a 30% market-wide decline',
      impact: 'high',
      projectedLoss: 373500,
      probability: 15,
      mitigation: 'Maintain 150%+ collateral ratio'
    },
    {
      id: '2',
      name: 'Liquidity Crisis',
      description: 'Mass withdrawal scenario (50% of TVL)',
      impact: 'medium',
      projectedLoss: 124500,
      probability: 8,
      mitigation: 'Keep 25% reserves in stablecoins'
    },
    {
      id: '3',
      name: 'Smart Contract Exploit',
      description: 'Potential vulnerability exploitation',
      impact: 'high',
      projectedLoss: 622500,
      probability: 3,
      mitigation: 'Multi-sig, audits, bug bounty'
    },
    {
      id: '4',
      name: 'Stablecoin Depeg',
      description: 'Primary stablecoin loses peg',
      impact: 'medium',
      projectedLoss: 186750,
      probability: 10,
      mitigation: 'Diversify stablecoin holdings'
    }
  ]);
  
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: '1',
      type: 'info',
      title: 'Weekly Report Generated',
      message: 'Treasury risk report for week 2 is now available',
      timestamp: '2026-01-10T08:00:00Z',
      acknowledged: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'Concentration Alert',
      message: 'Single asset position exceeds 40% of portfolio',
      timestamp: '2026-01-09T14:30:00Z',
      acknowledged: false
    }
  ]);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'indicators' | 'stress' | 'alerts'>('overview');

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      healthy: '#10B981',
      warning: '#F59E0B',
      critical: '#EF4444'
    };
    return colors[status] || '#6B7280';
  };

  const getImpactColor = (impact: string) => {
    const colors: Record<string, string> = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444'
    };
    return colors[impact] || '#6B7280';
  };

  const overallHealthScore = riskIndicators.length > 0 
    ? Math.round((riskIndicators.filter(i => i.status === 'healthy').length / riskIndicators.length) * 100)
    : 100;

  return (
    <>
      <Head>
        <title>Treasury Risk Dashboard | Axiom</title>
        <meta name="description" content="Monitor treasury health and risk metrics" />
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
                    Treasury Risk Dashboard
                  </h1>
                  <p style={{ fontSize: '16px', opacity: 0.9 }}>
                    Monitor treasury health, risk metrics, and stress scenarios in real-time.
                  </p>
                </div>
                <div style={{
                  background: overallHealthScore >= 75 ? '#10B981' : overallHealthScore >= 50 ? '#F59E0B' : '#EF4444',
                  borderRadius: '16px',
                  padding: '16px 24px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 700 }}>{overallHealthScore}%</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Health Score</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
              {['overview', 'indicators', 'stress', 'alerts'].map(tab => (
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
                  {tab === 'stress' ? 'Stress Testing' : tab}
                  {tab === 'alerts' && alerts.filter(a => !a.acknowledged).length > 0 && (
                    <span style={{
                      marginLeft: '8px',
                      background: '#EF4444',
                      color: 'white',
                      borderRadius: '50%',
                      padding: '2px 8px',
                      fontSize: '12px'
                    }}>
                      {alerts.filter(a => !a.acknowledged).length}
                    </span>
                  )}
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
                  <MetricCard
                    title="Total Value Locked"
                    value={`$${(metrics.totalValueLocked / 1000000).toFixed(2)}M`}
                    change="+4.2%"
                    positive={true}
                  />
                  <MetricCard
                    title="Utilization Rate"
                    value={`${metrics.utilizationRate}%`}
                    change="+2.1%"
                    positive={true}
                  />
                  <MetricCard
                    title="Collateral Ratio"
                    value={`${metrics.collateralRatio}%`}
                    change="-3.2%"
                    positive={false}
                  />
                  <MetricCard
                    title="Liquidity Ratio"
                    value={`${metrics.liquidityRatio}%`}
                    change="+1.5%"
                    positive={true}
                  />
                  <MetricCard
                    title="Diversification"
                    value={`${metrics.diversificationScore}/100`}
                    change="+5"
                    positive={true}
                  />
                  <MetricCard
                    title="Reserve Ratio"
                    value={`${metrics.reserveRatio}%`}
                    change="0%"
                    positive={true}
                  />
                </div>

                <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #E5E7EB'
                  }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                      Quick Risk Summary
                    </h3>
                    {riskIndicators.map(indicator => (
                      <div 
                        key={indicator.id}
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
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: getStatusColor(indicator.status)
                          }} />
                          <span style={{ fontSize: '14px' }}>{indicator.name}</span>
                        </div>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: 600,
                          color: getStatusColor(indicator.status)
                        }}>
                          {indicator.value}{indicator.id === 'collateral' ? '%' : ''}
                        </span>
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
                      Recent Alerts
                    </h3>
                    {alerts.slice(0, 3).map(alert => (
                      <div 
                        key={alert.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px',
                          background: alert.type === 'critical' ? '#FEF2F2' : alert.type === 'warning' ? '#FFFBEB' : '#F0FDF4',
                          borderRadius: '10px',
                          marginBottom: '12px'
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>
                          {alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                        </span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>{alert.title}</div>
                          <div style={{ fontSize: '13px', color: '#6B7280' }}>{alert.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'indicators' && (
              <div style={{ display: 'grid', gap: '16px' }}>
                {riskIndicators.map(indicator => (
                  <div
                    key={indicator.id}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '1px solid #E5E7EB'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{indicator.name}</h4>
                        <p style={{ fontSize: '14px', color: '#6B7280' }}>{indicator.description}</p>
                      </div>
                      <div style={{
                        padding: '8px 16px',
                        background: `${getStatusColor(indicator.status)}20`,
                        color: getStatusColor(indicator.status),
                        borderRadius: '24px',
                        fontSize: '14px',
                        fontWeight: 500,
                        textTransform: 'capitalize'
                      }}>
                        {indicator.status}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                        <span style={{ color: '#6B7280' }}>Current Value</span>
                        <span style={{ fontWeight: 600 }}>{indicator.value}</span>
                      </div>
                      <div style={{
                        height: '8px',
                        background: '#E5E7EB',
                        borderRadius: '4px',
                        position: 'relative',
                        overflow: 'visible'
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: `${(indicator.threshold.warning / 100) * 100}%`,
                          top: '-4px',
                          width: '2px',
                          height: '16px',
                          background: '#F59E0B'
                        }} />
                        <div style={{
                          position: 'absolute',
                          left: `${(indicator.threshold.critical / 100) * 100}%`,
                          top: '-4px',
                          width: '2px',
                          height: '16px',
                          background: '#EF4444'
                        }} />
                        <div style={{
                          height: '100%',
                          width: `${Math.min(indicator.value, 100)}%`,
                          background: getStatusColor(indicator.status),
                          borderRadius: '4px'
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
                        <span style={{ color: '#F59E0B' }}>Warning: {indicator.threshold.warning}</span>
                        <span style={{ color: '#EF4444' }}>Critical: {indicator.threshold.critical}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'stress' && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{
                  background: '#EEF2FF',
                  borderRadius: '16px',
                  padding: '20px',
                  marginBottom: '8px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#3730A3', marginBottom: '8px' }}>
                    Stress Testing Overview
                  </h3>
                  <p style={{ fontSize: '14px', color: '#4338CA' }}>
                    These scenarios simulate potential market conditions to assess treasury resilience. 
                    Projected losses are estimates based on current portfolio composition.
                  </p>
                </div>

                {stressScenarios.map(scenario => (
                  <div
                    key={scenario.id}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '1px solid #E5E7EB'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{scenario.name}</h4>
                        <p style={{ fontSize: '14px', color: '#6B7280' }}>{scenario.description}</p>
                      </div>
                      <div style={{
                        padding: '6px 12px',
                        background: `${getImpactColor(scenario.impact)}20`,
                        color: getImpactColor(scenario.impact),
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        textTransform: 'uppercase'
                      }}>
                        {scenario.impact} impact
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                      <div style={{ background: '#FEF2F2', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#B91C1C', marginBottom: '4px' }}>Projected Loss</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#DC2626' }}>
                          -${(scenario.projectedLoss / 1000).toFixed(0)}K
                        </div>
                      </div>
                      <div style={{ background: '#FFFBEB', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#92400E', marginBottom: '4px' }}>Probability</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#D97706' }}>
                          {scenario.probability}%
                        </div>
                      </div>
                      <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>% of TVL</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>
                          {metrics.totalValueLocked > 0 
                            ? ((scenario.projectedLoss / metrics.totalValueLocked) * 100).toFixed(1)
                            : '0.0'}%
                        </div>
                      </div>
                    </div>
                    
                    <div style={{
                      background: '#F9FAFB',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '16px' }}>🛡️</span>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Mitigation Strategy</div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{scenario.mitigation}</div>
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
                    <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>All Clear</h3>
                    <p style={{ color: '#6B7280' }}>No active alerts at this time</p>
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div
                      key={alert.id}
                      style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '20px',
                        border: `2px solid ${alert.type === 'critical' ? '#FCA5A5' : alert.type === 'warning' ? '#FCD34D' : '#86EFAC'}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '16px'
                      }}
                    >
                      <span style={{ fontSize: '28px' }}>
                        {alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: 600 }}>{alert.title}</h4>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>{alert.message}</p>
                        {!alert.acknowledged && (
                          <button
                            onClick={() => setAlerts(prev => 
                              prev.map(a => a.id === alert.id ? { ...a, acknowledged: true } : a)
                            )}
                            style={{
                              padding: '8px 16px',
                              background: '#F3F4F6',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '13px',
                              cursor: 'pointer'
                            }}
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}

function MetricCard({ title, value, change, positive }: { 
  title: string; 
  value: string; 
  change: string; 
  positive: boolean;
}) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #E5E7EB'
    }}>
      <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: '#1F2937' }}>{value}</span>
        <span style={{ 
          fontSize: '12px', 
          color: positive ? '#059669' : '#DC2626',
          fontWeight: 500
        }}>
          {change}
        </span>
      </div>
    </div>
  );
}
