import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { Web3Hero } from '../components/axiomRebuild/Web3Hero';

interface TreasuryLayerData {
  name: string;
  layer: 'survival' | 'operating' | 'reserve';
  balanceUsd: number;
  targetBalanceUsd: number;
  minBalanceUsd: number;
  maxBalanceUsd: number;
  drawFrequency: string;
  timelockHours: number;
  healthPercent: number;
}

interface DrawLimitsData {
  dailyOperatingUsd: number;
  dailyOperatingMaxUsd: number;
  weeklyOperatingUsd: number;
  weeklyOperatingMaxUsd: number;
  emergencyReserveUsd: number;
  emergencyReserveMaxUsd: number;
}

interface TreasuryAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  actionRequired: boolean;
}

interface TreasuryOpsState {
  status: 'normal' | 'caution' | 'stressed' | 'emergency';
  isPaused: boolean;
  layers: TreasuryLayerData[];
  drawLimits: DrawLimitsData;
  weeklyMetrics: {
    incomeUsd: number;
    drawsUsd: number;
    netFlowUsd: number;
    isLowIncomeWeek: boolean;
  };
  consecutiveStressWeeks: number;
  alerts: TreasuryAlert[];
  policyVersion: string;
  lastUpdated: string;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  normal: { bg: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.5)', text: '#10B981' },
  caution: { bg: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.5)', text: '#F59E0B' },
  stressed: { bg: 'rgba(249,115,22,0.2)', border: 'rgba(249,115,22,0.5)', text: '#F97316' },
  emergency: { bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.5)', text: '#EF4444' },
};

const LAYER_ICONS: Record<string, string> = {
  survival: '🛡️',
  operating: '💵',
  reserve: '🏦',
};

const LAYER_GRADIENTS: Record<string, { bg: string; border: string }> = {
  survival: { bg: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(59,130,246,0.2) 100%)', border: 'rgba(124,58,237,0.3)' },
  operating: { bg: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.2) 100%)', border: 'rgba(16,185,129,0.3)' },
  reserve: { bg: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(249,115,22,0.2) 100%)', border: 'rgba(245,158,11,0.3)' },
};

