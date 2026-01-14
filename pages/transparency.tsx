import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { pagesCopy } from '../components/axiomRebuild/copy/pagesCopy';
import { Web3Hero } from '../components/axiomRebuild/Web3Hero';
import { Web3Section } from '../components/axiomRebuild/Web3Section';
import { useScrollToSection } from '../components/axiomRebuild/useScrollToSection';

interface TreasuryMetrics {
  totalAUM: string;
  seriesABalance: string;
  seriesBBalance: string;
  activeLoansCount: number;
  totalLoansOriginated: string;
  totalRepaid: string;
  totalInterestEarned: string;
  utilizationRate: number;
  axusdSupply: string;
  reserveRatio: number;
  pendingCommitments: string;
  investorCount: number;
}

interface RecentActivity {
  id: string;
  type: string;
  amount: string;
  description: string;
  timestamp: string;
  txHash?: string;
}

interface ContractInfo {
  name: string;
  address: string;
  network: string;
  verified: boolean;
  description: string;
}

const CONTRACTS: ContractInfo[] = [
  { name: 'AxiomV2 (AXM Token)', address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', network: 'Arbitrum One', verified: true, description: 'ERC20 governance token' },
  { name: 'AxiomIdentityComplianceHub', address: '0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED', network: 'Arbitrum One', verified: true, description: 'KYC/AML identity verification' },
  { name: 'AxiomTreasuryAndRevenueHub', address: '0x3fD63728288546AC41dAe3bf25ca383061c3A929', network: 'Arbitrum One', verified: true, description: 'Multi-sig treasury management' },
  { name: 'AxiomStakingAndEmissionsHub', address: '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885', network: 'Arbitrum One', verified: true, description: 'Tiered staking and rewards' },
  { name: 'CitizenCredentialRegistry', address: '0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344', network: 'Arbitrum One', verified: true, description: 'Citizen identity credentials' },
  { name: 'AxiomLandAndAssetRegistry', address: '0xaB15907b124620E165aB6E464eE45b178d8a6591', network: 'Arbitrum One', verified: true, description: 'Land and asset registration' },
  { name: 'LeaseAndRentEngine', address: '0x26a20dEa57F951571AD6e518DFb3dC60634D5297', network: 'Arbitrum One', verified: true, description: 'KeyGrow rent-to-own engine' },
  { name: 'DePINNodeSuite', address: '0x16dC3884d88b767D99E0701Ba026a1ed39a250F1', network: 'Arbitrum One', verified: true, description: 'DePIN node management' },
  { name: 'AxiomExchangeHub', address: '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D', network: 'Arbitrum One', verified: true, description: 'Internal DEX' },
];

const SECURITY_FEATURES = [
  { name: 'OpenZeppelin Contracts', status: 'active', description: 'Battle-tested security standards', icon: '🛡️' },
  { name: 'Role-Based Access Control', status: 'active', description: 'Granular permission management', icon: '🔐' },
  { name: 'Pausable Contracts', status: 'active', description: 'Emergency halt capabilities', icon: '⏸️' },
  { name: 'Reentrancy Guards', status: 'active', description: 'Protection against reentrancy attacks', icon: '🚫' },
  { name: 'Multi-Sig Treasury', status: 'active', description: 'Multiple approvals for fund movements', icon: '✍️' },
  { name: 'SafeERC20 Transfers', status: 'active', description: 'Safe token transfer handling', icon: '💸' },
];

const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

const formatNumber = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US').format(num);
};

