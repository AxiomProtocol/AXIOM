import React, { useCallback } from 'react';
import Head from 'next/head';
import { pagesCopy } from '../components/axiomRebuild/copy/pagesCopy';
import { Web3Hero } from '../components/axiomRebuild/Web3Hero';
import { Web3Section } from '../components/axiomRebuild/Web3Section';
import { useScrollToSection } from '../components/axiomRebuild/useScrollToSection';

const VALUES = [
  {
    icon: "🔓",
    title: "Transparency",
    description: "Every transaction, every decision, every dollar is recorded on-chain."
  },
  {
    icon: "🤝",
    title: "Community",
    description: "Governed by members. AXM holders vote on proposals and shape the future."
  },
  {
    icon: "🔒",
    title: "Security",
    description: "Multi-sig wallets, audited contracts, and enterprise-grade infrastructure."
  },
  {
    icon: "🌱",
    title: "Sustainability",
    description: "Carbon credits, renewable energy, and environmentally responsible operations."
  },
];

const MILESTONES = [
  { year: "2024", event: "Axiom concept development and smart contract architecture" },
  { year: "Q1 2025", event: "29 verified smart contracts deployed on Arbitrum One" },
  { year: "Q2 2025", event: "DePIN node operator program launch" },
  { year: "Q3 2025", event: "Real estate tokenization and DeFi treasury rollout" },
  { year: "Q1 2026", event: "Token Generation Event (TGE) and L3 launch" },
];

export default function AboutUsPage() {
  const getSearch = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  }, []);
  
  useScrollToSection(getSearch);

  const copy = pagesCopy['about-us'];

  return (
    <>
      <Head>
        <title>About Us | Axiom</title>
        <meta name="description" content="Axiom was born from real-world execution: a community land purchase and commitment to building shared ownership infrastructure." />
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

        <section style={{ padding: '80px 20px', background: 'linear-gradient(180deg, rgba(123,104,238,0.05) 0%, rgba(255,255,255,1) 100%)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <span style={{ color: '#7B68EE', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 }}>Our Values</span>
              <h2 style={{ fontSize: 40, fontWeight: 700, margin: '8px 0 0 0', color: '#1a1a2e' }}>What Drives Us</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
              {VALUES.map((value, i) => (
                <div 
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 16,
                    padding: 28,
                    border: '1px solid rgba(123,104,238,0.2)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>{value.icon}</div>
                  <h3 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 12px 0', color: '#1a1a2e' }}>{value.title}</h3>
                  <p style={{ fontSize: 15, color: 'rgba(26,26,46,0.7)', margin: 0, lineHeight: 1.6 }}>{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '80px 20px', background: '#1a1a2e' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <span style={{ color: '#00D4AA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 }}>Timeline</span>
              <h2 style={{ fontSize: 40, fontWeight: 700, margin: '8px 0 0 0', color: 'white' }}>Our Journey</h2>
            </div>
            
            <div style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                left: '50%', 
                top: 0, 
                bottom: 0, 
                width: 2, 
                background: 'linear-gradient(180deg, #00D4AA 0%, #7B68EE 100%)',
                transform: 'translateX(-50%)'
              }} />
              
              {MILESTONES.map((milestone, i) => (
                <div 
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 32,
                    marginBottom: 32,
                    flexDirection: i % 2 === 0 ? 'row' : 'row-reverse'
                  }}
                >
                  <div style={{ flex: 1, textAlign: i % 2 === 0 ? 'right' : 'left' }}>
                    <span style={{ 
                      display: 'inline-block',
                      padding: '6px 14px',
                      background: 'rgba(0,212,170,0.2)',
                      borderRadius: 20,
                      color: '#00D4AA',
                      fontWeight: 600,
                      fontSize: 14,
                      marginBottom: 8
                    }}>{milestone.year}</span>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, margin: 0, lineHeight: 1.5 }}>{milestone.event}</p>
                  </div>
                  <div style={{ 
                    width: 16, 
                    height: 16, 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%)',
                    border: '3px solid #1a1a2e',
                    zIndex: 1
                  }} />
                  <div style={{ flex: 1 }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