export default function TreasuryOpsPage() {
  const { walletState } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<TreasuryOpsState | null>(null);
  const [drawForm, setDrawForm] = useState({ layer: 'operating', amount: '', purpose: '' });
  const [drawValidation, setDrawValidation] = useState<{ allowed: boolean; reason: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchTreasuryState();
    const interval = setInterval(fetchTreasuryState, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchTreasuryState = async () => {
    try {
      const res = await fetch('/api/treasury/ops');
      if (!res.ok) throw new Error('Failed to fetch treasury state');
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');
      
      const layers: TreasuryLayerData[] = [
        {
          name: 'Survival Buffer',
          layer: 'survival',
          balanceUsd: data.state.balances.survivalUsd,
          targetBalanceUsd: data.policy.layers.survival.targetBalanceUsd,
          minBalanceUsd: data.policy.layers.survival.minBalanceUsd,
          maxBalanceUsd: data.policy.layers.survival.maxBalanceUsd,
          drawFrequency: data.policy.layers.survival.drawFrequency,
          timelockHours: data.policy.layers.survival.timelockHours,
          healthPercent: Math.min(100, (data.state.balances.survivalUsd / data.policy.layers.survival.targetBalanceUsd) * 100),
        },
        {
          name: 'Operating Cash',
          layer: 'operating',
          balanceUsd: data.state.balances.operatingUsd,
          targetBalanceUsd: data.policy.layers.operating.targetBalanceUsd,
          minBalanceUsd: data.policy.layers.operating.minBalanceUsd,
          maxBalanceUsd: data.policy.layers.operating.maxBalanceUsd,
          drawFrequency: data.policy.layers.operating.drawFrequency,
          timelockHours: data.policy.layers.operating.timelockHours,
          healthPercent: Math.min(100, (data.state.balances.operatingUsd / data.policy.layers.operating.targetBalanceUsd) * 100),
        },
        {
          name: 'Treasury Reserve',
          layer: 'reserve',
          balanceUsd: data.state.balances.reserveUsd,
          targetBalanceUsd: data.policy.layers.reserve.targetBalanceUsd,
          minBalanceUsd: data.policy.layers.reserve.minBalanceUsd,
          maxBalanceUsd: data.policy.layers.reserve.maxBalanceUsd,
          drawFrequency: data.policy.layers.reserve.drawFrequency,
          timelockHours: data.policy.layers.reserve.timelockHours,
          healthPercent: Math.min(100, (data.state.balances.reserveUsd / data.policy.layers.reserve.targetBalanceUsd) * 100),
        },
      ];

      setState({
        status: data.state.status,
        isPaused: data.state.isPaused,
        layers,
        drawLimits: {
          dailyOperatingUsd: data.state.drawsRemaining.dailyOperatingUsd,
          dailyOperatingMaxUsd: data.policy.drawLimits.dailyOperatingMaxUsd,
          weeklyOperatingUsd: data.state.drawsRemaining.weeklyOperatingUsd,
          weeklyOperatingMaxUsd: data.policy.drawLimits.weeklyOperatingMaxUsd,
          emergencyReserveUsd: data.state.drawsRemaining.emergencyReserveUsd,
          emergencyReserveMaxUsd: data.policy.drawLimits.emergencyReserveMaxUsd,
        },
        weeklyMetrics: data.state.weeklyMetrics,
        consecutiveStressWeeks: data.state.consecutiveStressWeeks,
        alerts: data.state.alerts,
        policyVersion: data.policy.version,
        lastUpdated: data.state.timestamp,
      });
      
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Treasury ops fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const validateDraw = async () => {
    try {
      const res = await fetch('/api/treasury/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate-draw',
          layer: drawForm.layer,
          amount: drawForm.amount,
          purpose: drawForm.purpose,
        }),
      });
      const data = await res.json();
      setDrawValidation(data.validation);
    } catch (err) {
      setDrawValidation({ allowed: false, reason: 'Validation request failed' });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalBalance = state?.layers.reduce((sum, l) => sum + l.balanceUsd, 0) || 0;
  const statusStyle = state ? STATUS_STYLES[state.status] : STATUS_STYLES.normal;

  return (
    <>
      <Head>
        <title>Treasury Operations | Axiom</title>
        <meta name="description" content="Axiom Protocol 3-Layer Treasury Operations Dashboard - Real-time visibility into treasury health and draw limits" />
      </Head>
      <div style={{ minHeight: '100vh', background: 'white' }}>
        <Web3Hero
          kicker="Treasury Operations"
          headline="3-Layer Treasury Policy"
          secondary="Real-time visibility into treasury health, draw limits, and fund flows"
          subheadline="Institutional-grade treasury management with automated policy enforcement"
          primaryCta={{ label: 'View Transparency Report', href: '/transparency' }}
          secondaryCta={{ label: 'Download Audit Report', href: '/documents/treasury-audit-report.md' }}
          microcopy={state ? `Policy v${state.policyVersion}` : ''}
        />

        <section style={{ padding: '80px 20px', background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a1a 100%)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(0,212,170,0.1)', borderRadius: 24, marginBottom: 16 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00D4AA', animation: 'pulse 2s infinite' }} />
                <span style={{ color: '#00D4AA', fontSize: 14, fontWeight: 500 }}>Live Data</span>
              </div>
              <h2 style={{ fontSize: 40, fontWeight: 700, margin: '8px 0 0 0', color: 'white' }}>Treasury Dashboard</h2>
              <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>
                Real-time treasury status and operational controls
              </p>
              {lastUpdated && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <div style={{ width: 48, height: 48, border: '3px solid rgba(0,212,170,0.3)', borderTopColor: '#00D4AA', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : error ? (
              <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                <p style={{ color: '#EF4444', fontSize: 18, fontWeight: 600, margin: 0 }}>Error Loading Treasury Data</p>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>{error}</p>
                <button onClick={fetchTreasuryState} style={{ marginTop: 16, padding: '12px 24px', background: '#F59E0B', color: '#000', fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  Retry
                </button>
              </div>
            ) : state && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 32 }}>
                  <div style={{ background: statusStyle.bg, border: `2px solid ${statusStyle.border}`, borderRadius: 24, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusStyle.text }} />
                    <span style={{ color: statusStyle.text, fontWeight: 600, fontSize: 16, textTransform: 'uppercase' }}>{state.status}</span>
                  </div>
                  {state.isPaused && (
                    <div style={{ background: 'rgba(239,68,68,0.3)', border: '2px solid rgba(239,68,68,0.8)', borderRadius: 24, padding: '12px 24px', animation: 'pulse 2s infinite' }}>
                      <span style={{ color: '#EF4444', fontWeight: 600, fontSize: 16 }}>PAUSED</span>
                    </div>
                  )}
                </div>

                <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(249,115,22,0.1) 100%)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: 32, border: '1px solid rgba(245,158,11,0.3)', marginBottom: 32, textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>Total Treasury Balance</p>
                  <p style={{ color: 'white', fontSize: 48, fontWeight: 700, margin: '8px 0' }}>{formatCurrency(totalBalance)}</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginTop: 16 }}>
                    {state.layers.map(layer => (
                      <div key={layer.layer} style={{ textAlign: 'center' }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', margin: 0 }}>{layer.name}</p>
                        <p style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: 4 }}>{formatCurrency(layer.balanceUsd)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32 }}>
                  {state.layers.map(layer => {
                    const gradient = LAYER_GRADIENTS[layer.layer];
                    const healthColor = layer.healthPercent >= 80 ? '#10B981' : layer.healthPercent >= 50 ? '#F59E0B' : '#EF4444';
                    return (
                      <div key={layer.layer} style={{ background: gradient.bg, backdropFilter: 'blur(20px)', borderRadius: 20, padding: 28, border: `1px solid ${gradient.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                          <span style={{ fontSize: 36 }}>{LAYER_ICONS[layer.layer]}</span>
                          <div>
                            <p style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: 0 }}>{layer.name}</p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0, textTransform: 'uppercase' }}>Layer {layer.layer === 'survival' ? 'A' : layer.layer === 'operating' ? 'B' : 'C'}</p>
                          </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Balance</span>
                            <span style={{ color: 'white', fontWeight: 600 }}>{formatCurrency(layer.balanceUsd)}</span>
                          </div>
                          <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${layer.healthPercent}%`, background: healthColor, transition: 'width 0.5s' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Target: {formatCurrency(layer.targetBalanceUsd)}</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{layer.healthPercent.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>Min Balance</p>
                            <p style={{ color: 'white', fontSize: 14, margin: 0 }}>{formatCurrency(layer.minBalanceUsd)}</p>
                          </div>
                          <div>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>Max Balance</p>
                            <p style={{ color: 'white', fontSize: 14, margin: 0 }}>{formatCurrency(layer.maxBalanceUsd)}</p>
                          </div>
                          <div>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>Draw Frequency</p>
                            <p style={{ color: 'white', fontSize: 14, margin: 0, textTransform: 'capitalize' }}>{layer.drawFrequency}</p>
                          </div>
                          <div>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>Timelock</p>
                            <p style={{ color: 'white', fontSize: 14, margin: 0 }}>{layer.timelockHours > 0 ? `${layer.timelockHours}h` : 'None'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32 }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: '0 0 20px 0' }}>Draw Limits Remaining</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {[
                        { label: 'Daily Operating', value: state.drawLimits.dailyOperatingUsd, max: state.drawLimits.dailyOperatingMaxUsd, color: '#10B981' },
                        { label: 'Weekly Operating', value: state.drawLimits.weeklyOperatingUsd, max: state.drawLimits.weeklyOperatingMaxUsd, color: '#3B82F6' },
                        { label: 'Emergency Reserve', value: state.drawLimits.emergencyReserveUsd, max: state.drawLimits.emergencyReserveMaxUsd, color: '#F97316' },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{item.label}</span>
                            <span style={{ color: 'white', fontSize: 14 }}>{formatCurrency(item.value)} / {formatCurrency(item.max)}</span>
                          </div>
                          <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(item.value / item.max) * 100}%`, background: item.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: '0 0 20px 0' }}>Weekly Metrics</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: 12, padding: 16 }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>Income</p>
                        <p style={{ color: '#10B981', fontSize: 24, fontWeight: 700, margin: '4px 0 0 0' }}>{formatCurrency(state.weeklyMetrics.incomeUsd)}</p>
                      </div>
                      <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 16 }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>Draws</p>
                        <p style={{ color: '#EF4444', fontSize: 24, fontWeight: 700, margin: '4px 0 0 0' }}>{formatCurrency(state.weeklyMetrics.drawsUsd)}</p>
                      </div>
                      <div style={{ background: state.weeklyMetrics.netFlowUsd >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 16 }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>Net Flow</p>
                        <p style={{ color: state.weeklyMetrics.netFlowUsd >= 0 ? '#10B981' : '#EF4444', fontSize: 24, fontWeight: 700, margin: '4px 0 0 0' }}>{formatCurrency(state.weeklyMetrics.netFlowUsd)}</p>
                      </div>
                      <div style={{ background: state.consecutiveStressWeeks > 0 ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>Stress Weeks</p>
                        <p style={{ color: state.consecutiveStressWeeks > 0 ? '#F97316' : 'rgba(255,255,255,0.6)', fontSize: 24, fontWeight: 700, margin: '4px 0 0 0' }}>{state.consecutiveStressWeeks}</p>
                      </div>
                    </div>
                    {state.weeklyMetrics.isLowIncomeWeek && (
                      <div style={{ marginTop: 16, padding: 12, background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.5)', borderRadius: 8 }}>
                        <p style={{ color: '#F59E0B', fontSize: 14, margin: 0 }}>Low income week detected. Reserve draws may be restricted.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 32 }}>
                  <h3 style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: '0 0 20px 0' }}>Validate Draw Request</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 6 }}>Layer</label>
                      <select
                        value={drawForm.layer}
                        onChange={(e) => setDrawForm({ ...drawForm, layer: e.target.value })}
                        style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'white', fontSize: 14 }}
                      >
                        <option value="operating">Operating Cash</option>
                        <option value="reserve">Treasury Reserve</option>
                        <option value="survival">Survival Buffer</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 6 }}>Amount (USD)</label>
                      <input
                        type="number"
                        value={drawForm.amount}
                        onChange={(e) => setDrawForm({ ...drawForm, amount: e.target.value })}
                        placeholder="5000"
                        style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'white', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 6 }}>Purpose</label>
                      <input
                        type="text"
                        value={drawForm.purpose}
                        onChange={(e) => setDrawForm({ ...drawForm, purpose: e.target.value })}
                        placeholder="Weekly payroll"
                        style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'white', fontSize: 14 }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        onClick={validateDraw}
                        style={{ width: '100%', padding: '12px 24px', background: '#F59E0B', color: '#000', fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
                      >
                        Validate
                      </button>
                    </div>
                  </div>
                  {drawValidation && (
                    <div style={{ marginTop: 16, padding: 16, background: drawValidation.allowed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', border: `1px solid ${drawValidation.allowed ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>{drawValidation.allowed ? '✅' : '❌'}</span>
                      <span style={{ color: drawValidation.allowed ? '#10B981' : '#EF4444', fontSize: 16 }}>{drawValidation.reason}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        <section id="deposit-withdraw" style={{ padding: '80px 20px', background: 'white' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontSize: 36, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>How to Deposit and Withdraw</h2>
              <p style={{ fontSize: 18, color: '#666', marginTop: 12 }}>Treasury fund flows are managed through on-chain smart contracts</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 32 }}>
              <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: 20, padding: 32, border: '1px solid #86efac' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 40 }}>💰</span>
                  <h3 style={{ fontSize: 24, fontWeight: 600, color: '#166534', margin: 0 }}>Deposits</h3>
                </div>
                <p style={{ color: '#15803d', fontSize: 16, lineHeight: 1.6, marginBottom: 16 }}>
                  Revenue flows into the treasury automatically through the AXUSDRevenueRouter contract.
                </p>
                <ul style={{ color: '#166534', fontSize: 14, lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
                  <li>Protocol fees from lending, DEX trades, and staking are routed automatically</li>
                  <li>Revenue is split: 50% to SEED rewards, 30% to Operating, 20% to Reserve</li>
                  <li>Manual deposits can be made directly to the BackstopVault contract</li>
                  <li>All deposits are tracked on-chain for full transparency</li>
                </ul>
                <div style={{ marginTop: 20, padding: 16, background: 'rgba(22,163,74,0.1)', borderRadius: 12 }}>
                  <p style={{ color: '#166534', fontSize: 13, margin: 0 }}>
                    <strong>Contract:</strong> AXUSDRevenueRouter<br />
                    <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: 4 }}>0x39A9...F30a</code>
                  </p>
                </div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: 20, padding: 32, border: '1px solid #fbbf24' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 40 }}>🏦</span>
                  <h3 style={{ fontSize: 24, fontWeight: 600, color: '#92400e', margin: 0 }}>Withdrawals</h3>
                </div>
                <p style={{ color: '#a16207', fontSize: 16, lineHeight: 1.6, marginBottom: 16 }}>
                  Withdrawals follow the 3-layer policy with automated limit enforcement.
                </p>
                <ul style={{ color: '#92400e', fontSize: 14, lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
                  <li><strong>Operating Cash:</strong> Daily limit $10K, weekly limit $50K, no timelock</li>
                  <li><strong>Reserve:</strong> Only during stressed/emergency status, 24h timelock</li>
                  <li><strong>Survival Buffer:</strong> Never touched except in catastrophic scenarios</li>
                  <li>All withdrawals require governance approval via GovernanceHub</li>
                </ul>
                <div style={{ marginTop: 20, padding: 16, background: 'rgba(245,158,11,0.15)', borderRadius: 12 }}>
                  <p style={{ color: '#92400e', fontSize: 13, margin: 0 }}>
                    <strong>Contract:</strong> BackstopVault (24h timelock)<br />
                    <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: 4 }}>0x9D59...c00a</code>
                  </p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 48, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: 20, padding: 32, border: '1px solid #93c5fd' }}>
              <h3 style={{ fontSize: 22, fontWeight: 600, color: '#1e40af', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>🔐</span> Governance Controls
              </h3>
              <p style={{ color: '#1e3a8a', fontSize: 16, lineHeight: 1.6, margin: '0 0 16px 0' }}>
                All treasury operations are governed by the GovernanceHub contract with role-based access control:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: 12, padding: 16 }}>
                  <p style={{ color: '#1d4ed8', fontWeight: 600, fontSize: 14, margin: 0 }}>RISK_COMMITTEE</p>
                  <p style={{ color: '#3b82f6', fontSize: 13, margin: '4px 0 0 0' }}>Approves risk parameter changes</p>
                </div>
                <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: 12, padding: 16 }}>
                  <p style={{ color: '#1d4ed8', fontWeight: 600, fontSize: 14, margin: 0 }}>SETTLEMENT_AUTHORITY</p>
                  <p style={{ color: '#3b82f6', fontSize: 13, margin: '4px 0 0 0' }}>Executes approved withdrawals</p>
                </div>
                <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: 12, padding: 16 }}>
                  <p style={{ color: '#1d4ed8', fontWeight: 600, fontSize: 14, margin: 0 }}>GUARDIAN</p>
                  <p style={{ color: '#3b82f6', fontSize: 13, margin: '4px 0 0 0' }}>Emergency pause capability</p>
                </div>
              </div>
              <p style={{ color: '#1e3a8a', fontSize: 14, marginTop: 20, textAlign: 'center' }}>
                <strong>GovernanceHub:</strong> <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 8px', borderRadius: 4 }}>0x52Dc85fd653a75323b5307f4D2629ab9A070530E</code>
              </p>
            </div>
          </div>
        </section>

        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </>
  );
}
