import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';

interface Testimonial {
  id: number;
  name: string;
  location: string;
  avatar: string;
  story: string;
  achievement: string;
  joinedDate: string;
  savedAmount?: number;
  groupsJoined?: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: "Marcus J.",
    location: "Atlanta, GA",
    avatar: "MJ",
    story: "Before Axiom, I never thought homeownership was possible. Through KeyGrow and my SUSU circle, I've saved my entire down payment in just 18 months. The community support made all the difference.",
    achievement: "Saved $15,000 for down payment",
    joinedDate: "March 2024",
    savedAmount: 15000,
    groupsJoined: 3
  },
  {
    id: 2,
    name: "Keisha T.",
    location: "Houston, TX",
    avatar: "KT",
    story: "My savings group became my accountability partners. We check in weekly, celebrate wins together, and push each other toward our goals. This is more than an app - it's a movement.",
    achievement: "Started 2 savings groups",
    joinedDate: "January 2024",
    groupsJoined: 5
  },
  {
    id: 3,
    name: "David R.",
    location: "Chicago, IL",
    avatar: "DR",
    story: "The Academy courses taught me about wealth building in ways school never did. Combined with the SUSU model, I finally understand how our ancestors built community wealth.",
    achievement: "Completed 8 courses",
    joinedDate: "February 2024",
    savedAmount: 8500
  },
  {
    id: 4,
    name: "Angela M.",
    location: "Detroit, MI",
    avatar: "AM",
    story: "I referred my entire family to Axiom. Now we have a family savings circle working toward generational wealth together. My grandmother says it reminds her of the old ways.",
    achievement: "Referred 12 family members",
    joinedDate: "December 2023",
    groupsJoined: 4,
    savedAmount: 22000
  },
  {
    id: 5,
    name: "Jerome W.",
    location: "Los Angeles, CA",
    avatar: "JW",
    story: "As a small business owner, cash flow was always tight. My SUSU circle helped me save for equipment I needed without going into debt. Smart money moves.",
    achievement: "Funded business expansion",
    joinedDate: "April 2024",
    savedAmount: 12000
  },
  {
    id: 6,
    name: "Tamika L.",
    location: "Philadelphia, PA",
    avatar: "TL",
    story: "Single mom of three here. This platform gave me hope and a real plan. My kids see me saving and learning - that's the real generational wealth right there.",
    achievement: "Emergency fund complete",
    joinedDate: "May 2024",
    savedAmount: 5000,
    groupsJoined: 2
  }
];

const SUCCESS_STATS = [
  { value: "2,500+", label: "Active Members", icon: "👥" },
  { value: "$1.2M+", label: "Total Saved", icon: "💰" },
  { value: "150+", label: "Savings Groups", icon: "🤝" },
  { value: "45", label: "Cities Represented", icon: "🌍" },
];

export default function CommunitySuccessHub() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setActiveIndex(index);
    setIsAutoPlaying(false);
  };

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
    setIsAutoPlaying(false);
  };

  return (
    <>
      <Head>
        <title>Community Success Stories | Axiom</title>
        <meta name="description" content="Real stories from Axiom members building wealth together through community savings" />
      </Head>

      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-20 px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Community Success Hub</h1>
              <p className="text-xl text-orange-100 mb-8">
                Real stories from real people building real wealth together
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {SUCCESS_STATS.map((stat, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-3xl mb-2">{stat.icon}</div>
                    <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                    <div className="text-sm text-orange-100">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 py-16">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Member Stories</h2>
            
            <div className="relative">
              <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
                <div 
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                >
                  {TESTIMONIALS.map((testimonial) => (
                    <div key={testimonial.id} className="w-full flex-shrink-0 p-8 md:p-12">
                      <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-shrink-0">
                          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                            {testimonial.avatar}
                          </div>
                        </div>
                        <div className="flex-1">
                          <blockquote className="text-xl text-gray-700 italic mb-6 leading-relaxed">
                            "{testimonial.story}"
                          </blockquote>
                          <div className="flex flex-wrap items-center gap-4 mb-4">
                            <div>
                              <p className="font-semibold text-gray-900">{testimonial.name}</p>
                              <p className="text-sm text-gray-500">{testimonial.location}</p>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                              {testimonial.achievement}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span>Member since {testimonial.joinedDate}</span>
                            {testimonial.savedAmount && (
                              <span className="text-green-600 font-medium">
                                ${testimonial.savedAmount.toLocaleString()} saved
                              </span>
                            )}
                            {testimonial.groupsJoined && (
                              <span>{testimonial.groupsJoined} groups joined</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="flex justify-center gap-2 mt-6">
                {TESTIMONIALS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToSlide(idx)}
                    className={`w-3 h-3 rounded-full transition ${
                      idx === activeIndex ? 'bg-amber-500' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-100 py-16 px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Share Your Story</h2>
              <p className="text-gray-600 text-center mb-8">
                Your journey could inspire thousands. Tell us how Axiom has helped you on your path to financial freedom.
              </p>
              <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="First name and last initial"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="City, State"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Story</label>
                    <textarea
                      rows={5}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Tell us about your journey with Axiom..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Biggest Achievement</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="e.g., Saved $10,000, Started my first business"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition"
                  >
                    Submit Your Story
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="py-16 px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to Write Your Success Story?</h2>
              <p className="text-xl text-gray-600 mb-8">
                Join thousands of members who are building wealth together through community savings.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/susu" className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition shadow-lg">
                  Join a Savings Group
                </Link>
                <Link href="/academy" className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-semibold hover:border-amber-500 transition">
                  Start Learning
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
