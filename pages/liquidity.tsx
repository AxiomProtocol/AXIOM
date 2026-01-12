import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface LiquidityPool {
  id: string;
  name: string;
  token0: string;
  token1: string;
  tvl: number;
  apr: number;
  volume24h: number;
  fees24h: number;
  yourLiquidity: number;
  yourShare: number;
}

interface LPIncentive {
  poolId: string;
  poolName: string;
  baseApr: number;
  boostApr: number;
  totalApr: number;
  axmRewards: number;
  duration: string;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

interface BridgeRoute {
  id: string;
  fromChain: string;
  toChain: string;
  token: string;
  estimatedTime: string;
  fee: number;
  available: boolean;
}

export default function LiquidityPage() {
  const { walletState } = useWallet();
  const [loading, setLoading] = useState(true);
  const [pools, setPools] = useState<LiquidityPool[]>([]);
  const [incentives, setIncentives] = useState<LPIncentive[]>([]);
  const [bridges, setBridges] = useState<BridgeRoute[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [activeTab, setActiveTab] = useState<'pools' | 'incentives' | 'automation' | 'bridge'>('pools');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [liquidityRes, automationRes] = await Promise.all([
        fetch('/api/treasury/liquidity'),
        fetch('/api/treasury/automation')
      ]);

      if (liquidityRes.ok) {
        const data = await liquidityRes.json();
        if (data.success) {
          setPools(data.pools || []);
          setIncentives(data.incentives || []);
          setBridges(data.bridges || []);
        }
      }

      if (automationRes.ok) {
        const data = await automationRes.json();
        if (data.success) {
          setAutomationRules(data.rules || []);
        }
      }
    } catch (err) {
      console.error('Error loading liquidity data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/treasury/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', ruleId, enabled })
      });
      if (res.ok) {
        setAutomationRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled } : r));
      }
    } catch (err) {
      console.error('Error toggling rule:', err);
    }
  };

  const totalTvl = pools.reduce((sum, p) => sum + p.tvl, 0);

  return (
    <>
      <Head>
        <title>AXUSD Liquidity | Axiom</title>
        <meta name="description" content="AXUSD liquidity pools and treasury automation" />
      </Head>
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
            color: 'white',
            padding: '48px 24px'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
                AXUSD Liquidity & Automation
              </h1>
              <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '24px' }}>
                Manage liquidity pools, LP incentives, and treasury automation
              </p>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>Total TVL</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>${(totalTvl / 1000000).toFixed(2)}M</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>Active Pools</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>{pools.length}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>Active Rules</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>{automationRules.filter(r => r.enabled).length}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {(['pools', 'incentives', 'automation', 'bridge'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: activeTab === tab ? '#059669' : 'white',
                    color: activeTab === tab ? 'white' : '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  {tab === 'bridge' ? 'Cross-Chain' : tab}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>
            ) : (
              <>
                {activeTab === 'pools' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {pools.map(pool => (
                      <div key={pool.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '48px', height: '48px', background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                              💧
                            </div>
                            <div>
                              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{pool.name}</h3>
                              <span style={{ fontSize: '14px', color: '#6B7280' }}>{pool.token0}/{pool.token1}</span>
                            </div>
                          </div>
                          <div style={{ padding: '8px 16px', background: '#DCFCE7', borderRadius: '20px', color: '#166534', fontWeight: 600 }}>
                            {pool.apr.toFixed(1)}% APR
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>TVL</div>
                            <div style={{ fontSize: '18px', fontWeight: 600 }}>${(pool.tvl / 1000).toFixed(0)}K</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>24h Volume</div>
                            <div style={{ fontSize: '18px', fontWeight: 600 }}>${(pool.volume24h / 1000).toFixed(0)}K</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>24h Fees</div>
                            <div style={{ fontSize: '18px', fontWeight: 600 }}>${pool.fees24h.toFixed(0)}</div>
                          </div>
                          <div>
                            <button style={{ width: '100%', padding: '12px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                              Add Liquidity
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'incentives' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Active LP Incentive Programs</h3>
                      <p style={{ color: '#6B7280', marginBottom: '24px' }}>Earn boosted rewards by providing liquidity to incentivized pools</p>
                      {incentives.map(inc => (
                        <div key={inc.poolId} style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '16px' }}>{inc.poolName}</div>
                              <div style={{ fontSize: '14px', color: '#6B7280' }}>{inc.duration} program</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669' }}>{inc.totalApr.toFixed(1)}%</div>
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                {inc.baseApr}% base + {inc.boostApr}% boost
                              </div>
                            </div>
                          </div>
                          <div style={{ marginTop: '12px', padding: '12px', background: '#F0FDF4', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#166534' }}>AXM Rewards Pool</span>
                            <span style={{ fontWeight: 600, color: '#166534' }}>{inc.axmRewards.toLocaleString()} AXM</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'automation' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {automationRules.map(rule => (
                      <div key={rule.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>{rule.name}</h3>
                            <p style={{ color: '#6B7280', margin: 0, fontSize: '14px' }}>{rule.description}</p>
                            {rule.lastRun && (
                              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
                                Last run: {new Date(rule.lastRun).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => toggleRule(rule.id, !rule.enabled)}
                            style={{
                              width: '60px',
                              height: '32px',
                              borderRadius: '16px',
                              border: 'none',
                              background: rule.enabled ? '#059669' : '#D1D5DB',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'background 0.2s'
                            }}
                          >
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'white',
                              position: 'absolute',
                              top: '4px',
                              left: rule.enabled ? '32px' : '4px',
                              transition: 'left 0.2s',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'bridge' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Cross-Chain Bridge Routes</h3>
                      <p style={{ color: '#6B7280', marginBottom: '24px' }}>Bridge AXUSD across supported networks</p>
                      {bridges.map(bridge => (
                        <div key={bridge.id} style={{ 
                          border: '1px solid #E5E7EB', 
                          borderRadius: '12px', 
                          padding: '16px', 
                          marginBottom: '12px',
                          opacity: bridge.available ? 1 : 0.5
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{ fontWeight: 600 }}>{bridge.fromChain}</span>
                              <span style={{ color: '#6B7280' }}>→</span>
                              <span style={{ fontWeight: 600 }}>{bridge.toChain}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px' }}>{bridge.estimatedTime}</div>
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>{bridge.fee}% fee</div>
                            </div>
                          </div>
                          <button
                            disabled={!bridge.available}
                            style={{
                              width: '100%',
                              marginTop: '12px',
                              padding: '12px',
                              background: bridge.available ? '#059669' : '#D1D5DB',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 600,
                              cursor: bridge.available ? 'pointer' : 'not-allowed'
                            }}
                          >
                            {bridge.available ? 'Bridge AXUSD' : 'Coming Soon'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
    </>
  );
}
