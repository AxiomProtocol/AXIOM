import React, { useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { pagesCopy } from '../components/axiomRebuild/copy/pagesCopy';
import { Web3Hero } from '../components/axiomRebuild/Web3Hero';
import { Web3Section } from '../components/axiomRebuild/Web3Section';
import { useScrollToSection } from '../components/axiomRebuild/useScrollToSection';
import { 
  Wallet, 
  TrendingUp, 
  Blocks, 
  Coins, 
  Users, 
  Home,
  BookOpen,
  Zap,
  GraduationCap
} from "lucide-react";

const courseIcons: Record<string, React.ReactNode> = {
  "Financial Foundations 101": <TrendingUp className="w-6 h-6" />,
  "Cryptocurrency Basics": <Coins className="w-6 h-6" />,
  "Wallet Setup and Safety": <Wallet className="w-6 h-6" />,
  "Blockchain Fundamentals": <Blocks className="w-6 h-6" />,
  "Introduction to DeFi": <Zap className="w-6 h-6" />,
  "Tokenomics 101": <TrendingUp className="w-6 h-6" />,
  "Web3 Community Guide": <Users className="w-6 h-6" />,
  "KeyGrow Path to Homeownership": <Home className="w-6 h-6" />,
};

const categoryColors: Record<string, string> = {
  "Finance": "border-emerald-300 bg-emerald-50",
  "Blockchain": "border-purple-300 bg-purple-50",
  "Finance and Web3": "border-amber-300 bg-amber-50",
  "Token Economics": "border-blue-300 bg-blue-50",
  "Community": "border-pink-300 bg-pink-50",
  "Real Estate": "border-orange-300 bg-orange-50",
};

const courses = [
  {
    title: "Financial Foundations 101",
    desc: "Budgeting, saving, credit basics, and building stability.",
    duration: "45 minutes",
    category: "Finance",
  },
  {
    title: "Cryptocurrency Basics",
    desc: "What crypto is, how it works, and where it fits in modern finance.",
    duration: "35 minutes",
    category: "Blockchain",
  },
  {
    title: "Wallet Setup and Safety",
    desc: "How to set up a wallet, avoid common mistakes, and secure digital assets.",
    duration: "40 minutes",
    category: "Blockchain",
  },
  {
    title: "Blockchain Fundamentals",
    desc: "Understanding distributed ledgers, consensus, and decentralization.",
    duration: "50 minutes",
    category: "Blockchain",
  },
  {
    title: "Introduction to DeFi",
    desc: "Decentralized finance explained: lending, staking, and earning.",
    duration: "55 minutes",
    category: "Finance and Web3",
  },
  {
    title: "Tokenomics 101",
    desc: "How token economics work and what drives value in Web3.",
    duration: "45 minutes",
    category: "Token Economics",
  },
  {
    title: "Web3 Community Guide",
    desc: "Building and participating in decentralized communities.",
    duration: "30 minutes",
    category: "Community",
  },
  {
    title: "KeyGrow Path to Homeownership",
    desc: "The complete guide to shared ownership through KeyGrow.",
    duration: "60 minutes",
    category: "Real Estate",
  },
];

export default function LearnPage() {
  const getSearch = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  }, []);
  
  useScrollToSection(getSearch);

  const copy = pagesCopy.learn;

  return (
    <>
      <Head>
        <title>Learn | Axiom</title>
        <meta name="description" content="Free courses covering financial literacy, cryptocurrency, blockchain, and the path to homeownership." />
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

        <section id="courses" style={{ padding: '80px 20px', background: 'linear-gradient(180deg, rgba(0,212,170,0.05) 0%, rgba(255,255,255,1) 100%)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <GraduationCap style={{ width: 24, height: 24, color: '#00D4AA' }} />
                <span style={{ color: '#00D4AA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 }}>Course Library</span>
              </div>
              <h2 style={{ fontSize: 40, fontWeight: 700, margin: 0, color: '#1a1a2e' }}>Start Your Journey</h2>
              <p style={{ fontSize: 18, color: 'rgba(26,26,46,0.7)', marginTop: 12, maxWidth: 600, margin: '12px auto 0' }}>
                9 courses designed to take you from basics to blockchain. Free forever.
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {courses.map((course, i) => (
                <div 
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 16,
                    padding: 24,
                    border: '1px solid rgba(0,212,170,0.2)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,212,170,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 12, 
                      background: 'linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      {courseIcons[course.title] || <BookOpen className="w-6 h-6" />}
                    </div>
                    <span style={{ 
                      fontSize: 12, 
                      fontWeight: 600, 
                      padding: '4px 10px', 
                      borderRadius: 20,
                      background: 'rgba(0,212,170,0.1)',
                      color: '#00D4AA'
                    }}>
                      {course.category}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px 0', color: '#1a1a2e' }}>{course.title}</h3>
                  <p style={{ fontSize: 15, color: 'rgba(26,26,46,0.7)', margin: '0 0 16px 0', lineHeight: 1.5 }}>{course.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'rgba(26,26,46,0.5)' }}>{course.duration}</span>
                    <span style={{ 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: '#00D4AA',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      Start Course →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
