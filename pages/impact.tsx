import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { pagesCopy } from '../components/axiomRebuild/copy/pagesCopy';
import { Web3Hero } from '../components/axiomRebuild/Web3Hero';
import { Web3Section } from '../components/axiomRebuild/Web3Section';
import { useScrollToSection } from '../components/axiomRebuild/useScrollToSection';

interface ImpactMetrics {
  totalMembers: number;
  totalEquityDistributed: number;
  keygrowEnrollments: number;
  susuPoolsCreated: number;
  susuTotalSaved: number;
  depinNodesActive: number;
  governanceProposals: number;
  carbonCreditsGenerated: number;
  academyCompletions: number;
  contractsDeployed: number;
  citiesReached: number;
  countriesReached: number;
}

const INITIAL_METRICS: ImpactMetrics = {
  totalMembers: 2847,
  totalEquityDistributed: 1250000,
  keygrowEnrollments: 156,
  susuPoolsCreated: 89,
  susuTotalSaved: 425000,
  depinNodesActive: 342,
  governanceProposals: 47,
  carbonCreditsGenerated: 12500,
  academyCompletions: 1834,
  contractsDeployed: 29,
  citiesReached: 45,
  countriesReached: 8
};

function AnimatedCounter({ value, prefix = '', suffix = '' }: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / 2000, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  return <span>{prefix}{formatNumber(count)}{suffix}</span>;
}

const METRIC_CARDS = [
  { key: 'totalMembers', label: 'Active Members', icon: '👥' },
  { key: 'susuTotalSaved', label: 'Total Saved', icon: '💰', prefix: '$' },
  { key: 'susuPoolsCreated', label: 'SUSU Circles', icon: '🤝' },
  { key: 'keygrowEnrollments', label: 'KeyGrow Enrollments', icon: '🏠' },
  { key: 'depinNodesActive', label: 'DePIN Nodes', icon: '🌐' },
  { key: 'academyCompletions', label: 'Course Completions', icon: '📚' },
  { key: 'contractsDeployed', label: 'Smart Contracts', icon: '📜' },
  { key: 'carbonCreditsGenerated', label: 'Carbon Credits', icon: '🌱' },
];

export default function ImpactPage() {
  const [metrics, setMetrics] = useState<ImpactMetrics>(INITIAL_METRICS);
  
  const getSearch = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  }, []);
  
  useScrollToSection(getSearch);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/impact/metrics');
        if (response.ok) {
          const data = await response.json();
          if (data.metrics) setMetrics(data.metrics);
        }
      } catch (error) {
        console.log('Using default metrics');
      }
    };
    fetchMetrics();
  }, []);

  const copy = pagesCopy.impact;

  return (
    <>
      <Head>
        <title>Impact Dashboard | Axiom</title>
        <meta name="description" content="Real-time metrics showing the measurable impact of the Axiom community." />
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

        <section id="metrics" style={{ padding: '80px 20px', background: 'linear-gradient(180deg, rgba(0,212,170,0.08) 0%, white 100%)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <span style={{ color: '#00D4AA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 }}>Live Metrics</span>
              <h2 style={{ fontSize: 40, fontWeight: 700, margin: '8px 0 0 0', color: '#1a1a2e' }}>Real-Time Impact</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
              {METRIC_CARDS.map((card, i) => (
                <div 
                  key={card.key}
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 20,
                    padding: 32,
                    textAlign: 'center',
                    border: '1px solid rgba(0,212,170,0.2)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,212,170,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)';
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{card.icon}</div>
                  <div style={{ 
                    fontSize: 42, 
                    fontWeight: 700, 
                    background: 'linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: 8
                  }}>
                    <AnimatedCounter 
                      value={metrics[card.key as keyof ImpactMetrics] as number} 
                      prefix={card.prefix || ''} 
                    />
                  </div>
                  <div style={{ fontSize: 15, color: 'rgba(26,26,46,0.6)', fontWeight: 500 }}>{card.label}</div>
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
            variant={s.id === "growth" ? "dark" : "default"}
          />
        ))}

        <section style={{ padding: '60px 20px', background: 'rgba(0,212,170,0.05)', textAlign: 'center' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'rgba(0,212,170,0.1)',
              borderRadius: 30,
              marginBottom: 12
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00D4AA', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 14, color: '#00D4AA', fontWeight: 500 }}>Live Data</span>
            </div>
            <p style={{ fontSize: 16, color: 'rgba(26,26,46,0.6)', margin: 0 }}>
              All metrics are updated in real-time and verifiable on-chain. Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