export default function TransparencyPage() {
  const [expandedContract, setExpandedContract] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<TreasuryMetrics | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [treasuryLoading, setTreasuryLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const getSearch = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  }, []);
  
  useScrollToSection(getSearch);

  useEffect(() => {
    fetchTreasuryData();
    const interval = setInterval(fetchTreasuryData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchTreasuryData() {
    try {
      const response = await fetch('/api/transparency/treasury');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setActivities(data.activities || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch treasury data:', error);
    } finally {
      setTreasuryLoading(false);
    }
  }

  const copy = pagesCopy.transparency;

  return (
    <>
      <Head>
        <title>Transparency Dashboard | Axiom</title>
        <meta name="description" content="Complete visibility into Axiom's smart contracts, security, and governance." />
      </Head>
      <div style={{ minHeight: '100vh', background: 'white' }}>
        {copy.hero && (
          <Web3Hero
            kicker={copy.hero.kicker}
            headline={copy.hero.headline}
            secondary={copy.hero.secondary}
            subheadline={copy.hero.subheadline}
            primaryCta={copy.hero.primaryCta}
            secondaryCta={copy.hero.secondaryCta}
            microcopy={copy.hero.microcopy || ''}
          />
        )}

        {/* Treasury Dashboard Section */}
        <section id="treasury" style={{ padding: '80px 20px', background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a1a 100%)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(0,212,170,0.1)', borderRadius: 24, marginBottom: 16 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00D4AA', animation: 'pulse 2s infinite' }} />
                <span style={{ color: '#00D4AA', fontSize: 14, fontWeight: 500 }}>Live Data</span>
              </div>
              <h2 style={{ fontSize: 40, fontWeight: 700, margin: '8px 0 0 0', color: 'white' }}>Treasury Dashboard</h2>
              <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>
                Real-time visibility into Axiom Nexus lending pools and reserves
              </p>
              {lastUpdated && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>

            {treasuryLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <div style={{ width: 48, height: 48, border: '3px solid rgba(0,212,170,0.3)', borderTopColor: '#00D4AA', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 48 }}>
                  <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(59,130,246,0.2) 100%)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: 28, border: '1px solid rgba(124,58,237,0.3)' }}>
                    <span style={{ fontSize: 32, marginBottom: 12, display: 'block' }}>💎</span>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 4 }}>Total AUM</p>
                    <p style={{ color: 'white', fontSize: 32, fontWeight: 700, margin: 0 }}>{formatCurrency(metrics?.totalAUM || 0)}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Assets Under Management</p>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(6,182,212,0.2) 100%)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: 28, border: '1px solid rgba(59,130,246,0.3)' }}>
                    <span style={{ fontSize: 32, marginBottom: 12, display: 'block' }}>📄</span>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 4 }}>Active Loans</p>
                    <p style={{ color: 'white', fontSize: 32, fontWeight: 700, margin: 0 }}>{formatNumber(metrics?.activeLoansCount || 0)}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Currently outstanding</p>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.2) 100%)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: 28, border: '1px solid rgba(16,185,129,0.3)' }}>
                    <span style={{ fontSize: 32, marginBottom: 12, display: 'block' }}>🏠</span>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 4 }}>Total Originated</p>
                    <p style={{ color: 'white', fontSize: 32, fontWeight: 700, margin: 0 }}>{formatCurrency(metrics?.totalLoansOriginated || 0)}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Lifetime loan volume</p>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(249,115,22,0.2) 100%)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: 28, border: '1px solid rgba(245,158,11,0.3)' }}>
                    <span style={{ fontSize: 32, marginBottom: 12, display: 'block' }}>📈</span>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 4 }}>Interest Earned</p>
                    <p style={{ color: 'white', fontSize: 32, fontWeight: 700, margin: 0 }}>{formatCurrency(metrics?.totalInterestEarned || 0)}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Revenue generated</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ color: 'white', fontSize: 20, fontWeight: 600, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🏦</span> Fund Allocation
                    </h3>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: 'white' }}>Series A: Fix & Flip</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{formatCurrency(metrics?.seriesABalance || 0)}</span>
                      </div>
                      <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: '35%', background: 'linear-gradient(90deg, #7C3AED, #3B82F6)', borderRadius: 4 }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: 'white' }}>Series B: DSCR Rental</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{formatCurrency(metrics?.seriesBBalance || 0)}</span>
                      </div>
                      <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: '65%', background: 'linear-gradient(90deg, #10B981, #14B8A6)', borderRadius: 4 }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ color: 'white', fontSize: 24, fontWeight: 700, margin: 0 }}>{metrics?.utilizationRate?.toFixed(1) || 0}%</p>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Utilization Rate</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ color: 'white', fontSize: 24, fontWeight: 700, margin: 0 }}>{formatNumber(metrics?.investorCount || 0)}</p>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Investors</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ color: 'white', fontSize: 20, fontWeight: 600, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📊</span> Recent Activity
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {activities.length > 0 ? activities.slice(0, 5).map((activity) => (
                        <div key={activity.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
                          <div>
                            <p style={{ color: 'white', fontSize: 14, margin: 0 }}>{activity.description}</p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0 0' }}>{new Date(activity.timestamp).toLocaleString()}</p>
                          </div>
                          <span style={{ color: '#00D4AA', fontWeight: 600 }}>{formatCurrency(activity.amount)}</span>
                        </div>
                      )) : (
                        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 24 }}>No recent activity</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section id="contracts" style={{ padding: '80px 20px', background: 'linear-gradient(180deg, rgba(0,212,170,0.05) 0%, white 100%)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <span style={{ color: '#00D4AA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 }}>Verified On-Chain</span>
              <h2 style={{ fontSize: 40, fontWeight: 700, margin: '8px 0 0 0', color: '#1a1a2e' }}>Smart Contracts</h2>
              <p style={{ fontSize: 18, color: 'rgba(26,26,46,0.6)', marginTop: 12 }}>29 contracts verified on Arbitrum One</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CONTRACTS.map((contract, i) => (
                <div 
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 16,
                    padding: expandedContract === i ? '24px' : '20px 24px',
                    border: '1px solid rgba(0,212,170,0.15)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => setExpandedContract(expandedContract === i ? null : i)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        background: contract.verified ? '#00D4AA' : '#FFD700'
                      }} />
                      <div>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1a1a2e' }}>{contract.name}</h3>
                        {expandedContract === i && (
                          <p style={{ margin: '8px 0 0 0', fontSize: 14, color: 'rgba(26,26,46,0.6)' }}>{contract.description}</p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ 
                        fontSize: 13, 
                        padding: '4px 12px',
                        background: 'rgba(0,212,170,0.1)',
                        borderRadius: 20,
                        color: '#00D4AA',
                        fontWeight: 500
                      }}>
                        {contract.network}
                      </span>
                      <span style={{ color: 'rgba(26,26,46,0.4)', transform: expandedContract === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>▼</span>
                    </div>
                  </div>
                  {expandedContract === i && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,212,170,0.1)' }}>
                      <code style={{ 
                        display: 'block',
                        fontSize: 13, 
                        color: 'rgba(26,26,46,0.7)', 
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                      }}>
                        {contract.address}
                      </code>
                      <a 
                        href={`https://arbiscan.io/address/${contract.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          marginTop: 12,
                          fontSize: 14,
                          color: '#00D4AA',
                          textDecoration: 'none',
                          fontWeight: 500
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View on Arbiscan →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="security" style={{ padding: '80px 20px', background: '#1a1a2e' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <span style={{ color: '#00D4AA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 }}>Built Secure</span>
              <h2 style={{ fontSize: 40, fontWeight: 700, margin: '8px 0 0 0', color: 'white' }}>Security Infrastructure</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              {SECURITY_FEATURES.map((feature, i) => (
                <div 
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 16,
                    padding: 28,
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>{feature.icon}</span>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'white' }}>{feature.name}</h3>
                  </div>
                  <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{feature.description}</p>
                  <div style={{ 
                    marginTop: 16,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    background: 'rgba(0,212,170,0.2)',
                    borderRadius: 20,
                    color: '#00D4AA',
                    fontSize: 13,
                    fontWeight: 500
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00D4AA' }} />
                    Active
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {copy.sections.map((s, i) => (
          <Web3Section
            key={s.id}
            id={s.id}
            title={s.title}
            body={s.body}
            bullets={s.bullets}
            primaryCta={s.primaryCta}
            secondaryCta={s.secondaryCta}
            image={s.image}
            imageAlt={s.imageAlt}
            index={i}
            variant="default"
          />
        ))}
      </div>
    </>
  );
}
