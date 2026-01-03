import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import { pagesCopy } from '../components/axiomRebuild/copy/pagesCopy';
import { Web3Hero } from '../components/axiomRebuild/Web3Hero';
import { Web3Section } from '../components/axiomRebuild/Web3Section';
import { useScrollToSection } from '../components/axiomRebuild/useScrollToSection';

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

export default function TransparencyPage() {
  const [expandedContract, setExpandedContract] = useState<number | null>(null);
  
  const getSearch = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  }, []);
  
  useScrollToSection(getSearch);

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
