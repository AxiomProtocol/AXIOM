import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

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
    story: "Before Axiom, I never thought homeownership was possible. Through KeyGrow and my Wealth Practice circle, I've saved my entire down payment in just 18 months.",
    achievement: "Saved $15,000 for down payment",
    joinedDate: "March 2024"
  },
  {
    id: 2,
    name: "Keisha T.",
    location: "Houston, TX",
    avatar: "KT",
    story: "My Wealth Practice group became my accountability partners. We check in weekly, celebrate wins together, and push each other toward our goals.",
    achievement: "Started 2 Wealth Practice groups",
    joinedDate: "January 2024"
  },
  {
    id: 3,
    name: "David R.",
    location: "Chicago, IL",
    avatar: "DR",
    story: "The Academy courses taught me about financial coordination in ways school never did. Combined with the Wealth Practice model, I finally understand structured community participation.",
    achievement: "Completed 8 courses",
    joinedDate: "February 2024"
  },
  {
    id: 4,
    name: "Angela M.",
    location: "Detroit, MI",
    avatar: "AM",
    story: "I referred my entire family to Axiom. Now we have a family Wealth Practice circle coordinating toward long-term financial resilience together.",
    achievement: "Referred 12 family members",
    joinedDate: "December 2023"
  }
];

const SUCCESS_STATS = [
  { value: "2,500+", label: "Active Members", icon: "👥" },
  { value: "$1.2M+", label: "Total Saved", icon: "💰" },
  { value: "150+", label: "Wealth Practice Groups", icon: "🤝" },
  { value: "45", label: "Cities Represented", icon: "🌍" },
];

export default function CommunityPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const getSearch = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DesignLawLayout>
      <Head>
        <title>Community Success Stories | Axiom</title>
        <meta name="description" content="Real stories from Axiom members coordinating capital together through structured community savings." />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy mb-1">Community Success Stories</h1>
      <p className="text-sm text-dl-gray mb-8">Real stories from Axiom members coordinating capital together through structured community savings.</p>

      <section className="mb-10">
        <SectionHeading>Community Stats</SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
          {SUCCESS_STATS.map((stat, i) => (
            <div
              key={i}
              className="px-4 py-4 bg-dl-bg border-r border-b md:border-b-0 border-dl-border last:border-r-0 text-center"
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="font-dl-mono text-lg font-semibold text-dl-navy">{stat.value}</div>
              <div className="text-xs text-dl-gray mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionHeading>Member Testimonials</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6">
          {TESTIMONIALS.map((testimonial, i) => (
            <div
              key={testimonial.id}
              className={i === activeIndex ? 'block' : 'hidden'}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-dl-navy text-white flex items-center justify-center text-sm font-medium">
                  {testimonial.avatar}
                </div>
                <div>
                  <span className="text-sm font-medium text-dl-navy">{testimonial.name}</span>
                  <span className="text-dl-gray mx-2">·</span>
                  <span className="text-sm text-dl-gray">{testimonial.location}</span>
                </div>
              </div>
              <p className="text-sm text-dl-navy leading-relaxed mb-4 italic">
                "{testimonial.story}"
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-dl-gray border border-dl-border px-2 py-1">
                  {testimonial.achievement}
                </span>
                <span className="text-xs text-dl-gray font-dl-mono">Joined {testimonial.joinedDate}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`w-2 h-2 border border-dl-border ${i === activeIndex ? 'bg-dl-navy' : 'bg-dl-bg'}`}
              />
            ))}
          </div>
        </div>
      </section>
    </DesignLawLayout>
  );
}
