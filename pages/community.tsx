import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { pagesCopy } from '../components/axiomRebuild/copy/pagesCopy';
import { Web3Hero } from '../components/axiomRebuild/Web3Hero';
import { Web3Section } from '../components/axiomRebuild/Web3Section';
import { useScrollToSection } from '../components/axiomRebuild/useScrollToSection';

interface Testimonial {
  id: number;
  name: string;
  location: string;
  avatar: string;
  story: string;
  achievement: string;
  joinedDate: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: "Marcus J.",
    location: "Atlanta, GA",
    avatar: "MJ",
    story: "Before Axiom, I never thought homeownership was possible. Through KeyGrow and my SUSU circle, I've saved my entire down payment in just 18 months.",
    achievement: "Saved $15,000 for down payment",
    joinedDate: "March 2024"
  },
  {
    id: 2,
    name: "Keisha T.",
    location: "Houston, TX",
    avatar: "KT",
    story: "My savings group became my accountability partners. We check in weekly, celebrate wins together, and push each other toward our goals.",
    achievement: "Started 2 savings groups",
    joinedDate: "January 2024"
  },
  {
    id: 3,
    name: "David R.",
    location: "Chicago, IL",
    avatar: "DR",
    story: "The Academy courses taught me about wealth building in ways school never did. Combined with the SUSU model, I finally understand community wealth.",
    achievement: "Completed 8 courses",
    joinedDate: "February 2024"
  },
  {
    id: 4,
    name: "Angela M.",
    location: "Detroit, MI",
    avatar: "AM",
    story: "I referred my entire family to Axiom. Now we have a family savings circle working toward generational wealth together.",
    achievement: "Referred 12 family members",
    joinedDate: "December 2023"
  }
];

const SUCCESS_STATS = [
  { value: "2,500+", label: "Active Members", icon: "👥" },
  { value: "$1.2M+", label: "Total Saved", icon: "💰" },
  { value: "150+", label: "Savings Groups", icon: "🤝" },
  { value: "45", label: "Cities Represented", icon: "🌍" },
];

export default function CommunityPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const getSearch = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  }, []);
  
  useScrollToSection(getSearch);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const copy = pagesCopy.community;

  return (
    <>
      <Head>
        <title>Community Success Stories | Axiom</title>
        <meta name="description" content="Real stories from Axiom members building wealth together through community savings." />
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

        <section style={{ padding: '60px 20px', background: 'linear-gradient(180deg, rgba(0,212,170,0.08) 0%, white 100%)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
              {SUCCESS_STATS.map((stat, i) => (
                <div 
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 16,
                    padding: 28,
                    textAlign: 'center',
                    border: '1px solid rgba(0,212,170,0.2)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.06)'
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{stat.icon}</div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: '#00D4AA' }}>{stat.value}</div>
                  <div style={{ fontSize: 14, color: 'rgba(26,26,46,0.6)', marginTop: 4 }}>{stat.label}</div>
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
            variant={s.id === "impact" ? "highlight" : "default"}
          />
        ))}

        <section style={{ padding: '80px 20px', background: '#1a1a2e' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ color: '#00D4AA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 }}>Testimonials</span>
            <h2 style={{ fontSize: 40, fontWeight: 700, margin: '8px 0 32px 0', color: 'white' }}>Hear From Our Members</h2>
            
            <div style={{ position: 'relative', minHeight: 280 }}>
              {TESTIMONIALS.map((testimonial, i) => (
                <div
                  key={testimonial.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    opacity: i === activeIndex ? 1 : 0,
                    transform: i === activeIndex ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.5s ease',
                    pointerEvents: i === activeIndex ? 'auto' : 'none'
                  }}
                >
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 20,
                    padding: 40,
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                      fontSize: 24,
                      fontWeight: 700,
                      color: 'white'
                    }}>
                      {testimonial.avatar}
                    </div>
                    <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, margin: '0 0 24px 0', fontStyle: 'italic' }}>
                      "{testimonial.story}"
                    </p>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: 'white' }}>{testimonial.name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', margin: '0 8px' }}>•</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{testimonial.location}</span>
                    </div>
                    <div style={{ 
                      display: 'inline-block',
                      padding: '6px 14px',
                      background: 'rgba(0,212,170,0.2)',
                      borderRadius: 20,
                      color: '#00D4AA',
                      fontSize: 14,
                      fontWeight: 500
                    }}>
                      {testimonial.achievement}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  style={{
                    width: i === activeIndex ? 32 : 10,
                    height: 10,
                    borderRadius: 5,
                    border: 'none',
                    background: i === activeIndex ? '#00D4AA' : 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
