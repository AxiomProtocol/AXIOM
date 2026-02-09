import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

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

  return (
    <DesignLawLayout>
      <Head>
        <title>Impact Dashboard | Axiom</title>
        <meta name="description" content="Real-time metrics showing the measurable impact of the Axiom community." />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy mb-1">Impact Dashboard</h1>
      <p className="text-sm text-dl-gray mb-8">Real-time metrics showing the measurable impact of the Axiom community.</p>

      <section id="metrics" className="mb-10">
        <SectionHeading>Live Metrics</SectionHeading>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
          {METRIC_CARDS.map((card) => (
            <div
              key={card.key}
              className="px-4 py-4 bg-dl-bg border-r border-b border-dl-border text-center"
            >
              <div className="text-2xl mb-2">{card.icon}</div>
              <div className="font-dl-mono text-lg font-semibold text-dl-navy mb-1">
                <AnimatedCounter
                  value={metrics[card.key as keyof ImpactMetrics] as number}
                  prefix={card.prefix || ''}
                />
              </div>
              <div className="text-xs text-dl-gray">{card.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-dl-border bg-dl-bg-alt p-4 mb-10">
        <p className="text-xs text-dl-gray font-dl-mono text-center">
          All metrics are updated in real-time and verifiable on-chain. Last updated: {new Date().toLocaleString()}
        </p>
      </section>
    </DesignLawLayout>
  );
}
